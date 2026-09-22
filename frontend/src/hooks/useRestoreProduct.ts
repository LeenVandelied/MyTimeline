'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { restoreProduct } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { ArchivedProduct } from '@/types/product'

export interface RestoreProductVariables {
  productId: string
}

/** Code HTTP d'une erreur axios (lecture défensive, sans `any`). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

/**
 * #711 — DÉSARCHIVAGE d'un produit (TanStack Query v5, mutation).
 *
 * `POST /users/{userId}/products/{productId}/restore` → 204 (BR-PRO-007/011).
 *
 * Sur succès (réponse serveur reçue) — PIT-S92-004, l'état doit être juste EN PLACE, pas
 * seulement après rechargement :
 *   1. `setQueryData(products.archived(userId))` retire la ligne de l'onglet « Archivés »
 *      tout de suite (pas de ligne fantôme pendant le refetch).
 *   2. `invalidateQueries(products.all)` : le préfixe `['products']` couvre
 *      `products.withEvents(userId)` (liste, tableau de bord, frise — le produit ET ses
 *      événements y reviennent), `products.detail(id)` et `products.archived(userId)`.
 *      Le produit restauré n'est PAS injecté dans la liste active : la réponse des archivés
 *      ne porte pas ses événements, un ajout local peindrait un produit sans échéance.
 *   3. `invalidateQueries(categories.all)` : la catégorie du produit retrouve un produit
 *      actif ; tout compteur dérivé de `categories.*` doit être relu.
 * Les promesses d'invalidation ne sont pas retournées : le toast part à la réponse du POST.
 *
 * Échec : l'erreur n'est PAS avalée (`mutateAsync` rejette → erreur inline du dialog). Sur
 * 404 (produit déjà restauré ailleurs, ou disparu), la liste des archivés est périmée :
 * on l'invalide pour qu'elle se corrige derrière le message.
 */
export function useRestoreProduct(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, RestoreProductVariables>({
    mutationKey: ['products', 'restore'],
    mutationFn: ({ productId }) => {
      if (!userId) {
        return Promise.reject(new Error('userId manquant'))
      }
      return restoreProduct(userId, productId)
    },
    onSuccess: (_result, { productId }) => {
      if (userId) {
        queryClient.setQueryData<ArchivedProduct[]>(
          queryKeys.products.archived(userId),
          (previous) => previous?.filter((product) => product.id !== productId),
        )
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
    onError: (error) => {
      if (userId && httpStatusOf(error) === 404) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.archived(userId) })
      }
    },
  })
}
