import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paletteHex } from '@/lib/event-palette'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { CategoriesView } from './CategoriesView'

/**
 * #68 — Tests CategoriesView : cards (compteurs produits + palette), ouverture
 * CategoryDrawer create/edit (#62 embarqué), suppression via DeleteConfirmDialog
 * variant category avec linkedProductsCount + categoryId, masquage des actions pour
 * les catégories système (ADR-002).
 *
 * #695 — les compteurs viennent du BACKEND (`productCount` / `archivedProductCount` de
 * `CategoryResponse`), plus de `useProductsWithEvents` : ce hook n'est donc plus mocké
 * ici, et son absence du composant est elle-même vérifiée (une catégorie ne portant que
 * des archivés ne peut plus afficher « aucun produit »).
 */

const useCategoriesMock = vi.fn()
// #245 : la suppression passe désormais par le hook useDeleteCategory (useMutation
// + invalidation categories.all/products.all), plus par le service brut.
const deleteMutateAsync = vi.fn()
// #638 — un clic sur une suggestion crée par le hook de création existant : `mutate` et
// `mutateAsync` partagent le même espion, le test ne dépend pas de la variante choisie.
const createMutate = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))
vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => ({ mutate: createMutate, mutateAsync: createMutate, isPending: false }),
}))
// #604 — le compteur est rendu avec `count` : sans lui, deux compteurs différents donneraient
// le même texte et les tests de déplacement ne pourraient rien lire.
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: { count?: number }) =>
    values?.count === undefined
      ? `${namespace}.${key}`
      : `${namespace}.${key} count=${values.count}`,
}))

// #604 — les puces lisent la liste des produits actifs de l'utilisateur connecté.
const useProductsMock = vi.fn()
const assignHookMock = vi.fn()
const updateProductMock = vi.fn()
const getCategoriesMock = vi.fn()
const getProductsMock = vi.fn()

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/hooks/useAssignProductCategory', () => ({
  useAssignProductCategory: (...args: unknown[]) => assignHookMock(...args),
}))
vi.mock('@/services/productService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/productService')>()),
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
  getProducts: (...args: unknown[]) => getProductsMock(...args),
}))
vi.mock('@/services/categoryService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/categoryService')>()),
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

// Review S90 — « close » rejoue la fermeture Radix : `onOpenChange(false)` puis
// `onCloseAutoFocus(event annulable)`. #700 — non annulé, Radix ne rend le focus à RIEN
// (pas de `Dialog.Trigger`) : cf. l'en-tête du mock de `ProductsListView.test.tsx`.
const drawerClose = vi.hoisted(() => ({ lastPrevented: null as boolean | null }))

vi.mock('@/components/categories/CategoryDrawer', async () => {
  const React = await import('react')
  return {
    CategoryDrawer: ({
      open,
      mode,
      category,
      onOpenChange,
      onCloseAutoFocus,
    }: {
      open: boolean
      mode?: string
      category?: Category
      onOpenChange: (open: boolean) => void
      onCloseAutoFocus?: (event: Event) => void
    }) => {
      return open ? (
        <div data-testid={`category-drawer-${mode}`} data-category={category?.id ?? ''}>
          drawer
          <button
            type="button"
            data-testid={`category-drawer-${mode}-close`}
            onClick={() => {
              onOpenChange(false)
              const event = new Event('focusScope.autoFocusOnUnmount', { cancelable: true })
              onCloseAutoFocus?.(event)
              drawerClose.lastPrevented = event.defaultPrevented
              // #700 — fidèle à Radix Dialog 1.1.6 (`DialogContentModal`) : non annulé,
              // Radix appelle `triggerRef.current?.focus()` — ref NULLE sans
              // `Dialog.Trigger` — donc ne rend le focus à RIEN. Le bouton qui détenait le
              // focus se démonte : il tombe sur `body`.
            }}
          >
            close
          </button>
        </div>
      ) : null
    },
  }
})
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

