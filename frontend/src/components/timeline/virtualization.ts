import type { Resource } from './lib'
import { eventTrackExtent, type PositionedEvent } from './zoom'

/**
 * #69 — Cœur PUR de la virtualisation de la frise (aucun React, aucun DOM).
 *
 * Deux axes, deux mécaniques distinctes — c'est la raison d'être d'une
 * virtualisation MAISON (cf. `docs/adr/ADR-007-virtualisation-timeline.md`) :
 *
 *  - AXE HORIZONTAL (événements) : les pastilles ne sont PAS une liste d'items
 *    consécutifs mais des INTERVALLES absolus `[leftPx, leftPx + widthPx]` posés
 *    sur le rail (`positionEvents`, `zoom.ts`). Le fenêtrage est donc un test
 *    d'INTERSECTION d'intervalles, pas un calcul d'index — le modèle
 *    `index → estimateSize` des libs de windowing ne s'y applique pas.
 *
 *  - AXE VERTICAL (lanes) : #709 — les lanes n'ont PLUS une hauteur uniforme
 *    (empilage en rangées, `lane-layout.ts`), mais leur hauteur reste CALCULÉE,
 *    jamais mesurée : hauteur de base (`--lane-height`, mesurée une fois) + un pas
 *    par rangée supplémentaire. Le modèle reste arithmétique (sommes préfixées +
 *    recherche dichotomique), sans mesure par ligne ni observateur de taille — une
 *    boucle mesure → rendu → mesure est exactement ce qu'on évite.
 *
 * INVARIANT DE NON-RÉGRESSION : le fenêtrage ne touche QUE ce qui est monté.
 * Les index (`index` de `WindowedEvent`, position des lanes) restent ceux du
 * modèle COMPLET → la navigation clavier #81 (roving tabindex resource-keyé) et
 * les annonces a11y raisonnent toujours sur la frise entière, pas sur la fenêtre.
 */

/** Intervalle de pixels [start, end] dans le repère du rail. */
export interface Band {
  start: number
  end: number
}

/** Bande « tout », utilisée quand la mesure est impossible → on rend tout. */
export const UNBOUNDED_BAND: Band = { start: -Infinity, end: Infinity }

/**
 * Marge rendue de part et d'autre de la fenêtre visible. Elle sert deux buts :
 * (1) éviter le « blanc » sur un scroll rapide ; (2) faire office d'HYSTÉRÉSIS —
 * tant que la fenêtre visible reste dans la bande déjà rendue, AUCUN re-rendu
 * n'est déclenché (c'est ce qui rend le scroll gratuit, cf. mesures de l'ADR).
 */
export const OVERSCAN_X_PX = 600
export const OVERSCAN_Y_PX = 320

/**
 * Bandes du PREMIER rendu, avant toute mesure du DOM. Valeurs CONSTANTES
 * (jamais dérivées de `window`) : le rendu serveur et le premier rendu client
 * doivent être identiques, sinon hydratation divergente.
 */
export const INITIAL_HORIZONTAL_BAND: Band = { start: 0, end: 1600 }
export const INITIAL_VERTICAL_BAND: Band = { start: 0, end: 1200 }

/** Géométrie verticale de la frise (px). Défauts = valeurs des tokens du DS. */
export interface TimelineMetrics {
  rulerHeight: number
  headHeight: number
  laneHeight: number
}

/**
 * Défauts alignés sur `ds/tokens/spacing.css` (`--ruler-height: 44px`,
 * `--lane-height: 46px`) et sur la hauteur rendue de `.mt-tlv__group-head`
 * (#601 : FIXÉE à 40 px en CSS, pliée comme dépliée — maquette `CATH = 40`).
 * Ils ne servent QUE le premier rendu : dès le premier `useLayoutEffect`, les
 * trois valeurs sont mesurées sur le DOM réel (immunité aux dérives du DS).
 */
export const DEFAULT_METRICS: TimelineMetrics = {
  rulerHeight: 44,
  headHeight: 40,
  laneHeight: 46,
}

