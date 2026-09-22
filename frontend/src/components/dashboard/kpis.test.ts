import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FullCalendarEvent, RecurrenceUnit } from '@/types/event'
import {
  DUE_SOON_DAYS,
  busiestCategory,
  computeDashboardKpis,
  currentWeekEvents,
  isOngoing,
} from './kpis'

/**
 * #640 — Les 4 métriques de « En bref » (maquette S108 § « En bref »).
 *
 * Fuseau FORCÉ à l'ouest de Greenwich (motif `date-iso.local-date.test.tsx`) : une
 * relecture `new Date("YYYY-MM-DD")` (minuit UTC) y tombe la VEILLE à 20 h, donc tout
 * calcul qui ne lit pas le jour civil local rougit ici — y compris sous `TZ=UTC`.
 * ⚠ Aucune `Date` locale au niveau module : tout passe par des fonctions.
 */
const WEST_TZ = 'America/New_York'
const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = WEST_TZ
})
afterAll(() => {
  // PIT-S83-007 : `process.env.TZ = undefined` écrirait la CHAÎNE "undefined".
  if (previousTz === undefined) delete process.env.TZ
  else process.env.TZ = previousTz
})

/** Mercredi 15 juillet 2026, 9 h locale — semaine ISO du lundi 13 au dimanche 19. */
const now = () => new Date(2026, 6, 15, 9, 0, 0)

interface EvtOptions {
  end?: string
  type?: 'single' | 'duration'
  category?: string
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
    category: o.category ?? 'Cat',
    type: o.type ?? 'single',
    isRecurring: o.isRecurring ?? Boolean(o.unit),
    recurrenceUnit: o.unit ?? null,
    recurrenceEndDate: o.recurrenceEndDate ?? null,
    archived: o.archived ?? false,
  },
})

describe('#640 — compte vide', () => {
  it('toutes les valeurs à zéro, aucune catégorie', () => {
    expect(computeDashboardKpis([], now())).toEqual({
      week: 0,
      weekRecurring: 0,
      dueSoon: 0,
      ongoing: 0,
      busiestCategory: null,
    })
  })
})

describe('#640 — « … événements cette semaine, dont … récurrents »', () => {
  it('compte la semaine civile lundi → dimanche, bornes incluses', () => {
    const events = [
      evt('lun', '2026-07-13'),
      evt('dim', '2026-07-19'),
      evt('dim-avant', '2026-07-12'),
      evt('lun-apres', '2026-07-20'),
    ]
    expect(computeDashboardKpis(events, now()).week).toBe(2)
  })

  it('isole les récurrents (BR-EVE-006 : `isRecurring` ET `recurrenceUnit`)', () => {
    const events = [
      evt('mensuel', '2026-07-14', { unit: 'MONTH' }),
      evt('sans-unite', '2026-07-16', { isRecurring: true, unit: null }),
      evt('ponctuel', '2026-07-17'),
    ]
    const kpis = computeDashboardKpis(events, now())
    expect(kpis.week).toBe(3)
    expect(kpis.weekRecurring).toBe(1)
  })

  it('MÊME liste que `WeekAgenda` : une série née avant la semaine n’y figure pas', () => {
    // Occurrence mensuelle le 17 juillet, origine le 17 juin : la section « Cette
    // semaine » ne liste que les débuts réels — le compteur la suit (arbitrage lead).
    const events = [evt('serie-juin', '2026-06-17', { unit: 'MONTH' }), evt('mer', '2026-07-15')]
    const kpis = computeDashboardKpis(events, now())
    expect(kpis.week).toBe(currentWeekEvents(events, now()).length)
    expect(kpis.week).toBe(1)
  })
})

describe(`#640 — « … arrivent à échéance sous ${DUE_SOON_DAYS} jours »`, () => {
  it('borne inclusive : aujourd’hui et J+14 comptent, J+15 et hier non', () => {
    const events = [
      evt('j0', '2026-07-15'),
      evt('j14', '2026-07-29'),
      evt('j15', '2026-07-30'),
      evt('hier', '2026-07-14'),
    ]
    expect(computeDashboardKpis(events, now()).dueSoon).toBe(2)
  })

  it('avance la récurrence jusqu’à la prochaine occurrence ≥ aujourd’hui', () => {
    const events = [
      // Hebdo depuis le lundi 1er juin → prochaine le lundi 20 juillet (J+5) : compte.
      evt('hebdo', '2026-06-01', { unit: 'WEEK' }),
      // Annuel depuis le 10 août 2025 → prochaine le 10 août 2026 (J+26) : ne compte pas.
      evt('annuel', '2025-08-10', { unit: 'YEAR' }),
      // Mensuel terminé le 30 juin (BR-EVE-012) : plus d’occurrence, ne compte pas.
      evt('fini', '2026-01-20', { unit: 'MONTH', recurrenceEndDate: '2026-06-30' }),
    ]
    expect(computeDashboardKpis(events, now()).dueSoon).toBe(1)
  })

  it('un archivé ne compte pas (défense : `useDashboardData` les filtre déjà)', () => {
    expect(computeDashboardKpis([evt('a', '2026-07-16', { archived: true })], now()).dueSoon).toBe(
      0,
    )
  })

  it('jours CIVILS à travers le changement d’heure (DST US le 8 mars 2026)', () => {
    const march1 = () => new Date(2026, 2, 1, 9, 0, 0)
    const events = [evt('j14', '2026-03-15'), evt('j15', '2026-03-16')]
    expect(computeDashboardKpis(events, march1()).dueSoon).toBe(1)
  })
})

