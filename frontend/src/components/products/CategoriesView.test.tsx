import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { CategoriesView } from './CategoriesView'

/**
 * #68 — Tests CategoriesView : cards (compteur produits dérivé localement +
 * palette), ouverture CategoryDrawer create/edit (#62 embarqué), suppression via
 * DeleteConfirmDialog variant category avec linkedProductsCount + categoryId,
 * masquage des actions pour les catégories système (ADR-002).
 */

const useCategoriesMock = vi.fn()
const useProductsMock = vi.fn()
// #245 : la suppression passe désormais par le hook useDeleteCategory (useMutation
// + invalidation categories.all/products.all), plus par le service brut.
const deleteMutateAsync = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

vi.mock('@/components/categories/CategoryDrawer', () => ({
  CategoryDrawer: ({
    open,
    mode,
    category,
  }: {
    open: boolean
    mode?: string
    category?: Category
  }) =>
    open ? (
      <div data-testid={`category-drawer-${mode}`} data-category={category?.id ?? ''}>
        drawer
      </div>
    ) : null,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    variant,
    categoryId,
    linkedProductsCount,
    onConfirm,
  }: {
    open: boolean
    variant: string
    categoryId?: string
    linkedProductsCount?: number
    onConfirm: (id?: string) => void | Promise<void>
  }) =>
    open ? (
      <button
        type="button"
        data-testid={`delete-dialog-${variant}`}
        data-category-id={categoryId}
        data-linked={linkedProductsCount}
        onClick={() => onConfirm('reassign-target')}
      >
        confirm
      </button>
    ) : null,
}))

const CATEGORIES: Category[] = [
  { id: 'c-1', name: 'Véhicules', system: false, color: '#445566' },
  { id: 'c-2', name: 'Assurance', system: false, color: null },
  { id: 'c-sys', name: 'Système', system: true, color: '#778899' },
]

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'A',
    color: null,
    category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
    events: [],
  },
  {
    id: 'p2',
    name: 'B',
    color: null,
    category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
    events: [],
  },
]

function mockAll(catOverrides: Record<string, unknown> = {}) {
  useCategoriesMock.mockReturnValue({
    data: CATEGORIES,
    isLoading: false,
    isError: false,
    ...catOverrides,
  })
  useProductsMock.mockReturnValue({ data: PRODUCTS, isLoading: false, isError: false })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAll()
})

afterEach(() => vi.clearAllMocks())

describe('CategoriesView', () => {
  it('affiche une card par catégorie avec compteur de produits liés', () => {
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-card-c-1')).toBeInTheDocument()
    // c-1 référencée par 2 produits ; le message compteur est traduit (clé mockée).
    expect(screen.getByTestId('categories-count-c-1')).toBeInTheDocument()
    expect(screen.getByTestId('categories-count-c-2')).toBeInTheDocument()
  })

  it('marque les catégories système et masque leur suppression (ADR-002)', () => {
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-system-c-sys')).toBeInTheDocument()
    expect(screen.queryByTestId('categories-delete-c-sys')).not.toBeInTheDocument()
    // Catégories non système : bouton supprimer présent.
    expect(screen.getByTestId('categories-delete-c-1')).toBeInTheDocument()
  })

  it('ouvre le CategoryDrawer en création via « Nouvelle catégorie »', async () => {
    const user = userEvent.setup()
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-new-button'))
    expect(screen.getByTestId('category-drawer-create')).toBeInTheDocument()
  })

  it('ouvre le CategoryDrawer en édition au clic sur une card', async () => {
    const user = userEvent.setup()
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-card-c-1'))
    expect(screen.getByTestId('category-drawer-edit')).toHaveAttribute('data-category', 'c-1')
  })

  it('supprime une catégorie via la mutation en passant categoryId + linkedProductsCount', async () => {
    const user = userEvent.setup()
    deleteMutateAsync.mockResolvedValue(undefined)
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-delete-c-1'))
    const dialog = screen.getByTestId('delete-dialog-category')
    // Réassignation forcée en amont : count=2 pour c-1, categoryId exclu du select.
    expect(dialog).toHaveAttribute('data-category-id', 'c-1')
    expect(dialog).toHaveAttribute('data-linked', '2')
    await user.click(dialog)
    // #245 : passe par la mutation (qui invalide categories.all + products.all).
    expect(deleteMutateAsync).toHaveBeenCalledWith({
      id: 'c-1',
      reassignToCategoryId: 'reassign-target',
    })
  })

  it('affiche l’état vide', () => {
    mockAll({ data: [] })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-empty')).toBeInTheDocument()
  })

  it('affiche l’état d’erreur', () => {
    mockAll({ data: undefined, isError: true })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-error')).toBeInTheDocument()
  })
})
