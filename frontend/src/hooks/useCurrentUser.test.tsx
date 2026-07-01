import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useCurrentUser } from './useCurrentUser'
import type { User } from '@/types/auth'

/**
 * #48 — Point dur : PAS de double-fetch /me. `useCurrentUser` doit relire l'état
 * d'AuthContext (#40), pas déclencher son PROPRE `getUserProfile` (= `GET /api/auth/me`).
 *
 * #135 — AuthContext restaure désormais la session via un unique re-fetch /me au
 * montage (le miroir localStorage du user a été supprimé, PII hors storage). On
 * mocke `getUserProfile` pour simuler cette réponse serveur et on asserte que
 * `useCurrentUser` N'AJOUTE PAS d'appel /me supplémentaire (exactement 1 appel,
 * celui d'AuthContext), tout en exposant le user restauré.
 */

const getUserProfileMock = vi.fn()

vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  registerUser: vi.fn(),
  logout: vi.fn(),
}))

const FAKE_USER: User = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Alice Liddell',
  username: 'alice',
  email: 'alice@example.com',
  role: 'ROLE_USER',
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    )
  }
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    localStorage.clear()
    getUserProfileMock.mockReset()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('expose le user restauré par AuthContext sans double-fetch /me', async () => {
    // AuthContext (#135) restaure la session via un unique /me au montage.
    getUserProfileMock.mockResolvedValue(FAKE_USER)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(FAKE_USER)
    })

    // AuthContext est la source unique : le hook n'ajoute AUCUN /me supplémentaire.
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)
  })

  it('reflète user=null quand AuthContext est anonyme (/me échoue)', async () => {
    getUserProfileMock.mockRejectedValue(new Error('401'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
    // Un seul /me (celui d'AuthContext), pas de double-fetch depuis le hook.
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
