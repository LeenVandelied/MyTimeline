import { describe, expect, it } from 'vitest'

import {
  MAX_OCCURRENCES,
  ghostOccurrenceStarts,
  nextOccurrenceStart,
  occurrenceStart,
  seriesHorizon,
} from './recurrence'

/** Date civile locale (minuit) — indépendante du fuseau pour `getDate()`. */
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

describe('#595 occurrenceStart — occurrence k calculée depuis l’origine', () => {
  it('WEEK / MONTH / YEAR', () => {
    expect(iso(occurrenceStart(d(2026, 1, 15), 'WEEK', 3))).toBe('2026-02-05')
    expect(iso(occurrenceStart(d(2026, 1, 15), 'MONTH', 2))).toBe('2026-03-15')
    expect(iso(occurrenceStart(d(2026, 1, 15), 'YEAR', 2))).toBe('2028-01-15')
  })

  it('départ au 31 janvier en mensuel : clamp par occurrence, sans dérive cumulée', () => {
    const origin = d(2026, 1, 31)
    expect([1, 2, 3, 4].map((k) => iso(occurrenceStart(origin, 'MONTH', k)))).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ])
    // Témoin de la raison d'être : de proche en proche, le clamp de février se propage.
    expect(iso(nextOccurrenceStart(nextOccurrenceStart(origin, 'MONTH'), 'MONTH'))).toBe(
      '2026-03-28',
    )
  })

  it('29 février en annuel : 28 les années communes, 29 les bissextiles', () => {
    const origin = d(2028, 2, 29)
    expect(iso(occurrenceStart(origin, 'YEAR', 1))).toBe('2029-02-28')
    expect(iso(occurrenceStart(origin, 'YEAR', 4))).toBe('2032-02-29')
  })
})

describe('#595 ghostOccurrenceStarts — bornes des fantômes', () => {
  const FAR = d(2200, 1, 1)

  it('aucun fantôme avant le début : toutes les dates sont > start', () => {
    const start = d(2026, 1, 15)
    const ghosts = ghostOccurrenceStarts({ start, unit: 'WEEK', endDate: null }, FAR)
    expect(ghosts.length).toBeGreaterThan(0)
    expect(ghosts.every((g) => g.getTime() > start.getTime())).toBe(true)
  })

  it('recurrenceEndDate INCLUSE (BR-EVE-012, parité backend `!isAfter`)', () => {
    const start = d(2026, 1, 15)
    expect(
      ghostOccurrenceStarts({ start, unit: 'MONTH', endDate: d(2026, 3, 15) }, FAR).map(iso),
    ).toEqual(['2026-02-15', '2026-03-15'])
    expect(
      ghostOccurrenceStarts({ start, unit: 'MONTH', endDate: d(2026, 3, 14) }, FAR).map(iso),
    ).toEqual(['2026-02-15'])
  })

  it('fin de série = début (toléré par BR-EVE-012) ou antérieure : aucun fantôme', () => {
    const start = d(2026, 1, 15)
    expect(ghostOccurrenceStarts({ start, unit: 'WEEK', endDate: start }, FAR)).toEqual([])
    expect(ghostOccurrenceStarts({ start, unit: 'WEEK', endDate: d(2026, 1, 1) }, FAR)).toEqual([])
  })

  it('série non bornée = horizon backend de 5 ans (61 / 261 / 6 occurrences origine comprise)', () => {
    const start = d(2026, 1, 1)
    expect(iso(seriesHorizon({ start, unit: 'MONTH', endDate: null }))).toBe('2031-01-01')
    const count = (unit: 'WEEK' | 'MONTH' | 'YEAR') =>
      ghostOccurrenceStarts({ start, unit, endDate: null }, FAR).length + 1
    expect(count('MONTH')).toBe(61)
    expect(count('WEEK')).toBe(261)
    expect(count('YEAR')).toBe(6)
  })

  it('une borne explicite n’est pas rognée par l’horizon de 5 ans', () => {
    const start = d(2026, 1, 1)
    const ghosts = ghostOccurrenceStarts({ start, unit: 'YEAR', endDate: d(2036, 1, 1) }, FAR)
    expect(ghosts.map(iso).at(-1)).toBe('2036-01-01')
  })

  it('coupe à la fin de l’étendue affichée (`until` inclus)', () => {
    const start = d(2026, 1, 15)
    expect(
      ghostOccurrenceStarts({ start, unit: 'MONTH', endDate: null }, d(2026, 3, 15)).map(iso),
    ).toEqual(['2026-02-15', '2026-03-15'])
    expect(ghostOccurrenceStarts({ start, unit: 'MONTH', endDate: null }, d(2026, 2, 14))).toEqual(
      [],
    )
  })

  it('plafond MAX_OCCURRENCES (origine comprise) sur une borne très lointaine', () => {
    const start = d(2026, 1, 1)
    const ghosts = ghostOccurrenceStarts({ start, unit: 'WEEK', endDate: d(2126, 1, 1) }, FAR)
    expect(ghosts.length + 1).toBe(MAX_OCCURRENCES)
  })
})
