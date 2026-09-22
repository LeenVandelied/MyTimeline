'use client'

import { useQuery } from '@tanstack/react-query'
import { getArchivedProducts } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import type { ArchivedProduct } from '@/types/product'

/**
 * #711 — Produits ARCHIVÉS de l'utilisateur courant (onglet « Archivés » de `/products`).
 *
 * Clé `queryKeys.products.archived(userId)`, sous le préfixe `['products']` : l'archivage
 * (`useArchiveProduct`) et la restauration (`useRestoreProduct`) l'invalident par ce préfixe.
 * `enabled` : aucun appel `/users/undefined/...` tant que `userId` est absent.
 */
export function useArchivedProducts(userId: string | undefined) {
  return useQuery<ArchivedProduct[]>({
    queryKey: queryKeys.products.archived(userId ?? ''),
    queryFn: () => getArchivedProducts(userId as string),
    enabled: Boolean(userId),
  })
}
