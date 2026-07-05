'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'
import { useFocusTrap } from './useFocusTrap'

/**
 * #63 — Bottom sheet détail événement (transposition mobile du drawer desktop).
 *
 * `EventDrawer.tsx` (slide-in droite fixe) N'est PAS réutilisable tel quel : le
 * sheet est `bottom:0;left:0;right:0` + `translateY`. On réutilise en revanche
 * la logique focus-trap + restauration focus via `useFocusTrap` (mutualisé,
 * réserve ui-design) et les MÊMES clés i18n `dashboard.timeline.drawer.*`.
 *
 * A11y (réserve ui-design, OBLIGATOIRE) :
 *  - `role="dialog" aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
 *  - Grabber décoratif `aria-hidden`.
 *  - Fermeture : bouton visible (≥ 44×44px) + Escape (swipe-down seul insuffisant).
 *  - Focus trap + focus initial + restauration focus déclencheur.
 */
export interface TimelineBottomSheetProps {
  event: PositionedEvent | null
  locale: string
  onClose: () => void
}

/** Seuil (px) de swipe-down au-delà duquel on ferme au relâchement. */
const DISMISS_THRESHOLD_PX = 80

export const TimelineBottomSheet: React.FC<TimelineBottomSheetProps> = ({
  event,
  locale,
  onClose,
}) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef<number | null>(null)

  useFocusTrap(panelRef, Boolean(event))

  // Escape ferme le sheet (alternative clavier au swipe-down).
  useEffect(() => {
    if (!event) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [event, onClose])

  // Réinitialise l'offset de drag à chaque (ré)ouverture.
  useEffect(() => {
    if (event) setDragY(0)
  }, [event])

  const onGrabberPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onGrabberPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    // Ne suit que le glissement vers le bas (pas de tirage vers le haut).
    setDragY(Math.max(0, e.clientY - dragStartY.current))
  }, [])

  const onGrabberPointerUp = useCallback(() => {
    if (dragStartY.current === null) return
    dragStartY.current = null
    setDragY((current) => {
      if (current > DISMISS_THRESHOLD_PX) {
        onClose()
        return 0
      }
      return 0
    })
  }, [onClose])

  if (!event) return null

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const startLabel = fmt.format(new Date(event.start))
  const endLabel = fmt.format(new Date(event.end || event.start))
  const statusLabel = t(`dashboard.timeline.status.${event.status}`)

  const rows: Array<[string, string]> = [
    [t('dashboard.timeline.drawer.product'), event.extendedProps.productName],
    [t('dashboard.timeline.drawer.category'), event.extendedProps.category],
    [t('dashboard.timeline.drawer.start'), startLabel],
    [t('dashboard.timeline.drawer.end'), endLabel],
    [t('dashboard.timeline.drawer.status'), statusLabel],
  ]

  return (
    <>
      <div
        className="mt-sheet__overlay"
        onClick={onClose}
        data-testid="timeline-sheet-overlay"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="mt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt-sheet-title"
        aria-describedby="mt-sheet-body"
        data-testid="timeline-sheet"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {/* Grabber décoratif + zone de swipe-down (pointer events). */}
        <div
          className="mt-sheet__grabber-zone"
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={onGrabberPointerUp}
          onPointerCancel={onGrabberPointerUp}
          data-testid="timeline-sheet-grabber"
        >
          <span className="mt-sheet__grabber" aria-hidden="true" />
        </div>
        <div className="mt-sheet__header">
          <h2 className="mt-sheet__title" id="mt-sheet-title">
            {event.title}
          </h2>
          <button
            type="button"
            className="mt-sheet__close"
            onClick={onClose}
            aria-label={t('common.buttons.close')}
            data-testid="timeline-sheet-close"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-sheet__body" id="mt-sheet-body">
          {rows.map(([k, v]) => (
            <div key={k} className="mt-drawer__row">
              <span className="mt-drawer__k">{k}</span>
              <span className="mt-drawer__v">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default TimelineBottomSheet
