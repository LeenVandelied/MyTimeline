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
  indexEventsByResource,
  initialZoomState,
  scaleEventPositions,
  zoomReducer,
  type PositionedEvent,
  type RulerTick,
} from './zoom'
import { useTimelineViewport } from './useTimelineViewport'
import {
  LANE_VIRTUALIZATION_MIN_ROWS,
  UNBOUNDED_BAND,
  buildVerticalModel,
  windowEvents,
  windowLanes,
  type TimelineMetrics,
  type WindowedEvent,
} from './virtualization'

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
 *
 * ============================================================================
 * #69 — VIRTUALISATION (2 axes, cf. `virtualization.ts` + ADR-007) :
 *
 *  - HORIZONTAL (toujours actif) : seules les pastilles dont l'intervalle
 *    `[leftPx, leftPx+widthPx]` croise la plage temporelle visible (+ overscan)
 *    sont montées. C'est l'axe qui porte le gain : à 1000 events, 96,7 % des
 *    pastilles étaient hors écran (mesure baseline).
 *
 *  - VERTICAL (au-delà de `LANE_VIRTUALIZATION_MIN_ROWS` lanes) : seules les
 *    lanes de la fenêtre sont montées, encadrées de deux CALES qui préservent la
 *    hauteur totale → scrollbar, ligne TODAY et overlays week-end inchangés.
 *
 *  - INVARIANTS PRÉSERVÉS : les index de navigation (`navLanes`, index d'event)
 *    restent ceux du modèle COMPLET ; le roving tabindex reste resource-keyé ;
 *    `focusNav` élargit la fenêtre puis focalise la pastille dès son montage
 *    (`pendingFocusRef`) → aucune cible clavier « sautée ».
 *
 *  - MESURE IMPOSSIBLE (jsdom, conteneur masqué) → bandes non bornées, TOUT est
 *    rendu : comportement identique à l'avant-#69.
 * ============================================================================
 */
/** #69 — Durée de validité d'une cible de focus clavier en attente de montage. */
const PENDING_FOCUS_TTL_MS = 1000

/**
 * ============================================================================
 * #349 — MÉMOÏSATION DU RENDU (cf. ADR-007, « le dernier volet n'est pas tenu »)
 *
 * Constat mesuré au banc : la frise se re-rend ENTIÈREMENT à CHAQUE frame de
 * scroll — pas seulement aux franchissements de bande. `syncViewportFromScroll`
 * pousse `viewportStart` / `viewportRatio` (minimap) une fois par frame, ce qui
 * reconstruit les ~66 graduations de règle, les 12 en-têtes de catégorie, les
 * 24 lanes montées et leurs pastilles, alors que RIEN de tout cela n'a changé.
 * Les franchissements de bande ne font qu'ajouter le fenêtrage par-dessus.
 *
 * La parade tient en deux points, et le second est indispensable au premier
 * (piège rappelé par l'issue : `React.memo` ne sert à rien si une prop est
 * recréée à chaque rendu du parent) :
 *  1. les parties invariantes au scroll deviennent des composants `React.memo` ;
 *  2. TOUTES leurs props sont rendues stables — callbacks `useCallback` sans
 *     dépendance volatile, `metrics` figé tant que ses valeurs ne bougent pas,
 *     et surtout un CACHE D'IDENTITÉ sur le résultat du fenêtrage horizontal
 *     (`windowEvents` renvoie un tableau neuf à chaque appel, même quand la
 *     lane contient exactement les mêmes événements).
 * ============================================================================
 */

/** Tableau vide PARTAGÉ : une lane repliée garde ainsi une prop stable. */
const NO_EVENTS: WindowedEvent[] = []

/**
 * #392 — GOUTTIÈRE DE PISTE (px). Largeur réservée en tête de rail pour
 * l'en-tête de lane sticky (`.mt-tlv__lane-label`), qui est opaque et recouvre
 * en permanence le bord gauche du viewport. Sans elle, une pastille posée à
 * moins de cette distance de `rangeStart` naît SOUS l'en-tête et n'est
 * atteignable à la souris à AUCUN niveau de scroll (cf. #392, mesuré à 150px
 * au zoom Trimestre).
 *
 * DEUX REPÈRES cohabitent donc, et il ne faut pas les confondre :
 *  - repère PISTE  : `leftPx` des events / graduations, origine = `rangeStart` ;
 *  - repère RAIL   : ce que mesure `scrollLeft`, origine = bord du rail
 *                    = repère piste + cette gouttière.
 * Le décalage lui-même est appliqué en CSS (`margin-left:var(--lane-header-w)`
 * sur les enfants positionnés du rail, cf. `ds/components/timeline.css`) : le
 * JS n'en a besoin que là où il raisonne en repère RAIL (largeur du rail,
 * scroll, minimap, bandes de virtualisation).
 *
 * ⚠ MIROIR du token `--lane-header-w` (`ds/tokens/spacing.css`). Il ne peut pas
 * être lu depuis le DOM : `railWidth` participe au rendu SERVEUR, et un
 * `getComputedStyle` divergerait à l'hydratation. Même convention que
 * `DEFAULT_METRICS` (`virtualization.ts`), et verrouillé par un test de dérive
 * (`TimelineView.test.tsx`).
 */
export const LANE_TRACK_OFFSET_PX = 168

/** #81 — Clé de coordonnée clavier d'une pastille (« indexDeLane:indexDEvent »). */
const navKeyOf = (lane: number, evt: number) => `${lane}:${evt}`

/** Même contenu (mêmes events, mêmes index) → on peut réutiliser l'ancien tableau. */
function sameWindowedEvents(a: WindowedEvent[], b: WindowedEvent[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].event !== b[i].event || a[i].index !== b[i].index) return false
  }
  return true
}

