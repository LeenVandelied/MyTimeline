import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { TimelineEditHost } from './TimelineEditHost'
import type { TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'
import { AuthProvider } from '@/contexts/AuthContext'
import { deleteEvent } from '@/services/eventService'
import { queryKeys } from '@/lib/query-keys'

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
 *
 * #review S46 (MAJEUR) — le chemin mobile passe désormais par `DeleteConfirmDialog`
 * (hard-delete serveur : pas de corbeille) et l'échec de `deleteEvent` doit être
 * remonté à l'utilisateur au lieu de finir en unhandled rejection.
 *
 * next-intl mocké en chemin de clé (`namespace.key`) : `DeleteConfirmDialog` traduit
 * ses libellés, on assert sur les clés (indépendant de la locale).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

vi.mock('./TimelineResponsive', () => {
  const positionedEvent = (id: string, title: string): PositionedEvent => ({
    id,
    title,
    start: '2026-01-01',
    end: '2026-01-02',
    allDay: false,
    resourceId: 'product-1',
    extendedProps: {
      productId: 'product-1',
      productName: 'Produit',
      category: 'cat',
      type: 'single',
    },
    leftPx: 0,
    widthPx: 0,
    status: 'upcoming',
  })

  return {
    TimelineResponsive: (props: TimelineResponsiveProps) => (
      <div data-testid="timeline-responsive-stub">
        <button
          type="button"
          data-testid="mobile-delete-trigger"
          onClick={() => props.onDeleteEvent?.(positionedEvent('evt-mobile', 'Mobile event'))}
        >
          delete
        </button>
        {/* Chemin DESKTOP : `EventDrawer` ouvre l'éditeur (`editing`), la suppression part
            ensuite d'`EventEditForm` → `DeleteConfirmDialog` → `deleteEditing`. */}
        <button
          type="button"
          data-testid="desktop-edit-trigger"
          onClick={() => props.onEditEvent?.(positionedEvent('evt-desktop', 'Desktop event'))}
        >
          edit
        </button>
      </div>
    ),
  }
})

vi.mock('@/services/authService', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test', email: 't@e.st' }),
  login: vi.fn(),
  logout: vi.fn(),
  registerUser: vi.fn(),
}))

vi.mock('@/services/eventService', () => ({
  deleteEvent: vi.fn(),
}))

/**
 * Rend le host sous un `QueryClientProvider` RÉEL (pas de mock de `@tanstack/react-query` :
 * `AuthProvider` s'en sert aussi). `invalidateQueries` est espionné sur l'instance pour
 * prouver l'invalidation de cache après suppression (absorption S46).
 */
function renderUnderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
  return {
    ...render(<TimelineEditHost events={[]} resources={[]} locale="fr" />, { wrapper }),
    invalidateQueries,
  }
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
  it('onDeleteEvent (TimelineActionSheet mobile) ARME la confirmation sans supprimer', async () => {
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))

    // #review S46 MAJEUR : hard-delete serveur → aucun appel réseau au tap.
    await waitFor(() => expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument())
    expect(deleteEvent).not.toHaveBeenCalled()
    // Même dialog que le desktop, variante event.
    expect(screen.getByText('deleteDialog.event.title')).toBeInTheDocument()

    // La suppression mobile ne passe jamais par `editing` → le dialog d'édition desktop
    // ne doit à aucun moment s'ouvrir.
    expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument()
  })

  it('confirmation → supprime l’event ciblé et referme le dialog', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    // Réutilise l'unique chemin `deleteEvent` du host (pas de second callback → pas de
    // divergence d'invalidation de cache desktop/mobile, cf. plan d'implémentation).
    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-mobile'))
    expect(deleteEvent).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument(),
    )
  })

  it('annulation → ne supprime rien et referme le dialog', async () => {
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByText('deleteDialog.cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument(),
    )
    expect(deleteEvent).not.toHaveBeenCalled()
  })
})

describe('TimelineEditHost — échec de suppression (#review S46 MAJEUR)', () => {
  it('403 : erreur affichée à l’utilisateur, dialog maintenu ouvert (pas d’unhandled rejection)', async () => {
    // Rejet typé axios-like : `DeleteConfirmDialog` lit `error.response.status`.
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 403 } })
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-mobile'))
    // Feedback inline (mécanisme déjà en place sur le chemin desktop).
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('deleteDialog.errors.generic')
    // Le dialog NE se referme PAS : l'utilisateur voit que rien n'a été supprimé.
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument()
  })

  it('404 : message dédié (contrat d’erreur du dialog partagé)', async () => {
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 404 } })
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.errors.notFound')
  })
})

/**
 * Absorption S46 — sans invalidation, la frise (`useProductsWithEvents`) gardait l'event
 * supprimé à l'écran jusqu'à navigation. `runDelete` étant le point d'appel UNIQUE de
 * `deleteEvent`, les deux chemins (mobile `confirmDeleteTarget`, desktop `deleteEditing`)
 * doivent en bénéficier — et AUCUN chemin d'erreur (PAT-S46-002).
 */
describe('TimelineEditHost — invalidation du cache après suppression', () => {
  it('mobile : succès → invalide le préfixe products (couvre products.withEvents)', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.products.all }),
    )
  })

  it('desktop : succès via l’éditeur → même invalidation (point d’appel unique)', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    // Le dialog d'édition monte `EventEditForm`, dont le bouton supprimer ouvre le même
    // `DeleteConfirmDialog` (#65) branché sur `deleteEditing`.
    fireEvent.click(await screen.findByTestId('event-form-delete'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-desktop'))
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.products.all }),
    )
  })

  it('échec serveur → AUCUNE invalidation (le cache n’est pas touché sur rejet)', async () => {
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 403 } })
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await screen.findByRole('alert')
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })
})
