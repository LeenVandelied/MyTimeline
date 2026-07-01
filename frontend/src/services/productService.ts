import apiClient from './apiClient'
import { Product, ProductCreate, ProductUpdate } from '@/types/product'
import { safeErrorMessage } from '@/lib/safe-error'

export const getProducts = async (userId: string): Promise<Product[]> => {
  try {
    const response = await apiClient.get(`/users/${userId}/products`)
    return response.data
  } catch (error) {
    // NE JAMAIS logger l'objet axios brut (error.config.data/headers = body +
    // Authorization/cookies). On se limite à un message assaini.
    console.error('Erreur lors de la récupération des produits :', safeErrorMessage(error))
    throw error
  }
}

export const createProduct = async (
  userId: string,
  productData: ProductCreate,
): Promise<Product> => {
  try {
    const response = await apiClient.post(`/users/${userId}/products`, productData)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la création du produit :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #61 / #50 — Mise à jour partielle d'un produit (BR-PRO-009).
 *
 * `PATCH /users/{userId}/products/{productId}` avec `ProductUpdateRequest
 * {name?, categoryId?}`. On propage l'erreur axios telle quelle (l'appelant lit
 * `error.response.status` pour distinguer 404 / 409 / 403 inline — même contrat
 * que `DeleteConfirmDialog` #65).
 */
export const updateProduct = async (
  userId: string,
  productId: string,
  productData: ProductUpdate,
): Promise<Product> => {
  try {
    const response = await apiClient.patch(`/users/${userId}/products/${productId}`, productData)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #61 / #50 — Suppression (soft delete backend, BR-PRO) d'un produit.
 *
 * `DELETE /users/{userId}/products/{productId}` → 204. On propage l'erreur axios
 * (`error.response.status`) pour l'affichage inline 404/403/409 via
 * `DeleteConfirmDialog` (#65 : `onConfirm` doit REJETER en cas d'erreur).
 */
export const deleteProduct = async (userId: string, productId: string): Promise<void> => {
  try {
    await apiClient.delete(`/users/${userId}/products/${productId}`)
  } catch (error) {
    console.error('Erreur lors de la suppression du produit :', safeErrorMessage(error))
    throw error
  }
}