function sameMetrics(a: TimelineMetrics, b: TimelineMetrics): boolean {
  return (
    a.rulerHeight === b.rulerHeight &&
    a.headHeight === b.headHeight &&
    a.laneHeight === b.laneHeight
  )
}

/**
 * #349 — Mémoïsation par NIVEAU DE ZOOM, purgée dès que la `source` change
 * d'identité (nouveaux events, nouvelle étendue). `useMemo` n'a qu'UN seul
 * emplacement : un aller-retour de zoom recalculait donc tout à chaque
 * passage. Ici, revenir à un niveau déjà visité est gratuit — le cache est
 * borné par le nombre de niveaux de zoom (5).
 *
 * La clé est fournie par l'APPELANT et doit couvrir TOUTES les entrées de
 * `compute`. Clé sur le seul `dayWidth` = piège : `buildRulerTicks` consomme
 * aussi `zoom.level`, et deux niveaux partageant une largeur de jour se
 * seraient alors volé leurs graduations SANS erreur ni test rouge.
 *
 * La valeur est BOÎTÉE (`{ value }`) : la présence en cache se teste sur
 * l'entrée, jamais sur la valeur — un `compute()` retournant légitimement
 * `undefined` reste un hit au lieu d'être recalculé à chaque rendu.
 */
function useZoomCache<T>(source: unknown, key: string, compute: () => T): T {
  // Initialisation PARESSEUSE : un initialiseur de `useRef` est évalué à CHAQUE
  // rendu, donc la `Map` allouée directement dans l'appel était jetée aussitôt à
  // toutes les passes suivantes. `null` + création à la demande alloue une seule
  // fois par `source`. Comportement inchangé : la purge reste conditionnée à un
  // changement d'identité de `source`.
  const cacheRef = useRef<{ source: unknown; byKey: Map<string, { value: T }> } | null>(null)
  if (cacheRef.current === null || cacheRef.current.source !== source) {
    cacheRef.current = { source, byKey: new Map<string, { value: T }>() }
  }
  const cache = cacheRef.current
  const hit = cache.byKey.get(key)
  if (hit) return hit.value
  const value = compute()
  cache.byKey.set(key, { value })
  return value
}

/** Règle sticky : invariante au scroll, ne dépend que du zoom et de l'étendue. */
const TimelineRuler = React.memo<{
  ticks: RulerTick[]
  todayLeftPx: number
  todayLabel: string
}>(function TimelineRuler({ ticks, todayLeftPx, todayLabel }) {
  return (
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
          {todayLabel}
        </span>
      </div>
    </div>
  )
})

