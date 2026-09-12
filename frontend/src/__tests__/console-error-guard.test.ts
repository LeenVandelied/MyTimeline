import { beforeAll, describe, expect, it } from 'vitest'
import { ESLint, type Linter } from 'eslint'

/**
 * #258 — Fige le comportement de la garde anti-fuite credentials
 * (`no-restricted-syntax` sur `console.error`) définie dans eslint.config.mjs.
 *
 * Deux volets :
 *  1. FREEZE — la règle réelle (chargée via l'API ESLint, donc sourcée depuis
 *     eslint.config.mjs) doit exposer EXACTEMENT 2 selectors (mono-arg + 2-args).
 *     Retirer la règle ou un selector fait échouer ce test.
 *  2. COMPORTEMENT — on lint des fixtures avec la règle réelle et on vérifie les
 *     cas valides (safeErrorMessage, objet littéral, message string, boundary
 *     disable) et invalides (identifiant brut mono-arg et 2-args).
 *
 * Le lint des fixtures tourne avec un config minimal (parser espree par défaut,
 * uniquement cette règle) pour rester rapide et isolé des plugins next/storybook.
 */
describe('garde anti-fuite credentials console.error (#160/#258)', () => {
  let ruleEntry: Linter.RuleEntry

  beforeAll(async () => {
    // Charge la config RÉELLE (eslint.config.mjs dans le cwd = frontend/).
    const loader = new ESLint()
    const cfg = (await loader.calculateConfigForFile('src/services/authService.ts')) as {
      rules: Record<string, Linter.RuleEntry>
    }
    ruleEntry = cfg.rules['no-restricted-syntax']
  })

  it('la règle est présente et configurée avec 2 selectors (mono-arg + 2-args)', () => {
    expect(Array.isArray(ruleEntry)).toBe(true)
    const [, ...selectors] = ruleEntry as unknown[]
    expect(selectors).toHaveLength(2)
    const joined = JSON.stringify(selectors)
    expect(joined).toContain('arguments.length=1')
    expect(joined).toContain('arguments.length=2')
  })

  async function countGuardErrors(code: string): Promise<number> {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: {
        rules: { 'no-restricted-syntax': ruleEntry },
      },
    })
    const [result] = await eslint.lintText(code, { filePath: 'demo.js' })
    return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax').length
  }

  it.each([
    ["console.error('msg', safeErrorMessage(error))", 0],
    ["console.error('msg', { status: 500 })", 0],
    ["console.error('plain message only')", 0],
    ['// eslint-disable-next-line no-restricted-syntax\nconsole.error(error)', 0],
  ] as const)('valide (0 erreur) : %s', async (code, expected) => {
    expect(await countGuardErrors(code)).toBe(expected)
  })

  it.each([
    ['console.error(error)', 1], // mono-arg brut — vecteur #258
    ["console.error('msg', error)", 1], // 2-args, 2e brut — vecteur #160
  ] as const)('invalide (1 erreur) : %s', async (code, expected) => {
    expect(await countGuardErrors(code)).toBe(expected)
  })
})
