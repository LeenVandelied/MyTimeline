import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { useCreateProduct } from './useCreateProduct'
import type { Product, ProductCreate } from '@/types/product'

/**
 * #61 — Mutation création : appelle `createProduct(userId, data)` et invalide le
 * cache produits sur succès. `enabled` implicite : rejette si `userId` absent.
 */
const createProductMock = vi.fn()

vi.mock('@/services/productService', () => ({
  createProduct: (...args: unknown[]) => createProductMock(...args),
}))

const FAKE: Product = {
  id: 'p1',
  name: 'Voiture',
  category: { id: 'c1', name: 'Véhicules' },
  events: [],
}

function makeWrapper() {
  const client = new QueryClient({
    // `onError` no-op sur la MutationCache : consomme le rejet interne de
    // TanStack pour éviter qu'un test « erreur » ne remonte en unhandled
    // rejection au runner (jsdom). Le test lit ensuite `result.current.error`.
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useCreateProduct', () => {
  beforeEach(() => createProductMock.mockReset())
  afterEach(() => vi.clearAllMocks())

  it('POST le produit via createProduct pour un userId donné', async () => {
    createProductMock.mockResolvedValue(FAKE)
    const { result } = renderHook(() => useCreateProduct('user-1'), { wrapper: makeWrapper() })

    const payload: ProductCreate = { name: 'Voiture', category: 'c1' }
    await result.current.mutateAsync(payload)

    expect(createProductMock).toHaveBeenCalledWith('user-1', payload)
  })

  it('rejette sans appeler le service si userId absent', async () => {
    const { result } = renderHook(() => useCreateProduct(undefined), { wrapper: makeWrapper() })

    const caught = await result.current
      .mutateAsync({ name: 'X', category: 'c1' })
      .then(() => undefined)
      .catch((e: unknown) => e)

    expect(caught).toBeInstanceOf(Error)
    expect(createProductMock).not.toHaveBeenCalled()
  })

  // NB : la propagation d'erreur (isError, statut 409/404 lisible inline) est
  // couverte end-to-end par `ProductDrawer.test.tsx` (« conflit 409 »). On ne la
  // duplique pas ici : tester le rejet d'une mutation TanStack v5 en isolation
  // (renderHook + jsdom) fait remonter un unhandled rejection au runner.
})
