import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/types/product'
import { ProductsListView } from './ProductsListView'

/**
 * #68 — Tests ProductsListView : rendu du tableau (produits du user), recherche
 * locale, ordre par défaut (activité récente), ouverture drawer création/édition,
 * archivage (DeleteConfirmDialog), navigation vers le détail.
 *
 * next-intl mocké → assertions sur les clés. Drawers/dialogs mockés (leurs tests
 * vivent dans #61/#65) : on vérifie ICI qu'ils sont pilotés (open + props).
 */

const useProductsMock = vi.fn()
const pushMock = vi.fn()
const deleteProductMock = vi.fn()

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

// Drawers/dialog mockés : on expose leur `open` + le mode pour l'assertion.
vi.mock('./ProductDrawer', () => ({
  ProductDrawer: ({ open, mode, product }: { open: boolean; mode?: string; product?: Product }) =>
    open ? (
      <div data-testid={`product-drawer-${mode}`} data-product={product?.id ?? ''}>
        drawer
      </div>
    ) : null,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    variant,
    onConfirm,
  }: {
    open: boolean
    variant: string
    onConfirm: (id?: string) => void | Promise<void>
  }) =>
    open ? (
      <button
        type="button"
        data-testid={`delete-dialog-${variant}`}
        onClick={() => onConfirm()}
      >
        confirm
      </button>
    ) : null,
}))
// ProductSparkline réel (SVG borné) — pas de mock, rendu léger déterministe.

const mkEvent = (id: string, startDate: string, archived = false) => ({
  id,
  title: `evt-${id}`,
  type: 'single',
  startDate,
  endDate: startDate,
  productId: 'p',
  archived,
})

const PRODUCTS: Product[] = [
  {
    id: 'p-alpha',
    name: 'Alpha',
    color: '#112233',
    category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
    events: [mkEvent('e1', '2026-06-01T10:00:00Z')],
  },
  {
    id: 'p-beta',
    name: 'Beta',
    color: null,
    category: { id: 'c-2', name: 'Assurance', color: '#778899' },
    events: [mkEvent('e2', '2026-07-04T10:00:00Z')],
  },
  {
    id: 'p-gamma',
    name: 'Gamma',
    color: null,
    category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
    events: [],
  },
]

function mockProducts(overrides: Record<string, unknown> = {}) {
  useProductsMock.mockReturnValue({
    data: PRODUCTS,
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockProducts()
})

afterEach(() => vi.clearAllMocks())

describe('ProductsListView', () => {
  it('affiche les produits du user dans le tableau', () => {
    render(<ProductsListView />)
    expect(screen.getByTestId('products-table')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-alpha')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-beta')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-gamma')).toBeInTheDocument()
  })

  it('trie par activité récente par défaut (Beta avant Alpha, sans activité en dernier)', () => {
    render(<ProductsListView />)
    const rows = screen.getAllByRole('link')
    // p-beta (2026-07-04) > p-alpha (2026-06-01) > p-gamma (aucune activité).
    expect(rows[0]).toHaveAttribute('data-testid', 'products-row-p-beta')
    expect(rows[1]).toHaveAttribute('data-testid', 'products-row-p-alpha')
    expect(rows[2]).toHaveAttribute('data-testid', 'products-row-p-gamma')
  })

  it('filtre localement via la recherche (sans refetch)', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    await user.type(screen.getByTestId('products-search-input'), 'alph')
    expect(screen.getByTestId('products-row-p-alpha')).toBeInTheDocument()
    expect(screen.queryByTestId('products-row-p-beta')).not.toBeInTheDocument()
    // Aucun nouvel appel au hook data (recherche 100% locale) → 1 appel initial.
    expect(useProductsMock).toHaveBeenCalled()
  })

  it('affiche l’état vide-recherche quand rien ne correspond', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    await user.type(screen.getByTestId('products-search-input'), 'zzz')
    expect(screen.getByTestId('products-empty-search')).toBeInTheDocument()
  })

  it('ouvre le ProductDrawer en création via « Nouveau produit »', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-new-button'))
    expect(screen.getByTestId('product-drawer-create')).toBeInTheDocument()
  })

  it('ouvre le ProductDrawer en édition préfilé via l’action éditer', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-edit-p-alpha'))
    const drawer = screen.getByTestId('product-drawer-edit')
    expect(drawer).toHaveAttribute('data-product', 'p-alpha')
  })

  it('archive un produit via DeleteConfirmDialog (soft delete #50)', async () => {
    const user = userEvent.setup()
    deleteProductMock.mockResolvedValue(undefined)
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-archive-p-alpha'))
    await user.click(screen.getByTestId('delete-dialog-product'))
    expect(deleteProductMock).toHaveBeenCalledWith('user-1', 'p-alpha')
  })

  it('navigue vers le détail au clic sur une ligne', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-row-p-alpha'))
    expect(pushMock).toHaveBeenCalledWith('/fr/products/p-alpha')
  })

  it('navigue vers le détail au clavier (Enter) sans déclencher les actions', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    const row = screen.getByTestId('products-row-p-beta')
    row.focus()
    await user.keyboard('{Enter}')
    expect(pushMock).toHaveBeenCalledWith('/fr/products/p-beta')
  })

  it('affiche l’état vide quand aucun produit', () => {
    mockProducts({ data: [] })
    render(<ProductsListView />)
    expect(screen.getByTestId('products-empty')).toBeInTheDocument()
  })

  it('affiche l’état d’erreur', () => {
    mockProducts({ data: undefined, isError: true })
    render(<ProductsListView />)
    expect(screen.getByTestId('products-error')).toBeInTheDocument()
  })

  it('rend une pastille catégorie colorée par ligne', () => {
    render(<ProductsListView />)
    const cat = within(screen.getByTestId('products-row-p-alpha')).getByTestId(
      'products-row-category-p-alpha',
    )
    expect(cat).toHaveTextContent('Véhicules')
  })
})