/**
 * #695 — trois cas de compteurs, tels que `GET /api/categories` les sert :
 *   - `c-1` : 2 actifs + 1 archivé (badge + mention) ;
 *   - `c-2` : 0 actif, 1 archivé — LE cas de l'issue (badge masqué, mention seule) ;
 *   - `c-sys` : 0 / 0 (badge « aucun produit », pas de mention).
 */
const CATEGORIES: Category[] = [
  {
    id: 'c-1',
    name: 'Véhicules',
    system: false,
    color: '#445566',
    productCount: 2,
    archivedProductCount: 1,
  },
  {
    id: 'c-2',
    name: 'Assurance',
    system: false,
    color: null,
    productCount: 0,
    archivedProductCount: 1,
  },
  {
    id: 'c-sys',
    name: 'Système',
    system: true,
    color: '#778899',
    productCount: 0,
    archivedProductCount: 0,
  },
]

function mockAll(catOverrides: Record<string, unknown> = {}) {
  useCategoriesMock.mockReturnValue({
    data: CATEGORIES,
    isLoading: false,
    isError: false,
    ...catOverrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  drawerClose.lastPrevented = null
  mockAll()
  useProductsMock.mockReturnValue({ data: [], isLoading: false, isError: false })
  assignHookMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
})

afterEach(() => vi.clearAllMocks())

describe('CategoriesView', () => {
  it('affiche une card par catégorie avec compteur de produits liés', () => {
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-card-c-1')).toBeInTheDocument()
    // c-1 : 2 actifs -> badge présent (le message est traduit, clé mockée).
    expect(screen.getByTestId('categories-count-c-1')).toBeInTheDocument()
    // c-sys : 0 actif ET 0 archivé -> le badge « aucun produit » reste, il est vrai.
    expect(screen.getByTestId('categories-count-c-sys')).toBeInTheDocument()
  })

  /**
   * #695 — LE bug : une catégorie ne portant que des produits ARCHIVÉS affichait
   * « aucun produit » puis refusait sa suppression. Le badge des actifs (qui dirait
   * « aucun produit ») est masqué, seule la mention des archivés reste.
   */
  it('#695 — 0 actif + N archivés : badge des actifs masqué, mention des archivés', () => {
    render(<CategoriesView />)
    expect(screen.queryByTestId('categories-count-c-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('categories-archived-count-c-2')).toBeInTheDocument()
  })

  it('#695 — actifs ET archivés : les deux nœuds coexistent, sans concaténation', () => {
    render(<CategoriesView />)
    const badge = screen.getByTestId('categories-count-c-1')
    const archived = screen.getByTestId('categories-archived-count-c-1')
    expect(badge).toBeInTheDocument()
    expect(archived).toBeInTheDocument()
    // Nœuds FRÈRES (revue Designer) : la mention n'est pas DANS le badge coloré.
    expect(badge).not.toContainElement(archived)
  })

  it('#695 — 0 archivé : aucune mention d’archivés (pas de « 0 archivé »)', () => {
    render(<CategoriesView />)
    expect(screen.queryByTestId('categories-archived-count-c-sys')).not.toBeInTheDocument()
    expect(screen.queryByTestId('categories-archived-count-c-1')).toBeInTheDocument()
  })

  /**
   * #695 — contrat Zod : `productCount` / `archivedProductCount` sont `.optional()`
   * (absents hors `GET /api/categories`). Une catégorie sans compteur ne doit pas
   * planter ni inventer un nombre : elle retombe sur 0/0.
   */
  it('#695 — compteurs absents du DTO : repli 0/0 sans mention d’archivés', () => {
    mockAll({ data: [{ id: 'c-x', name: 'Sans compteur', system: false, color: null }] })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-count-c-x')).toBeInTheDocument()
    expect(screen.queryByTestId('categories-archived-count-c-x')).not.toBeInTheDocument()
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
    // #695 — réassignation armée EN AMONT sur le total qui arme le 409 backend :
    // actifs + ARCHIVÉS (2 + 1 = 3 pour c-1), pas les seuls actifs.
    expect(dialog).toHaveAttribute('data-category-id', 'c-1')
    expect(dialog).toHaveAttribute('data-linked', '3')
    await user.click(dialog)
    // #245 : passe par la mutation (qui invalide categories.all + products.all).
    expect(deleteMutateAsync).toHaveBeenCalledWith({
      id: 'c-1',
      reassignToCategoryId: 'reassign-target',
    })
  })

  /**
   * #695 — une catégorie ne portant QUE des archivés arme quand même le select de
   * réassignation : sans cela le dialog partait sans cible, prenait un 409 et
   * basculait après coup (le repli `reassignRequiredByServer` reste, mais n'est plus
   * le chemin nominal).
   */
  it('#695 — catégorie ne portant que des archivés : linkedProductsCount > 0 d’emblée', async () => {
    const user = userEvent.setup()
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-delete-c-2'))
    expect(screen.getByTestId('delete-dialog-category')).toHaveAttribute('data-linked', '1')
  })

  it('affiche l’état vide', () => {
    mockAll({ data: [] })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-empty')).toBeInTheDocument()
  })

  it('#630 — état vide : le CTA ouvre le CategoryDrawer de création, sans piste', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    render(<CategoriesView />)
    const empty = screen.getByTestId('categories-empty')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('products.categories.empty')).toBeInTheDocument()
    expect(within(empty).queryByTestId('categories-empty-track')).not.toBeInTheDocument()
    expect(screen.queryByTestId('category-drawer-create')).not.toBeInTheDocument()
    await user.click(within(empty).getByTestId('categories-empty-cta'))
    expect(screen.getByTestId('category-drawer-create')).toBeInTheDocument()
  })

  it('review S90 — ouvert depuis le CTA d’état vide, catégorie créée (liste rechargée avant la fermeture) : focus sur « Nouvelle catégorie »', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    const { rerender } = render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-empty-cta'))
    // Création réussie : la liste n'est plus vide, le CTA d'état vide est démonté.
    mockAll()
    rerender(<CategoriesView />)
    expect(screen.queryByTestId('categories-empty-cta')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('category-drawer-create-close'))
    expect(screen.queryByTestId('category-drawer-create')).not.toBeInTheDocument()
    expect(drawerClose.lastPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId('categories-new-button'))
  })

  it('review S90 — ouvert depuis le CTA d’état vide, catégorie créée (liste rechargée APRÈS la fermeture) : focus sur « Nouvelle catégorie »', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    const { rerender } = render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-empty-cta'))
    await user.click(screen.getByTestId('category-drawer-create-close'))
    // Invalidation non attendue par la mutation : à la fermeture, le CTA est encore là.
    expect(drawerClose.lastPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId('categories-empty-cta'))
    mockAll()
    rerender(<CategoriesView />)
    expect(screen.queryByTestId('categories-empty-cta')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByTestId('categories-new-button'))
  })

  it('review S90, #700 — ouvert depuis le CTA d’état vide puis annulé : le composant rend le focus au CTA', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-empty-cta'))
    await user.click(screen.getByTestId('category-drawer-create-close'))
    expect(screen.queryByTestId('category-drawer-create')).not.toBeInTheDocument()
    expect(drawerClose.lastPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId('categories-empty-cta'))
  })

  it('review S90, #700 — drawer ouvert depuis « Nouvelle catégorie » : le composant lui rend le focus (Radix ne le fait pas)', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    render(<CategoriesView />)
    await user.click(screen.getByTestId('categories-new-button'))
    await user.click(screen.getByTestId('category-drawer-create-close'))
    expect(drawerClose.lastPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId('categories-new-button'))
  })

  it('affiche l’état d’erreur', () => {
    mockAll({ data: undefined, isError: true })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-error')).toBeInTheDocument()
  })

  it('affiche le squelette en cartes (#629) sous le testid categories-loading', () => {
    mockAll({ data: undefined, isLoading: true })
    render(<CategoriesView />)
    const loading = screen.getByTestId('categories-loading')
    expect(loading).toHaveAttribute('role', 'status')
    expect(loading).not.toHaveAttribute('aria-busy')
    expect(screen.getByText('products.categories.loading')).toBeInTheDocument()
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(6)
    expect(screen.queryByTestId('categories-empty')).not.toBeInTheDocument()
  })
})

