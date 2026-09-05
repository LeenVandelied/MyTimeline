// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Declaration, type Rule } from 'postcss'

/**
 * Garde-fou de PALETTE et d'UNICITÉ des règles de la landing (#335).
 *
 * CONTEXTE. `landing.css` injectait des couleurs hors palette Graphite (violet
 * #8B5CF6, indigo #4F46E5, gris #374151/#4B5563, #6D28D9) et des ombres indigo en
 * `rgba(79, 70, 229, …)`. Ces valeurs sont theme-blind — identiques en clair et en
 * sombre — et, ce fichier n'étant PAS dans un `@layer`, elles écrasaient les
 * utilitaires `border-rule` posés sur les mêmes cartes au sprint 48 (le CSS non
 * layerisé bat toujours le CSS layerisé). Le critère « aucune couleur hardcodée »
 * de #56 n'était donc tenu que côté TSX. S'y ajoutaient 4 règles définies DEUX fois
 * entre `landing.css` et `animations.css`, dont `.cta-button` avec deux brillances
 * (`::before` et `::after`) qui s'animaient simultanément.
 *
 * CE QUE CE TEST PROUVE. Sur l'AST PostCSS des deux vraies feuilles (PAT-S48-001) :
 * (1) aucune déclaration ne porte de littéral de couleur — toute couleur passe par
 * un `var(--color-*)` du DS, donc suit le thème par construction ; (2) les sélecteurs
 * qui étaient dupliqués ne sont plus déclarés qu'une fois ; (3) il ne reste qu'un seul
 * pseudo-élément de brillance sur `.cta-button` ; (4) aucun `@keyframes` ne porte un
 * nom générique susceptible d'écraser une animation Tailwind (cas vécu : `pulse`).
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun rendu, aucun contraste calculé, aucune cascade
 * résolue : un token peut être correctement référencé ET visuellement inadapté. Les
 * ratios de contraste et l'aspect réel restent du ressort du contrôle navigateur.
 */

const FILES = {
  'landing.css': fileURLToPath(new URL('../landing.css', import.meta.url)),
  'animations.css': fileURLToPath(new URL('../animations.css', import.meta.url)),
}

/** Littéraux de couleur : hex, et fonctions rgb()/rgba()/hsl()/hsla(). */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/

/** `transparent` et `currentColor` sont des mots-clés, pas des valeurs de palette. */
function colorLiterals(css: string, from: string): string[] {
  const found: string[] = []
  postcss.parse(css, { from }).walkDecls((decl: Declaration) => {
    if (COLOR_LITERAL.test(decl.value)) found.push(`${decl.prop}: ${decl.value}`)
  })
  return found
}

/**
 * Nombre de SITES DE DÉFINITION d'un sélecteur (sélecteurs groupés inclus), tous
 * fichiers confondus.
 *
 * Seules les règles à la racine de la feuille comptent : une règle imbriquée dans une
 * at-rule (`@media (prefers-reduced-motion)`, `@media (max-width: 768px)`) est un
 * RAFFINEMENT conditionnel du même site, pas une seconde définition concurrente. La
 * duplication visée par #335 était de deux règles inconditionnelles, dans deux fichiers,
 * s'appliquant en même temps au même élément.
 */
function countSelector(selector: string): number {
  let n = 0
  for (const path of Object.values(FILES)) {
    const root = postcss.parse(readFileSync(path, 'utf8'), { from: path })
    root.walkRules((rule: Rule) => {
      if (rule.parent?.type !== 'root') return
      if (rule.selectors.some((s) => s.trim() === selector)) n += 1
    })
  }
  return n
}

describe('#335 — palette et unicité des règles de la landing', () => {
  describe('aucun littéral de couleur (critères 1 & 2)', () => {
    for (const [name, path] of Object.entries(FILES)) {
      it(`${name} n'utilise que des tokens du DS`, () => {
        expect(colorLiterals(readFileSync(path, 'utf8'), path)).toEqual([])
      })
    }

    /**
     * TÉMOIN NÉGATIF (PAT-S48-001) — sans lui, un détecteur qui ne détecte rien
     * rendrait les assertions ci-dessus vertes par vacuité.
     */
    it('le détecteur repère bien un hex et un rgba hors palette', () => {
      const fixture = '.x { border-color: #8B5CF6; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25); }'
      expect(colorLiterals(fixture, '/virtuel/temoin.css')).toHaveLength(2)
    })

    it('le détecteur ne signale ni les tokens, ni transparent, ni color-mix', () => {
      const fixture =
        '.x { color: var(--color-ink); background: transparent;' +
        ' background-color: color-mix(in srgb, var(--color-ink) 8%, transparent); }'
      expect(colorLiterals(fixture, '/virtuel/temoin2.css')).toEqual([])
    })
  })

  describe('règles jadis dupliquées — une seule déclaration (critères 3 & 4)', () => {
    // `.section-animation` et `.cta-button` sont nommés par l'issue ; `.feature-icon`
    // et `.card-gradient-border` étaient dupliqués de la même façon, trouvés au passage.
    for (const selector of [
      '.section-animation',
      '.section-animation.visible',
      '.cta-button',
      '.feature-icon',
      '.card-gradient-border',
    ]) {
      it(`${selector} n'est déclaré qu'une fois`, () => {
        expect(countSelector(selector)).toBe(1)
      })
    }

    it('.cta-button ne porte qu\'un seul pseudo-élément de brillance', () => {
      const shine = new Set<string>()
      for (const path of Object.values(FILES)) {
        postcss.parse(readFileSync(path, 'utf8'), { from: path }).walkRules((rule: Rule) => {
          const m = rule.selector.match(/\.cta-button[^,]*::(before|after)/)
          if (m) shine.add(m[1])
        })
      }
      expect([...shine]).toEqual(['after'])
    })
  })

  /**
   * `@keyframes pulse` dans `landing.css` portait le nom de l'animation intégrée de
   * Tailwind. `landing.css` étant importé APRÈS `globals.css`, sa définition gagnait
   * et s'appliquait à tous les `animate-pulse` de l'application (squelettes de
   * chargement). Les noms doivent donc être préfixés.
   */
  describe('noms de @keyframes non collisionnants', () => {
    const RESERVED = ['pulse', 'spin', 'ping', 'bounce', 'fade', 'rotate']

    it('aucun keyframe ne porte un nom générique réservé par Tailwind', () => {
      const names: string[] = []
      for (const path of Object.values(FILES)) {
        postcss.parse(readFileSync(path, 'utf8'), { from: path }).walkAtRules('keyframes', (at) => {
          names.push(at.params.trim())
        })
      }
      expect(names.length).toBeGreaterThan(0)
      expect(names.filter((n) => RESERVED.includes(n))).toEqual([])
    })
  })
})
