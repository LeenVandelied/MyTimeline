import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import {
  DAY_WIDTH_PX,
  computeRange,
  indexEventsByResource,
  positionEvents,
  scaleEventPositions,
} from './zoom'
import { buildStressDataset } from './stress-fixtures'

/**
 * #349 — Recalculs de zoom INCRÉMENTAUX.
 *
 * `positionEvents` a été scindé en deux passes : une passe invariante au zoom
 * (`indexEventsByResource` — parsing des dates, statut, offsets en JOURS) et une
 * passe d'échelle (`scaleEventPositions` — jours × px/jour). Seule la seconde
 * est rejouée à un changement de zoom.
 *
 * Le contrat verrouillé ici est l'ÉQUIVALENCE STRICTE avec l'ancien chemin : le
 * gain de perf ne vaut rien s'il déplace une pastille d'un pixel.
 */

const now = new Date(2026, 6, 15)

const evt = (over: Partial<FullCalendarEvent> & { id: string }): FullCalendarEvent => ({
  title: `T-${over.id}`,
  start: '2026-07-10',
  end: '2026-07-12',
  allDay: true,
  resourceId: 'p1',
  extendedProps: {
    productId: 'p1',
    productName: 'Produit 1',
    category: 'Catégorie 1',
    type: 'duration',
  },
  ...over,
})

describe('indexEventsByResource + scaleEventPositions', () => {
  it('produit exactement le même résultat que positionEvents (jeu de charge 1000 events)', () => {
    const { events } = buildStressDataset({ eventCount: 1000, laneCount: 120, today: now })
    const { rangeStart } = computeRange(events, now)
    const indexed = indexEventsByResource(events, rangeStart, now)

    for (const level of ['day', 'week', 'month', 'quarter', 'year'] as const) {
      const dayWidth = DAY_WIDTH_PX[level]
      expect(scaleEventPositions(indexed, dayWidth)).toEqual(
        positionEvents(events, rangeStart, dayWidth, now),
      )
    }
  })

  it('conserve les mêmes exclusions (resourceId absent, date invalide)', () => {
    const events = [
      evt({ id: 'ok' }),
      evt({ id: 'sans-resource', resourceId: undefined }),
      evt({ id: 'date-invalide', start: 'pas-une-date' }),
    ]
    const rangeStart = new Date(2026, 6, 1)
    const indexed = indexEventsByResource(events, rangeStart, now)

    expect(indexed.get('p1')).toHaveLength(1)
    expect(indexed.get('p1')![0].event.id).toBe('ok')
    expect(scaleEventPositions(indexed, 12)).toEqual(positionEvents(events, rangeStart, 12, now))
  })

  it("n'indexe les dates QU'UNE fois : la géométrie en jours est invariante au zoom", () => {
    const events = [evt({ id: 'a', start: '2026-07-10', end: '2026-07-20' })]
    const rangeStart = new Date(2026, 6, 1)
    const indexed = indexEventsByResource(events, rangeStart, now)
    const [geometry] = indexed.get('p1')!

    expect(geometry.dayOffset).toBe(9)
    expect(geometry.spanDays).toBe(10)
    expect(geometry.status).toBe('ongoing')

    // Deux échelles différentes réutilisent la MÊME géométrie indexée.
    expect(scaleEventPositions(indexed, 12).get('p1')![0]).toMatchObject({
      leftPx: 108,
      widthPx: 120,
    })
    expect(scaleEventPositions(indexed, 96).get('p1')![0]).toMatchObject({
      leftPx: 864,
      widthPx: 960,
    })
  })

  it('applique le plancher de largeur (minWidth) aux zooms les plus larges', () => {
    const events = [evt({ id: 'court', start: '2026-07-10', end: '2026-07-11' })]
    const rangeStart = new Date(2026, 6, 1)
    const indexed = indexEventsByResource(events, rangeStart, now)

    // 1 jour × 2,2 px = 2,2 px → ramené au plancher de 6 px (pastille cliquable).
    expect(scaleEventPositions(indexed, DAY_WIDTH_PX.year).get('p1')![0].widthPx).toBe(6)
  })
})
