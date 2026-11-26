import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent, RecurrenceUnit } from '@/types/event'
import { buildDensityBuckets } from '@/components/timeline'
import { nextStart } from '@/lib/next-occurrence'
import { computeDashboardKpis } from './kpis'
import { projectDensityEvents } from './densityOccurrences'

/**
 * #818 (correction de revue) — Durées RÉCURRENTES : chaque occurrence marque ses jours
 * couverts, pour que le ruban ne contredise pas le compteur « sous 14 jours » (`dueSoon`).
 * Fenêtre 26 nov. → 25 déc. 2026, jour 0 = jeudi 26 novembre.
 */
const TODAY = new Date(2026, 10, 26, 9, 0, 0)
const DAYS = 30

const duration = (
  id: string,
  start: string,
  end: string,
  unit: RecurrenceUnit,
): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: {
    productId: 'p1',
    productName: 'Produit A',
    category: 'Cat',
    type: 'duration',
    isRecurring: true,
    recurrenceUnit: unit,
    recurrenceEndDate: null,
    archived: false,
  },
})

const ribbonCounts = (events: FullCalendarEvent[]): number[] =>
  buildDensityBuckets(projectDensityEvents(events, TODAY, DAYS), TODAY, TODAY, DAYS).map(
    (b) => b.count,
  )

const markedDays = (counts: number[]): number[] =>
  counts.flatMap((count, i) => (count > 0 ? [i] : []))

describe('projectDensityEvents : durées récurrentes', () => {
  it('marks the days of a monthly 3-day duration started a year ago, including its dueSoon day', () => {
    // Origine 8-10 déc. 2025 : occurrence du 8-10 déc. 2026 = jours 12, 13, 14 de la fenêtre.
    const event = duration('d1', '2025-12-08', '2025-12-10', 'MONTH')
    expect(markedDays(ribbonCounts([event]))).toEqual([12, 13, 14])

    const next = nextStart(
      {
        startDate: event.start,
        archived: false,
        isRecurring: true,
        recurrenceUnit: 'MONTH',
        recurrenceEndDate: null,
      },
      TODAY,
    )
    expect(next).toEqual(new Date(2026, 11, 8))
    expect(computeDashboardKpis([event], TODAY).dueSoon).toBe(1)
    expect(ribbonCounts([event])[12]).toBe(1)
  })

  it('marks the remaining days of an occurrence started before the window', () => {
    // Occurrence du 25-27 nov. 2026 : jours 0 et 1 encore couverts, puis 25 déc. (jour 29).
    const event = duration('d2', '2025-11-25', '2025-11-27', 'MONTH')
    expect(markedDays(ribbonCounts([event]))).toEqual([0, 1, 29])
  })

  it('marks the days of an occurrence that starts in the window and overflows it', () => {
    // Occurrences du 24-28 nov. (jours 0 à 2 restants) et du 24-28 déc. (jours 28 et 29 dans la fenêtre).
    const event = duration('d3', '2025-11-24', '2025-11-28', 'MONTH')
    expect(markedDays(ribbonCounts([event]))).toEqual([0, 1, 2, 28, 29])
  })

  it('counts an event once per day when occurrences overlap', () => {
    // Hebdomadaire, durée de 10 jours : les occurrences se chevauchent, 1 par jour au plus.
    const event = duration('d4', '2026-01-05', '2026-01-14', 'WEEK')
    const counts = ribbonCounts([event])
    expect(Math.max(...counts)).toBe(1)
    expect(markedDays(counts)).toEqual(Array.from({ length: DAYS }, (_, i) => i))
  })
})
