import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Event } from '@/types/event'
import { toLocalIsoDate } from '@/lib/date-iso'
import { nextEvent, nextStart, startOfLocalDay } from './next-occurrence'

/**
 * #603 — `nextStart` / `nextEvent` : prochaine occurrence ≥ aujourd'hui, récurrences
 * comprises.
 *
 * FUSEAU FORCÉ (`America/Los_Angeles`, UTC−7/−8) par le TEST, pas par le shell : un
 * défaut de lecture `new Date("YYYY-MM-DD")` (UTC) y recule d'un jour, et le changement
 * d'heure du 1er novembre 2026 y tombe dans le cas hebdomadaire. Restauration
 * PIT-S83-007 (`delete`, jamais `= undefined`).
 *
 * ⚠ Aucune `Date` locale au niveau module : elle serait construite avant le `beforeAll`.
 */

const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/Los_Angeles'
})
afterAll(() => {
  if (previousTz === undefined) delete process.env.TZ
  else process.env.TZ = previousTz
})

/** Date LOCALE (mois 1-12). */
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)
/** Mardi 15 septembre 2026, 14 h 30 locale. */
const now = () => at(2026, 9, 15, 14, 30)
const iso = (date: Date | null) => (date === null ? null : toLocalIsoDate(date))

const evt = (title: string, startDate: string, overrides: Partial<Event> = {}): Event => ({
  id: title,
  title,
  type: 'single',
  startDate,
  endDate: startDate,
  productId: 'p1',
  archived: false,
  ...overrides,
})
const series = (
  title: string,
  startDate: string,
  recurrenceUnit: 'WEEK' | 'MONTH' | 'YEAR',
  recurrenceEndDate: string | null = null,
): Event => evt(title, startDate, { isRecurring: true, recurrenceUnit, recurrenceEndDate })

describe('#603 — non-vacance : le fuseau OUEST est actif', () => {
  it('offset positif, et la lecture UTC naïve y recule d’un jour', () => {
    expect(at(2026, 9, 15).getTimezoneOffset()).toBeGreaterThan(0)
    expect(new Date('2026-09-15').getDate()).toBe(14)
  })
})

describe('#603 — nextStart : ponctuels', () => {
  it('futur → sa date', () => {
    expect(iso(nextStart(evt('f', '2026-09-20'), now()))).toBe('2026-09-20')
  })

  it('du jour → reste à venir toute la journée (comparaison au DÉBUT du jour local)', () => {
    expect(iso(nextStart(evt('t', '2026-09-15'), now()))).toBe('2026-09-15')
    expect(iso(nextStart(evt('t', '2026-09-15'), at(2026, 9, 15, 23, 59)))).toBe('2026-09-15')
  })

  it('passé → null', () => {
    expect(nextStart(evt('p', '2026-09-14'), now())).toBeNull()
  })

  it('archivé → null, même futur ou récurrent', () => {
    expect(nextStart(evt('a', '2026-09-20', { archived: true }), now())).toBeNull()
    expect(nextStart({ ...series('ar', '2026-01-10', 'MONTH'), archived: true }, now())).toBeNull()
  })

  it('date illisible → null', () => {
    expect(nextStart(evt('x', 'pas-une-date'), now())).toBeNull()
  })

  it('le drapeau `isRecurring` fait foi : sans lui (ou sans unité), un passé reste passé', () => {
    expect(nextStart(evt('u', '2026-01-10', { recurrenceUnit: 'MONTH' }), now())).toBeNull()
    expect(
      nextStart(evt('n', '2026-01-10', { isRecurring: true, recurrenceUnit: null }), now()),
    ).toBeNull()
  })
})

describe('#603 — nextStart : récurrences', () => {
  it('mensuelle passée → prochaine occurrence (10 sept. < 15 → 10 oct.)', () => {
    expect(iso(nextStart(series('m', '2026-01-10', 'MONTH'), now()))).toBe('2026-10-10')
  })

  it('mensuelle dont l’occurrence tombe aujourd’hui → aujourd’hui', () => {
    expect(iso(nextStart(series('m', '2026-03-15', 'MONTH'), now()))).toBe('2026-09-15')
  })

  it('fin de mois : calculée depuis l’origine, une série « tous les 31 » ne dérive pas au 28', () => {
    expect(iso(nextStart(series('e', '2026-01-31', 'MONTH'), now()))).toBe('2026-09-30')
    expect(iso(nextStart(series('e', '2026-01-31', 'MONTH'), at(2026, 10, 1)))).toBe('2026-10-31')
    // Février traversé (clamp au 28) : mars revient au 31.
    expect(iso(nextStart(series('e', '2025-01-31', 'MONTH'), at(2026, 3, 1)))).toBe('2026-03-31')
  })

  it('annuelle depuis un 29 février → 28 février les années non bissextiles', () => {
    expect(iso(nextStart(series('y', '2024-02-29', 'YEAR'), now()))).toBe('2027-02-28')
  })

  it('hebdomadaire à travers le changement d’heure (1er nov. 2026)', () => {
    const weekly = series('w', '2026-10-20', 'WEEK')
    expect(iso(nextStart(weekly, at(2026, 11, 10, 23, 59)))).toBe('2026-11-10')
    expect(iso(nextStart(weekly, at(2026, 11, 11)))).toBe('2026-11-17')
  })

  it('hebdomadaire ancienne (4 ans d’heures d’été/hiver) → le bon lundi', () => {
    // 3 janv. 2022 = lundi ; 15 sept. 2026 = mardi → lundi 21 sept.
    expect(iso(nextStart(series('w', '2022-01-03', 'WEEK'), now()))).toBe('2026-09-21')
  })

  it('série bornée (BR-EVE-012) : borne INCLUSE, au-delà plus d’occurrence', () => {
    expect(nextStart(series('b', '2026-01-10', 'MONTH', '2026-08-10'), now())).toBeNull()
    expect(iso(nextStart(series('b', '2026-01-10', 'MONTH', '2026-10-10'), now()))).toBe(
      '2026-10-10',
    )
    expect(nextStart(series('b', '2026-01-10', 'MONTH', '2026-10-09'), now())).toBeNull()
  })

  it('série non bornée au-delà de l’horizon de 5 ans (`seriesHorizon`, comme la frise) → null', () => {
    expect(nextStart(series('h', '2021-01-10', 'MONTH'), now())).toBeNull()
    expect(iso(nextStart(series('h', '2021-10-10', 'MONTH'), now()))).toBe('2026-10-10')
  })
})

describe('#603 — nextEvent (produit)', () => {
  it('la plus proche des échéances : récurrence avancée, archivé et passé écartés', () => {
    const product = {
      events: [
        evt('Passé', '2026-09-01'),
        evt('Archivé demain', '2026-09-16', { archived: true }),
        evt('Ponctuel', '2026-09-25'),
        series('Mensuel', '2026-01-20', 'MONTH'),
      ],
    }
    expect(nextEvent(product, now())).toEqual({ title: 'Mensuel', start: '2026-09-20' })
  })

  it('aucun événement, ou aucun à venir → null', () => {
    expect(nextEvent({ events: [] }, now())).toBeNull()
    expect(
      nextEvent(
        { events: [evt('p', '2026-01-01'), series('b', '2026-01-10', 'MONTH', '2026-02-10')] },
        now(),
      ),
    ).toBeNull()
  })

  it('startOfLocalDay → minuit local du même jour civil', () => {
    expect(startOfLocalDay(now()).getTime()).toBe(at(2026, 9, 15).getTime())
  })
})
