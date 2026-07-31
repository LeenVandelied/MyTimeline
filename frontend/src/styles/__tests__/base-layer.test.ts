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

/** #340 — `landing.css` n'est PAS importé par `globals.css` : `app/layout.tsx` le
 *  charge comme une 2ᵉ feuille, APRÈS. On recompose donc le document tel que le
 *  navigateur le voit pour pouvoir raisonner sur les layers des deux fichiers. */
const LANDING = fileURLToPath(new URL('../landing.css', import.meta.url))
const DOCUMENT_FIXTURE = fileURLToPath(new URL('../__document__.css', import.meta.url))
const AVATAR_FIXTURE = fileURLToPath(new URL('../__avatar-regression__.css', import.meta.url))
/** Témoin de la régression `line-height` layerisé (1ʳᵉ passe de #339). */
const HEADING_LEADING_FIXTURE = fileURLToPath(new URL('../__heading-leading-regression__.css', import.meta.url))
const SCROLLBAR_FIXTURE = fileURLToPath(new URL('../__scrollbar-regression__.css', import.meta.url))
const PREVIEW_FIXTURE = fileURLToPath(new URL('../__preview-regression__.css', import.meta.url))
/** Témoin du `:focus-visible` non layerisé (#383, Sprint 58). */
const FOCUS_FIXTURE = fileURLToPath(new URL('../__focus-regression__.css', import.meta.url))

/** Force l'émission des utilitaires dont on veut prouver le rang de layer,
 *  sans dépendre du scan de contenu (qui varie avec le `from` de compilation). */
const FORCE_UTILITIES =
  '@source inline("rounded-xl rounded-sm scrollbar-none text-lg outline-hidden");\n'

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

/**
 * Garde-fou de CASCADE — `line-height` des titres (régression de la 1ʳᵉ passe #339).
 *
 * CONTEXTE. La 1ʳᵉ passe de #339 a layerisé les 5 propriétés `h1..h6` EN BLOC.
 * Or une utilitaire `text-*` de Tailwind 4 ne pose pas que `font-size` : elle pose
 * AUSSI un `line-height` apparié, `var(--tw-leading, var(--text-lg--line-height))`,
 * dont le fallback est un défaut Tailwind émis dans `@layer theme` et NON remappé
 * par notre `@theme inline`. Layerisé, le `line-height` du DS cédait donc devant
 * cet appariement, et les 28 titres du dépôt portant `text-*` SANS `leading-*`
 * explicite dérivaient : `h2.text-lg` passait de 29,16px (1.08) à 42px (1,5556).
 * Symptôme : `e2e/settings-mobile.spec.ts:19` rouge (sheet grandi interceptant le
 * clic du backdrop). Correctif : `line-height` ressort HORS layer, seul.
 *
 * CE QUE CES TESTS PROUVENT. (1) la déclaration GAGNANTE de `line-height` pour un
 * `h1..h6` portant `text-lg` est bien `var(--leading-tight)` et non l'appariement
 * de `text-lg` — établi en comparant les RANGS DE LAYER, hors layer battant tout
 * layer quelle que soit la spécificité ; (2) le conflit est RÉEL (on vérifie que
 * `.text-lg` émet bien un `line-height` concurrent, sinon le test passerait à vide
 * si Tailwind cessait d'apparier) ; (3) le détecteur rougit sur la forme régressée.
 *
 * CE QU'ILS NE PROUVENT PAS. Aucun rendu : les 42px / 29,16px ci-dessus viennent
 * du navigateur et du calcul `27px × 1.5556`, pas d'ici. jsdom ne résout pas les
 * `@layer` — un test RTL sur `className` ne détecterait RIEN.
 */
