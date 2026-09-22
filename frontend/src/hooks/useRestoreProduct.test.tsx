import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRestoreProduct } from './useRestoreProduct'
import { queryKeys } from '@/lib/query-keys'
import type { ArchivedProduct, Product } from '@/types/product'

/**
 * #711 — Désarchivage produit : `POST …/restore` via `restoreProduct`, puis (succès
 * seulement) retrait de la ligne du cache des archivés + invalidation `products.all` ET
 * `categories.all`. PIT-S92-004 : on vérifie l'ÉTAT DU CACHE après la mutation (en place),
 * pas seulement l'appel à `invalidateQueries`.
 *
 * Mêmes remèdes outillage que `useArchiveProduct.test.tsx` (PIT-S92-007) : `vi.fn()` neuf par
 * test porté par un objet mutable ; les cas d'échec passent par `mutate` + `isError`.
 */
const service = vi.hoisted(() => ({
  restoreProduct: (() => undefined) as (...args: unknown[]) => unknown,
}))

vi.mock('@/services/productService', () => ({
  restoreProduct: (...args: unknown[]) => service.restoreProduct(...args),
}))

function archived(id: string): ArchivedProduct {
  return { id, name: id, color: null, category: { id: 'c-1', name: 'Cat', color: null } }
}

function active(id: string): Product {
  return { ...archived(id), events: [] }
}

function makeClient() {
  return new QueryClient({
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const ARCHIVED_KEY = queryKeys.products.archived('user-1')
const LIST_KEY = queryKeys.products.withEvents('user-1')
const CATEGORIES_KEY = queryKeys.categories.all

describe('useRestoreProduct', () => {
  let restoreMock = vi.fn()
  beforeEach(() => {
    restoreMock = vi.fn()
    service.restoreProduct = restoreMock
  })

  it('POST via restoreProduct(userId, productId)', async () => {
    restoreMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderHook(() => useRestoreProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    await result.current.mutateAsync({ productId: 'p-1' })

    expect(restoreMock).toHaveBeenCalledWith('user-1', 'p-1')
  })

  it('succès : ligne retirée des archivés EN PLACE, liste produits et catégories invalidées', async () => {
    restoreMock.mockResolvedValue(undefined)
    const client = makeClient()
    client.setQueryData(ARCHIVED_KEY, [archived('p-1'), archived('p-2')])
    client.setQueryData(LIST_KEY, [active('p-3')])
    client.setQueryData(CATEGORIES_KEY, [])
    const { result } = renderHook(() => useRestoreProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    await result.current.mutateAsync({ productId: 'p-1' })

    expect(client.getQueryData<ArchivedProduct[]>(ARCHIVED_KEY)?.map((p) => p.id)).toEqual(['p-2'])
    // La liste active n'est PAS complétée localement (pas d'events dans la réponse des
    // archivés) : elle est invalidée pour être relue, produit ET événements compris.
    expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
    expect(client.getQueryState(ARCHIVED_KEY)?.isInvalidated).toBe(true)
    expect(client.getQueryState(CATEGORIES_KEY)?.isInvalidated).toBe(true)
  })

  it('échec 404 : erreur exposée, archivés invalidés mais NON modifiés, liste active intacte', async () => {
    const notFound = { response: { status: 404 } }
    restoreMock.mockRejectedValue(notFound)
    const client = makeClient()
    client.setQueryData(ARCHIVED_KEY, [archived('p-1')])
    client.setQueryData(LIST_KEY, [active('p-3')])
    const { result } = renderHook(() => useRestoreProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    result.current.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(notFound)
    expect(client.getQueryData<ArchivedProduct[]>(ARCHIVED_KEY)?.map((p) => p.id)).toEqual(['p-1'])
    expect(client.getQueryState(ARCHIVED_KEY)?.isInvalidated).toBe(true)
    expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(false)
  })

  it('échec générique (500) : aucune invalidation', async () => {
    restoreMock.mockRejectedValue({ response: { status: 500 } })
    const client = makeClient()
    client.setQueryData(ARCHIVED_KEY, [archived('p-1')])
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useRestoreProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    result.current.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('sans userId : erreur sans appeler le service', async () => {
    const client = makeClient()
    const { result } = renderHook(() => useRestoreProduct(undefined), {
      wrapper: makeWrapper(client),
    })

    result.current.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(restoreMock).not.toHaveBeenCalled()
  })
})
