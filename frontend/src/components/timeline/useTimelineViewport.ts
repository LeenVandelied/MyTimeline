'use client'

import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Band,
  DEFAULT_METRICS,
  INITIAL_HORIZONTAL_BAND,
  INITIAL_VERTICAL_BAND,
  OVERSCAN_X_PX,
  OVERSCAN_Y_PX,
  TimelineMetrics,
  UNBOUNDED_BAND,
  bandCovers,
  bandsEqual,
  expandBand,
  isUnboundedBand,
} from './virtualization'

/**
 * #69 — Fenêtre de rendu de la frise (source des bandes de virtualisation).
 *
 * Mesure la portion RÉELLEMENT visible du rail et la publie sous forme de deux
 * bandes de pixels (horizontale / verticale) en coordonnées rail, augmentées
 * d'un overscan qui sert aussi d'hystérésis : tant que la fenêtre visible reste
 * dans la bande rendue, aucun état ne change → aucun re-rendu au scroll.
 *
 * ⚠ AXE VERTICAL — la frise ne défile PAS verticalement d'elle-même :
 * `.mt-tlv__scroll` / `.mt-tlm__scroll` sont `overflow-x:auto; overflow-y:hidden`
 * (cf. `ds/components/timeline.css`). Le défilement vertical est celui de la
 * PAGE. La bande verticale est donc l'intersection du rail avec la zone visible
 * = (rect du conteneur de scroll) ∩ (viewport de la fenêtre), ce qui couvre les
 * deux cas (page scrollée ou conteneur borné par un parent).
 *
 * ⚠ GARDE-FOU « mesure impossible » — si le conteneur a une largeur nulle
 * (jsdom, `display:none`, composant non encore mis en page), le fenêtrage
 * renverrait une fenêtre vide et la frise disparaîtrait. Dans ce cas on bascule
 * sur `UNBOUNDED_BAND` : TOUT est rendu, comportement strictement identique à
 * l'avant-virtualisation. C'est ce qui rend les tests unitaires jsdom existants
 * valides sans modification (critère d'acceptation n°7).
 */
export interface TimelineViewport {
  /** Bande horizontale rendue (px depuis `rangeStart`, échelle du zoom). */
  horizontal: Band
  /** Bande verticale rendue (px depuis le haut du rail). */
  vertical: Band
  /** Géométrie verticale mesurée (mise à jour au 1er layout, puis au resize). */
  metrics: TimelineMetrics
  /** `false` quand la mesure est impossible → aucun fenêtrage appliqué. */
  measurable: boolean
  /**
   * Élargit immédiatement les bandes pour couvrir une cible hors fenêtre, sans
   * attendre l'événement de scroll. Utilisé par la navigation clavier : la
   * pastille visée doit être MONTÉE avant de pouvoir recevoir le focus.
   */
  ensureVisible: (horizontal: Band, vertical: Band) => void
  /**
   * Recale les bandes sur la fenêtre réellement visible (rétrécissement inclus).
   * À appeler après une série d'`ensureVisible`, qui ne fait qu'élargir.
   */
  resync: () => void
}

interface ViewportState {
  horizontal: Band
  vertical: Band
  metrics: TimelineMetrics
  measurable: boolean
}

/** Délai d'apaisement avant un recalage forcé de la fenêtre (cf. `resync`). */
const RESYNC_SETTLE_MS = 400

const INITIAL_STATE: ViewportState = {
  horizontal: INITIAL_HORIZONTAL_BAND,
  vertical: INITIAL_VERTICAL_BAND,
  metrics: DEFAULT_METRICS,
  measurable: true,
}

/** Hauteur réelle d'un élément (fractionnaire), ou `null` s'il n'est pas rendu. */
function measure(root: HTMLElement, testId: string): number | null {
  const el = root.querySelector(`[data-testid="${testId}"]`)
  if (!el) return null
  const height = el.getBoundingClientRect().height
  return height > 0 ? height : null
}

/**
 * Relit la géométrie verticale sur le DOM. Toute valeur non mesurable (élément
 * hors fenêtre à cet instant) conserve la dernière valeur connue — on ne
 * régresse jamais vers les défauts après une mesure réussie.
 */
function readMetrics(railEl: HTMLElement, previous: TimelineMetrics): TimelineMetrics {
  return {
    rulerHeight: measure(railEl, 'timeline-ruler') ?? previous.rulerHeight,
    headHeight: measure(railEl, 'timeline-group-head') ?? previous.headHeight,
    laneHeight: measure(railEl, 'timeline-resource-row') ?? previous.laneHeight,
  }
}

function metricsEqual(a: TimelineMetrics, b: TimelineMetrics): boolean {
  return (
    a.rulerHeight === b.rulerHeight &&
    a.headHeight === b.headHeight &&
    a.laneHeight === b.laneHeight
  )
}

