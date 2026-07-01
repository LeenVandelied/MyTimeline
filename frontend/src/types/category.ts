import { z } from 'zod'

/**
 * #65 / S10 #52 — DTO `CategoryResponse` du backend.
 *
 * Sync Zod ↔ DTO (cf. cp-frontend « Sync Zod ↔ DTO ») :
 *   - `id`   : UUID (string).
 *   - `name` : libellé affiché.
 *   - `system` : booléen. `true` = catégorie système (owner NULL côté backend,
 *     ADR-002) → lisible de tous mais NON supprimable (403). Le DTO n'expose
 *     JAMAIS l'ownerId, uniquement ce booléen dérivé (br-categories).
 *   - `color` (#61) : couleur de la catégorie (`CategoryResponse.color`). Utilisée
 *     par le `ProductDrawer` comme couleur héritée par défaut du produit. Backend
 *     `Category.getColor()` peut être `null` → `.nullable().optional()` (défensif,
 *     et rétro-compatible avec les fixtures #65 qui l'omettent).
 *
 * `id`/`name`/`system` : champs backend toujours présents → pas d'`.optional()`.
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  system: z.boolean(),
  color: z.string().nullable().optional(),
})

export type Category = z.infer<typeof categorySchema>