describe('#640 — « … couvertures sont en cours actuellement »', () => {
  it('durée dont [début, fin] contient aujourd’hui, bornes incluses', () => {
    const cases: [FullCalendarEvent, boolean][] = [
      [evt('finit-auj', '2026-07-01', { type: 'duration', end: '2026-07-15' }), true],
      [evt('commence-auj', '2026-07-15', { type: 'duration', end: '2026-08-01' }), true],
      [evt('demain', '2026-07-16', { type: 'duration', end: '2026-08-01' }), false],
      [evt('finie-hier', '2026-06-01', { type: 'duration', end: '2026-07-14' }), false],
      [evt('ponctuel-auj', '2026-07-15'), false],
    ]
    for (const [event, expected] of cases) expect(isOngoing(event, now()), event.id).toBe(expected)
    expect(
      computeDashboardKpis(
        cases.map(([e]) => e),
        now(),
      ).ongoing,
    ).toBe(2)
  })
})

describe('#640 — « Catégorie la plus chargée ce mois »', () => {
  it('compte les occurrences du MOIS CALENDAIRE courant, récurrences comprises', () => {
    const events = [
      evt('a1', '2026-07-02', { category: 'Alpha' }),
      evt('a2', '2026-07-31', { category: 'Alpha' }),
      // Hebdo depuis le 29 juin : 6, 13, 20, 27 juillet → 4 occurrences en juillet.
      evt('b', '2026-06-29', { category: 'Beta', unit: 'WEEK' }),
      // Hors mois : n’est compté nulle part.
      evt('g', '2026-08-01', { category: 'Gamma' }),
      evt('g2', '2026-06-30', { category: 'Gamma' }),
    ]
    expect(busiestCategory(events, now())).toBe('Beta')
  })

  it('une série bornée s’arrête à `recurrenceEndDate` (incluse)', () => {
    const events = [
      // Hebdo 1er juillet, fin le 8 : 1er et 8 juillet → 2.
      evt('b', '2026-07-01', { category: 'Beta', unit: 'WEEK', recurrenceEndDate: '2026-07-08' }),
      evt('a1', '2026-07-03', { category: 'Alpha' }),
      evt('a2', '2026-07-04', { category: 'Alpha' }),
      evt('a3', '2026-07-05', { category: 'Alpha' }),
    ]
    expect(busiestCategory(events, now())).toBe('Alpha')
  })

  it('ex æquo : premier nom alphabétique (collation racine), quel que soit l’ordre de l’API', () => {
    const beta = evt('b', '2026-07-10', { category: 'Beta' })
    const alpha = evt('a', '2026-07-20', { category: 'Alpha' })
    expect(busiestCategory([beta, alpha], now())).toBe('Alpha')
    expect(busiestCategory([alpha, beta], now())).toBe('Alpha')
    // Collation, pas points de code : « É » (U+00C9) passerait APRÈS « Z » (U+005A).
    const e = evt('e', '2026-07-10', { category: 'Électricité' })
    const z = evt('z', '2026-07-11', { category: 'Zinc' })
    expect(busiestCategory([z, e], now())).toBe('Électricité')
    expect(busiestCategory([e, z], now())).toBe('Électricité')
  })

  it('aucune occurrence ce mois → `null` (rendu « — »)', () => {
    expect(busiestCategory([evt('g', '2026-08-01')], now())).toBeNull()
  })

  it('jour CIVIL : un 1er août ne bascule pas au 31 juillet à l’ouest de Greenwich', () => {
    const events = [
      evt('a', '2026-07-10', { category: 'Cat' }),
      evt('b1', '2026-08-01', { category: 'Août' }),
      evt('b2', '2026-08-01', { category: 'Août' }),
    ]
    expect(busiestCategory(events, now())).toBe('Cat')
  })
})
