'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createEvent } from '@/services/eventService'
import { queryKeys } from '@/lib/query-keys'
import type { Event, EventCreationPayload } from '@/types/event'

/**
 * #300 — Création d'un événement via TanStack Query v5 (mutation).
 *
 * INVALIDATION (critère d'acceptation : « l'événement créé apparaît dans la frise ») :
 * on invalide le PRÉFIXE `queryKeys.products.all` (`['products']`). Le matching de
 * préfixe TanStack v5 couvre `products.withEvents(userId)`
 * (`['products', { userId, withEvents: true }]`), qui est la source de données réelle
 * de la frise (`useDashboardData` → `useProductsWithEvents`, DEC-S44-001 #301) ET du
 * détail produit. Conséquence directe : ce hook n'a PAS besoin du `userId` — le
 * threader UNIQUEMENT pour invalider serait un couplage inutile (PAT-S40-001), et une
 * garde `if (!userId)` mal placée raterait silencieusement le rafraîchissement.
 * L'ownership du create est dérivée du JWT côté backend via `productId` (BR-EVE-008),
 * pas d'un userId de payload.
 *
 * v5 STRICT : forme objet `useMutation({ mutationFn })`. L'erreur axios n'est PAS
 * avalée — le composant lit `isPending`/`isError` pour l'état de soumission inline.
 *
 * ⚠ Pas de conflit 409 ici (BR-EVE-015) : un CREATE n'a pas de `version` à confronter.
 * Ne PAS réutiliser `useEventEditConflict`, qui est spécifique au PATCH.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation<Event, unknown, EventCreationPayload>({
    mutationFn: (payload: EventCreationPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export default useCreateEvent
