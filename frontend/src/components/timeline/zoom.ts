import { FullCalendarEvent } from '@/types/event'
import { parseLocalDate } from '@/lib/date-iso'

/**
 * #55 — Cœur (pur, testable) de la Vue Timeline desktop.
 *
 * Tout ce qui touche au calcul de la fenêtre temporelle, à la position des
 * events et aux graduations de la règle vit ici — SANS React, SANS réseau. Le
 * zoom est un pur changement d'échelle temporelle côté client (BR : le zoom ne
 * déclenche AUCUN refetch — cf. briefing #55). Le composant `TimelineView`
 * consomme ces fonctions via `useReducer` (Zustand ABSENT, non introduit).
 */

/** Niveaux de zoom, du plus fin au plus large. Ordre = index d'échelle. */
export const ZOOM_LEVELS = ['day', 'week', 'month', 'quarter', 'year'] as const
export type ZoomLevel = (typeof ZOOM_LEVELS)[number]

/**
 * Largeur (px) d'UN jour à chaque niveau de zoom. Plus le niveau est large,
 * plus un jour est compressé. La règle et les lanes partagent cette échelle
 * (px/jour) → tout reste aligné sans recalcul de pourcentages divergents.
 */
export const DAY_WIDTH_PX: Record<ZoomLevel, number> = {
  day: 96,
  week: 34,
  month: 12,
  quarter: 5,
  year: 2.2,
}

/** Granularité des graduations MAJEURES de la règle selon le zoom. */
export type TickUnit = 'day' | 'week' | 'month' | 'quarter' | 'year'
export const MAJOR_TICK_UNIT: Record<ZoomLevel, TickUnit> = {
  day: 'day',
  week: 'day',
  month: 'week',
  quarter: 'month',
  year: 'month',
}

export interface ZoomState {
  level: ZoomLevel
  /** Décalage horizontal en jours depuis `rangeStart` (pilote scroll/navigation). */
  offsetDays: number
}

export type ZoomAction =
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'SET_LEVEL'; level: ZoomLevel }
  | { type: 'PAN'; days: number }
  | { type: 'SET_OFFSET'; days: number }
  | { type: 'GO_TO_TODAY'; todayOffsetDays: number }
  | { type: 'PREV_PERIOD' }
  | { type: 'NEXT_PERIOD' }

/** Nombre de jours « sautés » par [ / ] selon le niveau (une « période »). */
export const PERIOD_STEP_DAYS: Record<ZoomLevel, number> = {
  day: 7,
  week: 14,
  month: 30,
  quarter: 91,
  year: 365,
}

export const initialZoomState: ZoomState = { level: 'month', offsetDays: 0 }

export function zoomReducer(state: ZoomState, action: ZoomAction): ZoomState {
  switch (action.type) {
    case 'ZOOM_IN': {
      const i = ZOOM_LEVELS.indexOf(state.level)
      return i > 0 ? { ...state, level: ZOOM_LEVELS[i - 1] } : state
    }
    case 'ZOOM_OUT': {
      const i = ZOOM_LEVELS.indexOf(state.level)
      return i < ZOOM_LEVELS.length - 1 ? { ...state, level: ZOOM_LEVELS[i + 1] } : state
    }
    case 'SET_LEVEL':
      return { ...state, level: action.level }
    case 'PAN':
      return { ...state, offsetDays: state.offsetDays + action.days }
    case 'SET_OFFSET':
      return { ...state, offsetDays: action.days }
    case 'GO_TO_TODAY':
      return { ...state, offsetDays: action.todayOffsetDays }
    case 'PREV_PERIOD':
      return { ...state, offsetDays: state.offsetDays - PERIOD_STEP_DAYS[state.level] }
    case 'NEXT_PERIOD':
      return { ...state, offsetDays: state.offsetDays + PERIOD_STEP_DAYS[state.level] }
    default:
      return state
  }
}

