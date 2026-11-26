import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import type { ArchivedProduct } from '@/types/product'
import ProductsPage from './page'

/**
 * #719 — Page `/products` : retrait du filtre au clic d'onglet, retour du focus, nom gardé.
 * Même montage que `page.test.tsx` (vraies vues, hooks de données mockés).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: { count?: number }) => {
    const full = namespace ? `${namespace}.${key}` : key
    return values?.count === undefined ? full : `${full} count=${values.count}`
  },
  useLocale: () => 'fr',
}))
vi.mock('@/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ user: { id: 'user-1' }, loading: false }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/components/ui/footer-app', () => ({ AppFooter: () => null }))
vi.mock('@/components/products/ProductsListView', () => ({
  ProductsListView: () => <div data-testid="products-list-stub" />,
}))
vi.mock('@/components/categories/CategoryDrawer', () => ({ CategoryDrawer: () => null }))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({ DeleteConfirmDialog: () => null }))

const useCategoriesMock = vi.fn()
const useArchivedMock = vi.fn()
vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useArchivedProducts', () => ({
  useArchivedProducts: (...args: unknown[]) => useArchivedMock(...args),
}))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/hooks/useAssignProductCategory', () => ({
  useAssignProductCategory: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/hooks/useRestoreProduct', () => ({
  useRestoreProduct: () => ({ mutateAsync: vi.fn() }),
}))

const CATEGORIES: Category[] = [
  {
    id: 'c-1',
    name: 'Sport',
    system: false,
    color: null,
    productCount: 1,
    archivedProductCount: 1,
  },
]

function archived(id: string, categoryId: string, categoryName: string): ArchivedProduct {
  return {
    id,
    name: `Produit ${id}`,
    color: null,
    category: { id: categoryId, name: categoryName, color: null },
  }
}

const ARCHIVED: ArchivedProduct[] = [
  archived('p-1', 'c-1', 'Sport'),
  archived('p-4', 'c-2', 'Maison'),
]

beforeEach(() => {
  vi.clearAllMocks()
  useCategoriesMock.mockReturnValue({ data: CATEGORIES, isLoading: false, isError: false })
  useArchivedMock.mockReturnValue({ data: ARCHIVED, isLoading: false, isError: false })
})

async function openFilteredArchived() {
  const user = userEvent.setup()
  render(<ProductsPage />)
  await user.click(screen.getByRole('tab', { name: 'products.categories.title' }))
  await user.click(screen.getByTestId('categories-archived-count-c-1'))
  return user
}

describe('ProductsPage — filtre des archivés (#719)', () => {
  it('moves the focus to the archived tab when the archived count is activated', async () => {
    await openFilteredArchived()

    expect(screen.getByRole('tab', { name: 'products.archived.title' })).toHaveFocus()
  })

  it('clears the filter on a click on another tab then back on the archived tab', async () => {
    const user = await openFilteredArchived()
    expect(screen.queryByTestId('products-archived-row-p-4')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'products.list.title' }))
    await user.click(screen.getByRole('tab', { name: 'products.archived.title' }))

    expect(screen.queryByTestId('products-archived-filter')).not.toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-4')).toBeInTheDocument()
  })

  it('clears the filter on a click on the archived tab already active', async () => {
    const user = await openFilteredArchived()

    await user.click(screen.getByRole('tab', { name: 'products.archived.title' }))

    expect(screen.queryByTestId('products-archived-filter')).not.toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-4')).toBeInTheDocument()
  })

  it('keeps the category name and the filter empty state after its last archived is restored', async () => {
    useArchivedMock.mockReturnValue({
      data: [archived('p-4', 'c-2', 'Maison')],
      isLoading: false,
      isError: false,
    })
    await openFilteredArchived()

    expect(screen.getByTestId('products-archived-filter')).toHaveTextContent('Sport')
    expect(screen.getByTestId('products-archived-empty')).toHaveTextContent(
      'products.archived.filter.empty',
    )
  })

  it('moves the focus to the view title when the filter is cleared with its cross', async () => {
    const user = await openFilteredArchived()

    await user.click(screen.getByTestId('products-archived-filter-clear'))

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
})
