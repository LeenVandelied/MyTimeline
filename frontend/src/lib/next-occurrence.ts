import type { Event, RecurrenceUnit } from '@/types/event'
import type { Product } from '@/types/product'
import { parseLocalDate, toLocalIsoDate } from '@/lib/date-iso'
import { MAX_OCCURRENCES, occurrenceStart, seriesHorizon } from '@/lib/recurrence'

/**
 * #603 — Prochaine échéance d'un événement / d'un produit, helper MUTUALISÉ que le
 * handoff appelle `nextStart(event)` : « prochaine occurrence ≥ aujourd'hui (avance la
 * récurrence) » (`docs/design/graphite-handoff.md` §Helpers).
 *
 * Consommateurs : liste Produits (`products/ProductsListView`, colonne et tri « Prochain
 * événement ») et tableau de bord (`dashboard/ProductList`, `dashboard/ProductCarousel`,
 * via le ré-export de `dashboard/lib.ts`).
 *
 * RÈGLES :
 *  - « aujourd'hui » = DÉBUT du jour LOCAL de `now` : un événement du jour reste à venir
 *    toute la journée (l'ancien `nextEvent` comparait à `now` et l'écartait dès minuit + 1 ms) ;
 *  - événement archivé (BR-EVE-013) : jamais d'échéance ;
 *  - récurrence (BR-EVE-006) : occurrences calculées DEPUIS L'ORIGINE par `occurrenceStart`
 *    (même clamp de fin de mois que les frises : une série « tous les 31 » reste au 31) ;
 *  - borne : `seriesHorizon` — `recurrenceEndDate` INCLUSE (BR-EVE-012), sinon horizon de
 *    5 ans, comme les fantômes de la frise ; au-delà, pas d'occurrence. Plafond
 *    `MAX_OCCURRENCES` (miroir backend).
 *
 * Aucune boucle pas-à-pas depuis l'origine : l'indice de départ est estimé (toujours
 * STRICTEMENT avant aujourd'hui), puis 1 à 3 pas suffisent.
 */

const DAY_MS = 86_400_000

type NextStartInput = Pick<
  Event,
  'startDate' | 'archived' | 'isRecurring' | 'recurrenceUnit' | 'recurrenceEndDate'
>

/** Minuit LOCAL du jour civil de `now`. */
export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Plus grand indice `k` dont l'occurrence est GARANTIE strictement antérieure à `today`
 * (ou 0). Les occurrences croissent avec `k` : aucune occurrence d'indice inférieur ne
 * peut donc être ≥ `today`.
 *  - WEEK : `(⌊jours/7⌋ − 1)` semaines tombent au moins 7 jours avant `today` (le
 *    `Math.round` absorbe l'heure de décalage d'un changement d'heure) ;
 *  - MONTH / YEAR : l'occurrence d'indice `mois − 1` (resp. `⌊mois/12⌋ − 1` ans) tombe dans
 *    un mois calendaire antérieur à celui de `today`, clamp de fin de mois compris.
 */
function lowerBoundIndex(start: Date, unit: RecurrenceUnit, today: Date): number {
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())
  switch (unit) {
    case 'WEEK': {
      const days = Math.round((today.getTime() - start.getTime()) / DAY_MS)
      return Math.max(0, Math.floor(days / 7) - 1)
    }
    case 'MONTH':
      return Math.max(0, months - 1)
    case 'YEAR':
      return Math.max(0, Math.floor(months / 12) - 1)
  }
}

/**
 * Début de la prochaine occurrence ≥ aujourd'hui (minuit local), ou `null` : archivé,
 * date illisible, ponctuel passé, série terminée (borne ou horizon dépassés).
 */
export function nextStart(event: NextStartInput, now: Date): Date | null {
  if (event.archived) return null
  const start = parseLocalDate(event.startDate)
  if (Number.isNaN(start.getTime())) return null
  const today = startOfLocalDay(now)
  if (start.getTime() >= today.getTime()) return start

  const unit = event.isRecurring ? event.recurrenceUnit : null
  if (!unit) return null

  const end = event.recurrenceEndDate ? parseLocalDate(event.recurrenceEndDate) : null
  const horizon = seriesHorizon({
    start,
    unit,
    endDate: end !== null && !Number.isNaN(end.getTime()) ? end : null,
  }).getTime()

  for (let k = lowerBoundIndex(start, unit, today); k < MAX_OCCURRENCES; k++) {
    const occurrence = occurrenceStart(start, unit, k)
    if (occurrence.getTime() > horizon) return null
    if (occurrence.getTime() >= today.getTime()) return occurrence
  }
  return null
}

export interface NextEvent {
  title: string
  /** Jour civil de la prochaine occurrence, `YYYY-MM-DD` (local). */
  start: string
}

/**
 * Prochaine échéance d'un produit : la plus proche des `nextStart` de ses événements
 * (à date égale, le premier événement rencontré), ou `null`.
 */
export function nextEvent(product: Pick<Product, 'events'>, now: Date): NextEvent | null {
  let best: { title: string; date: Date } | null = null
  for (const event of product.events ?? []) {
    const date = nextStart(event, now)
    if (date !== null && (best === null || date.getTime() < best.date.getTime())) {
      best = { title: event.title, date }
    }
  }
  if (best === null) return null
  const start = toLocalIsoDate(best.date)
  return start === null ? null : { title: best.title, start }
}
