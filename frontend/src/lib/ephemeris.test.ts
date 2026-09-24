import { describe, expect, it } from 'vitest'

import { ephemerisParts, isoWeekNumber } from './ephemeris'

/**
 * #627 — Feuillet d'éphéméride du 404. Dates construites par composantes LOCALES
 * (`new Date(y, m, d)`) : le helper lit le jour civil local, les assertions ne
 * dépendent donc pas du fuseau de la machine qui joue les tests.
 */
describe('isoWeekNumber — semaine ISO 8601', () => {
  it.each([
    // 1er janvier en semaine 53 de l'année précédente (vendredi / samedi / dimanche).
    [new Date(2021, 0, 1), 53], // vendredi
    [new Date(2022, 0, 1), 52], // samedi (2021 n'a que 52 semaines)
    [new Date(2027, 0, 3), 53], // dimanche (2026 a 53 semaines)
    // 1er janvier jeudi → semaine 1.
    [new Date(2026, 0, 1), 1],
    // 29-31 décembre déjà en semaine 1 de l'année suivante.
    [new Date(2025, 11, 29), 1], // lundi
    [new Date(2025, 11, 31), 1], // mercredi
    [new Date(2024, 11, 30), 1], // lundi
    // 31 décembre resté en semaine 53.
    [new Date(2026, 11, 31), 53], // jeudi
    // Milieu d'année / passage à l'heure d'été (dernier dimanche de mars).
    [new Date(2026, 2, 29), 13],
    [new Date(2026, 2, 30), 14],
    [new Date(2026, 8, 24), 39],
  ])('%s → semaine %i', (date, expected) => {
    expect(isoWeekNumber(date)).toBe(expected)
  })

  it("ignore l'heure : minuit et 23 h 59 du même jour ont la même semaine", () => {
    expect(isoWeekNumber(new Date(2026, 0, 4, 0, 0))).toBe(1)
    expect(isoWeekNumber(new Date(2026, 0, 4, 23, 59))).toBe(1)
    expect(isoWeekNumber(new Date(2026, 0, 5, 0, 0))).toBe(2)
  })
})

describe('ephemerisParts — libellés localisés', () => {
  const date = new Date(2026, 0, 1) // jeudi 1er janvier 2026, semaine 1

  it.each([
    ['fr', { weekday: 'jeudi', day: '01', month: 'janvier', year: '2026', isoWeek: 1 }],
    ['en', { weekday: 'Thursday', day: '01', month: 'January', year: '2026', isoWeek: 1 }],
    ['es', { weekday: 'jueves', day: '01', month: 'enero', year: '2026', isoWeek: 1 }],
    ['de', { weekday: 'Donnerstag', day: '01', month: 'Januar', year: '2026', isoWeek: 1 }],
  ])('%s', (locale, expected) => {
    expect(ephemerisParts(date, locale)).toEqual(expected)
  })

  it('jour sur 2 chiffres, sans capitales imposées (le CSS s’en charge)', () => {
    const parts = ephemerisParts(new Date(2026, 8, 24), 'fr')
    expect(parts).toEqual({
      weekday: 'jeudi',
      day: '24',
      month: 'septembre',
      year: '2026',
      isoWeek: 39,
    })
  })
})
