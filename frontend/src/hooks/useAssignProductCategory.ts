'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProduct } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import type { InlineErrorOptions } from '@/services/inlineErrorHandling'

/**
 * #604 — Affectation d'un produit à une catégorie depuis sa puce, EN DIRECT.
 *
 * `PATCH /users/{userId}/products/{productId}` avec `{ categoryId }` (même endpoint que le
 * drawer, `updateProduct`). Mise à jour OPTIMISTE de deux caches :
 *   - `products.withEvents(userId)` : la puce change de carte, et sa catégorie prend
 *     `{ id, name, color }` de la CIBLE (lue dans `categories.all`) : ce cache est partagé
 *     avec la frise et l'onglet Produits, un nom ou une couleur périmés y seraient visibles ;
 *   - `categories.all` : compteur des actifs −1 / +1 sur les deux cartes. Les compteurs
 *     restent ceux du serveur (#695) : on ne fait que les ajuster en attendant la réponse.
 * Succès : le produit renvoyé par le serveur remplace l'état optimiste.
 * Échec : les deux caches reviennent EXACTEMENT à l'instantané pris avant le changement. Un
 * instantané complet n'est sûr que sans envoi concurrent : la vue désactive les choix
 * pendant `isPending`.
 * Fin de mutation (succès comme échec) : invalidation de `categories.all` et `products.all`
 * (préfixe qui couvre `withEvents`), le serveur reprend la main sur les compteurs.
 *
 * SIGNALEMENT D'ERREUR. L'intercepteur (`apiClient.ts`) toaste déjà le 400, le 401 et le 500,
 * et alimente le store réseau pour 5xx et timeout. Le 403 est le seul statut que ce hook
 * retire du toast (`options` = `HANDLES_FORBIDDEN_INLINE`, passé par la vue) ; la vue rend
 * donc elle-même le 403, le 404 et le 409, que l'intercepteur ne signale pas.
 */
type Snapshot = { products?: Product[]; categories?: Category[] }

export function useAssignProductCategory(userId: string | undefined, options?: InlineErrorOptions) {
  const queryClient = useQueryClient()
  const productsKey = queryKeys.products.withEvents(userId ?? '')
  const categoriesKey = queryKeys.categories.all

  return useMutation<Product, unknown, { productId: string; categoryId: string }, Snapshot>({
    mutationFn: ({ productId, categoryId }) => {
      if (!userId) return Promise.reject(new Error('userId manquant'))
      return updateProduct(userId, productId, { categoryId }, options)
    },
    onMutate: async ({ productId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey: productsKey })
      await queryClient.cancelQueries({ queryKey: categoriesKey })
      const products = queryClient.getQueryData<Product[]>(productsKey)
      const categories = queryClient.getQueryData<Category[]>(categoriesKey)
      const fromId = products?.find((p) => p.id === productId)?.category.id
      const target = categories?.find((c) => c.id === categoryId)

      if (products) {
        queryClient.setQueryData<Product[]>(
          productsKey,
          products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  category: target
                    ? { id: target.id, name: target.name, color: target.color ?? null }
                    : { ...p.category, id: categoryId },
                }
              : p,
          ),
        )
      }
      if (categories && fromId !== categoryId) {
        queryClient.setQueryData<Category[]>(
          categoriesKey,
          categories.map((c) => {
            if (c.id === fromId)
              return { ...c, productCount: Math.max((c.productCount ?? 0) - 1, 0) }
            if (c.id === categoryId) return { ...c, productCount: (c.productCount ?? 0) + 1 }
            return c
          }),
        )
      }
      return { products, categories }
    },
    onSuccess: (updated, { productId }) => {
      if (!updated) return
      queryClient.setQueryData<Product[]>(productsKey, (current) =>
        current?.map((p) => (p.id === productId ? { ...p, ...updated } : p)),
      )
    },
    onError: (_error, _vars, snapshot) => {
      if (snapshot?.products) queryClient.setQueryData(productsKey, snapshot.products)
      if (snapshot?.categories) queryClient.setQueryData(categoriesKey, snapshot.categories)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKey })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}
