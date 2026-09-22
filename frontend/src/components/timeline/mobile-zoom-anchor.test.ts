import { describe, expect, it } from 'vitest'
import { centerDayFromScroll, scrollLeftForCenterDay } from './mobile-zoom-anchor'
import { DAY_WIDTH_PX } from './zoom'

const GUTTER = 120

describe('#747 — ancre de zoom mobile (centre de la zone de piste)', () => {
  it('lit le jour au centre de la zone de piste, gouttière sticky exclue', () => {
    // Viewport 390 px : zone de piste = [120, 390] → centre à 255 px du bord, soit
    // 135 px de piste après le bord droit de l'en-tête. 1000 + 135 = 1135 px = 94,58 j à 12 px/j.
    expect(centerDayFromScroll(1000, 390, DAY_WIDTH_PX.month, GUTTER)).toBeCloseTo(1135 / 12, 9)
  })

  it('re-projection aller-retour : le jour ancré revient au centre à toute échelle', () => {
    const clientWidth = 844
    const day = centerDayFromScroll(5000, clientWidth, DAY_WIDTH_PX.month, GUTTER)
    expect(day).not.toBeNull()
    for (const dayWidth of Object.values(DAY_WIDTH_PX)) {
      const left = scrollLeftForCenterDay(day as number, clientWidth, dayWidth, GUTTER)
      expect(centerDayFromScroll(left, clientWidth, dayWidth, GUTTER)).toBeCloseTo(day as number, 9)
    }
  })

  it('zoom avant Mois → Semaine : le scrollLeft suit le jour, pas les pixels', () => {
    const day = centerDayFromScroll(1000, 390, DAY_WIDTH_PX.month, GUTTER) as number
    // 94,58 j × 34 px/j − 135 px = 3080,83 px (et non 1000 px, valeur périmée).
    expect(scrollLeftForCenterDay(day, 390, DAY_WIDTH_PX.week, GUTTER)).toBeCloseTo(
      (1135 / 12) * 34 - 135,
      9,
    )
  })

  it('la gouttière ne se met pas à l’échelle (constante en px)', () => {
    // Un jour au centre à 12 px/j puis à 5 px/j : la différence de scrollLeft vaut
    // day × (12 − 5), SANS terme proportionnel à la gouttière.
    const day = 200
    const a = scrollLeftForCenterDay(day, 390, 12, GUTTER)
    const b = scrollLeftForCenterDay(day, 390, 5, GUTTER)
    expect(a - b).toBeCloseTo(day * 7, 9)
  })

  it('borne basse à 0 (jour ancré trop près du début de plage)', () => {
    expect(scrollLeftForCenterDay(3, 390, DAY_WIDTH_PX.month, GUTTER)).toBe(0)
  })

  it('échelle inexploitable : aucune ancre', () => {
    expect(centerDayFromScroll(100, 390, 0, GUTTER)).toBeNull()
    expect(centerDayFromScroll(100, 390, Number.NaN, GUTTER)).toBeNull()
  })

  it('viewport plus étroit que la gouttière : demi-zone nulle, pas négative', () => {
    expect(centerDayFromScroll(240, 100, 12, GUTTER)).toBe(20)
    expect(scrollLeftForCenterDay(20, 100, 12, GUTTER)).toBe(240)
  })
})