describe('cascade @layer — line-height des titres ne cède PAS devant `text-*`', () => {
  const DS_HEADINGS = 'h1, h2, h3, h4, h5, h6'

  /** Rang de layer : hors layer bat tout layer ; sinon, position dans l'ordre déclaré. */
  function layerRank(chain: string[], order: string[]): number {
    if (chain.length === 0) return Number.POSITIVE_INFINITY
    return order.indexOf(chain[chain.length - 1])
  }

  it(
    'laisse `h1..h6 { line-height }` HORS layer, donc gagnant sur le `line-height` apparié à `text-lg`',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8') + FORCE_UTILITIES, GLOBALS)
      const order = declaredLayerOrder(root)

      // 1. Le conflit est RÉEL : `.text-lg` pose bien un `line-height` concurrent,
      //    dans `utilities`. Sans cette assertion, le test passerait à vide le jour
      //    où Tailwind cesserait d'apparier taille et interligne.
      const textLgLeading: string[][] = []
      root.walkRules((rule) => {
        if (rule.selector.trim() !== '.text-lg') return
        rule.walkDecls('line-height', () => {
          textLgLeading.push(layerChain(rule))
        })
      })
      expect(textLgLeading.length).toBeGreaterThan(0)
      for (const chain of textLgLeading) expect(chain).toContain('utilities')

      // 2. La règle `line-height` du DS sur `h1..h6` existe et est HORS layer.
      const headingLeading = layersOf(root, DS_HEADINGS, /line-height:\s*var\(--leading-tight\)/)
      expect(headingLeading.length).toBeGreaterThan(0)
      for (const chain of headingLeading) expect(chain).toEqual([])

      // 3. C'est donc elle qui GAGNE. Le rang de layer précède la spécificité :
      //    peu importe que `.text-lg` (0-1-0) soit plus spécifique que `h2` (0-0-1).
      const headingRank = Math.max(...headingLeading.map((c) => layerRank(c, order)))
      const textLgRank = Math.max(...textLgLeading.map((c) => layerRank(c, order)))
      expect(headingRank).toBeGreaterThan(textLgRank)

      // 4. Les 4 AUTRES propriétés restent layerisées — le correctif ne défait
      //    pas #339 : `mb-*` / `font-*` doivent toujours l'emporter sur le DS.
      const marginHits = layersOf(root, DS_HEADINGS, /margin:\s*0/)
      expect(marginHits.length).toBeGreaterThan(0)
      for (const chain of marginHits) expect(chain).toContain('base')
    },
    30_000,
  )

  it(
    'rougit si `line-height` est remis dans @layer base (le détecteur ne passe pas à vide)',
    async () => {
      // Reproduit EXACTEMENT la régression : les 5 propriétés en bloc dans `base`.
      // ⚠ `from` unique obligatoire (mémoïsation par chemin du plugin Tailwind).
      const regressed =
        "@import 'tailwindcss';\n" +
        `@layer base {\n  ${DS_HEADINGS} { line-height: var(--leading-tight); margin: 0; }\n}\n`
      const { root } = await compile(regressed, HEADING_LEADING_FIXTURE)

      const headingLeading = layersOf(root, DS_HEADINGS, /line-height:\s*var\(--leading-tight\)/)
      expect(headingLeading.length).toBeGreaterThan(0)
      // Sous la forme régressée, AUCUNE occurrence n'est hors layer — c'est
      // exactement ce que l'assertion 2 du test ci-dessus refuse.
      expect(headingLeading.some((chain) => chain.length === 0)).toBe(false)
      for (const chain of headingLeading) expect(chain).toContain('base')
    },
    30_000,
  )
})

/**
 * Garde-fou de CASCADE — audit #340. Même mécanisme que `a` (#295) et `h1..h6`
 * (#339), MAIS sur des sélecteurs de CLASSE.
 *
 * CE QUE L'AUDIT A MESURÉ. L'énoncé de #340 restreignait le défaut aux sélecteurs
 * d'élément : c'est faux. Le CSS hors layer bat le CSS layerisé quel que soit le
 * type de sélecteur — une classe hors layer écrase donc elle aussi les utilitaires
 * de `@layer utilities`. Trois conflits RÉELS ont été démontrés au dépôt (une
 * utilitaire écrite dans le code et silencieusement annulée), et eux seuls sont
 * corrigés ici :
 *   1. `.mt-avatar` (7px) annulait `rounded-sm` (5px) — `AppShell` ;
 *   2. `.timeline-preview` (10px) annulait `rounded-xl` (14px) — `TimelinePreviewSection` ;
 *   3. `* { scrollbar-width: thin }` annulait l'utilitaire `scrollbar-none`
 *      (`ProductCarousel`, `DensityRibbon`) — invisible sous Chromium, où l'autre
 *      moitié de l'utilitaire (`::-webkit-scrollbar{display:none}`) faisait le
 *      travail sur une propriété DIFFÉRENTE, donc jamais en conflit.
 *
 * CE QUE CES TESTS NE PROUVENT PAS. Aucun rendu, aucun pixel : que le coin fasse
 * bien 14px relève de l'œil / de l'E2E. jsdom ne résout pas les `@layer`.
 * Ils ne disent rien non plus des ~770 lignes de `.mt-*` restées hors layer : elles
 * ne sont PAS en conflit aujourd'hui (aucune n'est posée à côté d'une utilitaire),
 * cf. `docs/memory/sprints/sprint-53/audit-css-layers-340.md`.
 */
