import { FullCalendarEvent } from '@/types/event'

/**
 * #47 — Logique de calcul partagée par les sous-composants Timeline.
 * Extraite telle quelle du monolithe `TimelineCalendar.tsx` (aucun changement
 * de comportement : mêmes signatures, mêmes formules de positionnement).
 */

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
