import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { useUpdateProduct } from './useUpdateProduct'
import type { Product, ProductUpdate } from '@/types/product'

/**
 * #61 — Mutation PATCH partielle : `updateProduct(userId, productId, data)`.
 * L'erreur axios est propagée (contrat DeleteConfirmDialog #65 : rejet inline).
 */
const updateProductMock = vi.fn()

vi.mock('@/services/productService', () => ({
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
}))

const FAKE: Product = {
  id: 'p1',
  name: 'Renommé',
  category: { id: 'c2', name: 'Assurance' },
  events: [],
}

function makeWrapper() {
  const client = new QueryClient({
    // Consomme le rejet interne TanStack (évite l'unhandled rejection jsdom).
    mutationCache: new MutationCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useUpdateProduct', () => {
  beforeEach(() => updateProductMock.mockReset())
  afterEach(() => vi.clearAllMocks())

  it('PATCH le diff partiel via updateProduct', async () => {
    updateProductMock.mockResolvedValue(FAKE)
    const { result } = renderHook(() => useUpdateProduct('user-1'), { wrapper: makeWrapper() })

    const patch: ProductUpdate = { name: 'Renommé' }
    await result.current.mutateAsync({ productId: 'p1', data: patch })

    expect(updateProductMock).toHaveBeenCalledWith('user-1', 'p1', patch)
  })

  // NB : la propagation d'erreur (404 produit supprimé, affichée inline) est
  // couverte end-to-end par `ProductDrawer.test.tsx`. On ne teste pas le rejet
  // d'une mutation TanStack v5 en isolation ici (unhandled rejection jsdom).
})
