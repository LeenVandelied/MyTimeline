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
 * Avatar (#75, livré) :
 *  - POST   /api/me/avatar  multipart `file` -> UserResponse (avatarUrl)
 *  - DELETE /api/me/avatar                    -> 204
 *
 * Endpoint NON encore livré (stub) :
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
  // Le backend renvoie UserResponse (avec `avatarUrl` depuis #75).
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
   Avatar — #75 livré (backend `AvatarController`). Contrat :
     POST   /api/me/avatar  multipart part `file` -> 200 UserResponse (avatarUrl)
     DELETE /api/me/avatar                          -> 204 (avatar remis à null)
   L'identité vient du cookie JWT (`withCredentials`), jamais d'un id client.
   --------------------------------------------------------------------------- */

/**
 * POST /api/me/avatar (multipart/form-data, part `file`). 200 -> UserResponse
 * à jour (avec `avatarUrl`). 400 si type non autorisé / trop volumineux / vide.
 *
 * On NE force PAS le header `Content-Type` : axios pose lui-même
 * `multipart/form-data` avec la boundary quand le body est un `FormData`.
 */
export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/me/avatar', formData)
  return UserSchema.parse(response.data)
}

/**
 * DELETE /api/me/avatar — 204, l'avatar est remis à null côté backend.
 */
export const deleteAvatar = async (): Promise<void> => {
  await apiClient.delete('/me/avatar')
}

/* ---------------------------------------------------------------------------
   Export des données RGPD — #59 (livré) : le flux vit désormais dans
   `services/exportService.ts` (contrat backend figé #58, base path `/api/export`,
   formats sync JSON/MARKDOWN + async ZIP/CSV). L'ancien stub `/api/me/export` a
   été retiré.
   --------------------------------------------------------------------------- */
