import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/types/product'
import { ProductDetailView } from './ProductDetailView'

/**
 * #68 — Tests ProductDetailView : fiche produit, sous-frise FILTRÉE en amont (ne
 * reçoit que les events du produit sélectionné), historique, édition (drawer),
 * suppression (soft delete #50 → retour liste), état introuvable (archivé/absent).
 */

const useProductsMock = vi.fn()
const pushMock = vi.fn()
const deleteProductMock = vi.fn()
const timelineSpy = vi.fn()

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/services/productService', () => ({
  deleteProduct: (...args: unknown[]) => deleteProductMock(...args),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

// TimelineResponsive mocké : on capture events/resources reçus pour prouver le
// filtrage amont (ce produit uniquement, pas toute la liste).
vi.mock('@/components/timeline', () => ({
  TimelineResponsive: (props: { events: unknown[]; resources: unknown[] }) => {
    timelineSpy(props)
    return <div data-testid="timeline-responsive">timeline</div>
  },
}))
vi.mock('./ProductDrawer', () => ({
  ProductDrawer: ({ open, product }: { open: boolean; product?: Product }) =>
    open ? <div data-testid="product-drawer" data-product={product?.id ?? ''} /> : null,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: () => void | Promise<void>
  }) =>
    open ? (
      <button type="button" data-testid="delete-dialog" onClick={() => onConfirm()}>
        confirm
      </button>
    ) : null,
}))

const PRODUCT: Product = {
  id: 'p-alpha',
  name: 'Alpha',
  color: '#112233',
  category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
  events: [
    {
      id: 'e1',
      title: 'Vidange',
      type: 'single',
      startDate: '2026-06-01T10:00:00Z',
      endDate: '2026-06-01T10:00:00Z',
      productId: 'p-alpha',
      archived: false,
    },
    {
      id: 'e-arch',
      title: 'Archivé',
      type: 'single',
      startDate: '2026-05-01T10:00:00Z',
      endDate: '2026-05-01T10:00:00Z',
      productId: 'p-alpha',
      archived: true,
    },
  ],
}

const OTHER: Product = {
  id: 'p-beta',
  name: 'Beta',
  color: null,
  category: { id: 'c-2', name: 'Assurance', color: '#778899' },
  events: [
    {
      id: 'e2',
      title: 'Autre',
      type: 'single',
      startDate: '2026-07-04T10:00:00Z',
      endDate: '2026-07-04T10:00:00Z',
      productId: 'p-beta',
      archived: false,
    },
  ],
}

function mockData(overrides: Record<string, unknown> = {}) {
  useProductsMock.mockReturnValue({
    data: [PRODUCT, OTHER],
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockData()
})

afterEach(() => vi.clearAllMocks())

describe('ProductDetailView', () => {
  it('affiche la fiche du produit sélectionné', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('product-detail-card')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('product-detail-category')).toHaveTextContent('Véhicules')
  })

  it('passe à la sous-frise UNIQUEMENT les events non archivés de CE produit', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('timeline-responsive')).toBeInTheDocument()
    const call = timelineSpy.mock.calls.at(-1)?.[0] as {
      events: Array<{ id: string }>
      resources: Array<{ id: string }>
    }
    // 1 event non archivé du produit p-alpha, pas ceux de p-beta ni l'archivé.
    expect(call.events.map((e) => e.id)).toEqual(['e1'])
    expect(call.resources.map((r) => r.id)).toEqual(['p-alpha'])
  })

  it('liste l’historique des events non archivés (récent d’abord)', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('product-detail-history-row-e1')).toBeInTheDocument()
    expect(screen.queryByTestId('product-detail-history-row-e-arch')).not.toBeInTheDocument()
  })

  it('ouvre le ProductDrawer en édition', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-edit'))
    expect(screen.getByTestId('product-drawer')).toHaveAttribute('data-product', 'p-alpha')
  })

  it('supprime (soft delete) puis revient à la liste', async () => {
    const user = userEvent.setup()
    deleteProductMock.mockResolvedValue(undefined)
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-delete'))
    await user.click(screen.getByTestId('delete-dialog'))
    expect(deleteProductMock).toHaveBeenCalledWith('user-1', 'p-alpha')
    expect(pushMock).toHaveBeenCalledWith('/fr/products')
  })

  it('affiche « introuvable » si le produit est absent/archivé', () => {
    render(<ProductDetailView productId="does-not-exist" />)
    expect(screen.getByTestId('product-detail-not-found')).toBeInTheDocument()
  })

  it('revient à la liste via le bouton retour', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-back'))
    expect(pushMock).toHaveBeenCalledWith('/fr/products')
  })
})
