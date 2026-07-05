'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'

/**
 * #55 — Drawer latéral de détail événement.
 * Dérivé de `.mt-dialog` (DS) en variante slide-in droite (`.mt-drawer`).
 * Trap-focus + fermeture Échap (a11y : la RÉSERVE ui-design impose de garantir
 * ces patterns nous-mêmes, `ux-patterns.md` absent). L'Échap global est géré
 * par le parent (`TimelineView`) ; ce composant gère le trap + le focus initial.
 */
export interface EventDrawerProps {
  event: PositionedEvent | null
  locale: string
  onClose: () => void
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export const EventDrawer: React.FC<EventDrawerProps> = ({ event, locale, onClose }) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!event) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // Focus initial sur le bouton fermer (premier focusable).
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restaure le focus sur l'élément déclencheur (bloc event).
      previousFocus.current?.focus()
    }
  }, [event])

  if (!event) return null

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const startLabel = fmt.format(new Date(event.start))
  const endLabel = fmt.format(new Date(event.end || event.start))
  const statusLabel = t(`dashboard.timeline.status.${event.status}`)

  return (
    <>
      <div className="mt-drawer__overlay" onClick={onClose} data-testid="timeline-drawer-overlay" />
      <div
        ref={panelRef}
        className="mt-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        data-testid="timeline-drawer"
      >
        <div className="mt-drawer__header">
          <h2 className="mt-drawer__title">{event.title}</h2>
          <button
            type="button"
            className="mt-drawer__close"
            onClick={onClose}
            aria-label={t('common.buttons.close')}
            data-testid="timeline-drawer-close"
          >
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-drawer__body">
          <div className="mt-drawer__row">
            <span className="mt-drawer__k">{t('dashboard.timeline.drawer.product')}</span>
            <span className="mt-drawer__v">{event.extendedProps.productName}</span>
          </div>
          <div className="mt-drawer__row">
            <span className="mt-drawer__k">{t('dashboard.timeline.drawer.category')}</span>
            <span className="mt-drawer__v">{event.extendedProps.category}</span>
          </div>
          <div className="mt-drawer__row">
            <span className="mt-drawer__k">{t('dashboard.timeline.drawer.start')}</span>
            <span className="mt-drawer__v">{startLabel}</span>
          </div>
          <div className="mt-drawer__row">
            <span className="mt-drawer__k">{t('dashboard.timeline.drawer.end')}</span>
            <span className="mt-drawer__v">{endLabel}</span>
          </div>
          <div className="mt-drawer__row">
            <span className="mt-drawer__k">{t('dashboard.timeline.drawer.status')}</span>
            <span className="mt-drawer__v">{statusLabel}</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default EventDrawer