/** Ramène une date à minuit (comparaisons/arithmétique de jours stables). */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const MS_PER_DAY = 86_400_000

/** Nombre entier de jours (calendaires) entre deux dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY)
}

export function addDays(d: Date, n: number): Date {
  const r = startOfDay(d)
  r.setDate(r.getDate() + n)
  return r
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * Étendue totale de la frise à partir des events : du premier au dernier, avec
 * une marge (padDays) de part et d'autre. Si aucun event, fenêtre par défaut
 * centrée sur `today` (±padDays). Garantit une frise non vide (frise = produit).
 */
export function computeRange(
  events: Pick<FullCalendarEvent, 'start' | 'end'>[],
  today: Date,
  padDays = 30,
): { rangeStart: Date; rangeEnd: Date; totalDays: number } {
  let min = Infinity
  let max = -Infinity
  for (const e of events) {
    const s = parseLocalDate(e.start).getTime()
    const en = parseLocalDate(e.end || e.start).getTime()
    if (!Number.isNaN(s)) min = Math.min(min, s)
    if (!Number.isNaN(en)) max = Math.max(max, en)
  }
  const t = startOfDay(today).getTime()
  if (min === Infinity) {
    min = t
    max = t
  }
  // Toujours inclure aujourd'hui dans l'étendue (l'indicateur TODAY doit exister).
  min = Math.min(min, t)
  max = Math.max(max, t)

  const rangeStart = addDays(startOfDay(new Date(min)), -padDays)
  const rangeEnd = addDays(startOfDay(new Date(max)), padDays)
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1)
  return { rangeStart, rangeEnd, totalDays }
}

export interface PositionedEvent extends FullCalendarEvent {
  /** Abscisse px de la DATE de début depuis `rangeStart` (échelle px/jour du zoom). */
  leftPx: number
  /**
   * #594 — EMPRISE HORIZONTALE RÉSERVÉE à droite de `leftPx`, pas la largeur peinte :
   *  - durée : `max(minWidth, durée × px/jour)` (≥ minWidth pour rester cliquable) ;
   *  - ponctuel : `pinFootprintPx` (pin + place du libellé, maquette `layoutLane` :
   *    100 px desktop / 90 px mobile), invariant au zoom. #746 : les vues l'élargissent
   *    ensuite à la place ESTIMÉE de leur libellé (`label-reserve.ts`), ce plancher
   *    compris.
   * La géométrie exacte d'un événement sur la piste passe par `eventTrackExtent`
   * (le pin déborde de sa demi-largeur à GAUCHE de la date).
   */
  widthPx: number
  /**
   * #746 — Emprise réservée APRÈS la barre (px) pour son libellé EXTÉRIEUR de secours
   * (barre à faible contraste, desktop), posée par `applyLabelReserves`. Absente : aucun
   * libellé dehors. Consommée par l'empilage (`layoutLane`), jamais peinte.
   */
  labelTrailPx?: number
  status: 'expired' | 'ongoing' | 'upcoming'
}

/**
 * #594 — Deux rendus distincts sur la frise (handoff « Traitement visuel des barres ») :
 * `duration` = barre pleine proportionnelle à la durée, `single` = pin compact centré
 * sur la date + libellé à droite en encre de page. Seul `type === 'single'` produit un
 * pin : toute autre valeur garde la barre (comportement historique, aucune donnée
 * existante ne change de rendu par défaut).
 */
export type EventKind = 'single' | 'duration'

export function eventKind(event: Pick<FullCalendarEvent, 'extendedProps'>): EventKind {
  return event.extendedProps?.type === 'single' ? 'single' : 'duration'
}

/** Largeur minimale (px) d'une barre de durée aux zooms larges. */
export const DEFAULT_MIN_WIDTH_PX = 6

