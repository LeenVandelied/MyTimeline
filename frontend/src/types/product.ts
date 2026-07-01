import { z } from 'zod'
import { eventCreationSchema, eventSchema } from './event'

/**
 * #61 — Sync Zod ↔ DTO backend (cf. cp-frontend « Sync Zod ↔ DTO », BR-PRO-001).
 *
 * Le backend borne `name` via `@Size(min = 1, max = 100)` (ProductCreationRequest /
 * ProductUpdateRequest). L'ancien front `z.string().min(3)` était DÉSYNCHRONISÉ :
 * il rejetait des noms de 1-2 caractères pourtant valides côté serveur. Corrigé
 * en `min(1).max(100)` (lecture ET écriture).
 */
export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  category: z.object({
    id: z.string(),
    name: z.string(),
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
 */
export const productCreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().uuid(),
  events: z.array(eventCreationSchema).optional(),
})

export type ProductCreate = z.infer<typeof productCreateSchema>

/**
 * #61 — Payload de mise à jour partielle `PATCH /users/{userId}/products/{productId}`
 * (#50, BR-PRO-009). DTO backend `ProductUpdateRequest {name?, categoryId?}`.
 *
 * ⚠ Le champ catégorie s'appelle `categoryId` en PATCH (pas `category` comme en
 * création). Les deux champs sont optionnels : absent = inchangé. `name` fourni
 * doit rester borné 1..100 (le backend a aussi un `@Pattern(".*\\S.*")` anti-blanc).
 */
export const productUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional(),
  })
  .refine((data) => data.name !== undefined || data.categoryId !== undefined, {
    message: 'Au moins un champ doit être fourni',
  })

export type ProductUpdate = z.infer<typeof productUpdateSchema>
