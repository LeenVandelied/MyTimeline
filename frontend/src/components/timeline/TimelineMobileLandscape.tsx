'use client'

import React, { useMemo, useState } from 'react'
import { Minus, MoreHorizontal, Plus, Map as MapIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FullCalendarEvent } from '@/types/event'
import { textOn } from '@/lib/color'
import { Resource } from './lib'
import { Minimap } from './Minimap'
import { TimelineLandscapeDrawer } from './TimelineLandscapeDrawer'
import { TimelineActionSheet } from './TimelineActionSheet'
import { useTimelineMobileState, type TimelineMobileState } from './useTimelineMobileState'
import { useTimelineMobileSelection, type TimelineMobileSelection } from './useTimelineMobileSelection'
import { useTimelineMobileGestures, type TimelineMobileGestures } from './useTimelineMobileGestures'
import { buildEventAriaLabel, statusToVar, ZOOM_LEVELS, type PositionedEvent } from './zoom'

/**
 * #64 — Vue Timeline mobile PAYSAGE.
 *
 * Dérivée de `TimelineMobilePortrait` (#63) : MÊME logique d'état
 * (`useTimelineMobileState`), MÊMES gestes (`useTimelineMobileGestures` :
 * pinch-zoom, long-press, `⋯`) et MÊMES data-testid E2E (#163). Diffère par la
 * DISPOSITION uniquement (réserve architect : la régression viendrait d'une
 * factorisation commune mal faite → on partage par hooks, pas par héritage CSS
 * accidentel) :
 *  - Lanes DENSES : hauteur de ligne réduite (variante CSS `.mt-tlm--landscape`,
 *    dérive `--lane-height`/`--ruler-height`) → plus de catégories sans scroll
 *    vertical. Touch target ≥ 44px PRÉSERVÉ via hitbox `::before` (comme portrait).
 *  - Détail événement : DRAWER LATÉRAL DROIT (`.mt-drawer`) AU LIEU du bottom
 *    sheet portrait (l'espace vertical réduit rend le sheet inadapté).
 *  - Minimap MASQUABLE : togglable (bouton `aria-pressed`) + masquée d'office si
 *    la hauteur dispo < seuil (~400px, décidé par `TimelineResponsive`).
 *
 * État HISSÉ par `TimelineResponsive` (props `state`/`selection`/`gestures`) →
 * transition portrait ↔ paysage SANS perte de scroll/zoom/sélection. En usage
 * autonome (stories/tests), s'auto-instancie.
 */
export interface TimelineMobileLandscapeProps {
  events: FullCalendarEvent[]
  resources: Resource[]
  locale: string
  today?: Date
  onEditEvent?: (event: PositionedEvent) => void
  onDeleteEvent?: (event: PositionedEvent) => void
  /** État partagé injecté par TimelineResponsive (sinon auto-instancié). */
  state?: TimelineMobileState
  selection?: TimelineMobileSelection
  gestures?: TimelineMobileGestures
  /**
   * Force le masquage de la minimap (hauteur dispo < seuil). Quand `true`, le
   * toggle utilisateur est neutralisé et la minimap reste cachée (contrainte
   * d'espace prime sur la préférence). Défaut : `false`.
   */
  minimapForcedHidden?: boolean
}

