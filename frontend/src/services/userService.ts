import apiClient from '@/services/apiClient'
import { UserSchema, type User } from '@/types/user'

/**
 * #86 — Appels réseau du profil de l'utilisateur COURANT (`/api/me`). L'identité
 * est dérivée du cookie JWT HttpOnly côté backend (jamais d'un param) — tous les
 * appels partent avec `withCredentials` (config `apiClient`).
 *
 * Contrats backend confirmés (UserController, SessionController) :
 *  - PATCH  /api/me                 body {name,username,email} -> UserResponse
 *  - POST   /api/me/change-password body {oldPassword,newPassword} -> 204
 *  - DELETE /api/me                 body {username} -> 204 (+ cookie effacé)
 *
 * Endpoints NON encore livrés (stub + TODO, cf. STATUS PARTIAL) :
 *  - POST/DELETE /api/me/avatar  (#75, même sprint — pas présent au scan backend)
 *  - GET  /api/me/export         (export RGPD — aucun endpoint backend à ce jour)
 */

export interface ProfileUpdatePayload {
  name: string
  username: string
  email: string
}

/**
 * PATCH /api/me — met à jour name/username/email. 409 si username déjà pris
 * (BR-AUT-001) : l'erreur axios est propagée telle quelle pour un mapping inline.
 */
export const updateProfile = async (payload: ProfileUpdatePayload): Promise<User> => {
  const response = await apiClient.patch('/me', payload)
  // Le backend renvoie UserResponse (sans avatar — dette #151/#75). On parse au
  // contrat frontend courant ; le champ avatar sera ajouté quand #75 l'exposera.
  return UserSchema.parse(response.data)
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

/**
 * POST /api/me/change-password — 204 en succès, 400 si l'ancien mot de passe est
 * faux (InvalidCredentialsException backend). L'appelant mappe le 400 inline.
 */
export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await apiClient.post('/me/change-password', payload)
}

/**
 * DELETE /api/me — supprime définitivement le compte. `username` = re-saisie de
 * confirmation (double-sécurité UX BR-AUT-001) ; l'identité vient du JWT. 400 si
 * mismatch (AccountDeletionMismatchException). Sur succès : cookie effacé + 204.
 * axios n'autorise pas de body sur DELETE via l'API raccourcie -> config `data`.
 */
export const deleteAccount = async (username: string): Promise<void> => {
  await apiClient.delete('/me', { data: { username } })
}

/* ---------------------------------------------------------------------------
   Avatar — TODO backend: POST/DELETE /api/me/avatar (#75, même sprint vague 1).
   Contrat attendu : multipart `file` -> { avatarUrl }. Non présent au scan du
   backend au moment de l'implémentation (#86). On stub pour ne pas bloquer la
   chaîne UI (upload + crop). À rebrancher dès la livraison de #75.
   --------------------------------------------------------------------------- */

export interface AvatarUploadResponse {
  avatarUrl: string
}

/**
 * POST /api/me/avatar (multipart). STUB : l'endpoint n'existe pas encore côté
 * backend (#75). Laisse l'appel réel en place (commenté) pour rebranchement ;
 * en attendant, rejette pour que l'UI affiche l'erreur « fonctionnalité à venir ».
 */
export const uploadAvatar = async (file: File): Promise<AvatarUploadResponse> => {
  // TODO backend: POST /api/me/avatar (issue #75) — décommenter au rebranchement.
  // const formData = new FormData()
  // formData.append('file', file)
  // const response = await apiClient.post('/me/avatar', formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // })
  // return AvatarUploadResponseSchema.parse(response.data)
  void file
  return Promise.reject(new Error('AVATAR_ENDPOINT_UNAVAILABLE'))
}

/**
 * DELETE /api/me/avatar. STUB (#75). Voir uploadAvatar.
 */
export const deleteAvatar = async (): Promise<void> => {
  // TODO backend: DELETE /api/me/avatar (issue #75).
  return Promise.reject(new Error('AVATAR_ENDPOINT_UNAVAILABLE'))
}

/* ---------------------------------------------------------------------------
   Export des données — TODO backend: GET /api/me/export?format=json|csv.
   Aucun endpoint d'export au scan backend (#86). Stub qui rejette : l'UI garde
   le flux 3 étapes (choix format -> confirmation -> téléchargement) et affiche
   « à venir » à l'étape téléchargement.
   --------------------------------------------------------------------------- */

export type ExportFormat = 'json' | 'csv'

/**
 * GET /api/me/export — STUB. Renvoie un Blob téléchargeable une fois l'endpoint
 * livré (`responseType: 'blob'`). Rejette tant que le backend est absent.
 */
export const exportData = async (format: ExportFormat): Promise<Blob> => {
  // TODO backend: GET /api/me/export?format=... (RGPD portabilité) — non livré.
  // const response = await apiClient.get('/me/export', {
  //   params: { format },
  //   responseType: 'blob',
  // })
  // return response.data as Blob
  void format
  return Promise.reject(new Error('EXPORT_ENDPOINT_UNAVAILABLE'))
}
