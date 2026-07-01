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
 *
 * Champ backend toujours présent → pas de `.optional()` / `.nullable()`.
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  system: z.boolean(),
})

export type Category = z.infer<typeof categorySchema>
