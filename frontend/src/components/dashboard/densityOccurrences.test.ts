import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent, RecurrenceUnit } from '@/types/event'
import { buildDensityBuckets } from '@/components/timeline'
import { nextStart } from '@/lib/next-occurrence'
import { computeDashboardKpis } from './kpis'
import { projectDensityEvents } from './densityOccurrences'

/**
 * #818 — Occurrences et durées sur le ruban de densité.
 *
 * API FIXÉE du module `./densityOccurrences` (pur, sans React, `today` injecté) :
 *
 *   projectDensityEvents(events: FullCalendarEvent[], today: Date, days = 30): FullCalendarEvent[]
 *
 *  - fenêtre = `days` jours civils locaux, `today` (jour 0) compris ;
 *  - rend des copies d'événements dont `start` (et `end`) vaut le jour civil local
 *    `YYYY-MM-DD` à marquer, `id` et `color` conservés : `buildDensityBuckets` les
 *    consomme tel quel (contrat inchangé, la couleur du jour reste celle de l'événement) ;
 *  - un événement n'apparaît qu'UNE fois par jour de la fenêtre ;
 *  - ponctuel : sa date ; série : une entrée par échéance (règles de `nextStart` :
 *    unité, `recurrenceEndDate` incluse, archivé et récurrent sans unité ignorés,
 *    estimation d'indice, plafond `MAX_OCCURRENCES`) ; durée : un jour par jour couvert
 *    (R4, décision du plan : chaque jour couvert dans la fenêtre).
 *
 * Dates civiles locales (`new Date(y, m, d)`), `today` passé en paramètre. La fenêtre
 * 26 nov. → 25 déc. 2026 ne contient aucun changement d'heure (UE : 25 oct. / 29 mars,
 * US : 1er nov. / 14 mars).
 */

/** Jeudi 26 novembre 2026, jour 0 de la fenêtre ; jour 29 = vendredi 25 décembre. */
const TODAY = new Date(2026, 10, 26, 9, 0, 0)
const DAYS = 30

interface EvtOptions {
  end?: string
  type?: 'single' | 'duration'
  unit?: RecurrenceUnit | null
  isRecurring?: boolean
  recurrenceEndDate?: string | null
  archived?: boolean
}

const evt = (id: string, start: string, o: EvtOptions = {}): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: o.end ?? start,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: {
    productId: 'p1',
    productName: 'Produit A',
    category: 'Cat',
    type: o.type ?? 'single',
    isRecurring: o.isRecurring ?? Boolean(o.unit),
    recurrenceUnit: o.unit ?? null,
    recurrenceEndDate: o.recurrenceEndDate ?? null,
    archived: o.archived ?? false,
  },
})

/** Compte par jour tel que le ruban le dessine : projection puis `buildDensityBuckets`. */
const ribbonCounts = (events: FullCalendarEvent[]): number[] =>
  buildDensityBuckets(projectDensityEvents(events, TODAY, DAYS), TODAY, TODAY, DAYS).map(
    (b) => b.count,
  )

/** Indices (jour 0 = aujourd'hui) des jours marqués. */
const markedDays = (counts: number[]): number[] =>
  counts.flatMap((count, i) => (count > 0 ? [i] : []))

/** Indice dans la fenêtre d'un jour civil `YYYY-MM-DD`. */
const dayIndex = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 10, 26)) / 86_400_000)
}

const pad = (n: number) => String(n).padStart(2, '0')

