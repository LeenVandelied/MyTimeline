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
  description: z.string().nullable().optional(),
})

export type Category = z.infer<typeof categorySchema>

/**
 * #62 — Payloads d'écriture catégorie (POST/PATCH `/api/categories`).
 *
 * Sync Zod ↔ DTO backend (`CategoryRequest` / `CategoryUpdateRequest`) :
 *   - `name`        : `@NotBlank @Size(max=255)` (BR-CAT-001) → `min(1).max(255)`.
 *   - `color`       : `@Size(max=255)` optionnel. Le backend N'IMPOSE PAS le format
 *     hex (contrairement aux produits `@Pattern`) : le picker libre (react-colorful)
 *     émet `#RRGGBB`, mais on ne sur-contraint PAS le contrat → simple string bornée.
 *   - `description` : `@Size(max=255)` optionnelle.
 *
 * Le DTO n'a PAS de sémantique `clearColor` (contrairement aux produits #158) :
 * PATCH écrase `color`/`description` avec la valeur portée (y compris `null`/vide
 * pour effacer). On envoie donc toujours name (+ color/description tels quels).
 */
export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().max(255).optional(),
  description: z.string().max(255).optional(),
})

export type CategoryCreate = z.infer<typeof categoryCreateSchema>

/**
 * PATCH : le backend porte `name` obligatoire (BR-CAT-001/003, `@NotBlank`).
 * `color`/`description` optionnels côté transport (absent = inchangé côté drawer,
 * qui n'envoie que le diff).
 */
export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().max(255).optional(),
  description: z.string().max(255).optional(),
})

export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>

/**
 * Factory i18n du schéma formulaire (messages traduits, cf. cp-frontend « deux
 * familles de schémas »). Seul `name` porte une validation bloquante côté UI
 * (BR-CAT-001) ; color/description sont libres. Utilisé par le `zodResolver` du
 * `CategoryDrawer`.
 */
export function createCategoryFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, { message: t('nameRequired') }).max(255, { message: t('nameTooLong') }),
    color: z.string().max(255).optional(),
    description: z.string().max(255).optional(),
  })
}

export type CategoryFormValues = z.infer<ReturnType<typeof createCategoryFormSchema>>
