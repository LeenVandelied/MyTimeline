import { z } from 'zod'
import { eventCreationSchema, eventSchema } from './event'

/**
 * #158 — Couleur produit (follow-up S11 #61). Format hex `#RRGGBB`, aligné sur le
 * backend `ProductCreationRequest.color`/`ProductUpdateRequest.color`
 * (`@Pattern("^#[0-9a-fA-F]{6}$")`). Réutilisé en lecture (nullable) et en écriture.
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB attendu)')

/**
 * #61 — Sync Zod ↔ DTO backend (cf. cp-frontend « Sync Zod ↔ DTO », BR-PRO-001).
 *
 * Le backend borne `name` via `@Size(min = 1, max = 100)` (ProductCreationRequest /
 * ProductUpdateRequest). L'ancien front `z.string().min(3)` était DÉSYNCHRONISÉ :
 * il rejetait des noms de 1-2 caractères pourtant valides côté serveur. Corrigé
 * en `min(1).max(100)` (lecture ET écriture).
 *
 * #158 — `color` (surcharge produit) + `category.color` (couleur héritée) exposés par
 * `ProductResponse` : `.nullable()` (le backend émet toujours le champ, `null` = héritage
 * pour le produit / catégorie sans couleur). Le front calcule la couleur effective
 * `product.color ?? product.category.color`.
 */
export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  color: hexColorSchema.nullable(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: hexColorSchema.nullable(),
  }),
  events: z.array(eventSchema),
})

export type Product = z.infer<typeof productSchema>

/**
 * Payload de création `POST /users/{userId}/products`.
 *
 * DTO backend `ProductCreationRequest {name, category(UUID), userId, events[]}`
 * (userId du body ignoré, l'ownership vient du path/JWT — BR-PRO-004). `category`
 * = UUID d'une catégorie renvoyée par `GET /api/categories` (owner ∪ système,
 * BR-PRO-002/010). `events` : ne JAMAIS envoyer `null` (NPE backend non gardé,
 * BR-PRO-005) → tableau vide ou omission.
 *
 * #158 — `color` optionnel (hex `#RRGGBB`) : omis = héritage de la couleur de la
 * catégorie côté backend (`ProductCreationRequest.color` nullable).
 */
export const productCreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().uuid(),
  color: hexColorSchema.optional(),
  events: z.array(eventCreationSchema).optional(),
})

export type ProductCreate = z.infer<typeof productCreateSchema>

/**
 * #61 — Payload de mise à jour partielle `PATCH /users/{userId}/products/{productId}`
 * (#50, BR-PRO-009). DTO backend `ProductUpdateRequest {name?, categoryId?}`.
 *
 * ⚠ Le champ catégorie s'appelle `categoryId` en PATCH (pas `category` comme en
 * création). Les champs sont optionnels : absent = inchangé. `name` fourni doit
 * rester borné 1..100 (le backend a aussi un `@Pattern(".*\\S.*")` anti-blanc).
 *
 * #158 — Couleur produit (BR-PRO-009) :
 *   - `color`      : hex `#RRGGBB`, pose une surcharge. Absent = couleur inchangée.
 *   - `clearColor` : `true` = réinitialise la surcharge (ré-héritage catégorie).
 *     Nécessaire car `color` absent signifie déjà « inchangé » (le backend ne peut
 *     donc pas distinguer un reset d'un no-op sans ce flag). `clearColor` prime sur
 *     `color` côté backend. `false` (défaut) n'est pas envoyé (diff partiel).
 * `refine` : au moins un champ effectif doit être présent (le PATCH doit muter qqch).
 */
export const productUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional(),
    color: hexColorSchema.optional(),
    clearColor: z.literal(true).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.categoryId !== undefined ||
      data.color !== undefined ||
      data.clearColor === true,
    { message: 'Au moins un champ doit être fourni' },
  )

export type ProductUpdate = z.infer<typeof productUpdateSchema>