/** Overlay week-end : jusqu'à plusieurs centaines de nœuds au zoom `day`. */
const TimelineWeekends = React.memo<{
  segments: Array<{ leftPx: number; widthPx: number }>
}>(function TimelineWeekends({ segments }) {
  return (
    <>
      {segments.map((seg, i) => (
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
    </>
  )
})

/** En-tête d'accordéon catégorie (porte une icône SVG lucide → non gratuit ×12). */
const TimelineGroupHead = React.memo<{
  category: string
  isCollapsed: boolean
  railWidth: number
  onToggle: (category: string) => void
}>(function TimelineGroupHead({ category, isCollapsed, railWidth, onToggle }) {
  return (
    <button
      type="button"
      className="mt-tlv__group-head"
      aria-expanded={!isCollapsed}
      onClick={() => onToggle(category)}
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
  )
})

interface TimelineLaneRowProps {
  resource: Resource
  /** Index de la lane DANS SA CATÉGORIE (a11y `aria-posinset`, modèle complet). */
  laneOrdinal: number
  setSize: number
  isCollapsed: boolean
  dayWidth: number
  /** Fenêtre horizontale de la lane — identité STABLE tant que le contenu l'est. */
  windowed: WindowedEvent[]
  /** Index de la lane dans `navLanes` (coordonnée clavier #81), -1 si absente. */
  laneIdx: number
  /** Index de l'event portant `tabIndex=0` DANS CETTE lane, sinon `null`. */
  rovingEvt: number | null
  locale: string
  t: (key: string) => string
  onToggle: (resourceId: string) => void
  onSelect: (event: PositionedEvent) => void
  onPillKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, lane: number, evt: number) => void
  pillNodes: React.MutableRefObject<Map<string, HTMLButtonElement>>
}

/**
 * #349 — UNE lane (produit) + ses pastilles fenêtrées. `React.memo` : au scroll,
 * seules les lanes dont la fenêtre a réellement changé sont réconciliées ; les
 * autres sont sautées, y compris la construction de leur `aria-label` agrégé
 * (`buildEventAriaLabel` construit un `Intl.DateTimeFormat` par pastille).
 */
const TimelineLaneRow = React.memo<TimelineLaneRowProps>(function TimelineLaneRow({
  resource,
  laneOrdinal,
  setSize,
  isCollapsed,
  dayWidth,
  windowed,
  laneIdx,
  rovingEvt,
  locale,
  t,
  onToggle,
  onSelect,
  onPillKeyDown,
  pillNodes,
}) {
  return (
    <div
      className="mt-tlv__lane"
      role="listitem"
      aria-posinset={laneOrdinal + 1}
      aria-setsize={setSize}
      style={{ backgroundSize: `${dayWidth}px 100%` }}
      data-testid="timeline-resource-row"
    >
      {/* #195 — Accordéon de 2e niveau : le label produit sticky devient un bouton
          toggle (mirror de `mt-tlv__group-head`). Bouton natif → clavier
          Enter/Espace + `aria-expanded` cohérents avec l'accordéon catégorie.
          Reste visible même collapsé (identifie la lane au scroll horizontal). */}
      <button
        type="button"
        className="mt-tlv__lane-label mt-tlv__lane-head"
        aria-expanded={!isCollapsed}
        onClick={() => onToggle(resource.id)}
        title={resource.title}
        data-testid="timeline-resource-head"
      >
        <ChevronRight
          className={isCollapsed ? 'mt-tlv__chev' : 'mt-tlv__chev mt-tlv__chev--open'}
          size={13}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="mt-tlv__lane-head-text" data-testid="timeline-resource-title">
          {resource.title}
        </span>
      </button>
      {windowed.map(({ event, index: evtIdx }) => {
        const key = navKeyOf(laneIdx, evtIdx)
        return (
          <EventPill
            key={event.id}
            event={event}
            ariaLabel={buildEventAriaLabel(event, locale, t)}
            onSelect={onSelect}
            tabIndex={rovingEvt === evtIdx ? 0 : -1}
            navKey={key}
            onKeyDown={(e) => onPillKeyDown(e, laneIdx, evtIdx)}
            pillRef={(node) => {
              // Indexe le node pour `.focus()` ; nettoie à l'unmount (refs
              // pendantes au collapse ET au démontage par la virtualisation, #69).
              if (node) pillNodes.current.set(key, node)
              else pillNodes.current.delete(key)
            }}
          />
        )
      })}
    </div>
  )
})

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
  // #349 — `useTranslations()` ne garantit pas une identité stable entre deux
  // rendus. Passée telle quelle aux lanes mémoïsées, cette prop les invaliderait
  // toutes à chaque frame de scroll (le piège `React.memo` rappelé par l'issue).
  // On expose un accesseur stable qui délègue toujours au `t` le plus récent.
  const tRef = useRef<(key: string) => string>(t)
  tRef.current = t
  const translate = useCallback((key: string) => tRef.current(key), [])
  const [zoom, dispatch] = useReducer(zoomReducer, initialZoomState)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // #195 — Accordéon de 2e niveau : état collapse par PRODUIT (lane), keyé par
  // `resource.id`. Indépendant de `collapsed` (catégorie) : replier un produit
  // n'affecte ni les autres produits ni la catégorie parente. Même préservation
  // de scroll que le collapse catégorie (aucun mécanisme explicite — le conteneur
  // scrollable garde son scrollLeft/Top au re-rendu React).
  const [collapsedResources, setCollapsedResources] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<PositionedEvent | null>(null)
  // #316 — callback stabilisé (deps vides, `setSelected` est stable) : passé à
  // `EventDrawer` → `useFocusTrap` qui liste `onEscape` en dépendance d'effet.
  // Une lambda inline ici re-déclencherait le trap (focus initial) à CHAQUE
  // rendu de `TimelineView` (BUG-S44-001, cf. `AppShell.closeCreate`).
  const closeDrawer = useCallback(() => setSelected(null), [])
  // #349 — Bascules d'accordéon stabilisées (mise à jour fonctionnelle → aucune
  // dépendance) : elles sont des props des composants mémoïsés.
  const toggleCategory = useCallback((category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !(prev[category] ?? false) }))
  }, [])
  const toggleResource = useCallback((resourceId: string) => {
    setCollapsedResources((prev) => ({ ...prev, [resourceId]: !(prev[resourceId] ?? false) }))
  }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [viewportStart, setViewportStart] = useState(0)

  const now = useMemo(() => today ?? new Date(), [today])

  const dayWidth = DAY_WIDTH_PX[zoom.level]

  const { rangeStart, totalDays } = useMemo(() => computeRange(events, now), [events, now])

  // #392 — `trackWidth` = étendue TEMPORELLE en px (repère piste) ; `railWidth`
  // = largeur réellement défilable, gouttière d'en-tête comprise (repère rail).
  // Distinguer les deux est ce qui garde la minimap exacte : elle représente la
  // piste, pas la gouttière.
  const trackWidth = useMemo(() => totalDays * dayWidth, [totalDays, dayWidth])
  const railWidth = trackWidth + LANE_TRACK_OFFSET_PX

  // #349 — Source des recalculs déclenchés par le zoom : tout ce qui n'est PAS
  // le niveau de zoom. Tant que cette identité ne change pas, un aller-retour de
  // zoom réutilise les résultats déjà calculés (cf. `useZoomCache`).
  const zoomSource = useMemo(
    () => ({ rangeStart, totalDays, locale }),
    [rangeStart, totalDays, locale],
  )

  // #349 — La règle est dominée par les `Intl.format` (une par graduation,
  // jusqu'à ~460 au zoom `day`) : mémoïsée PAR niveau, pas seulement pour le
  // dernier niveau visité.
  // Clé COMPOSITE : `buildRulerTicks` dépend du niveau (granularité des
  // graduations) ET de la largeur de jour. Clé sur `dayWidth` seul, deux
  // niveaux de même largeur se voleraient leurs graduations.
  const ticks = useZoomCache(zoomSource, `${zoom.level}|${dayWidth}`, () =>
    buildRulerTicks(rangeStart, totalDays, zoom.level, dayWidth, locale),
  )

  // #349 — Positionnement en DEUX passes : la géométrie en jours (parsing des
  // dates, O(n) et coûteuse) ne dépend pas du zoom et n'est calculée qu'au
  // changement d'événements / d'étendue ; seule la mise à l'échelle px/jour est
  // refaite au zoom, et elle est elle-même mémoïsée par niveau.
  const indexedEvents = useMemo(
    () => indexEventsByResource(events, rangeStart, now),
    [events, rangeStart, now],
  )
  // `scaleEventPositions` ne consomme que la largeur de jour → clé suffisante.
  const eventsByResource = useZoomCache(indexedEvents, `${dayWidth}`, () =>
    scaleEventPositions(indexedEvents, dayWidth),
  )

  const resourcesByCategory = useMemo(() => groupResourcesByCategory(resources), [resources])

  const groups = useMemo(() => Object.entries(resourcesByCategory), [resourcesByCategory])

  // #69 — VIRTUALISATION. `geometryKey` force une remesure quand la géométrie du
  // rail change sans qu'aucun scroll ne survienne (zoom, étendue, collapse d'une
  // catégorie, arrivée de nouveaux events).
  const geometryKey = useMemo(
    () => `${dayWidth}|${totalDays}|${resources.length}|${JSON.stringify(collapsed)}`,
    [dayWidth, totalDays, resources.length, collapsed],
  )
  const viewport = useTimelineViewport(scrollRef, railRef, geometryKey)
  const { ensureVisible, resync } = viewport

  // #349 — `useTimelineViewport` republie un OBJET `metrics` neuf à chaque
  // franchissement de bande, même quand les trois hauteurs sont identiques
  // (elles le sont presque toujours). On fige l'identité sur la VALEUR : sans
  // cela `verticalModel` — donc `focusNav`, donc `onPillKeyDown` — changerait
  // d'identité à chaque bande franchie et casserait toutes les mémoïsations
  // en aval. (Le correctif à la source vit dans `useTimelineViewport`, hors
  // périmètre de cette issue.)
  const metricsRef = useRef(viewport.metrics)
  if (!sameMetrics(metricsRef.current, viewport.metrics)) {
    metricsRef.current = viewport.metrics
  }
  const metrics = metricsRef.current
  const laneHeight = metrics.laneHeight

  // Modèle vertical (tops en px de chaque liste de lanes / de chaque lane).
  const verticalModel = useMemo(
    () => buildVerticalModel(groups, collapsed, metrics),
    [groups, collapsed, metrics],
  )

  // #69 — La virtualisation VERTICALE ne s'enclenche qu'au-delà du seuil : en
  // dessous, monter toutes les lanes coûte moins cher que les fenêtrer (et les
  // parcours E2E / frises modestes gardent un DOM complet, cf. ADR-007).
  const verticalBand =
    verticalModel.visibleLaneCount >= LANE_VIRTUALIZATION_MIN_ROWS
      ? viewport.vertical
      : UNBOUNDED_BAND

  // #392 — `windowEvents` teste des `leftPx` (repère PISTE) contre la bande
  // mesurée, publiée en repère RAIL (dérivée de `scrollLeft`) : on la ramène en
  // repère piste. Sans ce recalage, la fenêtre de rendu serait décalée de la
  // gouttière — masqué par l'overscan de 600px, donc INVISIBLE en test et
  // dormant jusqu'au jour où l'overscan serait réduit. L'identité de la bande
  // reste stable tant que celle de `viewport.horizontal` l'est (hystérésis #69),
  // et `±Infinity` traverse la soustraction : `UNBOUNDED_BAND` (jsdom, conteneur
  // non mesurable) reste non bornée → rendu complet, comme avant.
  const horizontalBand = useMemo(
    () => ({
      start: viewport.horizontal.start - LANE_TRACK_OFFSET_PX,
      end: viewport.horizontal.end - LANE_TRACK_OFFSET_PX,
    }),
    [viewport.horizontal],
  )

  // #81 — Modèle plat de navigation clavier : la « grille » des lanes VISIBLES
  // (catégorie non collapsée) → chaque entrée = { resourceId, events[] }. L'ordre
  // suit le rendu (catégories puis ressources). Les lanes des catégories
  // collapsées sont EXCLUES (pastilles non rendues → non focusables).
  const navLanes = useMemo(() => {
    const lanes: Array<{ resourceId: string; events: PositionedEvent[] }> = []
    for (const [category, resList] of groups) {
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
  }, [groups, collapsed, collapsedResources, eventsByResource])

  // #81 — Roving tabindex : la pastille active (celle qui porte tabIndex=0) est
  // repérée par sa RESSOURCE (`resourceId`) + son index d'event, PAS par un index
  // de lane. Motif (MAJEUR-2) : `navLanes` rétrécit quand une catégorie AU-DESSUS
  // se collapse → un index de lane mémorisé glisserait vers une AUTRE ressource.
  // Une clé resource-keyée est stable face au collapse/expand. `null` = aucune
  // encore focalisée → la 1re pastille non vide devient l'arrêt par défaut.
  const [activeNav, setActiveNav] = useState<{ resourceId: string; evt: number } | null>(null)
  // Index des nodes DOM des pastilles (clé "laneIdx:evtIdx") pour `.focus()`.
  const pillNodes = useRef(new Map<string, HTMLButtonElement>())

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

  // #69 — Cible de focus EN ATTENTE. La virtualisation démonte les pastilles hors
  // fenêtre : une cible clavier peut ne pas encore exister dans le DOM au moment
  // où on veut la focaliser. On mémorise la coordonnée, on élargit la fenêtre de
  // rendu (`ensureVisible`), et on focalise dès que le node apparaît (effet
  // post-rendu ci-dessous). Sans ce relais, ↑↓←→ « sauteraient » les événements
  // hors fenêtre (critère d'acceptation n°5).
  // La cible PÉRIME (`PENDING_FOCUS_TTL_MS`) : sans cela, une cible jamais montée
  // (lane repliée entre-temps, données rafraîchies) resterait armée et volerait le
  // focus bien plus tard, au moment où le node réapparaîtrait.
  const pendingFocusRef = useRef<{ key: string; at: number } | null>(null)
  const flushPendingFocus = useCallback(() => {
    const pending = pendingFocusRef.current
    if (pending === null) return
    if (performance.now() - pending.at > PENDING_FOCUS_TTL_MS) {
      pendingFocusRef.current = null
      return
    }
    const node = pillNodes.current.get(pending.key)
    if (!node) return
    pendingFocusRef.current = null
    node.focus()
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    // La cible est atteinte : on recale la fenêtre de rendu sur ce qui est
    // réellement visible, sinon les élargissements successifs d'`ensureVisible`
    // finiraient par remonter toute la frise.
    resync()
  }, [resync])

  // Volontairement SANS tableau de dépendances : rejoue après CHAQUE rendu, donc
  // aussi après celui qui monte enfin la pastille visée. No-op (une lecture de
  // ref) quand aucune cible n'est en attente.
  useEffect(flushPendingFocus)

  // Déplace le focus. Reçoit des coordonnées (lane, evt) — inchangé pour
  // `onPillKeyDown` — mais mémorise l'état en resource-keyé (MAJEUR-2 : stable au
  // collapse).
  // MAJEUR-1 : `scrollIntoView` explicite — le scroll natif de `.focus()` ne
  // garantit pas le défilement du conteneur de lanes vertical NI du rail
  // horizontal → sans ça la pastille focalisée peut rester hors écran sur ↑↓←→.
  const focusNav = useCallback(
    (lane: number, evt: number) => {
      const target = navLanes[lane]
      if (!target) return
      setActiveNav({ resourceId: target.resourceId, evt })

      // Élargit la fenêtre de rendu à la cible AVANT de tenter le focus.
      const event = target.events[evt]
      if (event) {
        const laneTop = verticalModel.laneTops.get(target.resourceId) ?? 0
        // #392 — `useTimelineViewport` publie ses bandes en repère RAIL (elles
        // viennent de `scrollLeft`) : on y convertit la cible, qui est en repère
        // piste. Sans ça les deux repères se mélangeraient dans le même état.
        ensureVisible(
          {
            start: LANE_TRACK_OFFSET_PX + event.leftPx,
            end: LANE_TRACK_OFFSET_PX + event.leftPx + event.widthPx,
          },
          { start: laneTop, end: laneTop + laneHeight },
        )
      }

      pendingFocusRef.current = { key: navKeyOf(lane, evt), at: performance.now() }
      // Cas nominal (cible déjà montée) : focus immédiat, aucun rendu supplémentaire.
      flushPendingFocus()
    },
    [navLanes, verticalModel, ensureVisible, laneHeight, flushPendingFocus],
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

  // #392 — La minimap cartographie la PISTE (buckets d'events par jour), pas le
  // rail : on retire la gouttière de `scrollLeft` avant de normaliser, sinon la
  // fenêtre dérive de `LANE_TRACK_OFFSET_PX / trackWidth` sur toute la course.
  const syncViewportFromScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || trackWidth === 0) return
    setViewportStart(Math.max(0, (el.scrollLeft - LANE_TRACK_OFFSET_PX) / trackWidth))
    setViewportRatio(Math.min(1, el.clientWidth / trackWidth))
  }, [trackWidth])

  // #69 — La synchronisation de la minimap déclenchait un `setState` (donc un
  // re-rendu COMPLET de la frise) à CHAQUE événement `scroll` : c'était le premier
  // poste de coût du scroll horizontal mesuré en baseline (33,8 ms/frame à 1000
  // events). On la coalesce à une fois par frame ; la minimap reste synchrone à
  // l'œil (elle est mise à jour avant la peinture suivante).
  const scrollFrameRef = useRef<number | null>(null)
  const onScrollThrottled = useCallback(() => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      syncViewportFromScroll()
    })
  }, [syncViewportFromScroll])

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    },
    [],
  )

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
      // #392 — VOLONTAIREMENT laissé en repère piste : `scrollLeft = N*dayWidth`
      // amène le jour N à `LANE_TRACK_OFFSET_PX` du bord du viewport, c'est-à-dire
      // JUSTE APRÈS l'en-tête sticky. Le convertir en repère rail le collerait au
      // bord gauche, donc SOUS l'en-tête — le défaut même que corrige cette issue
      // (visible sur « T » / « [ » / « ] »).
      el.scrollLeft = Math.max(0, zoom.offsetDays * dayWidth)
    }
  }, [zoom.offsetDays, dayWidth])

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // `todayLeftPx` est en repère PISTE → passage en repère rail (#392).
    const target = LANE_TRACK_OFFSET_PX + todayLeftPx - el.clientWidth / 2
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
      // Réciproque exacte de `syncViewportFromScroll` (repère piste → rail, #392).
      el.scrollLeft = LANE_TRACK_OFFSET_PX + start * trackWidth
      setViewportStart(start)
    },
    [trackWidth],
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

  // #395 — État plein écran DÉRIVÉ de l'événement `fullscreenchange` du document
  // (source de vérité du navigateur), et JAMAIS basculé à la main dans
  // `toggleFullscreen`. Le plein écran s'entre/se quitte par au moins 4 chemins
  // qui ne passent pas tous par le bouton : la touche Échap gérée plus bas,
  // le raccourci F, l'Échap NATIF du navigateur, F11/le menu du navigateur.
  // Un `useState` basculé dans le handler dériverait sur les cas 1/3/4 →
  // `aria-pressed` annoncerait « activé » hors plein écran, c.-à-d. un attribut
  // qui MENT au lecteur d'écran (pire que l'absence d'état observable).
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    // État initial : le composant peut être monté alors que la page est DÉJÀ en
    // plein écran (navigation client-side), aucun événement ne serait émis.
    syncFullscreen()
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
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

  // ==========================================================================
  // #349 — PRÉ-PASSE DE RENDU. Elle fait deux choses que le JSX ne peut pas
  // faire proprement : (1) calculer le fenêtrage de chaque lane montée ;
  // (2) STABILISER l'identité de ce résultat. `windowEvents` renvoie un tableau
  // NEUF à chaque appel, même quand la lane contient exactement les mêmes
  // événements — sans ce cache, la prop `windowed` changerait à chaque frame et
  // `React.memo` sur les lanes ne sauterait jamais un seul rendu.
  //
  // Le cache est reconstruit à chaque rendu à partir des SEULES lanes montées :
  // aucune entrée fantôme ne survit au démontage d'une lane (pas de fuite).
  // ==========================================================================
  const windowCacheRef = useRef(new Map<string, WindowedEvent[]>())
  const previousWindows = windowCacheRef.current
  const nextWindows = new Map<string, WindowedEvent[]>()

  const renderGroups = groups.map(([category, resList]) => {
    const isCollapsed = collapsed[category] ?? false
    // #69 — Fenêtre verticale de CE groupe. Les en-têtes de catégorie restent
    // TOUJOURS montés (peu nombreux, et ils portent l'accordéon) ; seules les
    // lanes sont fenêtrées, avec des cales qui préservent la hauteur totale
    // (scrollbar et ligne TODAY inchangées).
    const laneWindow = windowLanes(
      resList.length,
      laneHeight,
      verticalModel.listTops[category] ?? 0,
      verticalBand,
    )
    const lanes = isCollapsed
      ? []
      : resList.slice(laneWindow.startIndex, laneWindow.endIndex).map((resource, i) => {
          const isResCollapsed = collapsedResources[resource.id] ?? false
          const laneEvents = eventsByResource.get(resource.id) || []
          // #69 — Fenêtre HORIZONTALE : seuls les événements dont l'intervalle
          // croise la plage temporelle visible sont montés. L'index d'origine
          // est conservé (coordonnée clavier #81).
          const computed = isResCollapsed
            ? NO_EVENTS
            : windowEvents(laneEvents, horizontalBand)
          const previous = previousWindows.get(resource.id)
          const windowed = previous && sameWindowedEvents(previous, computed) ? previous : computed
          nextWindows.set(resource.id, windowed)
          const laneIdx = laneIndexByResource.get(resource.id) ?? -1
          return {
            resource,
            laneOrdinal: laneWindow.startIndex + i,
            isResCollapsed,
            windowed,
            laneIdx,
            rovingEvt: rovingNav !== null && rovingNav.lane === laneIdx ? rovingNav.evt : null,
          }
        })
    return { category, isCollapsed, laneWindow, setSize: resList.length, lanes }
  })
  windowCacheRef.current = nextWindows

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
          // #395 — bascule ARIA valide sur un `<button>` (état binaire activable) ;
          // s'AJOUTE à l'`aria-label`, ne le remplace pas. Reflète `document.
          // fullscreenElement` via `fullscreenchange`, pas un état local optimiste.
          aria-pressed={isFullscreen}
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
          <div
            className="mt-tlv__help-pop"
            id="timeline-help-pop"
            data-testid="timeline-help-pop"
            role="tooltip"
          >
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
        onScroll={onScrollThrottled}
        onWheel={onWheel}
        data-testid="timeline-scroll"
      >
        <div className="mt-tlv__rail" ref={railRef} style={{ width: `${railWidth}px` }}>
          {/* Règle sticky adaptative — #349 : mémoïsée (invariante au scroll). */}
          <TimelineRuler
            ticks={ticks}
            todayLeftPx={todayLeftPx}
            todayLabel={t('common.buttons.today')}
          />

          {/* Overlay week-end continu (fond de colonne, sous la règle). */}
          <TimelineWeekends segments={weekendSegments} />

          {/* Ligne TODAY verticale traversant les lanes */}
          <div
            className="mt-tlv__today"
            style={{ left: `${todayLeftPx}px`, top: 'var(--ruler-height)' }}
            aria-hidden="true"
          />

          {/* Lanes groupées par catégorie (accordéons). #349 — le fenêtrage et la
              stabilisation d'identité sont faits dans la pré-passe ci-dessus ; ici
              il ne reste que le montage de composants MÉMOÏSÉS. */}
          {renderGroups.map(({ category, isCollapsed, laneWindow, setSize, lanes }) => (
            <div key={category} data-testid="timeline-group">
              <TimelineGroupHead
                category={category}
                isCollapsed={isCollapsed}
                railWidth={railWidth}
                onToggle={toggleCategory}
              />

              {/* #69 (a11y) — `role="list"` + `aria-setsize`/`aria-posinset` sur
                  chaque lane : le lecteur d'écran annonce « lane 37 sur 120 »
                  MÊME quand seules ~15 lanes sont montées. C'est l'équivalent
                  valide d'`aria-rowcount`/`aria-rowindex` évoqués par l'issue :
                  ces deux attributs exigent un rôle `grid`/`table`, que la frise
                  n'a pas (pattern région + roving tabindex #81) et qu'on ne
                  change pas ici — cf. ADR-007. */}
              {!isCollapsed && (
                <div role="list" aria-label={category} data-testid="timeline-lane-list">
                  {laneWindow.topSpacerPx > 0 && (
                    <div
                      role="presentation"
                      aria-hidden="true"
                      data-testid="timeline-lane-spacer"
                      style={{ height: `${laneWindow.topSpacerPx}px` }}
                    />
                  )}
                  {lanes.map((lane) => (
                    <TimelineLaneRow
                      key={lane.resource.id}
                      resource={lane.resource}
                      laneOrdinal={lane.laneOrdinal}
                      setSize={setSize}
                      isCollapsed={lane.isResCollapsed}
                      dayWidth={dayWidth}
                      windowed={lane.windowed}
                      laneIdx={lane.laneIdx}
                      rovingEvt={lane.rovingEvt}
                      locale={locale}
                      t={translate}
                      onToggle={toggleResource}
                      onSelect={setSelected}
                      onPillKeyDown={onPillKeyDown}
                      pillNodes={pillNodes}
                    />
                  ))}
                  {laneWindow.bottomSpacerPx > 0 && (
                    <div
                      role="presentation"
                      aria-hidden="true"
                      data-testid="timeline-lane-spacer"
                      style={{ height: `${laneWindow.bottomSpacerPx}px` }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <EventDrawer
        event={selected}
        locale={locale}
        onClose={closeDrawer}
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
