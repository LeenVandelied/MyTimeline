import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { useDeleteCategory } from './useDeleteCategory'
import { queryKeys } from '@/lib/query-keys'

/**
 * #245 — Mutation suppression : appelle `deleteCategory(id, reassignToCategoryId)`
 * et invalide sur succès les 2 query keys `categories.all` + `products.all`
 * (le préfixe `['products']` couvre `products.withEvents`).
 */
const deleteCategoryMock = vi.fn()

vi.mock('@/services/categoryService', () => ({
  deleteCategory: (...args: unknown[]) => deleteCategoryMock(...args),
}))

function makeClient() {
  return new QueryClient({
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useDeleteCategory', () => {
  beforeEach(() => deleteCategoryMock.mockReset())
  afterEach(() => vi.clearAllMocks())

  it('DELETE via deleteCategory avec la cible de réassignation', async () => {
    deleteCategoryMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: makeWrapper(client) })

    await result.current.mutateAsync({ id: 'cat-1', reassignToCategoryId: 'cat-2' })

    expect(deleteCategoryMock).toHaveBeenCalledWith('cat-1', 'cat-2')
  })

  it('invalide categories.all + products.all sur succès', async () => {
    deleteCategoryMock.mockResolvedValue(undefined)
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: makeWrapper(client) })

    await result.current.mutateAsync({ id: 'cat-1' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })

  // NB : la propagation du rejet (409 lisible inline) est couverte end-to-end par
  // CategoryDrawer/CategoriesView + E2E. On ne la teste pas ici en isolation :
  // rejeter une mutation TanStack v5 sous renderHook/jsdom fait remonter un
  // unhandled rejection au runner (même convention que useCreateProduct.test).
})
