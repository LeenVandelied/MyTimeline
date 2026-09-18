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
  DEFAULT_MIN_WIDTH_PX,
  PIN_FOOTPRINT_PX,
  zoomReducer,
  type PositionedEvent,
  type ZoomLevel,
} from './zoom'
import {
  indexRecurrenceByResource,
  scaleRecurrenceMarks,
  type SeriesMarks,
} from './recurrence-marks'

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
/**
 * #706 — GOUTTIÈRE DE PISTE MOBILE (px). Pendant de `LANE_TRACK_OFFSET_PX`
 * (desktop, #392) pour les vues `.mt-tlm*`. Largeur réservée en tête de rail
 * pour l'en-tête de lane sticky (`.mt-tlm__lane-label`), qui est OPAQUE et
 * recouvre en permanence le bord gauche du viewport : sans elle, un événement
 * posé à moins de cette distance de `rangeStart` naît SOUS la colonne et aucun
 * défilement ne l'en sort. C'est le cas nominal à l'ouverture — `computeRange`
 * pose `rangeStart` 30 jours avant le premier événement, soit 66px au zoom
 * Année (30 × 2,2) pour 120px de colonne.
 *
 * DEUX REPÈRES cohabitent donc, et il ne faut pas les confondre :
 *  - repère PISTE  : `leftPx` des events / graduations, origine = `rangeStart` ;
 *  - repère RAIL   : ce que mesure `scrollLeft`, origine = bord du rail
 *                    = repère piste + cette gouttière.
 * Le décalage lui-même est appliqué en CSS (`margin-left:var(--lane-header-w-m)`
 * sur les enfants positionnés du rail, cf. `ds/components/timeline.css`) : le JS
 * n'en a besoin que là où il raisonne en repère RAIL (largeur du rail, scroll,
 * minimap, bandes de virtualisation).
 *
 * ⚠ MIROIR du token `--lane-header-w-m` (`ds/tokens/spacing.css`). Il ne peut
 * pas être lu depuis le DOM : `railWidth` participe au rendu SERVEUR et un
 * `getComputedStyle` divergerait à l'hydratation. Même convention que
 * `LANE_TRACK_OFFSET_PX`, et verrouillé par un test de dérive
 * (`TimelineMobilePortrait.test.tsx`).
 */
