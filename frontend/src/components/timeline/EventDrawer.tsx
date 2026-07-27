'use client'

import React, { useRef } from 'react'
import { Pencil, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'
import { useFocusTrap } from './useFocusTrap'

/**
 * #55 — Drawer latéral de détail événement.
 * Dérivé de `.mt-dialog` (DS) en variante slide-in droite (`.mt-drawer`).
 * Trap-focus + fermeture Échap : #316 remplace la copie inline (focus initial,
 * boucle Tab/Shift+Tab, restauration au démontage, Échap) par `useFocusTrap`
 * (#63), déjà consommé par `MobileDrawer`/`TimelineBottomSheet`/
 * `TimelineActionSheet`/`NewEventDrawer`. L'Échap reste aussi géré par le
 * listener global du parent (`TimelineView`) — double déclenchement idempotent
 * (`onClose` → `setSelected(null)`).
 *
 * #absorb (gap A) — affordance « Éditer » optionnelle : quand `onEdit` est câblé
 * (via `TimelineEditHost`), un bouton ouvre `EventEditForm` pré-rempli. Sans `onEdit`
 * (usage lecture seule historique), le bouton n'est pas rendu → aucune régression.
 */
export interface EventDrawerProps {
  event: PositionedEvent | null
  locale: string
  onClose: () => void
  /** #absorb — ouvre l'édition de l'event (mount `EventEditForm` côté parent). */
  onEdit?: (event: PositionedEvent) => void
}

export const EventDrawer: React.FC<EventDrawerProps> = ({ event, locale, onClose, onEdit }) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)

  // BUG-S44-001 : `onClose` DOIT être stabilisé chez l'appelant (`TimelineView.closeDrawer`,
  // `useCallback` deps vides) — sinon re-trap à chaque rendu = vol de focus.
  useFocusTrap(panelRef, Boolean(event), onClose)

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
        {onEdit && (
          <div className="mt-drawer__footer">
            <button
              type="button"
              className="mt-drawer__action"
              onClick={() => onEdit(event)}
              data-testid="event-drawer-edit"
            >
              <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
              {t('common.buttons.edit')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default EventDrawer
