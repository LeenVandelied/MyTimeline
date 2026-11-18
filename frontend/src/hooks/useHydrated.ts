import { useSyncExternalStore } from 'react'

/**
 * #891 — `true` une fois l'arbre hydraté côté client, `false` au prérendu, au rendu
 * serveur et pendant l'hydratation.
 *
 * Remplace le patron `const [x, setX] = useState(null); useEffect(() => setX(…), [])`
 * (règle `react-hooks/set-state-in-effect`) pour les valeurs qui n'existent que dans le
 * navigateur (`window.location`, date du jour) : l'instantané serveur (`false`) sert
 * pendant l'hydratation, donc aucun écart serveur/client, puis React re-rend avec
 * l'instantané client. Même séquence que l'ancien effet, sans `setState` dans un effet.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, clientSnapshot, serverSnapshot)
}

function subscribeNever(): () => void {
  return () => {}
}

function clientSnapshot(): boolean {
  return true
}

function serverSnapshot(): boolean {
  return false
}
