import { describe, expect, it } from 'vitest'

import type { FullCalendarEvent, RecurrenceUnit } from '@/types/event'
import {
  GHOST_BAR_PAINT_SLACK_PX,
  NO_RECURRENCE_MARKS,
  indexRecurrenceByResource,
  isRecurringSeries,
  sameRecurrenceMarks,
  scaleRecurrenceMarks,
  windowRecurrenceMarks,
} from './recurrence-marks'
import { UNBOUNDED_BAND } from './virtualization'

const RANGE_START = new Date(2026, 0, 1)

function evt(over: {
  id?: string
  start: string
  end?: string
  type?: 'single' | 'duration'
  isRecurring?: boolean
  unit?: RecurrenceUnit | null
  endDate?: string | null
  archived?: boolean
  resourceId?: string
}): FullCalendarEvent {
  return {
    id: over.id ?? 'e1',
    title: 'Série',
    start: over.start,
    end: over.end ?? over.start,
    allDay: true,
    resourceId: over.resourceId ?? 'r1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'r1',
      productName: 'Produit',
      category: 'Cat',
      type: over.type ?? 'single',
      isRecurring: over.isRecurring ?? true,
      recurrenceUnit: over.unit === undefined ? 'MONTH' : over.unit,
      recurrenceEndDate: over.endDate ?? null,
      archived: over.archived ?? false,
    },
  }
}

describe('#595 isRecurringSeries (BR-EVE-006)', () => {
  it('exige isRecurring ET une unité', () => {
    expect(isRecurringSeries(evt({ start: '2026-01-10' }))).toBe(true)
    expect(isRecurringSeries(evt({ start: '2026-01-10', unit: null }))).toBe(false)
    expect(isRecurringSeries(evt({ start: '2026-01-10', isRecurring: false }))).toBe(false)
  })
})

describe('#595 indexRecurrenceByResource — passe en jours', () => {
  it('aucune marque pour un événement non récurrent, sans unité ou archivé', () => {
    const events = [
      evt({ id: 'a', start: '2026-01-10', isRecurring: false }),
      evt({ id: 'b', start: '2026-01-10', unit: null }),
      evt({ id: 'c', start: '2026-01-10', archived: true }),
    ]
    expect(indexRecurrenceByResource(events, RANGE_START, 400).size).toBe(0)
  })

  it('fantômes APRÈS le début, bornés par recurrenceEndDate (incluse)', () => {
    const [g] = indexRecurrenceByResource(
      [evt({ start: '2026-01-10', endDate: '2026-03-10' })],
      RANGE_START,
      400,
    ).get('r1')!
    expect(g.dayOffset).toBe(9)
    expect(g.ghostDates).toEqual(['2026-02-10', '2026-03-10'])
    expect(g.ghostDayOffsets).toEqual([40, 68])
  })

  it('coupe à l’étendue existante (rangeStart + totalDays − 1), jamais étirée', () => {
    const [g] = indexRecurrenceByResource(
      [evt({ start: '2026-01-10', endDate: null })],
      RANGE_START,
      50,
    ).get('r1')!
    expect(g.ghostDates).toEqual(['2026-02-10'])
    // Plus aucun fantôme dans l'étendue : la série ne produit aucune marque (ni connecteur).
    expect(indexRecurrenceByResource([evt({ start: '2026-01-10' })], RANGE_START, 30).size).toBe(0)
  })

  it('pose la couleur brute et le contour planché (#497) dans le style des marques', () => {
    const [g] = indexRecurrenceByResource([evt({ start: '2026-01-10' })], RANGE_START, 400).get(
      'r1',
    )!
    expect(g.ghostStyle['--mt-evt']).toBe('#3B62D4')
    expect(g.ghostStyle['--mt-evt-outline']).toMatch(/^#/)
    expect(g.connectorStyle['--mt-evt-outline-dark']).toMatch(/^#/)
  })
})

describe('#595 scaleRecurrenceMarks — passe px', () => {
  it('ponctuel : carré 8 px centré sur la date, connecteur de la date réelle à la dernière', () => {
    const idx = indexRecurrenceByResource(
      [evt({ start: '2026-01-10', endDate: '2026-03-10' })],
      RANGE_START,
      400,
    )
    const [s] = scaleRecurrenceMarks(idx, 12, 400 * 12).get('r1')!
    expect(s.ghosts.map((g) => [g.leftPx, g.widthPx, g.start, g.end])).toEqual([
      [480, 8, 476, 484],
      [816, 8, 812, 820],
    ])
    expect([s.connector.leftPx, s.connector.widthPx]).toEqual([108, 816 - 108])
  })

  it('durée : largeur = durée × px/jour, connecteur jusqu’au bord droit de la dernière', () => {
    const idx = indexRecurrenceByResource(
      [
        evt({
          start: '2026-01-10',
          end: '2026-01-15',
          type: 'duration',
          endDate: '2026-02-10',
        }),
      ],
      RANGE_START,
      400,
    )
    const [s] = scaleRecurrenceMarks(idx, 12, 400 * 12).get('r1')!
    expect(s.ghosts).toHaveLength(1)
    expect([s.ghosts[0].leftPx, s.ghosts[0].widthPx]).toEqual([480, 60])
    expect(s.connector.leftPx + s.connector.widthPx).toBe(540)
  })

  it('retire un fantôme dont la PEINTURE dépasserait la piste (pas de débordement du rail)', () => {
    const idx = indexRecurrenceByResource(
      [
        evt({
          start: '2026-01-10',
          end: '2026-01-15',
          type: 'duration',
          endDate: '2026-03-10',
        }),
      ],
      RANGE_START,
      400,
    )
    // 2e fantôme : left 816 + 60 + slack → dépasse une piste qui s'arrête juste avant.
    const track = 816 + 60 + GHOST_BAR_PAINT_SLACK_PX - 1
    const [s] = scaleRecurrenceMarks(idx, 12, track).get('r1')!
    expect(s.ghosts.map((g) => g.date)).toEqual(['2026-02-10'])
  })
})

describe('#595 windowRecurrenceMarks — virtualisation horizontale', () => {
  const idx = indexRecurrenceByResource(
    [evt({ start: '2026-01-10', endDate: '2026-06-10' })],
    RANGE_START,
    400,
  )
  const series = scaleRecurrenceMarks(idx, 12, 400 * 12).get('r1')!

  it('bande non bornée : tout est monté', () => {
    const marks = windowRecurrenceMarks(series, UNBOUNDED_BAND)
    expect(marks.ghosts).toHaveLength(5)
    expect(marks.connectors).toHaveLength(1)
  })

  it('ne monte que les fantômes qui croisent la bande, indépendamment de l’occurrence réelle', () => {
    // Bande autour du fantôme du 10 avril (offset 99 → 1188 px), loin de l'occurrence réelle.
    const marks = windowRecurrenceMarks(series, { start: 1100, end: 1300 })
    expect(marks.ghosts.map((g) => g.date)).toEqual(['2026-04-10'])
    expect(marks.connectors).toHaveLength(1)
  })

  it('identité stable : même bande → marques identiques par identité ; lane vide → constante', () => {
    const band = { start: 0, end: 900 }
    expect(
      sameRecurrenceMarks(windowRecurrenceMarks(series, band), windowRecurrenceMarks(series, band)),
    ).toBe(true)
    expect(windowRecurrenceMarks([], band)).toBe(NO_RECURRENCE_MARKS)
    expect(windowRecurrenceMarks(series, { start: 5000, end: 6000 })).toBe(NO_RECURRENCE_MARKS)
  })
})
