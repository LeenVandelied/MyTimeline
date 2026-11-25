import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchivedProduct } from '@/types/product'
import { ArchivedProductsView } from './ArchivedProductsView'

/**
 * #719 — Filtre des archivés : retour du focus au retrait, nom réel gardé et état vide propre
 * au filtre quand la restauration vide la catégorie.
 */
const useArchivedMock = vi.fn()

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/hooks/useArchivedProducts', () => ({
  useArchivedProducts: (...args: unknown[]) => useArchivedMock(...args),
}))
vi.mock('@/hooks/useRestoreProduct', () => ({
  useRestoreProduct: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const MAISON: ArchivedProduct = {
  id: 'p-2',
  name: 'Box',
  color: null,
  category: { id: 'c-2', name: 'Maison', color: null },
}
const VELO: ArchivedProduct = {
  id: 'p-1',
  name: 'Vélo',
  color: null,
  category: { id: 'c-1', name: 'Sport', color: null },
}

function queryState(data: ArchivedProduct[]) {
  return { data, isLoading: false, isError: false }
}

beforeEach(() => vi.clearAllMocks())

describe('ArchivedProductsView — filtre (#719)', () => {
  it('moves the focus to the view title once the filter is cleared', async () => {
    const user = userEvent.setup()
    useArchivedMock.mockReturnValue(queryState([VELO, MAISON]))
    function Harness() {
      const [categoryId, setCategoryId] = useState<string | undefined>('c-1')
      return (
        <ArchivedProductsView
          categoryId={categoryId}
          onClearCategoryFilter={() => setCategoryId(undefined)}
        />
      )
    }
    render(<Harness />)

    await user.click(screen.getByTestId('products-archived-filter-clear'))

    expect(screen.queryByTestId('products-archived-filter')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('keeps the real category name and a filter-specific empty state once the category is emptied', () => {
    // Le dernier archivé de « Sport » vient d'être restauré : la liste ne porte plus que « Maison ».
    useArchivedMock.mockReturnValue(queryState([MAISON]))
    render(
      <ArchivedProductsView
        categoryId="c-1"
        categoryName="Sport"
        onClearCategoryFilter={vi.fn()}
      />,
    )

    expect(screen.getByTestId('products-archived-filter')).toHaveTextContent('Sport')
    expect(screen.getByTestId('products-archived-empty')).toHaveTextContent(
      'products.archived.filter.empty',
    )
    expect(screen.getByTestId('products-archived-filter-clear')).toBeInTheDocument()
  })
})
