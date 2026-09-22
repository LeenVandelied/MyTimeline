import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/types/product'
import { ProductsListView } from './ProductsListView'

/**
 * #68 — Tests ProductsListView : rendu du tableau (produits du user), recherche
 * locale, ordre par défaut (prochain événement, #603), ouverture drawer création/édition,
 * archivage (DeleteConfirmDialog), navigation vers le détail.
 *
 * next-intl mocké → assertions sur les clés. Drawers/dialogs mockés (leurs tests
 * vivent dans #61/#65) : on vérifie ICI qu'ils sont pilotés (open + props).
 *
 * #603 — horloge FIGÉE (seul `Date` est simulé : les minuteries de user-event restent
 * réelles) au mardi 15 sept. 2026 10 h locale, pour que « à venir » soit déterministe.
 */

const useProductsMock = vi.fn()
const pushMock = vi.fn()
const prefetchMock = vi.fn()
const archiveMutateAsync = vi.fn()
const useArchiveProductSpy = vi.fn()

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
// PIT-S92-004 — archivage par la mutation (retrait du cache + invalidation couverts par
// `useArchiveProduct.test.tsx`) : on assert ICI le branchement.
vi.mock('@/hooks/useArchiveProduct', () => ({
  useArchiveProduct: (...args: unknown[]) => {
    useArchiveProductSpy(...args)
    return { mutateAsync: archiveMutateAsync, isPending: false }
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, prefetch: prefetchMock }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))
// #605 — confirmation d'archivage par toast (appel asserté, rendu couvert par `ui/toaster`).
const toastSuccessMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
  toast: { success: toastSuccessMock, error: vi.fn() },
}))

// Drawers/dialog mockés : on expose leur `open` + le mode pour l'assertion.
// Review S90 — le bouton « close » rejoue la séquence de fermeture Radix : `onOpenChange(false)`
// puis `onCloseAutoFocus(event annulable)`. Non annulé, Radix rend le focus à l'élément qui
// l'avait à l'ouverture (FocusScope) ; un nœud détaché ne prend pas le focus, qui reste
// alors sur `body`. `drawerClose.lastPrevented` garde la trace de l'interception.
const drawerClose = vi.hoisted(() => ({ lastPrevented: null as boolean | null }))

