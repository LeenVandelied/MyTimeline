import { parseLocalDate } from '@/lib/date-iso'
import type { FullCalendarEvent } from '@/types/event'

/**
 * #664 — Étendue des événements TRACÉS par la sous-frise produit : du plus tôt des
 * débuts à la plus tardive des fins (`end` absent → `start`, même règle que
 * `computeRange` de la frise). Calculée sur les DONNÉES que `ProductDetailView`
 * passe à la frise, jamais sur son viewport : la fenêtre visible (zoom + défilement)
 * vit dans `TimelineView`/`useTimelineMobileState` et n'est pas connue du parent.
 * `null` : aucune date exploitable.
 */
export function eventSpan(
  events: Pick<FullCalendarEvent, 'start' | 'end'>[],
): { from: Date; to: Date } | null {
  let min = Infinity
  let max = -Infinity
  for (const event of events) {
    const start = parseLocalDate(event.start).getTime()
    if (Number.isNaN(start)) continue
    const end = parseLocalDate(event.end || event.start).getTime()
    min = Math.min(min, start)
    // Fin illisible : l'événement s'arrête à son début (ponctuel de fait).
    max = Math.max(max, Number.isNaN(end) ? start : end)
  }
  if (min === Infinity) return null
  return { from: new Date(min), to: new Date(Math.max(min, max)) }
}

/**
 * #664 — Plage lisible « 12 août – 3 sept. » (format court de la maquette : jour +
 * mois abrégé). L'année n'apparaît que si l'une des bornes sort de l'année de
 * `today`. NB : sur une plage À CHEVAL sur deux années, ICU (`formatRange`) ajoute
 * de lui-même les deux années ; la condition ne décide donc vraiment que pour une
 * plage entière dans une autre année (« 5 mars – 20 juin 2024 »). `formatRange` localise
 * le séparateur, fusionne le mois commun (« 3–12 oct. ») et rend une date SEULE
 * quand les deux bornes tombent le même jour.
 *
 * ⚠ PIT-S108-002 — `formatRange` insère des espaces fines (U+2009) autour du tiret :
 * un test compare via cette même fonction ou après normalisation, jamais à un
 * littéral saisi à la main.
 */
export function formatEventSpan(
  events: Pick<FullCalendarEvent, 'start' | 'end'>[],
  locale: string,
  today: Date,
): string | null {
  const span = eventSpan(events)
  if (!span) return null
  const year = today.getFullYear()
  const showYear = span.from.getFullYear() !== year || span.to.getFullYear() !== year
  const fmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(showYear ? { year: 'numeric' } : {}),
  })
  return fmt.formatRange(span.from, span.to)
}
