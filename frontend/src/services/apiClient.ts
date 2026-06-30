import axios from 'axios'
import { toast } from 'react-hot-toast'
import { refreshToken } from './authService'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRedirecting = false

/** Locales préfixées (cf. middleware.ts, localePrefix: 'always'). */
const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de'] as const

/**
 * Cible de redirection 401/403 préfixée par la locale courante
 * (#40 : avant on redirigeait vers `/login` non préfixé, cassé par
 * `localePrefix: 'always'`). On lit le 1er segment du pathname ; à défaut
 * la locale par défaut `fr`.
 */
const loginUrlForCurrentLocale = (): string => {
  const segment = window.location.pathname.split('/')[1]
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(segment) ? segment : 'fr'
  return `/${locale}/login`
}

const setupPeriodicRefresh = () => {
  setInterval(
    async () => {
      try {
        await refreshToken()
      } catch (error) {
        console.debug('Rafraîchissement périodique silencieux échoué', error)
      }
    },
    6 * 60 * 60 * 1000,
  ) // 6 heures
}

if (typeof window !== 'undefined') {
  setupPeriodicRefresh()
}

/**
 * #53 — Endpoints des formulaires auth : leurs erreurs (400/401/409) sont
 * gérées INLINE par les écrans Login/Register/Reset. On exclut donc ces routes
 * du traitement global (toast + redirect vers /login) — sinon un 401 sur
 * /auth/login déclencherait une redirection vers la page de login elle-même
 * (boucle visuelle) au lieu d'afficher « identifiants invalides » sous le champ.
 */
const INLINE_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

const isInlineAuthRequest = (url?: string): boolean =>
  typeof url === 'string' && INLINE_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isInlineAuthRequest(error.config?.url)) {
      // Géré inline par le formulaire : on relaie l'erreur sans effet de bord global.
      return Promise.reject(error)
    }
    if (error.response?.status === 400) {
      toast.error('Erreur de validation, veuillez vérifier vos données.')
    } else if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        toast.error('Session expirée, redirection vers la page de connexion...')
        localStorage.removeItem('user')
        setTimeout(() => {
          window.location.href = loginUrlForCurrentLocale()
          isRedirecting = false
        }, 1500)
      }
    } else if (error.response?.status === 403) {
      if (!isRedirecting) {
        isRedirecting = true
        // NE PAS logger error.config.headers : contient l'en-tête Authorization
        // (jeton porteur) + cookies → fuite de credentials dans la console / les
        // agrégateurs de logs. On se limite aux métadonnées non sensibles.
        console.error('Erreur 403 - Accès refusé:', {
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data,
        })
        localStorage.removeItem('user')
        toast.error('Votre session a expiré, redirection vers la page de connexion...')
        setTimeout(() => {
          window.location.href = loginUrlForCurrentLocale()
          isRedirecting = false
        }, 1500)
      }
    } else if (error.response?.status === 500) {
      toast.error('Erreur serveur, veuillez réessayer plus tard.')
    }
    return Promise.reject(error)
  },
)

export default apiClient
