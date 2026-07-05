'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/components/timeline/useFocusTrap'

/**
 * #87 — Bottom sheet générique (ancrée bas, slide-up) pour le mobile Réglages.
 *
 * Le composant `EventDrawer`/`Dialog` desktop N'est PAS réutilisable tel quel :
 * ce sheet est `fixed inset-x-0 bottom-0` + `translateY`. On réutilise en
 * revanche `useFocusTrap` (mutualisé S19, `onEscape` #208) pour le piège focus,
 * la restauration du focus déclencheur et la fermeture Escape.
 *
 * Fermeture : swipe-down (> seuil), tap backdrop, bouton croix, Escape.
 * A11y : `role="dialog" aria-modal` + `aria-labelledby` + `aria-describedby`,
 * grabber décoratif `aria-hidden`, bouton fermeture ≥ 44×44.
 * iOS : `env(safe-area-inset-bottom)` sous le contenu (padding).
 */
export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  /** Titre visible du sheet (sert aussi d'`aria-labelledby`). */
  title: string
  children: React.ReactNode
  /** testid racine du panneau (défaut `bottom-sheet`). */
  testId?: string
}

/** Seuil (px) de swipe-down au-delà duquel on ferme au relâchement. */
export const DISMISS_THRESHOLD_PX = 80

/**
 * Décide si un glissement vertical de `dragY` px doit fermer le sheet. Pur ->
 * testable sans jsdom (qui n'expose pas `clientY` aux handlers pointer React).
 */
export function shouldDismissOnSwipe(dragY: number): boolean {
  return dragY > DISMISS_THRESHOLD_PX
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  testId = 'bottom-sheet',
}: BottomSheetProps) {
  const t = useTranslations('settings')
  const panelRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef<number | null>(null)

  // Focus trap + Escape (mutualisé). Actif seulement quand ouvert.
  useFocusTrap(panelRef, open, onClose)

  // Réinitialise l'offset de drag à chaque (ré)ouverture.
  useEffect(() => {
    if (open) setDragY(0)
  }, [open])

  const onGrabberPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onGrabberPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    setDragY(Math.max(0, e.clientY - dragStartY.current))
  }, [])

  const onGrabberPointerUp = useCallback(() => {
    if (dragStartY.current === null) return
    dragStartY.current = null
    setDragY((current) => {
      if (shouldDismissOnSwipe(current)) {
        onClose()
      }
      return 0
    })
  }, [onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        aria-describedby={`${testId}-body`}
        data-testid={testId}
        className={cn(
          'bg-surface border-rule fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col',
          'rounded-t-2xl border-t shadow-lg',
          'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200',
        )}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Grabber décoratif + zone de swipe-down. */}
        <div
          className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center"
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={onGrabberPointerUp}
          onPointerCancel={onGrabberPointerUp}
          data-testid={`${testId}-grabber`}
        >
          <span className="bg-rule-strong h-1 w-9 rounded-full" aria-hidden="true" />
        </div>

        <div className="border-rule flex items-start justify-between gap-4 border-b px-5 pb-3">
          <h2 id={`${testId}-title`} className="text-ink text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            data-testid={`${testId}-close`}
            className="border-rule-strong text-ink-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div id={`${testId}-body`} className="flex-1 overflow-auto px-5 py-4">
          {children}
        </div>
      </div>
    </>
  )
}

export default BottomSheet
