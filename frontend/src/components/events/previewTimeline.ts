import type { DurationUnit, RecurrenceUnit } from '@/types/event'

/**
 * #315 — Modèle de la MINI-FRISE d'aperçu du formulaire d'événement (handoff §6).
 *
 * Fonctions PURES (aucun React, aucun i18n) : la géométrie de l'aperçu est
 * testable sans DOM et mémoïsable côté composant. Le rendu vit dans
 * `EventPreviewTimeline.tsx`, qui compose les primitives de frise `Ruler` /
 * `Cursor` (#47) sur ces positions.
 *
 * Miroir CLIENT de règles backend — l'aperçu ne doit pas mentir sur ce que le
 * serveur calculera :
 *   - BR-EVE-003 : `endDate` = `startDate` + durée quand `type='duration'`,
 *     `endDate = startDate` quand `type='single'`.
 *   - BR-EVE-005 : `startDate` absente ⇒ aujourd'hui.
 *   - BR-EVE-006 : occurrence fantôme rendue UNIQUEMENT si `isRecurring` ET
 *     `recurrenceUnit` (une récurrence sans unité est inexploitable).
 * ⚠ Miroir d'AFFICHAGE seulement : la source de vérité reste le backend, rien
 * ici n'est envoyé dans le payload.
 */

/**
 * Nature d'un événement (BR-EVE-003) — domaine FERMÉ, aligné sur `eventEditSchema.type`
 * (`z.enum(['duration','single'])`, `types/event.ts`). Typer large (`string`) laissait
 * passer n'importe quelle chaîne alors que seule `'duration'` change le calcul.
 */
export type PreviewEventType = 'duration' | 'single'

/** Nombre de colonnes de la règle temporelle (graduations de la mini-frise). */
export const PREVIEW_COLUMNS = 6

/** Largeur minimale d'une barre en % (un événement d'un jour reste visible). */
export const MIN_BAR_WIDTH_PERCENT = 2.5

const MS_PER_DAY = 86_400_000

/** Minuit local du jour de `date` (les dates de formulaire sont des jours, pas des instants). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

/**
 * Ajout de mois avec CLAMP en fin de mois (31 janv. + 1 mois = 28/29 févr.),
 * parité `java.time.LocalDate.plusMonths` utilisé par `Utils.calculateEndDate`.
 * `setMonth` natif déborderait sur le mois suivant (3 mars) → aperçu faux.
 */
export function addMonths(date: Date, amount: number): Date {
  const day = date.getDate()
  const shifted = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDayOfMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(day, lastDayOfMonth))
  return shifted
}

/** Durée d'événement (BR-EVE-003) — unités MINUSCULES `days/weeks/months/years`. */
export function addDurationUnits(date: Date, amount: number, unit: DurationUnit): Date {
  switch (unit) {
    case 'days':
      return addDays(date, amount)
    case 'weeks':
      return addDays(date, amount * 7)
    case 'months':
      return addMonths(date, amount)
    case 'years':
      return addMonths(date, amount * 12)
  }
}

/** Récurrence (BR-EVE-006) — enum MAJUSCULE `WEEK/MONTH/YEAR` (≠ `durationUnit`). */
export function nextOccurrenceStart(start: Date, unit: RecurrenceUnit): Date {
  switch (unit) {
    case 'WEEK':
      return addDays(start, 7)
    case 'MONTH':
      return addMonths(start, 1)
    case 'YEAR':
      return addMonths(start, 12)
  }
}

/**
 * Garde-fou de la recherche d'occurrence à venir : ~96 ans en hebdomadaire, la
 * pire cadence. Empêche toute boucle infinie si une unité inattendue renvoyait
 * une date qui n'avance pas.
 */
const MAX_OCCURRENCE_STEPS = 5000

