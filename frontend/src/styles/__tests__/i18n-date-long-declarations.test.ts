// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container } from 'postcss'
import tailwind from '@tailwindcss/postcss'

/**
 * #517 — Déclarations de `.mt-date--long` (`ds/components/i18n.css` §7).
 *
 * Les écrans migrés (WeekAgenda, EventDrawer, SessionList…) comptent sur ces
 * valeurs précises. Le test compile la vraie chaîne CSS et lit l'AST : aucun
 * rendu, donc rien sur les pixels ni la cascade réelle.
 */

const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))

async function compile(): Promise<Container> {
  const result = await postcss([tailwind()]).process(readFileSync(GLOBALS, 'utf8'), {
    from: GLOBALS,
  })
  return result.root as unknown as Container
}

/** Déclarations fusionnées des règles dont un sélecteur est exactement `selector`. */
function declsOf(root: Container, selector: string): Map<string, string> {
  const decls = new Map<string, string>()
  root.walkRules((rule) => {
    if (!rule.selector.split(',').some((s) => s.trim() === selector)) return
    rule.walkDecls((d) => {
      decls.set(d.prop, d.value.trim())
    })
  })
  return decls
}

describe('#517 — `.mt-date--long` : déclarations', () => {
  it('pose mono, tabular-nums, ltr, isolate, nowrap, letter-spacing et 13px', async () => {
    const props = declsOf(await compile(), '.mt-date--long')
    expect(props.get('font-family')).toBe('var(--font-mono)')
    expect(props.get('font-variant-numeric')).toBe('tabular-nums')
    expect(props.get('direction')).toBe('ltr')
    expect(props.get('unicode-bidi')).toBe('isolate')
    expect(props.get('white-space')).toBe('nowrap')
    expect(props.get('letter-spacing')).toBe('.01em')
    expect(props.get('font-size')).toBe('13px')
  })

  it('neutralise color et text-decoration sur `time.mt-date--long` seulement', async () => {
    const root = await compile()
    const timed = declsOf(root, 'time.mt-date--long')
    expect(timed.get('color')).toBe('inherit')
    expect(timed.get('text-decoration')).toBe('none')

    const bare = declsOf(root, '.mt-date--long')
    expect(bare.has('color'), '.mt-date--long nu ne doit pas déclarer `color`').toBe(false)
    expect(
      bare.has('text-decoration'),
      '.mt-date--long nu ne doit pas déclarer `text-decoration`',
    ).toBe(false)
  })
})
