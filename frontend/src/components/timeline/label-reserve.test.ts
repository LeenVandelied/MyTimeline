import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { LANE_GAP_PX, MOBILE_MORE_BUTTON_PX, layoutLane } from './lane-layout'
import {
  LABEL_CHAR_WIDTH_PX,
  LABEL_MAX_WIDTH_PX,
  OUTSIDE_LABEL_GAP_PX,
  OUTSIDE_LABEL_PADDING_PX,
  PIN_LABEL_OFFSET_PX,
  RECURRENCE_PREFIX_CHARS,
  applyLabelReserves,
  estimateLabelWidthPx,
  outsideLabelMaxPx,
  outsideLabelTrailPx,
  pinFootprintPx,
  pinLabelMaxPx,
} from './label-reserve'
import { PIN_FOOTPRINT_PX, positionEvents, type PositionedEvent } from './zoom'

/** Titre « allemand long » (44 caractères) : dépasse l'emprise historique de 100 px. */
const LONG_DE = 'Kfz-Haftpflichtversicherungsbeitragserhöhung'
const SHORT = 'Garantie'
/** Titre moyen (23 caractères) : au-delà du plancher, en deçà du plafond. */
const MID = 'Steuererklärung abgeben'

describe('#746 estimation de largeur de libellé (pure, sans DOM)', () => {
  it('nombre de caractères × chasse moyenne de la vue, arrondi au pixel supérieur', () => {
    expect(estimateLabelWidthPx(SHORT, false, 'desktop')).toBe(
      Math.ceil(8 * LABEL_CHAR_WIDTH_PX.desktop),
    )
    expect(estimateLabelWidthPx(SHORT, false, 'mobile')).toBe(
      Math.ceil(8 * LABEL_CHAR_WIDTH_PX.mobile),
    )
  })

  it('le glyphe de série `↻ ` est compté', () => {
    expect(estimateLabelWidthPx(SHORT, true, 'desktop')).toBe(
      Math.ceil((8 + RECURRENCE_PREFIX_CHARS) * LABEL_CHAR_WIDTH_PX.desktop),
    )
  })

  it('compte les points de code (un emoji = un caractère)', () => {
    expect(estimateLabelWidthPx('🦷', false, 'desktop')).toBe(
      Math.ceil(LABEL_CHAR_WIDTH_PX.desktop),
    )
  })

  it('déterministe : même entrée, même sortie', () => {
    expect(estimateLabelWidthPx(LONG_DE, true, 'mobile')).toBe(
      estimateLabelWidthPx(LONG_DE, true, 'mobile'),
    )
  })
})

describe('#746 emprise d’un ponctuel', () => {
  it('libellé court : PLANCHER = emprise historique (100 desktop / 90 mobile)', () => {
    expect(pinFootprintPx(SHORT, false, 'desktop')).toBe(PIN_FOOTPRINT_PX.desktop)
    expect(pinFootprintPx(SHORT, false, 'mobile')).toBe(PIN_FOOTPRINT_PX.mobile)
    expect(pinFootprintPx('', false, 'desktop')).toBe(PIN_FOOTPRINT_PX.desktop)
  })

  it('libellé moyen : décalage de départ (x + 11) + largeur estimée', () => {
    const footprint = pinFootprintPx(MID, false, 'desktop')
    expect(PIN_LABEL_OFFSET_PX).toBe(11)
    expect(footprint).toBe(11 + Math.ceil(23 * LABEL_CHAR_WIDTH_PX.desktop))
    expect(footprint).toBeGreaterThan(PIN_FOOTPRINT_PX.desktop)
    expect(footprint).toBeLessThan(PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)
  })

  it('libellé allemand long (44 car.) : plafonné, le CSS coupe le reste', () => {
    expect(pinFootprintPx(LONG_DE, false, 'desktop')).toBe(PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)
  })

  it('récurrent : le préfixe `↻ ` élargit l’emprise', () => {
    const title = 'Contrôle technique'
    expect(pinFootprintPx(title, true, 'desktop')).toBeGreaterThan(
      pinFootprintPx(title, false, 'desktop'),
    )
  })

  it('PLAFOND : 11 + 240 px, quelle que soit la longueur', () => {
    const huge = 'x'.repeat(200)
    expect(pinFootprintPx(huge, true, 'desktop')).toBe(PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)
    expect(pinFootprintPx(huge, false, 'mobile')).toBe(PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)
  })

  it('largeur max du libellé = emprise − décalage (le libellé finit AU bord réservé)', () => {
    expect(pinLabelMaxPx(100)).toBe(89)
    expect(pinLabelMaxPx(PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)).toBe(LABEL_MAX_WIDTH_PX)
    expect(pinLabelMaxPx(5)).toBe(0)
  })
})

