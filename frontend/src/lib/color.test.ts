import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'
import {
  contrastFloor,
  contrastInk,
  contrastRatio,
  grayscaleHex,
  mixHex,
  outlineFloorVars,
  relativeLuminance,
  swatchGlyphInk,
  swatchGlyphInkVar,
  CONTRAST_FLOOR_MARGIN,
  SWATCH_GLYPH_DARK,
  SWATCH_GLYPH_LIGHT,
  SWATCH_GLYPH_THRESHOLD,
  INK_DARK,
  INK_LIGHT,
  THEME_INK,
  THEME_SURFACE,
  WCAG_AA_NON_TEXT,
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

// ─────────────────────────────────────────────────────────────────────────────
// #497 — PLANCHER DE LISIBILITÉ des traits peints dans la couleur utilisateur.
//
// ⚠ CE QUE CES TESTS NE PROUVENT PAS. Ils vérifient le MODÈLE de contraste, pas
// le rendu : `jsdom` ne met rien en page, ne résout aucun `color-mix()` et ne
// compose aucun fond ([[PIT-S70-003]] / [[PIT-S48-002]] — un token bien nommé ne
// dit rien de ce qui est peint). La preuve du rendu est l'E2E navigateur
// `e2e/sprint-70-preview-visual.spec.ts`, qui mesure sur `getComputedStyle` +
// fond composité. Ici on verrouille l'arithmétique et la non-divergence des
// constantes de thème — deux choses que l'E2E, lui, ne localise pas.
// ─────────────────────────────────────────────────────────────────────────────
/** Les 3 couleurs de l'échantillon E2E (#325), choisies par le RISQUE. */
const COBALT = '#3B62D4' // DEFAULT_COLOR — cas nominal
const CITRON = '#A7B83A' // la plus claire de la palette curatée — pire cas CLAIR
const NUIT = '#101318' // couleur libre quasi noire — pire cas SOMBRE

/** Fond réellement peint derrière le contour du fantôme (`.mt-evt--draft`). */
const ghostBg = (color: string, theme: 'light' | 'dark') =>
  mixHex(THEME_SURFACE[theme], color, 0.08)

describe('mixHex', () => {
  it('les bornes rendent les extrémités', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000')
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#ffffff')
  })

  it('interpole en sRGB GAMMA-ENCODÉ, comme `color-mix(in srgb, …)`', () => {
    // 50 % entre 0 et 255 = 128 (arrondi), PAS 188 (ce que donnerait une
    // interpolation en linéaire). C'est l'écart qui ferait calculer le plancher
    // contre un fond que le navigateur ne peint pas.
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })

  it('borne le poids hors [0,1] au lieu de produire une couleur invalide', () => {
    expect(mixHex('#000000', '#FFFFFF', -3)).toBe('#000000')
    expect(mixHex('#000000', '#FFFFFF', 42)).toBe('#ffffff')
  })

  it('rend la couleur source telle quelle si un hex est invalide', () => {
    expect(mixHex('rgb(0,0,0)', '#FFFFFF', 0.5)).toBe('rgb(0,0,0)')
  })
})

