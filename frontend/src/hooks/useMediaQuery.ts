'use client'

import { useEffect, useState } from 'react'

/**
 * #63 — Hook `matchMedia` SSR-safe.
 *
 * Rend `false` au premier rendu (SSR / avant hydratation) puis se synchronise
 * sur `window.matchMedia` côté client. Évite le hydration mismatch : on ne lit
 * PAS `matchMedia` pendant le rendu initial (indisponible côté serveur), on
 * bascule dans un `useEffect`.
 *
 * ⚠ En test (jsdom), le mock `matchMedia` de `vitest.setup.ts` renvoie
 * `matches:false` par défaut → le hook rend la variante desktop. Pour tester la
 * variante mobile, injecter un mock `matchMedia` renvoyant `matches:true` (cf.
 * tests portrait) OU utiliser le prop d'override du wrapper responsive.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    // Sync immédiat (le state initial `false` peut différer côté client).
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    // `addEventListener` moderne ; `addListener` en repli (Safari < 14).
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [query])

  return matches
}

export default useMediaQuery
