// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container } from 'postcss'
import tailwind from '@tailwindcss/postcss'

/**
 * #72 — Garde-fou de CASCADE pour les classes Intl du DS (`ds/components/i18n.css` §7).
 *
 * POURQUOI. Le sprint 72 remplace des utilitaires Tailwind (`font-mono`,
 * `tabular-nums`, `text-2xs`) par `.mt-num` / `.mt-date--long` sur des dates et
 * des compteurs. Ce remplacement n'est neutre QUE si deux faits tiennent :
 *   (a) les classes DS sont HORS layer — elles battent donc `@layer utilities`
 *       quelle que soit la spécificité (cf. audit #340, `base.css`) ;
 *   (b) `.mt-num` ne pose ni taille, ni casse, ni graisse, ni couleur, et
 *       `.mt-date--long` pose exactement `--text-2xs` (13px).
 * Ces deux faits sont la JUSTIFICATION des substitutions faites dans
 * `WeekAgenda`, `KpiMarginalia`, `ProductList`, `ProductCarousel`, `StateScreen`.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun rendu : ni pixels, ni contraste, ni
 * largeur de colonne. Il compile la vraie chaîne CSS et raisonne sur l'AST.
 * jsdom n'applique aucune de ces feuilles — un test RTL sur `className` ne
 * dirait rien de la cascade. La tenue visuelle reste du ressort de l'E2E / de
 * l'œil.
 */

const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))

async function compile(): Promise<Container> {
  const result = await postcss([tailwind()]).process(readFileSync(GLOBALS, 'utf8'), {
    from: GLOBALS,
  })
  return result.root as unknown as Container
}

/** Chaîne des `@layer` parents d'une règle — vide = règle hors layer. */
function layerChain(node: { parent?: unknown }): string[] {
  const chain: string[] = []
  let current = node.parent as
    | { type?: string; name?: string; params?: string; parent?: unknown }
    | undefined
  while (current && current.type !== 'root') {
    if (current.type === 'atrule' && current.name === 'layer')
      chain.push((current.params ?? '').trim())
    current = current.parent as typeof current
  }
  return chain
}

/** Toutes les règles dont le sélecteur mentionne `className`. */
function rulesFor(root: Container, className: string) {
  const hits: { selector: string; chain: string[]; decls: Map<string, string> }[] = []
  root.walkRules((rule) => {
    if (
      !rule.selector.split(',').some((s) =>
        s
          .trim()
          .split(/[\s>+~]/)
          .some((p) => p.includes(className)),
      )
    )
      return
    const decls = new Map<string, string>()
    // Corps de bloc volontaire : une lambda-expression renverrait la `Map`, or le
    // callback de `walkDecls` est type `false | void` (toute valeur non-`false`
    // interromprait le parcours). L'expression compilait sous vitest mais cassait
    // `tsc --noEmit`, donc le job frontend en CI.
    rule.walkDecls((d) => {
      decls.set(d.prop, d.value.trim())
    })
    hits.push({ selector: rule.selector, chain: layerChain(rule), decls })
  })
  return hits
}

/** Union des propriétés déclarées par toutes les règles d'une classe. */
function propsOf(root: Container, className: string): Map<string, string> {
  const merged = new Map<string, string>()
  for (const hit of rulesFor(root, className)) for (const [k, v] of hit.decls) merged.set(k, v)
  return merged
}

describe('#72 — classes Intl du DS : rang de cascade', () => {
  it('`.mt-num` et `.mt-date--long` sont HORS layer (donc gagnantes sur @layer utilities)', async () => {
    const root = await compile()
    for (const cls of ['mt-num', 'mt-date--long', 'mt-date--short']) {
      const hits = rulesFor(root, cls)
      expect(hits.length, `aucune règle compilée pour .${cls}`).toBeGreaterThan(0)
      for (const hit of hits) {
        expect(hit.chain, `.${cls} ne doit pas être layerisée (${hit.selector})`).toEqual([])
      }
    }
  })

  it('les utilitaires Tailwind qu’elles remplacent vivent bien dans @layer utilities', async () => {
    const root = await compile()
    // Sans ce fait, « hors layer > layerisé » ne dit rien d'utile.
    const hits = rulesFor(root, 'font-mono')
    expect(hits.length).toBeGreaterThan(0)
    for (const hit of hits) expect(hit.chain).toContain('utilities')
  })
})

describe('#72 — ce que les classes Intl imposent (justification des substitutions)', () => {
  it('`.mt-num` ne pose ni taille, ni casse, ni graisse, ni couleur → substitution neutre', async () => {
    const root = await compile()
    const props = propsOf(root, 'mt-num')
    // Ce qu'elle DOIT apporter.
    expect(props.get('font-family')).toBe('var(--font-mono)')
    expect(props.get('font-variant-numeric')).toContain('tabular-nums')
    expect(props.get('unicode-bidi')).toBe('isolate')
    expect(props.get('direction')).toBe('ltr')
    // Ce qu'elle ne doit PAS toucher : sinon remplacer `font-mono … tabular-nums`
    // par `.mt-num` changerait le rendu (cf. StateScreen `text-2xl`, KpiMarginalia `text-xs`).
    for (const forbidden of ['font-size', 'text-transform', 'font-weight', 'letter-spacing']) {
      expect(props.has(forbidden), `.mt-num ne doit pas déclarer ${forbidden}`).toBe(false)
    }
    // `color` n'apparaît que via `time.mt-num { color: inherit }` — donc jamais
    // une couleur en dur qui écraserait `text-ink-*`.
    expect(props.get('color') ?? 'inherit').toBe('inherit')
  })

  it('`.mt-date--long` pose exactement `--text-2xs` (13px) → WeekAgenda ne change pas de taille', async () => {
    const root = await compile()
    expect(propsOf(root, 'mt-date--long').get('font-size')).toBe('13px')

    // Et `--text-2xs`, la valeur que portait `text-2xs` sur ce `<time>`, vaut bien 13px.
    let text2xs: string | undefined
    root.walkDecls('--text-2xs', (decl) => {
      text2xs = decl.value.trim()
    })
    expect(text2xs).toBe('13px')
  })

  it('`.mt-date--short` impose uppercase + 11px → NON appliquée (arbitrage Designer)', async () => {
    const root = await compile()
    const props = propsOf(root, 'mt-date--short')
    // Ces deux déclarations sont le motif documenté de sa non-application :
    // elles changeraient la casse ET la taille des dates existantes, et le
    // format cible du DS (« MER 24 JUIN ») demande aussi des options `Intl`
    // différentes de celles rendues aujourd'hui (« mer. 24 »).
    expect(props.get('text-transform')).toBe('uppercase')
    expect(props.get('font-size')).toBe('11px')
  })
})
