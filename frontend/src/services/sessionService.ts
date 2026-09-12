import apiClient from '@/services/apiClient'
import { SessionListSchema, type Session } from '@/types/settings'

/**
 * #73 / #86 — Sessions actives de l'utilisateur courant. Identité dérivée du
 * cookie JWT côté backend (SessionController), jamais d'un param.
 *
 * Contrats confirmés :
 *  - GET    /api/sessions          -> SessionResponse[]
 *  - DELETE /api/sessions/{id}     -> 204 (404 si inconnue/appartient à autrui)
 *  - DELETE /api/sessions/others   -> 204 (révoque toutes SAUF la courante)
 */

export const getActiveSessions = async (): Promise<Session[]> => {
  const response = await apiClient.get('/sessions')
  return SessionListSchema.parse(response.data)
}

export const revokeSession = async (id: string): Promise<void> => {
  await apiClient.delete(`/sessions/${id}`)
}

export const revokeOtherSessions = async (): Promise<void> => {
  await apiClient.delete('/sessions/others')
}
