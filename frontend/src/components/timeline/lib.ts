import { FullCalendarEvent } from '@/types/event'
import { contrastRatio, WCAG_AA_NORMAL, INK_DARK, INK_LIGHT } from '@/lib/color'

/**
 * #47 — Logique de calcul partagée par les sous-composants Timeline.
 * Extraite telle quelle de l'ancien composant calendrier monolithique
 * (supprimé #350 ; aucun changement de comportement : mêmes signatures,
 * mêmes formules de positionnement).
 */

/** Statut temporel d'un event (dupliqué de zoom.ts pour éviter un cycle d'import). */
type EventLabelStatus = 'expired' | 'ongoing' | 'upcoming'

/**
 * #81 (a11y) — Libellé `aria-label` AGRÉGÉ d'un bloc event, annoncé en UNE
 * SEULE phrase au focus clavier / lecteur d'écran (VoiceOver, NVDA).
 *
 * Ordre : titre, statut (À venir / En cours / Terminé), plage de dates, produit,
 * puis — si présent — le statut de RÉCURRENCE (BR-EVE-006). Réutilise le format
 * de date `medium` + les clés i18n de statut du drawer → même contexte au focus
 * qu'à l'ouverture. Récurrence localisée via `dashboard.timeline.recurrence.*`
 * (fallback silencieux si l'event n'est pas récurrent).
 *
 * ⚠ Extrait ici (`lib.ts`) depuis `zoom.ts` (#63) pour centraliser les helpers
 * NON liés au zoom et rester réutilisable desktop ↔ mobile. `zoom.ts` ré-exporte
 * pour la rétro-compat des imports existants. Consommé par `EventPill` (#81) et
 * documenté pour #197 (formalisation du pattern clavier/annonces).
 */
export function buildEventAriaLabel(
  event: FullCalendarEvent & { status: EventLabelStatus },
  locale: string,
  t: (key: string) => string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const start = fmt.format(new Date(event.start))
  const end = fmt.format(new Date(event.end || event.start))
  const status = t(`dashboard.timeline.status.${event.status}`)
  const product = event.extendedProps?.productName
  const parts = [event.title, status, `${start} – ${end}`]
  if (product) parts.push(product)
  // BR-EVE-006 : n'annonce la récurrence QUE si l'event est récurrent avec une
  // fréquence connue. `recurrenceUnit` = enum MAJUSCULE WEEK/MONTH/YEAR.
  if (event.extendedProps?.isRecurring && event.extendedProps.recurrenceUnit) {
    const unitKey = event.extendedProps.recurrenceUnit.toLowerCase()
    parts.push(t(`dashboard.timeline.recurrence.${unitKey}`))
  }
  return parts.join(', ')
}

/**
 * #81 (a11y, point 6) — Garde-fou contraste WCAG AA (4.5:1) pour le LIBELLÉ
 * porté À L'INTÉRIEUR d'une barre. `true` = l'encre calculée passe AA sur le
 * fond `color` → le titre reste lisible dans la barre. `false` = aucune encre
 * (noir/blanc) n'atteint 4.5:1 → l'appelant doit afficher le libellé À L'EXTÉRIEUR.
 *
 * Réutilise `contrastRatio` de `lib/color.ts` (BR-EVE-009, pas de chroma-js).
 * Fond absent/invalide (theming DS `var(--color-accent)`) → considéré lisible
 * (le DS garantit son propre contraste `--color-accent-ink`).
 */
export function eventLabelReadableInside(color: string | undefined | null): boolean {
  if (!color) return true
  const best = Math.max(contrastRatio(color, INK_DARK), contrastRatio(color, INK_LIGHT))
  return best >= WCAG_AA_NORMAL
}

/** Ressource affichée dans une Lane (produit + sa catégorie). */
export type Resource = {
  id: string
  title: string
  category: string
}

/** Statut dérivé d'un event par rapport à `now` (pilote la couleur de la barre). */
export type EventStatus = 'expired' | 'ongoing' | 'upcoming'

/** Event enrichi de sa position (%) et de son statut, prêt à rendre en EventBar. */
export type EventWithComputedPosition = FullCalendarEvent & {
  leftPercent: number
  widthPercent: number
  status: EventStatus
}

/**
 * Construit la fenêtre glissante de `lengthDays` jours (30 par défaut) à partir
 * de `startDate` (borne minuit → 23:59:59.999). Retourne la liste des jours plus
 * les bornes `start`/`end` utilisées pour le clamp/positionnement des events.
 */
export function getDaysRange(
  startDate: Date,
  lengthDays = 30,
): { days: Date[]; start: Date; end: Date } {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + (lengthDays - 1))
  end.setHours(23, 59, 59, 999)

  const days: Date[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }

  return { days, start, end }
}

/** Libellé court d'un jour d'en-tête (jour de semaine abrégé + numéro). */
export function formatDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Positionne les events par ressource sur la fenêtre `[start, end]`.
 * Reprend à l'identique le `useMemo eventsByResource` du monolithe : clamp à la
 * vue, calcul left/width %, dérivation du statut vs `now`. Fonction pure pour
 * rester testable/mémoïsable côté orchestrateur.
 */
