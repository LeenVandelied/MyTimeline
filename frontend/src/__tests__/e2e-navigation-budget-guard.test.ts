// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #558 / DEC-S80-002 — le vert du test de navigation liste -> détail produit ne
 * s'obtient pas en achetant du temps : délai d'attente par défaut, pas de relance
 * locale, pas de marquage lent. Garde statique, lit les sources sans les exécuter.
 */
const frontendRoot = resolve(__dirname, '..', '..')
const spec = readFileSync(resolve(frontendRoot, 'e2e/products.spec.ts'), 'utf8')
const config = readFileSync(resolve(frontendRoot, 'playwright.config.ts'), 'utf8')

const NAV_TITLE = "test('navigation liste vers détail produit et retour'"

function navigationTestBlock(): string {
  const start = spec.indexOf(NAV_TITLE)
  expect(start, 'test de navigation introuvable dans products.spec.ts').toBeGreaterThan(-1)
  const rest = spec.slice(start + NAV_TITLE.length)
  const next = rest.search(/\n {2}(\/\/ Critère|test\()/)
  return next === -1 ? rest : rest.slice(0, next)
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('#558 — navigation test keeps default expect budget, no retries, no slow marker', () => {
  it('le test de navigation ne relève aucun délai, ne se marque pas lent', () => {
    const block = stripComments(navigationTestBlock())
    expect(block).not.toMatch(/timeout\s*:/)
    expect(block).not.toMatch(/\.setTimeout\s*\(/)
    expect(block).not.toMatch(/test\.slow\s*\(/)
    expect(block).not.toMatch(/test\.describe\.configure/)
    expect(block).not.toMatch(/retries/)
  })

  it('aucun marquage lent ni relance au niveau du fichier de spec', () => {
    const code = stripComments(spec)
    expect(code).not.toMatch(/test\.slow\s*\(/)
    expect(code).not.toMatch(/test\.setTimeout\s*\(/)
    expect(code).not.toMatch(/test\.describe\.configure\s*\(\s*\{[^}]*(retries|timeout)/)
    expect(code).not.toMatch(/test\.use\s*\(\s*\{[^}]*(actionTimeout|navigationTimeout)/)
  })

  it('la config Playwright garde le délai expect par défaut et zéro relance locale', () => {
    const code = stripComments(config)
    // Pas de bloc `expect: { timeout }` ni de `timeout` de test au niveau racine.
    expect(code).not.toMatch(/^\s{2}expect\s*:/m)
    expect(code).not.toMatch(/^\s{2}timeout\s*:/m)
    expect(code).not.toMatch(/actionTimeout|navigationTimeout/)
    // Relances : seulement en CI, 0 en local.
    expect(code).toMatch(/retries\s*:\s*process\.env\.CI\s*\?\s*\d+\s*:\s*0\s*,/)
    expect(code).not.toMatch(/test\.slow|slow\s*:/)
  })
})
