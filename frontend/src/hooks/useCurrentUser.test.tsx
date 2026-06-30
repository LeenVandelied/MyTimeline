import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useCurrentUser } from './useCurrentUser'
import type { User } from '@/types/auth'

/**
 * #48 — Point dur : PAS de double-fetch /me. `useCurrentUser` doit relire l'état
 * d'AuthContext (#40), pas appeler `getUserProfile` (= `GET /api/auth/me`).
 * On mocke authService et on asserte que `getUserProfile` n'est JAMAIS appelé,
 * tout en exposant le user issu du localStorage rehydraté par AuthContext.
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

  it("expose le user d'AuthContext sans refetch /me (pas de double-fetch)", async () => {
    localStorage.setItem('user', JSON.stringify(FAKE_USER))

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(FAKE_USER)
    })

    // AuthContext est la source unique : aucun GET /api/auth/me déclenché ici.
    expect(getUserProfileMock).not.toHaveBeenCalled()
  })

  it('reflète user=null quand AuthContext est anonyme', async () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
    expect(getUserProfileMock).not.toHaveBeenCalled()
  })
})
