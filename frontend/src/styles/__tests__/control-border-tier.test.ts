// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container } from 'postcss'
import tailwind from '@tailwindcss/postcss'

/**
 * Garde-fou de TIER DE BORDURE — WCAG 1.4.11 (#293 / #336).
 *
 * CONTEXTE. Le DS Graphite a trois tokens de filet (`ds/readme.md` §
 * « Border tiers ») : `--color-rule` (1.21:1) et `--color-rule-strong`
 * (1.46:1) sont DÉCORATIFS ; `--color-rule-emphasis` (`--gray-450`, ≥3.97:1
 * sur les quatre fonds) est le tier FONCTIONNEL. Quand la bordure est la
 * seule chose qui signale l'existence d'un contrôle (input non rempli,
 * bouton outline, contour de checkbox/radio/switch), 1.4.11 impose ≥3:1 :
 * seul `rule-emphasis` le tient.
 *
 * CE QUE CE TEST PROUVE. (1) Chaque sélecteur de contrôle listé ci-dessous
 * déclare bien sa bordure sur `--color-rule-emphasis` dans `core.css`, et
 * aucun ne retombe sur `--color-rule-strong`. (2) Le pont Tailwind
 * `--color-input` (utilisé par `Input`, `SelectTrigger`, `Button
 * variant="outline"` de shadcn) pointe sur le tier fonctionnel, pas sur le
 * tier décoratif — c'est le mécanisme qui habille les formulaires d'auth.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun ratio n'est calculé ici, et jsdom ne
 * résout ni `@layer` ni layout (PIT-S48/PAT-S48-001) : la conformité réelle
 * se mesure au navigateur avec `getComputedStyle`. Ce test empêche
 * seulement la RÉGRESSION silencieuse d'un tier vers l'autre.
 */

const CORE = fileURLToPath(new URL('../ds/components/core.css', import.meta.url))
const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))

/**
 * Sélecteurs dont la bordure EST l'affordance du contrôle. Ajouter ici tout
 * nouveau contrôle dont le contour porte la limite visuelle.
 */
const FUNCTIONAL_CONTROL_SELECTORS = [
  '.mt-btn--secondary', // bouton outline
  '.mt-iconbtn', // bouton icône seule
  '.mt-input, .mt-textarea', // champ non rempli
  '.mt-select__trigger', // déclencheur de select
  '.mt-check__box', // contour de checkbox
  '.mt-radio__dot', // contour de radio
  '.mt-switch__track', // piste d'interrupteur (état off)
] as const

/** Déclarations de bordure d'une règle, tous raccourcis confondus. */
function borderDeclsOf(root: Container, selector: string): string[] {
  const found: string[] = []
  root.walkRules((rule) => {
    if (rule.selector.replace(/\s+/g, ' ').trim() !== selector) return
    rule.walkDecls(/^border(-[a-z]+)*$|^border-color$/, (decl) => {
      found.push(decl.value)
    })
  })
  return found
}

describe('tier de bordure des contrôles — WCAG 1.4.11', () => {
  const core = postcss.parse(readFileSync(CORE, 'utf8'), { from: CORE }) as unknown as Container

  it.each(FUNCTIONAL_CONTROL_SELECTORS)(
    '%s porte le tier fonctionnel `rule-emphasis`',
    (selector) => {
      const decls = borderDeclsOf(core, selector)

      // Cas témoin négatif : si le sélecteur disparaît ou est renommé, le test
      // doit rougir plutôt que passer à vide.
      expect(decls.length).toBeGreaterThan(0)

      expect(decls.some((v) => v.includes('--color-rule-emphasis'))).toBe(true)
      for (const value of decls) {
        expect(value).not.toMatch(/--color-rule-strong\b/)
        expect(value).not.toMatch(/--color-rule\)/)
      }
    },
  )

  it('laisse les filets décoratifs sur le tier décoratif (pas de migration aveugle)', () => {
    // `core.css` DOIT conserver des `rule-strong` : cadres de panneaux, filets
    // de carte, lignes de tableau. Zéro occurrence signalerait un `sed` massif.
    const remaining = readFileSync(CORE, 'utf8').match(/var\(--color-rule-strong\)/g) ?? []
    expect(remaining.length).toBeGreaterThan(0)
  })

  it(
    'le pont shadcn `--color-input` pointe sur le tier fonctionnel',
    async () => {
      const result = await postcss([tailwind()]).process(readFileSync(GLOBALS, 'utf8'), {
        from: GLOBALS,
      })
      const root = result.root as unknown as Container

      let inputToken: string | undefined
      root.walkDecls('--color-input', (decl) => {
        inputToken = decl.value
      })

      expect(inputToken).toBeDefined()
      expect(inputToken).toContain('--color-rule-emphasis')
      expect(inputToken).not.toContain('--color-rule-strong')
    },
    30_000,
  )
})
