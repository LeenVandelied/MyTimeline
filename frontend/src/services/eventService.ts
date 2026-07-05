import { Event, EventEditFormValues } from '@/types/event'
import apiClient from './apiClient'
import { safeErrorMessage } from '@/lib/safe-error'

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
