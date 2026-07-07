import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * #57 — Skeleton de chargement partagé, calé sur les layouts réels pour éviter
 * le layout shift à l'arrivée des données :
 *  - `list`     : lignes « pastille + libellé » (cf. `ProductList` dashboard).
 *  - `cards`    : grille de cartes (listes produits en cartes).
 *  - `timeline` : lanes horizontales (hauteur `--lane-height` du DS).
 *
 * A11y : conteneur `role="status"` + `aria-busy="true"` ; le libellé accessible
 * (`label`, déjà traduit par l'appelant) est exposé en `sr-only`. Les blocs sont
 * `aria-hidden` (bruit visuel pur). Aucun texte hardcodé : `label` est fourni
 * par l'appelant via next-intl. Couleurs via tokens Graphite (clair + sombre).
 */

export interface LoadingSkeletonProps {
  variant?: 'list' | 'cards' | 'timeline'
  /** Nombre d'éléments répétés (lignes / cartes / lanes). Défaut 4. */
  rows?: number
  /** Libellé accessible (sr-only), déjà traduit. */
  label?: string
  className?: string
  /** `data-testid` de la racine. Défaut `loading-skeleton`. */
  testId?: string
}

/** Bloc de base : surface neutre + pulsation. `bg-surface-2` suit le thème. */
function Bar({ className }: { className?: string }) {
  return <div className={cn('bg-surface-2 animate-pulse rounded-md', className)} aria-hidden="true" />
}

function ListRows({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
          data-testid="loading-skeleton-item"
        >
          <div className="bg-surface-2 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full" aria-hidden="true" />
          <Bar className="h-3 flex-1" />
          <Bar className="hidden h-3 w-24 sm:block" />
        </div>
      ))}
    </div>
  )
}

function Cards({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-rule flex flex-col gap-3 rounded-lg border p-4"
          data-testid="loading-skeleton-item"
        >
          <div className="flex items-center gap-3">
            <div className="bg-surface-2 h-8 w-8 shrink-0 animate-pulse rounded-full" aria-hidden="true" />
            <Bar className="h-4 flex-1" />
          </div>
          <Bar className="h-3 w-3/4" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function Lanes({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3"
          style={{ height: 'var(--lane-height)' }}
          data-testid="loading-skeleton-item"
        >
          <Bar className="h-full w-[var(--lane-header-w)] shrink-0" />
          <Bar className="h-6 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function LoadingSkeleton({
  variant = 'list',
  rows = 4,
  label,
  className,
  testId = 'loading-skeleton',
}: LoadingSkeletonProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-busy="true"
      className={cn('w-full', className)}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      {variant === 'cards' ? <Cards rows={rows} /> : null}
      {variant === 'timeline' ? <Lanes rows={rows} /> : null}
      {variant === 'list' ? <ListRows rows={rows} /> : null}
    </div>
  )
}

export default LoadingSkeleton
