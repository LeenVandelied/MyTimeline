import type { PositionedEvent } from './zoom'

/**
 * #709 — EMPILAGE EN RANGÉES des événements d'une lane (cœur PUR : ni React, ni DOM).
 *
 * Avant #709, une lane avait une hauteur fixe et deux occurrences réelles qui se
 * chevauchaient se peignaient l'une sur l'autre (la seconde, plus loin dans le DOM,
 * masquait et captait les clics de la première). Règle de la maquette
 * (`docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md`, `layoutLane`) :
 *
 *  - tri par date de début ; chaque événement prend la PREMIÈRE rangée dont la fin
 *    précédente + `gap` est ≤ son début ;
 *  - `gap` = 8 px desktop / 10 px mobile, en PIXELS (la maquette les convertit en jours
 *    via px/jour : raisonner directement en px, repère PISTE, est équivalent) ;
 *  - un ponctuel réserve 100 px (desktop) / 90 px (mobile) après sa date pour son
 *    libellé — c'est EXACTEMENT son `widthPx` (`PIN_FOOTPRINT_PX`, `zoom.ts`) ;
 *  - seule l'occurrence RÉELLE entre dans l'empilage : fantômes et connecteur de série
 *    (`recurrence-marks.ts`) suivent la rangée de leur événement.
 *
 * ⚠ CONSÉQUENCE ASSUMÉE (DEC-S97-002) : `gap` et réservation étant en pixels, le nombre
 * de rangées DÉPEND DU ZOOM — deux événements séparés de 10 jours tiennent sur une
 * rangée au zoom Mois (12 px/j) et se superposent au zoom Année (2,2 px/j). L'empilage
 * est donc recalculé par niveau de zoom (mémoïsé comme `scaleEventPositions`).
 */

/** Paramètres d'empilage d'une vue. */
export interface LaneLayoutOptions {
  /** Espace horizontal minimal (px) entre la fin d'un événement et le début du suivant. */
  gapPx: number
  /**
   * Emprise ajoutée APRÈS chaque événement (px). Mobile : le bouton `⋯` (44 px) suit
   * chaque occurrence dans son wrap — sans le réserver, le `⋯` d'un événement se
   * poserait sur l'événement suivant de la même rangée et capterait ses taps.
   */
  trailingPx?: number
}

/** Résultat de l'empilage d'UNE lane. */
export interface LaneLayout {
  /** Nombre de rangées (≥ 1, même pour une lane vide : sa hauteur plancher). */
  rows: number
  /** Rangée de chaque événement, alignée sur l'ordre du tableau d'ENTRÉE. */
  rowOf: readonly number[]
  /** Rangée par `event.id` — consommée par les marques de récurrence. */
  rowByEventId: ReadonlyMap<string, number>
  /**
   * Index (dans le tableau d'entrée) des événements de chaque rangée, triés par début :
   * l'ordre de lecture en rangées (navigation clavier, ordre DOM mobile).
   */
  lines: readonly (readonly number[])[]
  /** Rang de chaque événement DANS sa rangée (aligné sur l'entrée) : `lines[rowOf[i]][posInRow[i]] === i`. */
  posInRow: readonly number[]
}

/** Paramètres d'empilage par vue (maquette `layoutLane`). */
export const LANE_GAP_PX = { desktop: 8, mobile: 10 } as const

/**
 * Largeur réservée au bouton `⋯` qui suit chaque occurrence mobile (`.mt-tlm__evt-more` :
 * 44 px, `margin-left:-2px` compensé par le `gap:2px` du wrap).
 */
export const MOBILE_MORE_BUTTON_PX = 44

/**
 * Pas vertical d'une rangée à la suivante (px) = hauteur de barre RENDUE + `VGAP` de la
 * maquette (8 desktop / 7 mobile). La rangée 0 garde exactement sa géométrie historique
 * (aucune lane mono-rangée ne bouge d'un pixel) ; chaque rangée supplémentaire ajoute un
 * pas à la hauteur de lane (DEC-S97-003) :
 *  - desktop : barre 26 + 8 = 34 ⇒ `46 + (rows − 1) × 34` = EXACTEMENT la formule de la
 *    maquette `max(46, PADT×2 + rows×BARH + (rows−1)×VGAP)` (PADT 10, BARH 26, VGAP 8) ;
 *  - portrait : barre 28 (prod, la maquette dit 24) + 7 = 35 ⇒ `44 + (rows − 1) × 35`
 *    (plancher `.mt-tlm__lane` 44 px) ;
 *  - paysage : barre 24 + 7 = 31 ⇒ `34 + (rows − 1) × 31` (lane dense `--lane-height` 34).
 */
