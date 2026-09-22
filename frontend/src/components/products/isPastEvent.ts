import { parseLocalDate } from '@/lib/date-iso'
import { MAX_OCCURRENCES, occurrenceStart, seriesHorizon } from '@/lib/recurrence'
import type { Event } from '@/types/event'

/**
 * #607 — Un événement de l'historique est-il PASSÉ ?
 *
 * Règle (arbitrage S106) : sa date de FIN — ou sa date de début s'il n'a pas de fin
 * exploitable (ponctuel) — est STRICTEMENT antérieure au jour civil LOCAL de `today`.
 * Un événement qui se termine aujourd'hui n'est donc pas encore passé.
 *
 * Dates civiles lues en LOCAL (`parseLocalDate`, #652) : jamais `new Date("YYYY-MM-DD")`,
 * qui lirait minuit UTC et ferait basculer d'un jour à l'ouest de Greenwich (PIT-S89).
 * La comparaison se fait entre jours civils (composantes locales), pas entre instants.
 *
 * Série récurrente (hors énoncé, dérivé de la même règle) : sa fin n'est pas celle de la
 * 1re occurrence. Sans `recurrenceEndDate`, elle ne se termine jamais → jamais passée.
 * Bornée : `recurrenceEndDate` est un HORIZON inclusif (BR-EVE-012, `seriesHorizon`), PAS
 * le début de la dernière occurrence. La dernière occurrence est la plus grande
 * `occurrenceStart(start, unit, k) <= horizon` (même calcul, depuis l'origine et avec le
 * clamp de fin de mois, que la frise et `nextStart`) ; elle dure autant que la 1re, et la
 * série est passée quand CETTE fin-là est révolue. Correctif de review S106 : la 1re
 * version prenait `recurrenceEndDate` pour ce début et finissait la série trop tard
 * quand la borne tombait hors cadence.
 * `isRecurring` sans `recurrenceUnit` (donnée incohérente) : traité comme un ponctuel,
 * comme le fait `nextStart`.
 *
 * Donnée illisible (date invalide) → `false` : on ne désature pas sur une supposition.
 */
export type PastEventInput = Pick<
  Event,
  'startDate' | 'endDate' | 'isRecurring' | 'recurrenceUnit' | 'recurrenceEndDate'
>

const civilDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const isValid = (date: Date): boolean => !Number.isNaN(date.getTime())

/** Écart en JOURS CIVILS (pas en ms : un changement d'heure fausserait la division). */
const civilDaysBetween = (from: Date, to: Date): number =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  )

export function isPastEvent(event: PastEventInput, today: Date): boolean {
  const start = parseLocalDate(event.startDate)
  const rawEnd = event.endDate ? parseLocalDate(event.endDate) : start
  const end = isValid(rawEnd) ? rawEnd : start
  if (!isValid(end)) return false
  const todayDay = civilDay(today).getTime()

  const unit = event.isRecurring ? event.recurrenceUnit : null
  if (!unit) return civilDay(end).getTime() < todayDay

  if (!event.recurrenceEndDate) return false
  const bound = parseLocalDate(event.recurrenceEndDate)
  if (!isValid(bound) || !isValid(start)) return false
  const origin = civilDay(start)
  const horizon = seriesHorizon({ start: origin, unit, endDate: civilDay(bound) }).getTime()

  // Dernier début d'occurrence <= horizon (l'origine en fait toujours partie).
  let lastStart = origin
  for (let k = 1; k < MAX_OCCURRENCES; k++) {
    const next = occurrenceStart(origin, unit, k)
    if (next.getTime() > horizon) break
    lastStart = next
  }
  const span = Math.max(0, civilDaysBetween(origin, civilDay(end)))
  const lastEnd = new Date(
    lastStart.getFullYear(),
    lastStart.getMonth(),
    lastStart.getDate() + span,
  )
  return lastEnd.getTime() < todayDay
}
