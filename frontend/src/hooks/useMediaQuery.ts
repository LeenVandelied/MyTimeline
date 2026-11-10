'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * #63 — Hook `matchMedia` SSR-safe.
 *
 * Rend `false` au rendu serveur et pendant l'hydratation, puis la valeur réelle
 * de `window.matchMedia` côté client (instantané serveur/client de
 * `useSyncExternalStore`, #891). Évite le hydration mismatch. Un montage client
 * hors hydratation (navigation, test) lit directement la valeur réelle.
 *
 * ⚠ En test (jsdom), le mock `matchMedia` de `vitest.setup.ts` renvoie
 * `matches:false` par défaut → le hook rend la variante desktop. Pour tester la
 * variante mobile, injecter un mock `matchMedia` renvoyant `matches:true` (cf.
 * tests portrait) OU utiliser le prop d'override du wrapper responsive.
 */
export function useMediaQuery(query: string): boolean {
  // #891 — `useSyncExternalStore` plutôt qu'un `setState` dans un effet : instantané
  // serveur `false` (prérendu ET hydratation, donc aucun écart), puis `matchMedia` réel.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      // `addEventListener` moderne ; `addListener` en repli (Safari < 14).
      if (mql.addEventListener) {
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
      }
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    },
    [query],
  )
  const getSnapshot = () =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches

  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

function serverSnapshot(): boolean {
  return false
}

export default useMediaQuery
