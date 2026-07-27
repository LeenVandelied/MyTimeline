import { describe, expect, it } from 'vitest'

import {
  MIN_BAR_WIDTH_PERCENT,
  PREVIEW_COLUMNS,
  addDurationUnits,
  addMonths,
  buildPreviewModel,
  nextOccurrenceStart,
  parseLocalIsoDate,
} from './previewTimeline'

/**
 * #315 — Géométrie de la mini-frise d'aperçu (handoff §6). Fonctions pures :
 * tests déterministes (`now` injecté), aucun DOM.
 *
 * Couvre les miroirs client des règles backend : BR-EVE-003 (fin dérivée du
 * type/durée), BR-EVE-005 (début par défaut = aujourd'hui), BR-EVE-006 (pas de
 * fantôme sans `recurrenceUnit`).
 */

const NOW = new Date(2026, 4, 10) // 10 mai 2026, minuit local

describe('previewTimeline — helpers de dates', () => {
  it('parse une date de formulaire en LOCAL (pas en UTC)', () => {
    const parsed = parseLocalIsoDate('2026-05-01')
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(4)
    // Le piège UTC ferait tomber le 30 avril pour les fuseaux UTC−.
    expect(parsed?.getDate()).toBe(1)
  })

  it('retourne null sur une valeur vide ou malformée', () => {
    expect(parseLocalIsoDate(undefined)).toBeNull()
    expect(parseLocalIsoDate(null)).toBeNull()
    expect(parseLocalIsoDate('')).toBeNull()
    expect(parseLocalIsoDate('01/05/2026')).toBeNull()
  })

  it('clampe la fin de mois comme java.time.plusMonths (31 janv. + 1 mois = 28 févr.)', () => {
    const clamped = addMonths(new Date(2026, 0, 31), 1)
    expect(clamped.getMonth()).toBe(1)
    expect(clamped.getDate()).toBe(28)
  })

  it('ajoute les unités de DURÉE minuscules (BR-EVE-003)', () => {
    const start = new Date(2026, 4, 1)
    expect(addDurationUnits(start, 3, 'days').getDate()).toBe(4)
    expect(addDurationUnits(start, 2, 'weeks').getDate()).toBe(15)
    expect(addDurationUnits(start, 2, 'months').getMonth()).toBe(6)
    expect(addDurationUnits(start, 1, 'years').getFullYear()).toBe(2027)
  })

  it('avance la récurrence sur l’enum MAJUSCULE (BR-EVE-006)', () => {
    const start = new Date(2026, 4, 1)
    expect(nextOccurrenceStart(start, 'WEEK').getDate()).toBe(8)
    expect(nextOccurrenceStart(start, 'MONTH').getMonth()).toBe(5)
    expect(nextOccurrenceStart(start, 'YEAR').getFullYear()).toBe(2027)
  })
})

describe('previewTimeline — buildPreviewModel', () => {
  it('produit une règle de PREVIEW_COLUMNS graduations croissantes calées sur la fenêtre', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      type: 'duration',
      durationValue: 5,
      durationUnit: 'days',
      now: NOW,
    })

    expect(model.ticks).toHaveLength(PREVIEW_COLUMNS)
    expect(model.ticks[0].getTime()).toBe(model.windowStart.getTime())
    for (let i = 1; i < model.ticks.length; i += 1) {
      expect(model.ticks[i].getTime()).toBeGreaterThan(model.ticks[i - 1].getTime())
    }
    expect(model.windowEnd.getTime()).toBeGreaterThan(model.ticks[PREVIEW_COLUMNS - 1].getTime())
  })

  it('place TODAY dans la fenêtre, même quand l’événement est loin devant', () => {
    const model = buildPreviewModel({
      startDate: '2026-08-01',
      type: 'single',
      now: NOW,
    })

    expect(model.todayPercent).not.toBeNull()
    expect(model.todayPercent!).toBeGreaterThanOrEqual(0)
    expect(model.todayPercent!).toBeLessThanOrEqual(100)
    expect(model.todayPercent!).toBeLessThan(model.main.leftPercent)
  })

  it('dérive la fin de la DURÉE quand type=duration (BR-EVE-003)', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      // `endDate` incohérente : le backend la recalcule, l’aperçu doit l’ignorer.
      endDate: '2026-12-31',
      type: 'duration',
      durationValue: 2,
      durationUnit: 'weeks',
      now: NOW,
    })

    expect(model.main.end.getMonth()).toBe(4)
    expect(model.main.end.getDate()).toBe(26)
  })

  it('rend un événement ponctuel visible malgré sa largeur nulle', () => {
    const model = buildPreviewModel({ startDate: '2026-05-12', type: 'single', now: NOW })

    expect(model.main.end.getTime()).toBe(model.main.start.getTime())
    expect(model.main.widthPercent).toBeGreaterThanOrEqual(MIN_BAR_WIDTH_PERCENT)
  })

  it('défaut startDate = aujourd’hui quand la date est absente (BR-EVE-005)', () => {
    const model = buildPreviewModel({ type: 'single', now: NOW })

    expect(model.main.start.getTime()).toBe(new Date(2026, 4, 10).getTime())
    expect(model.nextOccurrence.getTime()).toBe(model.main.start.getTime())
  })

  it('récurrent : occurrence fantôme + connecteur pointillé après l’occurrence pleine', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      type: 'duration',
      durationValue: 3,
      durationUnit: 'days',
      isRecurring: true,
      recurrenceUnit: 'MONTH',
      now: NOW,
    })

    expect(model.ghost).not.toBeNull()
    expect(model.ghost!.start.getMonth()).toBe(5)
    expect(model.ghost!.start.getDate()).toBe(12)
    // Le fantôme dure autant que l’occurrence pleine.
    expect(model.ghost!.end.getDate()).toBe(15)
    expect(model.ghost!.leftPercent).toBeGreaterThan(model.main.leftPercent)
    expect(model.connector).not.toBeNull()
    expect(model.connector!.widthPercent).toBeGreaterThan(0)
    expect(model.connector!.leftPercent).toBeGreaterThan(model.main.leftPercent)
    // La légende « prochaine occurrence » pointe le fantôme.
    expect(model.nextOccurrence.getTime()).toBe(model.ghost!.start.getTime())
  })

  it('pas de fantôme si isRecurring sans recurrenceUnit (BR-EVE-006)', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      type: 'single',
      isRecurring: true,
      recurrenceUnit: null,
      now: NOW,
    })

    expect(model.ghost).toBeNull()
    expect(model.connector).toBeNull()
  })

  it('pas de connecteur quand la durée recouvre la période de récurrence', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      type: 'duration',
      durationValue: 2,
      durationUnit: 'months',
      isRecurring: true,
      recurrenceUnit: 'WEEK',
      now: NOW,
    })

    expect(model.ghost).not.toBeNull()
    expect(model.connector).toBeNull()
  })

  it('borne toutes les positions dans [0,100]', () => {
    const model = buildPreviewModel({
      startDate: '2026-05-12',
      type: 'duration',
      durationValue: 18,
      durationUnit: 'months',
      isRecurring: true,
      recurrenceUnit: 'YEAR',
      now: NOW,
    })

    const positions = [
      model.main.leftPercent,
      model.main.leftPercent + model.main.widthPercent,
      model.ghost!.leftPercent,
      model.todayPercent!,
    ]
    positions.forEach((position) => {
      expect(position).toBeGreaterThanOrEqual(0)
      expect(position).toBeLessThanOrEqual(100)
    })
  })
})
