import type { EventPaletteRole } from '@/lib/event-palette'

/**
 * #638 (DEC-S82-004) — catégories types proposées à un compte sans aucune catégorie.
 *
 * `id` = suffixe de la clé i18n `products.categories.suggestions.<id>` et du testid du
 * bouton. `role` = rôle de la palette unique (#577) : le hex se lit par `paletteHex` au
 * moment du choix, il n'est jamais recopié ici. Ordre = ordre d'affichage.
 */
export interface CategorySuggestion {
  readonly id: string
  readonly role: EventPaletteRole
}

export const CATEGORY_SUGGESTIONS: readonly CategorySuggestion[] = [
  { id: 'vehicles', role: 'sky' },
  { id: 'insurance', role: 'periwinkle' },
  { id: 'health', role: 'grass' },
  { id: 'food', role: 'amber' },
  { id: 'housing', role: 'orchid' },
  { id: 'travel', role: 'teal' },
  { id: 'finance', role: 'rose' },
]