describe('cascade @layer — classes de composant (#340)', () => {
  it(
    'encapsule `.mt-avatar` dans @layer components, sous les utilitaires',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8') + FORCE_UTILITIES, GLOBALS)

      // `--radius-md` discrimine la règle du DS de tout homonyme.
      const hits = layersOf(root, '.mt-avatar', /--radius-md\b/)
      expect(hits.length).toBeGreaterThan(0)
      for (const chain of hits) {
        expect(chain).toContain('components')
      }

      // L'utilitaire réellement posée par `AppShell` vit dans `utilities`…
      const rounded = layersOf(root, '.rounded-sm', /border-radius:/)
      expect(rounded.length).toBeGreaterThan(0)
      for (const chain of rounded) {
        expect(chain).toContain('utilities')
      }

      // …et `components` précède `utilities` : à importance égale, le layer le
      // plus tardif gagne → `rounded-sm` l'emporte enfin sur le défaut DS.
      const order = declaredLayerOrder(root)
      expect(order.indexOf('components')).toBeLessThan(order.indexOf('utilities'))

      // Les modificateurs restent dans le MÊME layer : leur victoire sur
      // `.mt-avatar` tient à l'ordre du document, pas au rang de layer.
      const round = layersOf(root, '.mt-avatar--round', /border-radius:\s*50%/)
      expect(round.length).toBeGreaterThan(0)
      for (const chain of round) {
        expect(chain).toContain('components')
      }
    },
    30_000,
  )

  it(
    'détecte réellement un `.mt-avatar` NON layerisé (le détecteur ne passe pas à vide)',
    async () => {
      // ⚠ `from` unique obligatoire : le plugin PostCSS de Tailwind mémoïse par
      // chemin d'entrée — réutiliser GLOBALS renverrait le CSS réel (test à vide).
      const regressed = "@import 'tailwindcss';\n.mt-avatar { border-radius: var(--radius-md); }\n"
      const { root } = await compile(regressed, AVATAR_FIXTURE)

      const hits = layersOf(root, '.mt-avatar', /--radius-md\b/)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )

  it(
    'encapsule le reset scrollbar `*` dans @layer base, sous `scrollbar-none`',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8') + FORCE_UTILITIES, GLOBALS)

      // `scrollbar-width: thin` discrimine du preflight Tailwind, qui cible
      // `*, ::after, ::before…` et ne touche jamais aux scrollbars.
      const hits = layersOf(root, '*', /scrollbar-width:\s*thin/)
      expect(hits.length).toBeGreaterThan(0)
      for (const chain of hits) {
        expect(chain).toContain('base')
      }

      // L'utilitaire `@utility scrollbar-none` de globals.css sort bien dans
      // `utilities`, donc APRÈS `base` : `scrollbar-width: none` gagne enfin —
      // y compris sous Firefox, seul moteur où l'utilitaire n'a pas de repli
      // `::-webkit-scrollbar { display: none }`.
      const util = layersOf(root, '.scrollbar-none', /scrollbar-width:\s*none/)
      expect(util.length).toBeGreaterThan(0)
      for (const chain of util) {
        expect(chain).toContain('utilities')
      }

      const order = declaredLayerOrder(root)
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('utilities'))
    },
    30_000,
  )

  it(
    'détecte réellement un reset scrollbar NON layerisé (le détecteur ne passe pas à vide)',
    async () => {
      const regressed = "@import 'tailwindcss';\n* { scrollbar-width: thin; }\n"
      const { root } = await compile(regressed, SCROLLBAR_FIXTURE)

      const hits = layersOf(root, '*', /scrollbar-width:\s*thin/)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )

  it(
    'encapsule `.timeline-preview` dans @layer components, sous les utilitaires',
    async () => {
      // `landing.css` est une feuille SÉPARÉE, chargée après `globals.css` par
      // `app/layout.tsx`. On recompose le document dans cet ordre : c'est la
      // déclaration `@layer theme, base, components, utilities;` émise par
      // globals.css qui fixe le rang, et `landing.css` ne fait que REJOINDRE le
      // layer `components` déjà déclaré.
      const document = readFileSync(GLOBALS, 'utf8') + FORCE_UTILITIES + readFileSync(LANDING, 'utf8')
      const { root } = await compile(document, DOCUMENT_FIXTURE)

      const hits = layersOf(root, '.timeline-preview', /--radius-lg\b/)
      expect(hits.length).toBeGreaterThan(0)
      for (const chain of hits) {
        expect(chain).toContain('components')
      }

      const rounded = layersOf(root, '.rounded-xl', /border-radius:/)
      expect(rounded.length).toBeGreaterThan(0)
      for (const chain of rounded) {
        expect(chain).toContain('utilities')
      }

      const order = declaredLayerOrder(root)
      expect(order.indexOf('components')).toBeLessThan(order.indexOf('utilities'))
    },
    30_000,
  )

  it(
    'détecte réellement un `.timeline-preview` NON layerisé (le détecteur ne passe pas à vide)',
    async () => {
      const regressed = "@import 'tailwindcss';\n.timeline-preview { border-radius: var(--radius-lg); }\n"
      const { root } = await compile(regressed, PREVIEW_FIXTURE)

      const hits = layersOf(root, '.timeline-preview', /--radius-lg\b/)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )
})

