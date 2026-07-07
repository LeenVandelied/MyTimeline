'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { networkStatusStore } from '@/services/networkStatus'

/**
 * #76 — Bus d'état réseau côté React.
 *
 * Agrège deux sources :
 *  - `navigator.onLine` + événements `online`/`offline` → `isOnline` ;
 *  - `networkStatusStore` (alimenté par l'intercepteur axios) → timeout / 5xx.
 *
 * `retry()` relance les requêtes TanStack Query échouées (`refetchQueries`) et
 * pilote l'état `isRetrying` (bannière « re-essai en cours »).
 */
export interface NetworkStatus {
  /** false = hors ligne (mode avion / perte réseau). */
  isOnline: boolean
  /** true = dernière requête tombée en timeout (réponse serveur trop lente). */
  isTimeout: boolean
  /** true = dernière requête a renvoyé une 5xx. */
  isServerError: boolean
  /** true = un re-essai est en cours. */
  isRetrying: boolean
  /** Relance les requêtes en échec. */
  retry: () => void
}

/**
 * Valeur par défaut « fail-open » (en ligne, aucune erreur) : un composant monté
 * hors `NetworkStatusProvider` (ex. tests unitaires isolés d'un formulaire) se
 * comporte comme si tout allait bien plutôt que de lever. Le provider réel
 * surcharge cette valeur en production.
 */
const DEFAULT_STATUS: NetworkStatus = {
  isOnline: true,
  isTimeout: false,
  isServerError: false,
  isRetrying: false,
  retry: () => {},
}

const NetworkStatusContext = createContext<NetworkStatus>(DEFAULT_STATUS)

export const useNetworkStatus = (): NetworkStatus => useContext(NetworkStatusContext)

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Départ optimiste « en ligne » ; l'effet ci-dessous corrige au montage client
  // (évite un mismatch d'hydratation : le serveur ne connaît pas navigator.onLine).
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const issue = useSyncExternalStore(
    networkStatusStore.subscribe,
    networkStatusStore.getIssue,
    () => null, // SSR : aucune erreur réseau connue côté serveur.
  )

  const retry = useCallback(() => {
    setIsRetrying(true)
    void queryClient.refetchQueries().finally(() => {
      networkStatusStore.clear()
      setIsRetrying(false)
    })
  }, [queryClient])

  const value: NetworkStatus = {
    isOnline,
    // Pendant un re-essai on masque timeout/serverError au profit de l'état retrying.
    isTimeout: issue === 'timeout' && !isRetrying,
    isServerError: issue === 'server-error' && !isRetrying,
    isRetrying,
    retry,
  }

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>
}
