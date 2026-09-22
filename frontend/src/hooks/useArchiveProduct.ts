'use client'

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'
import { deleteProduct } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { Product } from '@/types/product'

/**
 * Clé de MUTATION de l'archivage produit (cache des mutations, distinct du cache des
 * requêtes : aucune collision avec `invalidateQueries`). Lue par
 * `useIsProductArchivedHere` pour savoir qu'un archivage de CE produit est parti d'ici.
 */
export const archiveProductMutationKey = ['products', 'archive'] as const

export interface ArchiveProductVariables {
  productId: string
}

/**
 * PIT-S92-004 — ARCHIVAGE d'un produit via TanStack Query v5 (mutation).
 *
 * `DELETE /users/{userId}/products/{productId}` → 204 : soft delete (#50, BR-PRO-007),
 * réversible depuis #711 (onglet « Archivés », `useRestoreProduct`). Les trois surfaces
 * (`ProductsListView`, `ProductDrawer`, `ProductDetailView`) appelaient le service brut,
 * sans invalidation : la ligne archivée restait affichée jusqu'au refetch suivant alors que
 * le toast « Produit archivé » était déjà parti.
 *
 * Sur succès (réponse serveur reçue, donc ni optimiste ni à annuler) :
 *   1. `setQueryData(products.withEvents(userId))` retire le produit du cache de la liste
 *      TOUT DE SUITE. Sans ce retrait, la liste atteinte depuis le détail se monte sur le
 *      cache périmé et peint la ligne archivée le temps du refetch.
 *   2. `invalidateQueries(products.all)` : préfixe `['products']` qui COUVRE par matching
 *      `products.withEvents(userId)` (liste produits, tableau de bord `useDashboardData`),
 *      `products.detail(id)` et, depuis #711, `products.archived(userId)` (l'onglet
 *      « Archivés » voit arriver le produit).
 *   3. `invalidateQueries(categories.all)` — #695. La note précédente (« `categories.all`
 *      ne porte pas de compteur, dérivé côté client des produits ») est PÉRIMÉE : depuis
 *      #695 les compteurs de la carte catégorie sont des champs de `CategoryResponse`
 *      (`productCount` / `archivedProductCount`) servis par `GET /api/categories`. Sans
 *      cette ligne, archiver un produit puis passer à l'onglet Catégories laisse la carte
 *      affirmer qu'il est encore actif jusqu'au refetch suivant (PIT-S92-004 : vérifier
 *      l'état EN PLACE, pas seulement après rechargement).
 *
 * Aucune requête `events.*` ne liste les événements d'un produit. Les promesses
 * d'invalidation ne sont PAS retournées : le toast part à la réponse du DELETE, pas à la
 * fin du refetch (PIT-S90-008 assumé, le retrait 1. rend la liste juste sans l'attendre).
 *
 * L'erreur axios n'est PAS avalée : `mutateAsync` rejette pour que `DeleteConfirmDialog`
 * (#65) l'affiche inline (404/403/409) — `onConfirm` doit REJETER. Aucune invalidation
 * sur échec.
 */
export function useArchiveProduct(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, ArchiveProductVariables>({
    mutationKey: archiveProductMutationKey,
    mutationFn: ({ productId }) => {
      if (!userId) {
        return Promise.reject(new Error('userId manquant'))
      }
      return deleteProduct(userId, productId)
    },
    onSuccess: (_result, { productId }) => {
      if (userId) {
        queryClient.setQueryData<Product[]>(queryKeys.products.withEvents(userId), (previous) =>
          previous?.filter((product) => product.id !== productId),
        )
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

/**
 * Vrai dès qu'un archivage de `productId` lancé depuis ce client est EN COURS ou a RÉUSSI.
 *
 * Sert au détail produit : le retrait du cache (ci-dessus) le ferait passer sur « Produit
 * introuvable ou archivé » entre la réponse serveur et l'arrivée sur la liste. Un archivage
 * en échec ne compte pas (le dialog affiche l'erreur, la fiche reste la vraie).
 */
export function useIsProductArchivedHere(productId: string): boolean {
  const matches = useMutationState({
    filters: {
      mutationKey: archiveProductMutationKey,
      predicate: (mutation) => {
        const { status, variables } = mutation.state
        const target = (variables as ArchiveProductVariables | undefined)?.productId
        return target === productId && (status === 'pending' || status === 'success')
      },
    },
    select: (mutation) => mutation.state.status,
  })
  return matches.length > 0
}
