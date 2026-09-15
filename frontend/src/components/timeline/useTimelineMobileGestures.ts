'use client'

import { useCallback, useRef } from 'react'
import type React from 'react'
import type { PositionedEvent } from './zoom'

/**
 * #64 — Gestes mobiles mutualisés (extrait de la logique inline #63 portrait).
 *
 * Long-press (→ action sheet) + pinch-zoom (→ niveaux `zoom.ts`) partagés à
 * l'identique entre portrait (#63) et paysage (#64) : les deux variantes offrent
 * EXACTEMENT les mêmes gestes (critère d'acceptation #64). Aucune duplication —
 * 2e occurrence évitée (parité avec `useFocusTrap`, réserve ui-design).
 *
 * Ne dépend PAS de la disposition : renvoie des handlers `onPointer*` à câbler
 * sur le conteneur scrollable (pinch) et sur chaque bloc event (long-press/tap).
 * `longPressFired` filtre le click fantôme post-long-press (parité portrait #63).
 */

/** Durée (ms) de maintien pour déclencher le long-press. */
const LONG_PRESS_MS = 500
/** Tolérance de mouvement (px) : au-delà, c'est un scroll, pas un long-press. */
const LONG_PRESS_MOVE_TOL = 10
/** Hystérésis pinch : ±22% avant de changer de niveau (évite le flottement). */
const PINCH_IN_RATIO = 1.22
const PINCH_OUT_RATIO = 0.82

export interface TimelineMobileGestures {
  /** Handlers du conteneur scrollable (pinch-zoom 2 doigts). */
  onScrollPointerDown: (e: React.PointerEvent) => void
  onScrollPointerMove: (e: React.PointerEvent) => void
  onScrollPointerUp: (e: React.PointerEvent) => void
  /** Handlers par bloc event : tap → détail, long-press → action sheet. */
  onEvtPointerDown: (event: PositionedEvent) => (e: React.PointerEvent) => void
  onEvtPointerMove: (e: React.PointerEvent) => void
  onEvtClick: (event: PositionedEvent) => () => void
  /** À câbler sur onPointerUp/onPointerCancel du bloc event. */
  clearLongPress: () => void
}

export function useTimelineMobileGestures(
  onPinchZoom: (direction: 'in' | 'out') => void,
  onSelect: (event: PositionedEvent) => void,
  onActionTarget: (event: PositionedEvent) => void,
): TimelineMobileGestures {
  // ---- Long-press (pointer) : n'ouvre l'action sheet que si pas de scroll. ----
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const longPressFired = useRef(false)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pointerStart.current = null
  }, [])

  const onEvtPointerDown = useCallback(
    (event: PositionedEvent) => (e: React.PointerEvent) => {
      longPressFired.current = false
      pointerStart.current = { x: e.clientX, y: e.clientY }
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true
        onActionTarget(event)
      }, LONG_PRESS_MS)
    },
    [onActionTarget],
  )

  const onEvtPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current
      if (!start) return
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
      if (moved > LONG_PRESS_MOVE_TOL) clearLongPress()
    },
    [clearLongPress],
  )

  const onEvtClick = useCallback(
    (event: PositionedEvent) => () => {
      clearLongPress()
      // Un long-press vient de déclencher l'action sheet → ne pas aussi ouvrir le détail.
      if (longPressFired.current) {
        longPressFired.current = false
        return
      }
      onSelect(event)
    },
    [clearLongPress, onSelect],
  )

  // ---- Pinch-zoom : suit 2 pointeurs actifs, compare la distance courante. ----
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchBaseDist = useRef<number | null>(null)

  const dist = () => {
    const pts = Array.from(activePointers.current.values())
    if (pts.length < 2) return null
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }

  const onScrollPointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 2) pinchBaseDist.current = dist()
  }, [])

  const onScrollPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const base = pinchBaseDist.current
      const current = dist()
      if (base === null || current === null) return
      const ratio = current / base
      if (ratio > PINCH_IN_RATIO) {
        onPinchZoom('in')
        pinchBaseDist.current = current
      } else if (ratio < PINCH_OUT_RATIO) {
        onPinchZoom('out')
        pinchBaseDist.current = current
      }
    },
    [onPinchZoom],
  )

  const onScrollPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchBaseDist.current = null
  }, [])

  return {
    onScrollPointerDown,
    onScrollPointerMove,
    onScrollPointerUp,
    onEvtPointerDown,
    onEvtPointerMove,
    onEvtClick,
    clearLongPress,
  }
}

export default useTimelineMobileGestures
