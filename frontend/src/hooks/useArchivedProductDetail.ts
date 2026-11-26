'use client'

import { useQuery } from '@tanstack/react-query'
import { getArchivedProductDetail } from '@/services/productService'
import { queryKeys } from '@/lib/query-keys'
import { isUuid } from '@/lib/uuid'
import type { ArchivedProductDetail } from '@/types/product'

/** Statut HTTP d'une erreur axios (`undefined` : pas de réponse, donc erreur réseau). */
function httpStatusOf(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status
  return typeof status === 'number' ? status : undefined
}

/**
 * Relance unique, réservée aux 5xx et aux erreurs réseau. Jamais un 4xx : le 404 est la
 * réponse UNIQUE pour un produit inconnu, actif ou d'autrui (BR-PRO-011), le 400 un identifiant
 * invalide, le 403 un refus. Aucun ne change en rejouant.
 */
export function shouldRetryArchivedDetail(failureCount: number, error: unknown): boolean {
  const status = httpStatusOf(error)
  return (status === undefined || status >= 500) && failureCount < 1
}

/**
 * #718 — Fiche d'un produit archivé (`GET /users/{userId}/products/archived/{productId}`).
 *
 * Un 404 est un résultat attendu (la page affiche « introuvable »), pas une erreur à signaler.
 * Un identifiant qui n'est pas un UUID n'appelle pas la route (le backend répondrait 400, avec
 * un toast global) : la requête reste désactivée. Clé sous le préfixe `['products']`.
 */
export function useArchivedProductDetail(userId: string | undefined, productId: string) {
  return useQuery<ArchivedProductDetail>({
    queryKey: queryKeys.products.archivedDetail(userId ?? '', productId),
    queryFn: () => getArchivedProductDetail(userId as string, productId),
    enabled: Boolean(userId) && isUuid(productId),
    retry: shouldRetryArchivedDetail,
  })
}
