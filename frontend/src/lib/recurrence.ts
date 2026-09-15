import type { RecurrenceUnit } from '@/types/event'

/**
 * #595 — Occurrences d'une série récurrente (BR-EVE-006 / BR-EVE-012), helper
 * MUTUALISÉ que le handoff appelle `instancesIn` (« frise, dashboard, mini-frises »).
 *
 * Consommateurs : l'aperçu du formulaire (`events/previewTimeline.ts`, qui ré-exporte
 * `addDays` / `addMonths` / `nextOccurrenceStart` depuis ce module — déplacés ici, pas
 * dupliqués) et les occurrences fantômes des trois frises
 * (`components/timeline/recurrence-marks.ts`).
 *
 * Fonctions PURES, dates civiles en heure LOCALE (minuit), aucun React.
 */

/** Ajout de jours en heure locale (garde l'heure de `date`). */
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

/**
 * Début de l'occurrence n° `k` (0 = occurrence d'origine), calculé DEPUIS L'ORIGINE et
 * non de proche en proche : `addMonths(addMonths(31 janv., 1), 1)` donne le 28 mars
 * (le clamp de février se propage), `addMonths(31 janv., 2)` donne le 31 mars. Une
 * série « tous les 31 » reste donc calée sur la fin de mois.
 *
 * ⚠ Écart assumé avec `RecurrenceExpansionServiceImpl.advance` (backend), qui itère de
 * proche en proche (`plusMonths(1)` répété) : il dérive au 28 après février. Ce service
 * n'a qu'un appelant (`RecurrencePreviewController`, PIT-S86) et ne sert que le COMPTE
 * de l'aperçu ; aucune date d'occurrence n'est persistée ni affichée depuis lui.
 */
export function occurrenceStart(origin: Date, unit: RecurrenceUnit, k: number): Date {
  switch (unit) {
    case 'WEEK':
      return addDays(origin, 7 * k)
    case 'MONTH':
      return addMonths(origin, k)
    case 'YEAR':
      return addMonths(origin, 12 * k)
  }
}

/** Récurrence (BR-EVE-006) — enum MAJUSCULE `WEEK/MONTH/YEAR` (≠ `durationUnit`). */
export function nextOccurrenceStart(start: Date, unit: RecurrenceUnit): Date {
  return occurrenceStart(start, unit, 1)
}

/**
 * Miroir de `RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS` (backend, #452) : une
 * série SANS `recurrenceEndDate` est développée sur 5 ans (mensuel 61 occurrences,
 * hebdomadaire 261, annuel 6 — origine comprise, cf. PIT-S82-002). Une borne explicite
 * n'est jamais rognée par cet horizon.
 */
export const MAX_UNBOUNDED_EXPANSION_YEARS = 5

/** Miroir de `RecurrenceExpansion.MAX_OCCURRENCES` (backend) : plafond en NOMBRE, origine comprise. */
export const MAX_OCCURRENCES = 4000

export interface RecurrenceSeries {
  /** Début de la série = début de l'occurrence réelle (minuit local). */
  start: Date
  unit: RecurrenceUnit
  /** `recurrenceEndDate` (BR-EVE-012), `null` = série non bornée. */
  endDate: Date | null
}

/**
 * Dernier début d'occurrence ADMISSIBLE, INCLUSIF — même règle que le backend
 * (`while (!current.isAfter(effectiveEnd))`) : une occurrence qui tombe PILE sur
 * `recurrenceEndDate` fait partie de la série (BR-EVE-012 tolère `end == start`).
 */
export function seriesHorizon(series: RecurrenceSeries): Date {
  return series.endDate ?? addMonths(series.start, 12 * MAX_UNBOUNDED_EXPANSION_YEARS)
}

/**
 * Débuts des occurrences FANTÔMES (k ≥ 1) d'une série, jusqu'à `until` INCLUS.
 *
 * - AUCUN fantôme avant le début : `start` est le début de la série (≠ maquette, dont
 *   les données de démo n'ont pas de début et dessinent aussi des fantômes en arrière).
 * - Borne haute = la plus proche de `seriesHorizon` (fin de série incluse, ou horizon de
 *   5 ans) et de `until` (fin de l'étendue affichée) ; plafond `MAX_OCCURRENCES`.
 */
export function ghostOccurrenceStarts(series: RecurrenceSeries, until: Date): Date[] {
  const limit = Math.min(seriesHorizon(series).getTime(), until.getTime())
  const starts: Date[] = []
  for (let k = 1; k < MAX_OCCURRENCES; k++) {
    const next = occurrenceStart(series.start, series.unit, k)
    if (next.getTime() > limit) break
    starts.push(next)
  }
  return starts
}
