import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  clampViewportStart,
  dayToPct,
  dragViewportStart,
  keyToViewportStart,
  maxViewportStart,
  rulerTicks,
  viewportDays,
  VIEWPORT_DAYS,
} from './densityWindow'

/**
 * #623 — Géométrie pure du ruban (règle + viewport). jsdom ne fait aucun layout :
 * la conversion px → jours n'est prouvable qu'ici ; le glisser réel est couvert par
 * `e2e/sprint-108-density-ribbon.spec.ts`.
 */
describe('rulerTicks — une graduation tous les 5 jours', () => {
  it('30 jours → 7 libellés 0, 5, …, 30 (maquette)', () => {
    const ticks = rulerTicks(30)
    expect(ticks.map((t) => t.day)).toEqual([0, 5, 10, 15, 20, 25, 30])
  })

  it('positions = d / 30 × 100 ; bord gauche à 0 %, bord droit à 100 %', () => {
    const ticks = rulerTicks(30)
    expect(ticks[0].pct).toBe(0)
    expect(ticks[3].pct).toBe(50)
    expect(ticks[6].pct).toBe(100)
  })

  it('ancrage : gauche pour J0, droite pour J30, centré sinon', () => {
    const anchors = rulerTicks(30).map((t) => t.anchor)
    expect(anchors).toEqual(['start', 'center', 'center', 'center', 'center', 'center', 'end'])
  })

  it('fenêtre non multiple du pas : aucune graduation au-delà du bord droit', () => {
    const ticks = rulerTicks(12)
    expect(ticks.map((t) => t.day)).toEqual([0, 5, 10])
    expect(ticks.every((t) => t.pct <= 100)).toBe(true)
    // 10 n'est pas le bord droit : il reste centré.
    expect(ticks[2].anchor).toBe('center')
  })

  it('fenêtre vide ou pas nul → aucune graduation (pas de boucle infinie)', () => {
    expect(rulerTicks(0)).toEqual([])
    expect(rulerTicks(30, 0)).toEqual([])
  })
})

describe('viewport — largeur et bornes', () => {
  it('9 jours sur 30 → début ∈ [0, 21]', () => {
    expect(VIEWPORT_DAYS).toBe(9)
    expect(viewportDays(30)).toBe(9)
    expect(maxViewportStart(30)).toBe(21)
  })

  it('fenêtre plus courte que le viewport : le viewport la remplit, début figé à 0', () => {
    expect(viewportDays(5)).toBe(5)
    expect(maxViewportStart(5)).toBe(0)
  })

  it('clamp aux deux bords, position continue conservée entre les deux', () => {
    expect(clampViewportStart(-3, 30)).toBe(0)
    expect(clampViewportStart(25, 30)).toBe(21)
    expect(clampViewportStart(7.4, 30)).toBe(7.4)
    expect(clampViewportStart(Number.NaN, 30)).toBe(0)
    expect(clampViewportStart(Number.POSITIVE_INFINITY, 30)).toBe(21)
  })

  it('dayToPct : 9 j sur 30 = 30 %', () => {
    expect(dayToPct(9, 30)).toBeCloseTo(30, 10)
    expect(dayToPct(0, 0)).toBe(0)
  })
})

describe('dragViewportStart — pixels → jours (maquette : Δx / largeur × 30)', () => {
  const base = { trackWidthPx: 600, rangeDays: 30 }

  it('20 px sur une piste de 600 px = 1 jour', () => {
    expect(dragViewportStart({ ...base, originStart: 0, deltaPx: 20 })).toBeCloseTo(1, 10)
  })

  it('position continue pendant le glisser (pas d’arrondi ici)', () => {
    expect(dragViewportStart({ ...base, originStart: 3, deltaPx: 50 })).toBeCloseTo(5.5, 10)
  })

  it('part de la position AU MOMENT de la saisie, pas de 0', () => {
    expect(dragViewportStart({ ...base, originStart: 10, deltaPx: -100 })).toBeCloseTo(5, 10)
  })

  it('clamp à gauche (0) et à droite (21) quel que soit l’excès', () => {
    expect(dragViewportStart({ ...base, originStart: 2, deltaPx: -5000 })).toBe(0)
    expect(dragViewportStart({ ...base, originStart: 2, deltaPx: 5000 })).toBe(21)
  })

  it('piste sans largeur (jsdom, élément masqué) : la position ne bouge pas', () => {
    expect(
      dragViewportStart({ originStart: 4, deltaPx: 300, trackWidthPx: 0, rangeDays: 30 }),
    ).toBe(4)
  })
})

describe('keyToViewportStart — clavier du slider (APG)', () => {
  it('←/→ = ∓1 jour, ↓/↑ idem', () => {
    expect(keyToViewportStart('ArrowRight', 4, 30)).toBe(5)
    expect(keyToViewportStart('ArrowLeft', 4, 30)).toBe(3)
    expect(keyToViewportStart('ArrowUp', 4, 30)).toBe(5)
    expect(keyToViewportStart('ArrowDown', 4, 30)).toBe(3)
  })

  it('PageUp/PageDown = ±7 jours, bornés', () => {
    expect(keyToViewportStart('PageUp', 4, 30)).toBe(11)
    expect(keyToViewportStart('PageDown', 4, 30)).toBe(0)
    expect(keyToViewportStart('PageUp', 18, 30)).toBe(21)
  })

  it('Home = 0, End = 21', () => {
    expect(keyToViewportStart('Home', 12, 30)).toBe(0)
    expect(keyToViewportStart('End', 0, 30)).toBe(21)
  })

  it('part de la position ARRONDIE laissée par un glisser', () => {
    expect(keyToViewportStart('ArrowRight', 6.6, 30)).toBe(8)
    expect(keyToViewportStart('ArrowLeft', 6.4, 30)).toBe(5)
  })

  it('bornes : ← à 0 reste 0, → à 21 reste 21', () => {
    expect(keyToViewportStart('ArrowLeft', 0, 30)).toBe(0)
    expect(keyToViewportStart('ArrowRight', 21, 30)).toBe(21)
  })

  it('touche non gérée → null (l’événement n’est pas consommé)', () => {
    expect(keyToViewportStart('Tab', 4, 30)).toBeNull()
    expect(keyToViewportStart('Enter', 4, 30)).toBeNull()
  })
})

describe('addCalendarDays — jours civils', () => {
  it('franchit un mois et renvoie minuit local', () => {
    const d = addCalendarDays(new Date(2026, 8, 22, 15, 30), 9)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 1, 0])
  })

  it('ne dérive pas au changement d’heure (25 oct. 2026 en Europe)', () => {
    const d = addCalendarDays(new Date(2026, 9, 20), 10)
    expect([d.getMonth(), d.getDate(), d.getHours()]).toEqual([9, 30, 0])
  })
})
