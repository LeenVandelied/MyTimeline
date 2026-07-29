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
/** Idem pour le témoin `h1..h6` — voir la note de mémoïsation plus bas. */
const HEADING_FIXTURE = fileURLToPath(new URL('../__heading-regression__.css', import.meta.url))

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

/** Ordre déclaré des layers, lu sur l'instruction `@layer a, b, c;`. */
function declaredLayerOrder(root: Container): string[] {
  let order: string[] = []
  root.walkAtRules('layer', (at) => {
    if (order.length || at.nodes) return
    order = at.params.split(',').map((name) => name.trim())
  })
  return order
}

/**
 * Valeur GAGNANTE d'une variable déclarée sur `:root`, en appliquant la
 * précédence des cascade layers : hors layer bat tout layer ; entre layers,
 * le plus tardif dans l'ordre déclaré gagne ; à rang égal, l'ordre du
 * document tranche. Toutes les déclarations concernées ici sont portées par
 * `:root` / `:root, :host` — spécificité comparable, la comparaison est donc
 * bien réductible au seul rang de layer.
 */
function winningRootVar(root: Container, prop: string): string | undefined {
  const order = declaredLayerOrder(root)
  let best: { value: string; rank: number } | undefined
  root.walkRules((rule) => {
    if (!rule.selector.includes(':root')) return
    rule.walkDecls(prop, (decl) => {
      const chain = layerChain(rule)
      // Le layer de tête (le plus externe) porte la précédence.
      const outermost = chain[chain.length - 1]
      const rank = chain.length === 0 ? Number.POSITIVE_INFINITY : order.indexOf(outermost)
      if (!best || rank >= best.rank) best = { value: decl.value.trim(), rank }
    })
  })
  return best?.value
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

/**
 * Garde-fou de CASCADE — titres (#339), même famille de bug que ci-dessus.
 *
 * CONTEXTE. `ds/tokens/base.css` pose les défauts d'élément `h1..h6`
 * (`margin: 0`, `font-weight`, `line-height`, `letter-spacing`, `font-family`).
 * Hors layer, ces défauts battaient TOUTE utilitaire Tailwind posée sur un
 * titre : `<h4 class="mb-3 font-bold">` (FooterSection) rendait sans marge et
 * en 600. Le S48 n'avait layerisé que `a` ; #339 solde la dette sur `h1..h6`.
 *
 * CE QUE CES TESTS PROUVENT. (1) la règle `h1..h6` du DS sort compilée dans
 * `@layer base` ; (2) le détecteur ne passe pas à vide ; (3) l'utilitaire
 * `leading-tight` résout bien le token DS 1.08 et non le défaut Tailwind 1.25.
 *
 * CE QU'ILS NE PROUVENT PAS. Aucun rendu, aucune géométrie : que `mb-3` fasse
 * 12 px à l'écran relève de l'œil / de l'E2E. jsdom ne résout pas les `@layer`.
 */
describe('cascade @layer — défauts de titre h1..h6', () => {
  const DS_HEADINGS = 'h1, h2, h3, h4, h5, h6'

  it(
    'encapsule les défauts `h1..h6` du DS dans @layer base',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8'), GLOBALS)

      // `--font-display` discrimine la règle du DS du reset preflight de
      // Tailwind, qui porte le même sélecteur mais seulement font-size/weight.
      const headingHits = layersOf(root, DS_HEADINGS, /--font-display\b/)
      expect(headingHits.length).toBeGreaterThan(0)
      for (const chain of headingHits) {
        expect(chain).toContain('base')
      }

      // `margin: 0` — la déclaration qui annulait les `mb-*` — est bien dans
      // le même bloc layerisé, et non restée à la racine.
      const marginHits = layersOf(root, DS_HEADINGS, /margin:\s*0/)
      expect(marginHits.length).toBeGreaterThan(0)
      for (const chain of marginHits) {
        expect(chain).toContain('base')
      }
    },
    30_000,
  )

  it(
    'détecte réellement des défauts de titre NON layerisés (le détecteur ne passe pas à vide)',
    async () => {
      // ⚠ `from` DOIT différer de GLOBALS *et* des autres fixtures : le plugin
      // PostCSS de Tailwind mémoïse la compilation par chemin d'entrée.
      const regressed = `@import 'tailwindcss';\n${DS_HEADINGS} { font-family: var(--font-display); margin: 0; }\n`
      const { root } = await compile(regressed, HEADING_FIXTURE)

      const headingHits = layersOf(root, DS_HEADINGS, /--font-display\b/)
      expect(headingHits.length).toBeGreaterThan(0)
      expect(headingHits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )

  it(
    'résout `leading-tight` sur le token DS (1.08) et non sur le défaut Tailwind (1.25)',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8'), GLOBALS)

      // 1. L'utilitaire délègue à la variable — il n'inline aucune constante.
      const leadingRules: string[] = []
      root.walkRules((rule) => {
        if (rule.selector.trim() !== '.leading-tight') return
        expect(layerChain(rule)).toContain('utilities')
        rule.walkDecls('line-height', (decl) => {
          leadingRules.push(decl.value.trim())
        })
      })
      expect(leadingRules.length).toBeGreaterThan(0)
      for (const value of leadingRules) {
        expect(value).toBe('var(--leading-tight)')
      }

      // 2. La déclaration GAGNANTE de `--leading-tight` est celle du DS.
      //    `ds/tokens/typography.css` la pose dans un `:root` hors layer,
      //    homonyme du namespace de thème Tailwind ; hors layer bat
      //    `@layer theme`, donc 1.08 l'emporte sur 1.25. C'est CE point qui
      //    tient la valeur — pas le mapping `@theme` (cf. assertion 3).
      expect(winningRootVar(root, '--leading-tight')).toBe('1.08')

      // 3. Le mapping `--leading-*` de `@theme` (globals.css) est présent.
      //    HONNÊTETÉ : il est REDONDANT aujourd'hui — le retirer ne changerait
      //    aucune valeur rendue (mesuré par compilation contrefactuelle). On
      //    le verrouille quand même : il est la seule protection si l'audit de
      //    layerisation (#340) fait entrer les `:root` de tokens dans un layer
      //    situé avant `theme`, cas où les défauts Tailwind reprendraient la
      //    main sur tout `leading-*` du produit.
      const themeDecls: string[] = []
      root.walkRules((rule) => {
        if (!rule.selector.includes(':root')) return
        if (!layerChain(rule).includes('theme')) return
        rule.walkDecls('--leading-tight', (decl) => {
          themeDecls.push(decl.value.trim())
        })
      })
      expect(themeDecls).toContain('var(--leading-tight)')
      expect(themeDecls).not.toContain('1.25')
    },
    30_000,
  )
})