/**
 * Première occurrence de la série qui n'est PAS dans le passé, en partant du
 * fantôme (`start` + 1 période).
 *
 * En édition d'un événement récurrent ANCIEN (série démarrée il y a des mois),
 * `start + 1 période` est déjà passé : la légende « Prochaine occurrence »
 * annonçait alors une date révolue. On itère donc jusqu'à atteindre `today` ou
 * au-delà — une occurrence tombant AUJOURD'HUI reste la prochaine (elle n'est
 * pas passée).
 *
 * ⚠ Ne déplace PAS l'occurrence fantôme rendue sur la frise : celle-ci illustre
 * la CADENCE juste après l'occurrence saisie ; la caler sur aujourd'hui
 * étirerait la fenêtre sur toute l'ancienneté de la série et écraserait la barre
 * pleine.
 */
function resolveNextOccurrence(ghostStart: Date, unit: RecurrenceUnit, today: Date): Date {
  let occurrence = ghostStart
  let steps = 0
  while (occurrence < today && steps < MAX_OCCURRENCE_STEPS) {
    occurrence = nextOccurrenceStart(occurrence, unit)
    steps += 1
  }
  return occurrence
}

/**
 * Parse une date de formulaire `YYYY-MM-DD` en date LOCALE. `new Date('2026-05-01')`
 * serait interprétée en UTC → décalage d'un jour côté UTC−, exactement le piège
 * évité par `todayLocalIso()` dans `NewEventDrawer`.
 */
export function parseLocalIsoDate(value?: string | null): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Segment positionné dans la fenêtre de l'aperçu (barre pleine ou fantôme). */
export interface PreviewSegment {
  start: Date
  /** Dernier jour COUVERT (inclusif), comme `endDate` backend. */
  end: Date
  leftPercent: number
  widthPercent: number
}

export interface PreviewModel {
  /** Début de fenêtre (minuit local) et borne de fin EXCLUSIVE. */
  windowStart: Date
  windowEnd: Date
  /** Graduations de la règle : `PREVIEW_COLUMNS` dates régulièrement espacées. */
  ticks: Date[]
  /** Occurrence saisie (barre pleine). */
  main: PreviewSegment
  /** Occurrence FANTÔME (récurrence) ou `null` si l'événement n'est pas récurrent. */
  ghost: PreviewSegment | null
  /** Connecteur pointillé main → ghost, `null` si les occurrences se touchent. */
  connector: { leftPercent: number; widthPercent: number } | null
  /** Position de TODAY en %, `null` si hors fenêtre (ne devrait pas arriver). */
  todayPercent: number | null
  /**
   * Date de la légende « prochaine occurrence » : pour une série, la première
   * occurrence non passée à partir du fantôme (cf. `resolveNextOccurrence`) ;
   * sinon le début de l'occurrence saisie.
   */
  nextOccurrence: Date
}

