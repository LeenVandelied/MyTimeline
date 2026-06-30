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
    interceptors: {
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
    localStorage.setItem('user', JSON.stringify({ id: 'x' }))
    rejectionHandler = undefined
    vi.resetModules()
    // L'import déclenche l'enregistrement de l'intercepteur (et setupPeriodicRefresh).
    await import('./apiClient')
  })

  it('affiche un toast et rejette la promesse sur 401', async () => {
    expect(rejectionHandler).toBeDefined()

    await expect(rejectionHandler!(makeError(401))).rejects.toBeDefined()

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/session expirée/i)
    // Le user local est purgé immédiatement.
    expect(localStorage.getItem('user')).toBeNull()
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

  it('affiche un toast serveur sur 500 sans rediriger', async () => {
    await expect(rejectionHandler!(makeError(500))).rejects.toBeDefined()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/serveur/i)
    vi.useRealTimers()
  })
})
