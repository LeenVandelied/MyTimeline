'use client'

import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { Product } from '@/types/product'

/**
 * #48 — Hook pilote TanStack Query v5 : liste des produits (events embarqués)
 * de l'utilisateur courant.
 *
 * Endpoint réel : `GET /api/users/{userId}/products`. Le DTO `Product` embarque
 * déjà son tableau `events` (cf. `productSchema`) — il n'existe PAS d'endpoint
 * `/api/products/with-events` côté backend (#70 inchangé) ; le nom du hook
 * reflète l'intention métier, pas une route dédiée. On réutilise le service
 * axios existant `getProducts` comme `queryFn` (migration progressive : la
 * couche transport reste axios, TanStack n'ajoute QUE cache/dédup/refetch).
 *
 * v5 STRICT : forme objet `useQuery({ queryKey, queryFn })`.
 * `enabled` : pas de fetch tant que `userId` est absent (évite un appel
 * `/users/undefined/products`).
 */
export function useProductsWithEvents(userId: string | undefined) {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.withEvents(userId ?? ''),
    queryFn: () => getProducts(userId as string),
    enabled: Boolean(userId),
  })
}
