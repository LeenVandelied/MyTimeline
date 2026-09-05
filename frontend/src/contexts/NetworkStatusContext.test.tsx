import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

import { NetworkStatusProvider, useNetworkStatus } from './NetworkStatusContext'
import { networkStatusStore } from '@/services/networkStatus'

/**
 * #237 — `retry()` ne doit relancer QUE les requêtes en échec et montées.
 *
 * Le test ne se contente pas d'observer « un refetch a eu lieu » : il monte
 * DEUX requêtes (une `error`, une `success`) plus une troisième en erreur mais
 * démontée, et vérifie le compteur d'appels de CHACUNE. Sans le predicate, la
 * requête saine repasse à 2 appels et le test rougit (contrôle négatif joué).
 */

/** Compteurs d'appels des `queryFn`, réinitialisés par test. */
let okCalls = 0
let koCalls = 0
let orphanCalls = 0

const okQueryFn = vi.fn(async () => {
  okCalls += 1
  return 'ok'
})

const koQueryFn = vi.fn(async () => {
  koCalls += 1
  throw new Error('boom')
})

const orphanQueryFn = vi.fn(async () => {
  orphanCalls += 1
  throw new Error('orphan boom')
})

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 0 } },
  })
}

/** Monte les deux requêtes observées + le bouton câblé sur `retry()`. */
function Probe() {
  const { retry, isRetrying } = useNetworkStatus()
  const ok = useQuery({ queryKey: ['probe', 'ok'], queryFn: okQueryFn })
  const ko = useQuery({ queryKey: ['probe', 'ko'], queryFn: koQueryFn })

  return (
    <div>
      <span data-testid="ok-status">{ok.status}</span>
      <span data-testid="ko-status">{ko.status}</span>
      <span data-testid="retrying">{String(isRetrying)}</span>
      <button type="button" data-testid="retry" onClick={retry}>
        Réessayer
      </button>
    </div>
  )
}

function renderProbe(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    </QueryClientProvider>,
  )
}

describe('NetworkStatusContext — retry()', () => {
  beforeEach(() => {
    okCalls = 0
    koCalls = 0
    orphanCalls = 0
    okQueryFn.mockClear()
    koQueryFn.mockClear()
    orphanQueryFn.mockClear()
    networkStatusStore.clear()
  })

  it('relance la requête en erreur et laisse la requête en succès intacte', async () => {
    const user = userEvent.setup()
    const queryClient = makeClient()
    renderProbe(queryClient)

    // Les deux requêtes se sont résolues, chacune une seule fois.
    await waitFor(() => {
      expect(screen.getByTestId('ok-status')).toHaveTextContent('success')
      expect(screen.getByTestId('ko-status')).toHaveTextContent('error')
    })
    expect(okCalls).toBe(1)
    expect(koCalls).toBe(1)

    await user.click(screen.getByTestId('retry'))

    // La requête en erreur est rejouée…
    await waitFor(() => expect(koCalls).toBe(2))
    // …et la requête saine ne l'est PAS. C'est l'assertion qui distingue un
    // predicate correct d'un predicate absent (sans lui, `okCalls` vaudrait 2).
    expect(okCalls).toBe(1)
  })

  it('ne relance pas une requête en erreur dont aucun observateur n’est monté', async () => {
    const user = userEvent.setup()
    const queryClient = makeClient()

    // Requête en erreur SANS observateur → `type: 'active'` doit l'exclure.
    await queryClient
      .fetchQuery({ queryKey: ['orphan'], queryFn: orphanQueryFn, retry: false })
      .catch(() => undefined)
    expect(orphanCalls).toBe(1)
    expect(queryClient.getQueryState(['orphan'])?.status).toBe('error')

    renderProbe(queryClient)
    await waitFor(() => expect(screen.getByTestId('ko-status')).toHaveTextContent('error'))

    await user.click(screen.getByTestId('retry'))

    await waitFor(() => expect(koCalls).toBe(2))
    expect(orphanCalls).toBe(1)
  })

  it('efface la bannière et sort de `isRetrying` même sans aucune requête en erreur', async () => {
    const user = userEvent.setup()
    const queryClient = makeClient()

    function OkOnly() {
      const { retry, isRetrying } = useNetworkStatus()
      const ok = useQuery({ queryKey: ['probe', 'ok'], queryFn: okQueryFn })
      return (
        <div>
          <span data-testid="ok-status">{ok.status}</span>
          <span data-testid="retrying">{String(isRetrying)}</span>
          <button type="button" data-testid="retry" onClick={retry}>
            Réessayer
          </button>
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <NetworkStatusProvider>
          <OkOnly />
        </NetworkStatusProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('ok-status')).toHaveTextContent('success'))
    // `act` : le store notifie le `useSyncExternalStore` du provider monté.
    act(() => networkStatusStore.reportServerError())
    expect(networkStatusStore.getIssue()).toBe('server-error')
    const callsBefore = okCalls

    await user.click(screen.getByTestId('retry'))

    // `clear()` du `finally` inchangé : la bannière retombe…
    await waitFor(() => {
      expect(networkStatusStore.getIssue()).toBeNull()
      expect(screen.getByTestId('retrying')).toHaveTextContent('false')
    })
    // …sans qu'aucune requête n'ait été rejouée (aucune n'était en erreur).
    expect(okCalls).toBe(callsBefore)
  })
})
