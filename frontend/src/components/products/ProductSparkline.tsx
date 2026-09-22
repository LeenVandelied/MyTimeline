'use client'

import * as React from 'react'
import { parseLocalDate } from '@/lib/date-iso'
import { cn } from '@/lib/utils'

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
 *
 * #608 — `width`/`height` : densité réglable (défaut 220×40, celui de l'aperçu du
 * drawer, inchangé). La géométrie est RECALCULÉE à la taille demandée (viewBox =
 * taille en px) au lieu d'étirer le dessin de 220 px : un simple redimensionnement
 * CSS réduirait les points à r≈0,9 px à 64 px de large, illisibles. Points (r=3) et
 * trait (2 px) gardent donc leur taille ; seule la fenêtre de 90 j se resserre.
 */

const WINDOW_DAYS = 90
const DEFAULT_WIDTH = 220
const DEFAULT_HEIGHT = 40
const PADDING = 4

export interface ProductSparklineProps {
  /** Dates des événements ponctuels (Date ou ISO string). */
  dates: Array<Date | string | undefined>
  /** Couleur du trait (héritée catégorie ou surcharge produit). */
  color?: string | null
  label: string
  /** Largeur en px (défaut 220, aperçu du drawer). */
  width?: number
  /** Hauteur en px (défaut 40). */
  height?: number
  className?: string
}

function toDayIndex(date: Date, todayMs: number): number | null {
  const diffDays = Math.floor((todayMs - date.getTime()) / 86_400_000)
  if (diffDays < 0 || diffDays > WINDOW_DAYS) return null
  // 0 = il y a 90 jours (gauche), WINDOW_DAYS = aujourd'hui (droite).
  return WINDOW_DAYS - diffDays
}

export function ProductSparkline({
  dates,
  color,
  label,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: ProductSparklineProps) {
  const points = React.useMemo(() => {
    const now = Date.now()
    const usableWidth = width - PADDING * 2
    const seen = new Set<number>()
    const result: Array<{ x: number; y: number }> = []

    for (const raw of dates) {
      if (!raw) continue
      const date = raw instanceof Date ? raw : parseLocalDate(raw)
      if (Number.isNaN(date.getTime())) continue
      const dayIndex = toDayIndex(date, now)
      if (dayIndex === null || seen.has(dayIndex)) continue
      seen.add(dayIndex)
      const x = PADDING + (dayIndex / WINDOW_DAYS) * usableWidth
      // Hauteur constante médiane : la sparkline matérialise la répartition
      // temporelle, pas une valeur quantitative (aucune magnitude côté events).
      result.push({ x, y: height / 2 })
    }
    return result.sort((a, b) => a.x - b.x)
  }, [dates, width, height])

  const stroke = color || 'var(--color-accent, currentColor)'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={cn('text-ink-muted', className)}
    >
      {/* Ligne de base (fenêtre 90 j). */}
      <line
        x1={PADDING}
        y1={height / 2}
        x2={width - PADDING}
        y2={height / 2}
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
