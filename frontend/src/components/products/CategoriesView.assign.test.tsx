import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import { HANDLES_FORBIDDEN_INLINE } from '@/services/inlineErrorHandling'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { CategoriesView } from './CategoriesView'

/**
 * #604 (revue DL-9) — cohérence de l'affectation : transport de l'option « 403 en ligne »,
 * invalidation en fin de mutation, catégorie optimiste (nom + couleur de la cible), choix
 * désactivés pendant l'envoi, alerte limitée à ce que l'intercepteur ne signale pas,
 * indication d'échec de la liste produits. Vrais hooks et vrais caches TanStack ; seuls les
 * services réseau et les drawers sont simulés. Complète `CategoriesView.test.tsx` (verrouillé).
 */
const updateProductMock = vi.fn()
const getProductsMock = vi.fn()
const getCategoriesMock = vi.fn()

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/categories/CategoryDrawer', () => ({ CategoryDrawer: () => null }))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({ DeleteConfirmDialog: () => null }))
vi.mock('@/services/productService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/productService')>()),
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
  getProducts: (...args: unknown[]) => getProductsMock(...args),
}))
vi.mock('@/services/categoryService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/categoryService')>()),
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

const SERVER_CATEGORIES: Category[] = [
  {
    id: 'c-a',
    name: 'A',
    system: false,
    color: '#445566',
    productCount: 1,
    archivedProductCount: 0,
  },
  {
    id: 'c-b',
    name: 'B',
    system: false,
    color: '#112233',
    productCount: 0,
    archivedProductCount: 0,
  },
]
const SERVER_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    name: 'Voiture',
    color: null,
    category: { id: 'c-a', name: 'A', color: '#445566' },
    events: [],
  },
]

let client: QueryClient

function renderView() {
  client = new QueryClient({
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(<CategoriesView />, { wrapper })
}

const chipsIn = (categoryId: string) =>
  within(screen.getByTestId(`categories-card-${categoryId}`)).queryAllByTestId(/^categories-chip-/)

async function loaded() {
  await waitFor(() => expect(chipsIn('c-a')).toHaveLength(1))
}

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } })

beforeEach(() => {
  vi.clearAllMocks()
  getCategoriesMock.mockResolvedValue(SERVER_CATEGORIES)
  getProductsMock.mockResolvedValue(SERVER_PRODUCTS)
})

describe('#604 — affectation cohérente', () => {
  it('passes the inline-403 option down to updateProduct as 4th argument', async () => {
    const user = userEvent.setup()
    updateProductMock.mockResolvedValue({ ...SERVER_PRODUCTS[0] })
    renderView()
    await loaded()
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1))
    expect(updateProductMock).toHaveBeenCalledWith(
      'user-1',
      'p-1',
      { categoryId: 'c-b' },
      HANDLES_FORBIDDEN_INLINE,
    )
  })

  it('invalidates categories.all and products.all once the mutation succeeds', async () => {
    const user = userEvent.setup()
    updateProductMock.mockResolvedValue({ ...SERVER_PRODUCTS[0] })
    renderView()
    await loaded()
    const spy = vi.spyOn(client, 'invalidateQueries')
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all }))
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })

  it('gives the moved product the name and colour of the target category', async () => {
    const user = userEvent.setup()
    updateProductMock.mockReturnValue(new Promise(() => {}))
    renderView()
    await loaded()
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    await waitFor(() => expect(chipsIn('c-b')).toHaveLength(1))
    const cached = client.getQueryData<Product[]>(queryKeys.products.withEvents('user-1'))
    expect(cached?.[0].category).toEqual({ id: 'c-b', name: 'B', color: '#112233' })
  })

  it('disables every category choice while a request is in flight', async () => {
    const user = userEvent.setup()
    updateProductMock.mockReturnValue(new Promise(() => {}))
    renderView()
    await loaded()
    expect(screen.getByTestId('categories-assign-p-1')).toBeEnabled()
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    await waitFor(() => expect(screen.getByTestId('categories-assign-p-1')).toBeDisabled())
  })

  it('shows no local alert on a 500, which the interceptor already reports', async () => {
    const user = userEvent.setup()
    updateProductMock.mockRejectedValue(httpError(500))
    renderView()
    await loaded()
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    // Le retour arrière a eu lieu : la mutation est bien allée jusqu'à l'échec.
    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTestId('categories-assign-p-1')).toBeEnabled())
    await waitFor(() => expect(chipsIn('c-a')).toHaveLength(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([403, 404, 409])('shows the local alert on a %i', async (status) => {
    const user = userEvent.setup()
    updateProductMock.mockRejectedValue(httpError(status))
    renderView()
    await loaded()
    await user.selectOptions(screen.getByTestId('categories-assign-p-1'), 'c-b')
    expect(await screen.findByRole('alert')).toHaveTextContent('products.categories.assignError')
  })

  it('tells the user when the product list fails to load, counters unaffected', async () => {
    getProductsMock.mockRejectedValue(httpError(500))
    renderView()
    expect(await screen.findByTestId('categories-products-error')).toHaveTextContent(
      'products.categories.productsError',
    )
    expect(screen.getByTestId('categories-count-c-a')).toBeInTheDocument()
    expect(chipsIn('c-a')).toHaveLength(0)
  })
})