/**
 * Garde-fou de CASCADE — indicateur de focus `:focus-visible` (#383, Sprint 58).
 *
 * CONTEXTE. `ds/tokens/base.css` pose `:focus-visible { outline: 2px solid
 * var(--color-focus); outline-offset: 2px }`. Tant que cette règle vivait HORS
 * layer, elle battait TOUT CSS layerisé : elle annulait les `outline-hidden` /
 * `outline-none` du dépôt (dont celui, VOULU, de `ui/popover.tsx` — un panneau
 * n'est pas un contrôle) et imposait au passage un `border-radius` parasite.
 * #383 l'a fait entrer dans `@layer base`, APRÈS avoir nettoyé les 31 sites
 * applicatifs qui posaient un `outline-*` sans indicateur de remplacement.
 *
 * CE QUE CE TEST PROUVE. Sur l'AST du CSS réellement compilé : (1) la règle
 * `:focus-visible` du DS sort dans `@layer base` et non à la racine ;
 * (2) l'utilitaire `outline-hidden` sort dans `@layer utilities` ; (3) l'ordre
 * déclaré place `base` AVANT `utilities`. Ces trois faits impliquent, par les
 * règles de cascade CSS, qu'un `outline-hidden` explicite l'emporte enfin sur
 * le contour du DS — sémantique attendue depuis #383. Le détecteur ne passe pas
 * à vide : le second test le fait rougir sur la forme régressée (règle hors layer).
 *
 * CE QUE CE TEST NE PROUVE **PAS**. Il ne détecte AUCUNE réintroduction d'un
 * anneau local (`ring-2`, `focus:ring-*`, `outline-none`) dans un `.tsx` : il ne
 * lit que du CSS, jamais les composants. Une telle vérification demanderait un
 * grep sur les sources JSX — fragile (chaînes construites, `cn()`, `cva`,
 * classes venues d'une lib) et hors du contrat de ce fichier. Il ne prouve pas
 * davantage que le contour PEINT à l'écran, ni son contraste : cela relève de la
 * mesure au navigateur consignée dans `ds/a11y-audit.md` §8.
 */
describe('cascade @layer — contour :focus-visible (#383)', () => {
  it(
    'encapsule `:focus-visible { outline }` dans @layer base, sous `outline-hidden`',
    async () => {
      const { root } = await compile(readFileSync(GLOBALS, 'utf8') + FORCE_UTILITIES, GLOBALS)

      // 1. La règle de focus du DS est layerisée dans `base` (et pas à la racine).
      //    `--color-focus` la discrimine de tout homonyme (preflight, Radix, etc.).
      const focusHits = layersOf(root, ':focus-visible', /--color-focus\b/)
      expect(focusHits.length).toBeGreaterThan(0)
      for (const chain of focusHits) {
        expect(chain).toContain('base')
      }

      // 2. L'utilitaire d'échappement vit dans `utilities`. `outline-hidden` et
      //    NON `outline-none` : lui seul émet le repli `@media (forced-colors: active)`.
      const utilityHits = layersOf(root, '.outline-hidden', /outline-style:\s*none/)
      expect(utilityHits.length).toBeGreaterThan(0)
      for (const chain of utilityHits) {
        expect(chain).toContain('utilities')
      }

      // 3. `base` précède `utilities` : à importance égale, le layer le plus
      //    tardif gagne → `outline-hidden` l'emporte enfin sur le contour du DS.
      const order = declaredLayerOrder(root)
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('utilities'))
    },
    30_000,
  )

  it(
    'détecte réellement un `:focus-visible` NON layerisé (le détecteur ne passe pas à vide)',
    async () => {
      // Reproduit EXACTEMENT la régression d'avant #383 : la règle hors de tout layer.
      // ⚠ `from` unique obligatoire (mémoïsation par chemin du plugin Tailwind).
      const regressed =
        "@import 'tailwindcss';\n:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }\n"
      const { root } = await compile(regressed, FOCUS_FIXTURE)

      const focusHits = layersOf(root, ':focus-visible', /--color-focus\b/)
      expect(focusHits.length).toBeGreaterThan(0)
      // Au moins une occurrence hors layer → exactement ce que l'assertion 1 refuse.
      expect(focusHits.some((chain) => chain.length === 0)).toBe(true)
    },
    30_000,
  )
})
