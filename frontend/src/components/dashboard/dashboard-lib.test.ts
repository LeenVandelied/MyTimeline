import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import {
  buildDensityBuckets,
  getWeekRange,
  getEventsInRange,
} from '@/components/timeline'
import { timeOfDayKey } from './GreetingHeader'

/**
 * #80 — Tests des helpers purs du dashboard (bucketing densité, fenêtre semaine,
 * tranche horaire). Aucune dépendance React/réseau.
 */

const evt = (id: string, start: string, color?: string): FullCalendarEvent => ({
  id,
  title: `evt-${id}`,
  start,
  end: start,
  allDay: true,
  resourceId: 'p1',
  color,
  extendedProps: { productId: 'p1', productName: 'P', category: 'C', type: 'single' },
})

describe('buildDensityBuckets', () => {
  const now = new Date(2026, 6, 30) // 30 juil. 2026
  const from = new Date(2026, 6, 1) // 1er juil. 2026 (30 jours)

  it('produit un bucket par jour de la fenêtre', () => {
    const buckets = buildDensityBuckets([], from, now, 30)
    expect(buckets).toHaveLength(30)
    expect(buckets.every((b) => b.count === 0 && b.height === 0)).toBe(true)
  })

  it('compte les events par jour et normalise la hauteur sur le max', () => {
    const events = [
      evt('a', '2026-07-05', '#E5484D'),
      evt('b', '2026-07-05', '#3E8BD6'),
      evt('c', '2026-07-10', '#4FA459'),
    ]
    const buckets = buildDensityBuckets(events, from, now, 30)
    const day5 = buckets[4] // index 4 = 5 juil.
    const day10 = buckets[9]
    expect(day5.count).toBe(2)
    expect(day5.height).toBe(1) // max
    expect(day10.count).toBe(1)
    expect(day10.height).toBe(0.5)
    // Couleur dominante = première rencontrée chronologiquement.
    expect(day5.color).toBe('#E5484D')
  })

  it('ignore les events hors fenêtre et marque le jour TODAY', () => {
    const events = [evt('out', '2026-06-01'), evt('in', '2026-07-30')]
    const buckets = buildDensityBuckets(events, from, now, 30)
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(1)
    const today = buckets.find((b) => b.isToday)
    expect(today?.count).toBe(1)
  })
})

describe('getWeekRange', () => {
  it('cale la semaine sur lundi..dimanche (ISO 8601)', () => {
    // 2026-07-01 = mercredi → lundi = 2026-06-29, dimanche = 2026-07-05
    const { start, end } = getWeekRange(new Date(2026, 6, 1))
    expect(start.getDay()).toBe(1) // lundi
    expect(start.getDate()).toBe(29)
    expect(end.getDay()).toBe(0) // dimanche
    expect(end.getDate()).toBe(5)
    expect(end.getHours()).toBe(23)
  })

  it('un lundi reste son propre début de semaine', () => {
    const { start } = getWeekRange(new Date(2026, 6, 6)) // lundi
    expect(start.getDate()).toBe(6)
  })
})

describe('getEventsInRange', () => {
  it('filtre par plage et trie chronologiquement', () => {
    const start = new Date(2026, 6, 1)
    const end = new Date(2026, 6, 7, 23, 59, 59)
    const events = [
      evt('late', '2026-07-05'),
      evt('early', '2026-07-02'),
      evt('out', '2026-07-20'),
    ]
    const res = getEventsInRange(events, start, end)
    expect(res.map((e) => e.id)).toEqual(['early', 'late'])
  })
})

describe('timeOfDayKey', () => {
  it('mappe l’heure locale sur matin/après-midi/soir', () => {
    expect(timeOfDayKey(8)).toBe('morning')
    expect(timeOfDayKey(11)).toBe('morning')
    expect(timeOfDayKey(12)).toBe('afternoon')
    expect(timeOfDayKey(17)).toBe('afternoon')
    expect(timeOfDayKey(18)).toBe('evening')
    expect(timeOfDayKey(23)).toBe('evening')
  })
})
