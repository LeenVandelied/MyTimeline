import { describe, expect, it } from 'vitest'
import {
  LANE_GAP_PX,
  LANE_ROW_PITCH_PX,
  MOBILE_MORE_BUTTON_PX,
  SINGLE_ROW_LAYOUT,
  laneExtraHeightPx,
  layoutLane,
  layoutLanes,
} from './lane-layout'
import { DEFAULT_METRICS } from './virtualization'
import { DAY_WIDTH_PX, PIN_FOOTPRINT_PX } from './zoom'

/** Événement minimal en repère piste. */
const evt = (id: string, leftPx: number, widthPx: number) => ({ id, leftPx, widthPx })

/** Barre de `days` jours commençant au jour `day`, à l'échelle `dayWidth`. */
const bar = (id: string, day: number, days: number, dayWidth: number) =>
  evt(id, day * dayWidth, Math.max(6, days * dayWidth))
/** Ponctuel au jour `day` : emprise constante (`PIN_FOOTPRINT_PX`). */
const pin = (
  id: string,
  day: number,
  dayWidth: number,
  footprint: number = PIN_FOOTPRINT_PX.desktop,
) => evt(id, day * dayWidth, footprint)

const desktop = { gapPx: LANE_GAP_PX.desktop }

describe('#709 layoutLane — empilage en rangées (maquette `layoutLane`)', () => {
  it('lane vide → une rangée (hauteur plancher), identité partagée', () => {
    expect(layoutLane([], desktop)).toBe(SINGLE_ROW_LAYOUT)
    expect(SINGLE_ROW_LAYOUT.rows).toBe(1)
  })

  it('deux événements qui se chevauchent → deux rangées', () => {
    const layout = layoutLane([bar('a', 0, 10, 12), bar('b', 5, 10, 12)], desktop)
    expect(layout.rows).toBe(2)
    expect(layout.rowOf).toEqual([0, 1])
    expect(layout.rowByEventId.get('b')).toBe(1)
  })

  it('chaque événement prend la PREMIÈRE rangée libre (pas la dernière ouverte)', () => {
    // a [0,120], b [60,180] → rangée 1 ; c [240,…] : rangée 0 libre (120+8 ≤ 240).
    const layout = layoutLane(
      [bar('a', 0, 10, 12), bar('b', 5, 10, 12), bar('c', 20, 2, 12)],
      desktop,
    )
    expect(layout.rowOf).toEqual([0, 1, 0])
    expect(layout.rows).toBe(2)
    expect(layout.lines).toEqual([[0, 2], [1]])
    expect(layout.posInRow).toEqual([0, 0, 1])
  })

  it('trie par date de début, quel que soit l’ordre d’entrée (API non triée)', () => {
    const layout = layoutLane([bar('late', 30, 2, 12), bar('early', 0, 40, 12)], desktop)
    // `early` est posé en premier (rangée 0) ; `late` le chevauche → rangée 1.
    expect(layout.rowByEventId.get('early')).toBe(0)
    expect(layout.rowByEventId.get('late')).toBe(1)
    expect(layout.lines).toEqual([[1], [0]])
  })

  it('début égal : l’ordre d’entrée départage (disposition déterministe)', () => {
    const layout = layoutLane([evt('x', 100, 50), evt('y', 100, 50)], desktop)
    expect(layout.rowOf).toEqual([0, 1])
  })

  it('le `gap` (8 px desktop) sépare deux événements CONTIGUS', () => {
    // a finit à 100 ; b commence à 107 (< 100 + 8) → rangée 1 ; à 108 → même rangée.
    expect(layoutLane([evt('a', 0, 100), evt('b', 107, 20)], desktop).rows).toBe(2)
    expect(layoutLane([evt('a', 0, 100), evt('b', 108, 20)], desktop).rows).toBe(1)
    // Mobile : 10 px.
    const mobile = { gapPx: LANE_GAP_PX.mobile }
    expect(layoutLane([evt('a', 0, 100), evt('b', 109, 20)], mobile).rows).toBe(2)
    expect(layoutLane([evt('a', 0, 100), evt('b', 110, 20)], mobile).rows).toBe(1)
  })

  it('un ponctuel RÉSERVE la place de son libellé (100 px desktop, 90 px mobile)', () => {
    // Deux pins à 8 jours d'écart au zoom Mois (12 px/j) = 96 px < 100 + 8 → 2 rangées.
    const dw = DAY_WIDTH_PX.month
    expect(layoutLane([pin('p', 0, dw), pin('q', 8, dw)], desktop).rows).toBe(2)
    // 9 jours = 108 px = 100 + 8 → une rangée.
    expect(layoutLane([pin('p', 0, dw), pin('q', 9, dw)], desktop).rows).toBe(1)
    // Mobile : 90 + 10 = 100 px ⇒ 9 jours (108 px) suffisent aussi, 8 (96 px) non.
    const mobile = { gapPx: LANE_GAP_PX.mobile }
    const mp = (id: string, day: number) => pin(id, day, dw, PIN_FOOTPRINT_PX.mobile)
    expect(layoutLane([mp('p', 0), mp('q', 8)], mobile).rows).toBe(2)
    expect(layoutLane([mp('p', 0), mp('q', 9)], mobile).rows).toBe(1)
  })

  it('DÉPEND DU ZOOM : même jeu d’événements, deux échelles → nombres de rangées différents', () => {
    const at = (dayWidth: number) => [
      bar('a', 0, 2, dayWidth),
      bar('b', 4, 2, dayWidth),
      pin('c', 12, dayWidth),
      pin('d', 30, dayWidth),
    ]
    // Zoom Jour (96 px/j) : tout tient sur UNE rangée.
    expect(layoutLane(at(DAY_WIDTH_PX.day), desktop).rows).toBe(1)
    // Zoom Année (2,2 px/j) : a [0,6] puis b à 8,8 px (< 6 + 8) → rangée 1 ; c (26,4 px,
    // réserve 100 px) reprend la rangée 0 ; d (66 px) ne tient plus derrière c → rangée 1.
    const year = layoutLane(at(DAY_WIDTH_PX.year), desktop)
    expect(year.rows).toBe(2)
    expect(year.rowOf).toEqual([0, 1, 0, 1])
  })

  it('mobile : le `⋯` qui suit chaque occurrence est réservé (`trailingPx`)', () => {
    const mobile = { gapPx: LANE_GAP_PX.mobile, trailingPx: MOBILE_MORE_BUTTON_PX }
    // a [0,100] + ⋯ 44 = 144 ; b à 150 (< 144 + 10) → 2e rangée, alors que sans le ⋯
    // il tiendrait sur la même.
    expect(layoutLane([evt('a', 0, 100), evt('b', 150, 20)], mobile).rows).toBe(2)
    expect(layoutLane([evt('a', 0, 100), evt('b', 150, 20)], { gapPx: 10 }).rows).toBe(1)
  })

  it('layoutLanes : une disposition par lane', () => {
    const map = layoutLanes(
      new Map([
        ['r1', [{ ...bar('a', 0, 10, 12) }, { ...bar('b', 2, 10, 12) }]],
        ['r2', [{ ...bar('c', 0, 10, 12) }]],
      ]) as never,
      desktop,
    )
    expect(map.get('r1')!.rows).toBe(2)
    expect(map.get('r2')!.rows).toBe(1)
  })
})

