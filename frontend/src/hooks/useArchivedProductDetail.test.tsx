import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { shouldRetryArchivedDetail, useArchivedProductDetail } from './useArchivedProductDetail'

/**
 * #718 — Fiche archivée : aucun appel pour un identifiant qui n'est pas un UUID (le backend
 * répondrait 400 + toast global), relance réservée aux 5xx et aux erreurs réseau.
 */
const service = vi.hoisted(() => ({
  getArchivedProductDetail: (() => undefined) as (...args: unknown[]) => unknown,
}))
vi.mock('@/services/productService', () => ({
  getArchivedProductDetail: (...args: unknown[]) => service.getArchivedProductDetail(...args),
}))

const UUID = 'd4b0e1a2-7c3f-4e5a-9b6d-1a2b3c4d5e6f'

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useArchivedProductDetail', () => {
  let getMock = vi.fn()
  beforeEach(() => {
    getMock = vi.fn()
    service.getArchivedProductDetail = getMock
  })

  it('identifiant non UUID : aucun appel réseau', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useArchivedProductDetail('user-1', 'p-arch'), {
      wrapper: wrapperFor(client),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.isLoading).toBe(false)
    expect(getMock).not.toHaveBeenCalled()
  })

  it('sans userId : aucun appel réseau', () => {
    const client = new QueryClient()
    renderHook(() => useArchivedProductDetail(undefined, UUID), { wrapper: wrapperFor(client) })
    expect(getMock).not.toHaveBeenCalled()
  })

  it('UUID valide : appelle le service avec (userId, productId)', async () => {
    getMock.mockResolvedValue({ id: UUID })
    const client = new QueryClient()
    const { result } = renderHook(() => useArchivedProductDetail('user-1', UUID), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.data).toEqual({ id: UUID }))
    expect(getMock).toHaveBeenCalledWith('user-1', UUID)
  })

  it('404 : un seul appel, jamais rejoué', async () => {
    getMock.mockRejectedValue({ response: { status: 404 } })
    const client = new QueryClient()
    const { result } = renderHook(() => useArchivedProductDetail('user-1', UUID), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getMock).toHaveBeenCalledTimes(1)
  })
})

describe('shouldRetryArchivedDetail', () => {
  it.each([
    [0, { response: { status: 500 } }, true],
    [0, { response: { status: 503 } }, true],
    [0, new Error('Network Error'), true],
    [1, { response: { status: 500 } }, false],
    [0, { response: { status: 400 } }, false],
    [0, { response: { status: 403 } }, false],
    [0, { response: { status: 404 } }, false],
  ])('failureCount %i, erreur %j -> %s', (count, error, expected) => {
    expect(shouldRetryArchivedDetail(count, error)).toBe(expected)
  })
})