export function useTimelineViewport(
  scrollRef: RefObject<HTMLDivElement | null>,
  railRef: RefObject<HTMLDivElement | null>,
  /**
   * Change quand la géométrie du rail change sans scroll (zoom, collapse,
   * arrivée de nouveaux events) → force une remesure au layout suivant.
   */
  geometryKey: string,
): TimelineViewport {
  const [state, setState] = useState<ViewportState>(INITIAL_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * `force` ignore l'hystérésis et RECALCULE les bandes depuis la fenêtre
   * visible — y compris pour les RÉTRÉCIR. Nécessaire après `ensureVisible` :
   * celui-ci ne fait qu'élargir, et une longue navigation clavier finirait sinon
   * par étendre la bande à toute la frise (retour au DOM complet).
   */
  const sync = useCallback(
    (force = false) => {
      const scrollEl = scrollRef.current
      const railEl = railRef.current
      if (!scrollEl || !railEl) return

      const previous = stateRef.current
      const clientWidth = scrollEl.clientWidth

      // Mesure impossible (jsdom, conteneur masqué) → on rend tout.
      if (clientWidth <= 0) {
        if (previous.measurable) {
          setState({
            horizontal: UNBOUNDED_BAND,
            vertical: UNBOUNDED_BAND,
            metrics: previous.metrics,
            measurable: false,
          })
        }
        return
      }

      const visibleHorizontal: Band = {
        start: scrollEl.scrollLeft,
        end: scrollEl.scrollLeft + clientWidth,
      }

      const railTop = railEl.getBoundingClientRect().top
      const scrollRect = scrollEl.getBoundingClientRect()
      const clipTop = Math.max(scrollRect.top, 0)
      const clipBottom = Math.min(scrollRect.bottom, window.innerHeight)
      const visibleVertical: Band = {
        start: clipTop - railTop,
        end: Math.max(clipTop, clipBottom) - railTop,
      }

      const metrics = readMetrics(railEl, previous.metrics)
      const wasUnmeasurable = !previous.measurable
      const horizontal =
        force || wasUnmeasurable || !bandCovers(previous.horizontal, visibleHorizontal)
          ? expandBand(visibleHorizontal, OVERSCAN_X_PX)
          : previous.horizontal
      const vertical =
        force || wasUnmeasurable || !bandCovers(previous.vertical, visibleVertical)
          ? expandBand(visibleVertical, OVERSCAN_Y_PX)
          : previous.vertical

      if (
        !wasUnmeasurable &&
        bandsEqual(horizontal, previous.horizontal) &&
        bandsEqual(vertical, previous.vertical) &&
        metricsEqual(metrics, previous.metrics)
      ) {
        return
      }
      setState({ horizontal, vertical, metrics, measurable: true })
    },
    [scrollRef, railRef],
  )

  // Coalesce les rafales d'événements de scroll en UNE mesure par frame.
  const frameRef = useRef<number | null>(null)
  const schedule = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      sync()
    })
  }, [sync])

  useLayoutEffect(() => {
    sync()
  }, [sync, geometryKey])

  useEffect(() => {
    // `capture: true` : les événements `scroll` ne remontent pas, mais la phase
    // de capture sur `window` les voit — un seul écouteur couvre le scroll de la
    // page ET celui du conteneur horizontal.
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [schedule])

  /**
   * Recalage complet APRÈS stabilisation : la bande revient à la fenêtre
   * réellement visible (les élargissements d'`ensureVisible` sont purgés).
   *
   * ⚠ Le délai n'est pas cosmétique. `.mt-tlv__scroll` est en
   * `scroll-behavior: smooth` : le `scrollIntoView` qui suit un déplacement
   * clavier est ANIMÉ. Un recalage à la frame suivante lirait l'ancienne
   * position de scroll, rétrécirait la bande et DÉMONTERAIT la pastille qu'on
   * vient de focaliser — le focus retomberait sur `<body>` (constaté au
   * navigateur : 299 déplacements sur 300 perdaient le focus). On attend donc
   * que la navigation et son défilement soient terminés ; chaque nouvel appel
   * repousse l'échéance.
   */
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resync = useCallback(() => {
    if (resyncTimerRef.current !== null) clearTimeout(resyncTimerRef.current)
    resyncTimerRef.current = setTimeout(() => {
      resyncTimerRef.current = null
      sync(true)
    }, RESYNC_SETTLE_MS)
  }, [sync])

  useEffect(
    () => () => {
      if (resyncTimerRef.current !== null) clearTimeout(resyncTimerRef.current)
    },
    [],
  )

  const ensureVisible = useCallback((horizontal: Band, vertical: Band) => {
    setState((previous) => {
      if (!previous.measurable) return previous
      const nextHorizontal = isUnboundedBand(previous.horizontal)
        ? previous.horizontal
        : {
            start: Math.min(previous.horizontal.start, horizontal.start - OVERSCAN_X_PX),
            end: Math.max(previous.horizontal.end, horizontal.end + OVERSCAN_X_PX),
          }
      const nextVertical = isUnboundedBand(previous.vertical)
        ? previous.vertical
        : {
            start: Math.min(previous.vertical.start, vertical.start - OVERSCAN_Y_PX),
            end: Math.max(previous.vertical.end, vertical.end + OVERSCAN_Y_PX),
          }
      if (
        bandsEqual(nextHorizontal, previous.horizontal) &&
        bandsEqual(nextVertical, previous.vertical)
      ) {
        return previous
      }
      return { ...previous, horizontal: nextHorizontal, vertical: nextVertical }
    })
  }, [])

  return {
    horizontal: state.horizontal,
    vertical: state.vertical,
    metrics: state.metrics,
    measurable: state.measurable,
    ensureVisible,
    resync,
  }
}

export default useTimelineViewport
