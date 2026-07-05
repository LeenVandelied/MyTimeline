import apiClient from './apiClient'
import {
  categorySchema,
  type Category,
  type CategoryCreate,
  type CategoryUpdate,
} from '@/types/category'
import { safeErrorMessage } from '@/lib/safe-error'

/**
 * #65 / S10 #52 — Transport axios pour le domaine catégories.
 *
 * `GET /api/categories` renvoie l'union `owner == caller ∪ système` (br-categories).
 * On valide la réponse via Zod (parse) : une dérive de contrat backend (champ
 * `system` manquant p.ex.) échoue ici, tôt, plutôt que de propager un objet
 * malformé dans le select de réassignation.
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await apiClient.get('/categories')
    return categorySchema.array().parse(response.data)
  } catch (error) {
    // NE JAMAIS logger l'objet axios brut (Authorization/cookies/PII). Message assaini.
    console.error('Erreur lors de la récupération des catégories :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #62 — Création d'une catégorie (POST /api/categories) — br-categories, ADR-002.
 *
 * L'ownership est dérivé du cookie JWT côté backend (pas de userId dans le body).
 * On valide la réponse via Zod (parse) comme en lecture pour détecter une dérive
 * de contrat tôt. L'erreur axios est propagée telle quelle : l'appelant lit
 * `error.response.status` (409 = nom dupliqué BR-CAT-004) pour l'inline.
 */
export const createCategory = async (data: CategoryCreate): Promise<Category> => {
  try {
    const response = await apiClient.post('/categories', data)
    return categorySchema.parse(response.data)
  } catch (error) {
    // NE JAMAIS logger l'objet axios brut (Authorization/cookies/PII). Message assaini.
    console.error('Erreur lors de la création de la catégorie :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #62 — Mise à jour partielle (PATCH /api/categories/{id}) — br-categories.
 *
 * Backend : ownership `owner_id == JWT` requis (403 sinon), 404 si inexistante/
 * autrui, 409 si le nouveau nom collisionne (BR-CAT-004). L'erreur est propagée
 * pour l'affichage inline.
 */
export const updateCategory = async (
  id: string,
  data: CategoryUpdate,
): Promise<Category> => {
  try {
    const response = await apiClient.patch(`/categories/${id}`, data)
    return categorySchema.parse(response.data)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #62 — Suppression avec réassignation atomique (BR-CAT-002).
 *
 * `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>` → 204. Sans cible,
 * le backend renvoie 409 si des produits référencent la catégorie
 * (`CategoryInUseException`). On propage l'erreur (`error.response.status`) pour
 * l'affichage inline via `DeleteConfirmDialog` (#65 : `onConfirm` doit REJETER).
 */
export const deleteCategory = async (
  id: string,
  reassignToCategoryId?: string,
): Promise<void> => {
  try {
    await apiClient.delete(`/categories/${id}`, {
      params: reassignToCategoryId ? { reassignToCategoryId } : undefined,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie :', safeErrorMessage(error))
    throw error
  }
}
