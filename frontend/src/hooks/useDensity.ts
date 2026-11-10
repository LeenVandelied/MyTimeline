'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_DENSITY,
  DENSITY_OPTIONS,
  DENSITY_STORAGE_KEY,
  type DensityOption,
} from '@/types/settings'
import { useHydrated } from '@/hooks/useHydrated'

/**
 * #86 — Densité d'affichage (compact / normal / confortable). Persistée en
 * localStorage (non-PII, DEC-S9-002) et appliquée immédiatement via l'attribut
 * `data-density` sur <html> — sans rechargement (critère d'acceptation).
 *
 * SSR-safe : DEFAULT_DENSITY au rendu serveur et pendant l'hydratation, puis la
 * valeur de localStorage une fois hydraté (`useHydrated`, #891) — aucun mismatch.
 */
function isDensity(value: string | null): value is DensityOption {
  return value !== null && (DENSITY_OPTIONS as readonly string[]).includes(value)
}

function readStoredDensity(): DensityOption | null {
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
  return isDensity(stored) ? stored : null
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
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setDensity = useCallback((next: DensityOption) => {
    setChosen(next)
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next)
  }, [])

  return { density, setDensity }
}
