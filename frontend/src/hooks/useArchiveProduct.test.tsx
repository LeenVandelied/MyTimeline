import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useArchiveProduct, useIsProductArchivedHere } from './useArchiveProduct'
import { queryKeys } from '@/lib/query-keys'
import type { Product } from '@/types/product'

/**
 * PIT-S92-004 — Archivage produit : `DELETE` via `deleteProduct`, puis (succès seulement)
 * retrait du produit du cache de la liste + invalidation du préfixe `products.all`.
 *
 * ⚠ Piège outillage documenté dans `useSetEventArchived.test.tsx` (Vitest 3.2.7) : un mock
 * partagé réinitialisé en `beforeEach` qui rend une promesse rejetée fait rapporter le rejet
 * comme erreur de test. Remède identique : un `vi.fn()` NEUF par test, porté par un objet
 * mutable (pas un `let` : PIT-S90-009), et les cas d'erreur passent par `mutate`. La
 * propagation du rejet par `mutateAsync` jusqu'au dialog est couverte par les tests des
 * surfaces (`ProductDetailView.test.tsx`, cas d'échec).
 */
const service = vi.hoisted(() => ({
  deleteProduct: (() => undefined) as (...args: unknown[]) => unknown,
}))

vi.mock('@/services/productService', () => ({
  deleteProduct: (...args: unknown[]) => service.deleteProduct(...args),
}))

function product(id: string): Product {
  return {
    id,
    name: id,
    color: null,
    category: { id: 'c-1', name: 'Cat', color: null },
    events: [],
  }
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

const LIST_KEY = queryKeys.products.withEvents('user-1')

describe('useArchiveProduct', () => {
  let deleteProductMock = vi.fn()
  beforeEach(() => {
    deleteProductMock = vi.fn()
    service.deleteProduct = deleteProductMock
  })

  it('DELETE via deleteProduct(userId, productId)', async () => {
    deleteProductMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderHook(() => useArchiveProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    await result.current.mutateAsync({ productId: 'p-1' })

    expect(deleteProductMock).toHaveBeenCalledWith('user-1', 'p-1')
  })

  it('succès : invalide products.all et retire le produit de la liste en cache', async () => {
    deleteProductMock.mockResolvedValue(undefined)
    const client = makeClient()
    client.setQueryData(LIST_KEY, [product('p-1'), product('p-2')])
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useArchiveProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    await result.current.mutateAsync({ productId: 'p-1' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
    expect(client.getQueryData<Product[]>(LIST_KEY)?.map((p) => p.id)).toEqual(['p-2'])
    // Le préfixe invalidé couvre bien la clé de la liste (matching TanStack).
    expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  /**
   * #695 — les compteurs de la carte catégorie sont désormais des champs de
   * `CategoryResponse` (source backend), pas un dérivé client du listing produits :
   * archiver sans invalider `categories.all` laisse la carte affirmer que le produit
   * est encore actif. On assert l'INVALIDATION EFFECTIVE de la query (pas seulement
   * l'appel du spy) : c'est elle qui fait refetcher l'onglet Catégories en place.
   */
  it('#695 — succès : invalide aussi categories.all (compteurs de carte)', async () => {
    deleteProductMock.mockResolvedValue(undefined)
    const client = makeClient()
    client.setQueryData(queryKeys.categories.all, [])
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useArchiveProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    await result.current.mutateAsync({ productId: 'p-1' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all })
    expect(client.getQueryState(queryKeys.categories.all)?.isInvalidated).toBe(true)
  })

  it('échec serveur : erreur exposée telle quelle, ni invalidation ni retrait du cache', async () => {
    const serverError = { response: { status: 404 } }
    deleteProductMock.mockRejectedValue(serverError)
    const client = makeClient()
    client.setQueryData(LIST_KEY, [product('p-1')])
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useArchiveProduct('user-1'), {
      wrapper: makeWrapper(client),
    })

    result.current.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(serverError)
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(client.getQueryData<Product[]>(LIST_KEY)?.map((p) => p.id)).toEqual(['p-1'])
    expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(false)
  })

  it('sans userId : erreur sans appeler le service', async () => {
    const client = makeClient()
    const { result } = renderHook(() => useArchiveProduct(undefined), {
      wrapper: makeWrapper(client),
    })

    result.current.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(deleteProductMock).not.toHaveBeenCalled()
  })
})

describe('useIsProductArchivedHere', () => {
  let deleteProductMock = vi.fn()
  beforeEach(() => {
    deleteProductMock = vi.fn()
    service.deleteProduct = deleteProductMock
  })

  function renderBoth(client: QueryClient, productId: string) {
    return renderHook(
      () => ({
        archive: useArchiveProduct('user-1'),
        archivedHere: useIsProductArchivedHere(productId),
      }),
      { wrapper: makeWrapper(client) },
    )
  }

  it('faux au départ, vrai après un archivage réussi de CE produit', async () => {
    deleteProductMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderBoth(client, 'p-1')
    expect(result.current.archivedHere).toBe(false)

    result.current.archive.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.archivedHere).toBe(true))
  })

  it('reste faux pour un AUTRE produit', async () => {
    deleteProductMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderBoth(client, 'p-2')

    result.current.archive.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.archive.isSuccess).toBe(true))
    expect(result.current.archivedHere).toBe(false)
  })

  it('reste faux après un archivage en échec', async () => {
    deleteProductMock.mockRejectedValue({ response: { status: 409 } })
    const client = makeClient()
    const { result } = renderBoth(client, 'p-1')

    result.current.archive.mutate({ productId: 'p-1' })

    await waitFor(() => expect(result.current.archive.isError).toBe(true))
    expect(result.current.archivedHere).toBe(false)
  })
})
