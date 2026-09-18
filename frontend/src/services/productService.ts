import apiClient from './apiClient'
import { ArchivedProduct, Product, ProductCreate, ProductUpdate } from '@/types/product'
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
    // #163 — `ProductCreationRequest.userId` est `@NotNull` et validé par `@Valid`
    // AVANT que le contrôleur ne le réécrive depuis le path (ProductController :
    // `request.setUserId(userId)` s'exécute APRÈS la Bean Validation). Sans `userId`
    // dans le body, la validation rejette la requête en 400 — contrat confirmé par
    // `ProductControllerOwnershipTest` (le body POST inclut `userId`). On l'injecte
    // donc ici. L'ownership reste dérivé du path/JWT (le userId du body est écrasé
    // côté backend) : aucune élévation de privilège possible.
    const response = await apiClient.post(`/users/${userId}/products`, {
      ...productData,
      userId,
    })
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
 * #61 / #50 — ARCHIVAGE d'un produit (le nom `deleteProduct` suit le verbe HTTP, pas le
 * comportement).
 *
 * #605 — archiver = soft delete : données conservées côté backend (#50, BR-PRO-007,
 * `archived = true`), produit masqué des listes (`@SQLRestriction`). #711 — l'archivage
 * n'est PAS définitif : le produit se retrouve dans l'onglet « Archivés » et se restaure
 * via `restoreProduct`. Les surfaces disent donc « Archiver », jamais « Supprimer » ; ce
 * dernier verbe est réservé aux suppressions physiques (événements, catégories). Une
 * éventuelle suppression définitive de produit exigerait un endpoint et un libellé
 * distincts — ne pas la faire passer par cette fonction.
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

/**
 * #711 — Produits ARCHIVÉS de l'utilisateur (`GET /users/{userId}/products/archived`).
 * Réponse sans `events` (cf. `archivedProductSchema`).
 */
export const getArchivedProducts = async (userId: string): Promise<ArchivedProduct[]> => {
  try {
    const response = await apiClient.get(`/users/${userId}/products/archived`)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des produits archivés :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #711 — DÉSARCHIVAGE d'un produit (BR-PRO-007/011) : `POST
 * /users/{userId}/products/{productId}/restore` → 204. Un produit inconnu, déjà actif ou
 * appartenant à un autre utilisateur répond 404 (réponse unique, anti-énumération). L'erreur
 * axios est propagée telle quelle pour l'affichage inline du dialog de confirmation.
 */
export const restoreProduct = async (userId: string, productId: string): Promise<void> => {
  try {
    await apiClient.post(`/users/${userId}/products/${productId}/restore`)
  } catch (error) {
    console.error('Erreur lors du désarchivage du produit :', safeErrorMessage(error))
    throw error
  }
}
