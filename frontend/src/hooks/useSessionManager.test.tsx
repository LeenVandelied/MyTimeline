import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { useSessionManager } from './useSessionManager'
import type { Session } from '@/types/settings'

/**
 * #86 — Logique sessions (liste + révocation). On mocke le service ; on vérifie
 * la remontée de la liste et l'appel des mutations de révocation.
 */
const getActiveSessionsMock = vi.fn()
const revokeSessionMock = vi.fn()
const revokeOtherSessionsMock = vi.fn()

vi.mock('@/services/sessionService', () => ({
  getActiveSessions: () => getActiveSessionsMock(),
  revokeSession: (...args: unknown[]) => revokeSessionMock(...args),
  revokeOtherSessions: () => revokeOtherSessionsMock(),
}))

const SESSION: Session = {
  id: 'sess-1',
  deviceInfo: 'Chrome',
  ipAddress: '1.2.3.0',
  lastActivity: '2026-07-05T10:00:00',
  createdAt: '2026-07-01T09:00:00',
  current: true,
}

function makeWrapper() {
  const client = new QueryClient({
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useSessionManager', () => {
  beforeEach(() => {
    getActiveSessionsMock.mockReset()
    revokeSessionMock.mockReset()
    revokeOtherSessionsMock.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('expose la liste des sessions chargées', async () => {
    getActiveSessionsMock.mockResolvedValue([SESSION])
    const { result } = renderHook(() => useSessionManager(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.sessions).toEqual([SESSION])
  })

  it('révoque une session ciblée', async () => {
    getActiveSessionsMock.mockResolvedValue([SESSION])
    revokeSessionMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSessionManager(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await result.current.revokeOne.mutateAsync('sess-1')
    expect(revokeSessionMock).toHaveBeenCalledWith('sess-1')
  })

  it('révoque toutes les autres sessions', async () => {
    getActiveSessionsMock.mockResolvedValue([SESSION])
    revokeOtherSessionsMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSessionManager(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await result.current.revokeOthers.mutateAsync()
    expect(revokeOtherSessionsMock).toHaveBeenCalled()
  })
})
