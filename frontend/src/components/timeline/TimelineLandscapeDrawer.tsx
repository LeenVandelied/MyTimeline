'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'
import { useFocusTrap } from './useFocusTrap'
import { toLocalIsoDate } from '@/lib/date-iso'

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
  const startDate = new Date(event.start)
  const endDate = new Date(event.end || event.start)
  const startLabel = fmt.format(startDate)
  const endLabel = fmt.format(endDate)
  const statusLabel = t(`dashboard.timeline.status.${event.status}`)

  /* #518 — la VALEUR d'une ligne devient un `ReactNode` (et non plus un `string`)
     pour que les deux lignes de date portent un `<time datetime>` (convention DS,
     `i18n.css` §7) tout en gardant le rendu générique `rows.map()` : trois lignes
     sur cinq restent du texte nu. `.mt-date--long` vaut 13px, la taille que
     `.mt-drawer__row` pose déjà — seules la fonte mono et le `nowrap` changent.
     Les `key` sont posées pour `react/jsx-key` : la règle voit un littéral de
     tableau contenant du JSX et ne distingue pas un TUPLE (clé, valeur) d'une
     liste d'enfants. Sans elles, `next build` échoue (le lint est un gate CI). */
  const rows: Array<[string, React.ReactNode]> = [
    [t('dashboard.timeline.drawer.product'), event.extendedProps.productName],
    [t('dashboard.timeline.drawer.category'), event.extendedProps.category],
    [
      t('dashboard.timeline.drawer.start'),
      <time key="start" className="mt-date--long" dateTime={toLocalIsoDate(startDate) ?? undefined}>
        {startLabel}
      </time>,
    ],
    [
      t('dashboard.timeline.drawer.end'),
      <time key="end" className="mt-date--long" dateTime={toLocalIsoDate(endDate) ?? undefined}>
        {endLabel}
      </time>,
    ],
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
