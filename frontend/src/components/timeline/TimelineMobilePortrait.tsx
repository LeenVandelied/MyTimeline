'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Minus, MoreHorizontal, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FullCalendarEvent } from '@/types/event'
import { textOn } from '@/lib/color'
import { Resource } from './lib'
import { Minimap } from './Minimap'
import { TimelineBottomSheet } from './TimelineBottomSheet'
import { TimelineActionSheet } from './TimelineActionSheet'
import { useTimelineMobileState } from './useTimelineMobileState'
import { buildEventAriaLabel, statusToVar, ZOOM_LEVELS, type PositionedEvent } from './zoom'

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
 * Base réutilisable par #64 (paysage) : toute la logique d'état est dans
 * `useTimelineMobileState` ; #64 réécrit uniquement la disposition CSS.
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
}

/** Durée (ms) de maintien pour déclencher le long-press. */
const LONG_PRESS_MS = 500
/** Tolérance de mouvement (px) : au-delà, c'est un scroll, pas un long-press. */
const LONG_PRESS_MOVE_TOL = 10

export const TimelineMobilePortrait: React.FC<TimelineMobilePortraitProps> = ({
  events,
  resources,
  locale,
  today,
  onEditEvent,
  onDeleteEvent,
}) => {
  const t = useTranslations()
  const state = useTimelineMobileState(events, resources, locale, today)
  const [selected, setSelected] = useState<PositionedEvent | null>(null)
  const [actionTarget, setActionTarget] = useState<PositionedEvent | null>(null)

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
        setActionTarget(event)
      }, LONG_PRESS_MS)
    },
    [],
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
      setSelected(event)
    },
    [clearLongPress],
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
      // Hystérésis : ±22% avant de changer de niveau (évite le flottement).
      if (ratio > 1.22) {
        state.onPinchZoom('in')
        pinchBaseDist.current = current
      } else if (ratio < 0.82) {
        state.onPinchZoom('out')
        pinchBaseDist.current = current
      }
    },
    [state],
  )

  const onScrollPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchBaseDist.current = null
  }, [])

  const levelLabel = t(`dashboard.timeline.zoom.${state.zoomLevel}`)

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
        onPointerDown={onScrollPointerDown}
        onPointerMove={onScrollPointerMove}
        onPointerUp={onScrollPointerUp}
        onPointerCancel={onScrollPointerUp}
        data-testid="timeline-scroll"
      >
        <div className="mt-tlm__rail" style={{ width: `${state.railWidth}px` }}>
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
              style={{ left: `${seg.leftPx}px`, width: `${seg.widthPx}px`, top: 'var(--ruler-height)' }}
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

          {/* Lanes groupées par catégorie. */}
          {Object.entries(state.resourcesByCategory).map(([category, resList]) => (
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
                            onClick={onEvtClick(event)}
                            onPointerDown={onEvtPointerDown(event)}
                            onPointerMove={onEvtPointerMove}
                            onPointerUp={clearLongPress}
                            onPointerCancel={clearLongPress}
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
