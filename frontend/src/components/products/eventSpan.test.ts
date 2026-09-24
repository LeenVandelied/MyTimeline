import { describe, expect, it } from 'vitest'
import { eventSpan, formatEventSpan } from './eventSpan'

/**
 * #664 — Plage de la sous-frise produit (maquette `Produits.dc.html` : « {début} – {fin} »
 * à droite de « Frise du produit »).
 *
 * PIT-S108-002 — `formatRange` insère des espaces fines (U+2009) et, en `fr`, une espace
 * insécable étroite (U+202F) : on NORMALISE avant de comparer à un littéral.
 */
const norm = (s: string | null) => s?.replace(/[\u2009\u202F\u00A0]/g, ' ') ?? null

const ev = (start: string, end?: string) => ({ start, end: end ?? start })

// Mercredi 23 septembre 2026.
const TODAY = new Date(2026, 8, 23, 12, 0, 0)

describe('#664 — eventSpan : premier début → dernière fin', () => {
  it('ordre quelconque : min des débuts, max des fins (une durée étend la fin)', () => {
    const span = eventSpan([
      ev('2026-08-20'),
      ev('2026-08-12', '2026-08-15'),
      ev('2026-09-01', '2026-09-03'),
    ])
    expect(span?.from).toEqual(new Date(2026, 7, 12))
    expect(span?.to).toEqual(new Date(2026, 8, 3))
  })

  it('`end` vide → le début (même règle que `computeRange` de la frise)', () => {
    const span = eventSpan([{ start: '2026-08-12', end: '' }])
    expect(span?.from).toEqual(new Date(2026, 7, 12))
    expect(span?.to).toEqual(new Date(2026, 7, 12))
  })

  it('date illisible ignorée ; fin illisible → le début', () => {
    const span = eventSpan([ev('pas-une-date'), ev('2026-08-12', 'nope'), ev('2026-08-10')])
    expect(span?.from).toEqual(new Date(2026, 7, 10))
    expect(span?.to).toEqual(new Date(2026, 7, 12))
  })

  it('aucun événement exploitable → null', () => {
    expect(eventSpan([])).toBeNull()
    expect(eventSpan([ev('pas-une-date')])).toBeNull()
  })
})

describe('#664 — formatEventSpan : format court de la locale', () => {
  it('même année que `today` : jour + mois, sans année (maquette « 12 AOÛ »)', () => {
    expect(norm(formatEventSpan([ev('2026-08-12'), ev('2026-09-03')], 'fr', TODAY))).toBe(
      '12 août – 3 sept.',
    )
    expect(norm(formatEventSpan([ev('2026-08-12'), ev('2026-09-03')], 'de', TODAY))).toBe(
      '12. Aug. – 3. Sept.',
    )
  })

  it('même mois : `formatRange` fusionne le mois commun', () => {
    expect(norm(formatEventSpan([ev('2026-10-03'), ev('2026-10-12')], 'fr', TODAY))).toMatch(
      /^3 ?– ?12 oct\.$/,
    )
  })

  it('un seul jour : une date SEULE, pas « 12 août – 12 août »', () => {
    expect(norm(formatEventSpan([ev('2026-08-12')], 'fr', TODAY))).toBe('12 août')
  })

  it('une borne hors de l’année courante : l’année apparaît (sinon « déc. – janv. » est ambigu)', () => {
    expect(norm(formatEventSpan([ev('2026-12-12'), ev('2027-01-03')], 'fr', TODAY))).toBe(
      '12 déc. 2026 – 3 janv. 2027',
    )
    // Début l'an DERNIER, fin cette année : l'année s'affiche aussi (borne de gauche).
    expect(norm(formatEventSpan([ev('2025-12-12'), ev('2026-01-03')], 'fr', TODAY))).toBe(
      '12 déc. 2025 – 3 janv. 2026',
    )
    // Plage entièrement passée, autre année : année fusionnée en fin.
    expect(norm(formatEventSpan([ev('2024-03-05'), ev('2024-06-20')], 'fr', TODAY))).toBe(
      '5 mars – 20 juin 2024',
    )
  })

  it('rien à tracer → null (le parent n’affiche alors aucune plage)', () => {
    expect(formatEventSpan([], 'fr', TODAY)).toBeNull()
  })
})
