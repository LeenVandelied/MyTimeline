'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { Product, ProductCreate } from '@/types/product'

/**
 * #61 — Création d'un produit via TanStack Query v5 (mutation).
 *
 * `POST /users/{userId}/products` (BR-PRO-001/002). Sur succès, invalide la liste
 * produits de l'utilisateur (`queryKeys.products.withEvents(userId)`) ET le
 * préfixe `products.all` — pour que le dashboard rafraîchisse sans refetch manuel.
 *
 * v5 STRICT : forme objet `useMutation({ mutationFn })`. L'erreur axios n'est PAS
 * avalée : le composant lit `error` (état `isError`) et `error.response.status`
 * pour l'affichage inline (submitting / error / conflict 409).
 */
export function useCreateProduct(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Product, unknown, ProductCreate>({
    mutationFn: (data: ProductCreate) => {
      if (!userId) {
        return Promise.reject(new Error('userId manquant'))
      }
      return createProduct(userId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.withEvents(userId),
        })
      }
    },
  })
}
