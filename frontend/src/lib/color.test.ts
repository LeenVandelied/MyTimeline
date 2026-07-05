import { describe, it, expect } from 'vitest'
import {
  contrastInk,
  contrastRatio,
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