describe('cas limites (#748)', () => {
  it('widthPx = 0 : l’occurrence occupe un point ; un voisin dans le gap ouvre une rangée, au-delà il réutilise la rangée 0', () => {
    // a et b commencent tous deux à 100, largeur nulle : gap (8 px) non respecté → 2 rangées.
    const overlap = layoutLane([evt('a', 100, 0), evt('b', 100, 0)], desktop)
    expect(overlap.rows).toBe(2)
    expect(overlap.rowOf).toEqual([0, 1])

    // c commence à 108 (= fin de a 100 + gap 8) : rangée 0 libre.
    const reuse = layoutLane([evt('a', 100, 0), evt('c', 108, 0)], desktop)
    expect(reuse.rows).toBe(1)
    expect(reuse.rowOf).toEqual([0, 0])
  })

  it('leftPx négatif (événement commencé avant le début visible) : tri et « première rangée libre » tiennent', () => {
    // a commence avant 0 (fin à -50+100=50) ; b à 58 (= 50 + gap 8) tient sur la même rangée.
    const sameRow = layoutLane([evt('a', -50, 100), evt('b', 58, 20)], desktop)
    expect(sameRow.rows).toBe(1)
    expect(sameRow.rowOf).toEqual([0, 0])

    // b commence trop tôt (57 < 50 + 8) → 2e rangée.
    const overlap = layoutLane([evt('a', -50, 100), evt('b', 57, 20)], desktop)
    expect(overlap.rows).toBe(2)
    expect(overlap.rowOf).toEqual([0, 1])
  })

  it('deux occurrences strictement identiques (même position, même durée) : 2 rangées, ordre d’entrée conservé', () => {
    const layout = layoutLane([evt('x', 100, 50), evt('y', 100, 50)], desktop)
    expect(layout.rows).toBe(2)
    expect(layout.rowOf).toEqual([0, 1])
    expect(layout.rowByEventId.get('x')).toBe(0)
    expect(layout.rowByEventId.get('y')).toBe(1)
    // Cohérence lines/posInRow pour chaque événement : lines[rowOf[i]][posInRow[i]] === i.
    layout.rowOf.forEach((row, i) => {
      expect(layout.lines[row][layout.posInRow[i]]).toBe(i)
    })
  })
})