export const MOBILE_LANE_TRACK_OFFSET_PX = 120

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
  /** #706 — étendue TEMPORELLE en px (repère PISTE), gouttière EXCLUE. */
  trackWidth: number
  /** #706 — largeur défilable du rail = `trackWidth` + gouttière (repère RAIL). */
  railWidth: number
  ticks: ReturnType<typeof buildRulerTicks>
  eventsByResource: Map<string, PositionedEvent[]>
  /** #595 — marques de récurrence (fantômes + connecteur) par lane, à fenêtrer au rendu. */
  recurrenceByResource: Map<string, SeriesMarks[]>
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
  // #706 — `trackWidth` = étendue TEMPORELLE en px (repère piste) ; `railWidth` =
  // largeur réellement défilable, gouttière d'en-tête comprise (repère rail).
  // Distinguer les deux est ce qui garde la minimap exacte : elle représente la
  // piste, pas la gouttière.
  const trackWidth = useMemo(() => totalDays * dayWidth, [totalDays, dayWidth])
  const railWidth = trackWidth + MOBILE_LANE_TRACK_OFFSET_PX

  const ticks = useMemo(
    () => buildRulerTicks(rangeStart, totalDays, zoom.level, dayWidth, locale),
    [rangeStart, totalDays, zoom.level, dayWidth, locale],
  )

  const eventsByResource = useMemo(
    // #594 — emprise réservée d'un ponctuel : 90 px en mobile (maquette `layoutLane`).
    () =>
      positionEvents(
        events,
        rangeStart,
        dayWidth,
        now,
        DEFAULT_MIN_WIDTH_PX,
        PIN_FOOTPRINT_PX.mobile,
      ),
    [events, rangeStart, dayWidth, now],
  )
  // #595 — occurrences fantômes + connecteurs (mêmes passes que le desktop). La passe en
  // jours ne dépend pas du zoom ; la mise à l'échelle, si.
  // #706 — coupe à `trackWidth` : `scaleRecurrenceMarks` raisonne en repère PISTE
  // (cf. son paramètre `trackWidth`). Couper à `railWidth` laisserait désormais
  // passer une marque au-delà de la fin de plage, sur la largeur de la gouttière.
  const recurrenceIndex = useMemo(
    () => indexRecurrenceByResource(events, rangeStart, totalDays),
    [events, rangeStart, totalDays],
  )
  const recurrenceByResource = useMemo(
    () => scaleRecurrenceMarks(recurrenceIndex, dayWidth, trackWidth),
    [recurrenceIndex, dayWidth, trackWidth],
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

  // #706 — `useTimelineViewport` publie ses bandes en repère RAIL (elles viennent
  // de `scrollLeft`) ; les `leftPx` fenêtrés sont en repère PISTE. On recale donc
  // la bande horizontale, exactement comme le desktop depuis #392. `±Infinity`
  // traverse la soustraction : `UNBOUNDED_BAND` (jsdom, conteneur non mesurable)
  // reste non bornée → rendu complet, comme avant.
  const horizontalBand = useMemo(
    () => ({
      start: viewport.horizontal.start - MOBILE_LANE_TRACK_OFFSET_PX,
      end: viewport.horizontal.end - MOBILE_LANE_TRACK_OFFSET_PX,
    }),
    [viewport.horizontal],
  )

  // #706 — la minimap cartographie la PISTE (buckets d'events par jour), pas le
  // rail : on retire la gouttière de `scrollLeft` avant de normaliser, sinon la
  // fenêtre dérive de `MOBILE_LANE_TRACK_OFFSET_PX / trackWidth` sur toute la course.
  const rawOnScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || trackWidth === 0) return
    setViewportStart(Math.max(0, (el.scrollLeft - MOBILE_LANE_TRACK_OFFSET_PX) / trackWidth))
    setViewportRatio(Math.min(1, el.clientWidth / trackWidth))
  }, [trackWidth])

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
      // #706 — réciproque exacte de `rawOnScroll` (repère piste → rail).
      el.scrollLeft = MOBILE_LANE_TRACK_OFFSET_PX + start * trackWidth
      setViewportStart(start)
    },
    [trackWidth],
  )

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // #706 — `todayLeftPx` est en repère PISTE → passage en repère rail.
    const target = MOBILE_LANE_TRACK_OFFSET_PX + todayLeftPx - el.clientWidth / 2
    el.scrollLeft = Math.max(0, target)
  }, [todayLeftPx])

  // #328 — Valeurs fraîches lisibles depuis `setScrollNode`, dont l'identité doit
  // rester STABLE (une ref callback re-créée serait rappelée null→node à chaque
  // rendu, ce qui rejouerait une restauration parasite).
  const trackWidthRef = useRef(trackWidth)
  trackWidthRef.current = trackWidth
  const todayLeftPxRef = useRef(todayLeftPx)
  todayLeftPxRef.current = todayLeftPx
  const rawOnScrollRef = useRef(rawOnScroll)
  rawOnScrollRef.current = rawOnScroll

  /** Position mémorisée au démontage de la variante précédente (px rail + échelle piste). */
  const detachedScrollRef = useRef<{ scrollLeft: number; trackWidth: number } | null>(null)
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
          trackWidth: trackWidthRef.current,
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
      //
      // LIMITE ASSUMÉE de la branche « fraction » : `saved.scrollLeft` a été lu au
      // détachement, donc DÉJÀ CLAMPÉ à `scrollWidth - clientWidth` par le relayout
      // (cf. commentaire du détachement ci-dessus). La fraction reportée n'est donc
      // pas celle VOULUE par l'utilisateur mais celle de sa position clampée : si le
      // clamp a mordu, on reporte une fraction sous-estimée. Le report en px (branche
      // `else`) est immunisé — le clamp y est idempotent — la fraction ne l'est pas.
      // Corriger exigerait de capturer la position sur les scrolls utilisateur, pas
      // au détachement. Non fait : la branche n'est atteignable que si le zoom change
      // PENDANT la rotation, cas qu'aucun test ne couvre et qu'aucun parcours produit
      // ne produit.
      //
      // #706 — la re-projection se fait en repère PISTE (gouttière retirée puis
      // remise) : la gouttière est une constante en px, elle ne se met PAS à
      // l'échelle avec le zoom. La mettre à l'échelle décalerait la position de
      // `MOBILE_LANE_TRACK_OFFSET_PX × (track/savedTrack − 1)` px.
      const savedTrack = saved.trackWidth
      const track = trackWidthRef.current
      node.scrollLeft =
        savedTrack > 0 && track > 0 && savedTrack !== track
          ? MOBILE_LANE_TRACK_OFFSET_PX +
            ((saved.scrollLeft - MOBILE_LANE_TRACK_OFFSET_PX) / savedTrack) * track
          : saved.scrollLeft
    } else if (!anchoredRef.current) {
      // #706 — repère RAIL + centrage (identique à `scrollToToday`).
      node.scrollLeft = Math.max(
        0,
        MOBILE_LANE_TRACK_OFFSET_PX + todayLeftPxRef.current - node.clientWidth / 2,
      )
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
    horizontalBand,
    verticalBand,
    metrics: viewport.metrics,
    listTops: verticalModel.listTops,
    rangeStart,
    totalDays,
    dayWidth,
    trackWidth,
    railWidth,
    ticks,
    eventsByResource,
    recurrenceByResource,
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
