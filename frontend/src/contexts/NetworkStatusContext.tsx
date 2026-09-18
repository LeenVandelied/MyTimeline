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
 * `retry()` relance les requêtes TanStack Query MONTÉES dont la dernière
 * résolution est en échec (`refetchQueries` filtré — #237) et pilote l'état
 * `isRetrying` (bannière « re-essai en cours »).
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
  /** Relance les requêtes montées dont la dernière résolution est en échec. */
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
    // #237 — ne relancer QUE ce qui a réellement échoué, et seulement à l'écran.
    //
    // `refetchQueries()` sans filtre applique `type: 'all'` (défaut de
    // `matchQuery`, query-core 5.101.2) : il rejouait donc TOUT le cache, y
    // compris les requêtes saines et celles d'écrans démontés — du trafic inutile
    // au moment précis où le réseau se rétablit.
    //
    // - `state.status` (`'pending' | 'success' | 'error'`) porte le résultat de la
    //   dernière résolution : c'est le bon prédicat. `state.fetchStatus`
    //   (`'fetching' | 'paused' | 'idle'`) décrit l'activité réseau en cours, pas
    //   l'échec — il ne conviendrait pas ici.
    // - `type: 'active'` restreint aux requêtes ayant au moins un observateur
    //   monté. Une requête en erreur mais démontée n'affiche rien ; elle sera de
    //   toute façon relancée à son prochain montage (sans données, elle est stale).
    void queryClient
      .refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' })
      .finally(() => {
        // Inchangé (#237) : la bannière disparaît même quand AUCUNE requête
        // n'était en erreur — `refetchQueries` résout alors immédiatement.
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