describe('#709 hauteur de lane (DEC-S97-003)', () => {
  /** Formule desktop de la maquette. */
  const maquetteDesktop = (rows: number) => Math.max(46, 10 * 2 + rows * 26 + (rows - 1) * 8)

  it.each([1, 2, 3, 4, 7])(
    'desktop, %i rangée(s) : base 46 + (rows − 1) × 34 = formule maquette',
    (rows) => {
      expect(DEFAULT_METRICS.laneHeight + laneExtraHeightPx(rows, LANE_ROW_PITCH_PX.desktop)).toBe(
        maquetteDesktop(rows),
      )
    },
  )

  it('une rangée n’ajoute rien (aucune lane mono-rangée ne bouge)', () => {
    expect(laneExtraHeightPx(1, LANE_ROW_PITCH_PX.portrait)).toBe(0)
    expect(laneExtraHeightPx(0, LANE_ROW_PITCH_PX.landscape)).toBe(0)
  })

  it('le pas d’une rangée dépasse la barre de sa vue (aucune barre ne chevauche la suivante)', () => {
    // Barres rendues : desktop 26, portrait 28, paysage 24 (`timeline.css`).
    expect(LANE_ROW_PITCH_PX.desktop).toBeGreaterThan(26)
    expect(LANE_ROW_PITCH_PX.portrait).toBeGreaterThan(28)
    expect(LANE_ROW_PITCH_PX.landscape).toBeGreaterThan(24)
  })
})

describe('#746 réserve du libellé extérieur (`labelTrailPx`)', () => {
  it('prolonge l’emprise d’une barre : la suivante qui tombait dans le libellé change de rangée', () => {
    const a = evt('a', 0, 60)
    const b = evt('b', 80, 40)
    expect(layoutLane([a, b], desktop).rows).toBe(1)
    expect(layoutLane([{ ...a, labelTrailPx: 60 }, b], desktop).rows).toBe(2)
  })

  it('s’ajoute AVANT le `⋯` mobile (`trailingPx`) et le gap', () => {
    const opts = { gapPx: LANE_GAP_PX.mobile, trailingPx: MOBILE_MORE_BUTTON_PX }
    const a = { ...evt('a', 0, 50), labelTrailPx: 20 }
    // Fin réservée = 50 + 20 + 44 = 114 ; + gap 10 = 124.
    expect(layoutLane([a, evt('b', 124, 10)], opts).rows).toBe(1)
    expect(layoutLane([a, evt('b', 123, 10)], opts).rows).toBe(2)
  })
})
