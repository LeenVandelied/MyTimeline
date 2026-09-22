import { describe, expect, it } from 'vitest'

import { isPastEvent, type PastEventInput } from './isPastEvent'

/**
 * #607 — critère « passé » de l'historique produit. `today` est construit en heure
 * LOCALE (composantes), comme le fait le composant avec `new Date()` : le verdict ne
 * dépend donc pas du fuseau du runner (cf. [[tz-undefined-contamine-les-tests]]).
 */
const TODAY = new Date(2026, 8, 22, 15, 30) // 22 sept. 2026, 15 h 30 locale

const single = (date: string): PastEventInput => ({ startDate: date, endDate: date })

describe('isPastEvent (#607)', () => {
  it('ponctuel d’hier : passé', () => {
    expect(isPastEvent(single('2026-09-21'), TODAY)).toBe(true)
  })

  it('ponctuel d’aujourd’hui : PAS passé (strictement antérieur)', () => {
    expect(isPastEvent(single('2026-09-22'), TODAY)).toBe(false)
  })

  it('à venir : pas passé', () => {
    expect(isPastEvent(single('2026-09-23'), TODAY)).toBe(false)
  })

  it('durée commencée avant et finissant aujourd’hui : pas passé (la FIN fait foi)', () => {
    expect(isPastEvent({ startDate: '2026-09-01', endDate: '2026-09-22' }, TODAY)).toBe(false)
  })

  it('durée finie hier : passé', () => {
    expect(isPastEvent({ startDate: '2026-09-01', endDate: '2026-09-21' }, TODAY)).toBe(true)
  })

  it('fin vide : repli sur la date de début', () => {
    expect(isPastEvent({ startDate: '2026-09-21', endDate: '' }, TODAY)).toBe(true)
    expect(isPastEvent({ startDate: '2026-09-22', endDate: '' }, TODAY)).toBe(false)
  })

  it('date illisible : jamais passé (pas de désaturation sur une supposition)', () => {
    expect(isPastEvent({ startDate: 'n/a', endDate: 'n/a' }, TODAY)).toBe(false)
  })

  it('lit la date civile en LOCAL, pas en UTC (minuit du jour, heure tardive)', () => {
    // Juste après minuit local : « hier » reste hier, quelle que soit la position UTC.
    const justAfterMidnight = new Date(2026, 8, 22, 0, 5)
    expect(isPastEvent(single('2026-09-21'), justAfterMidnight)).toBe(true)
    expect(isPastEvent(single('2026-09-22'), justAfterMidnight)).toBe(false)
    const lateEvening = new Date(2026, 8, 22, 23, 55)
    expect(isPastEvent(single('2026-09-22'), lateEvening)).toBe(false)
  })

  describe('série récurrente', () => {
    it('sans borne de fin : jamais passée, même si la 1re occurrence l’est', () => {
      expect(
        isPastEvent({ ...single('2020-01-01'), isRecurring: true, recurrenceEndDate: null }, TODAY),
      ).toBe(false)
    })

    it('bornée dans le passé : passée', () => {
      expect(
        isPastEvent(
          { ...single('2025-01-01'), isRecurring: true, recurrenceEndDate: '2026-09-01' },
          TODAY,
        ),
      ).toBe(true)
    })

    it('bornée, dernière occurrence encore en cours (durée) : pas passée', () => {
      // 1re occurrence : 3 jours ; la dernière débute le 20 → finit le 22 (aujourd'hui).
      expect(
        isPastEvent(
          {
            startDate: '2026-01-20',
            endDate: '2026-01-22',
            isRecurring: true,
            recurrenceEndDate: '2026-09-20',
          },
          TODAY,
        ),
      ).toBe(false)
    })

    it('bornée dans le futur : pas passée', () => {
      expect(
        isPastEvent(
          { ...single('2025-01-01'), isRecurring: true, recurrenceEndDate: '2027-01-01' },
          TODAY,
        ),
      ).toBe(false)
    })
  })
})
