import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
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

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
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