/**
 * #638 (DEC-S82-004) — catégories types proposées à un compte sans aucune catégorie.
 *
 * Contrat posé ici (le mock de traduction rend `ns.key`, les libellés réels sont joués
 * par `CategoriesView.intl.test.tsx`) :
 *   - bloc `categories-suggestions`, un bouton `categories-suggestion-<id>` par entrée ;
 *   - ids, dans l'ordre : vehicles, insurance, health, food, housing, travel, finance ;
 *   - libellé = clé `products.categories.suggestions.<id>` ;
 *   - couleur = rôle de la palette unique, lue par `paletteHex` (aucun hex recopié ici).
 */
const SUGGESTION_IDS = [
  'vehicles',
  'insurance',
  'health',
  'food',
  'housing',
  'travel',
  'finance',
] as const

const suggestionButtons = () => screen.queryAllByTestId(/^categories-suggestion-/)

describe('#638 — catégories proposées à un compte neuf', () => {
  beforeEach(() => {
    createMutate.mockResolvedValue({ id: 'new', name: 'créée', system: false })
  })

  it('shows the seven suggestions when no category exists', () => {
    mockAll({ data: [] })
    render(<CategoriesView />)
    expect(suggestionButtons().map((el) => el.getAttribute('data-testid'))).toEqual(
      SUGGESTION_IDS.map((id) => `categories-suggestion-${id}`),
    )
    for (const el of suggestionButtons()) expect(el).toBeVisible()
    // Le bouton de création habituel reste là, à côté des suggestions.
    expect(screen.getByTestId('categories-empty-cta')).toBeVisible()
  })

  it('does not create anything when suggestions are displayed', () => {
    mockAll({ data: [] })
    render(<CategoriesView />)
    // Sans suggestions affichées, « rien n'est créé » serait vrai à vide.
    expect(suggestionButtons()).toHaveLength(SUGGESTION_IDS.length)
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('creates the chosen suggestion with its palette colour', async () => {
    const user = userEvent.setup()
    mockAll({ data: [] })
    render(<CategoriesView />)
    const vehicles = screen.queryByTestId('categories-suggestion-vehicles')
    expect(vehicles).not.toBeNull()
    await user.click(vehicles!)
    expect(createMutate).toHaveBeenCalledTimes(1)
    // Véhicules = rôle « sky » de la palette unique (#577).
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'products.categories.suggestions.vehicles',
        color: paletteHex('sky'),
      }),
    )
  })

  it('hides suggestions once a category exists', () => {
    mockAll()
    render(<CategoriesView />)
    expect(suggestionButtons()).toHaveLength(0)
    expect(screen.queryByTestId('categories-suggestions')).not.toBeInTheDocument()
    // Seule la liste est affichée.
    expect(screen.getByTestId('categories-card-c-1')).toBeInTheDocument()
    expect(screen.queryByTestId('categories-empty')).not.toBeInTheDocument()
  })
})

