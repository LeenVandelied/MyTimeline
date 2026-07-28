'use client'

import React, { useMemo } from 'react'
import { Minus, MoreHorizontal, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FullCalendarEvent } from '@/types/event'
import { textOn } from '@/lib/color'
import { buildEventAriaLabel, Resource } from './lib'
import { Minimap } from './Minimap'
import { TimelineBottomSheet } from './TimelineBottomSheet'
import { TimelineActionSheet } from './TimelineActionSheet'
import { useTimelineMobileState, type TimelineMobileState } from './useTimelineMobileState'
import {
  useTimelineMobileSelection,
  type TimelineMobileSelection,
} from './useTimelineMobileSelection'
import { useTimelineMobileGestures, type TimelineMobileGestures } from './useTimelineMobileGestures'
import { statusToVar, ZOOM_LEVELS, type PositionedEvent } from './zoom'
import { windowEvents, windowLanes } from './virtualization'

/**
 * #63 — Vue Timeline mobile portrait.
 *
 * Transposition mobile de `TimelineView` (desktop) SANS la modifier : partage la
 * logique via `useTimelineMobileState` (zoom `zoom.ts`, positions `lib.ts`,
 * scroll↔minimap) et réutilise `Minimap` en variante CSS compacte. Le switch
 * desktop/mobile vit au niveau du wrapper `TimelineResponsive`, pas ici.
 *
 * Interactions mobiles :
 *  - Scroll horizontal natif, règle sticky (top) pendant le scroll.
 *  - Tap sur bloc → bottom sheet détail. Blocs tronqués → titre complet au tap.
 *  - Long-press OU bouton `⋯` → action sheet (modifier/supprimer). Le `⋯` est
 *    l'alternative a11y visible au long-press (réserve ui-design).
 *  - Pinch-zoom (2 doigts) → mêmes niveaux/actions que desktop (`zoom.ts`), sans
 *    rechargement. Boutons +/- fournissent l'alternative accessible.
 *
 * #64 — État HISSABLE : `state`/`selection`/`gestures` sont injectables par
 * `TimelineResponsive` pour partager le zoom/scroll/sélection avec la variante
 * paysage (transition sans perte d'état). En usage autonome (stories/tests), le
 * composant s'auto-instancie → signature #63 préservée.
 *
 * data-testid `timeline-event` + `data-event-title` PRÉSERVÉS (dépendance E2E #163).
 */
export interface TimelineMobilePortraitProps {
  events: FullCalendarEvent[]
  resources: Resource[]
  locale: string
  today?: Date
  /** Câblage optionnel édition/suppression depuis l'action sheet. */
  onEditEvent?: (event: PositionedEvent) => void
  onDeleteEvent?: (event: PositionedEvent) => void
  /** #64 — État partagé injecté par TimelineResponsive (sinon auto-instancié). */
  state?: TimelineMobileState
  selection?: TimelineMobileSelection
  gestures?: TimelineMobileGestures
}

export const TimelineMobilePortrait: React.FC<TimelineMobilePortraitProps> = ({
  events,
  resources,
  locale,
  today,
  onEditEvent,
  onDeleteEvent,
  state: injectedState,
  selection: injectedSelection,
  gestures: injectedGestures,
}) => {
  const t = useTranslations()

  // #64 — Auto-instanciation en usage autonome ; sinon consomme l'état hissé.
  // Les hooks sont TOUJOURS appelés (règles des hooks) ; on choisit la source.
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
  const levelLabel = t(`dashboard.timeline.zoom.${state.zoomLevel}`)

  const groups = useMemo(
    () => Object.entries(state.resourcesByCategory),
    [state.resourcesByCategory],
  )

  return (
    <div className="mt-tlm" data-testid="timeline-mobile-portrait">
      {/* Toolbar compacte : zoom +/- + niveau. */}
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
      </div>

      {/* Frise scrollable : règle sticky + lanes compactes. */}
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
        <div className="mt-tlm__rail" ref={state.railRef} style={{ width: `${state.railWidth}px` }}>
          {/* Règle sticky adaptative. */}
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

          {/* Overlay week-end (niveaux fins uniquement). */}
          {state.weekendSegments.map((seg, i) => (
            <div
              key={i}
              className="mt-tlm__weekend"
              style={{
                left: `${seg.leftPx}px`,
                width: `${seg.widthPx}px`,
                top: 'var(--ruler-height)',
              }}
              aria-hidden="true"
              data-testid="timeline-weekend"
            />
          ))}

          {/* Ligne TODAY verticale. */}
          <div
            className="mt-tlm__today"
            style={{ left: `${state.todayLeftPx}px`, top: 'var(--ruler-height)' }}
            aria-hidden="true"
          />

          {/* Lanes groupées par catégorie. #69 — même virtualisation 2 axes que le
              desktop : cales verticales + fenêtrage horizontal des blocs. */}
          {groups.map(([category, resList]) => {
            const laneWindow = windowLanes(
              resList.length,
              state.metrics.laneHeight,
              state.listTops[category] ?? 0,
              state.verticalBand,
            )
            return (
              <div key={category} data-testid="timeline-group">
                <div className="mt-tlm__group-head" data-testid="timeline-group-head">
                  {category}
                </div>
                {/* #69 (a11y) — `role="list"` + `aria-setsize`/`aria-posinset` :
                  le rang réel de la lane reste annoncé même quand la
                  virtualisation ne monte qu'une partie des lanes. */}
                <div role="list" aria-label={category} data-testid="timeline-lane-list">
                  {laneWindow.topSpacerPx > 0 && (
                    <div
                      aria-hidden="true"
                      data-testid="timeline-lane-spacer"
                      style={{ height: `${laneWindow.topSpacerPx}px` }}
                    />
                  )}
                  {resList.slice(laneWindow.startIndex, laneWindow.endIndex).map((resource, i) => {
                    const laneEvents = windowEvents(
                      state.eventsByResource.get(resource.id) || [],
                      state.horizontalBand,
                    ).map((w) => w.event)
                    return (
                      <div
                        key={resource.id}
                        className="mt-tlm__lane"
                        aria-posinset={laneWindow.startIndex + i + 1}
                        aria-setsize={resList.length}
                        role="listitem"
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
                            <div
                              key={event.id}
                              className="mt-tlm__evt-wrap"
                              style={{ left: `${event.leftPx}px` }}
                            >
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
                  {laneWindow.bottomSpacerPx > 0 && (
                    <div
                      aria-hidden="true"
                      data-testid="timeline-lane-spacer"
                      style={{ height: `${laneWindow.bottomSpacerPx}px` }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Minimap compacte (variante hauteur réduite). */}
      <div className="mt-tlm__minimap">
        <Minimap
          buckets={state.buckets}
          viewportStart={state.viewportStart}
          viewportRatio={state.viewportRatio}
          onSeek={state.onMinimapSeek}
          ariaLabel={t('dashboard.timeline.minimap.label')}
        />
      </div>

      <TimelineBottomSheet event={selected} locale={locale} onClose={() => setSelected(null)} />
      <TimelineActionSheet
        event={actionTarget}
        onClose={() => setActionTarget(null)}
        onEdit={onEditEvent}
        onDelete={onDeleteEvent}
      />
    </div>
  )
}

export default TimelineMobilePortrait
