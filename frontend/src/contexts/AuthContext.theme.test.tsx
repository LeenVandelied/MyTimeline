import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { THEME_STORAGE_KEY, useThemeChoice } from '@/hooks/useThemeChoice'
import type { User } from '@/types/auth'

/**
 * #653 — Préférence de thème du compte (ADR-010, BR-AUT-013), côté front.
 *
 * CE QUE CES TESTS PROUVENT.
 *  1. L'arbitrage à la CONNEXION EXPLICITE (`login`) et ses 3 branches :
 *     préférence de compte appliquée sans réécriture ; choix local explicite
 *     adopté par le compte (PUT) ; aucun choix nulle part → aucune écriture.
 *  2. AUCUN arbitrage à la restauration de session au montage (décision S111).
 *  3. Après connexion, une bascule (`useThemeChoice`) écrit localement ET sur le
 *     compte ; pas de PUT anonyme ; pas de PUT quand le compte porte déjà la
 *     valeur ; échec du PUT toléré (log assaini, thème local conservé).
 *
 * CE QU'ILS NE PROUVENT PAS : que next-themes écrive bien `localStorage` et la
 * classe `.dark` (mocké ici), ni le contrat HTTP réel — c'est l'objet de
 * `e2e/sprint-111-theme-account-preference.spec.ts`.
 */

const setTheme = vi.fn()
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme }),
}))

const loginMock = vi.fn()
const getUserProfileMock = vi.fn()
const logoutMock = vi.fn()
vi.mock('@/services/authService', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  registerUser: vi.fn(),
  logout: (...args: unknown[]) => logoutMock(...args),
}))

const updatePreferencesMock = vi.fn()
vi.mock('@/services/userService', () => ({
  updatePreferences: (...args: unknown[]) => updatePreferencesMock(...args),
}))

function account(themePreference: User['themePreference']): User {
  return {
    id: '018f3a2b-0000-7000-8000-000000000001',
    name: 'Alice Liddell',
    username: 'alice',
    email: 'alice@example.com',
    role: 'ROLE_USER',
    avatarUrl: null,
    themePreference,
  }
}

/** Sonde : déclencheurs + état du user tel que vu par `useAuth()`. */
function Probe() {
  const { user, login, logout } = useAuth()
  const { setThemeChoice } = useThemeChoice()
  return (
    <>
      <span data-testid="who">{user ? user.username : 'anonymous'}</span>
      <span data-testid="pref">{user ? String(user.themePreference) : '-'}</span>
      <button type="button" onClick={() => login('alice', 'secret123')}>
        do-login
      </button>
      <button type="button" onClick={() => logout()}>
        do-logout
      </button>
      <button type="button" onClick={() => setThemeChoice('dark')}>
        choose-dark
      </button>
      <button type="button" onClick={() => setThemeChoice('light')}>
        choose-light
      </button>
    </>
  )
}

/** Monte anonyme (pas de session), puis connecte `acct` par `login`. */
async function mountAnonymousThenLogin(acct: User) {
  getUserProfileMock.mockRejectedValueOnce(new Error('401'))
  getUserProfileMock.mockResolvedValue(acct)
  loginMock.mockResolvedValue({ message: 'ok' })
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await waitFor(() => expect(getUserProfileMock).toHaveBeenCalledTimes(1))
  await user.click(screen.getByRole('button', { name: 'do-login' }))
  await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('alice'))
  return user
}

/** Monte avec une session existante (restauration au montage, sans login). */
async function mountWithSession(acct: User) {
  getUserProfileMock.mockResolvedValue(acct)
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
  loginMock.mockReset()
  getUserProfileMock.mockReset()
  logoutMock.mockReset()
  updatePreferencesMock.mockReset()
  // Le montage anonyme journalise « User fetch failed » : attendu, pas du bruit.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  localStorage.clear()
})

describe('#653 — arbitrage à la connexion', () => {
  it('compte avec préférence : appliquée localement, JAMAIS réécrite (choix local ignoré)', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    // Qui était affiché quand le thème du compte a été appliqué : l'écran de
    // login navigue dès que `user` existe, le thème doit donc le précéder.
    let shownWhenApplied: string | null = null
    setTheme.mockImplementation(() => {
      shownWhenApplied = screen.getByTestId('who').textContent
    })

    await mountAnonymousThenLogin(account('light'))

    expect(setTheme).toHaveBeenCalledWith('light')
    expect(shownWhenApplied).toBe('anonymous')
    expect(updatePreferencesMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('pref')).toHaveTextContent('light')
  })

  it('compte sans préférence + choix local explicite : le compte adopte le choix local', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    updatePreferencesMock.mockResolvedValue(account('dark'))

    await mountAnonymousThenLogin(account(null))

    expect(updatePreferencesMock).toHaveBeenCalledTimes(1)
    expect(updatePreferencesMock).toHaveBeenCalledWith({ themePreference: 'dark' })
    // Le thème local n'est pas réécrit : il est déjà le bon.
    expect(setTheme).not.toHaveBeenCalled()
    // La valeur connue du compte suit la réponse du PUT.
    await waitFor(() => expect(screen.getByTestId('pref')).toHaveTextContent('dark'))
  })

  it('`system` local explicite est un choix : il est adopté', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system')
    updatePreferencesMock.mockResolvedValue(account('system'))

    await mountAnonymousThenLogin(account(null))

    expect(updatePreferencesMock).toHaveBeenCalledWith({ themePreference: 'system' })
  })

  it('compte sans préférence + aucun choix local : rien n’est écrit, le compte reste null', async () => {
    await mountAnonymousThenLogin(account(null))

    expect(updatePreferencesMock).not.toHaveBeenCalled()
    expect(setTheme).not.toHaveBeenCalled()
    expect(screen.getByTestId('pref')).toHaveTextContent('null')
  })

  it('valeur locale hors domaine (résidu) : traitée comme « aucun choix »', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

    await mountAnonymousThenLogin(account(null))

    expect(updatePreferencesMock).not.toHaveBeenCalled()
  })

  it('un PUT en échec à la connexion ne fait pas échouer la connexion', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    updatePreferencesMock.mockRejectedValue(
      Object.assign(new Error('Network Error'), { config: { data: '{"password":"x"}' } }),
    )

    await mountAnonymousThenLogin(account(null))

    await waitFor(() => expect(updatePreferencesMock).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('who')).toHaveTextContent('alice')
    expect(errorSpy).toHaveBeenCalledWith('Theme preference save failed', 'Network Error')
  })
})

