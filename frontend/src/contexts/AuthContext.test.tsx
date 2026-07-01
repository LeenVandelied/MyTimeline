import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import type { User } from '@/types/auth'

/**
 * #40 — l'état d'auth vit dans un Context unique : un login déclenché par UN
 * consumer DOIT se propager à TOUS les consumers montés sous le même
 * <AuthProvider> (régression historique : 4 useState indépendants).
 *
 * #135 (A17) — Sécurité : le user (PII) N'EST PLUS miroité dans localStorage.
 * La session est restaurée au montage via un re-fetch `GET /api/auth/me`
 * (cookie JWT HttpOnly, source de vérité serveur), et non depuis localStorage.
 * On mocke `getUserProfile` (= /me) pour simuler session valide/absente et on
 * asserte qu'aucune PII n'atterrit dans localStorage.
 */

const loginMock = vi.fn()
const getUserProfileMock = vi.fn()
const registerUserMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('@/services/authService', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  registerUser: (...args: unknown[]) => registerUserMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
}))

const FAKE_USER: User = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Alice Liddell',
  username: 'alice',
  email: 'alice@example.com',
  role: 'ROLE_USER',
}

/** Consumer A : déclenche le login. */
function LoginTrigger() {
  const { login } = useAuth()
  return (
    <button type="button" onClick={() => login('alice', 'secret123')}>
      do-login
    </button>
  )
}

/** Consumer B : déclenche le logout. */
function LogoutTrigger() {
  const { logout } = useAuth()
  return (
    <button type="button" onClick={() => logout()}>
      do-logout
    </button>
  )
}

/** Consumer C : affiche l'état, ne déclenche rien — doit refléter le login de A. */
function UserBadge({ label }: { label: string }) {
  const { user } = useAuth()
  return <span data-testid={label}>{user ? user.username : 'anonymous'}</span>
}

function wrap(children: ReactNode) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    loginMock.mockReset()
    getUserProfileMock.mockReset()
    registerUserMock.mockReset()
    logoutMock.mockReset()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('restaure la session au montage via /me (aucune lecture localStorage)', async () => {
    // Session valide côté serveur : /me renvoie le user (cookie HttpOnly implicite).
    getUserProfileMock.mockResolvedValue(FAKE_USER)

    render(wrap(<UserBadge label="badge-1" />))

    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('alice')
    })
    // La restauration passe par /me, PAS par localStorage.
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)
  })

  it('reste anonyme au montage si /me échoue (pas de session)', async () => {
    getUserProfileMock.mockRejectedValue(new Error('401'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(wrap(<UserBadge label="badge-1" />))

    await waitFor(() => {
      expect(getUserProfileMock).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByTestId('badge-1')).toHaveTextContent('anonymous')
    spy.mockRestore()
  })

  it('propage un login à tous les consumers du contexte sans rechargement', async () => {
    // Montage : pas de session (evite un flash pré-login), puis /me post-login.
    getUserProfileMock.mockRejectedValueOnce(new Error('401'))
    loginMock.mockResolvedValue({ message: 'ok' })
    getUserProfileMock.mockResolvedValue(FAKE_USER)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()

    render(
      wrap(
        <>
          <LoginTrigger />
          <UserBadge label="badge-1" />
          <UserBadge label="badge-2" />
        </>,
      ),
    )

    // État initial : tous anonymes (/me a échoué au montage).
    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('anonymous')
    })
    expect(screen.getByTestId('badge-2')).toHaveTextContent('anonymous')

    await user.click(screen.getByRole('button', { name: 'do-login' }))

    // Les DEUX badges reflètent le user issu d'un seul login.
    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('alice')
    })
    expect(screen.getByTestId('badge-2')).toHaveTextContent('alice')
    expect(loginMock).toHaveBeenCalledWith('alice', 'secret123')
    spy.mockRestore()
  })

  it('ne persiste AUCUNE PII (email/name) dans localStorage après login (#135, A17)', async () => {
    getUserProfileMock.mockRejectedValueOnce(new Error('401'))
    loginMock.mockResolvedValue({ message: 'ok' })
    getUserProfileMock.mockResolvedValue(FAKE_USER)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()

    render(
      wrap(
        <>
          <LoginTrigger />
          <UserBadge label="badge-1" />
        </>,
      ),
    )

    await user.click(screen.getByRole('button', { name: 'do-login' }))
    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('alice')
    })

    // Le miroir historique 'user' n'existe plus.
    expect(localStorage.getItem('user')).toBeNull()
    // Défense en profondeur : aucune PII sensible n'a fuité dans TOUT le storage.
    const dump = JSON.stringify(localStorage)
    expect(dump).not.toContain('alice@example.com')
    expect(dump).not.toContain('Alice Liddell')
    spy.mockRestore()
  })

  it("purge l'état user au logout (aucun miroir localStorage)", async () => {
    getUserProfileMock.mockResolvedValue(FAKE_USER)
    logoutMock.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      wrap(
        <>
          <LogoutTrigger />
          <UserBadge label="badge-1" />
        </>,
      ),
    )

    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('alice')
    })

    await user.click(screen.getByRole('button', { name: 'do-logout' }))

    await waitFor(() => {
      expect(screen.getByTestId('badge-1')).toHaveTextContent('anonymous')
    })
    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('user')).toBeNull()
  })

  it("useAuth lève hors d'un <AuthProvider>", () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<UserBadge label="x" />)).toThrow(/AuthProvider/)
    spy.mockRestore()
  })
})
