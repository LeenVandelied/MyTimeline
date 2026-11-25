import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAssignProductCategory } from './useAssignProductCategory'
import { queryKeys } from '@/lib/query-keys'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'

/**
 * #604 — Affectation d'un produit à une catégorie : mise à jour optimiste des caches
 * `products.withEvents(userId)` et `categories.all`, retour exact à l'état précédent si le
 * PATCH est refusé. Le PATCH est `updateProduct(userId, productId, { categoryId }, options?)`.
 */
const updateProductMock = vi.fn()

vi.mock('@/services/productService', () => ({
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
}))

const USER = 'user-1'

const PRODUCTS: Product[] = [
  {
    id: 'p-1',
    name: 'Voiture',
    color: null,
    category: { id: 'c-1', name: 'Véhicules', color: null },
    events: [],
  },
]
const CATEGORIES: Category[] = [
  { id: 'c-1', name: 'Véhicules', system: false, productCount: 1, archivedProductCount: 0 },
  { id: 'c-2', name: 'Assurance', system: false, productCount: 0, archivedProductCount: 1 },
]

function makeClient() {
  return new QueryClient({
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

describe('useAssignProductCategory', () => {
  beforeEach(() => {
    updateProductMock.mockReset()
  })

  it('restores the previous cache when the update fails', async () => {
    let rejectUpdate: (e: unknown) => void = () => {}
    updateProductMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectUpdate = reject
      }),
    )
    const client = makeClient()
    const productsKey = queryKeys.products.withEvents(USER)
    client.setQueryData(productsKey, PRODUCTS)
    client.setQueryData(queryKeys.categories.all, CATEGORIES)
    const productsBefore = structuredClone(client.getQueryData(productsKey))
    const categoriesBefore = structuredClone(client.getQueryData(queryKeys.categories.all))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useAssignProductCategory(USER), { wrapper })

    await act(async () => {
      result.current.mutate({ productId: 'p-1', categoryId: 'c-2' })
    })

    // Le PATCH part avec la catégorie cible, et les deux caches ont déjà bougé : sans ce
    // changement préalable, « revenir à l'état d'avant » serait vrai sans rien faire.
    await waitFor(() => expect(updateProductMock).toHaveBeenCalled())
    expect(updateProductMock.mock.calls[0].slice(0, 3)).toEqual([
      USER,
      'p-1',
      { categoryId: 'c-2' },
    ])
    expect(client.getQueryData(productsKey)).not.toEqual(productsBefore)
    expect(client.getQueryData(queryKeys.categories.all)).not.toEqual(categoriesBefore)

    await act(async () => {
      rejectUpdate(Object.assign(new Error('refusé'), { response: { status: 403 } }))
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(client.getQueryData(productsKey)).toEqual(productsBefore)
    expect(client.getQueryData(queryKeys.categories.all)).toEqual(categoriesBefore)
  })
})
