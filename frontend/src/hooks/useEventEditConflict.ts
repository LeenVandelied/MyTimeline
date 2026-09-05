'use client'

import { useCallback, useEffect, useState } from 'react'
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

/**
 * #310 - GARDE ANTI-BOUCLE. Le re-alignement de version ci-dessus regle le cas NOMINAL
 * (un seul ecrivain concurrent : la 2e soumission passe). Il ne couvre PAS la CONTENTION
 * REELLE - un tiers ecrit a nouveau entre notre 409 et notre re-soumission - ou le
 * backend peut repondre 409 indefiniment. On borne donc les re-soumissions issues de
 * `onKeepMine` par un PLAFOND de tentatives, et non par un backoff temporel : un backoff
 * serait intestable sans horloge simulee (cf. PIT-S54-001, ou un backoff de retry
 * depassant le budget de timeout a rendu le retry ET son diagnostic inatteignables).
 *
 * Nombre maximal de re-soumissions « garder mes modifications » CONSECUTIVES soldees par
 * un 409. Au-dela, insister ne peut que rejouer la meme contention : l'utilisateur doit
 * trancher autrement (prendre la version serveur, ou abandonner). Pire cas d'appels
 * reseau = 1 (soumission initiale) + MAX_KEEP_MINE_ATTEMPTS (re-soumissions).
 */
export const MAX_KEEP_MINE_ATTEMPTS = 3

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
  /**
   * #310 — Plafond de re-soumissions keep-mine atteint : `onKeepMine` est devenu inerte
   * et l'UI doit le signaler (message explicite + bouton désactivé).
   */
  keepMineExhausted: boolean
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
  // #310 — Compteur des re-soumissions keep-mine CONSÉCUTIVES ayant reçu un 409.
  // On compte les 409 subis par une RE-soumission, pas les clics ni les soumissions
  // initiales : c'est exactement ce que l'issue borne (« 409 répétés »), et cela
  // laisse une soumission initiale ouvrir un nouvel épisode de conflit intact.
  const [keepMineAttempts, setKeepMineAttempts] = useState(0)
  const keepMineExhausted = keepMineAttempts >= MAX_KEEP_MINE_ATTEMPTS

  // Changer d'événement édité = nouvel épisode : le plafond ne se traîne pas d'un
  // event à l'autre (le hook est monté une fois par host, `eventId` varie).
  useEffect(() => {
    setKeepMineAttempts(0)
  }, [eventId])

  // Invalidation CIBLÉE de la query qui alimente dashboard ET détail produit
  // (`useProductsWithEvents`) → re-fetch des données à jour, jamais de reload page (#77).
  const invalidateEvents = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.withEvents(user.id) })
    }
  }, [queryClient, user?.id])

  /**
   * Soumission unique, partagee par le form (`onSubmit`) et par la re-soumission de
   * conflit (`onKeepMine`). `fromKeepMine` ne change QUE la comptabilite du plafond
   * #310 : c'est le seul endroit ou l'on sait si le 409 recu clot une RE-soumission.
   */
  const runSubmit = useCallback(
    async (data: EventEditFormValues, fromKeepMine: boolean) => {
      setSubmitState('submitting')
      try {
        // Garde `user?.id` coherente avec le reste du flux (`invalidateEvents`,
        // color-path d'EventContent) : pas de PATCH sans utilisateur authentifie.
        if (eventId && user?.id) {
          await updateEvent(eventId, data)
        }
        invalidateEvents()
        setConflict(null)
        setSubmitState('idle')
        // Succes : l'episode de contention est clos, le plafond repart de zero.
        setKeepMineAttempts(0)
        onDone?.()
      } catch (error) {
        const status = httpStatusOf(error)
        if (status === 409) {
          const server = conflictServerEventOf(error)
          setConflict(server ? { server, local: data } : null)
          setSubmitState('conflict')
          // 409 sur une RE-soumission -> on consomme une tentative. 409 sur une
          // soumission INITIALE -> nouvel episode, on repart de zero (sinon un
          // utilisateur legitime qui rouvre le formulaire heriterait du plafond).
          setKeepMineAttempts((attempts) => (fromKeepMine ? attempts + 1 : 0))
        } else {
          setSubmitState('error')
          // Sortie du flux conflit (erreur generique) : le plafond n'a plus d'objet.
          setKeepMineAttempts(0)
        }
        console.error("Erreur lors de la mise à jour de l'événement :", safeErrorMessage(error))
      }
    },
    [eventId, invalidateEvents, onDone, user?.id],
  )

  const onSubmit = useCallback(
    (data: EventEditFormValues) => runSubmit(data, false),
    [runSubmit],
  )

  const onReload = useCallback(() => {
    invalidateEvents()
    setConflict(null)
    setSubmitState('idle')
    // Abandon du flux conflit : plafond remis a zero (idem dismiss/reset).
    setKeepMineAttempts(0)
    onDone?.()
  }, [invalidateEvents, onDone])

  // « Prendre la version serveur » = abandonner le local + rafraîchir (idem onReload).
  const onTakeServer = onReload

  // « Garder mes modifications » : re-soumet le local en ADOPTANT la version serveur
  // (corps 409) → le check backend passe (plus de décalage) et le local gagne. Sans ce
  // ré-alignement de version, le PATCH redéclencherait un 409 (boucle).
  const onKeepMine = useCallback(() => {
    // #310 - Garde d'arret : au plafond, le callback devient INERTE. Le bouton est par
    // ailleurs desactive cote dialog, mais la garde reste ici parce qu'elle protege les
    // deux points de montage (`EventContent`, `TimelineEditHost`) et tout appelant futur.
    if (!conflict || keepMineExhausted) return
    void runSubmit({ ...conflict.local, version: conflict.server.version ?? null }, true)
  }, [conflict, keepMineExhausted, runSubmit])

  const onConflictDismiss = useCallback(() => {
    setConflict(null)
    setSubmitState('idle')
    setKeepMineAttempts(0)
  }, [])

  const reset = useCallback(() => {
    setConflict(null)
    setSubmitState('idle')
    setKeepMineAttempts(0)
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
    keepMineExhausted,
  }
}
