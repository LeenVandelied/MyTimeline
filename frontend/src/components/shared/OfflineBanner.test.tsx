import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { OfflineBanner } from './OfflineBanner'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { networkStatusStore } from '@/services/networkStatus'

/**
 * #76 — Bannière réseau + bus d'état.
 * next-intl mocké → assertions locale-agnostiques (clés). On pilote l'état via
 * `navigator.onLine` + événements et via `networkStatusStore` (côté transport).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

function renderBanner(client?: QueryClient) {
  const queryClient =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusProvider>{children}</NetworkStatusProvider>
    </QueryClientProvider>
  )
  return render(<OfflineBanner />, { wrapper })
}

describe('OfflineBanner', () => {
  // Reset AVANT chaque test (aucun composant monté → aucune MAJ hors act).
  // RTL démonte le rendu précédent via son cleanup automatique.
  beforeEach(() => {
    setOnline(true)
    networkStatusStore.clear()
  })

  it('ne rend rien quand en ligne et sans erreur réseau', () => {
    renderBanner()
    expect(screen.queryByTestId('network-banner')).toBeNull()
  })

  it('affiche la bannière offline (role=status) sans bouton Réessayer en mode avion', () => {
    setOnline(false)
    renderBanner()
    const banner = screen.getByTestId('network-banner')
    expect(banner).toHaveAttribute('data-state', 'offline')
    expect(banner).toHaveAttribute('role', 'status')
    expect(screen.queryByTestId('network-banner-retry')).toBeNull()
  })

  it('affiche la bannière timeout (role=alert) avec bouton Réessayer', () => {
    renderBanner()
    act(() => {
      networkStatusStore.reportTimeout()
    })
    const banner = screen.getByTestId('network-banner')
    expect(banner).toHaveAttribute('data-state', 'timeout')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(screen.getByTestId('network-banner-retry')).toBeInTheDocument()
  })

  it('affiche la bannière server-error (role=alert) avec bouton Réessayer', () => {
    renderBanner()
    act(() => {
      networkStatusStore.reportServerError()
    })
    const banner = screen.getByTestId('network-banner')
    expect(banner).toHaveAttribute('data-state', 'server-error')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(screen.getByTestId('network-banner-retry')).toBeInTheDocument()
  })

  it('priorité offline > erreur serveur (offline masque le timeout)', () => {
    renderBanner()
    act(() => {
      networkStatusStore.reportServerError()
    })
    act(() => {
      setOnline(false)
    })
    const banner = screen.getByTestId('network-banner')
    expect(banner).toHaveAttribute('data-state', 'offline')
    expect(banner).toHaveAttribute('role', 'status')
  })

  it('le retour en ligne fait disparaître la bannière offline sans action', async () => {
    setOnline(false)
    renderBanner()
    expect(screen.getByTestId('network-banner')).toHaveAttribute('data-state', 'offline')
    act(() => {
      setOnline(true)
    })
    await waitFor(() => expect(screen.queryByTestId('network-banner')).toBeNull())
  })

  it('affiche l’état retrying pendant le re-essai (refetch en cours)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Refetch qui ne se résout jamais → l'état retrying reste observable.
    vi.spyOn(client, 'refetchQueries').mockReturnValue(new Promise(() => {}) as never)
    renderBanner(client)
    act(() => {
      networkStatusStore.reportTimeout()
    })
    await userEvent.click(screen.getByTestId('network-banner-retry'))
    const banner = screen.getByTestId('network-banner')
    expect(banner).toHaveAttribute('data-state', 'retrying')
    expect(banner).toHaveAttribute('role', 'status')
    expect(screen.queryByTestId('network-banner-retry')).toBeNull()
  })

  it('un re-essai résolu efface la bannière', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Refetch contrôlé : on résout explicitement DANS act pour que le `.finally`
    // (clear + retrying=false) soit flushé sous act (zéro warning stderr).
    let resolveRefetch: () => void = () => {}
    vi.spyOn(client, 'refetchQueries').mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefetch = resolve
      }) as never,
    )
    renderBanner(client)
    act(() => {
      networkStatusStore.reportServerError()
    })
    await userEvent.click(screen.getByTestId('network-banner-retry'))
    await act(async () => {
      resolveRefetch()
      await Promise.resolve()
    })
    expect(screen.queryByTestId('network-banner')).toBeNull()
  })
})
