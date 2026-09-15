import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import type { Product } from '@/types/product'
import { toLocalIsoDate } from '@/lib/date-iso'
import { CreateEventProvider } from '@/components/layout/CreateEventContext'
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
// PIT-S92-004 — archivage par la mutation `useArchiveProduct`. Par défaut, mutation mockée
// (branchement asserté ici, cache/invalidation dans `useArchiveProduct.test.tsx`) ; le bloc
// « cache réel » bascule `archiveHooks.real` pour exécuter les VRAIS hooks sur un vrai
// `QueryClient` (seul `deleteProduct` reste mocké) et prouver l'ordre navigation/cache.
const archiveMutateAsync = vi.fn()
const archiveHooks = vi.hoisted(() => ({ real: false }))
vi.mock('@/hooks/useArchiveProduct', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useArchiveProduct')>()
  const fakeUseArchiveProduct = (userId: string | undefined) => {
    void userId
    return { mutateAsync: archiveMutateAsync, isPending: false }
  }
  const fakeUseIsProductArchivedHere = (productId: string) => {
    void productId
    return false
  }
  return {
    ...actual,
    useArchiveProduct: (userId: string | undefined) => {
      const impl = archiveHooks.real ? actual.useArchiveProduct : fakeUseArchiveProduct
      return impl(userId)
    },
    useIsProductArchivedHere: (productId: string) => {
      const impl = archiveHooks.real
        ? actual.useIsProductArchivedHere
        : fakeUseIsProductArchivedHere
      return impl(productId)
    },
  }
})
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
// #605 — confirmation d'archivage par toast (appel asserté, rendu couvert par `ui/toaster`).
const toastSuccessMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
  toast: { success: toastSuccessMock, error: vi.fn() },
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
  ProductDrawer: ({
    open,
    product,
    onDeleted,
  }: {
    open: boolean
    product?: Product
    onDeleted?: () => void
  }) =>
    open ? (
      <div data-testid="product-drawer" data-product={product?.id ?? ''}>
        {/* Rejoue la sortie du drawer après un archivage réussi (`onDeleted`). */}
        <button type="button" data-testid="product-drawer-archived" onClick={() => onDeleted?.()}>
          archived
        </button>
      </div>
    ) : null,
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
      // Le vrai dialog `await` la promesse dans un try/catch (erreur inline) : le mock
      // absorbe le rejet de la même façon, pour tester le cas d'échec sans rejet non géré.
      <button
        type="button"
        data-testid="delete-dialog"
        onClick={() => {
          Promise.resolve(onConfirm()).catch(() => {})
        }}
      >
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

  // #575 — les deux titres de section étaient en style eyebrow SANS `font-mono`
  // (`text-ink-faint text-2xs tracking-widest uppercase`), ce qui les avait fait
  // rater au premier recensement. Classes seulement : jsdom ne peint rien.
  it('rend les titres de section en vrais h2 (display 600, --text-sm, encre pleine)', () => {
    render(<ProductDetailView productId="p-alpha" />)
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.map((h) => h.textContent)).toEqual([
      'products.detail.timelineTitle',
      'products.detail.historyTitle',
    ])
    for (const h2 of h2s) {
      for (const cls of ['text-ink', 'font-display', 'text-sm', 'font-semibold'])
        expect(h2.className).toContain(cls)
      for (const cls of ['uppercase', 'tracking-widest', 'text-ink-faint', 'text-2xs'])
        expect(h2.className).not.toContain(cls)
    }
    // Hiérarchie : le h1 du produit est d'un palier au-dessus (`text-xl`).
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-xl')
  })

  it('historique : le compteur est un eyebrow `.mt-eyebrow` AU-DESSUS du h2, hors du titre', () => {
    render(<ProductDetailView productId="p-alpha" />)
    const history = screen.getByTestId('product-detail-history')
    const count = screen.getByTestId('product-detail-history-count')
    const h2 = history.querySelector('h2')
    expect(count.className).toBe('mt-eyebrow')
    expect(count.textContent).toContain('products.detail.eventsCount')
    expect(h2?.textContent).toBe('products.detail.historyTitle')
    expect(h2 && count.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

  /**
   * #518 — la date de chaque ligne d'historique se rend en `<time datetime>`
   * (convention DS `i18n.css` §7) et non plus en `<span>`. Seule la SÉMANTIQUE est
   * vérifiée : `.mt-date--long` n'a aucun effet observable sous jsdom.
   */
  it('rend la date de chaque ligne d’historique en <time datetime> local', () => {
    render(<ProductDetailView productId="p-alpha" />)
    const row = screen.getByTestId('product-detail-history-row-e1')
    const el = row.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.tagName).toBe('TIME')
    expect(el?.getAttribute('datetime')).toBe(toLocalIsoDate(new Date('2026-06-01T10:00:00Z')))
    expect(el?.textContent).toBe(
      new Intl.DateTimeFormat('fr', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date('2026-06-01T10:00:00Z')),
    )
  })

  it('ouvre le ProductDrawer en édition', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-edit'))
    expect(screen.getByTestId('product-drawer')).toHaveAttribute('data-product', 'p-alpha')
  })

  it('archive (soft delete #50), confirme par toast, puis revient à la liste', async () => {
    const user = userEvent.setup()
    archiveMutateAsync.mockResolvedValue(undefined)
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-archive'))
    await user.click(screen.getByTestId('delete-dialog'))
    expect(archiveMutateAsync).toHaveBeenCalledWith({ productId: 'p-alpha' })
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/fr/products'))
    expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productArchived')
  })

  it('archivage en échec : ni toast ni retour à la liste (erreur laissée au dialog)', async () => {
    const user = userEvent.setup()
    archiveMutateAsync.mockRejectedValue({ response: { status: 404 } })
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-archive'))
    await user.click(screen.getByTestId('delete-dialog'))
    await waitFor(() => expect(archiveMutateAsync).toHaveBeenCalled())
    await Promise.resolve()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('archivé depuis le drawer d’édition : retour à la liste', async () => {
    const user = userEvent.setup()
    render(<ProductDetailView productId="p-alpha" />)
    await user.click(screen.getByTestId('product-detail-edit'))
    await user.click(screen.getByTestId('product-drawer-archived'))
    expect(pushMock).toHaveBeenCalledWith('/fr/products')
  })

  /* ------------------------------------------------------- PIT-S92-004 */

  describe('PIT-S92-004 — archivage sur cache réel (vrais hooks, vrai QueryClient)', () => {
    afterEach(() => {
      archiveHooks.real = false
    })

    function renderWithRealCache(getProducts: () => Promise<Product[]>) {
      archiveHooks.real = true
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
          mutations: { retry: false },
        },
      })
      client.setQueryData(queryKeys.products.withEvents('user-1'), [PRODUCT, OTHER])
      // `useProductsWithEvents` lit la VRAIE clé de cache : le retrait et l'invalidation
      // opérés par `useArchiveProduct` atteignent la vue comme en production.
      useProductsMock.mockImplementation((userId: string | undefined) =>
        useQuery({ queryKey: queryKeys.products.withEvents(userId ?? ''), queryFn: getProducts }),
      )
      render(
        <QueryClientProvider client={client}>
          <ProductDetailView productId="p-alpha" />
        </QueryClientProvider>,
      )
      return client
    }

    it('retire le produit du cache, sans jamais afficher « introuvable » avant le retour liste', async () => {
      const user = userEvent.setup()
      deleteProductMock.mockResolvedValue(undefined)
      const getProducts = vi.fn().mockResolvedValue([OTHER])
      const notFoundSeen = { value: false }
      const observer = new MutationObserver(() => {
        if (screen.queryByTestId('product-detail-not-found')) notFoundSeen.value = true
      })
      observer.observe(document.body, { childList: true, subtree: true })

      const client = renderWithRealCache(getProducts)
      await user.click(screen.getByTestId('product-detail-archive'))
      await user.click(screen.getByTestId('delete-dialog'))

      expect(deleteProductMock).toHaveBeenCalledWith('user-1', 'p-alpha')
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/fr/products'))
      // L'invalidation a relancé la requête active et le cache ne contient plus le produit.
      await waitFor(() => expect(getProducts).toHaveBeenCalled())
      await waitFor(() => expect(client.isFetching()).toBe(0))
      const cached = client.getQueryData<Product[]>(queryKeys.products.withEvents('user-1'))
      expect(cached?.map((p) => p.id)).toEqual(['p-beta'])

      // Le routeur est mocké : la vue reste montée, ce qui rend l'éventuel flash PERMANENT
      // et donc observable.
      observer.disconnect()
      expect(notFoundSeen.value, 'la fiche ne doit pas passer sur « introuvable »').toBe(false)
      expect(screen.getByTestId('product-detail-card')).toHaveTextContent('Alpha')
      expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productArchived')
    })

    it('produit retiré du cache SANS archivage lancé d’ici (archivé ailleurs) : « introuvable »', async () => {
      const getProducts = vi.fn().mockResolvedValue([OTHER])
      const client = renderWithRealCache(getProducts)
      client.setQueryData(queryKeys.products.withEvents('user-1'), [OTHER])
      expect(await screen.findByTestId('product-detail-not-found')).toBeInTheDocument()
    })
  })

  /* ------------------------------------------------------------------ #605 */

  describe('#605 — actions du détail (handoff §5 : Nouvel événement · Éditer · Archiver)', () => {
    function renderInShell(openCreate = vi.fn()) {
      render(
        <CreateEventProvider onOpenCreate={openCreate}>
          <ProductDetailView productId="p-alpha" />
        </CreateEventProvider>,
      )
      return openCreate
    }

    it('rend les trois actions dans l’ordre, avec « Archiver » et plus aucun « Supprimer »', () => {
      renderInShell()
      const [newEvent, edit, archive] = [
        'product-detail-new-event',
        'product-detail-edit',
        'product-detail-archive',
      ].map((id) => screen.getByTestId(id))
      expect(newEvent.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(edit.compareDocumentPosition(archive) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(newEvent).toHaveTextContent('products.detail.newEvent')
      expect(edit).toHaveTextContent('products.detail.edit')
      expect(archive).toHaveTextContent('products.detail.archive')
      expect(screen.queryByTestId('product-detail-delete')).not.toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/products\.detail\.delete/)
    })

    it('« Nouvel événement » ouvre LE drawer du shell avec CE produit prérempli', async () => {
      const user = userEvent.setup()
      const openCreate = renderInShell()
      await user.click(screen.getByTestId('product-detail-new-event'))
      expect(openCreate).toHaveBeenCalledTimes(1)
      expect(openCreate).toHaveBeenCalledWith({ productId: 'p-alpha' })
    })

    it('hors shell (contexte `null`) : aucun bouton « Nouvel événement » inerte', () => {
      render(<ProductDetailView productId="p-alpha" />)
      expect(screen.queryByTestId('product-detail-new-event')).not.toBeInTheDocument()
      expect(screen.getByTestId('product-detail-edit')).toBeInTheDocument()
      expect(screen.getByTestId('product-detail-archive')).toBeInTheDocument()
    })

    // Le mock i18n (`ns.key`) ne distingue pas une clé vraie d'une fausse ([[PIT-S63-006]]) :
    // on vérifie les clés elles-mêmes dans les 4 locales servies.
    it('les clés i18n ajoutées existent dans les 4 locales', () => {
      const read = (locale: string, ns: string) =>
        JSON.parse(
          readFileSync(join(process.cwd(), 'public', 'locales', locale, `${ns}.json`), 'utf-8'),
        ) as {
          detail?: Record<string, unknown>
          drawer?: { actions?: Record<string, unknown> }
          toast?: Record<string, unknown>
          deleteDialog?: { product?: Record<string, unknown> }
        }
      const filled = (value: unknown) => typeof value === 'string' && value.length > 0
      for (const locale of ['fr', 'en', 'es', 'de']) {
        const products = read(locale, 'products')
        const common = read(locale, 'common')
        expect(filled(products.detail?.newEvent), `${locale} detail.newEvent`).toBe(true)
        expect(filled(products.detail?.archive), `${locale} detail.archive`).toBe(true)
        expect(products.detail?.delete, `${locale} detail.delete retirée`).toBeUndefined()
        expect(filled(products.drawer?.actions?.archive), `${locale} drawer.actions.archive`).toBe(
          true,
        )
        expect(filled(common.toast?.productArchived), `${locale} toast.productArchived`).toBe(true)
        expect(filled(common.deleteDialog?.product?.confirm), `${locale} product.confirm`).toBe(
          true,
        )
        expect(
          filled(common.deleteDialog?.product?.confirming),
          `${locale} product.confirming`,
        ).toBe(true)
      }
    })
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
      // #575 — le compteur a quitté le `h2` pour l'eyebrow au-dessus du titre.
      expect(screen.getByTestId('product-detail-history-count').textContent).toContain(
        'products.detail.eventsCount',
      )
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