export const TimelineMobileLandscape: React.FC<TimelineMobileLandscapeProps> = ({
  events,
  resources,
  locale,
  today,
  onEditEvent,
  onDeleteEvent,
  state: injectedState,
  selection: injectedSelection,
  gestures: injectedGestures,
  minimapForcedHidden = false,
}) => {
  const t = useTranslations()

  const ownState = useTimelineMobileState(events, resources, locale, today)
  const ownSelection = useTimelineMobileSelection()
  const state = injectedState ?? ownState
  const selection = injectedSelection ?? ownSelection
  const ownGestures = useTimelineMobileGestures(
    state.onPinchZoom,
    selection.setSelected,
    selection.setActionTarget,
  )
  const gestures = injectedGestures ?? ownGestures

  const { selected, actionTarget, setSelected, setActionTarget } = selection

  // Toggle utilisateur de la minimap. Masquage EFFECTIF = forcé (hauteur) OU choix.
  const [userHidden, setUserHidden] = useState(false)
  const minimapHidden = minimapForcedHidden || userHidden

  const levelLabel = t(`dashboard.timeline.zoom.${state.zoomLevel}`)
  const groups = useMemo(
    () => Object.entries(state.resourcesByCategory),
    [state.resourcesByCategory],
  )

  return (
    <div className="mt-tlm mt-tlm--landscape" data-testid="timeline-mobile-landscape">
      {/* Toolbar compacte : zoom +/- + niveau + toggle minimap masquable. */}
      <div className="mt-tlm__toolbar">
        <div className="mt-zoom" role="group" aria-label={t('dashboard.timeline.zoom.label')}>
          <button
            type="button"
            className="mt-zoom__btn"
            onClick={state.zoomOut}
            aria-label={t('dashboard.timeline.zoom.out')}
            disabled={state.zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            data-testid="timeline-zoom-out"
          >
            <Minus size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <span className="mt-zoom__level" data-testid="timeline-zoom-level">
            {levelLabel}
          </span>
          <button
            type="button"
            className="mt-zoom__btn"
            onClick={state.zoomIn}
            aria-label={t('dashboard.timeline.zoom.in')}
            disabled={state.zoomLevel === ZOOM_LEVELS[0]}
            data-testid="timeline-zoom-in"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* Toggle minimap : masquable par l'utilisateur. Neutralisé (désactivé)
            si la hauteur force déjà le masquage (contrainte d'espace prime). */}
        <button
          type="button"
          className="mt-tlm__minimap-toggle"
          aria-pressed={!minimapHidden}
          aria-label={t('dashboard.timeline.minimap.toggle')}
          disabled={minimapForcedHidden}
          onClick={() => setUserHidden((v) => !v)}
          data-testid="timeline-minimap-toggle"
        >
          <MapIcon size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Frise scrollable : règle sticky + lanes DENSES. */}
      <div
        className="mt-tlm__scroll"
        ref={state.scrollRef}
        onScroll={state.onScroll}
        onPointerDown={gestures.onScrollPointerDown}
        onPointerMove={gestures.onScrollPointerMove}
        onPointerUp={gestures.onScrollPointerUp}
        onPointerCancel={gestures.onScrollPointerUp}
        data-testid="timeline-scroll"
      >
        <div className="mt-tlm__rail" style={{ width: `${state.railWidth}px` }}>
          <div className="mt-tlm__ruler" data-testid="timeline-ruler">
            {state.ticks.map((tick, i) => (
              <div
                key={i}
                className={[
                  'mt-tlm__tick',
                  tick.monthBoundary ? 'mt-tlm__tick--month' : '',
                  tick.weekend ? 'mt-tlm__tick--weekend' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${tick.leftPx}px` }}
              >
                <span className="mt-tlm__tick-label">{tick.label}</span>
              </div>
            ))}
            <div className="mt-tlm__today" style={{ left: `${state.todayLeftPx}px` }}>
              <span className="mt-tlm__today-badge" data-testid="timeline-today">
                {t('common.buttons.today')}
              </span>
            </div>
          </div>

          {state.weekendSegments.map((seg, i) => (
            <div
              key={i}
              className="mt-tlm__weekend"
              style={{ left: `${seg.leftPx}px`, width: `${seg.widthPx}px`, top: 'var(--ruler-height)' }}
              aria-hidden="true"
              data-testid="timeline-weekend"
            />
          ))}

          <div
            className="mt-tlm__today"
            style={{ left: `${state.todayLeftPx}px`, top: 'var(--ruler-height)' }}
            aria-hidden="true"
          />

          {groups.map(([category, resList]) => (
            <div key={category} data-testid="timeline-group">
              <div className="mt-tlm__group-head" data-testid="timeline-group-head">
                {category}
              </div>
              {resList.map((resource) => {
                const laneEvents = state.eventsByResource.get(resource.id) || []
                return (
                  <div
                    key={resource.id}
                    className="mt-tlm__lane"
                    data-testid="timeline-resource-row"
                  >
                    <span
                      className="mt-tlm__lane-label"
                      data-testid="timeline-resource-title"
                      title={resource.title}
                    >
                      {resource.title}
                    </span>
                    {laneEvents.map((event) => {
                      const color = event.color || 'var(--color-accent)'
                      const ink = event.color ? textOn(event.color) : 'var(--color-accent-ink)'
                      return (
                        <div key={event.id} className="mt-tlm__evt-wrap" style={{ left: `${event.leftPx}px` }}>
                          <button
                            type="button"
                            className="mt-tlm__evt"
                            data-testid="timeline-event"
                            data-event-title={event.title}
                            aria-label={buildEventAriaLabel(event, locale, t)}
                            onClick={gestures.onEvtClick(event)}
                            onPointerDown={gestures.onEvtPointerDown(event)}
                            onPointerMove={gestures.onEvtPointerMove}
                            onPointerUp={gestures.clearLongPress}
                            onPointerCancel={gestures.clearLongPress}
                            style={{
                              width: `${event.widthPx}px`,
                              background: color,
                              color: ink,
                              ['--mt-evt-status' as string]: statusToVar(event.status),
                            }}
                          >
                            <span
                              className="mt-tlm__evt-dot"
                              style={{ background: statusToVar(event.status) }}
                              aria-hidden="true"
                            />
                            <span className="mt-tlm__evt-title">{event.title}</span>
                          </button>
                          <button
                            type="button"
                            className="mt-tlm__evt-more"
                            onClick={() => setActionTarget(event)}
                            aria-label={t('dashboard.timeline.actions.label')}
                            data-testid="timeline-event-more"
                            style={{ color: ink }}
                          >
                            <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Minimap compacte MASQUABLE (hauteur ou choix utilisateur). */}
      {!minimapHidden && (
        <div className="mt-tlm__minimap" data-testid="timeline-minimap-wrap">
          <Minimap
            buckets={state.buckets}
            viewportStart={state.viewportStart}
            viewportRatio={state.viewportRatio}
            onSeek={state.onMinimapSeek}
            ariaLabel={t('dashboard.timeline.minimap.label')}
          />
        </div>
      )}

      {/* Détail : DRAWER LATÉRAL DROIT (remplace le bottom sheet portrait). */}
      <TimelineLandscapeDrawer event={selected} locale={locale} onClose={() => setSelected(null)} />
      {/* Action sheet réutilisé tel quel (parité gestes portrait/paysage). */}
      <TimelineActionSheet
        event={actionTarget}
        onClose={() => setActionTarget(null)}
        onEdit={onEditEvent}
        onDelete={onDeleteEvent}
      />
    </div>
  )
}

export default TimelineMobileLandscape
