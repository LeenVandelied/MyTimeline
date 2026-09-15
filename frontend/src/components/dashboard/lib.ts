/**
 * #208 (review) — Helpers partagés des composants dashboard (`ProductList` #80,
 * `ProductCarousel` #83).
 *
 * #603 — `nextEvent` vit désormais dans `@/lib/next-occurrence`, partagé avec la liste
 * Produits. Ré-exporté ici pour les imports existants. Changement de comportement VOULU :
 * les récurrences sont avancées jusqu'à la prochaine occurrence, et un événement du jour
 * reste « à venir » toute la journée (comparaison au début du jour local, plus à `now`).
 */
export { nextEvent } from '@/lib/next-occurrence'
