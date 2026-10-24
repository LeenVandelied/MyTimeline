import type { FullCalendarEvent } from '@/types/event'
import { getEventsInRange, getWeekRange } from '@/components/timeline/lib'
import { isRecurringSeries } from '@/components/timeline/recurrence-marks'
import { parseLocalDate } from '@/lib/date-iso'
import { nextStart, startOfLocalDay } from '@/lib/next-occurrence'
import { MAX_OCCURRENCES, occurrenceStart, seriesHorizon } from '@/lib/recurrence'

/**
 * #640 (DEC-S82-007, arbitrage dev DEC-S108-004) — les 4 métriques de « En bref ».
 *
 * Remplacent `activeProducts` / `eventsThisMonth` / `currentStreak` (la « série »
 * n'existe pas dans le handoff). Source : `docs/memory/sprints/sprint-108/maquette-dashboard.md`
 * § « En bref ». Fonctions PURES, dates civiles en heure LOCALE, `now` injecté.
 *
 * `events` = événements NON archivés (BR-EVE-011, filtrés en amont par `useDashboardData`).
 */
export interface DashboardKpis {
  /** Événements de « Cette semaine » — MÊME liste que `WeekAgenda` (`currentWeekEvents`). */
  week: number
  /** Parmi `week`, les séries récurrentes (BR-EVE-006 : `isRecurring` ET `recurrenceUnit`). */
  weekRecurring: number
  /** Événements dont la prochaine occurrence tombe dans les `DUE_SOON_DAYS` jours (inclus). */
  dueSoon: number
  /** Durées (`type === 'duration'`) dont [début, fin] contient aujourd'hui. */
  ongoing: number
  /** Catégorie de PRODUIT la plus chargée du mois calendaire courant, `null` si aucune. */
  busiestCategory: string | null
}

/** Horizon de « arrivent à échéance sous N jours » (maquette : 14). */
export const DUE_SOON_DAYS = 14

/**
 * Événements de la semaine courante (lundi → dimanche, ISO 8601) : SOURCE UNIQUE de la
 * liste de `WeekAgenda` et du compteur `week` de « En bref ». Les deux affichages ne
 * peuvent donc pas diverger.
 *
 * ⚠ Écart assumé à la maquette (qui compte les 7 prochains jours, avance la récurrence
 * et inclut les durées en cours) : le briefing du lead exige la cohérence avec la
 * section « Cette semaine » telle qu'elle est livrée — un début d'événement dans la
 * semaine civile courante, sans occurrence fantôme.
 */
export function currentWeekEvents(events: FullCalendarEvent[], now: Date): FullCalendarEvent[] {
  const { start, end } = getWeekRange(now)
  return getEventsInRange(events, start, end)
}

const isValid = (date: Date): boolean => !Number.isNaN(date.getTime())

/** Écart en JOURS CIVILS (pas en ms : un changement d'heure fausserait la division). */
const civilDaysBetween = (from: Date, to: Date): number =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  )

/** Prochaine occurrence ≥ aujourd'hui, via le helper mutualisé du handoff (`nextStart`, #603). */
function nextStartOf(event: FullCalendarEvent, now: Date): Date | null {
  const { archived, isRecurring, recurrenceUnit, recurrenceEndDate } = event.extendedProps
  return nextStart(
    {
      startDate: event.start,
      archived: archived === true,
      isRecurring,
      recurrenceUnit,
      recurrenceEndDate,
    },
    now,
  )
}

/** Durée en cours : `début ≤ aujourd'hui ≤ fin`, bornes INCLUSES, en jours civils locaux. */
export function isOngoing(event: FullCalendarEvent, now: Date): boolean {
  if (event.extendedProps.type !== 'duration') return false
  const start = parseLocalDate(event.start)
  const end = parseLocalDate(event.end || event.start)
  if (!isValid(start) || !isValid(end)) return false
  const today = startOfLocalDay(now)
  return civilDaysBetween(start, today) >= 0 && civilDaysBetween(today, end) >= 0
}

/**
 * Nombre d'occurrences (origine + récurrences, BR-EVE-006/012) dont le DÉBUT tombe dans
 * le mois calendaire de `now`. Récurrence calculée depuis l'origine (`occurrenceStart`,
 * même clamp de fin de mois que la frise), bornée par `seriesHorizon`.
 */
function occurrencesInMonth(event: FullCalendarEvent, now: Date): number {
  const raw = parseLocalDate(event.start)
  if (!isValid(raw)) return 0
  const origin = startOfLocalDay(raw)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const inMonth = (d: Date) =>
    d.getTime() >= monthStart.getTime() && d.getTime() <= monthEnd.getTime()

  const unit = isRecurringSeries(event) ? event.extendedProps.recurrenceUnit : null
  if (!unit) return inMonth(origin) ? 1 : 0

  const rawEnd = event.extendedProps.recurrenceEndDate
  const parsedEnd = rawEnd ? parseLocalDate(rawEnd) : null
  const horizon = seriesHorizon({
    start: origin,
    unit,
    endDate: parsedEnd && isValid(parsedEnd) ? parsedEnd : null,
  })
  const limit = Math.min(horizon.getTime(), monthEnd.getTime())
  let count = 0
  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    const occurrence = occurrenceStart(origin, unit, k)
    if (occurrence.getTime() > limit) break
    if (inMonth(occurrence)) count += 1
  }
  return count
}

/** Départage des ex æquo de `busiestCategory` — collation FIGÉE (cf. sa doc). */
const TIE_COLLATOR = new Intl.Collator('en')

/** Ordre de départage des ex æquo : collation racine, puis points de code. */
function tieOrder(a: string, b: string): number {
  return TIE_COLLATOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

/**
 * Catégorie la plus chargée du mois calendaire courant (arbitrage lead : le libellé dit
 * « ce mois », la maquette comptait la fenêtre de 30 j du hero).
 *
 * EX ÆQUO — règle DÉTERMINISTE : à compte égal, la catégorie dont le nom vient en
 * premier dans l'ordre alphabétique de la collation Unicode RACINE (`TIE_COLLATOR`,
 * locale FIGÉE à `en` — pas celle de l'UI ni du navigateur : « Électricité » passe
 * avant « Zinc » partout), puis par points de code si la collation les dit égaux.
 * Indépendante de l'ordre de l'API (la maquette gardait « la première rencontrée »).
 * Aucune occurrence → `null`.
 */
export function busiestCategory(events: FullCalendarEvent[], now: Date): string | null {
  const counts = new Map<string, number>()
  for (const event of events) {
    const category = event.extendedProps.category
    if (!category) continue
    const n = occurrencesInMonth(event, now)
    if (n > 0) counts.set(category, (counts.get(category) ?? 0) + n)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [category, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && best !== null && tieOrder(category, best) < 0)
    ) {
      best = category
      bestCount = count
    }
  }
  return best
}

export function computeDashboardKpis(events: FullCalendarEvent[], now: Date): DashboardKpis {
  const week = currentWeekEvents(events, now)
  const today = startOfLocalDay(now)
  let dueSoon = 0
  let ongoing = 0
  for (const event of events) {
    const next = nextStartOf(event, now)
    if (next !== null && civilDaysBetween(today, next) <= DUE_SOON_DAYS) dueSoon += 1
    if (isOngoing(event, now)) ongoing += 1
  }
  return {
    week: week.length,
    weekRecurring: week.filter(isRecurringSeries).length,
    dueSoon,
    ongoing,
    busiestCategory: busiestCategory(events, now),
  }
}
