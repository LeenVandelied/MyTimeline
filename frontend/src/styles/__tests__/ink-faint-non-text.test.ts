// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss, { type Root } from 'postcss'

/**
 * #670 (DEC-S97-001) — `--color-ink-faint` est un palier NON TEXTUEL.
 *
 * Mesures (WCAG, luminance sRGB) : 2,75 / 2,82 / 2,56:1 sur bg / surface /
 * surface-2 en clair, 3,20 / 2,99 / 2,73:1 en sombre — sous 4,5:1 (texte) et
 * sous 3:1 (1.4.11). Tout texte (placeholders compris) prend `ink-muted`.
 *
 * CE QUE CE FICHIER PROUVE : aucune source ne POSE `ink-faint` comme couleur de
 * texte (utilitaire `text-ink-faint` hors liste blanche, déclaration CSS
 * `color: var(--color-ink-faint)`, ou règle `::placeholder` qui le cite).
 * CE QU'IL NE PROUVE PAS : le ratio RENDU (cascade, thème, fond composité) —
 * c'est `e2e/sprint-97-ink-faint-contrast.spec.ts` qui le mesure.
 */

const FRONTEND = fileURLToPath(new URL('../../../', import.meta.url))
const STYLES = fileURLToPath(new URL('../', import.meta.url))

/**
 * Seules exceptions : icônes `aria-hidden` purement décoratives, qui ne sont ni
 * du texte ni l'indicateur d'un contrôle (le libellé du bouton porte le sens).
 */
const ALLOWED_TSX = new Set([
  'src/components/settings/mobile/SettingsIndex.tsx', // chevron « > » aria-hidden
  'src/components/shared/EmptyState.tsx', // illustration aria-hidden
])

function files(dir: string, ext: RegExp): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && name !== '__tests__') out.push(...files(path, ext))
    } else if (ext.test(name) && !/\.(test|stories)\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

/** Lignes de CODE (hors commentaires) qui posent `text-ink-faint`. */
function textInkFaintLines(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => /\btext-ink-faint\b/.test(line))
    .filter((line) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(line))
}

/** Déclarations CSS qui font de `ink-faint` une couleur de TEXTE. */
function textualCssUses(root: Root): string[] {
  const hits: string[] = []
  root.walkDecls((decl) => {
    if (!decl.value.includes('--color-ink-faint')) return
    const selector = decl.parent && 'selector' in decl.parent ? String(decl.parent.selector) : ''
    if (decl.prop === 'color' || selector.includes('placeholder'))
      hits.push(`${selector} { ${decl.prop}: ${decl.value} }`)
  })
  return hits
}

describe('#670 — `ink-faint` ne porte aucun texte', () => {
  it('contrôle négatif : les motifs fautifs d’origine SONT détectés', () => {
    expect(
      textInkFaintLines('<span className="text-ink-faint text-2xs font-mono">x</span>'),
    ).toHaveLength(1)
    expect(textInkFaintLines(' * doc : `text-ink-faint` interdit')).toEqual([])
    const css = postcss.parse(
      '.a::placeholder{color:var(--color-ink-faint);}' +
        '.b{color:var(--color-ink-faint);}' +
        '.c:hover{border-color:var(--color-ink-faint);}',
    )
    expect(textualCssUses(css)).toHaveLength(2)
  })

  it('aucun .tsx de src/ ni app/ ne pose `text-ink-faint` (hors liste blanche décorative)', () => {
    const offenders: string[] = []
    let scanned = 0
    for (const root of ['src', 'app']) {
      for (const file of files(join(FRONTEND, root), /\.tsx$/)) {
        scanned += 1
        const rel = relative(FRONTEND, file)
        if (ALLOWED_TSX.has(rel)) continue
        for (const line of textInkFaintLines(readFileSync(file, 'utf8')))
          offenders.push(`${rel} : ${line.trim()}`)
      }
    }
    expect(scanned, 'le balayage a bien lu des fichiers').toBeGreaterThan(100)
    expect(offenders).toEqual([])
  })

  it('la liste blanche reste justifiée : chaque exception est un élément aria-hidden', () => {
    for (const rel of ALLOWED_TSX) {
      const all = readFileSync(join(FRONTEND, rel), 'utf8').split('\n')
      // Chaque usage + ses 2 lignes suivantes (attributs JSX formatés sur plusieurs lignes).
      const blocks = all.flatMap((line, i) =>
        textInkFaintLines(line).length > 0 ? [all.slice(i, i + 3).join(' ')] : [],
      )
      expect(blocks.length, `${rel} ne cite plus text-ink-faint : retirer l'exception`).toBe(1)
      for (const block of blocks) expect(block, rel).toContain('aria-hidden="true"')
    }
  })

  it('aucune feuille de src/styles ne pose `ink-faint` en couleur de texte ou de placeholder', () => {
    const offenders: string[] = []
    const sheets = files(STYLES, /\.css$/)
    expect(sheets.length).toBeGreaterThan(5)
    for (const file of sheets) {
      const root = postcss.parse(readFileSync(file, 'utf8'), { from: file })
      for (const hit of textualCssUses(root)) offenders.push(`${relative(FRONTEND, file)} : ${hit}`)
    }
    expect(offenders).toEqual([])
  })

  it('DEC-S97-006 — le survol d’un contrôle à bordure fonctionnelle ne retombe pas sur `ink-faint`', () => {
    // Bordure = affordance (repos `rule-emphasis`, ≥3:1) : au survol elle doit
    // rester ≥3:1 (1.4.11). `ink-faint` y mesure 2,56-2,99:1.
    const controls = ['.mt-btn--secondary:hover', '.mt-iconbtn:hover', '.mt-select__trigger:hover']
    const root = postcss.parse(readFileSync(join(STYLES, 'ds/components/core.css'), 'utf8'))
    const borders = new Map<string, string>()
    root.walkDecls('border-color', (decl) => {
      const selector = decl.parent && 'selector' in decl.parent ? String(decl.parent.selector) : ''
      if (controls.includes(selector)) borders.set(selector, decl.value)
    })
    expect([...borders.keys()].sort()).toEqual([...controls].sort())
    for (const [selector, value] of borders) expect(value, selector).not.toContain('ink-faint')
  })
})
