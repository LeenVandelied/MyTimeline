import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { TimelineEditHost } from './TimelineEditHost'
import type { TimelineResponsiveProps } from './TimelineResponsive'
import { AuthProvider } from '@/contexts/AuthContext'
import { deleteEvent } from '@/services/eventService'

/**
 * #review S42 (MINEUR) — INVARIANT provider de TimelineEditHost.
 *
 * `TimelineEditHost` monte `useEventEditConflict`, qui appelle `useAuth()` → LÈVE hors
 * d'un `<AuthProvider>`. Ce test verrouille l'invariant : monté SOUS un AuthProvider réel,
 * le host se rend sans lever. `TimelineResponsive` (frise lourde) est stubbé — on isole le
 * câblage host/hook. `authService` mocké pour que la restauration de session au montage
 * (fetchUser → /me) se résolve sans réseau.
 *
 * #309 — le stub expose un déclencheur `mobile-delete-trigger` qui invoque
 * `onDeleteEvent(event)` comme le ferait `TimelineActionSheet` (mobile), SANS passer
 * par `onEditEvent` (contrairement au chemin desktop `EventEditForm` → `editing`).
 */

vi.mock('./TimelineResponsive', () => ({
  TimelineResponsive: (props: TimelineResponsiveProps) => (
    <div data-testid="timeline-responsive-stub">
      <button
        type="button"
        data-testid="mobile-delete-trigger"
        onClick={() =>
          props.onDeleteEvent?.({
            id: 'evt-mobile',
            title: 'Mobile event',
            start: '2026-01-01',
            end: '2026-01-02',
            allDay: false,
            resourceId: 'product-1',
            extendedProps: { productId: 'product-1', productName: 'Produit', category: 'cat', type: 'single' },
            leftPx: 0,
            widthPx: 0,
            status: 'upcoming',
          })
        }
      >
        delete
      </button>
    </div>
  ),
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

describe('TimelineEditHost — suppression mobile (#309)', () => {
  it('onDeleteEvent (TimelineActionSheet mobile) supprime directement l’event ciblé, sans passer par le dialog d’édition', async () => {
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))

    // Réutilise le callback `onDelete` desktop (branché sur `EventDrawer`/`EventEditForm`) :
    // même chemin `deleteEvent`, pas de second callback (cf. risque de divergence de cache
    // noté au plan d'implémentation).
    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-mobile'))
    expect(deleteEvent).toHaveBeenCalledTimes(1)

    // La suppression mobile ne passe jamais par `editing` → le dialog d'édition desktop
    // ne doit à aucun moment s'ouvrir.
    expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument()
  })
})
