import type { FullCalendarEvent } from '@/types/event'
import { outlineFloorVars } from '@/lib/color'
import { parseLocalDate, toLocalIsoDate } from '@/lib/date-iso'
import { ghostOccurrenceStarts } from '@/lib/recurrence'
import { addDays, daysBetween, DEFAULT_MIN_WIDTH_PX, eventKind, type EventKind } from './zoom'
import { isUnboundedBand, segmentIntersectsBand, type Band } from './virtualization'

/**
 * #595 — Marques de RÉCURRENCE des frises (desktop, mobile portrait, mobile paysage) :
 * occurrences FANTÔMES + CONNECTEUR pointillé, calculés côté client (l'API renvoie une
 * ligne par série). Maquette : `docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md`
 * §1, §3, §5. Rendu : `RecurrenceMarks.tsx`. Aucun React ici.
 *
 * Même découpage que le positionnement des pastilles (#349) :
 *  1. `indexRecurrenceByResource` — INVARIANT AU ZOOM : dates des fantômes en JOURS depuis
 *     `rangeStart` (parsing, helper d'occurrences, couleurs planchées). À mémoïser sur
 *     `[events, rangeStart, totalDays]`.
 *  2. `scaleRecurrenceMarks` — DÉPENDANT DU ZOOM : jours × px/jour. Crée les objets de
 *     marque UNE fois par échelle → leur identité est stable entre deux défilements.
 *  3. `windowRecurrenceMarks` — DÉPENDANT DE LA BANDE : ne garde que les marques qui
 *     croisent la bande rendue (virtualisation #69), sans recréer d'objet.
 *
 * INVARIANTS (arbitrage dev 2026-09-15, pas d'empilage en rangées) :
 *  - les marques ne sont JAMAIS des `timeline-event` : pas de testid, `aria-hidden`,
 *    `pointer-events:none`, hors roving tabindex — elles n'existent pas pour la navigation ;
 *  - elles sont rendues AVANT les occurrences réelles de la lane (ordre de peinture) :
 *    une occurrence réelle n'est jamais recouverte par un fantôme ou un connecteur.
 */

/** Côté du carré fantôme d'un ponctuel (maquette §3 : 8 px, centré sur la date). */
export const GHOST_PIN_SIZE_PX = 8
export const GHOST_PIN_HALF_PX = GHOST_PIN_SIZE_PX / 2

/**
 * Surplus PEINT d'un fantôme de durée au-delà de `widthPx` : padding horizontal (2 × 10)
 * + contour (2 × 1,5) hérités de `.mt-evt` / `.mt-evt--draft`. Sert UNIQUEMENT à la coupe
 * à l'étendue : pris en surplus (majorant, quel que soit le `box-sizing`), il garantit
 * qu'aucun fantôme ne déborde de la piste — un enfant absolu qui dépasse élargirait la
 * zone défilable et décalerait l'ancrage de scroll épinglé par #392/#451/#477.
 */
export const GHOST_BAR_PAINT_SLACK_PX = 23

/**
 * #497 — fond de `.mt-evt--draft` : `color-mix(--mt-evt 8%, --color-surface)`. Le contour
 * du fantôme de durée doit franchir 3:1 sur CE fond. Même valeur que
 * `EventPreviewTimeline.tsx` (`GHOST_TINT_PERCENT`), synchronisée avec `timeline.css`.
 */
const GHOST_BAR_TINT_PERCENT = 8

/** Variables CSS posées en ligne (`--mt-evt`, `--mt-evt-outline*`) — identité stable. */
export type MarkStyleVars = Readonly<Record<string, string>>

/**
 * BR-EVE-006 — une série n'existe que si `isRecurring` ET `recurrenceUnit` (une
 * récurrence sans unité est inexploitable). Pilote aussi le glyphe `↻`.
 */
export function isRecurringSeries(event: Pick<FullCalendarEvent, 'extendedProps'>): boolean {
  return event.extendedProps?.isRecurring === true && Boolean(event.extendedProps.recurrenceUnit)
}