export interface PreviewInput {
  startDate?: string | null
  endDate?: string | null
  type?: PreviewEventType | null
  durationValue?: number | null
  durationUnit?: DurationUnit | null
  isRecurring?: boolean
  recurrenceUnit?: RecurrenceUnit | null
  /** Référence « aujourd'hui » (injectable → tests déterministes). */
  now: Date
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * Fin d'occurrence (BR-EVE-003). `type='duration'` avec une durée fournie ⇒ la
 * DURÉE fait foi (le backend recalcule et ignorerait une `endDate` explicite) ;
 * sinon on retombe sur l'`endDate` saisie (mode édition, `type='single'`), puis
 * sur `startDate` (événement ponctuel).
 *
 * ⚠ Garde `!= null` et NON `> 0` : `Utils.calculateEndDate` (backend) branche sur
 * `durationValue != null`, donc `durationValue=0` y renvoie `startDate`. Une garde
 * `> 0` faisait retomber l'aperçu sur l'`endDate` saisie — l'aperçu mentait alors
 * sur ce que le serveur allait calculer.
 */
function resolveEnd(start: Date, input: PreviewInput): Date {
  const { type, durationValue, durationUnit, endDate } = input
  if (type === 'duration' && durationValue != null && durationUnit) {
    return addDurationUnits(start, durationValue, durationUnit)
  }
  const explicitEnd = parseLocalIsoDate(endDate)
  if (explicitEnd && explicitEnd >= start) return explicitEnd
  return start
}

/**
 * Construit la géométrie complète de la mini-frise.
 *
 * Fenêtre : plus petit intervalle couvrant TODAY + l'occurrence saisie + le
 * fantôme, élargi d'une marge (~15%) puis arrondi à un multiple de
 * `PREVIEW_COLUMNS` jours → les graduations tombent sur des bornes de colonnes
 * régulières, donc les % de barres et de graduations partagent la même échelle.
 */
export function buildPreviewModel(input: PreviewInput): PreviewModel {
  const today = startOfDay(input.now)
  const start = startOfDay(parseLocalIsoDate(input.startDate) ?? today)
  const end = startOfDay(resolveEnd(start, input))

  // BR-EVE-006 : pas d'unité ⇒ pas de fantôme (récurrence inexploitable).
  const recurrenceUnit = input.isRecurring ? (input.recurrenceUnit ?? null) : null
  const ghostStart = recurrenceUnit ? nextOccurrenceStart(start, recurrenceUnit) : null
  const ghostEnd = ghostStart
    ? addDays(ghostStart, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY))
    : null

  const marks = [today, start, end, ...(ghostStart ? [ghostStart] : []), ...(ghostEnd ? [ghostEnd] : [])]
  const min = new Date(Math.min(...marks.map((d) => d.getTime())))
  const max = new Date(Math.max(...marks.map((d) => d.getTime())))
  const spanDays = Math.max(1, Math.round((max.getTime() - min.getTime()) / MS_PER_DAY) + 1)
  const margin = Math.max(1, Math.round(spanDays * 0.15))
  const windowStart = addDays(startOfDay(min), -margin)
  const stepDays = Math.max(1, Math.ceil((spanDays + margin * 2) / PREVIEW_COLUMNS))
  const windowEnd = addDays(windowStart, stepDays * PREVIEW_COLUMNS)
  const totalMs = windowEnd.getTime() - windowStart.getTime()

  const percentAt = (date: Date): number =>
    clampPercent(((date.getTime() - windowStart.getTime()) / totalMs) * 100)

  /** Une barre couvre son dernier jour EN ENTIER → borne droite = end + 1 jour. */
  const toSegment = (segStart: Date, segEnd: Date): PreviewSegment => {
    const leftPercent = percentAt(segStart)
    const rawWidth = percentAt(addDays(segEnd, 1)) - leftPercent
    return {
      start: segStart,
      end: segEnd,
      leftPercent,
      widthPercent: Math.max(MIN_BAR_WIDTH_PERCENT, rawWidth),
    }
  }

  const main = toSegment(start, end)
  const ghost = ghostStart && ghostEnd ? toSegment(ghostStart, ghostEnd) : null

  // Connecteur pointillé : de la fin de l'occurrence pleine au début du fantôme.
  let connector: PreviewModel['connector'] = null
  if (ghost) {
    const connectorLeft = percentAt(addDays(end, 1))
    const connectorWidth = ghost.leftPercent - connectorLeft
    if (connectorWidth > 0) {
      connector = { leftPercent: connectorLeft, widthPercent: connectorWidth }
    }
  }

  const todayInWindow = today >= windowStart && today < windowEnd
  const ticks = Array.from({ length: PREVIEW_COLUMNS }, (_, index) =>
    addDays(windowStart, index * stepDays),
  )

  return {
    windowStart,
    windowEnd,
    ticks,
    main,
    ghost,
    connector,
    todayPercent: todayInWindow ? percentAt(today) : null,
    nextOccurrence:
      ghostStart && recurrenceUnit ? resolveNextOccurrence(ghostStart, recurrenceUnit, today) : start,
  }
}