describe('#746 emprise du libellé extérieur de secours', () => {
  it('écart 6 px + boîte (padding 8 + texte estimé)', () => {
    expect(outsideLabelTrailPx(SHORT, false)).toBe(
      OUTSIDE_LABEL_GAP_PX + OUTSIDE_LABEL_PADDING_PX + Math.ceil(8 * LABEL_CHAR_WIDTH_PX.desktop),
    )
    expect(outsideLabelTrailPx(SHORT, true)).toBeGreaterThan(outsideLabelTrailPx(SHORT, false))
  })

  it('boîte plafonnée à 240 px ; max-width CSS = emprise − écart', () => {
    const trail = outsideLabelTrailPx('x'.repeat(200), false)
    expect(trail).toBe(OUTSIDE_LABEL_GAP_PX + LABEL_MAX_WIDTH_PX)
    expect(outsideLabelMaxPx(trail)).toBe(LABEL_MAX_WIDTH_PX)
  })
})

function fcEvent(
  id: string,
  start: string,
  end: string,
  over: { type?: 'single' | 'duration'; color?: string; recurring?: boolean; title?: string } = {},
): FullCalendarEvent {
  return {
    id,
    title: over.title ?? id,
    start,
    end,
    allDay: true,
    resourceId: 'r1',
    color: over.color ?? '#1D4ED8',
    extendedProps: {
      productId: 'r1',
      productName: 'P',
      category: 'C',
      type: over.type ?? 'duration',
      ...(over.recurring ? { isRecurring: true, recurrenceUnit: 'MONTH' } : {}),
    },
  }
}

const rangeStart = new Date(2026, 6, 1)
const now = new Date(2026, 6, 1)

describe('#746 applyLabelReserves', () => {
  const place = (events: FullCalendarEvent[], view: 'desktop' | 'mobile') => {
    const floor = view === 'desktop' ? PIN_FOOTPRINT_PX.desktop : PIN_FOOTPRINT_PX.mobile
    return applyLabelReserves(positionEvents(events, rangeStart, 12, now, 6, floor), view).get(
      'r1',
    )!
  }

  it('pin à titre long : `widthPx` élargi ; pin court : objet INCHANGÉ (identité gardée)', () => {
    const shortPin = fcEvent('s', '2026-07-05', '2026-07-05', { type: 'single', title: SHORT })
    const longPin = fcEvent('l', '2026-07-05', '2026-07-05', { type: 'single', title: LONG_DE })
    const scaled = positionEvents([shortPin, longPin], rangeStart, 12, now).get('r1')!
    const [s, l] = applyLabelReserves(new Map([['r1', scaled]]), 'desktop').get('r1')!
    expect(s).toBe(scaled[0])
    expect(l.widthPx).toBe(pinFootprintPx(LONG_DE, false, 'desktop'))
  })

  it('barre : `widthPx` (largeur PEINTE) jamais touché', () => {
    const lowContrast = fcEvent('b', '2026-07-05', '2026-07-10', { color: '#787878' })
    const [b] = place([lowContrast], 'desktop')
    expect(b.widthPx).toBe(5 * 12)
  })

  it('barre à faible contraste (desktop) : `labelTrailPx` = emprise du libellé extérieur', () => {
    const lowContrast = fcEvent('b', '2026-07-05', '2026-07-10', {
      color: '#787878',
      recurring: true,
      title: LONG_DE,
    })
    const [b] = place([lowContrast], 'desktop')
    expect(b.labelTrailPx).toBe(outsideLabelTrailPx(LONG_DE, true))
  })

  it('barre lisible dedans : aucune réserve ; mobile : jamais de libellé extérieur', () => {
    const readable = fcEvent('r', '2026-07-05', '2026-07-10', { color: '#1D4ED8' })
    const lowContrast = fcEvent('b', '2026-07-05', '2026-07-10', { color: '#787878' })
    expect(place([readable], 'desktop')[0].labelTrailPx).toBeUndefined()
    expect(place([lowContrast], 'mobile')[0].labelTrailPx).toBeUndefined()
  })

  it('mobile : police 12,5 px et plancher 90 px', () => {
    const longPin = fcEvent('l', '2026-07-05', '2026-07-05', { type: 'single', title: LONG_DE })
    const shortPin = fcEvent('s', '2026-07-05', '2026-07-05', { type: 'single', title: SHORT })
    const [l, s] = place([longPin, shortPin], 'mobile')
    expect(l.widthPx).toBe(pinFootprintPx(LONG_DE, false, 'mobile'))
    expect(s.widthPx).toBe(90)
  })
})

