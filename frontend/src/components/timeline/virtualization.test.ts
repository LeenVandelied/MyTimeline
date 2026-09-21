import { describe, expect, it } from 'vitest'
import type { Resource } from './lib'
import type { PositionedEvent } from './zoom'
import {
  DEFAULT_METRICS,
  UNBOUNDED_BAND,
  bandCovers,
  buildVerticalModel,
  expandBand,
  isUnboundedBand,
  segmentIntersectsBand,
  windowEvents,
  windowLanes,
  uniformLaneOffsets,
  laneOffsets,
} from './virtualization'

/**
 * #69 — Cœur pur de la virtualisation. Ces tests verrouillent les INVARIANTS
 * dont dépendent l'a11y et la navigation clavier :
 *  - un événement à cheval sur la bordure de fenêtre reste monté ;
 *  - l'index d'origine est conservé (coordonnée clavier #81) ;
 *  - les cales compensent EXACTEMENT les lanes démontées (hauteur invariante).
 */

function evt(id: string, leftPx: number, widthPx: number): PositionedEvent {
  return {
    id,
    title: id,
    start: '2026-07-10',
    end: '2026-07-11',
    allDay: true,
    resourceId: 'p1',
    leftPx,
    widthPx,
    status: 'upcoming',
  } as PositionedEvent
}

describe('#594 fenêtrage d’un ponctuel (pin)', () => {
  const pin = (id: string, leftPx: number): PositionedEvent =>
    ({
      ...evt(id, leftPx, 100),
      extendedProps: { productId: 'p1', productName: 'P', category: 'C', type: 'single' },
    }) as PositionedEvent

  it('reste monté quand SEUL son libellé (emprise réservée) croise la bande', () => {
    // Date à 150, emprise [145, 250] ; la bande commence à 200 : le pin est hors
    // bande, son libellé non → il ne doit pas être démonté.
    expect(windowEvents([pin('p', 150)], { start: 200, end: 400 })).toHaveLength(1)
  })

  it('reste monté quand seule sa DEMI-LARGEUR gauche croise la bande', () => {
    // Date à 403 : le pin est peint dès 398, dans une bande qui s'arrête à 400.
    expect(windowEvents([pin('p', 403)], { start: 0, end: 400 })).toHaveLength(1)
    // Une barre ancrée au même endroit commence à la date : hors bande.
    expect(windowEvents([evt('b', 403, 100)], { start: 0, end: 400 })).toHaveLength(0)
  })
})

describe('#69 bandes', () => {
  it('UNBOUNDED_BAND est reconnue et n’est pas élargie', () => {
    expect(isUnboundedBand(UNBOUNDED_BAND)).toBe(true)
    expect(expandBand(UNBOUNDED_BAND, 600)).toEqual(UNBOUNDED_BAND)
    expect(expandBand({ start: 100, end: 200 }, 50)).toEqual({ start: 50, end: 250 })
  })

  it('bandCovers = test d’hystérésis (pas de re-rendu tant que la vue reste dedans)', () => {
    const rendered = { start: 0, end: 1000 }
    expect(bandCovers(rendered, { start: 100, end: 900 })).toBe(true)
    expect(bandCovers(rendered, { start: 100, end: 1001 })).toBe(false)
    expect(bandCovers(rendered, { start: -1, end: 900 })).toBe(false)
  })

  it('segmentIntersectsBand inclut les segments à cheval sur les bornes', () => {
    const band = { start: 100, end: 200 }
    expect(segmentIntersectsBand(50, 60, band)).toBe(true) // déborde à gauche
    expect(segmentIntersectsBand(190, 60, band)).toBe(true) // déborde à droite
    expect(segmentIntersectsBand(120, 10, band)).toBe(true) // dedans
    expect(segmentIntersectsBand(0, 50, band)).toBe(false)
    expect(segmentIntersectsBand(300, 50, band)).toBe(false)
  })
})