/**
 * #604 — produits actifs en puces sur les cartes, choix de catégorie par puce, déplacement
 * optimiste.
 *
 * Contrat posé ici (le code le suit) :
 *   - puce : `categories-chip-<productId>`, DANS la carte `categories-card-<categoryId>` ;
 *   - choix : `<select>` natif `categories-assign-<productId>`, une `<option value=categoryId>`
 *     par catégorie, la catégorie courante sélectionnée ;
 *   - erreur d'affectation : un élément `role="alert"` (≠ `categories-error` du chargement) ;
 *   - compteurs : `categories-count-<id>` / `categories-archived-count-<id>` (`count=N` dans
 *     le texte, cf. le mock de next-intl) ;
 *   - hook : `useAssignProductCategory(userId, options?)`, `mutate({ productId, categoryId })`.
 * Les compteurs restent ceux du serveur (#695) : la liste produits ne sert qu'aux puces.
 */
const product = (id: string, name: string, categoryId: string): Product => ({
  id,
  name,
  color: null,
  category: { id: categoryId, name: categoryId, color: null },
  events: [],
})

const chipsIn = (categoryId: string) =>
  within(screen.getByTestId(`categories-card-${categoryId}`)).queryAllByTestId(/^categories-chip-/)

const countOf = (categoryId: string) => screen.getByTestId(`categories-count-${categoryId}`)

