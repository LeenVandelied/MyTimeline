'use client'

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronRight, Maximize2, Minus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FullCalendarEvent } from '@/types/event'
import { Resource, buildEventAriaLabel, groupResourcesByCategory } from './lib'
import { Minimap } from './Minimap'
import { EventDrawer } from './EventDrawer'
import { EventPill } from './EventPill'
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
 *
 * ============================================================================
 * #81 — PATTERN CLAVIER / A11Y de la frise (à formaliser par #197 dans
 * `.claude/rules-jit/ux-patterns.md`) :
 *
 *  - REGION LANDMARK : la frise est une `<section role="region">` avec un
 *    `aria-label` descriptif + `aria-describedby` (aide clavier sr-only) → les
 *    lecteurs d'écran (VoiceOver/NVDA) l'annoncent comme repère navigable.
 *
 *  - ROVING TABINDEX : les pastilles d'une même « grille » (lanes VISIBLES ×
 *    pastilles) partagent UN SEUL arrêt de tabulation. Seule la pastille active
 *    porte `tabIndex=0` ; les autres `tabIndex=-1`. Conséquence a11y voulue : la
 *    frise ne « piège » pas le Tab (des dizaines d'events = 1 seul stop) → le
 *    bouton primaire « Nouvel événement » reste atteignable en ≤ 6 Tab (point 4).
 *
 *  - NAVIGATION FLÈCHES (déléguée par `EventPill.onKeyDown`) :
 *      ← / →  : pastille précédente / suivante DANS la lane (puis déborde sur la
 *               lane voisine aux extrémités) ;
 *      ↑ / ↓  : lane précédente / suivante, en conservant l'index de colonne
 *               (clampé au nombre de pastilles de la lane cible) ;
 *      Home / End : première / dernière pastille de la frise.
 *    Enter / Espace ouvrent le drawer NATIVEMENT (`<button>`) — aucun handler
 *    custom (pas de double-ouverture). Les lanes COLLAPSÉES sont exclues de la
 *    navigation (leurs pastilles ne sont pas rendues).
 *
 *  - ANNONCES `aria-live="polite"` : une région sr-only annonce (1) le niveau de
 *    zoom à chaque changement et (2) l'event sélectionné à l'ouverture du drawer.
 *
 *  - Minimap NON concernée : elle est DÉJÀ roving (`role=slider`, #55). Ne pas la
 *    refaire ici.
 * ============================================================================
 */
export interface TimelineViewProps {
  events: FullCalendarEvent[]
  resources: Resource[]
  locale: string
  today?: Date
  /**
   * #absorb (gap A) — ouvre l'édition d'un event depuis le drawer desktop. Câblé par
   * `TimelineEditHost`. Absent → drawer lecture seule historique (aucune régression).
   */
  onEditEvent?: (event: PositionedEvent) => void
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  resources,
  locale,
  today,
  onEditEvent,
}) => {
  const t = useTranslations()
  const [zoom, dispatch] = useReducer(zoomReducer, initialZoomState)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // #195 — Accordéon de 2e niveau : état collapse par PRODUIT (lane), keyé par
  // `resource.id`. Indépendant de `collapsed` (catégorie) : replier un produit
  // n'affecte ni les autres produits ni la catégorie parente. Même préservation
  // de scroll que le collapse catégorie (aucun mécanisme explicite — le conteneur
  // scrollable garde son scrollLeft/Top au re-rendu React).
  const [collapsedResources, setCollapsedResources] = useState<Record<string, boolean>>({})
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

  // #81 — Modèle plat de navigation clavier : la « grille » des lanes VISIBLES
  // (catégorie non collapsée) → chaque entrée = { resourceId, events[] }. L'ordre
  // suit le rendu (catégories puis ressources). Les lanes des catégories
  // collapsées sont EXCLUES (pastilles non rendues → non focusables).
  const navLanes = useMemo(() => {
    const lanes: Array<{ resourceId: string; events: PositionedEvent[] }> = []
    for (const [category, resList] of Object.entries(resourcesByCategory)) {
      if (collapsed[category] ?? false) continue
      for (const resource of resList) {
        // #195 — Une lane produit collapsée n'a plus de pastilles rendues → on
        // l'exclut aussi de la nav clavier (comme les catégories collapsées),
        // sinon ←→↑↓ cibleraient des pastilles masquées (bug focus).
        if (collapsedResources[resource.id] ?? false) continue
        lanes.push({ resourceId: resource.id, events: eventsByResource.get(resource.id) || [] })
      }
    }
    return lanes
  }, [resourcesByCategory, collapsed, collapsedResources, eventsByResource])

  // #81 — Roving tabindex : la pastille active (celle qui porte tabIndex=0) est
  // repérée par sa RESSOURCE (`resourceId`) + son index d'event, PAS par un index
  // de lane. Motif (MAJEUR-2) : `navLanes` rétrécit quand une catégorie AU-DESSUS
  // se collapse → un index de lane mémorisé glisserait vers une AUTRE ressource.
  // Une clé resource-keyée est stable face au collapse/expand. `null` = aucune
  // encore focalisée → la 1re pastille non vide devient l'arrêt par défaut.
  const [activeNav, setActiveNav] = useState<{ resourceId: string; evt: number } | null>(null)
  // Index des nodes DOM des pastilles (clé "laneIdx:evtIdx") pour `.focus()`.
  const pillNodes = useRef(new Map<string, HTMLButtonElement>())

  const navKeyOf = (lane: number, evt: number) => `${lane}:${evt}`

  // Lookup resourceId → index de lane dans `navLanes` (le rendu itère par
  // ressource ; on retrouve ainsi la coordonnée de navigation de chaque pastille).
  const laneIndexByResource = useMemo(() => {
    const m = new Map<string, number>()
    navLanes.forEach((l, i) => m.set(l.resourceId, i))
    return m
  }, [navLanes])

  // Première pastille non vide de la frise (fallback de l'arrêt de tabulation).
  const firstNav = useMemo(() => {
    const lane = navLanes.findIndex((l) => l.events.length > 0)
    return lane === -1 ? null : { lane, evt: 0 }
  }, [navLanes])

  // La pastille qui porte tabIndex=0 : l'active si sa RESSOURCE est toujours
  // visible ET son index d'event toujours valide, sinon la 1re. On dérive la
  // coordonnée de lane à la volée depuis `resourceId` → immunisé au glissement
  // d'index provoqué par le collapse d'une catégorie au-dessus (MAJEUR-2).
  const rovingNav = useMemo(() => {
    if (activeNav) {
      const lane = laneIndexByResource.get(activeNav.resourceId)
      if (lane != null && activeNav.evt < navLanes[lane].events.length) {
        return { lane, evt: activeNav.evt }
      }
    }
    return firstNav
  }, [activeNav, navLanes, laneIndexByResource, firstNav])

  // Déplace le focus. Reçoit des coordonnées (lane, evt) — inchangé pour
  // `onPillKeyDown` — mais mémorise l'état en resource-keyé (MAJEUR-2 : stable au
  // collapse). Défensif : ne `.focus()` que si le node est présent (la
  // virtualisation Wave 7, non livrée, pourrait recycler le DOM plus tard).
  // MAJEUR-1 : `scrollIntoView` explicite — le scroll natif de `.focus()` ne
  // garantit pas le défilement du conteneur de lanes vertical NI du rail
  // horizontal → sans ça la pastille focalisée peut rester hors écran sur ↑↓←→.
  const focusNav = useCallback(
    (lane: number, evt: number) => {
      const resourceId = navLanes[lane]?.resourceId
      if (resourceId != null) setActiveNav({ resourceId, evt })
      const node = pillNodes.current.get(`${lane}:${evt}`)
      if (node) {
        node.focus()
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    },
    [navLanes],
  )

  // #81 — Navigation clavier déléguée par `EventPill`. ←→ dans/entre lanes,
  // ↑↓ entre lanes (colonne conservée + clampée), Home/End extrémités globales.
  const onPillKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, lane: number, evt: number) => {
      const lanes = navLanes
      if (lanes.length === 0) return

      const nextNonEmptyLane = (from: number, dir: 1 | -1): number => {
        let i = from
        while (i >= 0 && i < lanes.length) {
          if (lanes[i].events.length > 0) return i
          i += dir
        }
        return -1
      }

      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault()
          if (evt + 1 < lanes[lane].events.length) {
            focusNav(lane, evt + 1)
          } else {
            const nl = nextNonEmptyLane(lane + 1, 1)
            if (nl !== -1) focusNav(nl, 0)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (evt - 1 >= 0) {
            focusNav(lane, evt - 1)
          } else {
            const pl = nextNonEmptyLane(lane - 1, -1)
            if (pl !== -1) focusNav(pl, lanes[pl].events.length - 1)
          }
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const nl = nextNonEmptyLane(lane + 1, 1)
          if (nl !== -1) focusNav(nl, Math.min(evt, lanes[nl].events.length - 1))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const pl = nextNonEmptyLane(lane - 1, -1)
          if (pl !== -1) focusNav(pl, Math.min(evt, lanes[pl].events.length - 1))
          break
        }
        case 'Home': {
          e.preventDefault()
          const fl = nextNonEmptyLane(0, 1)
          if (fl !== -1) focusNav(fl, 0)
          break
        }
        case 'End': {
          e.preventDefault()
          const ll = nextNonEmptyLane(lanes.length - 1, -1)
          if (ll !== -1) focusNav(ll, lanes[ll].events.length - 1)
          break
        }
        default:
          break
      }
    },
    [navLanes, focusNav],
  )

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

  // #81 — Région `aria-live="polite"` (sr-only) : annonce le niveau de zoom à
  // chaque changement + l'event à l'ouverture du drawer. On garde UNE seule
  // string ; la dernière écriture gagne (annonce la plus récente).
  const [liveMessage, setLiveMessage] = useState('')

  // Annonce le zoom quand il CHANGE (ignore le rendu initial + les double-invokes
  // StrictMode : on mémorise le dernier niveau annoncé, on ne parle que sur une
  // transition réelle — évite une annonce parasite « au chargement »).
  const lastAnnouncedZoom = useRef<string | null>(null)
  useEffect(() => {
    if (lastAnnouncedZoom.current === null) {
      lastAnnouncedZoom.current = zoom.level
      return
    }
    if (lastAnnouncedZoom.current === zoom.level) return
    lastAnnouncedZoom.current = zoom.level
    setLiveMessage(`${t('dashboard.timeline.live.zoom')} ${levelLabel}`)
  }, [zoom.level, levelLabel, t])

  // Annonce l'event sélectionné (ouverture du drawer). Vidé à la fermeture.
  useEffect(() => {
    if (selected) {
      setLiveMessage(`${t('dashboard.timeline.live.selected')} ${selected.title}`)
    }
  }, [selected, t])

  const shortcuts: Array<[string, string]> = [
    ['T', t('dashboard.timeline.help.today')],
    ['[  ]', t('dashboard.timeline.help.period')],
    ['+  −', t('dashboard.timeline.help.zoom')],
    ['F', t('dashboard.timeline.help.fullscreen')],
    ['Échap', t('dashboard.timeline.help.escape')],
  ]

  return (
    // #81 — REGION LANDMARK : la frise est un repère navigable pour les lecteurs
    // d'écran (`role="region"` explicite + `aria-label` descriptif). L'aide
    // clavier sr-only (`aria-describedby`) est lue à l'entrée dans la région.
    <section
      className="mt-tlv"
      ref={rootRef}
      role="region"
      aria-label={t('dashboard.timeline.region.label')}
      aria-describedby="timeline-region-desc"
      data-testid="timeline-view"
    >
      {/* Description a11y (sr-only) : rappelle les raccourcis de navigation. */}
      <p id="timeline-region-desc" className="sr-only">
        {t('dashboard.timeline.region.description')}
      </p>
      {/* Région d'annonces vocales (zoom / sélection). polite = non intrusif. */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="timeline-live-region"
      >
        {liveMessage}
      </div>
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
                    const isResCollapsed = collapsedResources[resource.id] ?? false
                    const laneEvents = eventsByResource.get(resource.id) || []
                    return (
                      <div
                        key={resource.id}
                        className="mt-tlv__lane"
                        style={{ backgroundSize: `${dayWidth}px 100%` }}
                        data-testid="timeline-resource-row"
                      >
                        {/* #195 — Accordéon de 2e niveau : le label produit sticky
                            devient un bouton toggle (mirror de `mt-tlv__group-head`).
                            Bouton natif → clavier Enter/Espace + `aria-expanded`
                            cohérents avec l'accordéon catégorie. Reste visible même
                            collapsé (identifie la lane pendant le scroll horizontal). */}
                        <button
                          type="button"
                          className="mt-tlv__lane-label mt-tlv__lane-head"
                          aria-expanded={!isResCollapsed}
                          onClick={() =>
                            setCollapsedResources((prev) => ({
                              ...prev,
                              [resource.id]: !isResCollapsed,
                            }))
                          }
                          title={resource.title}
                          data-testid="timeline-resource-head"
                        >
                          <ChevronRight
                            className={
                              isResCollapsed ? 'mt-tlv__chev' : 'mt-tlv__chev mt-tlv__chev--open'
                            }
                            size={13}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          <span
                            className="mt-tlv__lane-head-text"
                            data-testid="timeline-resource-title"
                          >
                            {resource.title}
                          </span>
                        </button>
                        {!isResCollapsed &&
                          laneEvents.map((event, evtIdx) => {
                            const laneIdx = laneIndexByResource.get(resource.id) ?? -1
                            const isRoving =
                              rovingNav !== null &&
                              rovingNav.lane === laneIdx &&
                              rovingNav.evt === evtIdx
                            const key = navKeyOf(laneIdx, evtIdx)
                            return (
                              <EventPill
                                key={event.id}
                                event={event}
                                ariaLabel={buildEventAriaLabel(event, locale, t)}
                                onSelect={setSelected}
                                tabIndex={isRoving ? 0 : -1}
                                navKey={key}
                                onKeyDown={(e) => onPillKeyDown(e, laneIdx, evtIdx)}
                                pillRef={(node) => {
                                  // Indexe le node pour `.focus()` défensif ; nettoie
                                  // à l'unmount (évite les refs pendantes au collapse).
                                  if (node) pillNodes.current.set(key, node)
                                  else pillNodes.current.delete(key)
                                }}
                              />
                            )
                          })}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>

      <EventDrawer
        event={selected}
        locale={locale}
        onClose={() => setSelected(null)}
        onEdit={
          onEditEvent
            ? (event) => {
                setSelected(null)
                onEditEvent(event)
              }
            : undefined
        }
      />
    </section>
  )
}

export default TimelineView
