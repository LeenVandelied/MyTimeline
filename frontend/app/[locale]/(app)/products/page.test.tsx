import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import type { ArchivedProduct } from '@/types/product'
import ProductsPage from './page'

/**
 * #719 — Page `/products` : le compteur d'archivés d'une catégorie ouvre l'onglet Archivés
 * filtré sur elle. Les vraies vues `CategoriesView` et `ArchivedProductsView` sont montées
 * (le filtre vit dans la page, les vues sont remontées à chaque changement d'onglet) ; seuls
 * les hooks de données, l'auth et la liste produits sont mockés.
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
    color: '#112233',
    productCount: 1,
    archivedProductCount: 3,
  },
  {
    id: 'c-2',
    name: 'Maison',
    system: false,
    color: null,
    productCount: 0,
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

// Trois archivés dans « Sport » (comme le compteur de la carte), un dans « Maison ».
const ARCHIVED: ArchivedProduct[] = [
  archived('p-1', 'c-1', 'Sport'),
  archived('p-2', 'c-1', 'Sport'),
  archived('p-3', 'c-1', 'Sport'),
  archived('p-4', 'c-2', 'Maison'),
]

beforeEach(() => {
  vi.clearAllMocks()
  useCategoriesMock.mockReturnValue({ data: CATEGORIES, isLoading: false, isError: false })
  useArchivedMock.mockReturnValue({ data: ARCHIVED, isLoading: false, isError: false })
})

async function openCategoriesTab() {
  const user = userEvent.setup()
  render(<ProductsPage />)
  await user.click(screen.getByRole('tab', { name: 'products.categories.title' }))
  return user
}

describe('ProductsPage — archivés d’une catégorie (#719)', () => {
  it('opens the archived tab filtered on the category when its archived count is clicked', async () => {
    const user = await openCategoriesTab()

    await user.click(screen.getByTestId('categories-archived-count-c-1'))

    expect(screen.getByRole('tab', { name: 'products.archived.title' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('products-archived-view')).toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-1')).toBeInTheDocument()
    expect(screen.queryByTestId('products-archived-row-p-4')).not.toBeInTheDocument()
  })

  it('shows as many filtered rows as the archived count of the category card', async () => {
    const user = await openCategoriesTab()
    const announced = CATEGORIES[0].archivedProductCount
    expect(screen.getByTestId('categories-archived-count-c-1')).toHaveTextContent(
      `count=${announced}`,
    )

    await user.click(screen.getByTestId('categories-archived-count-c-1'))

    const table = screen.getByTestId('products-archived-table')
    expect(within(table).getAllByTestId(/^products-archived-row-p-/)).toHaveLength(announced ?? -1)
  })
})
