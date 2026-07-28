'use client'

import { RefObject, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FullCalendarEvent } from '@/types/event'
import { Resource, groupResourcesByCategory } from './lib'
import { useTimelineViewport } from './useTimelineViewport'
import {
  Band,
  LANE_VIRTUALIZATION_MIN_ROWS,
  TimelineMetrics,
  UNBOUNDED_BAND,
  buildVerticalModel,
} from './virtualization'
import {
  DAY_WIDTH_PX,
  buildMinimapBuckets,
  buildRulerTicks,
  buildWeekendSegments,
  computeRange,
  daysBetween,
  initialZoomState,
  positionEvents,
  zoomReducer,
  type PositionedEvent,
  type ZoomLevel,
} from './zoom'

/**
 * #63 — État partagé des vues Timeline mobiles (portrait #63 + paysage #64).
 *
 * Centralise TOUTE la logique non visuelle réutilisable par les deux variantes
 * mobiles : reducer de zoom (mêmes actions que desktop, `zoom.ts` NON dupliqué),
 * positions calculées (`lib.ts`/`zoom.ts` réutilisés), synchronisation scroll ↔
 * minimap, seek minimap, centrage initial sur aujourd'hui, pinch-zoom.
 *
 * BR-EVE-001 : ne consomme que les `events` fournis en props (déjà filtrés par
 * l'utilisateur authentifié côté data). Le zoom est un pur re-rendu client —
 * AUCUN refetch réseau (parité desktop).
 *
 * `viewportStart` / `zoom.level` restent en state React et NE sont PAS réinitialisés
 * au resize (préparation #64 : rotation portrait↔paysage sans perte de contexte).
 */
export interface TimelineMobileState {
  scrollRef: RefObject<HTMLDivElement | null>
  /** #69 — Rail interne : repère de mesure de la virtualisation. */
  railRef: RefObject<HTMLDivElement | null>
  /** #69 — Bande horizontale rendue (px), cf. `virtualization.ts`. */
  horizontalBand: Band
  /** #69 — Bande verticale rendue (px), `UNBOUNDED_BAND` sous le seuil de lanes. */
  verticalBand: Band
  /** #69 — Géométrie verticale mesurée (hauteur de règle / d'en-tête / de lane). */
  metrics: TimelineMetrics
  /** #69 — Top (px) de la liste de lanes de chaque catégorie. */
  listTops: Record<string, number>
  /** Positions calculées + métadonnées de la frise (échelle du zoom courant). */
  rangeStart: Date
  totalDays: number
  dayWidth: number
  railWidth: number
  ticks: ReturnType<typeof buildRulerTicks>
  eventsByResource: Map<string, PositionedEvent[]>
  resourcesByCategory: Record<string, Resource[]>
  buckets: number[]
  weekendSegments: ReturnType<typeof buildWeekendSegments>
  todayLeftPx: number
  now: Date
  /** Niveau de zoom courant (enum partagé `zoom.ts`). */
  zoomLevel: ZoomLevel
  /** Fenêtre visible pour la minimap (fraction [0..1]). */
  viewportStart: number
  viewportRatio: number
  // Actions
  zoomIn: () => void
  zoomOut: () => void
  onScroll: () => void
  onMinimapSeek: (start: number) => void
  scrollToToday: () => void
  /** À câbler sur `onWheel` (Ctrl/Meta) ET/OU sur un geste pinch. */
  onPinchZoom: (direction: 'in' | 'out') => void
}

export function useTimelineMobileState(
  events: FullCalendarEvent[],
  resources: Resource[],
  locale: string,
  today?: Date,
): TimelineMobileState {
  const [zoom, dispatch] = useReducer(zoomReducer, initialZoomState)
  const scrollRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [viewportStart, setViewportStart] = useState(0)
  const [viewportRatio, setViewportRatio] = useState(1)

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

  // #69 — Virtualisation (mêmes primitives que desktop, `virtualization.ts`).
  // Les vues mobiles n'ont PAS d'accordéon catégorie → aucune catégorie repliée.
  const geometryKey = `${dayWidth}|${totalDays}|${resources.length}`
  const viewport = useTimelineViewport(scrollRef, railRef, geometryKey)
  const groups = useMemo(() => Object.entries(resourcesByCategory), [resourcesByCategory])
  const verticalModel = useMemo(
    () => buildVerticalModel(groups, {}, viewport.metrics),
    [groups, viewport.metrics],
  )
  const verticalBand =
    verticalModel.visibleLaneCount >= LANE_VIRTUALIZATION_MIN_ROWS
      ? viewport.vertical
      : UNBOUNDED_BAND

  const rawOnScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || railWidth === 0) return
    setViewportStart(el.scrollLeft / railWidth)
    setViewportRatio(Math.min(1, el.clientWidth / railWidth))
  }, [railWidth])

  // #69 — Coalescence à une mesure par frame : `onScroll` déclenchait un rendu
  // complet de la frise à CHAQUE événement de scroll (premier poste de coût du
  // scroll horizontal, cf. ADR-007). La minimap reste à jour avant la peinture.
  const scrollFrameRef = useRef<number | null>(null)
  const onScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      rawOnScroll()
    })
  }, [rawOnScroll])

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    },
    [],
  )

  // Resynchronise la fenêtre minimap quand l'échelle change (zoom) SANS reset du
  // niveau (préparation #64 : rotation ne perd pas le contexte de zoom).
  useEffect(() => {
    rawOnScroll()
  }, [rawOnScroll, dayWidth, totalDays])

  const onMinimapSeek = useCallback(
    (start: number) => {
      const el = scrollRef.current
      if (!el) return
      el.scrollLeft = start * railWidth
      setViewportStart(start)
    },
    [railWidth],
  )

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const target = todayLeftPx - el.clientWidth / 2
    el.scrollLeft = Math.max(0, target)
  }, [todayLeftPx])

  // Centrage initial sur aujourd'hui (une fois au montage).
  useEffect(() => {
    scrollToToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const zoomIn = useCallback(() => dispatch({ type: 'ZOOM_IN' }), [])
  const zoomOut = useCallback(() => dispatch({ type: 'ZOOM_OUT' }), [])
  const onPinchZoom = useCallback(
    (direction: 'in' | 'out') =>
      dispatch(direction === 'in' ? { type: 'ZOOM_IN' } : { type: 'ZOOM_OUT' }),
    [],
  )

  return {
    scrollRef,
    railRef,
    horizontalBand: viewport.horizontal,
    verticalBand,
    metrics: viewport.metrics,
    listTops: verticalModel.listTops,
    rangeStart,
    totalDays,
    dayWidth,
    railWidth,
    ticks,
    eventsByResource,
    resourcesByCategory,
    buckets,
    weekendSegments,
    todayLeftPx,
    now,
    zoomLevel: zoom.level,
    viewportStart,
    viewportRatio,
    zoomIn,
    zoomOut,
    onScroll,
    onMinimapSeek,
    scrollToToday,
    onPinchZoom,
  }
}

export default useTimelineMobileState