vi.mock('./ProductDrawer', async () => {
  const React = await import('react')
  return {
    ProductDrawer: ({
      open,
      mode,
      product,
      onOpenChange,
      onCloseAutoFocus,
    }: {
      open: boolean
      mode?: string
      product?: Product
      onOpenChange: (open: boolean) => void
      onCloseAutoFocus?: (event: Event) => void
    }) => {
      const triggerRef = React.useRef<Element | null>(null)
      React.useEffect(() => {
        if (open) triggerRef.current = document.activeElement
      }, [open])
      return open ? (
        <div data-testid={`product-drawer-${mode}`} data-product={product?.id ?? ''}>
          drawer
          <button
            type="button"
            data-testid={`product-drawer-${mode}-close`}
            onClick={() => {
              onOpenChange(false)
              const event = new Event('focusScope.autoFocusOnUnmount', { cancelable: true })
              onCloseAutoFocus?.(event)
              drawerClose.lastPrevented = event.defaultPrevented
              const trigger = triggerRef.current
              if (!event.defaultPrevented && trigger instanceof HTMLElement) trigger.focus()
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
    onConfirm,
  }: {
    open: boolean
    variant: string
    onConfirm: (id?: string) => void | Promise<void>
  }) =>
    open ? (
      <button type="button" data-testid={`delete-dialog-${variant}`} onClick={() => onConfirm()}>
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

/** Mardi 15 sept. 2026, 10 h LOCALE (horloge figée, cf. en-tête). */
const FROZEN_NOW = () => new Date(2026, 8, 15, 10, 0, 0)

const PRODUCTS: Product[] = [
  {
    id: 'p-alpha',
    name: 'Alpha',
    color: '#112233',
    category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
    // Ponctuel passé + série MENSUELLE partie en janvier : prochaine occurrence le 20 sept.
    events: [
      mkEvent('e1', '2026-06-01'),
      {
        ...mkEvent('e1r', '2026-01-20'),
        isRecurring: true,
        recurrenceUnit: 'MONTH',
        recurrenceEndDate: null,
      },
    ],
  },
  {
    id: 'p-beta',
    name: 'Beta',
    color: null,
    category: { id: 'c-2', name: 'Assurance', color: '#778899' },
    // Archivé DEMAIN (écarté) + ponctuel le 17 → échéance le 17, compteur 1.
    events: [mkEvent('e2a', '2026-09-16', true), mkEvent('e2', '2026-09-17')],
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
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FROZEN_NOW())
  drawerClose.lastPrevented = null
  mockProducts()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const rowIds = () => screen.getAllByRole('link').map((row) => row.getAttribute('data-testid'))

describe('ProductsListView', () => {
  it('affiche les produits du user dans le tableau', () => {
    render(<ProductsListView />)
    expect(screen.getByTestId('products-table')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-alpha')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-beta')).toBeInTheDocument()
    expect(screen.getByTestId('products-row-p-gamma')).toBeInTheDocument()
  })

  it('#603 — colonnes du handoff : Produit · Prochain événement · mini-frise · nb d’événements · Actions', () => {
    render(<ProductsListView />)
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual([
      'products.list.columns.product',
      'products.list.columns.nextEvent',
      'products.list.columns.activity',
      'products.list.columns.events',
      'products.list.columns.actions',
    ])
  })

  it('#609 — en-têtes au motif DS `.mt-table th` : mono 9 px capitales, ink-muted, filet rule-strong', () => {
    render(<ProductsListView />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(5)
    for (const th of headers) {
      expect(th).toHaveAttribute('scope', 'col')
      expect(th).toHaveClass(
        'font-mono',
        'text-[9px]',
        'uppercase',
        'tracking-[.1em]',
        'text-ink-muted',
        'font-medium',
        'border-b-[1.5px]',
        'border-rule-strong',
      )
    }
    // Colonnes numérique et actions : alignement à droite conservé.
    expect(headers[3]).toHaveClass('text-right')
    expect(headers[4]).toHaveClass('text-right')
    expect(headers[0]).not.toHaveClass('text-right')
  })

  it('#603 — trie par prochain événement par défaut (le plus proche d’abord, sans échéance en dernier)', () => {
    render(<ProductsListView />)
    // p-beta (17 sept.) < p-alpha (20 sept., récurrence avancée) < p-gamma (aucune).
    expect(rowIds()).toEqual([
      'products-row-p-beta',
      'products-row-p-alpha',
      'products-row-p-gamma',
    ])
  })

  it('#603 — tri prochain événement : à échéance égale ou absente, départage par nom', () => {
    mockProducts({
      data: [
        { ...PRODUCTS[2], id: 'p-zulu', name: 'Zulu' },
        { ...PRODUCTS[1], id: 'p-bis', name: 'Bis' },
        { ...PRODUCTS[2], id: 'p-aardvark', name: 'Aardvark' },
        PRODUCTS[1],
      ],
    })
    render(<ProductsListView />)
    expect(rowIds()).toEqual([
      'products-row-p-beta',
      'products-row-p-bis',
      'products-row-p-aardvark',
      'products-row-p-zulu',
    ])
  })

  it('#603 — la colonne montre la prochaine occurrence d’une série, en ISO dans un <time datetime>', () => {
    render(<ProductsListView />)
    const cell = screen.getByTestId('products-row-next-p-alpha')
    const time = cell.querySelector('time')
    expect(time?.getAttribute('datetime')).toBe('2026-09-20')
    expect(time).toHaveTextContent(/^2026-09-20$/)
    expect(cell).toHaveTextContent('evt-e1r')
    // L'événement archivé du 16 est écarté : Beta affiche le 17.
    expect(screen.getByTestId('products-row-next-p-beta').querySelector('time')).toHaveTextContent(
      '2026-09-17',
    )
  })

  it('#603 — sans échéance : tiret décoratif + texte accessible, aucun <time>', () => {
    render(<ProductsListView />)
    const cell = screen.getByTestId('products-row-next-p-gamma')
    expect(cell.querySelector('time')).toBeNull()
    expect(within(cell).getByText('—')).toHaveAttribute('aria-hidden', 'true')
    expect(within(cell).getByText('products.list.noUpcoming')).toHaveClass('sr-only')
  })

  it('#603 — nombre d’événements NON archivés, avec forme plurielle accessible', () => {
    render(<ProductsListView />)
    const beta = screen.getByTestId('products-row-events-count-p-beta')
    expect(within(beta).getByText('1')).toHaveAttribute('aria-hidden', 'true')
    expect(within(beta).getByText('products.list.eventsCount')).toHaveClass('sr-only')
    expect(screen.getByTestId('products-row-events-count-p-alpha')).toHaveTextContent(/^2/)
    expect(screen.getByTestId('products-row-events-count-p-gamma')).toHaveTextContent(/^0/)
  })

  it('#603 — expose les tris Prochain événement / Nom, sans « dernière activité »', () => {
    render(<ProductsListView />)
    expect(screen.getByTestId('products-sort-trigger')).toHaveTextContent(
      'products.list.sort.nextEvent',
    )
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

  it('#630 — recherche vide : action « effacer » (pas de CTA de création), focus rendu au champ', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    const input = screen.getByTestId('products-search-input')
    await user.type(input, 'zzz')
    const empty = screen.getByTestId('products-empty-search')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('products-empty-cta')).not.toBeInTheDocument()
    expect(within(empty).queryByTestId('products-empty-search-track')).not.toBeInTheDocument()
    await user.click(within(empty).getByTestId('products-empty-search-cta'))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.getByTestId('products-row-p-alpha')).toBeInTheDocument()
    expect(screen.queryByTestId('products-empty-search')).not.toBeInTheDocument()
  })

  it('#630 — liste vide : le CTA ouvre le ProductDrawer de création, sans piste', async () => {
    const user = userEvent.setup()
    mockProducts({ data: [] })
    render(<ProductsListView />)
    const empty = screen.getByTestId('products-empty')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('products.list.empty')).toBeInTheDocument()
    expect(within(empty).queryByTestId('products-empty-track')).not.toBeInTheDocument()
    expect(screen.queryByTestId('product-drawer-create')).not.toBeInTheDocument()
    await user.click(within(empty).getByTestId('products-empty-cta'))
    expect(screen.getByTestId('product-drawer-create')).toBeInTheDocument()
  })

  it('review S90 — ouvert depuis le CTA d’état vide, produit créé (liste rechargée avant la fermeture) : focus sur « Nouveau produit »', async () => {
    const user = userEvent.setup()
    mockProducts({ data: [] })
    const { rerender } = render(<ProductsListView />)
    await user.click(screen.getByTestId('products-empty-cta'))
    // Création réussie : la liste n'est plus vide, le CTA d'état vide est démonté.
    mockProducts()
    rerender(<ProductsListView />)
    expect(screen.queryByTestId('products-empty-cta')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('product-drawer-create-close'))
    expect(screen.queryByTestId('product-drawer-create')).not.toBeInTheDocument()
    expect(drawerClose.lastPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId('products-new-button'))
  })

  it('review S90 — ouvert depuis le CTA d’état vide, produit créé (liste rechargée APRÈS la fermeture) : focus sur « Nouveau produit »', async () => {
    const user = userEvent.setup()
    mockProducts({ data: [] })
    const { rerender } = render(<ProductsListView />)
    await user.click(screen.getByTestId('products-empty-cta'))
    await user.click(screen.getByTestId('product-drawer-create-close'))
    // Invalidation non attendue par la mutation : à la fermeture, le CTA est encore là.
    expect(drawerClose.lastPrevented).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('products-empty-cta'))
    mockProducts()
    rerender(<ProductsListView />)
    expect(screen.queryByTestId('products-empty-cta')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByTestId('products-new-button'))
  })

  it('review S90 — ouvert depuis le CTA d’état vide puis annulé : Radix rend le focus au CTA', async () => {
    const user = userEvent.setup()
    mockProducts({ data: [] })
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-empty-cta'))
    await user.click(screen.getByTestId('product-drawer-create-close'))
    expect(screen.queryByTestId('product-drawer-create')).not.toBeInTheDocument()
    expect(drawerClose.lastPrevented).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('products-empty-cta'))
  })

  it('review S90 — drawer ouvert depuis « Nouveau produit » : focus rendu par Radix, sans interception', async () => {
    const user = userEvent.setup()
    mockProducts({ data: [] })
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-new-button'))
    await user.click(screen.getByTestId('product-drawer-create-close'))
    expect(drawerClose.lastPrevented).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('products-new-button'))
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
    archiveMutateAsync.mockResolvedValue(undefined)
    render(<ProductsListView />)
    await user.click(screen.getByTestId('products-archive-p-alpha'))
    await user.click(screen.getByTestId('delete-dialog-product'))
    expect(useArchiveProductSpy).toHaveBeenCalledWith('user-1')
    expect(archiveMutateAsync).toHaveBeenCalledWith({ productId: 'p-alpha' })
    // #605 — confirmation APRÈS la réponse serveur.
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productArchived'),
    )
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

  // #698 — la ligne navigue par `router.push` (aucun `<Link>`) : sans préchargement,
  // l'écran de liste restait affiché pendant tout l'aller-retour RSC.
  it('#698 — précharge la fiche au survol d’une ligne, une seule fois', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    const row = screen.getByTestId('products-row-p-alpha')
    expect(prefetchMock).not.toHaveBeenCalled()
    await user.hover(row)
    expect(prefetchMock).toHaveBeenCalledWith('/fr/products/p-alpha')
    await user.unhover(row)
    await user.hover(row)
    expect(prefetchMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('#698 — précharge la fiche au focus clavier d’une ligne', async () => {
    const user = userEvent.setup()
    render(<ProductsListView />)
    const row = screen.getByTestId('products-row-p-beta')
    // Tabule jusqu'à la ligne (vrai parcours clavier, pas `row.focus()`).
    for (let i = 0; i < 30 && document.activeElement !== row; i += 1) await user.tab()
    expect(row).toHaveFocus()
    expect(prefetchMock).toHaveBeenCalledWith('/fr/products/p-beta')
    expect(pushMock).not.toHaveBeenCalled()
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

  it('affiche le squelette de chargement (#629) sous le testid products-loading', () => {
    mockProducts({ data: undefined, isLoading: true })
    render(<ProductsListView />)
    const loading = screen.getByTestId('products-loading')
    expect(loading).toHaveAttribute('role', 'status')
    expect(loading).not.toHaveAttribute('aria-busy')
    expect(within(loading).getByText('products.list.loading')).toBeInTheDocument()
    expect(within(loading).getAllByTestId('loading-skeleton-item')).toHaveLength(6)
    expect(screen.queryByTestId('products-table')).not.toBeInTheDocument()
  })

  it('rend la catégorie sous le nom, dans la cellule Produit (#603, handoff §5)', () => {
    render(<ProductsListView />)
    const cat = within(screen.getByTestId('products-row-p-alpha')).getByTestId(
      'products-row-category-p-alpha',
    )
    expect(cat).toHaveTextContent('Véhicules')
    expect(cat).toHaveClass('font-mono')
    expect(cat.closest('td')).toHaveTextContent('Alpha')
  })
})
