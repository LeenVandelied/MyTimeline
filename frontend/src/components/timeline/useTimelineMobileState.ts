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
 *
 * #328 — `scrollLeft` était le SEUL morceau d'état resté purement DOM : il vivait
 * sur l'élément de la variante (portrait OU paysage), donc la rotation le
 * détruisait avec le démontage de cette variante (mesuré : 400 → 0). Il est
 * désormais mémorisé au DÉTACHEMENT de la ref et restauré à l'ATTACHEMENT de la
 * variante suivante, via la ref CALLBACK `setScrollNode` (à câbler sur le
 * conteneur scrollable À LA PLACE de `scrollRef`). Le déclencheur est le
 * changement de variante lui-même, pas le montage du hook — `scrollToToday` ne
 * rejoue donc PAS et n'écrase pas la position utilisateur (inversion du bug).
 *
 * CE QUE LE MÉCANISME NE FAIT PAS (mesuré en navigateur, sprint 51) : il ne
 * « sauve » PAS la position avant sa perte. Au démontage, `scrollLeft` a DÉJÀ été
 * clampé par le navigateur : le relayout consécutif à la rotation précède de
 * plusieurs étapes le démontage React (`clientWidth` mesuré 340 → 794, `scrollLeft`
 * 392 → 0 AVANT que cette callback ne soit rappelée avec `null`). La restauration
 * fonctionne parce que le navigateur RE-CLAMPE identiquement à l'attachement —
 * `clamp(x, max)` est idempotent — pas parce que la valeur aurait été mise à
 * l'abri. Conséquence directe : si le rail entre EN ENTIER dans la nouvelle
 * orientation (`scrollWidth === clientWidth`), le seul `scrollLeft` atteignable
 * est 0, et la position d'origine n'est récupérable NI ici NI ailleurs sans
 * mémoriser l'intention utilisateur en amont du relayout.
 *
 * Le layout, lui, EST disponible au moment de l'attachement de la ref (mesuré :
 * `scrollWidth` déjà à sa valeur finale) — aucun `rAF` / `useLayoutEffect` n'est
 * requis pour que l'écriture de `scrollLeft` porte.
 */
export interface TimelineMobileState {
  /**
   * Lecture seule : l'élément scrollable actuellement monté. Le câblage JSX passe
   * par `setScrollNode` (#328), pas par cette ref.
   */
  scrollRef: RefObject<HTMLDivElement | null>
  /**
   * #328 — Ref CALLBACK du conteneur scrollable (`ref={state.setScrollNode}`).
   * Mémorise `scrollLeft` au démontage d'une variante et le restaure sur la
   * suivante ; au tout premier attachement, centre sur aujourd'hui.
   */
  setScrollNode: (node: HTMLDivElement | null) => void
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
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

  // #328 — Valeurs fraîches lisibles depuis `setScrollNode`, dont l'identité doit
  // rester STABLE (une ref callback re-créée serait rappelée null→node à chaque
  // rendu, ce qui rejouerait une restauration parasite).
  const railWidthRef = useRef(railWidth)
  railWidthRef.current = railWidth
  const todayLeftPxRef = useRef(todayLeftPx)
  todayLeftPxRef.current = todayLeftPx
  const rawOnScrollRef = useRef(rawOnScroll)
  rawOnScrollRef.current = rawOnScroll

  /** Position mémorisée au démontage de la variante précédente (px + échelle). */
  const detachedScrollRef = useRef<{ scrollLeft: number; railWidth: number } | null>(null)
  /** Le centrage initial sur aujourd'hui n'a lieu qu'au TOUT premier attachement. */
  const anchoredRef = useRef(false)

  const setScrollNode = useCallback((node: HTMLDivElement | null) => {
    // Détachement : la variante est démontée. ATTENTION — `scrollLeft` lu ici est
    // la valeur DÉJÀ CLAMPÉE par le relayout de la rotation, pas la position
    // d'avant rotation (cf. bloc de tête). Le report reste correct par idempotence
    // du clamp, mais toute évolution qui voudrait récupérer la position ORIGINALE
    // devra la capturer sur les scrolls utilisateur, pas ici.
    if (node === null) {
      const previous = scrollRef.current
      if (previous) {
        detachedScrollRef.current = {
          scrollLeft: previous.scrollLeft,
          railWidth: railWidthRef.current,
        }
      }
      scrollRef.current = null
      return
    }

    scrollRef.current = node
    const saved = detachedScrollRef.current
    detachedScrollRef.current = null

    if (saved) {
      // Rotation : l'échelle du rail ne change pas avec l'orientation → report en
      // px à l'identique. Si elle a changé malgré tout (zoom pendant le switch),
      // on reporte la FRACTION pour rester cohérent avec `viewportStart`.
      node.scrollLeft =
        saved.railWidth > 0 && railWidthRef.current > 0 && saved.railWidth !== railWidthRef.current
          ? (saved.scrollLeft / saved.railWidth) * railWidthRef.current
          : saved.scrollLeft
    } else if (!anchoredRef.current) {
      node.scrollLeft = Math.max(0, todayLeftPxRef.current - node.clientWidth / 2)
    }
    anchoredRef.current = true

    // Resynchronise la fenêtre minimap sur le scroll RÉEL de la variante montée :
    // `clientWidth` change avec l'orientation → `viewportRatio` doit suivre.
    rawOnScrollRef.current()
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
    setScrollNode,
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
