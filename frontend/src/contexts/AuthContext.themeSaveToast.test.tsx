import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import { updatePreferences } from '@/services/userService'
import { AuthProvider, useAuth } from './AuthContext'
import { useThemeChoice } from '@/hooks/useThemeChoice'
import type { User } from '@/types/auth'

/**
 * #833 — L'échec de `PUT /me/preferences` ne produit AUCUN toast global.
 *
 * Contrairement à `AuthContext.theme.test.tsx` (`userService` mocké), ce fichier
 * garde la chaîne RÉELLE bascule → `persistThemeChoice` → `updatePreferences` →
 * `apiClient` → intercepteur (PIT-S102-001). Seul le transport HTTP est remplacé
 * (`apiClient.defaults.adapter`). Avec un service mocké, l'intercepteur ne
 * s'exécuterait jamais et « aucun toast » passerait avec ou sans correctif.
 *
 * Les témoins prouvent que l'intercepteur est câblé dans ce montage : la même
 * réponse 500 sur la même route, SANS l'opt-out, déclenche le toast.
 *
 * Le 409 : l'intercepteur n'a aucune branche 409 (mesuré S112), il ne toaste donc
 * pas, opt-out ou non. Les deux tests 409 figent ce fait : si une branche 409
 * toastante est ajoutée un jour, le test de la bascule rougit et force à étendre
 * l'opt-out (`inlineErrorHandling.ts`) au lieu de réintroduire le toast ici.
 */

const toastErrorMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: toastErrorMock },
  toast: { success: vi.fn(), error: toastErrorMock },
}))

const setTheme = vi.fn()
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme }),
}))

const getUserProfileMock = vi.fn()
vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  registerUser: vi.fn(),
  logout: vi.fn(),
  // Importé par `apiClient` (rafraîchissement périodique).
  refreshToken: vi.fn().mockResolvedValue(true),
}))

const ACCOUNT: User = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Alice Liddell',
  username: 'alice',
  email: 'alice@example.com',
  role: 'ROLE_USER',
  avatarUrl: null,
  themePreference: 'light',
}

const originalAdapter = apiClient.defaults.adapter
const seenRequests: string[] = []

/** Adaptateur axios : toute requête reçoit `status`, comme le ferait le backend. */
const failingAdapter =
  (status: 409 | 500) =>
  (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    seenRequests.push(`${config.method?.toUpperCase()} ${config.url}`)
    const response: AxiosResponse = {
      data: { message: status === 409 ? 'Conflict' : 'Internal Server Error' },
      status,
      statusText: status === 409 ? 'Conflict' : 'Internal Server Error',
      headers: {},
      config,
    }
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        status === 409 ? 'ERR_BAD_REQUEST' : 'ERR_BAD_RESPONSE',
        config,
        null,
        response,
      ),
    )
  }

function Probe() {
  const { user } = useAuth()
  const { setThemeChoice } = useThemeChoice()
  return (
    <>
      <span data-testid="who">{user ? user.username : 'anonymous'}</span>
      <span data-testid="pref">{user ? String(user.themePreference) : '-'}</span>
      <button type="button" onClick={() => setThemeChoice('dark')}>
        choose-dark
      </button>
    </>
  )
}

async function mountWithSession() {
  getUserProfileMock.mockResolvedValue(ACCOUNT)
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('alice'))
  return user
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  setTheme.mockReset()
  getUserProfileMock.mockReset()
  toastErrorMock.mockReset()
  seenRequests.length = 0
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  errorSpy.mockRestore()
  localStorage.clear()
})

describe('#833 — échec du PUT /me/preferences sur une bascule de thème : aucun toast global', () => {
  it.each([500, 409] as const)(
    '%i : aucun toast, thème local conservé, échec journalisé',
    async (status) => {
      apiClient.defaults.adapter = failingAdapter(status)
      const user = await mountWithSession()

      await user.click(screen.getByRole('button', { name: 'choose-dark' }))

      // Le `catch` de `persistThemeChoice` a été atteint : l'intercepteur est passé avant.
      await waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Theme preference save failed',
          `Request failed with status code ${status}`,
        ),
      )
      // La requête est bien partie par le transport réel (pas un service mocké).
      expect(seenRequests).toEqual(['PUT /me/preferences'])
      expect(toastErrorMock).not.toHaveBeenCalled()
      // Comportement silencieux inchangé : le thème choisi reste appliqué localement.
      expect(setTheme).toHaveBeenCalledTimes(1)
      expect(setTheme).toHaveBeenCalledWith('dark')
      expect(screen.getByTestId('pref')).toHaveTextContent('light')
    },
  )
})

describe('#833 — témoins : même route, SANS opt-out', () => {
  it('500 : le toast « erreur serveur » est conservé (opt-out par requête, pas par URL)', async () => {
    apiClient.defaults.adapter = failingAdapter(500)

    await expect(updatePreferences({ themePreference: 'dark' })).rejects.toBeInstanceOf(AxiosError)

    expect(seenRequests).toEqual(['PUT /me/preferences'])
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock.mock.calls[0][0]).toMatch(/serveur/i)
  })

  it("409 : aucun toast même sans opt-out (l'intercepteur n'a pas de branche 409)", async () => {
    apiClient.defaults.adapter = failingAdapter(409)

    await expect(updatePreferences({ themePreference: 'dark' })).rejects.toBeInstanceOf(AxiosError)

    expect(seenRequests).toEqual(['PUT /me/preferences'])
    expect(toastErrorMock).not.toHaveBeenCalled()
  })
})
