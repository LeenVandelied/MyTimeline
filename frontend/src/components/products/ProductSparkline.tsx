'use client'

import * as React from 'react'

/**
 * #61 — Mini-sparkline d'aperçu live du produit pendant la saisie.
 *
 * Rendu volontairement léger (SVG inline, aucune lib de charting) et BORNÉ aux
 * 90 derniers jours (risque perf sur grandes listes d'events, cf. « Risques
 * techniques » de l'issue) : on ne dessine qu'un point par jour où au moins un
 * événement ponctuel tombe dans la fenêtre `[today-90j, today]`.
 *
 * `color` : couleur héritée de la catégorie, surchargeable au niveau produit —
 * pilote le trait de la sparkline pour matérialiser le choix en direct.
 */

const WINDOW_DAYS = 90
const WIDTH = 220
const HEIGHT = 40
const PADDING = 4

export interface ProductSparklineProps {
  /** Dates des événements ponctuels (Date ou ISO string). */
  dates: Array<Date | string | undefined>
  /** Couleur du trait (héritée catégorie ou surcharge produit). */
  color?: string | null
  label: string
}

function toDayIndex(date: Date, todayMs: number): number | null {
  const diffDays = Math.floor((todayMs - date.getTime()) / 86_400_000)
  if (diffDays < 0 || diffDays > WINDOW_DAYS) return null
  // 0 = il y a 90 jours (gauche), WINDOW_DAYS = aujourd'hui (droite).
  return WINDOW_DAYS - diffDays
}

export function ProductSparkline({ dates, color, label }: ProductSparklineProps) {
  const points = React.useMemo(() => {
    const now = Date.now()
    const usableWidth = WIDTH - PADDING * 2
    const seen = new Set<number>()
    const result: Array<{ x: number; y: number }> = []

    for (const raw of dates) {
      if (!raw) continue
      const date = raw instanceof Date ? raw : new Date(raw)
      if (Number.isNaN(date.getTime())) continue
      const dayIndex = toDayIndex(date, now)
      if (dayIndex === null || seen.has(dayIndex)) continue
      seen.add(dayIndex)
      const x = PADDING + (dayIndex / WINDOW_DAYS) * usableWidth
      // Hauteur constante médiane : la sparkline matérialise la répartition
      // temporelle, pas une valeur quantitative (aucune magnitude côté events).
      result.push({ x, y: HEIGHT / 2 })
    }
    return result.sort((a, b) => a.x - b.x)
  }, [dates])

  const stroke = color || 'var(--color-accent, currentColor)'

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={label}
      className="text-ink-muted"
    >
      {/* Ligne de base (fenêtre 90 j). */}
      <line
        x1={PADDING}
        y1={HEIGHT / 2}
        x2={WIDTH - PADDING}
        y2={HEIGHT / 2}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={1}
      />
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={stroke} />
      ))}
    </svg>
  )
}
