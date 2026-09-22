import { parseLocalDate } from '@/lib/date-iso'
import type { Event } from '@/types/event'

/**
 * #607 — Un événement de l'historique est-il PASSÉ ?
 *
 * Règle (arbitrage S106) : sa date de FIN — ou sa date de début s'il n'a pas de fin
 * exploitable (ponctuel) — est STRICTEMENT antérieure au jour civil LOCAL de `today`.
 * Un événement qui se termine aujourd'hui n'est donc pas encore passé.
 *
 * Dates civiles lues en LOCAL (`parseLocalDate`, #652) : jamais `new Date("YYYY-MM-DD")`,
 * qui lirait minuit UTC et ferait basculer d'un jour à l'ouest de Greenwich (PIT-S89).
 * La comparaison se fait entre jours civils (composantes locales), pas entre instants.
 *
 * Série récurrente (hors énoncé, dérivé de la même règle) : sa fin n'est pas celle de la
 * 1re occurrence. Sans `recurrenceEndDate`, elle ne se termine jamais → jamais passée.
 * Bornée : la dernière occurrence DÉBUTE au plus tard à `recurrenceEndDate` et dure
 * autant que la première ; la série est passée quand CETTE fin-là est révolue.
 *
 * Donnée illisible (date invalide) → `false` : on ne désature pas sur une supposition.
 */
export type PastEventInput = Pick<
  Event,
  'startDate' | 'endDate' | 'isRecurring' | 'recurrenceEndDate'
>

const civilDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const isValid = (date: Date): boolean => !Number.isNaN(date.getTime())

export function isPastEvent(event: PastEventInput, today: Date): boolean {
  const start = parseLocalDate(event.startDate)
  const rawEnd = event.endDate ? parseLocalDate(event.endDate) : start
  const end = isValid(rawEnd) ? rawEnd : start
  if (!isValid(end)) return false

  let lastEnd = civilDay(end)
  if (event.isRecurring) {
    if (!event.recurrenceEndDate) return false
    const lastStart = parseLocalDate(event.recurrenceEndDate)
    if (!isValid(lastStart) || !isValid(start)) return false
    // Écart en JOURS CIVILS (pas en ms : un changement d'heure fausserait la division).
    const firstStart = civilDay(start)
    const spanDays = Math.round(
      (Date.UTC(lastEnd.getFullYear(), lastEnd.getMonth(), lastEnd.getDate()) -
        Date.UTC(firstStart.getFullYear(), firstStart.getMonth(), firstStart.getDate())) /
        86_400_000,
    )
    lastEnd = new Date(
      lastStart.getFullYear(),
      lastStart.getMonth(),
      lastStart.getDate() + Math.max(0, spanDays),
    )
  }
  return lastEnd.getTime() < civilDay(today).getTime()
}
