import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paletteHex } from '@/lib/event-palette'
import { CategoriesView } from './CategoriesView'
import frProducts from '../../../public/locales/fr/products.json'
import enProducts from '../../../public/locales/en/products.json'
import deProducts from '../../../public/locales/de/products.json'

/**
 * #638 — libellés des catégories proposées, rendus avec le VRAI `NextIntlClientProvider`
 * et les VRAIS messages `products` : le mock `ns.key` de `CategoriesView.test.tsx` rend
 * les clés, il ne prouve ni la langue ni le libellé persisté.
 *
 * Contrat de clés posé ici : `products.categories.suggestions.<id>`, avec les ids
 * vehicles, insurance, health, food, housing, travel, finance (bouton
 * `categories-suggestion-<id>`). Les libellés en/de/es sont à relire par une personne
 * avant la fusion : ce fichier les lit dans les messages, il ne les recopie pas.
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
// #604 — la vue lit la liste produits et affecte par mutation : hors sujet ici.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/hooks/useAssignProductCategory', () => ({
  useAssignProductCategory: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/components/categories/CategoryDrawer', () => ({ CategoryDrawer: () => null }))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({ DeleteConfirmDialog: () => null }))

const MESSAGES = { fr: frProducts, en: enProducts, de: deProducts } as const
type Locale = keyof typeof MESSAGES

const SUGGESTION_IDS = [
  'vehicles',
  'insurance',
  'health',
  'food',
  'housing',
  'travel',
  'finance',
] as const

// Le JSON typé ne porte pas encore ces clés : lecture large, l'absence se voit à l'assertion.
function labelsOf(locale: Locale): Record<string, string | undefined> {
  const categories = MESSAGES[locale].categories as { suggestions?: Record<string, string> }
  return categories.suggestions ?? {}
}

function renderView(locale: Locale) {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ products: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <CategoriesView />
    </NextIntlClientProvider>,
  )
  return errors
}

beforeEach(() => {
  vi.clearAllMocks()
  useCategoriesMock.mockReturnValue({ data: [], isLoading: false, isError: false })
  createMutate.mockResolvedValue({ id: 'new', name: 'créée', system: false })
})

describe('#638 — catégories proposées, vrais messages', () => {
  it('suggestion labels follow the current locale', () => {
    for (const locale of ['de', 'en'] as const) {
      const labels = labelsOf(locale)
      const french = labelsOf('fr')
      for (const id of SUGGESTION_IDS) {
        expect(labels[id], `${locale}: libellé de « ${id} » absent des messages`).toBeTruthy()
        expect(labels[id], `${locale}: « ${id} » recopie le français`).not.toBe(french[id])
      }
      const errors = renderView(locale)
      for (const id of SUGGESTION_IDS) {
        expect(screen.getByTestId(`categories-suggestion-${id}`)).toHaveTextContent(labels[id]!)
      }
      expect(errors).toEqual([])
      cleanup()
    }
  })

  it('persists the label of the language at the moment of choice', async () => {
    const user = userEvent.setup()
    const german = labelsOf('de').vehicles
    expect(german, 'de: libellé de « vehicles » absent des messages').toBeTruthy()
    expect(german).not.toBe(labelsOf('fr').vehicles)
    renderView('de')
    const vehicles = screen.queryByTestId('categories-suggestion-vehicles')
    expect(vehicles).not.toBeNull()
    await user.click(vehicles!)
    expect(createMutate).toHaveBeenCalledTimes(1)
    // Le libellé résolu est persisté, jamais la clé.
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: german }))
    expect(createMutate.mock.calls[0][0].color).toBe(paletteHex('sky'))
  })
})
