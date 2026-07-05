import { describe, it, expect } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import {
  ZOOM_LEVELS,
  addDays,
  buildMinimapBuckets,
  buildRulerTicks,
  buildWeekendSegments,
  computeRange,
  daysBetween,
  initialZoomState,
  isWeekend,
  positionEvents,
  zoomReducer,
  type ZoomState,
} from './zoom'

/**
 * #55 — Tests du cœur pur de la Vue Timeline. Aucun réseau, aucun React :
 * on vérifie l'échelle temporelle, le positionnement, les graduations et le
 * reducer de zoom (invariant clé : le zoom ne touche QUE le niveau/offset).
 */

function evt(id: string, start: string, end: string, resourceId = 'r1'): FullCalendarEvent {
  return {
    id,
    title: id,
    start,
    end,
    allDay: true,
    resourceId,
    color: '#123456',
    extendedProps: { productId: resourceId, productName: 'P', category: 'C', type: 'single' },
  }
}

describe('zoomReducer', () => {
  it('ZOOM_IN descend d’un niveau sans dépasser le plus fin', () => {
    let s: ZoomState = { level: 'month', offsetDays: 0 }
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // week
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // day
    expect(s.level).toBe('day')
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // reste day (borne)
    expect(s.level).toBe('day')
  })

  it('ZOOM_OUT monte d’un niveau sans dépasser le plus large', () => {
    let s: ZoomState = { level: 'quarter', offsetDays: 0 }
    s = zoomReducer(s, { type: 'ZOOM_OUT' }) // year
    expect(s.level).toBe('year')
    s = zoomReducer(s, { type: 'ZOOM_OUT' }) // reste year
    expect(s.level).toBe('year')
  })

  it('PREV/NEXT_PERIOD décalent offsetDays par le pas du niveau', () => {
    const s0: ZoomState = { level: 'week', offsetDays: 0 }
    const next = zoomReducer(s0, { type: 'NEXT_PERIOD' })
    expect(next.offsetDays).toBe(14)
    const prev = zoomReducer(next, { type: 'PREV_PERIOD' })
    expect(prev.offsetDays).toBe(0)
  })

  it('SET_LEVEL fixe le niveau et préserve l’offset', () => {
    const s = zoomReducer({ level: 'day', offsetDays: 12 }, { type: 'SET_LEVEL', level: 'year' })
    expect(s).toEqual({ level: 'year', offsetDays: 12 })
  })

  it('initialZoomState = month / offset 0', () => {
    expect(initialZoomState).toEqual({ level: 'month', offsetDays: 0 })
    expect(ZOOM_LEVELS).toEqual(['day', 'week', 'month', 'quarter', 'year'])
  })
})

describe('daysBetween / addDays / isWeekend', () => {
  it('daysBetween compte les jours calendaires', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10)
    expect(daysBetween(new Date(2026, 0, 11), new Date(2026, 0, 1))).toBe(-10)
  })
  it('addDays avance de n jours à minuit', () => {
    const d = addDays(new Date(2026, 0, 31, 15), 1)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
  })
  it('isWeekend détecte samedi/dimanche', () => {
    expect(isWeekend(new Date(2026, 6, 4))).toBe(true) // samedi
    expect(isWeekend(new Date(2026, 6, 5))).toBe(true) // dimanche
    expect(isWeekend(new Date(2026, 6, 6))).toBe(false) // lundi
  })
})

describe('computeRange', () => {
  it('englobe tous les events avec une marge et inclut aujourd’hui', () => {
    const today = new Date(2026, 6, 15)
    const { rangeStart, rangeEnd, totalDays } = computeRange(
      [evt('a', '2026-08-01', '2026-08-05')],
      today,
      10,
    )
    // today (15 juil) - 10j de marde => borne min avant le 1er août event
    expect(rangeStart.getTime()).toBeLessThan(new Date(2026, 6, 15).getTime())
    expect(rangeEnd.getTime()).toBeGreaterThan(new Date(2026, 7, 5).getTime())
    expect(totalDays).toBeGreaterThan(0)
  })

  it('sans event : fenêtre par défaut centrée sur today', () => {
    const today = new Date(2026, 6, 15)
    const { totalDays } = computeRange([], today, 30)
    // ±30j autour de today = 61 jours.
    expect(totalDays).toBe(61)
  })
})

