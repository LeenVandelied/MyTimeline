// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container, type Rule } from 'postcss'
import tailwind from '@tailwindcss/postcss'

/**
 * #575 (DEC-S84-002) — Contrat de CASCADE de `.mt-nav-label` (`ds/components/i18n.css`
 * §2bis), la classe des libellés de nav mono capitales (`AppShell`, `SettingsShell`).
 *
 * POURQUOI CE CONTRAT. La classe est HORS layer (comme tout `i18n.css`) : elle bat
 * donc toute utilitaire Tailwind. Elle n'est sûre QUE si elle ne pose aucune des
 * propriétés que le lien pilote lui-même :
 *   · la COULEUR — la pilule active (`text-primary-ink`, DEC-S83-005) doit arriver
 *     par héritage jusqu'au libellé. C'est précisément ce qui disqualifie
 *     `.mt-eyebrow`, qui pose `color: var(--color-ink-muted)` ;
 *   · la TAILLE — laissée à `text-2xs` (13px, token le plus proche des 12px de la
 *     maquette) ;
 *   · la GRAISSE — `font-medium` de l'état actif.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun rendu (ni pixels, ni largeur allemande, ni
 * casse peinte) : il compile la vraie chaîne CSS et raisonne sur l'AST. La tenue
 * au navigateur est dans `e2e/sprint-84-section-titles.spec.ts`.
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

/** Règles dont un des sélecteurs mentionne EXACTEMENT la classe (pas ses modificateurs). */
function rulesFor(root: Container, className: string): Rule[] {
  const exact = new RegExp(`\\.${className}(?![\\w-])`)
  const hits: Rule[] = []
  root.walkRules((rule) => {
    if (exact.test(rule.selector)) hits.push(rule)
  })
  return hits
}

function declsOf(rule: Rule): Map<string, string> {
  const decls = new Map<string, string>()
  rule.walkDecls((d) => {
    decls.set(d.prop, d.value.trim())
  })
  return decls
}

/** Valeur d'une variable déclarée sur un `:root` HORS layer (la gagnante, cf. PIT-S53-002). */
function unlayeredRootVar(root: Container, prop: string): string | undefined {
  let value: string | undefined
  root.walkRules((rule) => {
    if (!rule.selector.includes(':root') || layerChain(rule).length > 0) return
    rule.walkDecls(prop, (decl) => {
      value = decl.value.trim()
    })
  })
  return value
}

describe('#575 — `.mt-nav-label` : ce qu’elle pose', () => {
  it('existe, HORS layer, et pose mono + capitales + `--tracking-wide`', async () => {
    const root = await compile()
    const base = rulesFor(root, 'mt-nav-label').filter((r) => r.selector.trim() === '.mt-nav-label')
    expect(base, 'règle de base `.mt-nav-label` introuvable').toHaveLength(1)
    expect(layerChain(base[0])).toEqual([])
    const decls = declsOf(base[0])
    expect(decls.get('font-family')).toBe('var(--font-mono)')
    expect(decls.get('text-transform')).toBe('uppercase')
    expect(decls.get('letter-spacing')).toBe('var(--tracking-wide)')
  })

  it('`--tracking-wide` résout bien les .06em de la maquette (valeur DS hors layer, pas Tailwind)', async () => {
    const root = await compile()
    // Tailwind émet son propre `--tracking-wide` (.025em) dans `@layer theme` ; le
    // `:root` hors layer de `typography.css` le bat. Ne pas déduire la valeur de la
    // lecture de `@theme` seul (PIT-S53-002).
    expect(unlayeredRootVar(root, '--tracking-wide')).toBe('0.06em')
  })

  it('ne pose NI couleur, NI taille, NI graisse (sinon elle battrait la pilule active)', async () => {
    const root = await compile()
    for (const rule of rulesFor(root, 'mt-nav-label')) {
      const decls = declsOf(rule)
      for (const forbidden of ['color', 'font-size', 'font-weight', 'font', 'line-height']) {
        expect(decls.has(forbidden), `${rule.selector} ne doit pas déclarer ${forbidden}`).toBe(
          false,
        )
      }
    }
  })

  it('se détend en allemand (.02em), par `[lang="de"]` ET `:lang(de)`', async () => {
    const root = await compile()
    const de = rulesFor(root, 'mt-nav-label').filter((r) => r.selector.includes('de'))
    expect(de).toHaveLength(1)
    expect(de[0].selector).toContain('[lang="de"] .mt-nav-label')
    expect(de[0].selector).toContain('.mt-nav-label:lang(de)')
    expect(declsOf(de[0]).get('letter-spacing')).toBe('.02em')
    expect(layerChain(de[0])).toEqual([])
  })
})

describe('#575 — pourquoi pas `.mt-eyebrow` sur la nav (contrôle du motif)', () => {
  it('`.mt-eyebrow` pose une couleur et une taille HORS layer', async () => {
    const root = await compile()
    const base = rulesFor(root, 'mt-eyebrow').filter((r) => r.selector.trim() === '.mt-eyebrow')
    expect(base).toHaveLength(1)
    expect(layerChain(base[0])).toEqual([])
    const decls = declsOf(base[0])
    // Ces deux déclarations sont le motif de l'écart : posée sur le libellé d'un
    // lien actif, la première remplacerait `text-primary-ink` hérité (pilule
    // graphite illisible), la seconde imposerait 10px au lieu de 13px.
    expect(decls.get('color')).toBe('var(--color-ink-muted)')
    expect(decls.get('font-size')).toBe('10px')
  })
})
