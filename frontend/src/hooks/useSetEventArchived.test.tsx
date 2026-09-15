import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { useSetEventArchived } from './useSetEventArchived'
import { queryKeys } from '@/lib/query-keys'

/**
 * #307 — Mutation (dés)archivage : appelle `setEventArchived(id, archived, version)` et
 * invalide `products.all` (préfixe couvrant `products.withEvents`, source de la frise et
 * de l'historique). Le 409 (BR-EVE-015) invalide AUSSI : sans re-fetch, le re-clic
 * repartirait de la MÊME version périmée → boucle de conflits.
 *
 * ⚠ PIÈGE OUTILLAGE (mesuré ici, Vitest 3.2.7) : un mock de module PARTAGÉ qui rend une
 * promesse REJETÉE, combiné à `mockReset()`/`mockClear()` en `beforeEach`, fait rapporter
 * la valeur de rejet comme une ERREUR DE TEST (`Serialized Error`, message `undefined`)
 * alors que le rejet EST traité par le code. Vérifié : le même test passe sans le
 * `beforeEach`, et échoue avec `mockReset`, `mockClear` ou une promesse pré-`catch`ée.
 * Remède retenu : RECRÉER un `vi.fn()` à chaque test (la fabrique du mock module délègue
 * dynamiquement) plutôt que réinitialiser un mock partagé. Cf. PIT-S11-002, dont c'est
 * une variante : les cas d'erreur passent en outre par `mutate` (jamais `mutateAsync`,
 * qui remonte un unhandled rejection au runner sous renderHook/jsdom).
 */
let setEventArchivedMock = vi.fn()

vi.mock('@/services/eventService', () => ({
  setEventArchived: (...args: unknown[]) => setEventArchivedMock(...args),
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

describe('useSetEventArchived', () => {
  beforeEach(() => {
    setEventArchivedMock = vi.fn()
  })

  it('PATCH le flag archived avec la version détenue', async () => {
    setEventArchivedMock.mockResolvedValue(undefined)
    const client = makeClient()
    const { result } = renderHook(() => useSetEventArchived(), { wrapper: makeWrapper(client) })

    await result.current.mutateAsync({ id: 'evt-1', archived: false, version: 7 })

    expect(setEventArchivedMock).toHaveBeenCalledWith('evt-1', false, 7)
  })

  it('invalide products.all sur succès', async () => {
    setEventArchivedMock.mockResolvedValue(undefined)
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSetEventArchived(), { wrapper: makeWrapper(client) })

    await result.current.mutateAsync({ id: 'evt-1', archived: false })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })

  it('invalide products.all sur 409 (version périmée)', async () => {
    setEventArchivedMock.mockRejectedValue({ response: { status: 409 } })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSetEventArchived(), { wrapper: makeWrapper(client) })

    result.current.mutate({ id: 'evt-1', archived: false, version: 1 })

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.products.all }),
    )
  })

  it('n’invalide PAS sur une erreur non-conflit (rien n’est périmé)', async () => {
    setEventArchivedMock.mockRejectedValue({ response: { status: 403 } })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSetEventArchived(), { wrapper: makeWrapper(client) })

    result.current.mutate({ id: 'evt-1', archived: false })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
