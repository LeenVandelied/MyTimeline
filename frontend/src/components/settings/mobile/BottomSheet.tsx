'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/components/timeline/useFocusTrap'
import { useMobileKeyboard } from '@/hooks/useMobileKeyboard'

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
  /**
   * #79 — Pied FIXE, rendu hors de la zone de défilement et donc toujours visible
   * au-dessus du clavier virtuel. Optionnel : absent → aucun pied n'est monté (le
   * sheet garde exactement sa structure d'origine).
   */
  footer?: React.ReactNode
  /** #79 — Transition « clavier virtuel ouvert » (mesurée par `visualViewport`). */
  onKeyboardShow?: () => void
  /** #79 — Transition inverse (clavier refermé). */
  onKeyboardHide?: () => void
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
  footer,
  onKeyboardShow,
  onKeyboardHide,
}: BottomSheetProps) {
  const t = useTranslations('settings')
  const panelRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef<number | null>(null)

  // Focus trap + Escape (mutualisé). Actif seulement quand ouvert.
  useFocusTrap(panelRef, open, onClose)

  /**
   * #79 — Évitement du clavier virtuel. Ce sheet porte une SAISIE (re-saisie du
   * username avant suppression de compte, BR-AUT-001) : clavier ouvert, un panneau
   * `fixed bottom-0` passe derrière le clavier. Le hook est un no-op sans
   * `visualViewport` (jsdom, desktop sans clavier logiciel).
   * PAS de mode réduit ici (un seul champ) : seul le bornage de hauteur s'applique.
   */
  const { keyboardOpen, compact, availableHeight, offsetTop } = useMobileKeyboard({
    enabled: open,
    onKeyboardShow,
    onKeyboardHide,
  })

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
        /* #79 — état observable (oracle E2E) ; `data-compact` informe seulement :
           ce sheet ne masque aucun champ. */
        data-keyboard={keyboardOpen ? 'open' : 'closed'}
        data-compact={compact ? 'true' : undefined}
        className={cn(
          'bg-surface border-rule fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col',
          'rounded-t-2xl border-t shadow-lg',
          'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200',
        )}
        style={{
          /**
           * #79 — PIÈGE MESURÉ : `motion-safe:duration-200` (posée pour l'animation
           * d'entrée) ne fixe QUE `transition-duration`. Or la valeur INITIALE de
           * `transition-property` est `all` : la classe arme donc une transition de
           * 200 ms sur TOUTES les propriétés, `max-height` et `top` compris. Le
           * bornage au clavier s'animait alors au lieu de s'appliquer (mesuré en
           * E2E : `max-height` interpolait encore ~570 px pendant l'assertion), ce
           * que la spec Designer interdit explicitement (à-coup à chaque frappe).
           * On restreint donc la transition au `transform` (le seul effet voulu,
           * celui du swipe-down) ; la géométrie du clavier devient instantanée.
           */
          transitionProperty: 'transform',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          paddingBottom: 'env(safe-area-inset-bottom)',
          /* #79 — borne la `max-h-[85vh]` de la classe à ce qui reste visible, et
             suit `offsetTop` (iOS ancre les `fixed` sur le viewport de MISE EN PAGE,
             que le clavier ne réduit pas). Clavier fermé → `undefined` : la classe
             Tailwind reprend seule la main, sans transition. */
          maxHeight: keyboardOpen && availableHeight !== null ? `${availableHeight}px` : undefined,
          top: keyboardOpen ? `${offsetTop}px` : undefined,
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
            className="border-rule-emphasis text-ink-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-md border"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div id={`${testId}-body`} className="flex-1 overflow-auto px-5 py-4">
          {children}
        </div>

        {/* #79 — Pied hors défilement (pendant de `.mt-sheet__footer` du DS, mêmes
            valeurs : filet, `--space-4`/`--space-5`, réserve de 68 px = `--space-17`).
            `shrink-0` : le corps `flex-1` ne doit pas l'écraser quand la hauteur du
            panneau est bornée. */}
        {footer ? (
          <div
            data-testid={`${testId}-footer`}
            className="border-rule flex shrink-0 items-center border-t px-5 py-4"
            style={{ minHeight: 'var(--space-17)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </>
  )
}

export default BottomSheet
