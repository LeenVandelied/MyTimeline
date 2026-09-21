import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * #40 — l'intercepteur de réponse DOIT :
 *  - afficher un toast visible sur 401 (avant, <Toaster/> non monté → silencieux) ;
 *  - rediriger vers une URL préfixée par la locale courante (/[locale]/login),
 *    pas vers `/login` non préfixé (cassé par localePrefix:'always').
 *
 * On capture le handler d'erreur enregistré via `interceptors.response.use`
 * en interceptant `axios.create`.
 */

const toastErrorMock = vi.fn()
vi.mock('react-hot-toast', () => ({
  toast: { error: (...a: unknown[]) => toastErrorMock(...a) },
}))

vi.mock('./authService', () => ({
  refreshToken: vi.fn().mockResolvedValue(true),
}))

// Capture le rejection handler passé à interceptors.response.use.
let rejectionHandler: ((error: unknown) => unknown) | undefined

vi.mock('axios', () => {
  const instance = {
    // #76 — apiClient enregistre désormais aussi un intercepteur de requête
    // (exemption timeout multipart) : le mock doit l'exposer sinon l'import lève.
    interceptors: {
      request: {
        use: () => {},
      },
      response: {
        use: (_onFulfilled: unknown, onRejected: (error: unknown) => unknown) => {
          rejectionHandler = onRejected
        },
      },
    },
  }
  return { default: { create: () => instance } }
})

const makeError = (status: number) => ({
  response: { status },
  config: { url: '/api/whatever', method: 'get' },
})