describe('#604 — produits en puces sur les cartes catégorie', () => {
  it('renders one product chip per active product inside its category card', () => {
    mockAll({
      data: [
        { id: 'c-1', name: 'Véhicules', system: false, productCount: 2, archivedProductCount: 0 },
        { id: 'c-2', name: 'Assurance', system: false, productCount: 1, archivedProductCount: 0 },
      ],
    })
    useProductsMock.mockReturnValue({
      data: [
        product('p-1', 'Voiture', 'c-1'),
        product('p-2', 'Moto', 'c-1'),
        product('p-3', 'Contrat habitation', 'c-2'),
      ],
      isLoading: false,
      isError: false,
    })
    render(<CategoriesView />)
    const first = chipsIn('c-1')
    expect(first).toHaveLength(2)
    expect(first[0]).toHaveTextContent('Voiture')
    expect(first[1]).toHaveTextContent('Moto')
    const second = chipsIn('c-2')
    expect(second).toHaveLength(1)
    expect(second[0]).toHaveTextContent('Contrat habitation')
  })

  it('renders no chip for a category without active product', () => {
    mockAll({
      data: [{ id: 'c-0', name: 'Vide', system: false, productCount: 0, archivedProductCount: 0 }],
    })
    // Un produit d'une autre catégorie existe : « aucune puce » ne doit pas venir d'une liste vide.
    useProductsMock.mockReturnValue({
      data: [product('p-9', 'Ailleurs', 'c-other')],
      isLoading: false,
      isError: false,
    })
    render(<CategoriesView />)
    expect(screen.getByTestId('categories-card-c-0')).toBeInTheDocument()
    expect(chipsIn('c-0')).toHaveLength(0)
    expect(countOf('c-0')).toHaveTextContent('count=0')
  })

  it('offers every category in the assignment select of a product chip', () => {
    mockAll({
      data: [
        { id: 'c-1', name: 'Véhicules', system: false, productCount: 1, archivedProductCount: 0 },
        { id: 'c-2', name: 'Assurance', system: false, productCount: 0, archivedProductCount: 0 },
        { id: 'c-sys', name: 'Système', system: true, productCount: 0, archivedProductCount: 0 },
      ],
    })
    useProductsMock.mockReturnValue({
      data: [product('p-1', 'Voiture', 'c-1')],
      isLoading: false,
      isError: false,
    })
    render(<CategoriesView />)
    const select = screen.getByTestId('categories-assign-p-1') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value),
    ).toEqual(['c-1', 'c-2', 'c-sys'])
    expect(select.value).toBe('c-1')
  })

  it('does not render archived products as chips and keeps the archived count', () => {
    mockAll({
      data: [
        { id: 'c-1', name: 'Véhicules', system: false, productCount: 1, archivedProductCount: 1 },
      ],
    })
    // Le vrai listing exclut les archivés (@SQLRestriction) : l'archivé est ajouté ICI à la
    // liste simulée (champ `archived`, absent du type `Product`) pour qu'afficher aussi les
    // archivés en puces fasse échouer le test. Le compteur vient de `GET /api/categories`.
    useProductsMock.mockReturnValue({
      data: [
        product('p-1', 'Voiture', 'c-1'),
        { ...product('p-2', 'Ancienne moto', 'c-1'), archived: true },
      ],
      isLoading: false,
      isError: false,
    })
    render(<CategoriesView />)
    expect(chipsIn('c-1')).toHaveLength(1)
    expect(chipsIn('c-1')[0]).toHaveTextContent('Voiture')
    expect(screen.queryByTestId('categories-chip-p-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('categories-archived-count-c-1')).toHaveTextContent('count=1')
  })
})

