'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { setEventArchived } from '@/services/eventService'
import { queryKeys } from '@/lib/query-keys'

/**
 * #307 — Bascule `archived` d'un événement (BR-EVE-013) via TanStack Query v5.
 *
 * Utilisé par la vue détail produit pour DÉSARCHIVER depuis la liste « archivés »
 * (l'archivage, lui, reste porté par `EventEditForm`, BR-EVE-013).
 *
 * INVALIDATION : préfixe `queryKeys.products.all` (`['products']`), qui couvre par
 * matching de préfixe `products.withEvents(userId)` — la source réelle de la frise et
 * de l'historique (`useProductsWithEvents`, dashboard ET détail produit). Même choix que
 * `useCreateEvent` #300 / `useDeleteCategory` #245 : pas de `userId` threadé juste pour
 * invalider (PAT-S40-001), donc aucune garde `if (user?.id)` qui raterait silencieusement
 * le rafraîchissement.
 *
 * INVALIDATION AUSSI SUR 409 (BR-EVE-015) : un conflit signifie que la version détenue
 * est périmée. Sans re-fetch, l'utilisateur re-cliquerait indéfiniment avec la MÊME
 * version stale → boucle de 409. On rafraîchit donc pour que le re-clic reparte d'une
 * version fraîche. Les autres statuts (403/404/réseau) ne périment rien : pas
 * d'invalidation, l'erreur remonte telle quelle.
 *
 * L'erreur n'est PAS avalée : `mutateAsync` rejette pour que l'appelant affiche le
 * message inline (conflit vs générique).
 */
export function useSetEventArchived() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, { id: string; archived: boolean; version?: number | null }>({
    mutationFn: ({ id, archived, version }) => setEventArchived(id, archived, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
    onError: (error) => {
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined
      if (status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      }
    },
  })
}

export default useSetEventArchived
