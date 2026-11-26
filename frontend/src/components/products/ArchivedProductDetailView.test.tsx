import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchivedProductDetail, Product } from '@/types/product'
import { ProductDetailView } from './ProductDetailView'

/**
 * #718 — Fiche en lecture seule d'un produit archivé. Les tests montent `ProductDetailView`
 * (la page `/products/{id}`) : c'est elle qui, un produit introuvable parmi les actifs, interroge
 * la route des archivés (`useArchivedProductDetail`) puis affiche `ArchivedProductDetailView`.
 * Le dialog de restauration est le RÉEL ; la mutation, la requête des archivés et la liste active
 * sont mockées au niveau de leur hook (leur cache est couvert ailleurs).
 *
 * Contrat de rendu posé ici (clés i18n lues par le mock `namespace.key`) :
 *   - `archived-product-detail-view` racine ; `archived-product-detail-banner` (clé
 *     `products.archivedDetail.banner`) ; `archived-product-detail-name` ;
 *     `archived-product-detail-category` ; `archived-product-detail-events` (liste simple) avec
 *     une ligne `archived-product-detail-event-{id}` par événement ;
 *   - `archived-product-detail-restore` : seule action, ouvre `RestoreProductDialog` ;
 *   - après restauration, navigation (push ou replace) vers `/fr/products/{id}`.
 */

const useProductsMock = vi.fn()
const useArchivedDetailMock = vi.fn()
const restoreMutateAsync = vi.fn()
const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useArchivedProductDetail', () => ({
  useArchivedProductDetail: (...args: unknown[]) => useArchivedDetailMock(...args),
}))
vi.mock('@/hooks/useRestoreProduct', () => ({
  useRestoreProduct: () => ({ mutateAsync: restoreMutateAsync }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/services/productService', () => ({
  deleteProduct: vi.fn(),
}))
vi.mock('@/hooks/useArchiveProduct', () => ({
  useArchiveProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIsProductArchivedHere: () => false,
}))
vi.mock('@/hooks/useSetEventArchived', () => ({
  useSetEventArchived: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, prefetch: vi.fn() }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))
const toastSuccessMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
  toast: { success: toastSuccessMock, error: vi.fn() },
}))
vi.mock('@/components/timeline', () => ({
  TimelineEditHost: () => <div data-testid="timeline-responsive">timeline</div>,
  TimelineResponsive: () => <div data-testid="timeline-responsive">timeline</div>,
}))
vi.mock('./ProductDrawer', () => ({
  ProductDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="product-drawer" /> : null,
}))

const ACTIVE_OTHER: Product = {
  id: 'p-active',
  name: 'Actif',
  color: null,
  category: { id: 'c-9', name: 'Maison', color: null },
  events: [],
}

const ARCHIVED: ArchivedProductDetail = {
  id: 'p-arch',
  name: 'Vélo ancien',
  color: '#112233',
  category: { id: 'c-1', name: 'Sport', color: '#445566' },
  events: [
    {
      id: 'e-active',
      title: 'Révision',
      type: 'single',
      startDate: '2026-06-01T10:00:00Z',
      endDate: '2026-06-01T10:00:00Z',
      productId: 'p-arch',
      archived: false,
    },
    {
      id: 'e-archived',
      title: 'Changement de chaîne',
      type: 'single',
      startDate: '2026-05-01T10:00:00Z',
      endDate: '2026-05-01T10:00:00Z',
      productId: 'p-arch',
      archived: true,
      version: 2,
    },
  ],
}

function archivedFound() {
  useArchivedDetailMock.mockReturnValue({
    data: ARCHIVED,
    isLoading: false,
    isError: false,
    error: null,
  })
}

describe('ArchivedProductDetailView (via ProductDetailView)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Le produit demandé n'est PAS dans les produits actifs.
    useProductsMock.mockReturnValue({ data: [ACTIVE_OTHER], isLoading: false, isError: false })
  })

  it('renders name, category and event history of an archived product', () => {
    archivedFound()
    render(<ProductDetailView productId="p-arch" />)

    expect(screen.queryByTestId('product-detail-not-found')).not.toBeInTheDocument()
    expect(screen.getByTestId('archived-product-detail-view')).toBeInTheDocument()
    expect(screen.getByTestId('archived-product-detail-name')).toHaveTextContent('Vélo ancien')
    expect(screen.getByTestId('archived-product-detail-category')).toHaveTextContent('Sport')
    const events = screen.getByTestId('archived-product-detail-events')
    expect(within(events).getByTestId('archived-product-detail-event-e-active')).toHaveTextContent(
      'Révision',
    )
    expect(
      within(events).getByTestId('archived-product-detail-event-e-archived'),
    ).toHaveTextContent('Changement de chaîne')
  })

  it('shows the archived banner', () => {
    archivedFound()
    render(<ProductDetailView productId="p-arch" />)

    expect(screen.getByTestId('archived-product-detail-banner')).toHaveTextContent(
      'products.archivedDetail.banner',
    )
  })

  it('offers no edit, archive or create-event action', () => {
    archivedFound()
    render(<ProductDetailView productId="p-arch" />)

    // Ancre : la fiche archivée est bien affichée (sinon l'absence ci-dessous ne prouve rien).
    expect(screen.getByTestId('archived-product-detail-view')).toBeInTheDocument()
    expect(screen.queryByTestId('product-detail-edit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('product-detail-archive')).not.toBeInTheDocument()
    expect(screen.queryByTestId('product-detail-new-event')).not.toBeInTheDocument()
    expect(screen.queryByTestId('product-drawer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timeline-responsive')).not.toBeInTheDocument()

    // Les seuls boutons permis : retour liste et Désarchiver.
    const buttonIds = screen
      .getAllByRole('button')
      .map((b) => b.getAttribute('data-testid'))
      .sort()
    expect(
      buttonIds.every(
        (id) => id === 'product-detail-back' || id === 'archived-product-detail-restore',
      ),
    ).toBe(true)
    expect(buttonIds).toContain('archived-product-detail-restore')

    // Les événements ne s'ouvrent pas en édition : lignes ni boutons ni liens.
    const events = screen.getByTestId('archived-product-detail-events')
    expect(within(events).queryAllByRole('button')).toHaveLength(0)
    expect(within(events).queryAllByRole('link')).toHaveLength(0)
  })

  it('restores after confirmation and goes to the active product page', async () => {
    const user = userEvent.setup()
    restoreMutateAsync.mockResolvedValue(undefined)
    archivedFound()
    render(<ProductDetailView productId="p-arch" />)

    await user.click(screen.getByTestId('archived-product-detail-restore'))
    expect(await screen.findByTestId('product-restore-confirm')).toBeInTheDocument()
    // Rien n'est restauré avant la confirmation.
    expect(restoreMutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    await waitFor(() => expect(restoreMutateAsync).toHaveBeenCalledWith({ productId: 'p-arch' }))
    await waitFor(() => {
      const targets = [...pushMock.mock.calls, ...replaceMock.mock.calls].map((c) => c[0])
      expect(targets).toEqual(['/fr/products/p-arch'])
    })
  })

  it('shows not-found when the archived lookup answers 404', () => {
    useArchivedDetailMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 404 } },
    })
    render(<ProductDetailView productId="inconnu" />)

    expect(screen.getByTestId('product-detail-not-found')).toBeInTheDocument()
    expect(screen.queryByTestId('archived-product-detail-view')).not.toBeInTheDocument()
  })
})
