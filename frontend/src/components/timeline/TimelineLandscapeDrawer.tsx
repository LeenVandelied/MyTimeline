'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'
import { useFocusTrap } from './useFocusTrap'

/**
 * #64 — Drawer latéral droit de détail événement (variante PAYSAGE mobile).
 *
 * Remplace le bottom sheet portrait quand l'espace le permet (cf. réserve
 * ui-design : `.mt-drawer` slide-in droite EST le bon modèle en paysage). NE
 * réutilise PAS `EventDrawer.tsx` desktop tel quel : ce dernier délègue l'Escape
 * au parent `TimelineView` et a un bouton fermer 28px (NON conforme touch 44px).
 * On mutualise en revanche :
 *  - les styles `.mt-drawer*` (DS, inchangés),
 *  - `useFocusTrap` (focus initial + boucle Tab + restauration focus déclencheur),
 *  - les MÊMES clés i18n `dashboard.timeline.drawer.*` que bottom sheet & desktop.
 *
 * A11y (OBLIGATOIRE) : `role="dialog" aria-modal="true"` + `aria-labelledby` +
 * `aria-describedby`, fermeture bouton visible (≥ 44×44px) + Escape, focus-trap.
 */
export interface TimelineLandscapeDrawerProps {
  event: PositionedEvent | null
  locale: string
  onClose: () => void
}

export const TimelineLandscapeDrawer: React.FC<TimelineLandscapeDrawerProps> = ({
  event,
  locale,
  onClose,
}) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, Boolean(event))

  // Escape ferme le drawer (géré localement, contrairement au desktop).
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
        className="mt-drawer__overlay"
        onClick={onClose}
        data-testid="timeline-landscape-drawer-overlay"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="mt-drawer mt-drawer--landscape"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt-ldrawer-title"
        aria-describedby="mt-ldrawer-body"
        data-testid="timeline-landscape-drawer"
      >
        <div className="mt-drawer__header">
          <h2 className="mt-drawer__title" id="mt-ldrawer-title">
            {event.title}
          </h2>
          <button
            type="button"
            className="mt-drawer__close mt-drawer__close--touch"
            onClick={onClose}
            aria-label={t('common.buttons.close')}
            data-testid="timeline-landscape-drawer-close"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-drawer__body" id="mt-ldrawer-body">
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

export default TimelineLandscapeDrawer
