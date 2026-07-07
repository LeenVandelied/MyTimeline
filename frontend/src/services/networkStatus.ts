/**
 * #76 — Bus d'état réseau (couche transport, hors React).
 *
 * `apiClient` (axios, singleton module) n'est pas un composant React : il ne peut
 * pas écrire directement dans un contexte. On expose donc ici un petit store
 * observable framework-agnostique que l'intercepteur axios ALIMENTE
 * (`reportTimeout` / `reportServerError` / `clear`) et que le React
 * `NetworkStatusContext` CONSOMME via `useSyncExternalStore`.
 *
 * Ce store ne couvre QUE les erreurs remontées par le serveur/transport
 * (timeout, 5xx). L'état offline « pur » est dérivé de `navigator.onLine`
 * côté contexte (événements `online`/`offline`), pas ici.
 */

export type NetworkIssue = 'timeout' | 'server-error' | null

type Listener = () => void

let issue: NetworkIssue = null
const listeners = new Set<Listener>()

const emit = (): void => {
  for (const listener of listeners) listener()
}

export const networkStatusStore = {
  /** S'abonne aux changements ; retourne la fonction de désabonnement. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Snapshot courant (stable tant que l'état ne change pas → OK useSyncExternalStore). */
  getIssue(): NetworkIssue {
    return issue
  },
  reportTimeout(): void {
    if (issue !== 'timeout') {
      issue = 'timeout'
      emit()
    }
  },
  reportServerError(): void {
    if (issue !== 'server-error') {
      issue = 'server-error'
      emit()
    }
  },
  /** Réinitialise (réponse OK, ou fin de re-essai réussi). */
  clear(): void {
    if (issue !== null) {
      issue = null
      emit()
    }
  },
}
