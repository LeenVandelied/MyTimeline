'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { updateEvent } from '@/services/eventService'
import { useAuth } from '@/hooks/useAuth'
import { queryKeys } from '@/lib/query-keys'
import { safeErrorMessage } from '@/lib/safe-error'
import { eventConflictBodySchema, type Event, type EventEditFormValues } from '@/types/event'
import type { EventSubmitState } from '@/components/EventEditForm'

/**
 * #absorb (BR-EVE-015) — Machine à états PARTAGÉE de soumission + conflit 409 comparatif
 * pour l'édition d'un event. Extraite du flux #231 d'`EventContent` (qui reste le mount
 * historique de la frise `EventBar`) afin d'être RÉUTILISÉE par `TimelineEditHost` (frise
 * routée dashboard / détail produit) SANS dupliquer la logique conflit.
 *
 * Threading `version` (gap B) : le PATCH envoie la `version` détenue au chargement du form.
 * Sur 409 enrichi, `onKeepMine` RE-SOUMET avec la version SERVEUR (corps 409) — sinon le
 * backend redétecterait le même décalage (boucle de 409). `onTakeServer`/`onReload`
 * abandonnent le local et invalident la query TanStack qui alimente la frise.
 */

/** Lit `error.response.status` (axios ou générique) sans `any` (cf. #65). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

/** Extrait le serverEvent du corps 409 ENRICHI (#231) ; `null` si corps plat/legacy. */
function conflictServerEventOf(error: unknown): Event | null {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    const parsed = eventConflictBodySchema.safeParse(data)
    if (parsed.success) return parsed.data.serverEvent
  }
  return null
}

export interface UseEventEditConflict {
  submitState: EventSubmitState
  conflict: { server: Event; local: EventEditFormValues } | null
  onSubmit: (data: EventEditFormValues) => Promise<void>
  onReload: () => void
  onTakeServer: () => void
  onKeepMine: () => void
  onConflictDismiss: () => void
  reset: () => void
}

/**
 * @param eventId  id de l'event édité (le PATCH cible `/events/{eventId}`).
 * @param onDone   appelé après un succès (fermer le dialog d'édition du parent).
 */
export function useEventEditConflict(
  eventId: string | undefined,
  onDone?: () => void,
): UseEventEditConflict {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [submitState, setSubmitState] = useState<EventSubmitState>('idle')
  const [conflict, setConflict] = useState<{ server: Event; local: EventEditFormValues } | null>(
    null,
  )

  // Invalidation CIBLÉE de la query qui alimente dashboard ET détail produit
  // (`useProductsWithEvents`) → re-fetch des données à jour, jamais de reload page (#77).
  const invalidateEvents = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.withEvents(user.id) })
    }
  }, [queryClient, user?.id])

  const onSubmit = useCallback(
    async (data: EventEditFormValues) => {
      setSubmitState('submitting')
      try {
        // Garde `user?.id` cohérente avec le reste du flux (`invalidateEvents`,
        // color-path d'EventContent) : pas de PATCH sans utilisateur authentifié.
        if (eventId && user?.id) {
          await updateEvent(eventId, data)
        }
        invalidateEvents()
        setConflict(null)
        setSubmitState('idle')
        onDone?.()
      } catch (error) {
        const status = httpStatusOf(error)
        if (status === 409) {
          const server = conflictServerEventOf(error)
          setConflict(server ? { server, local: data } : null)
          setSubmitState('conflict')
        } else {
          setSubmitState('error')
        }
        console.error("Erreur lors de la mise à jour de l'événement :", safeErrorMessage(error))
      }
    },
    [eventId, invalidateEvents, onDone, user?.id],
  )

  const onReload = useCallback(() => {
    invalidateEvents()
    setConflict(null)
    setSubmitState('idle')
    onDone?.()
  }, [invalidateEvents, onDone])

  // « Prendre la version serveur » = abandonner le local + rafraîchir (idem onReload).
  const onTakeServer = onReload

  // « Garder mes modifications » : re-soumet le local en ADOPTANT la version serveur
  // (corps 409) → le check backend passe (plus de décalage) et le local gagne. Sans ce
  // ré-alignement de version, le PATCH redéclencherait un 409 (boucle).
  const onKeepMine = useCallback(() => {
    if (conflict) {
      void onSubmit({ ...conflict.local, version: conflict.server.version ?? null })
    }
  }, [conflict, onSubmit])

  const onConflictDismiss = useCallback(() => {
    setConflict(null)
    setSubmitState('idle')
  }, [])

  const reset = useCallback(() => {
    setConflict(null)
    setSubmitState('idle')
  }, [])

  return {
    submitState,
    conflict,
    onSubmit,
    onReload,
    onTakeServer,
    onKeepMine,
    onConflictDismiss,
    reset,
  }
}
