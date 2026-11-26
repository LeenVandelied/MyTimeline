import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchivedProduct } from '@/types/product'
import { ArchivedProductsView } from './ArchivedProductsView'

/**
 * #711 — Onglet « Archivés » : états (chargement / erreur / vide / tableau), colonnes
 * réduites (revue Designer), branchement Désarchiver → dialog → mutation → toast au succès
 * seulement. Le dialog RÉEL est rendu (pas mocké) : on prouve la chaîne clic → confirmation.
 * La logique de cache est couverte par `useRestoreProduct.test.tsx`.
 */
const useArchivedMock = vi.fn()
const restoreMutateAsync = vi.fn()
const useRestoreSpy = vi.fn()
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/hooks/useArchivedProducts', () => ({
  useArchivedProducts: (...args: unknown[]) => useArchivedMock(...args),
}))
vi.mock('@/hooks/useRestoreProduct', () => ({
  useRestoreProduct: (...args: unknown[]) => {
    useRestoreSpy(...args)
    return { mutateAsync: restoreMutateAsync }
  },
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
  toast: { success: toastSuccessMock, error: vi.fn() },
}))

const PRODUCTS: ArchivedProduct[] = [
  {
    id: 'p-1',
    name: 'Vélo',
    color: null,
    category: { id: 'c-1', name: 'Sport', color: '#112233' },
  },
  {
    id: 'p-2',
    name: 'Box',
    color: '#abcdef',
    category: { id: 'c-2', name: 'Maison', color: null },
  },
]

function queryState(
  overrides: Partial<{ data: ArchivedProduct[]; isLoading: boolean; isError: boolean }>,
) {
  return { data: undefined, isLoading: false, isError: false, ...overrides }
}

