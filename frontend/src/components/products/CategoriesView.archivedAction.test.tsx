import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { CategoriesView } from './CategoriesView'

/**
 * #719 — Compteur d'archivés d'une carte : nom accessible (WCAG 2.5.3) et isolation du
 * clic de la carte (la carte entière ouvre l'édition, le compteur ne doit pas l'ouvrir).
 */
const useCategoriesMock = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
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
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/hooks/useAssignProductCategory', () => ({
  useAssignProductCategory: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: { count?: number }) =>
    values?.count === undefined
      ? `${namespace}.${key}`
      : `${namespace}.${key} count=${values.count}`,
}))
vi.mock('@/components/categories/CategoryDrawer', () => ({
  CategoryDrawer: ({ open, mode }: { open: boolean; mode?: string }) =>
    open ? <div data-testid={`category-drawer-${mode}`} /> : null,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({ DeleteConfirmDialog: () => null }))

const CATEGORIES: Category[] = [
  {
    id: 'c-1',
    name: 'Sport',
    system: false,
    color: null,
    productCount: 1,
    archivedProductCount: 2,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  useCategoriesMock.mockReturnValue({ data: CATEGORIES, isLoading: false, isError: false })
})

describe('CategoriesView — compteur d’archivés (#719)', () => {
  it('has an accessible name that contains its visible text', () => {
    render(<CategoriesView onShowArchived={vi.fn()} />)

    const counter = screen.getByTestId('categories-archived-count-c-1')
    const visible = counter.textContent ?? ''
    expect(visible).not.toBe('')
    expect(counter.getAttribute('aria-label')).toContain(visible)
  })

  it('does not open the card edition on click', async () => {
    const user = userEvent.setup()
    const onShowArchived = vi.fn()
    render(<CategoriesView onShowArchived={onShowArchived} />)

    await user.click(screen.getByTestId('categories-archived-count-c-1'))

    expect(onShowArchived).toHaveBeenCalledWith('c-1')
    expect(screen.queryByTestId('category-drawer-edit')).not.toBeInTheDocument()
  })

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('does not open the card edition on %s', async (_label, key) => {
    const user = userEvent.setup()
    const onShowArchived = vi.fn()
    render(<CategoriesView onShowArchived={onShowArchived} />)

    screen.getByTestId('categories-archived-count-c-1').focus()
    await user.keyboard(key)

    expect(onShowArchived).toHaveBeenCalledWith('c-1')
    expect(screen.queryByTestId('category-drawer-edit')).not.toBeInTheDocument()
  })
})