describe('contrastFloor', () => {
  it('CAS DÉJÀ CONFORME : la couleur ressort INCHANGÉE (aucun mélange gratuit)', () => {
    // Cobalt sur surface claire : 5.41:1 mesuré au S70, très au-dessus de 3:1.
    expect(contrastFloor(COBALT, THEME_SURFACE.light, THEME_INK.light)).toBe(COBALT)
  })

  it('CITRON EN CLAIR (2.20:1 mesuré) franchit le seuil après plancher', () => {
    const floored = contrastFloor(CITRON, THEME_SURFACE.light, THEME_INK.light)
    expect(contrastRatio(CITRON, THEME_SURFACE.light)).toBeLessThan(WCAG_AA_NON_TEXT)
    expect(floored).not.toBe(CITRON)
    expect(contrastRatio(floored, THEME_SURFACE.light)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
  })

  it('QUASI-NOIR EN SOMBRE (1.02:1 mesuré) franchit le seuil après plancher', () => {
    const floored = contrastFloor(NUIT, THEME_SURFACE.dark, THEME_INK.dark)
    expect(contrastRatio(NUIT, THEME_SURFACE.dark)).toBeLessThan(1.1)
    expect(contrastRatio(floored, THEME_SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
  })

  it('le mélange est PROGRESSIF : la teinte reste reconnaissable quand elle le peut', () => {
    const floored = contrastFloor(CITRON, THEME_SURFACE.light, THEME_INK.light)
    // Le citron est vert-jaune : g > r > b. Un saut à l'encre pleine (gris très
    // sombre) écraserait cet ordre — c'est précisément ce que la doctrine
    // « repli sur un token neutre » aurait fait, et qu'on a écarté.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(floored.slice(i, i + 2), 16))
    expect(g).toBeGreaterThan(r)
    expect(r).toBeGreaterThan(b)
    expect(floored).not.toBe(THEME_INK.light)
  })

  it("s'arrête AU PREMIER pas conforme (le pas précédent ne l'est pas)", () => {
    const floored = contrastFloor(CITRON, THEME_SURFACE.light, THEME_INK.light)
    // On retrouve le `t` retenu, puis on vérifie qu'un cran plus clair échoue :
    // sans cette assertion, un plancher qui sur-corrige passerait aussi.
    let t = -1
    for (let i = 0; i <= 256; i += 1) {
      if (mixHex(CITRON, THEME_INK.light, i / 256) === floored) {
        t = i
        break
      }
    }
    expect(t).toBeGreaterThan(0)
    const previous = mixHex(CITRON, THEME_INK.light, (t - 1) / 256)
    expect(contrastRatio(previous, THEME_SURFACE.light)).toBeLessThan(
      WCAG_AA_NON_TEXT + CONTRAST_FLOOR_MARGIN,
    )
  })

  it('ne prétend rien sur une couleur non hexadécimale (renvoyée telle quelle)', () => {
    expect(contrastFloor('var(--color-accent)', THEME_SURFACE.light, THEME_INK.light)).toBe(
      'var(--color-accent)',
    )
  })
})

describe('outlineFloorVars', () => {
  it('renvoie `null` sans couleur : le repli DS reprend la main', () => {
    expect(outlineFloorVars(undefined)).toBeNull()
    expect(outlineFloorVars(null)).toBeNull()
    expect(outlineFloorVars('bleu')).toBeNull()
  })

  it('est THEME-AWARE : le pire cas diffère selon le thème', () => {
    const citron = outlineFloorVars(CITRON)
    const nuit = outlineFloorVars(NUIT)
    // Citron : cassé en clair, déjà conforme en sombre (8.32:1 mesuré).
    expect(citron!['--mt-evt-outline']).not.toBe(CITRON)
    expect(citron!['--mt-evt-outline-dark']).toBe(CITRON)
    // Quasi-noir : symétrique exact.
    expect(nuit!['--mt-evt-outline']).toBe(NUIT)
    expect(nuit!['--mt-evt-outline-dark']).not.toBe(NUIT)
  })

  it('les DEUX traits de l’aperçu tiennent 3:1 dans les DEUX thèmes', () => {
    for (const color of [COBALT, CITRON, NUIT]) {
      // Connecteur : pas de fond propre → surface nue.
      const connector = outlineFloorVars(color, 0)!
      // Contour du fantôme : peint par-dessus son fond `color-mix(… 8%, surface)`.
      const ghost = outlineFloorVars(color, 8)!
      for (const theme of ['light', 'dark'] as const) {
        const key = theme === 'light' ? '--mt-evt-outline' : '--mt-evt-outline-dark'
        expect(
          contrastRatio(connector[key], THEME_SURFACE[theme]),
          `connecteur ${color} en ${theme}`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
        expect(
          contrastRatio(ghost[key], ghostBg(color, theme)),
          `contour fantôme ${color} en ${theme}`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
      }
    }
  })

  it('le fond teinté à 8 % change le plancher : les deux traits ne sont pas interchangeables', () => {
    // Le fond du fantôme est plus proche de la couleur que la surface nue, donc
    // le contraste de départ y est plus BAS (2.07 vs 2.20 mesurés sur le citron
    // en clair) : le mélange doit aller plus loin. Si un jour ces deux valeurs
    // deviennent égales, c'est que la distinction a été perdue en route.
    const connector = outlineFloorVars(CITRON, 0)!['--mt-evt-outline']
    const ghost = outlineFloorVars(CITRON, 8)!['--mt-evt-outline']
    expect(ghost).not.toBe(connector)
  })
})

describe('#497 — les constantes de thème ne divergent pas des tokens du DS', () => {
  // GARDE-FOU RÉEL, pas une promesse de commentaire ([[PIT-S58-004]] : une
  // garantie fictive est pire que pas de garantie). `THEME_SURFACE`/`THEME_INK`
  // dupliquent des tokens CSS parce qu'aucune fonction CSS ne calcule un
  // contraste ; ce test échoue si `colors.css` bouge sans que `color.ts` suive.
  const css = readFileSync(join(__dirname, '../styles/ds/tokens/colors.css'), 'utf-8')
  const light = css.slice(0, css.indexOf('[data-theme="dark"]'))
  const dark = css.slice(css.indexOf('[data-theme="dark"]'))

  /** Résout `--name` dans un bloc, en suivant un éventuel alias `var(--gray-N)`. */
  const token = (block: string, name: string): string => {
    const declared = new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1].trim()
    if (declared === undefined) throw new Error(`token --${name} introuvable`)
    const alias = /^var\((--[a-z0-9-]+)\)$/.exec(declared)?.[1]
    if (!alias) return declared.toUpperCase()
    return new RegExp(`${alias}:\\s*([^;]+);`).exec(css)![1].trim().toUpperCase()
  }

  it('--color-surface (clair et sombre)', () => {
    expect(token(light, 'color-surface')).toBe(THEME_SURFACE.light.toUpperCase())
    expect(token(dark, 'color-surface')).toBe(THEME_SURFACE.dark.toUpperCase())
  })

  it('--color-ink (clair et sombre)', () => {
    expect(token(light, 'color-ink')).toBe(THEME_INK.light.toUpperCase())
    expect(token(dark, 'color-ink')).toBe(THEME_INK.dark.toUpperCase())
  })

  it('`timeline.css` consomme réellement les deux variables produites', () => {
    // Sans ceci, `outlineFloorVars` pourrait être parfaitement testée et
    // n'être branchée sur RIEN — le mode d'échec de [[PIT-S61-002]]
    // (« symbole + test unitaire présents, zéro appelant »).
    const timeline = readFileSync(join(__dirname, '../styles/ds/components/timeline.css'), 'utf-8')
    for (const selector of ['.mt-evt--draft', '.mt-evt-connector']) {
      const rules = timeline
        .split('\n')
        .filter((l) => l.includes(selector) && l.includes('var(--mt-evt-outline'))
      expect(
        rules.some((l) => l.includes('var(--mt-evt-outline,')),
        `${selector} clair`,
      ).toBe(true)
      expect(
        rules.some((l) => l.includes('var(--mt-evt-outline-dark,')),
        `${selector} sombre`,
      ).toBe(true)
    }
  })
})

describe('#416 — encre du glyphe de coche des pastilles', () => {
  const css = readFileSync(join(__dirname, '../styles/ds/tokens/colors.css'), 'utf-8')

  it('bascule au seuil de luminance, pas sur une encre fixe', () => {
    // Un blanc fixe échoue sur les couleurs claires, une encre fixe sur les
    // sombres : le choix DOIT dépendre du remplissage.
    expect(swatchGlyphInk('#F2A900')).toBe(SWATCH_GLYPH_DARK) // ambre, L = 0.4725
    expect(swatchGlyphInk('#3E63DD')).toBe(SWATCH_GLYPH_LIGHT) // bleu, L = 0.1517
  })

  it('applique bien SWATCH_GLYPH_THRESHOLD (strictement supérieur)', () => {
    // Encadrement du seuil par deux gris dont la luminance l'entoure.
    const below = '#757575' // L = 0.17789
    const above = '#767676' // L = 0.18116
    expect(relativeLuminance(below)).toBeLessThan(SWATCH_GLYPH_THRESHOLD)
    expect(relativeLuminance(above)).toBeGreaterThan(SWATCH_GLYPH_THRESHOLD)
    expect(swatchGlyphInk(below)).toBe(SWATCH_GLYPH_LIGHT)
    expect(swatchGlyphInk(above)).toBe(SWATCH_GLYPH_DARK)
  })

  it('hex invalide → encre sombre, jamais `undefined`', () => {
    expect(swatchGlyphInk('rouge')).toBe(SWATCH_GLYPH_DARK)
    expect(swatchGlyphInk('#12345')).toBe(SWATCH_GLYPH_DARK)
  })

  it('la variante DS rend un token de PALETTE, pas un alias de thème', () => {
    // `--color-ink` / `--color-primary-foreground` s'inversent dans `.dark` : le
    // remplissage étant un hex inline, le glyphe disparaîtrait en thème sombre.
    expect(swatchGlyphInkVar('#F2A900')).toBe('var(--gray-900)')
    expect(swatchGlyphInkVar('#3E63DD')).toBe('var(--gray-0)')
  })

  it('`--gray-0` / `--gray-900` valent les constantes ET ne sont pas redéfinis en sombre', () => {
    // Même garde-fou que §#497 : les constantes JS dupliquent des tokens CSS.
    // Le second volet est le cœur de #416 — si un bloc de thème redéfinissait
    // ces deux tokens, la table de contraste ne vaudrait plus qu'en clair.
    expect(/--gray-0:\s*#FFFFFF;/i.test(css)).toBe(true)
    expect(/--gray-900:\s*#16181D;/i.test(css)).toBe(true)
    expect(SWATCH_GLYPH_LIGHT).toBe('#FFFFFF')
    expect(SWATCH_GLYPH_DARK).toBe('#16181D')

    const dark = css.slice(css.indexOf('[data-theme="dark"]'))
    expect(/--gray-0\s*:/.test(dark)).toBe(false)
    expect(/--gray-900\s*:/.test(dark)).toBe(false)
  })
})
