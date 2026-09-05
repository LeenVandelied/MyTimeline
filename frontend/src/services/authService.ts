import apiClient from '@/services/apiClient'
import { LoginData, LoginSchema } from '@/types/auth'
import { UserSchema } from '@/types/user'
import { safeErrorMessage } from '@/lib/safe-error'
import { isSupportedLocale } from '@/i18n/locales'

export const login = async (username: string, password: string) => {
  try {
    const parsedData: LoginData = LoginSchema.parse({ username, password })
    const response = await apiClient.post('/auth/login', parsedData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/auth/me')
    return UserSchema.parse(response.data)
  } catch (error) {
    throw error
  }
}

export const registerUser = async (
  name: string,
  username: string,
  email: string,
  password: string,
) => {
  try {
    return apiClient.post('/auth/register', { name, username, email, password })
  } catch (error) {
    throw error
  }
}

/**
 * #53 — Mot de passe oublié (contrat #49). Le backend renvoie TOUJOURS 200
 * (anti-fuite BR-AUT-012 : il ne révèle pas si l'email existe). L'appelant
 * affiche donc un message neutre quel que soit le retour.
 *
 * #142 — `locale` (optionnel) choisit la langue de l'email de réinitialisation.
 * La locale courante vient de la route (`/[locale]/forgot-password`) : le serveur
 * ne stocke AUCUNE langue par utilisateur, c'est donc au client de la porter.
 * Une valeur non supportée est simplement omise — le backend retombe sur `fr`.
 */
export const forgotPassword = async (email: string, locale?: string) => {
  const payload =
    locale && isSupportedLocale(locale) ? { email, locale } : { email }
  const response = await apiClient.post('/auth/forgot-password', payload)
  return response.data
}

/**
 * #53 — Réinitialisation (contrat #49). 200 = succès, 400 = token
 * invalide/expiré/consommé → l'appelant mappe le 400 vers un message inline.
 */
export const resetPassword = async (token: string, newPassword: string) => {
  const response = await apiClient.post('/auth/reset-password', { token, newPassword })
  return response.data
}

export const refreshToken = async () => {
  try {
    await apiClient.post('/auth/refresh')
    return true
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', safeErrorMessage(error))
    return false
  }
}

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout')
    // #135 — plus de miroir localStorage du user à purger (PII sortie du storage).
    // Nous ne faisons pas de redirection ici - elle sera gérée par les composants
  } catch (error) {
    throw error
  }
}
