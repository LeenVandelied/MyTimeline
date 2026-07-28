// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container } from 'postcss'
import tailwind from '@tailwindcss/postcss'

/**
 * Garde-fou de CASCADE — régression « CTA invisibles » (sprint 48).
 *
 * CONTEXTE. `ds/tokens/base.css` pose `a { color: var(--color-accent) }`. Tant
 * que cette règle vivait HORS layer, elle battait les utilitaires Tailwind
 * (`@layer utilities`) quelle que soit la spécificité — le CSS non-layerisé
 * gagne toujours contre le CSS layerisé. Depuis `<Button asChild><Link>`
 * (#295), le `<a>` EST le bouton et porte donc `text-accent-ink` : accent sur
 * accent, contraste 1:1, boutons invisibles.
 *
 * CE QUE CE TEST PROUVE. Il compile la vraie chaîne CSS (`globals.css` +
 * `@import 'tailwindcss'`) avec le vrai plugin PostCSS de Tailwind 4, puis
 * vérifie sur l'AST de sortie que (1) la règle `a` du DS est bien encapsulée
 * dans `@layer base`, (2) les utilitaires de couleur sont dans
 * `@layer utilities`, (3) l'ordre déclaré des layers place `base` AVANT
 * `utilities`. Ces trois faits impliquent, par les règles de cascade CSS, que
 * `text-accent-ink` l'emporte sur le défaut d'élément.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun moteur de cascade ne tourne ici : ni
 * couleur calculée, ni contraste, ni rendu. jsdom ne résout pas la précédence
 * des `@layer` — un test RTL sur `className` ne détecterait RIEN (les classes
 * étaient déjà présentes AVANT le correctif, c'est précisément le piège). La
 * vérification visuelle (blanc sur bleu) reste du ressort de l'E2E / de l'œil.
 */

const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))
/** Chemin virtuel (jamais lu ni écrit) pour la compilation témoin. */
const REGRESSION_FIXTURE = fileURLToPath(new URL('../__cascade-regression__.css', import.meta.url))

type Compiled = { root: Container }

async function compile(css: string, from: string): Promise<Compiled> {
  const result = await postcss([tailwind()]).process(css, { from })
  return { root: result.root as unknown as Container }
}

/** Chaîne des at-rules parentes d'un nœud, de la plus proche à la racine. */
function layerChain(node: { parent?: unknown }): string[] {
  const chain: string[] = []
  let current = node.parent as { type?: string; name?: string; params?: string; parent?: unknown } | undefined
  while (current && current.type !== 'root') {
    if (current.type === 'atrule' && current.name === 'layer') {
      chain.push((current.params ?? '').trim())
    }
    current = current.parent as typeof current
  }
  return chain
}

/** Layers contenant une règle dont le sélecteur et une déclaration matchent. */
function layersOf(root: Container, selector: string, declMatch: RegExp): string[][] {
  const hits: string[][] = []
  root.walkRules((rule) => {
    if (rule.selector.trim() !== selector) return
    if (!declMatch.test(rule.toString())) return
    hits.push(layerChain(rule))
  })
  return hits
}

describe('cascade @layer — règle de base des liens', () => {
  it(
    "encapsule `a { color: accent }` dans @layer base, sous les utilitaires",
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8'), GLOBALS)

      // 1. La règle `a` du DS est layerisée dans `base` (et pas à la racine).
      const anchorHits = layersOf(root, 'a', /--color-accent\b/)
      expect(anchorHits.length).toBeGreaterThan(0)
      for (const chain of anchorHits) {
        expect(chain).toContain('base')
      }

      // 2. Les utilitaires de couleur texte vivent dans `utilities`.
      const utilityHits = layersOf(root, '.text-accent-ink', /color:/)
      expect(utilityHits.length).toBeGreaterThan(0)
      for (const chain of utilityHits) {
        expect(chain).toContain('utilities')
      }

      // 3. L'ordre déclaré des layers place `base` AVANT `utilities` :
      //    à égalité de « importance », le layer le plus tardif gagne.
      let order: string[] = []
      root.walkAtRules('layer', (at) => {
        if (order.length || at.nodes) return // on cherche l'instruction `@layer a, b, c;`
        order = at.params.split(',').map((name) => name.trim())
      })
      expect(order).toContain('base')
      expect(order).toContain('utilities')
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('utilities'))
    },
    30_000,
  )

  it(
    'détecte réellement une règle de lien NON layerisée (le détecteur ne passe pas à vide)',
    async () => {
      // Reproduit la régression : même déclaration, hors de tout `@layer`.
      // ⚠ `from` DOIT différer de GLOBALS : le plugin PostCSS de Tailwind
      // mémoïse la compilation par chemin d'entrée — réutiliser GLOBALS
      // renverrait le CSS réel et ferait passer ce test à vide.
      const regressed = "@import 'tailwindcss';\na { color: var(--color-accent); }\n"
      const { root } = await compile(regressed, REGRESSION_FIXTURE)

      const anchorHits = layersOf(root, 'a', /--color-accent\b/)
      expect(anchorHits.length).toBeGreaterThan(0)
      // Au moins une occurrence hors layer → c'est exactement ce que le test
      // ci-dessus refuse. Sans cette assertion, le premier test pourrait passer
      // pour de mauvaises raisons (sélecteur jamais trouvé, matcher trop laxe).
      expect(anchorHits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )
})