describe('#653 — aucun arbitrage à la restauration de session (montage)', () => {
  it('compte sans préférence + choix local : pas de PUT au montage', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    await mountWithSession(account(null))

    expect(updatePreferencesMock).not.toHaveBeenCalled()
    expect(setTheme).not.toHaveBeenCalled()
  })

  it('compte avec préférence : pas appliquée au montage', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    await mountWithSession(account('light'))

    expect(setTheme).not.toHaveBeenCalled()
    expect(updatePreferencesMock).not.toHaveBeenCalled()
  })
})

describe('#653 — bascules après connexion', () => {
  it('authentifié : la bascule écrit localement ET sur le compte, la valeur connue suit', async () => {
    updatePreferencesMock.mockResolvedValue(account('dark'))
    const user = await mountWithSession(account('light'))

    await user.click(screen.getByRole('button', { name: 'choose-dark' }))

    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(updatePreferencesMock).toHaveBeenCalledWith({ themePreference: 'dark' })
    await waitFor(() => expect(screen.getByTestId('pref')).toHaveTextContent('dark'))
  })

  it('anonyme : la bascule reste locale (aucun PUT)', async () => {
    getUserProfileMock.mockRejectedValue(new Error('401'))
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(getUserProfileMock).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: 'choose-dark' }))

    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(updatePreferencesMock).not.toHaveBeenCalled()
  })

  it('valeur identique à celle du compte : aucun PUT', async () => {
    const user = await mountWithSession(account('dark'))

    await user.click(screen.getByRole('button', { name: 'choose-dark' }))

    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(updatePreferencesMock).not.toHaveBeenCalled()
  })

  it('échec du PUT : thème local conservé, log assaini, la même bascule est retentée ensuite', async () => {
    const leaky = Object.assign(new Error('Request failed with status code 500'), {
      config: { headers: { Authorization: 'Bearer secret' } },
    })
    updatePreferencesMock.mockRejectedValueOnce(leaky)
    const user = await mountWithSession(account('light'))

    await user.click(screen.getByRole('button', { name: 'choose-dark' }))
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        'Theme preference save failed',
        'Request failed with status code 500',
      ),
    )
    // Jamais l'objet d'erreur brut dans la console.
    for (const call of errorSpy.mock.calls) {
      for (const arg of call) expect(arg).not.toBe(leaky)
    }
    // Pas de retour arrière visuel : un seul setTheme, vers le choix fait.
    expect(setTheme).toHaveBeenCalledTimes(1)
    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(screen.getByTestId('pref')).toHaveTextContent('light')

    // Le compte n'a pas bougé : la même bascule doit être re-tentée.
    updatePreferencesMock.mockResolvedValueOnce(account('dark'))
    await user.click(screen.getByRole('button', { name: 'choose-dark' }))
    await waitFor(() => expect(updatePreferencesMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('pref')).toHaveTextContent('dark'))
  })

  it('aller-retour rapide pendant un PUT en vol : le retour est bien écrit', async () => {
    let releaseFirst: (u: User) => void = () => {}
    updatePreferencesMock.mockImplementationOnce(
      () => new Promise<User>((resolve) => (releaseFirst = resolve)),
    )
    updatePreferencesMock.mockResolvedValueOnce(account('light'))
    const user = await mountWithSession(account('light'))

    await user.click(screen.getByRole('button', { name: 'choose-dark' }))
    await user.click(screen.getByRole('button', { name: 'choose-light' }))

    // Sans le suivi de la valeur « en vol », le retour à `light` (valeur
    // confirmée du compte) serait sauté et le compte finirait sur `dark`.
    expect(updatePreferencesMock).toHaveBeenNthCalledWith(1, { themePreference: 'dark' })
    expect(updatePreferencesMock).toHaveBeenNthCalledWith(2, { themePreference: 'light' })

    // La réponse périmée du 1er PUT n'écrase pas la valeur connue.
    await act(async () => releaseFirst(account('dark')))
    expect(screen.getByTestId('pref')).toHaveTextContent('light')
  })

  it('logout : le thème local n’est pas touché', async () => {
    logoutMock.mockResolvedValue(undefined)
    const user = await mountWithSession(account('dark'))

    await user.click(screen.getByRole('button', { name: 'do-logout' }))
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('anonymous'))

    expect(setTheme).not.toHaveBeenCalled()
  })
})
