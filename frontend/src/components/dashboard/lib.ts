import type { Product } from '@/types/product'
import { parseLocalDate } from '@/lib/date-iso'

/**
 * #208 (review) — Helpers partagés des composants dashboard.
 * Extraction de la logique dupliquée verbatim entre `ProductList` (#80) et
 * `ProductCarousel` (#83). Aucun changement de comportement.
 */

/**
 * Prochain event (début >= now) le plus proche, non archivé.
 * #652 — `startDate` est une `LocalDate` : lue à minuit LOCAL (`parseLocalDate`),
 * sinon elle reculait d'un jour à l'ouest de Greenwich.
 */
export function nextEvent(product: Product, now: Date): { title: string; start: string } | null {
  const upcoming = (product.events ?? [])
    .filter((e) => !e.archived && parseLocalDate(e.startDate) >= now)
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime())
  const first = upcoming[0]
  return first ? { title: first.title, start: first.startDate } : null
}
