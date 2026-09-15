import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { ProductDrawer } from './ProductDrawer'

/**
 * #61 — Tests ProductDrawer : création (combobox peuplée depuis fetch, aucun UUID
 * hardcodé), édition (pré-remplissage + PATCH partiel), états submitting/error,
 * fallback combobox vide (#52 non déployé).
 *
 * next-intl mocké → assertions sur les clés (`namespace.key`), locale-agnostique.
 */

const useCategoriesMock = vi.fn()
const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const createState = { mutateAsync: createMutateAsync, isPending: false }
const updateState = { mutateAsync: updateMutateAsync, isPending: false }

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useCreateProduct', () => ({
  useCreateProduct: () => createState,
}))
vi.mock('@/hooks/useUpdateProduct', () => ({
  useUpdateProduct: () => updateState,
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
// #605 — archivage (soft delete #50) : mutation mockée, on assert l'appel et la suite.
// PIT-S92-004 — retrait du cache + invalidation couverts par `useArchiveProduct.test.tsx`.
const archiveMutateAsync = vi.hoisted(() => vi.fn())
const useArchiveProductSpy = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useArchiveProduct', () => ({
  useArchiveProduct: (...args: unknown[]) => {
    useArchiveProductSpy(...args)
    return { mutateAsync: archiveMutateAsync, isPending: false }
  },
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))
// #621 — confirmation de création par toast (appel asserté, rendu couvert par `ui/toaster`).
const toastSuccessMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
  toast: { success: toastSuccessMock, error: vi.fn() },
}))

/**
 * #158 — `react-colorful` (HexColorPicker) est piloté au pointeur/canvas, non
 * testable de façon déterministe en jsdom. On mocke `PopoverPicker` par un bouton
 * qui appelle `onChange('#ff8800')` : on isole ainsi la LOGIQUE de branchement
 * couleur du drawer (payload `color` en création, `color`/`clearColor` en PATCH).
 */
const PICKED_COLOR = '#ff8800'
// #577 — le mock REND aussi son déclencheur (`children` = bouton « Personnalisé » de
// `PaletteColorPicker`), pour pouvoir asserter l'état « Personnalisé actif ».
vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({
    onChange,
    children,
  }: {
    onChange: (c: string) => void
    children?: React.ReactNode
  }) => (
    <>
      {children}
      <button type="button" data-testid="pick-color" onClick={() => onChange(PICKED_COLOR)}>
        pick
      </button>
    </>
  ),
}))

const CAT_A = '018f3a2b-0000-7000-8000-0000000000a1'
const CAT_B = '018f3a2b-0000-7000-8000-0000000000b2'
const CATEGORIES: Category[] = [
  { id: CAT_A, name: 'Véhicules', system: false, color: '#112233' },
  { id: CAT_B, name: 'Assurance', system: true, color: null },
]

function mockCategories(overrides: Record<string, unknown> = {}) {
  useCategoriesMock.mockReturnValue({
    data: CATEGORIES,
    isPending: false,
    isSuccess: true,
    isError: false,
    ...overrides,
  })
}

const noop = () => {}

/**
 * Radix Select rend à la fois un `<select>` natif caché (options) ET une liste
 * ARIA. Pour éviter l'ambiguïté « multiple elements », on ouvre le trigger puis
 * on clique l'`option` du listbox (role ARIA).
 */
async function selectCategory(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByLabelText('products.drawer.fields.category'))
  const option = await screen.findByRole('option', { name })
  await user.click(option)
}

