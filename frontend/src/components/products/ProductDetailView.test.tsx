import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/types/product'
import { ProductDetailView } from './ProductDetailView'

/**
 * #68 — Tests ProductDetailView : fiche produit, sous-frise FILTRÉE en amont (ne
 * reçoit que les events du produit sélectionné), historique, édition (drawer),
 * suppression (soft delete #50 → retour liste), état introuvable (archivé/absent).
 *
 * #307 — s'y ajoute l'état de vue « actifs / archivés / tous » (BR-EVE-013) : un event
 * archivé redevient ATTEIGNABLE (frise + historique) et DÉSARCHIVABLE, sans que le
 * compteur d'events actifs (BR-EVE-011) ne suive jamais le filtre.
 */

const useProductsMock = vi.fn()
const pushMock = vi.fn()
const deleteProductMock = vi.fn()
const timelineSpy = vi.fn()
const setArchivedMock = vi.fn()

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: (...args: unknown[]) => useProductsMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/services/productService', () => ({
  deleteProduct: (...args: unknown[]) => deleteProductMock(...args),
}))
// #307 — la mutation de (dés)archivage est mockée au niveau du hook : son invalidation
// TanStack est couverte par `useSetEventArchived.test.tsx` (isolation des responsabilités).
vi.mock('@/hooks/useSetEventArchived', () => ({
  useSetEventArchived: () => ({ mutateAsync: setArchivedMock }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

// TimelineResponsive mocké : on capture events/resources reçus pour prouver le
// filtrage amont (ce produit uniquement, pas toute la liste).
vi.mock('@/components/timeline', () => ({
  // #absorb — ProductDetailView monte désormais TimelineEditHost (surface d'édition
  // câblée, gap A). Le mock conserve le spy de props + le testid attendu par les tests.
  TimelineEditHost: (props: { events: unknown[]; resources: unknown[] }) => {
    timelineSpy(props)
    return <div data-testid="timeline-responsive">timeline</div>
  },
  TimelineResponsive: (props: { events: unknown[]; resources: unknown[] }) => {
    timelineSpy(props)
    return <div data-testid="timeline-responsive">timeline</div>
  },
}))
vi.mock('./ProductDrawer', () => ({
  ProductDrawer: ({ open, product }: { open: boolean; product?: Product }) =>
    open ? <div data-testid="product-drawer" data-product={product?.id ?? ''} /> : null,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: () => void | Promise<void>
  }) =>
    open ? (
      <button type="button" data-testid="delete-dialog" onClick={() => onConfirm()}>
        confirm
      </button>
    ) : null,
}))

const PRODUCT: Product = {
  id: 'p-alpha',
  name: 'Alpha',
  color: '#112233',
  category: { id: 'c-1', name: 'Véhicules', color: '#445566' },
  events: [
    {
      id: 'e1',
      title: 'Vidange',
      type: 'single',
      startDate: '2026-06-01T10:00:00Z',
      endDate: '2026-06-01T10:00:00Z',
      productId: 'p-alpha',
      archived: false,
    },
    {
      id: 'e-arch',
      title: 'Archivé',
      type: 'single',
      startDate: '2026-05-01T10:00:00Z',
      endDate: '2026-05-01T10:00:00Z',
      productId: 'p-alpha',
      archived: true,
      // #307 — version détenue au chargement : threadée dans le PATCH (BR-EVE-015).
      version: 3,
    },
  ],
}

const OTHER: Product = {
  id: 'p-beta',
  name: 'Beta',
  color: null,
  category: { id: 'c-2', name: 'Assurance', color: '#778899' },
  events: [
    {
      id: 'e2',
      title: 'Autre',
      type: 'single',
      startDate: '2026-07-04T10:00:00Z',
      endDate: '2026-07-04T10:00:00Z',
      productId: 'p-beta',
      archived: false,
    },
  ],
}

function mockData(overrides: Record<string, unknown> = {}) {
  useProductsMock.mockReturnValue({
    data: [PRODUCT, OTHER],
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockData()
})

afterEach(() => vi.clearAllMocks())

describe('ProductDetailView', () => {
  it('affiche la fiche du produit sélectionné', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('product-detail-card')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('product-detail-category')).toHaveTextContent('Véhicules')
  })

  // jsdom ne calcule aucun layout : ce test verifie uniquement que les classes de
  // gestion de debordement sont bien portees par le h1 du titre. L'absence reelle de
  // debordement pixel n'est PAS prouvee ici (cf. non_verifie / E2E).
  it('porte les classes anti-debordement sur le titre produit', () => {
    render(<ProductDetailView productId="p-alpha" />)
    const title = screen.getByTestId('product-detail-card').querySelector('h1')
    expect(title).not.toBeNull()
    expect(title?.className).toContain('break-words')
    expect(title?.className).toContain('min-w-0')
  })

  it('passe à la sous-frise UNIQUEMENT les events non archivés de CE produit', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('timeline-responsive')).toBeInTheDocument()
    const call = timelineSpy.mock.calls.at(-1)?.[0] as {
      events: Array<{ id: string }>
      resources: Array<{ id: string }>
    }
    // 1 event non archivé du produit p-alpha, pas ceux de p-beta ni l'archivé.
    expect(call.events.map((e) => e.id)).toEqual(['e1'])
    expect(call.resources.map((r) => r.id)).toEqual(['p-alpha'])
  })

  it('liste l’historique des events non archivés (récent d’abord)', () => {
    render(<ProductDetailView productId="p-alpha" />)
    expect(screen.getByTestId('product-detail-history-row-e1')).toBeInTheDocument()
    expect(screen.queryByTestId('product-detail-history-row-e-arch')).not.toBeInTheDocument()
  })

  it('ouvre le ProductDrawer en édition', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-edit'))
    expect(screen.getByTestId('product-drawer')).toHaveAttribute('data-product', 'p-alpha')
  })

  it('supprime (soft delete) puis revient à la liste', async () => {
    const user = userEvent.setup()
    deleteProductMock.mockResolvedValue(undefined)
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-delete'))
    await user.click(screen.getByTestId('delete-dialog'))
    expect(deleteProductMock).toHaveBeenCalledWith('user-1', 'p-alpha')
    expect(pushMock).toHaveBeenCalledWith('/fr/products')
  })

  it('affiche « introuvable » si le produit est absent/archivé', () => {
    render(<ProductDetailView productId="does-not-exist" />)
    expect(screen.getByTestId('product-detail-not-found')).toBeInTheDocument()
  })

  it('revient à la liste via le bouton retour', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-back'))
    expect(pushMock).toHaveBeenCalledWith('/fr/products')
  })

  /* ------------------------------------------------------------------ #307 */

  describe('#307 — vue « archivés » (BR-EVE-013)', () => {
    it('l’event archivé est masqué par défaut et absent des actions', () => {
      render(<ProductDetailView productId="p-alpha" />)
      expect(screen.queryByTestId('product-detail-history-row-e-arch')).not.toBeInTheDocument()
      expect(screen.queryByTestId('product-detail-unarchive-e-arch')).not.toBeInTheDocument()
    })

    it('l’onglet « archivés » remonte l’event dans l’historique ET dans la frise', async () => {
      const user = userEvent.setup()
      render(<ProductDetailView productId="p-alpha" />)

      await user.click(screen.getByTestId('product-detail-filter-archived'))

      // Historique : l'archivé remplace l'actif.
      expect(screen.getByTestId('product-detail-history-row-e-arch')).toBeInTheDocument()
      expect(screen.queryByTestId('product-detail-history-row-e1')).not.toBeInTheDocument()
      // Frise : c'est ce passage qui rend l'event RÉOUVRABLE en édition
      // (TimelineEditHost, monté par la vue, ouvre le formulaire pré-rempli).
      const call = timelineSpy.mock.calls.at(-1)?.[0] as { events: Array<{ id: string }> }
      expect(call.events.map((e) => e.id)).toEqual(['e-arch'])
    })

    it('l’onglet « tous » liste actifs et archivés ensemble', async () => {
      const user = userEvent.setup()
      render(<ProductDetailView productId="p-alpha" />)

      await user.click(screen.getByTestId('product-detail-filter-all'))

      expect(screen.getByTestId('product-detail-history-row-e1')).toBeInTheDocument()
      expect(screen.getByTestId('product-detail-history-row-e-arch')).toBeInTheDocument()
      const call = timelineSpy.mock.calls.at(-1)?.[0] as { events: Array<{ id: string }> }
      expect(call.events.map((e) => e.id).sort()).toEqual(['e-arch', 'e1'])
    })

    // BR-EVE-011 — garde-fou de non-régression : le quota compte les events ACTIFS,
    // il ne doit JAMAIS suivre le filtre de vue (sinon un archivé consommerait du quota).
    it('le compteur d’events actifs ne suit PAS le filtre de vue', async () => {
      const user = userEvent.setup()
      render(<ProductDetailView productId="p-alpha" />)
      const heading = screen.getByTestId('product-detail-history').querySelector('h2')

      expect(heading?.textContent).toContain('products.detail.eventsCount')
      const before = screen.getByTestId('product-detail-filter-active').textContent

      await user.click(screen.getByTestId('product-detail-filter-archived'))

      // Onglet « actifs » : 1 (l'actif e1), inchangé alors que la vue montre l'archivé.
      expect(screen.getByTestId('product-detail-filter-active').textContent).toBe(before)
      expect(before).toContain('1')
      expect(screen.getByTestId('product-detail-filter-archived').textContent).toContain('1')
    })

    it('désarchive via le PATCH (archived:false + version threadée)', async () => {
      const user = userEvent.setup()
      setArchivedMock.mockResolvedValue(undefined)
      render(<ProductDetailView productId="p-alpha" />)

      await user.click(screen.getByTestId('product-detail-filter-archived'))
      await user.click(screen.getByTestId('product-detail-unarchive-e-arch'))

      expect(setArchivedMock).toHaveBeenCalledWith({
        id: 'e-arch',
        archived: false,
        version: 3,
      })
    })

    it('affiche un message dédié quand le désarchivage échoue en 409 (BR-EVE-015)', async () => {
      const user = userEvent.setup()
      setArchivedMock.mockRejectedValue({ response: { status: 409 } })
      render(<ProductDetailView productId="p-alpha" />)

      await user.click(screen.getByTestId('product-detail-filter-archived'))
      await user.click(screen.getByTestId('product-detail-unarchive-e-arch'))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('products.detail.unarchiveConflict'),
      )
    })

    it('affiche un message générique sur une autre erreur', async () => {
      const user = userEvent.setup()
      setArchivedMock.mockRejectedValue({ response: { status: 500 } })
      render(<ProductDetailView productId="p-alpha" />)

      await user.click(screen.getByTestId('product-detail-filter-archived'))
      await user.click(screen.getByTestId('product-detail-unarchive-e-arch'))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('products.detail.unarchiveError'),
      )
    })

    it('vue « archivés » sans archivé : message dédié, pas le message générique', async () => {
      const user = userEvent.setup()
      render(<ProductDetailView productId="p-beta" />)

      await user.click(screen.getByTestId('product-detail-filter-archived'))

      expect(screen.getByTestId('product-detail-history-empty')).toHaveTextContent(
        'products.detail.archivedEmpty',
      )
      expect(screen.getByTestId('product-detail-timeline-empty')).toHaveTextContent(
        'products.detail.archivedEmpty',
      )
    })
  })
})
