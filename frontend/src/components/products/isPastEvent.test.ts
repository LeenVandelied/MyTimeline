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
        isPastEvent(
          {
            ...single('2020-01-01'),
            isRecurring: true,
            recurrenceUnit: 'MONTH',
            recurrenceEndDate: null,
          },
          TODAY,
        ),
      ).toBe(false)
    })

    it('bornée dans le passé : passée', () => {
      expect(
        isPastEvent(
          {
            ...single('2025-01-01'),
            isRecurring: true,
            recurrenceUnit: 'MONTH',
            recurrenceEndDate: '2026-09-01',
          },
          TODAY,
        ),
      ).toBe(true)
    })

    it('bornée dans le futur : pas passée', () => {
      expect(
        isPastEvent(
          {
            ...single('2025-01-01'),
            isRecurring: true,
            recurrenceUnit: 'YEAR',
            recurrenceEndDate: '2027-01-01',
          },
          TODAY,
        ),
      ).toBe(false)
    })

    it('`isRecurring` sans unité : traitée comme un ponctuel (comme `nextStart`)', () => {
      expect(
        isPastEvent(
          { ...single('2026-09-01'), isRecurring: true, recurrenceEndDate: '2027-01-01' },
          TODAY,
        ),
      ).toBe(true)
    })

    // Correctif review S106 — `recurrenceEndDate` est un HORIZON (BR-EVE-012), pas le
    // début de la dernière occurrence : la borne peut tomber HORS cadence.
    describe('borne hors cadence (horizon, BR-EVE-012)', () => {
      it('WEEK lundi, borne un mercredi à venir : dernière occurrence lundi 21 → passée', () => {
        // Occurrences 31/08, 07/09, 14/09, 21/09 ; le 28/09 dépasse la borne du 23/09.
        // L'ancienne lecture (dernier début = 23/09) la disait encore à venir.
        expect(
          isPastEvent(
            {
              ...single('2026-08-31'),
              isRecurring: true,
              recurrenceUnit: 'WEEK',
              recurrenceEndDate: '2026-09-23',
            },
            TODAY,
          ),
        ).toBe(true)
      })

      it('WEEK de 3 jours, même borne : la dernière occurrence (21 → 23/09) est en cours', () => {
        expect(
          isPastEvent(
            {
              startDate: '2026-08-31',
              endDate: '2026-09-02',
              isRecurring: true,
              recurrenceUnit: 'WEEK',
              recurrenceEndDate: '2026-09-23',
            },
            TODAY,
          ),
        ).toBe(false)
      })

      it('MONTH « tous les 31 », borne le 29/09 : dernière occurrence le 31/08 → passée', () => {
        expect(
          isPastEvent(
            {
              ...single('2026-01-31'),
              isRecurring: true,
              recurrenceUnit: 'MONTH',
              recurrenceEndDate: '2026-09-29',
            },
            TODAY,
          ),
        ).toBe(true)
      })

      it('MONTH « tous les 31 », borne le 30/09 : occurrence clampée au 30/09 → pas passée', () => {
        expect(
          isPastEvent(
            {
              ...single('2026-01-31'),
              isRecurring: true,
              recurrenceUnit: 'MONTH',
              recurrenceEndDate: '2026-09-30',
            },
            TODAY,
          ),
        ).toBe(false)
      })

      it('MONTH 31 → mois court : l’occurrence clampée au 28/02 compte (pas passée ce jour-là)', () => {
        // Sans clamp, le 31/01 + 1 mois déborderait au 03/03 (> borne) et la dernière
        // occurrence serait le 31/01 → « passée » à tort le 28/02.
        const feb28 = new Date(2026, 1, 28, 10, 0)
        const series = {
          ...single('2026-01-31'),
          isRecurring: true,
          recurrenceUnit: 'MONTH' as const,
          recurrenceEndDate: '2026-02-28',
        }
        expect(isPastEvent(series, feb28)).toBe(false)
        expect(isPastEvent(series, new Date(2026, 2, 1, 10, 0))).toBe(true)
      })

      it('YEAR, borne hors cadence : dernière occurrence = dernier anniversaire <= borne', () => {
        // 10/03/2024, 10/03/2025, 10/03/2026 ; borne 01/09/2026 → dernière le 10/03/2026.
        expect(
          isPastEvent(
            {
              ...single('2024-03-10'),
              isRecurring: true,
              recurrenceUnit: 'YEAR',
              recurrenceEndDate: '2026-09-01',
            },
            TODAY,
          ),
        ).toBe(true)
      })
    })
  })
})
