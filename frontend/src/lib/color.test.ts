import { describe, it, expect } from 'vitest'
import {
  contrastInk,
  contrastRatio,
  grayscaleHex,
  relativeLuminance,
  INK_DARK,
  INK_LIGHT,
  WCAG_AA_NORMAL,
} from './color'

// #66 (corrections review) — BLOQUANT 1/2 : vrai contraste WCAG mutualisé.
// Palette event (extrait `--evt-*`) : l'ancienne formule `luminance > 0.5`
// choisissait blanc partout → FAIL AA sur couleurs claires. Le helper doit
// MAXIMISER le ratio (encre noir/blanc) et faire passer AA 4.5:1.

describe('relativeLuminance', () => {
  it('noir = 0, blanc = 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('supporte la forme courte #RGB', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 5)
  })
})

describe('contrastRatio', () => {
  it('noir/blanc = 21:1 (borne max WCAG)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('symétrique quel que soit l’ordre', () => {
    expect(contrastRatio('#A7B83A', INK_DARK)).toBeCloseTo(contrastRatio(INK_DARK, '#A7B83A'), 5)
  })
})

describe('contrastInk — encre qui MAXIMISE le contraste (WCAG AA)', () => {
  // Couleurs claires de la palette : l'ancienne formule mettait du blanc
  // (~2.1–2.9:1). L'encre correcte est NOIRE et passe AA.
  it.each([
    ['citron', '#A7B83A'],
    ['ambre', '#E0A82E'],
    ['orange', '#E67E22'],
  ])('%s (%s) → encre noire, AA respecté', (_name, hex) => {
    expect(contrastInk(hex)).toBe(INK_DARK)
    expect(contrastRatio(hex, INK_DARK)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
  })

  // Couleurs foncées : encre blanche, AA respecté.
  it.each([
    ['cobalt', '#2E5AAC'],
    ['graphite', '#3A3F44'],
  ])('%s (%s) → encre blanche, AA respecté', (_name, hex) => {
    expect(contrastInk(hex)).toBe(INK_LIGHT)
    expect(contrastRatio(hex, INK_LIGHT)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
  })

  it('choisit toujours l’encre au meilleur ratio (jamais un seuil naïf)', () => {
    for (const hex of ['#A7B83A', '#E0A82E', '#E67E22', '#2E5AAC', '#3A3F44', '#6366f1']) {
      const chosen = contrastInk(hex)
      const other = chosen === INK_DARK ? INK_LIGHT : INK_DARK
      expect(contrastRatio(hex, chosen)).toBeGreaterThanOrEqual(contrastRatio(hex, other))
    }
  })

  it('fallback `var(--color-ink)` si hex absent ou invalide', () => {
    expect(contrastInk(undefined)).toBe('var(--color-ink)')
    expect(contrastInk(null)).toBe('var(--color-ink)')
    expect(contrastInk('bleu')).toBe('var(--color-ink)')
    expect(contrastInk('')).toBe('var(--color-ink)')
  })
})

// #230 (correction review S61) — `grayscaleHex` réplique `filter: grayscale(1)`.
describe('grayscaleHex — réplique du filtre CSS `grayscale(1)`', () => {
  it('somme pondérée sur les canaux GAMMA-ENCODÉS (pas linéarisés)', () => {
    // 0.2126×0 + 0.7152×112 + 0.0722×248 = 98.01 → 98 = 0x62.
    // Une pondération sur les valeurs LINÉARISÉES donnerait ~#767676 : c'est
    // précisément l'écart qui fait chuter le contraste dans le navigateur.
    expect(grayscaleHex('#0070F8')).toBe('#626262')
  })

  it('noir et blanc sont des POINTS FIXES (d’où l’encre qui ne bougeait pas)', () => {
    expect(grayscaleHex('#000000')).toBe('#000000')
    expect(grayscaleHex('#FFFFFF')).toBe('#ffffff')
  })

  it('supporte la forme courte #RGB', () => {
    expect(grayscaleHex('#0f8')).toBe(grayscaleHex('#00ff88'))
  })

  it('rend un GRIS PUR : 253 des 256 passent AA, 3 restent sous le seuil', () => {
    // ⚠ Mesuré, pas supposé. Avec une encre foncée PURE (#000000) le pire gris
    // serait à 4.583 et le grisage ne pourrait JAMAIS casser AA. Mais l'encre
    // foncée de la charte est `#0B0C0E` (L = 0.00366, pas 0) : le point
    // d'égalisation noir/blanc descend à 4.424, et 3 gris médians échouent.
    // Ce sont eux qui doivent encore déclencher le repli « libellé dehors ».
    const failing: string[] = []
    for (let v = 0; v < 256; v++) {
      const c = v.toString(16).padStart(2, '0')
      const gray = `#${c}${c}${c}`
      const best = contrastRatio(gray, contrastInk(gray))
      // Borne dure : le grisage ne peut pas descendre plus bas que 4.42.
      expect(best).toBeGreaterThan(4.42)
      if (best < WCAG_AA_NORMAL) failing.push(gray)
    }
    expect(failing).toEqual(['#777777', '#787878', '#797979'])
  })

  it('hex invalide/vide → renvoyé tel quel (préserve le theming DS)', () => {
    expect(grayscaleHex('var(--color-accent)')).toBe('var(--color-accent)')
    expect(grayscaleHex('')).toBe('')
  })
})