/** #594 — Largeur peinte du pin (maquette : 10 px, centré sur la date). */
export const PIN_WIDTH_PX = 10
/** Demi-largeur : le pin commence à `leftPx − PIN_HALF_WIDTH_PX` (maquette `left: x − 5`). */
export const PIN_HALF_WIDTH_PX = PIN_WIDTH_PX / 2
/**
 * #594 — Emprise réservée APRÈS la date d'un ponctuel (maquette `layoutLane` : fin
 * réservée = début + 100 px desktop / 90 px mobile). Sert à la virtualisation et à
 * `ensureVisible` : un pin dont le libellé est à l'écran ne doit pas être démonté.
 * #746 — c'est un PLANCHER : `applyLabelReserves` (`label-reserve.ts`) élargit l'emprise
 * d'un pin à la place estimée de son libellé (plafond 11 + 240 px), et le CSS coupe le
 * libellé à cette place (`--mt-label-max`) : il ne dépasse plus son emprise.
 */
export const PIN_FOOTPRINT_PX = { desktop: 100, mobile: 90 } as const
/** #594 — Largeur d'un ponctuel dans le résumé d'une catégorie repliée (maquette §C : 6 px). */
export const SUMMARY_PIN_WIDTH_PX = 6

/**
 * #594 — Intervalle [start, end] réellement occupé par un événement dans le repère
 * PISTE. Un pin déborde de `PIN_HALF_WIDTH_PX` à gauche de sa date ; une barre
 * commence exactement à la date. Consommé par la virtualisation horizontale et
 * par l'élargissement de fenêtre avant focus clavier.
 */
export function eventTrackExtent(
  event: Pick<PositionedEvent, 'leftPx' | 'widthPx' | 'extendedProps'>,
): { start: number; end: number } {
  const start = eventKind(event) === 'single' ? event.leftPx - PIN_HALF_WIDTH_PX : event.leftPx
  return { start, end: event.leftPx + event.widthPx }
}

/**
 * #349 — Géométrie d'un event INDÉPENDANTE du zoom : offsets exprimés en JOURS,
 * pas en pixels. C'est la moitié chère du positionnement (parsing de dates,
 * `daysBetween` — deux `Date` allouées par appel, dérivation du statut) et elle
 * ne dépend QUE de `events` / `rangeStart` / `now`. Le zoom, lui, ne change que
 * l'échelle px/jour : il n'a aucune raison de la recalculer.
 */
export interface EventGeometry {
  event: FullCalendarEvent
  /** Décalage en jours depuis `rangeStart`. */
  dayOffset: number
  /** Durée en jours (≥ 1). */
  spanDays: number
  status: PositionedEvent['status']
}

/**
 * #349 — Passe INVARIANTE AU ZOOM de `positionEvents` : parse les dates une fois
 * et produit une géométrie en jours par ressource. À mémoïser sur
 * `[events, rangeStart, now]` (cf. `TimelineView`).
 */
export function indexEventsByResource(
  events: FullCalendarEvent[],
  rangeStart: Date,
  now: Date,
): Map<string, EventGeometry[]> {
  const map = new Map<string, EventGeometry[]>()
  for (const event of events) {
    const resourceId = event.resourceId
    if (!resourceId) continue

    const eventStart = parseLocalDate(event.start)
    const eventEnd = parseLocalDate(event.end || event.start)
    if (Number.isNaN(eventStart.getTime())) continue

    const dayOffset = daysBetween(rangeStart, eventStart)
    const spanDays = Math.max(1, daysBetween(eventStart, eventEnd))

    let status: PositionedEvent['status'] = 'upcoming'
    if (eventEnd < now) status = 'expired'
    else if (eventStart <= now && now <= eventEnd) status = 'ongoing'

    let bucket = map.get(resourceId)
    if (!bucket) {
      bucket = []
      map.set(resourceId, bucket)
    }
    bucket.push({ event, dayOffset, spanDays, status })
  }
  return map
}

/**
 * #349 — Passe DÉPENDANTE DU ZOOM : pure arithmétique (jours × px/jour), aucune
 * `Date` construite, aucun parsing. C'est la seule chose qu'un changement de
 * niveau de zoom doit refaire.
 */
