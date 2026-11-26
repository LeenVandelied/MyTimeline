// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from '@tailwindcss/node'

/**
 * #643 — Le palier `xs` (360 px) ajoute à `container` un `max-width: 360px` entre 360 et
 * 639 px. `globals.css` l'annule par une extension de `@utility container` : elle ne
 * l'emporte que si elle est émise APRÈS la règle de Tailwind (même sélecteur, même
 * couche). Le test compile le vrai `globals.css` et lit l'ordre du CSS produit. Il ne
 * prouve rien sur le rendu : les largeurs sont mesurées au navigateur (preuve du ticket).
 */

const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))

// Plafond posé par Tailwind pour `xs`, puis sa neutralisation sur la plage xs..sm.
const XS_CAP = /@media \(width >= 360px\) \{\s*max-width: 360px;/
const XS_RESET = /@media \(width >= 360px\) and \(width < 640px\) \{\s*max-width: none;/
const XS_RESET_CONTAINER =
  /@media \(width >= 360px\) and \(width < 640px\) \{\s*\.container \{\s*max-width: none;/

/** Bloc `{ … }` du premier sélecteur qui correspond, accolades équilibrées. */
function ruleBlock(css: string, selector: RegExp): { start: number; text: string } {
  const m = selector.exec(css)
  expect(m, `règle ${selector} absente du CSS compilé`).not.toBeNull()
  const open = css.indexOf('{', m!.index)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0)
      return { start: m!.index, text: css.slice(m!.index, i + 1) }
  }
  throw new Error(`règle ${selector} non fermée`)
}

async function compiledUtilities(): Promise<string> {
  const compiler = await compile(readFileSync(GLOBALS, 'utf8'), {
    base: dirname(GLOBALS),
    onDependency: () => {},
  })
  return compiler.build(['container', 'container-landing'])
}

describe('#643 — plafond xs de container neutralisé', () => {
  it('emits max-width none on the xs..sm range after the 360px cap', async () => {
    const css = await compiledUtilities()

    // `.container-landing` applique `container` : plafond et neutralisation dans son bloc.
    const landing = ruleBlock(css, /\.container-landing \{/).text
    const landingCap = landing.search(XS_CAP)
    const landingReset = landing.search(XS_RESET)
    expect(landingCap, 'plafond xs de .container-landing').toBeGreaterThanOrEqual(0)
    expect(landingReset, 'neutralisation dans .container-landing').toBeGreaterThan(landingCap)

    // `.container` : la neutralisation est une règle à part, émise après celle de Tailwind.
    const container = ruleBlock(css, /(?<![\w-])\.container \{/)
    const containerCap = container.text.search(XS_CAP)
    const containerReset = css.search(XS_RESET_CONTAINER)
    expect(containerCap, 'plafond xs de .container').toBeGreaterThanOrEqual(0)
    expect(containerReset, 'neutralisation de .container').toBeGreaterThan(
      container.start + containerCap,
    )
  })
})
