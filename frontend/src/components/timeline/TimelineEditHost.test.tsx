import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { TimelineEditHost } from './TimelineEditHost'
import { AuthProvider } from '@/contexts/AuthContext'

/**
 * #review S42 (MINEUR) — INVARIANT provider de TimelineEditHost.
 *
 * `TimelineEditHost` monte `useEventEditConflict`, qui appelle `useAuth()` → LÈVE hors
 * d'un `<AuthProvider>`. Ce test verrouille l'invariant : monté SOUS un AuthProvider réel,
 * le host se rend sans lever. `TimelineResponsive` (frise lourde) est stubbé — on isole le
 * câblage host/hook. `authService` mocké pour que la restauration de session au montage
 * (fetchUser → /me) se résolve sans réseau.
 */

vi.mock('./TimelineResponsive', () => ({
  TimelineResponsive: () => <div data-testid="timeline-responsive-stub" />,
}))

vi.mock('@/services/authService', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test', email: 't@e.st' }),
  login: vi.fn(),
  logout: vi.fn(),
  registerUser: vi.fn(),
}))

vi.mock('@/services/eventService', () => ({
  deleteEvent: vi.fn(),
}))

function renderUnderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
  return render(<TimelineEditHost events={[]} resources={[]} locale="fr" />, { wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TimelineEditHost — invariant AuthProvider (#review S42)', () => {
  it('monté sous <AuthProvider> : se rend sans lever (useEventEditConflict → useAuth OK)', async () => {
    expect(() => renderUnderAuth()).not.toThrow()
    // Le host rend TimelineResponsive (stub) ; le dialog d'édition reste fermé (editing=null).
    expect(screen.getByTestId('timeline-responsive-stub')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument(),
    )
  })
})
