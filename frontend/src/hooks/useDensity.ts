'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_DENSITY,
  DENSITY_OPTIONS,
  DENSITY_STORAGE_KEY,
  type DensityOption,
} from '@/types/settings'

/**
 * #86 — Densité d'affichage (compact / normal / confortable). Persistée en
 * localStorage (non-PII, DEC-S9-002) et appliquée immédiatement via l'attribut
 * `data-density` sur <html> — sans rechargement (critère d'acceptation).
 *
 * SSR-safe : démarre sur DEFAULT_DENSITY au 1er rendu (client & serveur), puis
 * réhydrate depuis localStorage au montage pour éviter un mismatch d'hydratation.
 */
function isDensity(value: string | null): value is DensityOption {
  return value !== null && (DENSITY_OPTIONS as readonly string[]).includes(value)
}

export function useDensity() {
  const [density, setDensityState] = useState<DensityOption>(DEFAULT_DENSITY)

  // Réhydratation au montage depuis localStorage.
  useEffect(() => {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    if (isDensity(stored)) {
      setDensityState(stored)
    }
  }, [])

  // Application au DOM à chaque changement (immédiat, sans reload).
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setDensity = useCallback((next: DensityOption) => {
    setDensityState(next)
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next)
  }, [])

  return { density, setDensity }
}