describe('#604 — affectation optimiste (vrais caches TanStack)', () => {
  const SERVER_CATEGORIES: Category[] = [
    { id: 'c-a', name: 'A', system: false, color: null, productCount: 1, archivedProductCount: 0 },
    { id: 'c-b', name: 'B', system: false, color: null, productCount: 0, archivedProductCount: 0 },
  ]
  const SERVER_PRODUCTS = [product('p-1', 'Voiture', 'c-a')]

  function renderWithRealCaches() {
    const client = new QueryClient({
      mutationCache: new MutationCache({ onError: () => {} }),
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    return render(<CategoriesView />, { wrapper })
  }

  // Distingue « données jamais chargées » de « puce absente » : `useProductsWithEvents` lit
  // `productService.getProducts` (simulé), et les compteurs serveur sont rendus.
  async function waitForLoaded() {
    await waitFor(() => expect(getProductsMock).toHaveBeenCalledWith('user-1'))
    await waitFor(() => expect(countOf('c-a')).toHaveTextContent('count=1'))
  }

  beforeEach(async () => {
    const categories =
      await vi.importActual<typeof import('@/hooks/useCategories')>('@/hooks/useCategories')
    const products = await vi.importActual<typeof import('@/hooks/useProductsWithEvents')>(
      '@/hooks/useProductsWithEvents',
    )
    const assign = await vi.importActual<typeof import('@/hooks/useAssignProductCategory')>(
      '@/hooks/useAssignProductCategory',
    )
    useCategoriesMock.mockImplementation((enabled?: boolean) => categories.useCategories(enabled))
    useProductsMock.mockImplementation((id: string) => products.useProductsWithEvents(id))
    assignHookMock.mockImplementation(
      (...args: Parameters<typeof assign.useAssignProductCategory>) =>
        assign.useAssignProductCategory(...args),
    )
    getCategoriesMock.mockResolvedValue(SERVER_CATEGORIES)
    getProductsMock.mockResolvedValue(SERVER_PRODUCTS)
  })

  it('moves the chip and updates both counters before the server answers', async () => {
    const user = userEvent.setup()
    // Le serveur ne répond jamais : tout ce qui change à l'écran est optimiste.
    updateProductMock.mockReturnValue(new Promise(() => {}))
    renderWithRealCaches()
    await waitForLoaded()
    await waitFor(() => expect(chipsIn('c-a')).toHaveLength(1))
    expect(chipsIn('c-b')).toHaveLength(0)
    expect(countOf('c-a')).toHaveTextContent('count=1')
    expect(countOf('c-b')).toHaveTextContent('count=0')

    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')

    await waitFor(() => expect(chipsIn('c-b')).toHaveLength(1))
    expect(chipsIn('c-a')).toHaveLength(0)
    expect(countOf('c-a')).toHaveTextContent('count=0')
    expect(countOf('c-b')).toHaveTextContent('count=1')
    expect(updateProductMock).toHaveBeenCalledTimes(1)
  })

  it('puts the chip back and shows an error when the assignment is rejected', async () => {
    const user = userEvent.setup()
    let rejectUpdate: (e: unknown) => void = () => {}
    updateProductMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectUpdate = reject
      }),
    )
    renderWithRealCaches()
    await waitForLoaded()
    await waitFor(() => expect(chipsIn('c-a')).toHaveLength(1))

    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    // Anti-vacuité : le déplacement a bien eu lieu avant le refus.
    await waitFor(() => expect(chipsIn('c-b')).toHaveLength(1))

    rejectUpdate(Object.assign(new Error('refusé'), { response: { status: 403 } }))

    await waitFor(() => expect(chipsIn('c-a')).toHaveLength(1))
    expect(chipsIn('c-b')).toHaveLength(0)
    expect(countOf('c-a')).toHaveTextContent('count=1')
    expect(countOf('c-b')).toHaveTextContent('count=0')
    expect(await screen.findByRole('alert')).toHaveTextContent(/\S/)
    expect(screen.queryByTestId('categories-error')).not.toBeInTheDocument()
  })
})
