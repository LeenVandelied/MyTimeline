'use client'

import React, { useCallback, useRef } from 'react'

/**
 * #55 — Minimap « waveform ».
 * Vue compressée de toute l'étendue (barres de densité d'events) + fenêtre de
 * sélection (`.mt-minimap__vp`) déplaçable au drag (souris) ET au clavier
 * (roving : flèches gauche/droite déplacent la fenêtre). `viewportRatio`/
 * `viewportStart` sont exprimés en fraction [0..1] de l'étendue totale.
 */
export interface MinimapProps {
  /** Densité normalisée [0..1] par bucket (cf. buildMinimapBuckets). */
  buckets: number[]
  /** Position de la fenêtre visible (fraction [0..1] depuis le début). */
  viewportStart: number
  /** Largeur de la fenêtre visible (fraction [0..1]). */
  viewportRatio: number
  /** Callback : nouvelle position de la fenêtre (fraction [0..1], clampée). */
  onSeek: (start: number) => void
  ariaLabel: string
}

export const Minimap: React.FC<MinimapProps> = ({
  buckets,
  viewportStart,
  viewportRatio,
  onSeek,
  ariaLabel,
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const ratio = Math.min(1, Math.max(0.02, viewportRatio))
  const clampedStart = Math.min(1 - ratio, Math.max(0, viewportStart))

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const frac = (clientX - rect.left) / rect.width
      // Centre la fenêtre sur le point cliqué.
      onSeek(Math.min(1 - ratio, Math.max(0, frac - ratio / 2)))
    },
    [onSeek, ratio],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true
      trackRef.current?.setPointerCapture?.(e.pointerId)
      seekFromClientX(e.clientX)
    },
    [seekFromClientX],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return
      seekFromClientX(e.clientX)
    },
    [seekFromClientX],
  )

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // Saisie du handle lui-même : arme le drag + capture le pointeur sur la track
  // sans recentrer immédiatement (on garde la position, le move fera le seek).
  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      draggingRef.current = true
      trackRef.current?.setPointerCapture?.(e.pointerId)
    },
    [],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = ratio / 2 || 0.05
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onSeek(Math.max(0, clampedStart - step))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onSeek(Math.min(1 - ratio, clampedStart + step))
      } else if (e.key === 'Home') {
        e.preventDefault()
        onSeek(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        onSeek(1 - ratio)
      }
    },
    [clampedStart, onSeek, ratio],
  )

  return (
    <div
      ref={trackRef}
      className="mt-minimap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      data-testid="timeline-minimap"
    >
      {buckets.map((h, i) => (
        <div
          key={i}
          className={h > 0 ? 'mt-minimap__bar mt-minimap__bar--filled' : 'mt-minimap__bar'}
          style={{ height: `${Math.max(3, h * 100)}%` }}
        />
      ))}
      <div
        className="mt-minimap__vp"
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedStart * 100)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onHandlePointerDown}
        style={{ left: `${clampedStart * 100}%`, width: `${ratio * 100}%` }}
        data-testid="timeline-minimap-viewport"
      />
    </div>
  )
}

export default Minimap