describe('#69 fenêtrage horizontal des événements', () => {
  const events = [evt('a', 0, 50), evt('b', 500, 20), evt('c', 980, 40), evt('d', 2000, 10)]

  it('ne garde que les événements croisant la bande, index d’origine PRÉSERVÉ', () => {
    const windowed = windowEvents(events, { start: 400, end: 1000 })
    expect(windowed.map((w) => w.event.id)).toEqual(['b', 'c'])
    // Invariant #81 : l'index reste celui de la lane COMPLÈTE (1 et 2), pas 0 et 1.
    expect(windowed.map((w) => w.index)).toEqual([1, 2])
  })

  it('bande non bornée → tout est rendu (garde-fou jsdom)', () => {
    const windowed = windowEvents(events, UNBOUNDED_BAND)
    expect(windowed).toHaveLength(4)
    expect(windowed.map((w) => w.index)).toEqual([0, 1, 2, 3])
  })
})

describe('#69 fenêtrage vertical des lanes', () => {
  it('sélectionne la tranche visible et compense EXACTEMENT avec des cales', () => {
    // 100 lanes de 46px à partir de 44px : la fenêtre [1000, 1400] couvre les
    // lanes d'index 20..29 (1000-44)/46 = 20,78 → floor 20 ; (1400-44)/46 = 29,5 → ceil 30.
    const win = windowLanes(uniformLaneOffsets(100, 46), 44, { start: 1000, end: 1400 })
    expect(win.startIndex).toBe(20)
    expect(win.endIndex).toBe(30)
    const rendered = win.endIndex - win.startIndex
    expect(win.topSpacerPx + rendered * 46 + win.bottomSpacerPx).toBe(100 * 46)
  })

  it('groupe entièrement au-dessus de la fenêtre → aucune lane, cale haute pleine', () => {
    const win = windowLanes(uniformLaneOffsets(10, 46), 0, { start: 5000, end: 6000 })
    expect(win.startIndex).toBe(10)
    expect(win.endIndex).toBe(10)
    expect(win.topSpacerPx).toBe(460)
    expect(win.bottomSpacerPx).toBe(0)
  })

  it('groupe entièrement en dessous de la fenêtre → aucune lane, cale basse pleine', () => {
    const win = windowLanes(uniformLaneOffsets(10, 46), 5000, { start: 0, end: 800 })
    expect(win.startIndex).toBe(0)
    expect(win.endIndex).toBe(0)
    expect(win.topSpacerPx).toBe(0)
    expect(win.bottomSpacerPx).toBe(460)
  })

  it('bande non bornée ou hauteur inconnue → toutes les lanes, aucune cale', () => {
    expect(windowLanes(uniformLaneOffsets(10, 46), 0, UNBOUNDED_BAND)).toEqual({
      startIndex: 0,
      endIndex: 10,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
    })
    expect(windowLanes(uniformLaneOffsets(10, 0), 0, { start: 0, end: 100 }).endIndex).toBe(10)
  })
})

describe('#69 modèle vertical', () => {
  const resources: Resource[] = [
    { id: 'a1', title: 'A1', category: 'A' },
    { id: 'a2', title: 'A2', category: 'A' },
    { id: 'b1', title: 'B1', category: 'B' },
  ]
  const groups: Array<[string, Resource[]]> = [
    ['A', [resources[0], resources[1]]],
    ['B', [resources[2]]],
  ]

  it('empile règle, en-têtes et lanes dans l’ordre de rendu', () => {
    const model = buildVerticalModel(groups, {}, DEFAULT_METRICS)
    const { rulerHeight: R, headHeight: H, laneHeight: L } = DEFAULT_METRICS
    expect(model.listTops.A).toBe(R + H)
    expect(model.laneTops.get('a1')).toBe(R + H)
    expect(model.laneTops.get('a2')).toBe(R + H + L)
    expect(model.listTops.B).toBe(R + H + 2 * L + H)
    expect(model.laneTops.get('b1')).toBe(R + H + 2 * L + H)
    expect(model.totalHeight).toBe(R + H + 2 * L + H + L)
    expect(model.visibleLaneCount).toBe(3)
  })

  it('une catégorie repliée n’occupe que la hauteur de son en-tête', () => {
    const model = buildVerticalModel(groups, { A: true }, DEFAULT_METRICS)
    const { rulerHeight: R, headHeight: H, laneHeight: L } = DEFAULT_METRICS
    expect(model.laneTops.has('a1')).toBe(false)
    expect(model.listTops.B).toBe(R + 2 * H)
    expect(model.totalHeight).toBe(R + 2 * H + L)
    expect(model.visibleLaneCount).toBe(1)
  })
})