export function scaleEventPositions(
  indexed: Map<string, EventGeometry[]>,
  dayWidth: number,
  minWidth = DEFAULT_MIN_WIDTH_PX,
  pinFootprintPx: number = PIN_FOOTPRINT_PX.desktop,
): Map<string, PositionedEvent[]> {
  const map = new Map<string, PositionedEvent[]>()
  for (const [resourceId, geometries] of indexed) {
    const positioned: PositionedEvent[] = new Array(geometries.length)
    for (let i = 0; i < geometries.length; i++) {
      const g = geometries[i]
      positioned[i] = {
        ...g.event,
        leftPx: g.dayOffset * dayWidth,
        // #594 — un ponctuel ne s'étire JAMAIS avec le zoom : emprise constante.
        // L'ancien `Math.max(minWidth, spanDays × dayWidth)` en faisait une barre
        // d'un jour, indiscernable d'une durée d'un jour.
        widthPx:
          eventKind(g.event) === 'single'
            ? pinFootprintPx
            : Math.max(minWidth, g.spanDays * dayWidth),
        status: g.status,
      }
    }
    map.set(resourceId, positioned)
  }
  return map
}

/**
 * Positionne les events sur l'axe px (échelle = dayWidth). Ne clampe PAS à une
 * fenêtre de 30 j (contrairement à `buildEventsByResource` de #47) : la frise
 * #55 est continue → un event garde sa position absolue sur toute l'étendue, le
 * scroll horizontal révèle le reste. Statut dérivé vs `now`.
 *
 * #349 — Composition des deux passes ci-dessus (comportement INCHANGÉ). Les
 * appelants sensibles au zoom (`TimelineView`) appellent les deux passes
 * séparément pour ne refaire que la seconde.
 */
export function positionEvents(
  events: FullCalendarEvent[],
  rangeStart: Date,
  dayWidth: number,
  now: Date,
  minWidth = DEFAULT_MIN_WIDTH_PX,
  pinFootprintPx: number = PIN_FOOTPRINT_PX.desktop,
): Map<string, PositionedEvent[]> {
  return scaleEventPositions(
    indexEventsByResource(events, rangeStart, now),
    dayWidth,
    minWidth,
    pinFootprintPx,
  )
}

export interface RulerTick {
  /** Décalage gauche en px depuis `rangeStart`. */
  leftPx: number
  label: string
  /** Vrai si la graduation tombe sur un week-end (jour) → overlay distinct. */
  weekend: boolean
  /** Première graduation d'un nouveau mois (renfort visuel). */
  monthBoundary: boolean
}

/**
 * #69 (absorption) — Cache des formateurs `Intl`. Leur CONSTRUCTION est le poste
 * de coût dominant du calcul de la règle (~20 ms à froid, mesuré au banc #69),
 * loin devant le parcours des events. `buildRulerTicks` étant rappelé à chaque
 * changement de zoom / d'étendue, on les instancie une fois par locale.
 * Un formateur `Intl.DateTimeFormat` est sans état côté formatage → partageable.
 */
const rulerFormatters = new Map<
  string,
  { dayFmt: Intl.DateTimeFormat; monthFmt: Intl.DateTimeFormat }
>()

function getRulerFormatters(locale: string) {
  let cached = rulerFormatters.get(locale)
  if (!cached) {
    cached = {
      // Jours et semaines partagent le même format (numéro + mois court).
      dayFmt: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
      monthFmt: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }),
    }
    rulerFormatters.set(locale, cached)
  }
  return cached
}

/**
 * Construit les graduations MAJEURES de la règle, adaptées au niveau de zoom
 * (jours en vue jour/semaine, semaines en vue mois, mois en vue trimestre/année).
 * Les libellés sont localisés via `Intl.DateTimeFormat` (formateurs mutualisés).
 */