describe('ArchivedProductsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('interroge les archivés et branche la mutation sur l’utilisateur courant', () => {
    useArchivedMock.mockReturnValue(queryState({ data: [] }))
    render(<ArchivedProductsView />)

    expect(useArchivedMock).toHaveBeenCalledWith('user-1')
    expect(useRestoreSpy).toHaveBeenCalledWith('user-1')
  })

  it('chargement : squelette', () => {
    useArchivedMock.mockReturnValue(queryState({ isLoading: true }))
    render(<ArchivedProductsView />)

    expect(screen.getByTestId('products-archived-loading')).toBeInTheDocument()
  })

  it('erreur : message en role=alert', () => {
    useArchivedMock.mockReturnValue(queryState({ isError: true }))
    render(<ArchivedProductsView />)

    expect(screen.getByTestId('products-archived-error')).toHaveAttribute('role', 'alert')
  })

  it('vide : EmptyState sans action', () => {
    useArchivedMock.mockReturnValue(queryState({ data: [] }))
    render(<ArchivedProductsView />)

    const empty = screen.getByTestId('products-archived-empty')
    expect(empty).toHaveTextContent('products.archived.empty')
    expect(within(empty).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('products-archived-table')).not.toBeInTheDocument()
  })

  it('tableau : colonnes Produit + Actions seulement, nom + catégorie, bouton Désarchiver par ligne', () => {
    useArchivedMock.mockReturnValue(queryState({ data: PRODUCTS }))
    render(<ArchivedProductsView />)

    const table = screen.getByTestId('products-archived-table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['products.archived.columns.product', 'products.archived.columns.actions'])
    const row = screen.getByTestId('products-archived-row-p-1')
    expect(row).toHaveTextContent('Vélo')
    expect(screen.getByTestId('products-archived-row-category-p-1')).toHaveTextContent('Sport')
    // Ligne non cliquable : le détail d'un archivé est introuvable tant qu'il n'est pas restauré.
    expect(row).not.toHaveAttribute('role', 'link')
    expect(screen.getByTestId('products-archived-restore-p-2')).toHaveTextContent(
      'products.archived.restore',
    )
  })

  it('Désarchiver → confirmation → mutation sur CE produit → toast au succès', async () => {
    const user = userEvent.setup()
    restoreMutateAsync.mockResolvedValue(undefined)
    useArchivedMock.mockReturnValue(queryState({ data: PRODUCTS }))
    render(<ArchivedProductsView />)

    await user.click(screen.getByTestId('products-archived-restore-p-2'))
    expect(await screen.findByTestId('product-restore-confirm')).toBeInTheDocument()
    expect(restoreMutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    await waitFor(() => expect(restoreMutateAsync).toHaveBeenCalledWith({ productId: 'p-2' }))
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('common.toast.productRestored'),
    )
  })

  it('échec de la mutation : erreur inline dans le dialog, aucun toast', async () => {
    const user = userEvent.setup()
    restoreMutateAsync.mockRejectedValue({ response: { status: 404 } })
    useArchivedMock.mockReturnValue(queryState({ data: PRODUCTS }))
    render(<ArchivedProductsView />)

    await user.click(screen.getByTestId('products-archived-restore-p-1'))
    await user.click(await screen.findByTestId('product-restore-confirm-button'))

    expect(await screen.findByTestId('product-restore-error')).toHaveAttribute(
      'data-kind',
      'notFound',
    )
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  // #718 — le nom de chaque produit mène à sa fiche en lecture seule ; Désarchiver reste actif.
  it('links each archived row to its read-only product page', async () => {
    const user = userEvent.setup()
    restoreMutateAsync.mockResolvedValue(undefined)
    useArchivedMock.mockReturnValue(queryState({ data: PRODUCTS }))
    render(<ArchivedProductsView />)

    const velo = within(screen.getByTestId('products-archived-row-p-1')).getByRole('link', {
      name: 'Vélo',
    })
    expect(velo).toHaveAttribute('href', '/fr/products/p-1')
    const box = within(screen.getByTestId('products-archived-row-p-2')).getByRole('link', {
      name: 'Box',
    })
    expect(box).toHaveAttribute('href', '/fr/products/p-2')

    await user.click(screen.getByTestId('products-archived-restore-p-2'))
    await user.click(await screen.findByTestId('product-restore-confirm-button'))
    await waitFor(() => expect(restoreMutateAsync).toHaveBeenCalledWith({ productId: 'p-2' }))
  })

  // #719 — filtre par catégorie : trois archivés dans deux catégories.
  const THREE: ArchivedProduct[] = [
    ...PRODUCTS,
    {
      id: 'p-3',
      name: 'Casque',
      color: null,
      category: { id: 'c-1', name: 'Sport', color: '#112233' },
    },
  ]

  it('lists only the archived products of the filtered category', () => {
    useArchivedMock.mockReturnValue(queryState({ data: THREE }))
    render(<ArchivedProductsView categoryId="c-1" onClearCategoryFilter={vi.fn()} />)

    expect(screen.getByTestId('products-archived-row-p-1')).toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-3')).toBeInTheDocument()
    expect(screen.queryByTestId('products-archived-row-p-2')).not.toBeInTheDocument()
  })

  it('shows the filtering category name with a control to clear the filter', () => {
    useArchivedMock.mockReturnValue(queryState({ data: THREE }))
    render(<ArchivedProductsView categoryId="c-1" onClearCategoryFilter={vi.fn()} />)

    const chip = screen.getByTestId('products-archived-filter')
    expect(chip).toHaveTextContent('Sport')
    expect(within(chip).getByTestId('products-archived-filter-clear')).toBeInTheDocument()
  })

  it('shows every archived product again once the filter is cleared', async () => {
    const user = userEvent.setup()
    useArchivedMock.mockReturnValue(queryState({ data: THREE }))
    function Harness() {
      const [categoryId, setCategoryId] = useState<string | undefined>('c-1')
      return (
        <ArchivedProductsView
          categoryId={categoryId}
          onClearCategoryFilter={() => setCategoryId(undefined)}
        />
      )
    }
    render(<Harness />)
    expect(screen.queryByTestId('products-archived-row-p-2')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('products-archived-filter-clear'))

    expect(screen.getByTestId('products-archived-row-p-1')).toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-2')).toBeInTheDocument()
    expect(screen.getByTestId('products-archived-row-p-3')).toBeInTheDocument()
    expect(screen.queryByTestId('products-archived-filter')).not.toBeInTheDocument()
  })
})