export function buildEventsByResource(
  events: FullCalendarEvent[],
  start: Date,
  end: Date,
  now: Date,
  daysCount: number,
): Map<string, EventWithComputedPosition[]> {
  const totalMs = end.getTime() - start.getTime() || 1
  const map = new Map<string, EventWithComputedPosition[]>()

  for (const event of events) {
    const resourceId = event.resourceId
    if (!resourceId) continue

    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end || event.start)

    // Clamp à la vue courante.
    const clampedStart = new Date(Math.max(eventStart.getTime(), start.getTime()))
    const clampedEnd = new Date(Math.min(eventEnd.getTime(), end.getTime()))

    if (clampedEnd < start || clampedStart > end) {
      continue
    }

    const leftPercent = ((clampedStart.getTime() - start.getTime()) / totalMs) * 100
    const widthPercent =
      ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100 || (1 / daysCount) * 100

    let status: EventStatus = 'upcoming'
    if (eventEnd < now) {
      status = 'expired'
    } else if (eventStart <= now && now <= eventEnd) {
      status = 'ongoing'
    }

    const enhanced: EventWithComputedPosition = {
      ...event,
      leftPercent,
      widthPercent,
      status,
    }

    if (!map.has(resourceId)) {
      map.set(resourceId, [])
    }
    map.get(resourceId)!.push(enhanced)
  }

  return map
}

/** Groupe les ressources par catégorie (ordre d'insertion préservé). */
export function groupResourcesByCategory(resources: Resource[]): Record<string, Resource[]> {
  const grouped: Record<string, Resource[]> = {}
  for (const r of resources) {
    if (!grouped[r.category]) grouped[r.category] = []
    grouped[r.category].push(r)
  }
  return grouped
}

/** Classe de fond de la pastille de statut d'une EventBar (tokens DS). */
export function statusBarClass(status: EventStatus): string {
  switch (status) {
    case 'expired':
      return 'bg-[var(--color-expired)]'
    case 'ongoing':
      return 'bg-[var(--color-ongoing)]'
    default:
      return 'bg-[var(--color-upcoming)]'
  }
}

/**
 * #80 — Un jour du ruban de densité dashboard.
 * `height` ∈ [0..1] : hauteur normalisée de la barre = densité (nombre d'events
 * ce jour / max sur la fenêtre). `color` = couleur de l'event le plus « chargé »
 * du jour (palette curatée `--evt-*` via la couleur portée par l'event, BR-EVE-009).
 */
export type DensityBucket = {
  date: Date
  count: number
  height: number
  /** Couleur dominante du jour (hex event) ou `null` si aucun event. */
  color: string | null
  isToday: boolean
}

/**
 * #80 — Bucketing de densité PAR JOUR pour le `DensityRibbon` du dashboard.
 *
 * Distinct de `buildMinimapBuckets` (zoom.ts) qui produit une waveform de 60
 * tranches NORMALISÉES SANS couleur pour la minimap de la frise desktop : ici on
 * garde un bucket = un jour calendaire sur `rangeDays` (30 par défaut), on conserve
 * le compte réel ET la couleur dominante pour colorer chaque barre par catégorie
 * d'event (spec Designer : densité = hauteur, couleur = catégorie `--evt-*`).
 * Fonction pure → testable/mémoïsable côté composant. Fenêtre glissante
 * `[from, from+rangeDays-1]` calée sur `getDaysRange`.
 */
export function buildDensityBuckets(
  events: FullCalendarEvent[],
  from: Date,
  now: Date,
  rangeDays = 30,
): DensityBucket[] {
  const { days } = getDaysRange(from, rangeDays)
  const counts = new Array<number>(days.length).fill(0)
  const colors = new Array<string | null>(days.length).fill(null)
  const windowStart = days[0]

  for (const event of events) {
    const s = new Date(event.start)
    if (Number.isNaN(s.getTime())) continue
    const dayStart = new Date(s.getFullYear(), s.getMonth(), s.getDate())
    const idx = Math.round((dayStart.getTime() - windowStart.getTime()) / 86_400_000)
    if (idx < 0 || idx >= days.length) continue
    counts[idx] += 1
    // Première couleur rencontrée = dominante (ordre chronologique d'entrée).
    if (!colors[idx] && event.color) colors[idx] = event.color
  }

  const max = Math.max(1, ...counts)
  return days.map((date, i) => ({
    date,
    count: counts[i],
    height: counts[i] / max,
    color: colors[i],
    isToday: date.toDateString() === now.toDateString(),
  }))
}

/**
 * #80 — Bornes de la semaine courante (lundi 00:00 → dimanche 23:59:59.999),
 * ISO 8601 (lundi = premier jour). Utilisé par `WeekAgenda` et le KPI « série ».
 */
export function getWeekRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // getDay(): 0=dimanche..6=samedi → décalage vers lundi.
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * #80 — Events dont le début tombe dans `[start, end]`, triés chronologiquement.
 * Pure : consommée par `WeekAgenda` (agenda de la semaine courante).
 */
export function getEventsInRange(
  events: FullCalendarEvent[],
  start: Date,
  end: Date,
): FullCalendarEvent[] {
  return events
    .filter((e) => {
      const s = new Date(e.start)
      return !Number.isNaN(s.getTime()) && s >= start && s <= end
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