describe('#746 layoutLane consomme les réserves de libellé', () => {
  /** Pin à J+4 puis barre à J+13 (108 px plus loin au zoom Mois, 12 px/j). */
  const lane = (pinTitle: string, view: 'desktop' | 'mobile') => {
    const floor = view === 'desktop' ? PIN_FOOTPRINT_PX.desktop : PIN_FOOTPRINT_PX.mobile
    return applyLabelReserves(
      positionEvents(
        [
          fcEvent('pin', '2026-07-05', '2026-07-05', { type: 'single', title: pinTitle }),
          fcEvent('next', '2026-07-14', '2026-07-16'),
        ],
        rangeStart,
        12,
        now,
        6,
        floor,
      ),
      view,
    ).get('r1')!
  }

  it('desktop : un titre court tient sur une rangée, un titre long en ouvre une seconde', () => {
    const opts = { gapPx: LANE_GAP_PX.desktop }
    expect(layoutLane(lane(SHORT, 'desktop'), opts).rows).toBe(1)
    expect(layoutLane(lane(LONG_DE, 'desktop'), opts).rows).toBe(2)
  })

  it('mobile (avec le `⋯` réservé) : même bascule', () => {
    const opts = { gapPx: LANE_GAP_PX.mobile, trailingPx: MOBILE_MORE_BUTTON_PX }
    // 108 px < 90 + 44 + 10 : déjà deux rangées au zoom Mois ; on écarte à J+20 (192 px).
    const spaced = (title: string) =>
      applyLabelReserves(
        positionEvents(
          [
            fcEvent('pin', '2026-07-05', '2026-07-05', { type: 'single', title }),
            fcEvent('next', '2026-07-21', '2026-07-23'),
          ],
          rangeStart,
          12,
          now,
          6,
          PIN_FOOTPRINT_PX.mobile,
        ),
        'mobile',
      ).get('r1')!
    expect(layoutLane(spaced(SHORT), opts).rows).toBe(1)
    expect(layoutLane(spaced(LONG_DE), opts).rows).toBe(2)
  })

  it('libellé extérieur : la barre à faible contraste suivie de près ouvre une rangée', () => {
    const opts = { gapPx: LANE_GAP_PX.desktop }
    const events = (color: string): PositionedEvent[] =>
      applyLabelReserves(
        positionEvents(
          [
            fcEvent('bar', '2026-07-05', '2026-07-08', {
              color,
              title: 'Renouvellement assurance',
            }),
            // Barre J+4 → J+7 : fin à 84 px ; suivante à J+10 = 120 px, 36 px plus loin.
            fcEvent('next', '2026-07-11', '2026-07-13'),
          ],
          rangeStart,
          12,
          now,
        ),
        'desktop',
      ).get('r1')!
    expect(layoutLane(events('#1D4ED8'), opts).rows).toBe(1)
    expect(layoutLane(events('#787878'), opts).rows).toBe(2)
  })
})