describe('projectDensityEvents', () => {
  it('projects monthly series started a year ago onto its occurrence in the window', () => {
    // Départ 6 déc. 2025 : prochaine échéance le 6 déc. 2026, soit aujourd'hui + 10 jours.
    const counts = ribbonCounts([evt('abo', '2025-12-06', { unit: 'MONTH' })])
    expect(counts).toHaveLength(DAYS)
    expect(markedDays(counts)).toEqual([10])
    expect(counts[10]).toBe(1)
  })

  it('projects every occurrence of a weekly series inside the window', () => {
    // Départ jeudi 29 oct. : jeudis 26 nov., 3, 10, 17 et 24 déc. dans la fenêtre = 5 jours sur 30.
    const counts = ribbonCounts([evt('rdv', '2026-10-29', { unit: 'WEEK' })])
    expect(markedDays(counts)).toEqual([0, 7, 14, 21, 28])
    expect(counts.reduce((s, c) => s + c, 0)).toBe(5)
  })

  it('stops projecting after the recurrence end date, end date included', () => {
    // Mensuelle finissant le 6 déc. (échéance de la fenêtre) : le 6 déc. est marqué, le 6 janv. est hors fenêtre.
    const monthly = ribbonCounts([
      evt('mensuelle', '2025-12-06', { unit: 'MONTH', recurrenceEndDate: '2026-12-06' }),
    ])
    expect(markedDays(monthly)).toEqual([dayIndex('2026-12-06')])

    // Hebdomadaire finissant le jeudi 10 déc. : 26 nov., 3 et 10 déc. marqués, ni le 17 ni le 24 déc.
    const weekly = ribbonCounts([
      evt('hebdo', '2026-11-05', { unit: 'WEEK', recurrenceEndDate: '2026-12-10' }),
    ])
    expect(markedDays(weekly)).toEqual([0, 7, 14])
  })

  it('ignores archived events and recurring flag without unit', () => {
    const events = [
      // échéance mensuelle le 10 déc. si elle n'était pas archivée
      evt('archivee', '2026-01-10', { unit: 'MONTH', archived: true }),
      // isRecurring sans recurrenceUnit, commencée avant aujourd'hui
      evt('sans-unite', '2026-11-01', { isRecurring: true, unit: null }),
    ]
    expect(projectDensityEvents(events, TODAY, DAYS)).toEqual([])
    expect(markedDays(ribbonCounts(events))).toEqual([])
  })

  it('counts a one-off and a series starting inside the window once', () => {
    const events = [
      evt('ponctuel', '2026-12-02'),
      // série qui démarre dans la fenêtre : sa date de départ ne doit pas être comptée en double
      evt('hebdo', '2026-12-02', { unit: 'WEEK' }),
      evt('mensuelle', '2026-12-08', { unit: 'MONTH' }),
    ]
    const projected = projectDensityEvents(events, TODAY, DAYS)

    // Un événement par jour au plus.
    const keys = projected.map((e) => `${e.id}@${e.start}`)
    expect(new Set(keys).size).toBe(keys.length)

    const counts = ribbonCounts(events)
    expect(counts[dayIndex('2026-12-02')]).toBe(2) // ponctuel + départ de la série, une fois chacun
    expect(counts[dayIndex('2026-12-08')]).toBe(1)
    expect(markedDays(counts)).toEqual([6, 12, 13, 20, 27])
    expect(counts.reduce((s, c) => s + c, 0)).toBe(6)
  })

  it('marks each day covered by an ongoing duration within the window', () => {
    // Durée = `type: 'duration'` avec `start`/`end` (comme `isOngoing`) : garantie du 26 oct. au 1er déc.
    const counts = ribbonCounts([
      evt('garantie', '2026-10-26', { type: 'duration', end: '2026-12-01' }),
    ])
    expect(markedDays(counts)).toEqual([0, 1, 2, 3, 4, 5])
    expect(counts.every((c) => c === 0 || c === 1)).toBe(true)
  })

  it('ribbon shows an event on every day where due-soon counts one', () => {
    const events = [
      evt('ponctuel-3j', '2026-11-29'),
      evt('ponctuel-14j', '2026-12-10'), // borne : aujourd'hui + 14
      evt('ponctuel-passe', '2026-11-01'),
      evt('mensuelle-an', '2025-12-06', { unit: 'MONTH' }),
      evt('mensuelle-31', '2026-01-31', { unit: 'MONTH' }),
      evt('hebdo', '2026-10-29', { unit: 'WEEK' }),
      evt('annuelle', '2024-12-09', { unit: 'YEAR' }),
      evt('bornee-dans-fenetre', '2026-09-03', { unit: 'WEEK', recurrenceEndDate: '2026-12-03' }),
      evt('bornee-finie', '2026-01-10', { unit: 'MONTH', recurrenceEndDate: '2026-11-10' }),
      evt('archivee', '2026-01-10', { unit: 'MONTH', archived: true }),
      evt('sans-unite', '2026-11-01', { isRecurring: true, unit: null }),
    ]
    const projected = projectDensityEvents(events, TODAY, DAYS)
    const counts = ribbonCounts(events)

    // Vrai compteur « sous 14 jours », événement par événement.
    const counted = events.filter((e) => computeDashboardKpis([e], TODAY).dueSoon === 1)
    expect(counted.length).toBeGreaterThanOrEqual(6)
    for (const e of counted) {
      const next = nextStart(
        {
          startDate: e.start,
          archived: e.extendedProps.archived === true,
          isRecurring: e.extendedProps.isRecurring,
          recurrenceUnit: e.extendedProps.recurrenceUnit,
          recurrenceEndDate: e.extendedProps.recurrenceEndDate,
        },
        TODAY,
      )
      expect(next, e.id).not.toBeNull()
      const day = `${next!.getFullYear()}-${pad(next!.getMonth() + 1)}-${pad(next!.getDate())}`
      const idx = dayIndex(day)
      // C'est CET événement qui marque son jour (d'autres peuvent tomber le même jour).
      expect(
        projected.some((p) => p.id === e.id && p.start === day),
        `${e.id} absent du ruban le ${day}`,
      ).toBe(true)
      expect(counts[idx], `${e.id} jour ${idx}`).toBeGreaterThanOrEqual(1)
    }
  })
})