/** Géométrie EN JOURS d'une série (invariante au zoom). */
export interface SeriesGeometry {
  eventId: string
  kind: EventKind
  /** Décalage (jours) de l'occurrence RÉELLE depuis `rangeStart`. */
  dayOffset: number
  /** Durée en jours (≥ 1), identique à `indexEventsByResource`. */
  spanDays: number
  /** Décalages (jours) des fantômes, croissants, tous > `dayOffset`. */
  ghostDayOffsets: number[]
  /** Dates `YYYY-MM-DD` des fantômes (crochet d'assertion `data-occurrence-date`). */
  ghostDates: string[]
  /** Style d'un fantôme : couleur brute + contour planché sur son fond. */
  ghostStyle: MarkStyleVars
  /** Style du connecteur : contour planché sur le fond de lane (surface). */
  connectorStyle: MarkStyleVars
}

function styleVars(color: string | undefined, tintPercent: number): MarkStyleVars {
  return {
    ...(color ? { '--mt-evt': color } : {}),
    ...(outlineFloorVars(color, tintPercent) ?? {}),
  }
}

/**
 * Passe 1 (invariante au zoom). Bornes retenues pour les fantômes :
 *  - après le début uniquement ;
 *  - fin de série INCLUSE (`recurrenceEndDate`, #676), sinon horizon backend de 5 ans ;
 *  - coupe à la fin de l'ÉTENDUE existante (`rangeStart + totalDays − 1`) : l'étendue
 *    n'est PAS étirée pour loger les fantômes (ancrage de scroll/zoom épinglé) ;
 *  - série ARCHIVÉE : aucun fantôme ni connecteur — elle n'est plus active (BR-EVE-011),
 *    son occurrence réelle reste grisée et garde son `↻`.
 */
export function indexRecurrenceByResource(
  events: FullCalendarEvent[],
  rangeStart: Date,
  totalDays: number,
): Map<string, SeriesGeometry[]> {
  const map = new Map<string, SeriesGeometry[]>()
  const until = addDays(rangeStart, Math.max(0, totalDays - 1))
  for (const event of events) {
    const unit = event.extendedProps?.recurrenceUnit
    if (!event.resourceId || !unit || !isRecurringSeries(event)) continue
    if (event.extendedProps.archived === true) continue

    const start = parseLocalDate(event.start)
    if (Number.isNaN(start.getTime())) continue
    const end = parseLocalDate(event.end || event.start)
    const rawEnd = event.extendedProps.recurrenceEndDate
    const parsedEnd = rawEnd ? parseLocalDate(rawEnd) : null
    const endDate = parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : null

    const starts = ghostOccurrenceStarts({ start, unit, endDate }, until)
    if (starts.length === 0) continue

    const kind = eventKind(event)
    const geometry: SeriesGeometry = {
      eventId: event.id,
      kind,
      dayOffset: daysBetween(rangeStart, start),
      spanDays: Math.max(1, daysBetween(start, end)),
      ghostDayOffsets: starts.map((d) => daysBetween(rangeStart, d)),
      ghostDates: starts.map((d) => toLocalIsoDate(d) ?? ''),
      // Un carré fantôme de ponctuel a un fond `surface` (0 %) ; une barre fantôme, 8 %.
      ghostStyle: styleVars(event.color, kind === 'single' ? 0 : GHOST_BAR_TINT_PERCENT),
      connectorStyle: styleVars(event.color, 0),
    }
    let bucket = map.get(event.resourceId)
    if (!bucket) {
      bucket = []
      map.set(event.resourceId, bucket)
    }
    bucket.push(geometry)
  }
  return map
}

/** Une occurrence fantôme positionnée (repère PISTE, comme `PositionedEvent`). */
export interface GhostMark {
  key: string
  eventId: string
  kind: EventKind
  /** Abscisse px de la DATE de l'occurrence. */
  leftPx: number
  /** Durée : largeur (px) de la barre, plancher `minWidth`. Ponctuel : `GHOST_PIN_SIZE_PX`. */
  widthPx: number
  /** Intervalle PEINT [start, end] — fenêtrage et coupe à l'étendue. */
  start: number
  end: number
  date: string
  style: MarkStyleVars
}

/** Connecteur d'une série : de l'occurrence réelle à la dernière occurrence fantôme. */
export interface ConnectorMark {
  key: string
  eventId: string
  leftPx: number
  widthPx: number
  style: MarkStyleVars
}

export interface SeriesMarks {
  eventId: string
  connector: ConnectorMark
  ghosts: GhostMark[]
}

/**
 * Passe 2 (dépendante du zoom). `trackWidth` = étendue temporelle en px : un fantôme dont
 * la PEINTURE dépasserait la piste est retiré (et tous les suivants, les dates étant
 * croissantes). Connecteur (maquette §1) : du bord gauche de l'occurrence réelle (sa date,
 * pour un ponctuel) au bord droit de la dernière occurrence (sa date, pour un ponctuel).
 */