/**
 * Seuil d'activation de la virtualisation VERTICALE (nombre de lanes).
 *
 * En dessous, le coût du fenêtrage vertical (spacers + recalcul au scroll de
 * page) n'est pas amorti : une frise de 60 lanes pèse ~2 800 px de lignes, que
 * le navigateur gère sans effort. Au-dessus, on ne monte plus que la fenêtre.
 * La virtualisation HORIZONTALE, elle, est toujours active (c'est elle qui porte
 * l'essentiel du gain : les événements, pas les lignes).
 */
export const LANE_VIRTUALIZATION_MIN_ROWS = 60

export function isUnboundedBand(band: Band): boolean {
  return band.start === -Infinity && band.end === Infinity
}

export function expandBand(band: Band, overscan: number): Band {
  if (isUnboundedBand(band)) return band
  return { start: band.start - overscan, end: band.end + overscan }
}

/** `true` si `outer` contient entièrement `inner` (test d'hystérésis). */
export function bandCovers(outer: Band, inner: Band): boolean {
  return outer.start <= inner.start && outer.end >= inner.end
}

export function bandsEqual(a: Band, b: Band): boolean {
  return a.start === b.start && a.end === b.end
}

/** Intersection d'un segment `[start, start + size]` avec une bande. */
export function segmentIntersectsBand(start: number, size: number, band: Band): boolean {
  return start + size >= band.start && start <= band.end
}

/** Événement retenu par le fenêtrage + son index dans la lane COMPLÈTE. */
export interface WindowedEvent {
  event: PositionedEvent
  /** Index dans la lane non fenêtrée — coordonnée de navigation clavier #81. */
  index: number
}

/**
 * Fenêtrage HORIZONTAL : ne garde que les événements dont l'intervalle croise la
 * bande. L'`index` d'origine est conservé : la navigation clavier continue de
 * raisonner sur la lane entière (critère d'acceptation n°5).
 */
export function windowEvents(events: PositionedEvent[], band: Band): WindowedEvent[] {
  if (isUnboundedBand(band)) return events.map((event, index) => ({ event, index }))
  const out: WindowedEvent[] = []
  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    // #594 — intervalle RÉEL : un pin déborde de sa demi-largeur à gauche de la date
    // et réserve la place de son libellé à droite (cf. `eventTrackExtent`).
    const { start, end } = eventTrackExtent(event)
    if (segmentIntersectsBand(start, end - start, band)) out.push({ event, index })
  }
  return out
}

/** Tranche de lanes à monter + hauteur des cales qui préservent la géométrie. */
export interface LaneWindow {
  /** Index de la 1re lane montée (inclus). */
  startIndex: number
  /** Index de fin (EXCLU) — utilisable tel quel avec `Array.slice`. */
  endIndex: number
  topSpacerPx: number
  bottomSpacerPx: number
}

/**
 * #709 — Sommes préfixées des hauteurs d'une liste de lanes : `offsets[i]` = top de
 * la lane `i` relatif au haut de la liste, `offsets[n]` = hauteur totale. Construit
 * une fois par changement de géométrie (`buildVerticalModel`), consommé à chaque
 * rendu par `windowLanes` en O(log n).
 */
export function laneOffsets(heights: readonly number[]): number[] {
  const offsets = new Array<number>(heights.length + 1)
  offsets[0] = 0
  for (let i = 0; i < heights.length; i++) offsets[i + 1] = offsets[i] + heights[i]
  return offsets
}

/** Offsets d'une liste de `count` lanes de hauteur UNIFORME (tests, repli). */
export function uniformLaneOffsets(count: number, laneHeight: number): number[] {
  return laneOffsets(new Array<number>(count).fill(laneHeight))
}

/** Plus petit `i` dans `[lo, hi]` tel que `pred(i)` (prédicat monotone faux → vrai). */
function lowerBound(lo: number, hi: number, pred: (i: number) => boolean): number {
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (pred(mid)) hi = mid
    else lo = mid + 1
  }
  return lo
}

/**
 * Fenêtrage VERTICAL d'une liste de lanes de hauteurs VARIABLES (#709), décrite par
 * ses sommes préfixées (`laneOffsets`) et commençant à `listTopPx` dans le repère du
 * rail. Monte toute lane dont l'intervalle `[top, bottom)` croise la bande.
 *
 * Les cales (`topSpacerPx` / `bottomSpacerPx`) rendent la hauteur totale de la
 * liste INVARIANTE : la barre de défilement, la position des groupes suivants et
 * l'indicateur TODAY (positionné en absolu sur toute la hauteur) ne bougent pas
 * — la virtualisation reste visuellement transparente.
 *
 * Hauteurs uniformes : résultat IDENTIQUE à l'ancien calcul `floor`/`ceil` (#69).
 */
