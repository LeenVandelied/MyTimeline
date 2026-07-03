'use client'

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronRight, Maximize2, Minus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FullCalendarEvent } from '@/types/event'
import { Resource, groupResourcesByCategory } from './lib'
import { Minimap } from './Minimap'
import { EventDrawer } from './EventDrawer'
import {
  DAY_WIDTH_PX,
  ZOOM_LEVELS,
  buildMinimapBuckets,
  buildRulerTicks,
  buildWeekendSegments,
  computeRange,
  daysBetween,
  initialZoomState,
  positionEvents,
  statusToVar,
  zoomReducer,
  type PositionedEvent,
} from './zoom'

/**
 * #55 — Vue Timeline desktop.
 *
 * Orchestre les primitives #47 (Resource/groupResourcesByCategory) + un cœur
 * pur (`zoom.ts`) pour offrir : frise continue scrollable, zoom Cmd+molette
 * (5 niveaux), règle sticky adaptative, minimap waveform draggable, accordéons
 * catégorie, drawer détail, raccourcis clavier, overlay week-end, indicateur
 * TODAY. Migré sur les classes `.mt-*` du DS (décision Designer S17).
 *
 * BR-EVE-001 : la frise n'affiche que les events fournis en props (déjà filtrés
 * par l'utilisateur authentifié côté data #48 — non contourné ici). Le zoom est
 * un pur re-rendu client, AUCUN refetch réseau.
 */
export interface TimelineViewProps {
  events: FullCalendarEvent[]
  resources: Resource[]
  locale: string
  today?: Date
}

/**
 * Label a11y d'un bloc event : titre + statut + dates (+ produit si dispo).
 * Réutilise le format de date medium et la clé i18n de statut du drawer, pour
 * que les lecteurs d'écran aient le même contexte au focus qu'à l'ouverture.
 */
