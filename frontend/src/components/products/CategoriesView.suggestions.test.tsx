import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoriesView } from './CategoriesView'
import frProducts from '../../../public/locales/fr/products.json'
import esProducts from '../../../public/locales/es/products.json'

/**
 * #638 (revue P3, P5) — complète les tests verrouillés de `CategoriesView`.
 *  - P3 : après un choix au clavier, le focus revient au bouton de création une fois la
 *    liste chargée, jamais sur `body` (#700).
 *  - P5 : les sept libellés espagnols se rendent avec les VRAIS messages `es`.
 */
afterEach(cleanup)

const useCategoriesMock = vi.fn()
const createMutate = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => ({ mutate: createMutate, mutateAsync: createMutate, isPending: false }),
}))
vi.mock('@/components/categories/CategoryDrawer', () => ({ CategoryDrawer: () => null }))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({ DeleteConfirmDialog: () => null }))

const SUGGESTION_IDS = [
  'vehicles',
  'insurance',
  'health',
  'food',
  'housing',
  'travel',
  'finance',
] as const

function Tree({ messages, locale }: { messages: typeof frProducts; locale: string }) {
  return (
    <NextIntlClientProvider locale={locale} messages={{ products: messages }}>
      <CategoriesView />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useCategoriesMock.mockReturnValue({ data: [], isLoading: false, isError: false })
  createMutate.mockResolvedValue({ id: 'new', name: 'créée', system: false })
})

describe('#638 — focus après le choix d une suggestion', () => {
  it('returns focus to the new category button once the list is loaded', async () => {
    const user = userEvent.setup()
    const view = render(<Tree messages={frProducts} locale="fr" />)
    const first = screen.getByTestId('categories-suggestion-vehicles')
    first.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))

    // La liste arrive : les suggestions et le CTA se démontent.
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'c1', name: 'Véhicules', system: false, color: null }],
      isLoading: false,
      isError: false,
    })
    view.rerender(<Tree messages={frProducts} locale="fr" />)

    expect(screen.queryByTestId('categories-suggestions')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('categories-new-button')).toHaveFocus())
    expect(document.body).not.toHaveFocus()
  })

  it('does not steal the focus when the user moved to another control', async () => {
    const user = userEvent.setup()
    const view = render(<Tree messages={frProducts} locale="fr" />)
    screen.getByTestId('categories-suggestion-vehicles').focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
    const other = document.createElement('input')
    document.body.appendChild(other)
    other.focus()
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'c1', name: 'Véhicules', system: false, color: null }],
      isLoading: false,
      isError: false,
    })
    view.rerender(<Tree messages={frProducts} locale="fr" />)
    expect(other).toHaveFocus()
    other.remove()
  })
})

describe('#638 — libellés espagnols, vrais messages', () => {
  it('renders the seven suggestion labels in Spanish', () => {
    const errors: string[] = []
    render(
      <NextIntlClientProvider
        locale="es"
        messages={{ products: esProducts }}
        onError={(error) => errors.push(error.message)}
      >
        <CategoriesView />
      </NextIntlClientProvider>,
    )
    const labels = esProducts.categories.suggestions as Record<string, string>
    for (const id of SUGGESTION_IDS) {
      expect(labels[id], `es: libellé de « ${id} » absent`).toBeTruthy()
      expect(labels[id], `es: « ${id} » recopie le français`).not.toBe(
        (frProducts.categories.suggestions as Record<string, string>)[id],
      )
      expect(screen.getByTestId(`categories-suggestion-${id}`)).toHaveTextContent(labels[id])
    }
    expect(errors).toEqual([])
  })

  it('persists the Spanish label at the moment of choice', async () => {
    render(<Tree messages={esProducts as unknown as typeof frProducts} locale="es" />)
    await userEvent.setup().click(screen.getByTestId('categories-suggestion-vehicles'))
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: esProducts.categories.suggestions.vehicles }),
    )
  })
})