describe('positionEvents', () => {
  it('positionne left/width en px à l’échelle dayWidth, sans clamp fenêtre', () => {
    const rangeStart = new Date(2026, 6, 1)
    const map = positionEvents(
      [evt('a', '2026-07-11', '2026-07-16')],
      rangeStart,
      10,
      new Date(2026, 6, 20),
    )
    const [e] = map.get('r1')!
    expect(e.leftPx).toBe(100) // 10 jours * 10px
    expect(e.widthPx).toBe(50) // 5 jours * 10px
    expect(e.status).toBe('expired') // fin 16 < now 20
  })

  it('largeur minimale respectée pour un event 1 jour', () => {
    const rangeStart = new Date(2026, 6, 1)
    const map = positionEvents(
      [evt('a', '2026-07-01', '2026-07-01')],
      rangeStart,
      2,
      new Date(2026, 6, 1),
      6,
    )
    const [e] = map.get('r1')!
    expect(e.widthPx).toBe(6) // 1 jour * 2px = 2 → clampé à minWidth 6
  })

  it('ignore un event sans resourceId', () => {
    const bad = { ...evt('a', '2026-07-01', '2026-07-02'), resourceId: '' }
    const map = positionEvents([bad], new Date(2026, 6, 1), 10, new Date())
    expect(map.size).toBe(0)
  })

  it('statut ongoing quand now est dans l’intervalle', () => {
    const map = positionEvents(
      [evt('a', '2026-07-01', '2026-07-10')],
      new Date(2026, 6, 1),
      10,
      new Date(2026, 6, 5),
    )
    expect(map.get('r1')![0].status).toBe('ongoing')
  })
})

describe('buildRulerTicks', () => {
  it('vue jour : une graduation par jour', () => {
    const ticks = buildRulerTicks(new Date(2026, 6, 1), 5, 'day', 10, 'fr-FR')
    expect(ticks).toHaveLength(5)
    expect(ticks[0].leftPx).toBe(0)
    expect(ticks[4].leftPx).toBe(40)
  })

  it('vue mois : graduation par semaine (moins de ticks que de jours)', () => {
    const ticks = buildRulerTicks(new Date(2026, 6, 1), 30, 'month', 5, 'fr-FR')
    expect(ticks.length).toBeLessThan(30)
    expect(ticks.length).toBeGreaterThan(0)
  })

  it('vue année : graduation par mois', () => {
    const ticks = buildRulerTicks(new Date(2026, 0, 1), 365, 'year', 2, 'fr-FR')
    // ~12-13 mois sur une année.
    expect(ticks.length).toBeGreaterThanOrEqual(12)
    expect(ticks.length).toBeLessThanOrEqual(13)
  })
})

describe('buildWeekendSegments', () => {
  it('renvoie un segment par jour de week-end en vue jour', () => {
    // 2026-07-01 = mercredi ; 4/5 = sam/dim, 11/12 = sam/dim.
    const segs = buildWeekendSegments(new Date(2026, 6, 1), 14, 'day', 10)
    expect(segs.length).toBe(4)
    expect(segs[0].widthPx).toBe(10)
  })

  it('renvoie [] aux niveaux larges (mois/trimestre/année)', () => {
    expect(buildWeekendSegments(new Date(2026, 6, 1), 90, 'month', 5)).toEqual([])
    expect(buildWeekendSegments(new Date(2026, 6, 1), 365, 'year', 2)).toEqual([])
  })
})

describe('buildMinimapBuckets', () => {
  it('normalise la densité entre 0 et 1', () => {
    const rangeStart = new Date(2026, 6, 1)
    const events = [
      evt('a', '2026-07-01', '2026-07-01'),
      evt('b', '2026-07-01', '2026-07-01'),
      evt('c', '2026-07-30', '2026-07-30'),
    ]
    const buckets = buildMinimapBuckets(events, rangeStart, 31, 10)
    expect(buckets).toHaveLength(10)
    expect(Math.max(...buckets)).toBe(1) // bucket le plus dense normalisé à 1
    expect(Math.min(...buckets)).toBeGreaterThanOrEqual(0)
  })
})