describe('#709 fenêtrage vertical à hauteurs VARIABLES (empilage en rangées)', () => {
  // Lanes : 46, 80 (2 rangées), 46, 114 (3 rangées), 46 → tops 0, 46, 126, 172, 286 ; total 332.
  const heights = [46, 80, 46, 114, 46]
  const offsets = laneOffsets(heights)

  it('sommes préfixées : top de chaque lane + hauteur totale', () => {
    expect(offsets).toEqual([0, 46, 126, 172, 286, 332])
  })

  it('monte exactement les lanes qui croisent la bande, cales exactes', () => {
    // Bande [100, 200] (liste à 0) : lane 1 [46,126), lane 2 [126,172), lane 3 [172,286).
    const win = windowLanes(offsets, 0, { start: 100, end: 200 })
    expect(win).toEqual({ startIndex: 1, endIndex: 4, topSpacerPx: 46, bottomSpacerPx: 46 })
    const rendered = heights.slice(win.startIndex, win.endIndex).reduce((a, b) => a + b, 0)
    expect(win.topSpacerPx + rendered + win.bottomSpacerPx).toBe(332)
  })

  it('une lane haute qui commence AVANT la bande et la couvre reste montée', () => {
    // Bande [200, 250] entièrement dans la lane 3 (3 rangées, [172, 286)).
    const win = windowLanes(offsets, 0, { start: 200, end: 250 })
    expect([win.startIndex, win.endIndex]).toEqual([3, 4])
  })

  it('bornes : lane qui finit pile au début de bande exclue, lane qui commence pile à la fin exclue', () => {
    const win = windowLanes(offsets, 0, { start: 126, end: 172 })
    expect([win.startIndex, win.endIndex]).toEqual([2, 3])
  })

  it('repère du rail : `listTopPx` décale la liste', () => {
    const win = windowLanes(offsets, 1000, { start: 1100, end: 1200 })
    expect([win.startIndex, win.endIndex]).toEqual([1, 4])
  })

  it('hauteurs uniformes : identique à l’ancien calcul floor/ceil (#69)', () => {
    for (const [start, end] of [
      [0, 10],
      [45, 47],
      [46, 92],
      [1000, 1400],
      [-500, 30],
      [4000, 9000],
    ]) {
      const win = windowLanes(uniformLaneOffsets(100, 46), 44, { start, end })
      const clamp = (v: number) => Math.min(Math.max(v, 0), 100)
      const s = clamp(Math.floor((start - 44) / 46))
      const e = Math.max(s, clamp(Math.ceil((end - 44) / 46)))
      expect([win.startIndex, win.endIndex]).toEqual([s, e])
    }
  })

  it('buildVerticalModel : `laneHeightOf` porte la hauteur de chaque lane', () => {
    const resources: Resource[] = [
      { id: 'a1', title: 'A1', category: 'A' },
      { id: 'a2', title: 'A2', category: 'A' },
      { id: 'b1', title: 'B1', category: 'B' },
    ]
    const groups: Array<[string, Resource[]]> = [
      ['A', [resources[0], resources[1]]],
      ['B', [resources[2]]],
    ]
    const { rulerHeight: R, headHeight: H, laneHeight: L } = DEFAULT_METRICS
    const tall = new Map([['a1', L + 34]])
    const model = buildVerticalModel(groups, {}, DEFAULT_METRICS, (r) => tall.get(r.id) ?? L)
    expect(model.laneTops.get('a2')).toBe(R + H + L + 34)
    expect(model.listTops.B).toBe(R + H + 2 * L + 34 + H)
    expect(model.laneHeights.get('a1')).toBe(L + 34)
    expect(model.laneOffsetsByCategory.A).toEqual([0, L + 34, 2 * L + 34])
    expect(model.totalHeight).toBe(R + 2 * H + 3 * L + 34)
  })
})
