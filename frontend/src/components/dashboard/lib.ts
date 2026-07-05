import type { Product } from '@/types/product'

/**
 * #208 (review) — Helpers partagés des composants dashboard.
 * Extraction de la logique dupliquée verbatim entre `ProductList` (#80) et
 * `ProductCarousel` (#83). Aucun changement de comportement.
 */

/** Prochain event (début >= now) le plus proche, non archivé. */
export function nextEvent(
  product: Product,
  now: Date,
): { title: string; start: string } | null {
  const upcoming = (product.events ?? [])
    .filter((e) => !e.archived && new Date(e.startDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const first = upcoming[0]
  return first ? { title: first.title, start: first.startDate } : null
}
