import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProductsWithEvents } from './useProductsWithEvents'
import type { Product } from '@/types/product'

/**
 * #48 — Le hook pilote ne régresse pas : il sert les produits (events
 * embarqués) via le service axios `getProducts`, mis en cache par TanStack.
 * Vérifie aussi `enabled` (pas d'appel sans userId).
 */

const getProductsMock = vi.fn()

vi.mock('@/services/productService', () => ({
  getProducts: (...args: unknown[]) => getProductsMock(...args),
}))

const FAKE_PRODUCTS: Product[] = [
  {
    id: '018f3a2b-0000-7000-8000-000000000010',
    name: 'Projet Alpha',
    color: null,
    category: { id: '018f3a2b-0000-7000-8000-0000000000c1', name: 'Travail', color: '#334455' },
    events: [],
  },
]

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useProductsWithEvents', () => {
  beforeEach(() => {
    getProductsMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('charge les produits via getProducts pour un userId donné', async () => {
    getProductsMock.mockResolvedValue(FAKE_PRODUCTS)

    const { result } = renderHook(() => useProductsWithEvents('user-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(FAKE_PRODUCTS)
    expect(getProductsMock).toHaveBeenCalledTimes(1)
    expect(getProductsMock).toHaveBeenCalledWith('user-1')
  })

  it('ne déclenche aucun appel tant que userId est absent (enabled=false)', async () => {
    const { result } = renderHook(() => useProductsWithEvents(undefined), {
      wrapper: makeWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getProductsMock).not.toHaveBeenCalled()
  })
})
