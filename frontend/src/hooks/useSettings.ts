'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  changePassword,
  deleteAccount,
  deleteAvatar,
  updateProfile,
  uploadAvatar,
  type ChangePasswordPayload,
  type ProfileUpdatePayload,
} from '@/services/userService'
import { queryKeys } from '@/lib/query-keys'
import type { User } from '@/types/user'

/**
 * #86 — Logique des Réglages (Profil / Sécurité / Compte) découplée de la
 * présentation pour réutilisation mobile (#87). Chaque section consomme la
 * mutation dont elle a besoin ; les composants restent « bêtes ».
 *
 * TanStack Query v5 STRICT. Les erreurs axios sont propagées (rejet) : les
 * sections mappent inline (409 username pris, 400 ancien mdp faux, etc.).
 */
export function useSettings() {
  const queryClient = useQueryClient()
  const { user, refreshUser } = useAuth()

  /**
   * Après un PATCH /me réussi, `AuthContext` (source unique du user) doit
   * refléter le nouveau profil. Il n'expose pas de setter public ; on invalide
   * la clé `auth.me` (pont TanStack) — mais AuthContext ne relit pas cette clé.
   * On force donc une resynchro via `refreshUser` si dispo. Faute de setter, on
   * invalide au moins le cache Query et on renvoie le user à jour à l'appelant
   * pour un affichage optimiste local.
   */
  const updateProfileMutation = useMutation<User, unknown, ProfileUpdatePayload>({
    mutationFn: (payload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })

  const changePasswordMutation = useMutation<void, unknown, ChangePasswordPayload>({
    mutationFn: (payload) => changePassword(payload),
  })

  /**
   * Suppression de compte : sur succès, le backend efface le cookie JWT (204).
   * On purge le cache Query ; la redirection/anonymisation est gérée par
   * l'appelant (AccountSection) qui re-route vers /login.
   */
  const deleteAccountMutation = useMutation<void, unknown, string>({
    mutationFn: (username: string) => deleteAccount(username),
    onSuccess: () => {
      queryClient.clear()
    },
  })

  /**
   * #75 — Upload avatar. Le backend renvoie le UserResponse à jour ; on
   * resynchronise `AuthContext` (source unique du user, `avatarUrl` inclus) via
   * `refreshUser` et on invalide le pont Query `auth.me`.
   */
  const uploadAvatarMutation = useMutation<User, unknown, File>({
    mutationFn: (file) => uploadAvatar(file),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })

  /**
   * #75 — Suppression avatar (204). Même resynchro que l'upload : l'`avatarUrl`
   * du user repasse à `null`.
   */
  const deleteAvatarMutation = useMutation<void, unknown, void>({
    mutationFn: () => deleteAvatar(),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })

  return {
    user,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    deleteAccount: deleteAccountMutation,
    uploadAvatar: uploadAvatarMutation,
    deleteAvatar: deleteAvatarMutation,
  }
}