function buildEventAriaLabel(
  event: PositionedEvent,
  locale: string,
  t: (key: string) => string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const start = fmt.format(new Date(event.start))
  const end = fmt.format(new Date(event.end || event.start))
  const status = t(`dashboard.timeline.status.${event.status}`)
  const product = event.extendedProps?.productName
  const parts = [event.title, status, `${start} – ${end}`]
  if (product) parts.push(product)
  return parts.join(', ')
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events, resources, locale, today }) => {
  const t = useTranslations()
  const [zoom, dispatch] = useReducer(zoomReducer, initialZoomState)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<PositionedEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [viewportStart, setViewportStart] = useState(0)

  const now = useMemo(() => today ?? new Date(), [today])

  const dayWidth = DAY_WIDTH_PX[zoom.level]

  const { rangeStart, totalDays } = useMemo(() => computeRange(events, now), [events, now])

  const railWidth = useMemo(() => totalDays * dayWidth, [totalDays, dayWidth])

  const ticks = useMemo(
    () => buildRulerTicks(rangeStart, totalDays, zoom.level, dayWidth, locale),
    [rangeStart, totalDays, zoom.level, dayWidth, locale],
  )

  const eventsByResource = useMemo(
    () => positionEvents(events, rangeStart, dayWidth, now),
    [events, rangeStart, dayWidth, now],
  )

  const resourcesByCategory = useMemo(() => groupResourcesByCategory(resources), [resources])

  const buckets = useMemo(
    () => buildMinimapBuckets(events, rangeStart, totalDays),
    [events, rangeStart, totalDays],
  )

  const weekendSegments = useMemo(
    () => buildWeekendSegments(rangeStart, totalDays, zoom.level, dayWidth),
    [rangeStart, totalDays, zoom.level, dayWidth],
  )

  const todayLeftPx = useMemo(
    () => daysBetween(rangeStart, now) * dayWidth,
    [rangeStart, now, dayWidth],
  )

  // Fenêtre visible (fraction) pour la minimap : dérivée du scroll + largeur.
  const [viewportRatio, setViewportRatio] = useState(1)

  const syncViewportFromScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || railWidth === 0) return
    setViewportStart(el.scrollLeft / railWidth)
    setViewportRatio(Math.min(1, el.clientWidth / railWidth))
  }, [railWidth])

  useEffect(() => {
    syncViewportFromScroll()
  }, [syncViewportFromScroll, dayWidth, totalDays])

  // Applique offsetDays (raccourcis [ ] / T) au scroll horizontal.
  const lastOffsetRef = useRef(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (zoom.offsetDays !== lastOffsetRef.current) {
      lastOffsetRef.current = zoom.offsetDays
      el.scrollLeft = Math.max(0, zoom.offsetDays * dayWidth)
    }
  }, [zoom.offsetDays, dayWidth])

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const target = todayLeftPx - el.clientWidth / 2
    el.scrollLeft = Math.max(0, target)
  }, [todayLeftPx])

  // Centrage initial sur aujourd'hui.
  useEffect(() => {
    scrollToToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onMinimapSeek = useCallback(
    (start: number) => {
      const el = scrollRef.current
      if (!el) return
      el.scrollLeft = start * railWidth
      setViewportStart(start)
    },
    [railWidth],
  )

  const toggleFullscreen = useCallback(() => {
    const node = rootRef.current
    if (!node) return
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
    } else {
      void node.requestFullscreen?.()
    }
  }, [])

  // Zoom Cmd/Ctrl + molette (client-only, no refetch). Respecte reduced-motion
  // via le CSS scroll-behavior guard ; ici on ne fait que changer le niveau.
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return
    e.preventDefault()
    dispatch(e.deltaY < 0 ? { type: 'ZOOM_IN' } : { type: 'ZOOM_OUT' })
  }, [])

  // Raccourcis clavier globaux (T/[/]/+/-/F/Échap/?). Ignore quand un champ a le
  // focus (saisie utilisateur). Échap ferme le drawer en priorité.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === 'Escape') {
        if (selected) setSelected(null)
        else if (document.fullscreenElement) void document.exitFullscreen?.()
        return
      }
      if (typing) return
      // Ne pas intercepter les raccourcis OS/navigateur (Cmd+F, Ctrl+F, etc.).
      // Le zoom Cmd+molette est un handler `wheel` séparé, non concerné ici.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 't':
        case 'T':
          dispatch({ type: 'GO_TO_TODAY', todayOffsetDays: daysBetween(rangeStart, now) })
          scrollToToday()
          break
        case '[':
          dispatch({ type: 'PREV_PERIOD' })
          break
        case ']':
          dispatch({ type: 'NEXT_PERIOD' })
          break
        case '+':
        case '=':
          dispatch({ type: 'ZOOM_IN' })
          break
        case '-':
          dispatch({ type: 'ZOOM_OUT' })
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, rangeStart, now, scrollToToday, toggleFullscreen])

  const levelLabel = t(`dashboard.timeline.zoom.${zoom.level}`)

  const shortcuts: Array<[string, string]> = [
    ['T', t('dashboard.timeline.help.today')],
    ['[  ]', t('dashboard.timeline.help.period')],
    ['+  −', t('dashboard.timeline.help.zoom')],
    ['F', t('dashboard.timeline.help.fullscreen')],
    ['Échap', t('dashboard.timeline.help.escape')],
  ]

  return (
    <div className="mt-tlv" ref={rootRef} data-testid="timeline-view">
      {/* Toolbar : zoom controls + minimap + aide */}
      <div className="mt-tlv__toolbar">
        <div className="mt-zoom" role="group" aria-label={t('dashboard.timeline.zoom.label')}>
          <button
            type="button"
            className="mt-zoom__btn"
            onClick={() => dispatch({ type: 'ZOOM_OUT' })}
            aria-label={t('dashboard.timeline.zoom.out')}
            disabled={zoom.level === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
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
            onClick={() => dispatch({ type: 'ZOOM_IN' })}
            aria-label={t('dashboard.timeline.zoom.in')}
            disabled={zoom.level === ZOOM_LEVELS[0]}
            data-testid="timeline-zoom-in"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <Minimap
            buckets={buckets}
            viewportStart={viewportStart}
            viewportRatio={viewportRatio}
            onSeek={onMinimapSeek}
            ariaLabel={t('dashboard.timeline.minimap.label')}
          />
        </div>

        <button
          type="button"
          className="mt-tlv__help-btn"
          onClick={toggleFullscreen}
          aria-label={t('dashboard.timeline.help.fullscreen')}
          data-testid="timeline-fullscreen"
        >
          <Maximize2 size={13} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <div className="mt-tlv__help">
          <button
            type="button"
            className="mt-tlv__help-btn"
            aria-label={t('dashboard.timeline.help.label')}
            aria-describedby="timeline-help-pop"
            data-testid="timeline-help"
          >
            ?
          </button>
          <div className="mt-tlv__help-pop" id="timeline-help-pop" role="tooltip">
            {shortcuts.map(([key, desc]) => (
              <div key={key} className="mt-tlv__help-row">
                <span>{desc}</span>
                <span className="mt-tlv__kbd">{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frise scrollable : règle sticky + lanes */}
      <div
        className="mt-tlv__scroll"
        ref={scrollRef}
        onScroll={syncViewportFromScroll}
        onWheel={onWheel}
        data-testid="timeline-scroll"
      >
        <div className="mt-tlv__rail" style={{ width: `${railWidth}px` }}>
          {/* Règle sticky adaptative */}
          <div className="mt-tlv__ruler" data-testid="timeline-ruler">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className={[
                  'mt-tlv__tick',
                  tick.monthBoundary ? 'mt-tlv__tick--month' : '',
                  tick.weekend ? 'mt-tlv__tick--weekend' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${tick.leftPx}px` }}
              >
                <span className="mt-tlv__tick-label">{tick.label}</span>
              </div>
            ))}
            {/* Badge TODAY sur la règle */}
            <div className="mt-tlv__today" style={{ left: `${todayLeftPx}px` }}>
              <span className="mt-tlv__today-badge" data-testid="timeline-today">
                {t('common.buttons.today')}
              </span>
            </div>
          </div>

          {/* Overlay week-end continu (fond de colonne, sous la règle). */}
          {weekendSegments.map((seg, i) => (
            <div
              key={i}
              className="mt-tlv__weekend"
              style={{
                left: `${seg.leftPx}px`,
                width: `${seg.widthPx}px`,
                top: 'var(--ruler-height)',
              }}
              aria-hidden="true"
              data-testid="timeline-weekend"
            />
          ))}

          {/* Ligne TODAY verticale traversant les lanes */}
          <div
            className="mt-tlv__today"
            style={{ left: `${todayLeftPx}px`, top: 'var(--ruler-height)' }}
            aria-hidden="true"
          />

          {/* Lanes groupées par catégorie (accordéons) */}
          {Object.entries(resourcesByCategory).map(([category, resList]) => {
            const isCollapsed = collapsed[category] ?? false
            return (
              <div key={category} data-testid="timeline-group">
                <button
                  type="button"
                  className="mt-tlv__group-head"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !isCollapsed }))}
                  style={{ width: `${railWidth}px` }}
                  data-testid="timeline-group-head"
                >
                  <ChevronRight
                    className={isCollapsed ? 'mt-tlv__chev' : 'mt-tlv__chev mt-tlv__chev--open'}
                    size={13}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {category}
                </button>

                {!isCollapsed &&
                  resList.map((resource) => {
                    const laneEvents = eventsByResource.get(resource.id) || []
                    return (
                      <div
                        key={resource.id}
                        className="mt-tlv__lane"
                        style={{ backgroundSize: `${dayWidth}px 100%` }}
                        data-testid="timeline-resource-row"
                      >
                        {laneEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            className="mt-tlv__evt"
                            data-testid="timeline-event"
                            data-event-title={event.title}
                            aria-label={buildEventAriaLabel(event, locale, t)}
                            onClick={() => setSelected(event)}
                            style={{
                              left: `${event.leftPx}px`,
                              width: `${event.widthPx}px`,
                              ['--mt-evt' as string]: event.color || 'var(--color-accent)',
                              ['--mt-evt-status' as string]: statusToVar(event.status),
                            }}
                          >
                            <span
                              className="mt-tlv__evt-dot"
                              style={{ background: statusToVar(event.status) }}
                              aria-hidden="true"
                            />
                            {event.title}
                          </button>
                        ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>

      <EventDrawer event={selected} locale={locale} onClose={() => setSelected(null)} />
    </div>
  )
}

export default TimelineView