export function windowLanes(offsets: readonly number[], listTopPx: number, band: Band): LaneWindow {
  const count = Math.max(0, offsets.length - 1)
  const total = count > 0 ? offsets[count] : 0
  if (isUnboundedBand(band) || count === 0 || total <= 0) {
    return { startIndex: 0, endIndex: count, topSpacerPx: 0, bottomSpacerPx: 0 }
  }
  const start = band.start - listTopPx
  const end = band.end - listTopPx
  // 1re lane dont le BAS dépasse le début de bande (une lane qui finit pile au
  // début de bande n'est pas montée — même convention que l'ancien `floor`).
  const startIndex = lowerBound(0, count, (i) => offsets[i + 1] > start)
  // 1re lane dont le HAUT atteint la fin de bande = fin exclue.
  const endIndex = Math.max(
    startIndex,
    lowerBound(0, count, (i) => offsets[i] >= end),
  )
  return {
    startIndex,
    endIndex,
    topSpacerPx: offsets[startIndex],
    bottomSpacerPx: total - offsets[endIndex],
  }
}

/** Modèle vertical de la frise, en coordonnées rail (0 = haut du rail). */
export interface VerticalModel {
  /** Top de la LISTE de lanes de chaque catégorie (sous son en-tête). */
  listTops: Record<string, number>
  /**
   * #709 — Sommes préfixées des hauteurs de lanes de chaque catégorie DÉPLIÉE
   * (`laneOffsets`) : entrée de `windowLanes`. Absente pour une catégorie repliée.
   */
  laneOffsetsByCategory: Record<string, number[]>
  /** Top de chaque lane, par `resourceId` (lanes des catégories dépliées). */
  laneTops: Map<string, number>
  /** #709 — Hauteur de chaque lane, par `resourceId` (lanes des catégories dépliées). */
  laneHeights: Map<string, number>
  /** Hauteur totale du flux (règle + en-têtes + lanes). */
  totalHeight: number
  /** Nombre de lanes effectivement en flux (catégories dépliées). */
  visibleLaneCount: number
}

/** Liste de lanes vide (catégorie repliée / inconnue) — entrée neutre de `windowLanes`. */
export const NO_LANE_OFFSETS: readonly number[] = Object.freeze([0])

/**
 * Modèle arithmétique de la disposition verticale. Exact dès que `metrics` est
 * mesuré : seuls la règle, les en-têtes de catégorie et les lanes participent au
 * flux (week-ends, ligne TODAY et labels sont en position absolue ou sticky).
 *
 * #709 — `laneHeightOf` donne la hauteur d'une lane (empilage en rangées) ; absent,
 * toutes les lanes font `metrics.laneHeight` (comportement #69 inchangé).
 */
export function buildVerticalModel(
  groups: Array<[string, Resource[]]>,
  collapsedCategories: Record<string, boolean>,
  metrics: TimelineMetrics,
  laneHeightOf?: (resource: Resource) => number,
): VerticalModel {
  const listTops: Record<string, number> = {}
  const laneOffsetsByCategory: Record<string, number[]> = {}
  const laneTops = new Map<string, number>()
  const laneHeights = new Map<string, number>()
  let y = metrics.rulerHeight
  let visibleLaneCount = 0

  for (const [category, resources] of groups) {
    y += metrics.headHeight
    listTops[category] = y
    if (collapsedCategories[category] ?? false) continue
    const offsets = new Array<number>(resources.length + 1)
    offsets[0] = 0
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      const height = laneHeightOf ? laneHeightOf(resource) : metrics.laneHeight
      laneTops.set(resource.id, y)
      laneHeights.set(resource.id, height)
      y += height
      offsets[i + 1] = offsets[i] + height
      visibleLaneCount += 1
    }
    laneOffsetsByCategory[category] = offsets
  }

  return {
    listTops,
    laneOffsetsByCategory,
    laneTops,
    laneHeights,
    totalHeight: y,
    visibleLaneCount,
  }
}