export const LANE_ROW_PITCH_PX = { desktop: 34, portrait: 35, landscape: 31 } as const

/** Lane vide ou repliée : une rangée, aucune entrée — identité partagée. */
export const SINGLE_ROW_LAYOUT: LaneLayout = Object.freeze({
  rows: 1,
  rowOf: Object.freeze([]) as readonly number[],
  rowByEventId: new Map<string, number>(),
  lines: Object.freeze([Object.freeze([]) as readonly number[]]) as readonly (readonly number[])[],
  posInRow: Object.freeze([]) as readonly number[],
}) as LaneLayout

/**
 * Empile les événements d'une lane (repère PISTE : `leftPx` = date de début,
 * `widthPx` = emprise réservée, cf. `PositionedEvent`).
 *
 * Tri STABLE par début (à début égal, l'ordre d'entrée départage) : deux rendus du même
 * jeu donnent la même disposition, condition d'un DOM stable et de tests déterministes.
 */
export function layoutLane(
  events: readonly Pick<PositionedEvent, 'id' | 'leftPx' | 'widthPx'>[],
  options: LaneLayoutOptions,
): LaneLayout {
  if (events.length === 0) return SINGLE_ROW_LAYOUT
  const trailing = options.trailingPx ?? 0
  const order = events.map((_, i) => i)
  order.sort((a, b) => events[a].leftPx - events[b].leftPx || a - b)

  const rowEnds: number[] = []
  const rowOf = new Array<number>(events.length)
  const posInRow = new Array<number>(events.length)
  const lines: number[][] = []
  for (const i of order) {
    const start = events[i].leftPx
    const end = start + events[i].widthPx + trailing
    let row = rowEnds.findIndex((rowEnd) => rowEnd + options.gapPx <= start)
    if (row === -1) {
      row = rowEnds.length
      rowEnds.push(end)
      lines.push([])
    } else {
      rowEnds[row] = end
    }
    rowOf[i] = row
    posInRow[i] = lines[row].length
    lines[row].push(i)
  }

  const rowByEventId = new Map<string, number>()
  for (let i = 0; i < events.length; i++) rowByEventId.set(events[i].id, rowOf[i])
  return { rows: rowEnds.length, rowOf, rowByEventId, lines, posInRow }
}

/** Empilage de toutes les lanes (une passe par niveau de zoom, à mémoïser). */
export function layoutLanes(
  eventsByResource: ReadonlyMap<string, readonly PositionedEvent[]>,
  options: LaneLayoutOptions,
): Map<string, LaneLayout> {
  const map = new Map<string, LaneLayout>()
  for (const [resourceId, events] of eventsByResource) {
    map.set(resourceId, layoutLane(events, options))
  }
  return map
}

/** Décalage vertical (px) d'une rangée par rapport à la rangée 0. */
export function rowOffsetPx(row: number, pitchPx: number): number {
  return row * pitchPx
}

/** Hauteur supplémentaire (px) d'une lane de `rows` rangées au-delà de sa hauteur de base. */
export function laneExtraHeightPx(rows: number, pitchPx: number): number {
  return Math.max(0, rows - 1) * pitchPx
}

/**
 * #709 — Réordonne des événements FENÊTRÉS (`windowEvents` : `index` = rang dans la lane
 * complète) dans l'ordre de lecture en rangées : rangée 0 par date, puis rangée 1, etc.
 * Consommé par les frises mobiles, dont l'ordre DOM EST l'ordre de tabulation (pas de
 * roving tabindex en mobile) : le clavier suit alors les rangées, comme à l'écran.
 */
export function inRowOrder<T extends { index: number }>(
  windowed: readonly T[],
  layout: LaneLayout,
): Array<{ item: T; row: number }> {
  return windowed
    .map((item) => ({ item, row: layout.rowOf[item.index] ?? 0 }))
    .sort(
      (a, b) =>
        a.row - b.row ||
        (layout.posInRow[a.item.index] ?? a.item.index) -
          (layout.posInRow[b.item.index] ?? b.item.index),
    )
}
