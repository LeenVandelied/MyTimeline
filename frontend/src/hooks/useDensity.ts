'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_DENSITY,
  DENSITY_ATTRIBUTE,
  DENSITY_STORAGE_KEY,
  isDensity,
  type DensityOption,
} from '@/lib/density'
import { useHydrated } from '@/hooks/useHydrated'

/**
 * #86 — Densité d'affichage (compact / normal / confortable). Persistée en
 * localStorage (non-PII, DEC-S9-002) et appliquée immédiatement via l'attribut
 * `data-density` sur <html> — sans rechargement (critère d'acceptation).
 *
 * #898 — ce hook ne sert plus qu'au CHOIX (section Préférences). L'application de
 * la valeur persistée à CHAQUE chargement de page est faite avant l'hydratation
 * par `DENSITY_INIT_SCRIPT` (`@/lib/density`), rendu par `app/[locale]/layout.tsx`.
 *
 * SSR-safe : DEFAULT_DENSITY au rendu serveur et pendant l'hydratation, puis la
 * valeur de localStorage une fois hydraté (`useHydrated`, #891) — aucun mismatch.
 */
function readStoredDensity(): DensityOption | null {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    return isDensity(stored) ? stored : null
  } catch {
    return null
  }
}

export function useDensity() {
  // #891 — densité choisie dans la session (prioritaire), sinon valeur persistée lue une
  // fois hydraté (prérendu/hydratation : DEFAULT_DENSITY, aucun écart). Remplace la
  // réhydratation par `setState` dans un effet de montage.
  const hydrated = useHydrated()
  const [chosen, setChosen] = useState<DensityOption | null>(null)
  const density: DensityOption =
    chosen ?? (hydrated ? readStoredDensity() : null) ?? DEFAULT_DENSITY

  // Application au DOM à chaque changement (immédiat, sans reload).
  // #898 — PAS avant l'hydratation : à ce stade `density` vaut DEFAULT_DENSITY par
  // construction, et l'écrire écraserait la valeur posée par le script précoce
  // (flash compact → normal → compact sur une page qui monte la section).
  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute(DENSITY_ATTRIBUTE, density)
  }, [density, hydrated])

  const setDensity = useCallback((next: DensityOption) => {
    setChosen(next)
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next)
    } catch {
      // Stockage bloqué : le choix s'applique à la session, sans persistance.
    }
  }, [])

  return { density, setDensity }
}
