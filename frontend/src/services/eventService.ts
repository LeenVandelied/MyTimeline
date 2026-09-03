import {
  Event,
  EventCreationPayload,
  EventEditFormValues,
  RecurrencePreviewRequest,
  RecurrencePreviewResponse,
} from '@/types/event'
import apiClient from './apiClient'
import { safeErrorMessage } from '@/lib/safe-error'

/**
 * #67 — Preview du nombre d'occurrences d'une récurrence (`POST /api/events/
 * recurrence-preview`, endpoint livré par #439). `apiClient` préfixe déjà `/api`.
 *
 * Le flag `capped` de la réponse alimente un hint NON bloquant sous le champ
 * `recurrenceEndDate` (plafond 4000 occurrences). Erreur PROPAGÉE (le hook
 * TanStack la mappe en état de query, jamais avalée). ⚠ `recurrenceUnit` doit
 * rester en MAJUSCULE (WEEK/MONTH/YEAR) — le backend #439 ne tolère pas les
 * unités legacy minuscules (400).
 */
export const previewRecurrence = async (
  payload: RecurrencePreviewRequest,
): Promise<RecurrencePreviewResponse> => {
  try {
    const response = await apiClient.post('/events/recurrence-preview', payload)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la preview de récurrence :', safeErrorMessage(error))
    throw error
  }
}

/**
 * #300 — Création d'un événement (`POST /api/events`, BR-EVE-001/002/006/007).
 *
 * Le chemin data manquait côté front (le service ne savait que lire/mettre à jour/
 * supprimer) alors que l'endpoint backend existe depuis le Sprint 1. Le payload est
 * construit par `toEventCreationPayload` (`types/event.ts`), seul détenteur des
 * renommages title→name / startDate→date et des valeurs neutres de durée.
 *
 * Réponse : le backend renvoie le modèle domaine `Event` (fuite documentée en
 * anti-pattern du pack events) — on le typait tel quel, sans le re-parser : aucun
 * consommateur ne lit le retour aujourd'hui (l'UI se rafraîchit par invalidation).
 * L'erreur est PROPAGÉE (jamais avalée) : le hook la mappe en état de soumission.
 */
export const createEvent = async (payload: EventCreationPayload): Promise<Event> => {
  try {
    const response = await apiClient.post('/events', payload)
    return response.data
  } catch (error) {
    console.error("Erreur lors de la création de l'événement :", safeErrorMessage(error))
    throw error
  }
}

export const getEventsByProductId = async (userId: string, productId: string): Promise<Event[]> => {
  try {
    const response = await apiClient.get(`/users/${userId}/products/${productId}/events`)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des événements :', safeErrorMessage(error))
    throw error
  }
}

// #150 — modèle couleur unique `color` (BR-EVE-009 : bg/border/text supprimés backend).
export const updateEventColor = async (eventId: string, color: string): Promise<void> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, { color })

    if (!response.data) {
      throw new Error('Failed to update event colors')
    }
  } catch (error) {
    console.error('Error updating event colors:', safeErrorMessage(error))
    throw error
  }
}

export const updateEvent = async (eventId: string, data: EventEditFormValues): Promise<void> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, data)

    if (!response.data) {
      throw new Error('Failed to update event')
    }
  } catch (error) {
    console.error('Error updating event:', safeErrorMessage(error))
    throw error
  }
}

/**
 * #307 — Bascule du seul flag `archived` (BR-EVE-013, PATCH-only).
 *
 * Payload MINIMAL : le PATCH backend est partiel (`EventServiceImpl.updateEvent`
 * n'applique qu'un champ non-null), donc envoyer les autres champs du formulaire
 * serait du bruit — et rejouerait des valeurs potentiellement périmées du cache.
 *
 * `version` (BR-EVE-015) est threadée quand elle est connue : `checkOptimisticVersion`
 * ne compare QUE si le client la fournit. L'omettre transformerait un désarchivage
 * fondé sur un cache périmé en écrasement silencieux ; la fournir donne un 409
 * déterministe, que l'appelant traite. Erreur PROPAGÉE (jamais avalée).
 */
export const setEventArchived = async (
  eventId: string,
  archived: boolean,
  version?: number | null,
): Promise<void> => {
  try {
    await apiClient.patch(`/events/${eventId}`, {
      archived,
      ...(typeof version === 'number' ? { version } : {}),
    })
  } catch (error) {
    console.error("Erreur lors du (dés)archivage de l'événement :", safeErrorMessage(error))
    throw error
  }
}

// #66 — DELETE /api/events/{id} (suppression physique, ownership 403). L'erreur
// est propagée pour affichage inline par DeleteConfirmDialog (pitfall #65).
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await apiClient.delete(`/events/${eventId}`)
  } catch (error) {
    console.error('Error deleting event:', safeErrorMessage(error))
    throw error
  }
}