describe('ProductDrawer', () => {
  beforeEach(() => {
    mockCategories()
    createState.isPending = false
    updateState.isPending = false
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('mode création : peuple la combobox depuis useCategories (aucun UUID en dur)', async () => {
    const user = userEvent.setup()
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    await user.click(screen.getByLabelText('products.drawer.fields.category'))

    expect(await screen.findByRole('option', { name: 'Véhicules' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Assurance' })).toBeInTheDocument()
    // Aucun libellé de catégorie hardcodée de l'ancien AddProducts.
    expect(screen.queryByText('products.add.categories.vehicles')).not.toBeInTheDocument()
  })

  it('mode création : POST via createProduct avec nom + catégorie', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<ProductDrawer open onOpenChange={noop} mode="create" onSuccess={onSuccess} />)

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Ma voiture',
    )
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByText('products.drawer.actions.create'))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({ name: 'Ma voiture', category: CAT_A }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('#621 — création réussie : toast de confirmation', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Ma moto',
    )
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByText('products.drawer.actions.create'))

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productCreated'),
    )
  })

  it('#621 — création en échec (409) : aucun toast de succès', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockRejectedValue({ response: { status: 409 } })
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Doublon',
    )
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByText('products.drawer.actions.create'))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('#621 — édition : pas de toast de création (hors périmètre)', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    const product: Product = {
      id: 'p2',
      name: 'Avant',
      color: null,
      category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
      events: [],
    }
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={product} />)

    const nameInput = screen.getByPlaceholderText('products.drawer.fields.namePlaceholder')
    await user.clear(nameInput)
    await user.type(nameInput, 'Après')
    await user.click(screen.getByText('products.drawer.actions.save'))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled())
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('#605 — édition : « Archiver » (jamais « Supprimer »), confirmation archiver, toast', async () => {
    const user = userEvent.setup()
    archiveMutateAsync.mockResolvedValue(undefined)
    const onDeleted = vi.fn()
    const product: Product = {
      id: 'p3',
      name: 'À archiver',
      color: null,
      category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
      events: [],
    }
    render(
      <ProductDrawer
        open
        onOpenChange={noop}
        mode="edit"
        product={product}
        onDeleted={onDeleted}
      />,
    )

    const archive = screen.getByTestId('product-drawer-archive')
    expect(archive).toHaveTextContent(/^products\.drawer\.actions\.archive$/)
    await user.click(archive)
    const confirm = await screen.findByTestId('delete-confirm-button')
    expect(confirm).toHaveTextContent(/^common\.deleteDialog\.product\.confirm$/)
    await user.click(confirm)

    await waitFor(() => expect(archiveMutateAsync).toHaveBeenCalledWith({ productId: 'p3' }))
    expect(useArchiveProductSpy).toHaveBeenCalledWith('user-1')
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productArchived'),
    )
    expect(onDeleted).toHaveBeenCalled()
  })

  it('rejette un nom vide (Zod min(1), pas de POST)', async () => {
    const user = userEvent.setup()
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    // Sélectionne une catégorie mais laisse le nom vide.
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByText('products.drawer.actions.create'))

    await waitFor(() => expect(createMutateAsync).not.toHaveBeenCalled())
  })

  it('mode édition : pré-remplit le nom et PATCH le diff', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    const product: Product = {
      id: 'p1',
      name: 'Ancien nom',
      color: null,
      category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
      events: [],
    }
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={product} />)

    const nameInput = screen.getByPlaceholderText(
      'products.drawer.fields.namePlaceholder',
    ) as HTMLInputElement
    expect(nameInput.value).toBe('Ancien nom')

    await user.clear(nameInput)
    await user.type(nameInput, 'Nouveau nom')
    await user.click(screen.getByText('products.drawer.actions.save'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        productId: 'p1',
        data: { name: 'Nouveau nom' },
      }),
    )
  })

  it('mode création : surcharge couleur persistée -> `color` dans le payload (#158)', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Ma voiture',
    )
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByTestId('pick-color'))
    await user.click(screen.getByText('products.drawer.actions.create'))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: 'Ma voiture',
        category: CAT_A,
        color: PICKED_COLOR,
      }),
    )
  })

  it('mode édition : poser une surcharge couleur -> `color` dans le PATCH (#158)', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    const product: Product = {
      id: 'p1',
      name: 'Ancien nom',
      color: null,
      category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
      events: [],
    }
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={product} />)

    await user.click(screen.getByTestId('pick-color'))
    await user.click(screen.getByText('products.drawer.actions.save'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        productId: 'p1',
        data: { color: PICKED_COLOR },
      }),
    )
  })

  it('mode édition : reset de la surcharge persistée -> `clearColor` dans le PATCH (#158)', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    const product: Product = {
      id: 'p1',
      name: 'Ancien nom',
      color: '#abcdef', // surcharge déjà persistée
      category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
      events: [],
    }
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={product} />)

    // Le bouton reset n'apparaît que si une surcharge est active (colorOverride non-null).
    await user.click(screen.getByText('products.drawer.fields.resetColor'))
    await user.click(screen.getByText('products.drawer.actions.save'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        productId: 'p1',
        data: { clearColor: true },
      }),
    )
  })

  it("affiche un message d'erreur inline sur conflit 409", async () => {
    const user = userEvent.setup()
    createMutateAsync.mockRejectedValue({ response: { status: 409 } })
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Produit',
    )
    await selectCategory(user, 'Véhicules')
    await user.click(screen.getByText('products.drawer.actions.create'))

    expect(await screen.findByRole('alert')).toHaveTextContent('products.drawer.errors.conflict')
  })

  it('état submitting : bouton désactivé + spinner', () => {
    createState.isPending = true
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    const submit = screen.getByText('products.drawer.actions.create').closest('button')
    expect(submit).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('fallback combobox vide : message + submit désactivé (#52 non déployé)', () => {
    mockCategories({ data: [], isSuccess: true })
    render(<ProductDrawer open onOpenChange={noop} mode="create" />)

    expect(screen.getByText('products.drawer.fields.noCategory')).toBeInTheDocument()
    const submit = screen.getByText('products.drawer.actions.create').closest('button')
    expect(submit).toBeDisabled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #577 — Surcharge couleur produit : palette curatée + « Personnalisé ».
// `value` du sélecteur = la SURCHARGE seule (héritage ≠ surcharge identique).
// ─────────────────────────────────────────────────────────────────────────────
describe('ProductDrawer — #577 palette de la surcharge couleur', () => {
  beforeEach(() => {
    mockCategories()
    updateMutateAsync.mockReset()
    createMutateAsync.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  const baseProduct: Product = {
    id: 'p1',
    name: 'Ancien nom',
    color: null,
    category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
    events: [],
  }

  it('produit qui HÉRITE : aucune pastille cochée, « Personnalisé » inactif', () => {
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={baseProduct} />)
    expect(screen.getAllByRole('radio')).toHaveLength(12)
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(screen.getByTestId('product-color-custom')).toHaveAttribute('aria-pressed', 'false')
  })

  it('choisir une pastille pose la surcharge (PATCH `color`)', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    render(<ProductDrawer open onOpenChange={noop} mode="edit" product={baseProduct} />)

    await user.click(screen.getByTestId('product-swatch-#DD5C97'))
    await user.click(screen.getByText('products.drawer.actions.save'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        productId: 'p1',
        data: { color: '#DD5C97' },
      }),
    )
  })

  it('review S90 — onCloseAutoFocus est relayé au Dialog Radix (appelé à la fermeture)', async () => {
    const onCloseAutoFocus = vi.fn()
    const { rerender } = render(
      <ProductDrawer open onOpenChange={noop} mode="create" onCloseAutoFocus={onCloseAutoFocus} />,
    )
    expect(onCloseAutoFocus).not.toHaveBeenCalled()
    rerender(
      <ProductDrawer
        open={false}
        onOpenChange={noop}
        mode="create"
        onCloseAutoFocus={onCloseAutoFocus}
      />,
    )
    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1))
  })

  it('DEC-S84-001 — surcharge hors palette : « Personnalisé » actif, rien renvoyé si rien ne change', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ProductDrawer
        open
        onOpenChange={onOpenChange}
        mode="edit"
        product={{ ...baseProduct, color: '#abcdef' }}
      />,
    )
    expect(screen.getByTestId('product-color-custom')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)

    // Diff partiel (BR-PRO-009) : couleur intacte → aucun PATCH, le drawer se ferme.
    await user.click(screen.getByText('products.drawer.actions.save'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(updateMutateAsync).not.toHaveBeenCalled()
  })
})
