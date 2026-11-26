import type { FullCalendarEvent } from '@/types/event'
import { parseLocalDate, toLocalIsoDate } from '@/lib/date-iso'
import { addDays } from '@/lib/recurrence'
import { occurrencesInRange, startOfLocalDay } from '@/lib/next-occurrence'
import { civilDaysBetween } from './kpis'

/**
 * #818 — Projette les événements sur les `days` jours civils locaux à partir de `today`
 * (jour 0 compris) pour le ruban de densité. Rend des copies dont `start` et `end` valent
 * le jour à marquer : `buildDensityBuckets` les consomme tel quel.
 *
 *  - ponctuel ou série : une entrée par occurrence (règles de `nextStart`) ;
 *  - durée (`type: 'duration'`) : une entrée par jour couvert dans la fenêtre, pour l'origine
 *    et pour chaque occurrence d'une série (même durée que l'origine). Les occurrences sont
 *    celles de `occurrencesInRange`, fenêtre élargie vers l'arrière de la durée pour attraper
 *    une occurrence commencée avant la fenêtre et encore en cours ;
 *  - un événement n'apparaît qu'une fois par jour.
 * Fin de durée INCLUSE, comme `isOngoing` et le compteur « sous 14 jours » (`dueSoon`) : le
 * ruban s'aligne sur le compteur pour ne pas le contredire. La frise
 * (`timeline/recurrence-marks.ts`) traite cette fin comme EXCLUE : l'écart est volontaire.
 * Fonction pure, `today` injecté.
 */
export function projectDensityEvents(
  events: FullCalendarEvent[],
  today: Date,
  days = 30,
): FullCalendarEvent[] {
  if (days <= 0) return []
  const first = startOfLocalDay(today)
  const last = addDays(first, days - 1)
  const out: FullCalendarEvent[] = []

  const push = (event: FullCalendarEvent, day: Date) => {
    const iso = toLocalIsoDate(day)
    if (iso !== null) out.push({ ...event, start: iso, end: iso })
  }

  for (const event of events) {
    const props = event.extendedProps
    if (props.archived === true) continue

    // Durée en jours civils de l'origine (0 pour un ponctuel) ; une fin avant le début n'est
    // jamais « en cours » (`isOngoing`), rien à marquer.
    let span = 0
    if (props.type === 'duration') {
      const start = parseLocalDate(event.start)
      const end = parseLocalDate(event.end || event.start)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
      span = civilDaysBetween(start, end)
      if (span < 0) continue
    }

    const occurrences = occurrencesInRange(
      {
        startDate: event.start,
        archived: false,
        isRecurring: props.isRecurring,
        recurrenceUnit: props.recurrenceUnit,
        recurrenceEndDate: props.recurrenceEndDate,
      },
      addDays(first, -span),
      last,
    )
    if (span === 0) {
      for (const day of occurrences) push(event, day)
      continue
    }

    // Intersection [max(first, début), min(last, début + durée)] de chaque occurrence ;
    // `seen` évite le double marquage si deux occurrences se chevauchent.
    const seen = new Set<number>()
    for (const occurrence of occurrences) {
      const from = startOfLocalDay(occurrence)
      const lo = from.getTime() > first.getTime() ? from : first
      const end = addDays(from, span)
      const hi = end.getTime() < last.getTime() ? end : last
      for (let day = lo; day.getTime() <= hi.getTime(); day = addDays(day, 1)) {
        const index = civilDaysBetween(first, day)
        if (seen.has(index)) continue
        seen.add(index)
        push(event, day)
      }
    }
  }
  return out
}