export function scaleRecurrenceMarks(
  indexed: Map<string, SeriesGeometry[]>,
  dayWidth: number,
  trackWidth: number,
  minWidth = DEFAULT_MIN_WIDTH_PX,
): Map<string, SeriesMarks[]> {
  const map = new Map<string, SeriesMarks[]>()
  for (const [resourceId, geometries] of indexed) {
    const lane: SeriesMarks[] = []
    for (const g of geometries) {
      const barWidth = Math.max(minWidth, g.spanDays * dayWidth)
      const ghosts: GhostMark[] = []
      for (let i = 0; i < g.ghostDayOffsets.length; i++) {
        const leftPx = g.ghostDayOffsets[i] * dayWidth
        const pin = g.kind === 'single'
        const start = pin ? leftPx - GHOST_PIN_HALF_PX : leftPx
        const end = pin ? leftPx + GHOST_PIN_HALF_PX : leftPx + barWidth + GHOST_BAR_PAINT_SLACK_PX
        if (end > trackWidth) break
        ghosts.push({
          key: `${g.eventId}|${g.ghostDates[i]}`,
          eventId: g.eventId,
          kind: g.kind,
          leftPx,
          widthPx: pin ? GHOST_PIN_SIZE_PX : barWidth,
          start,
          end,
          date: g.ghostDates[i],
          style: g.ghostStyle,
        })
      }
      if (ghosts.length === 0) continue
      const last = ghosts[ghosts.length - 1]
      const connectorLeft = g.dayOffset * dayWidth
      const connectorRight = g.kind === 'single' ? last.leftPx : last.leftPx + last.widthPx
      lane.push({
        eventId: g.eventId,
        connector: {
          key: `${g.eventId}|connector`,
          eventId: g.eventId,
          leftPx: connectorLeft,
          widthPx: Math.max(0, connectorRight - connectorLeft),
          style: g.connectorStyle,
        },
        ghosts,
      })
    }
    if (lane.length > 0) map.set(resourceId, lane)
  }
  return map
}

/** Marques MONTÉES d'une lane : connecteurs puis fantômes (ordre de peinture). */
export interface LaneRecurrenceMarks {
  connectors: ConnectorMark[]
  ghosts: GhostMark[]
}

/** Lane sans marque — identité partagée (mémoïsation des lanes, #349). */
export const NO_RECURRENCE_MARKS: LaneRecurrenceMarks = Object.freeze({
  connectors: [],
  ghosts: [],
}) as LaneRecurrenceMarks

/** Lane sans série — entrée par défaut de `scaleRecurrenceMarks(...).get(id)`. */
export const NO_SERIES: SeriesMarks[] = []

/**
 * Passe 3 (virtualisation horizontale #69, même test d'intersection que `windowEvents`).
 * Le fenêtrage des fantômes est INDÉPENDANT de celui des pastilles : une série dont
 * l'occurrence réelle est hors bande garde ses fantômes visibles. Le connecteur reste un
 * seul nœud par série, monté s'il croise la bande.
 */
export function windowRecurrenceMarks(series: SeriesMarks[], band: Band): LaneRecurrenceMarks {
  if (series.length === 0) return NO_RECURRENCE_MARKS
  const unbounded = isUnboundedBand(band)
  const connectors: ConnectorMark[] = []
  const ghosts: GhostMark[] = []
  for (const s of series) {
    const c = s.connector
    if (unbounded || segmentIntersectsBand(c.leftPx, c.widthPx, band)) connectors.push(c)
    for (const ghost of s.ghosts) {
      if (unbounded || segmentIntersectsBand(ghost.start, ghost.end - ghost.start, band)) {
        ghosts.push(ghost)
      }
    }
  }
  if (connectors.length === 0 && ghosts.length === 0) return NO_RECURRENCE_MARKS
  return { connectors, ghosts }
}

function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/** Égalité par IDENTITÉ des marques (créées une fois par échelle) — cache de rendu #349. */
export function sameRecurrenceMarks(a: LaneRecurrenceMarks, b: LaneRecurrenceMarks): boolean {
  return a === b || (sameItems(a.connectors, b.connectors) && sameItems(a.ghosts, b.ghosts))
}