describe('apiClient response interceptor', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    toastErrorMock.mockReset()
    rejectionHandler = undefined
    vi.resetModules()
    // L'import déclenche l'enregistrement de l'intercepteur (et setupPeriodicRefresh).
    await import('./apiClient')
  })

  it('affiche un toast et rejette la promesse sur 401', async () => {
    expect(rejectionHandler).toBeDefined()

    await expect(rejectionHandler!(makeError(401))).rejects.toBeDefined()

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    // #713 — le libellé vient désormais de `errors.auth.sessionExpired`
    // (« Votre session a expiré… »), plus d'une chaîne française en dur.
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/session a expiré/i)
    // #135 — l'intercepteur ne touche plus à localStorage (aucun miroir user
    // n'y est écrit) : le user PII est sorti du storage. Rien à purger côté client.
    vi.useRealTimers()
  })

  it('redirige vers /[locale]/login en respectant la locale courante', async () => {
    // jsdom ne navigue pas réellement (assignation location.href = no-op silencieux).
    // On stubbe window.location pour : (a) fournir le pathname courant lu par
    // l'intercepteur, (b) capturer la cible de redirection assignée.
    const setHref = vi.fn()
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    const locationStub = {
      pathname: '/en/dashboard',
      set href(value: string) {
        setHref(value)
      },
    }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationStub,
    })

    try {
      await expect(rejectionHandler!(makeError(401))).rejects.toBeDefined()

      // La redirection est différée (setTimeout 1500ms) — on avance les timers.
      vi.advanceTimersByTime(1500)
      expect(setHref).toHaveBeenCalledWith('/en/login')
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      vi.useRealTimers()
    }
  })

  it('ne toast NI ne redirige sur un 401 de la sonde /auth/me (visiteur anonyme)', async () => {
    // Régression golden-path E2E 2026-07-11 : AuthProvider sonde /auth/me au montage
    // (racine app). Pour un visiteur non connecté -> 401 = « pas authentifié » (normal),
    // géré inline par AuthContext (setUser null). Ce 401 NE DOIT PAS déclencher le toast
    // « Session expirée » ni le window.location.href=/login différé (qui, encore en vol,
    // ramenait un utilisateur fraîchement connecté sur /login).
    const setHref = vi.fn()
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/fr/login',
        set href(value: string) {
          setHref(value)
        },
      },
    })

    try {
      const meError = { response: { status: 401 }, config: { url: '/api/auth/me', method: 'get' } }
      await expect(rejectionHandler!(meError)).rejects.toBeDefined()

      expect(toastErrorMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1500)
      expect(setHref).not.toHaveBeenCalled()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      vi.useRealTimers()
    }
  })

  /**
   * #733 — Un 403 = accès refusé à un utilisateur AUTHENTIFIÉ (ownership ou
   * `hasAuthority`), pas une session morte. Toast « accès refusé », AUCUNE
   * redirection, et le verrou `isRedirecting` n'est pas pris : un 401 qui suit
   * doit toujours ramener au login (sinon un 403 préalable neutraliserait la
   * vraie expiration de session).
   */
  it('403 : toast « accès refusé », jamais de redirection, un 401 suivant redirige toujours', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const setHref = vi.fn()
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/es/dashboard',
        set href(value: string) {
          setHref(value)
        },
      },
    })

    try {
      await expect(rejectionHandler!(makeError(403))).rejects.toBeDefined()

      expect(toastErrorMock).toHaveBeenCalledTimes(1)
      expect(toastErrorMock.mock.calls[0][0]).toMatch(/accès refusé/i)
      // PIT-S95-006 : l'ancien libellé du 403 parlait de session expirée.
      expect(toastErrorMock.mock.calls[0][0]).not.toMatch(/session|connexion/i)

      // Bien au-delà du délai de redirection du 401 (1500 ms).
      vi.advanceTimersByTime(5000)
      expect(setHref).not.toHaveBeenCalled()

      // Le verrou n'a pas été pris : un 401 immédiatement après redirige.
      await expect(rejectionHandler!(makeError(401))).rejects.toBeDefined()
      expect(toastErrorMock).toHaveBeenCalledTimes(2)
      expect(toastErrorMock.mock.calls[1][0]).toMatch(/session a expiré/i)
      vi.advanceTimersByTime(1500)
      expect(setHref).toHaveBeenCalledTimes(1)
      expect(setHref).toHaveBeenCalledWith('/es/login')
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      consoleErrorSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('403 répétés : un toast par 403, toujours sans redirection', async () => {
    // Avant #733, le verrou `isRedirecting` pris par le 1er 403 rendait les
    // suivants MUETS pendant 1,5 s. Sans redirection, chaque refus est signalé.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const setHref = vi.fn()
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/fr/dashboard',
        set href(value: string) {
          setHref(value)
        },
      },
    })

    try {
      await expect(rejectionHandler!(makeError(403))).rejects.toBeDefined()
      await expect(rejectionHandler!(makeError(403))).rejects.toBeDefined()
      expect(toastErrorMock).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(5000)
      expect(setHref).not.toHaveBeenCalled()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      consoleErrorSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('affiche un toast serveur sur 500 sans rediriger', async () => {
    await expect(rejectionHandler!(makeError(500))).rejects.toBeDefined()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/serveur/i)
    vi.useRealTimers()
  })

  /**
   * #713 — Règle du 400 : UN SEUL signalement.
   *
   * L'opt-out est CIBLÉ, pas global : supprimer le toast 400 pour tout le monde
   * rendrait muets les formulaires sans gestion inline (l'utilisateur ne verrait
   * plus rien). Les deux tests suivants figent donc les DEUX moitiés de la règle
   * — sans le premier, une liste d'opt-out élargie par erreur passerait en vert.
   */
  it('toaste le 400 sur une route SANS gestion inline (défaut conservé)', async () => {
    await expect(rejectionHandler!(makeError(400))).rejects.toBeDefined()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/validation/i)
    vi.useRealTimers()
  })

  it('ne toaste PAS le 400 de /me/change-password (rendu inline par le formulaire)', async () => {
    // `SecuritySection.tsx` fait `form.setError('oldPassword', …)` sur ce 400 :
    // sans cette exclusion, l'utilisateur voyait un toast générique EN PLUS du
    // message sous le champ, comme si deux problèmes distincts s'étaient produits.
    const error = {
      response: { status: 400 },
      config: { url: '/me/change-password', method: 'post' },
    }
    await expect(rejectionHandler!(error)).rejects.toBeDefined()
    expect(toastErrorMock).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('un 401 sur /me/change-password redirige TOUJOURS (opt-out limité au 400)', async () => {
    // Portée de l'opt-out : `INLINE_AUTH_ENDPOINTS` court-circuite tous les
    // statuts ; la liste du 400 ne doit court-circuiter QUE le 400. Une session
    // réellement expirée sur cette route doit continuer à ramener au login.
    const setHref = vi.fn()
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/de/settings',
        set href(value: string) {
          setHref(value)
        },
      },
    })

    try {
      const error = {
        response: { status: 401 },
        config: { url: '/me/change-password', method: 'post' },
      }
      await expect(rejectionHandler!(error)).rejects.toBeDefined()

      expect(toastErrorMock).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1500)
      expect(setHref).toHaveBeenCalledWith('/de/login')
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      vi.useRealTimers()
    }
  })

  /**
   * #713 — L'intercepteur ne contient plus de libellé en dur : il passe par le
   * registre de `apiErrorMessages`. Alimenté (ce que fait `ApiErrorTranslatorBridge`
   * sous le provider i18n), le toast sort dans la langue de l'utilisateur.
   */
  it('toaste le libellé TRADUIT quand le registre i18n est alimenté', async () => {
    const { setApiErrorTranslator } = await import('./apiErrorMessages')
    setApiErrorTranslator((key) => `DE:${key}`)
    try {
      await expect(rejectionHandler!(makeError(500))).rejects.toBeDefined()
      expect(toastErrorMock).toHaveBeenCalledWith('DE:server.error')
    } finally {
      setApiErrorTranslator(null)
      vi.useRealTimers()
    }
  })

  // #76 — classification vers le bus d'état réseau (store transport).
  it('classe un ECONNABORTED en timeout dans le store réseau', async () => {
    const { networkStatusStore } = await import('./networkStatus')
    networkStatusStore.clear()
    const timeoutError = {
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
      config: { url: '/api/slow', method: 'get' },
    }
    await expect(rejectionHandler!(timeoutError)).rejects.toBeDefined()
    expect(networkStatusStore.getIssue()).toBe('timeout')
    networkStatusStore.clear()
    vi.useRealTimers()
  })

  it('classe une 5xx en server-error dans le store réseau', async () => {
    const { networkStatusStore } = await import('./networkStatus')
    networkStatusStore.clear()
    await expect(rejectionHandler!(makeError(503))).rejects.toBeDefined()
    expect(networkStatusStore.getIssue()).toBe('server-error')
    networkStatusStore.clear()
    vi.useRealTimers()
  })
})