export function buildRulerTicks(
  rangeStart: Date,
  totalDays: number,
  level: ZoomLevel,
  dayWidth: number,
  locale: string,
): RulerTick[] {
  const unit = MAJOR_TICK_UNIT[level]
  const ticks: RulerTick[] = []
  const end = addDays(rangeStart, totalDays)

  const { dayFmt, monthFmt } = getRulerFormatters(locale)

  if (unit === 'day') {
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(rangeStart, i)
      ticks.push({
        leftPx: i * dayWidth,
        label: dayFmt.format(d),
        weekend: isWeekend(d),
        monthBoundary: d.getDate() === 1,
      })
    }
  } else if (unit === 'week') {
    // Aligne sur le lundi le plus proche ≤ rangeStart.
    const first = addDays(rangeStart, -((rangeStart.getDay() + 6) % 7))
    for (let d = new Date(first); d < end; d = addDays(d, 7)) {
      ticks.push({
        leftPx: daysBetween(rangeStart, d) * dayWidth,
        label: dayFmt.format(d),
        weekend: false,
        monthBoundary: d.getDate() <= 7,
      })
    }
  } else {
    // month / quarter / year → graduation par mois.
    const first = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    for (let d = new Date(first); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      ticks.push({
        leftPx: daysBetween(rangeStart, d) * dayWidth,
        label: monthFmt.format(d),
        weekend: false,
        monthBoundary: d.getMonth() === 0,
      })
    }
  }
  return ticks
}

/**
 * Barres de la minimap « waveform » : densité d'events par tranche (bucket) sur
 * toute l'étendue. Hauteur normalisée [0..1] pour piloter la hauteur des barres.
 */
export function buildMinimapBuckets(
  events: FullCalendarEvent[],
  rangeStart: Date,
  totalDays: number,
  bucketCount = 60,
): number[] {
  const buckets = new Array<number>(bucketCount).fill(0)
  const span = Math.max(1, totalDays)
  for (const e of events) {
    const s = parseLocalDate(e.start)
    if (Number.isNaN(s.getTime())) continue
    const dayOffset = daysBetween(rangeStart, s)
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((dayOffset / span) * bucketCount)))
    buckets[idx] += 1
  }
  const max = Math.max(1, ...buckets)
  return buckets.map((b) => b / max)
}

/**
 * Segments week-end (samedi/dimanche) à surligner en fond de colonne, sur toute
 * la hauteur du rail (continuité verticale, cf. Designer S17). Uniquement
 * pertinent aux niveaux fins (jour/semaine) où un jour est assez large ; au-delà
 * on renvoie [] (surcharge visuelle inutile). Chaque segment = {leftPx, widthPx}.
 */
export function buildWeekendSegments(
  rangeStart: Date,
  totalDays: number,
  level: ZoomLevel,
  dayWidth: number,
): Array<{ leftPx: number; widthPx: number }> {
  if (level !== 'day' && level !== 'week') return []
  const segments: Array<{ leftPx: number; widthPx: number }> = []
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(rangeStart, i)
    if (isWeekend(d)) {
      segments.push({ leftPx: i * dayWidth, widthPx: dayWidth })
    }
  }
  return segments
}

// #81 — `buildEventAriaLabel` DÉPLACÉ dans `lib.ts` (centralisation des helpers
// non liés au zoom + ajout de la récurrence BR-EVE-006, cf. `lib.ts`). Les
// consommateurs importent désormais depuis `./lib`. Pas de ré-export ici : deux
// `export *` (lib + zoom) exposant le même nom rendraient le symbole ambigu (et
// donc indisponible) dans le barrel `index.ts`.

/** Classe de fond de la pastille de statut (tokens DS, réutilise `.mt-evt`). */
export function statusToVar(status: PositionedEvent['status']): string {
  switch (status) {
    case 'expired':
      return 'var(--color-expired)'
    case 'ongoing':
      return 'var(--color-ongoing)'
    default:
      return 'var(--color-upcoming)'
  }
}
