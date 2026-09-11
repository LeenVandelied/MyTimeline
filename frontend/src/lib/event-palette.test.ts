import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EVENT_PALETTE, findPaletteEntry, paletteHex } from './event-palette'
import type { EventPaletteRole } from './event-palette'

/**
 * #577 — Verrou du MIROIR JS de la palette (cf. en-tête de `event-palette.ts`).
 *
 * `colors.css` est la source ; `EVENT_PALETTE` la recopie parce qu'un formulaire
 * stocke un hex. Une copie non verrouillée est une promesse de commentaire
 * ([[PIT-S58-004]]) : ces tests échouent dès que les deux divergent.
 *
 * ⚠ CE QUE CES TESTS NE PROUVENT PAS : que la couleur PEINTE est celle-là. jsdom
 * ne résout aucun `var()` — la preuve du rendu est l'E2E
 * `sprint-73-model-vs-rendered` (remplissage peint = hex du testid, 12 × 2 thèmes).
 */

const SRC_ROOT = join(__dirname, '..')
const COLORS_CSS = join(SRC_ROOT, 'styles/ds/tokens/colors.css')
const css = readFileSync(COLORS_CSS, 'utf-8')
const DARK_SELECTOR = '[data-theme="dark"]'
const lightBlock = css.slice(0, css.indexOf(DARK_SELECTOR))
const darkBlock = css.slice(css.indexOf(DARK_SELECTOR))

/** Toutes les déclarations `--evt-<nom>: <valeur>;` d'un bloc, dans l'ordre. */
function evtDeclarations(block: string): Array<[string, string]> {
  return [...block.matchAll(/(--evt-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim().toUpperCase(),
  ])
}

describe('#577 — EVENT_PALETTE est le miroir exact des tokens --evt-*', () => {
  it('mêmes 12 tokens, mêmes valeurs, même ordre que colors.css', () => {
    const fromCss = evtDeclarations(lightBlock)
    // Garde-fou du parseur lui-même : sans cette ligne, un bloc introuvable
    // rendrait `[]` et la comparaison suivante échouerait sans dire pourquoi.
    expect(fromCss.length, 'aucun --evt-* lu dans colors.css').toBeGreaterThan(0)
    expect(fromCss).toEqual(EVENT_PALETTE.map((e) => [e.token, e.hex]))
  })

  it('les valeurs sont celles du handoff (graphite-handoff.md §Palette curatée), sauf orchidée (DEC-S84-003)', () => {
    // Rappel textuel de la colonne « Handoff » de l'issue : si ce test rougit, c'est
    // la CHARTE qui a bougé (ou une faute de frappe), pas un test à « remettre au vert ».
    //
    // Exception NOMMÉE : orchidée est le seul rôle qui s'écarte délibérément du
    // handoff. `#B056A8` (valeur handoff) plafonnait à 4.43:1 en texte avec les
    // encres du dépôt (`INK_LIGHT`/`INK_DARK`), sous AA 4.5:1 — DEC-S84-003
    // (`docs/memory/decisions.md`) arbitre l'AA au-dessus de l'égalité exacte à la
    // charte, et ajuste le token à `#AE55A6` (4.52:1). Les 11 autres rôles restent
    // strictement égaux au handoff.
    const handoff = readFileSync(join(SRC_ROOT, '../../docs/design/graphite-handoff.md'), 'utf-8')
    const ORCHID_HANDOFF_EXCEPTION: EventPaletteRole = 'orchid'
    for (const { role, hex } of EVENT_PALETTE) {
      if (role === ORCHID_HANDOFF_EXCEPTION) {
        expect(hex, 'orchidée doit être la valeur ajustée DEC-S84-003, pas celle du handoff').toBe(
          '#AE55A6',
        )
        continue
      }
      expect(handoff, `${hex} absent du handoff`).toContain(`\`${hex}\``)
    }
  })

  it('le rôle est le suffixe du token (clé i18n = nom du token)', () => {
    for (const { role, token } of EVENT_PALETTE) expect(token).toBe(`--evt-${role}`)
  })

  it('aucun --evt-* n’est redéfini sous le thème sombre', () => {
    // L'encre du glyphe de coche est calculée sur le hex JS (`swatchGlyphInkVar`) :
    // elle ne vaut que si le remplissage peint est le MÊME dans les deux thèmes
    // ([[PIT-S73-002]]). Un override sombre d'un `--evt-*` casserait ce calcul en
    // silence.
    expect(evtDeclarations(darkBlock)).toEqual([])
  })

  it('12 hex `#RRGGBB` distincts, conformes au @Pattern backend', () => {
    expect(EVENT_PALETTE).toHaveLength(12)
    expect(new Set(EVENT_PALETTE.map((e) => e.hex)).size).toBe(12)
    for (const { hex } of EVENT_PALETTE) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('#577 — paletteHex', () => {
  it('rend le hex d’un rôle (DEFAULT_COLOR = cobalt passe par ici)', () => {
    expect(paletteHex('cobalt')).toBe('#3B62D4')
  })
})

describe('#577 — findPaletteEntry', () => {
  it('retrouve une entrée quelle que soit la casse stockée', () => {
    expect(findPaletteEntry('#E5484D')?.role).toBe('red')
    expect(findPaletteEntry('#e5484d')?.role).toBe('red')
  })

  it('valeur absente, vide ou hors palette → undefined (= « Personnalisé » si non vide)', () => {
    expect(findPaletteEntry(undefined)).toBeUndefined()
    expect(findPaletteEntry(null)).toBeUndefined()
    expect(findPaletteEntry('')).toBeUndefined()
    // Anciennes valeurs de `CATEGORY_SWATCHES` : toujours valides en base
    // (DEC-S84-001), mais plus dans la palette.
    expect(findPaletteEntry('#E5691E')).toBeUndefined()
    expect(findPaletteEntry('#3E63DD')).toBeUndefined()
  })
})

/**
 * FIL-PIÈGE « une seule définition » : aucun autre fichier de `src/` ne doit
 * réunir une LISTE de couleurs de la palette.
 *
 * Seuil : 6 hex distincts de la palette (la moitié) dans un même fichier. Les tests
 * en citent 1 à 4 (une couleur plausible, un pire cas nommé), ce qui est légitime ; une
 * liste recopiée en compte 12.
 *
 * CE QU’IL N’ATTRAPE PAS : une liste de ≤ 5 couleurs, une couleur écrite en
 * `rgb()`/`hsl()`, une liste hors `src/` (E2E, docs — `a11y-audit.md` tabule
 * volontairement les 12 mesures).
 */
describe('#577 — aucune autre liste de la palette dans src/', () => {
  const ALLOWED = new Set([
    'lib/event-palette.ts',
    'lib/event-palette.test.ts',
    'styles/ds/tokens/colors.css',
  ])
  const EXTENSIONS = ['.ts', '.tsx', '.css']
  const SKIP_DIRS = new Set(['node_modules', '.next'])

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path, out)
      else if (EXTENSIONS.some((ext) => name.endsWith(ext))) out.push(path)
    }
    return out
  }

  it('aucun fichier ne cite 6 couleurs de la palette ou plus', () => {
    const offenders: string[] = []
    for (const file of walk(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file)
      if (ALLOWED.has(rel)) continue
      const content = readFileSync(file, 'utf-8').toUpperCase()
      const hits = EVENT_PALETTE.filter((e) => content.includes(e.hex)).map((e) => e.hex)
      if (hits.length >= 6) offenders.push(`${rel} (${hits.join(', ')})`)
    }
    expect(offenders).toEqual([])
  })
})
