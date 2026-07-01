'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProduct } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { Product, ProductUpdate } from '@/types/product'

/**
 * #61 / #50 — Mise à jour partielle d'un produit via TanStack Query v5 (mutation).
 *
 * `PATCH /users/{userId}/products/{productId}` (BR-PRO-009). Sur succès, invalide
 * la liste produits + le détail (`queryKeys.products.detail(productId)`).
 *
 * L'erreur axios est propagée telle quelle (rejet de la promesse) : le drawer
 * (mode édition) et le `DeleteConfirmDialog` (#65) lisent `error.response.status`
 * pour distinguer 404 (produit supprimé) / 409 (catégorie supprimée entre-temps)
 * / 403 (ownership) et l'afficher inline. NE PAS avaler l'erreur ici.
 */
export function useUpdateProduct(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Product, unknown, { productId: string; data: ProductUpdate }>({
    mutationFn: ({ productId, data }) => {
      if (!userId) {
        return Promise.reject(new Error('userId manquant'))
      }
      return updateProduct(userId, productId, data)
    },
    onSuccess: (_result, { productId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(productId),
      })
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.withEvents(userId),
        })
      }
    },
  })
}
