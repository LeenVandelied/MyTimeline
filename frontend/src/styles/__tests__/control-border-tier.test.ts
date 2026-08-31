// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type Container, type Rule } from 'postcss'
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
 *
 * Le volet FOCUS (#447) — contour vs `box-shadow` seul — vit dans son propre
 * bloc en fin de fichier, avec son périmètre statué et son armement.
 */

const CORE = fileURLToPath(new URL('../ds/components/core.css', import.meta.url))
const GLOBALS = fileURLToPath(new URL('../globals.css', import.meta.url))

/**
 * Sélecteurs dont la bordure EST l'affordance du contrôle. Ajouter ici tout
 * nouveau contrôle dont le contour porte la limite visuelle.
 *
 * ⚠ #352 — `.mt-check__box` est le SPÉCIMEN DS de la checkbox, pas le contrôle
 * rendu par l'application. Le contrôle applicatif est `ui/checkbox.tsx` (racine
 * Radix habillée par l'utilitaire `border-rule-emphasis`) — même tier, mécanisme
 * différent. Cette entrée est conservée : la retirer supprimerait le SEUL
 * garde-fou CSS du tier (ce test ne lit que du CSS, jamais de `.tsx`, et
 * `checkbox.tsx` n'emprunte pas le pont `--color-input` testé plus bas), et
 * désymétriserait le bloc `.mt-check` / `.mt-radio` / `.mt-switch` dont les deux
 * autres membres sont consommés par `ui/radio.tsx` et `ui/switch.tsx`.
 */
const FUNCTIONAL_CONTROL_SELECTORS = [
  '.mt-btn--secondary', // bouton outline
  '.mt-iconbtn', // bouton icône seule
  '.mt-input, .mt-textarea', // champ non rempli
  '.mt-select__trigger', // déclencheur de select
  '.mt-check__box', // contour de checkbox (spécimen DS — cf. note ci-dessus)
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

/* ══════════════════════════════════════════════════════════════════════════════
   #447 — GARDE D'INDICATEUR DE FOCUS DES CONTRÔLES À `<input>` MASQUÉ
   ══════════════════════════════════════════════════════════════════════════════

   POURQUOI. Le S62 (#415) a corrigé `.mt-check__box`, `.mt-radio__dot` et
   `.mt-switch__track`, dont l'UNIQUE indicateur de focus était un
   `box-shadow: var(--shadow-focus)` mesuré au pixel à 1,23:1 (clair) et 1,19:1
   (sombre) — très en dessous des 3:1 de WCAG 1.4.11. Le contour global du DS
   (`ds/tokens/base.css`, `@layer base :focus-visible`) NE les rattrape PAS :
   c'est leur `<input>` masqué (`opacity:0; width:0; height:0`) qui reçoit
   `:focus-visible`, donc le contour s'y peint sur 0×0 px (PIT-S62-007). Les
   trois règles de `core.css` sont donc le SEUL indicateur de ces contrôles.
   Avant #447 rien en source n'empêchait d'y reposer un `box-shadow` seul :
   `borderDeclsOf` (plus haut) ne lit que les déclarations `border*`. La seule
   garantie était la spec E2E `e2e/sprint-62-control-focus-contrast.spec.ts` —
   famille PIT-S58-004 (garantie citée, inexistante en source).

   ⚠ POINT D'ACCROCHE — L'ISSUE #447 SE TROMPE, VÉRIFIÉ SUR LE CSS.
   Elle demande d'asserter le focus « des 3 sélecteurs surveillés » de
   `FUNCTIONAL_CONTROL_SELECTORS`. Or AUCUN de ces trois sélecteurs ne porte de
   règle de focus : les indicateurs vivent sur des sélecteurs COMPOSÉS
   frère-adjacent (`core.css` L160 / L172 / L189), de la forme
       `.mt-check input:focus-visible + .mt-check__box { outline: … }`
   Un matcher au sélecteur EXACT (celui de `borderDeclsOf`, L62) rendrait zéro
   déclaration et ferait rougir le test sur du CSS parfaitement sain. La garde
   ci-dessous cible la forme composée : toute règle de `core.css` dont le
   sélecteur contient À LA FOIS `:focus` et la classe de la sœur visible.

   CE QUE CETTE GARDE PROUVE. Pour chacun des trois contrôles, `core.css`
   déclare au moins une règle de focus ; cette règle peint un `outline` (jamais
   neutralisé par `none` / `0`) ; ce contour référence `var(--color-focus)` ; et
   un `box-shadow` n'y est jamais l'indicateur SEUL. Un `box-shadow` CUMULÉ à un
   `outline` reste autorisé — c'est le cas légitime de `.mt-input:focus` (L68),
   hors périmètre ici.

   CE QU'ELLE NE PROUVE PAS — périmètre statué (#447) :
   • Elle ne lit QUE `ds/components/core.css`. Un indicateur — ou sa suppression
     — posé dans un `.tsx`, une utilitaire Tailwind, `globals.css` ou une autre
     feuille du DS lui échappe entièrement.
   • Elle ne rapproche que les règles où `:focus…` ET la classe surveillée
     figurent dans le MÊME sélecteur. Un focus déclaré sur un sélecteur voisin
     (`.mt-check:focus-within …`, un descendant, un `:has()`) n'est ni compté
     comme indicateur ni détecté comme régression.
   • Elle ne résout NI la cascade NI les `@layer` : une règle plus forte
     ailleurs peut annuler celle qu'on valide (cf. PIT-S53-002).
   • Elle ne mesure AUCUN pixel et AUCUN ratio. `--color-focus` peut être
     redéfini pâle sans la faire rougir. Le filet de contraste réel reste
     `e2e/sprint-62-control-focus-contrast.spec.ts`, à conserver.
   • Elle ne couvre PAS trois contrôles applicatifs : `.mt-check__box` et
     `.mt-radio__dot` sont des spécimens DS sans montage (cf. note L39-46) ;
     seul `.mt-switch__track` est monté en production (`EventEditForm.tsx:624`).

   ARMEMENT. Chaque assertion est prouvée rouge par le bloc « armement » en fin
   de fichier : la règle réelle y est neutralisée dans une copie EN MÉMOIRE du
   CSS (le fichier sur disque n'est jamais touché) et l'audit doit rendre la
   violation attendue. Les fixtures restent commitées — un garde prouvé par des
   fixtures supprimées avant commit n'est pas armé (PIT-S62-003).
*/

/** Sœurs visibles qui portent l'indicateur de focus d'un `<input>` masqué. */
const FOCUS_INDICATOR_CONTROLS = [
  '.mt-check__box',
  '.mt-radio__dot',
  '.mt-switch__track',
] as const

type FocusViolationKind =
  | 'missing-rule'
  | 'no-outline'
  | 'box-shadow-only'
  | 'outline-none'
  | 'outline-not-focus-token'

interface FocusViolation {
  control: string
  kind: FocusViolationKind
  detail: string
}

/** Une règle est « la règle de focus » d'un contrôle si son sélecteur porte les deux. */
function isFocusRuleFor(selector: string, control: string): boolean {
  const flat = selector.replace(/\s+/g, ' ')
  if (!flat.includes(':focus')) return false
  const token = new RegExp(`${control.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`)
  return token.test(flat)
}

/** Déclaration qui EMPÊCHE le contour de se peindre (interdit par `DEC-S58-001`). */
function suppressesOutline(prop: string, value: string): boolean {
  const v = value.trim().toLowerCase()
  if (prop === 'outline') return /(^|\s)(none|0|0px)(\s|$)/.test(v)
  if (prop === 'outline-style') return v === 'none'
  if (prop === 'outline-width') return v === '0' || v === '0px'
  return false
}

/** Règles de focus d'un contrôle, dans l'ordre du fichier. */
function focusRulesOf(root: Container, control: string): Rule[] {
  const found: Rule[] = []
  root.walkRules((rule) => {
    if (isFocusRuleFor(rule.selector, control)) found.push(rule)
  })
  return found
}

/**
 * Audite l'indicateur de focus d'un contrôle dans une SOURCE CSS (chaîne), pour
 * que l'armement puisse passer une copie mutée sans toucher le disque.
 */
function auditFocusIndicator(css: string, control: string): FocusViolation[] {
  const root = postcss.parse(css) as unknown as Container
  const rules = focusRulesOf(root, control)

  if (rules.length === 0) {
    return [
      {
        control,
        kind: 'missing-rule',
        detail: `aucune règle \`:focus…\` ne vise \`${control}\` dans core.css`,
      },
    ]
  }

  const outlines: { prop: string; value: string }[] = []
  const shadows: string[] = []
  for (const rule of rules) {
    rule.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase()
      if (prop === 'outline' || prop === 'outline-style' || prop === 'outline-width') {
        outlines.push({ prop, value: decl.value })
      } else if (prop === 'outline-color') {
        outlines.push({ prop, value: decl.value })
      } else if (prop === 'box-shadow') {
        shadows.push(decl.value)
      }
    })
  }

  const suppressed = outlines.filter((d) => suppressesOutline(d.prop, d.value))
  const painting = outlines.filter((d) => !suppressesOutline(d.prop, d.value))
  const violations: FocusViolation[] = []

  if (suppressed.length > 0) {
    violations.push({
      control,
      kind: 'outline-none',
      detail: `contour neutralisé : ${suppressed.map((d) => `${d.prop}:${d.value}`).join(' ; ')}`,
    })
  }

  if (painting.length === 0) {
    violations.push(
      shadows.length > 0
        ? {
            control,
            kind: 'box-shadow-only',
            detail: `box-shadow SEUL comme indicateur de focus : ${shadows.join(' ; ')}`,
          }
        : {
            control,
            kind: 'no-outline',
            detail: 'la règle de focus ne déclare aucun contour',
          },
    )
  } else if (!painting.some((d) => d.value.includes('var(--color-focus)'))) {
    violations.push({
      control,
      kind: 'outline-not-focus-token',
      detail: `contour hors token de focus : ${painting.map((d) => `${d.prop}:${d.value}`).join(' ; ')}`,
    })
  }

  return violations
}

/**
 * Rend une copie EN MÉMOIRE de `css` où le corps de la règle de focus réelle du
 * contrôle est remplacé (ou la règle supprimée si `decls === null`). Lève si la
 * règle réelle n'existe plus : une fixture qui ne mord sur rien ne prouve rien.
 */
function withFocusRuleReplaced(css: string, control: string, decls: string | null): string {
  const root = postcss.parse(css) as unknown as Container
  const targets = focusRulesOf(root, control)
  if (targets.length === 0) {
    throw new Error(`fixture invalide : aucune règle de focus réelle pour ${control} dans core.css`)
  }
  for (const rule of targets) {
    if (decls === null) {
      rule.remove()
      continue
    }
    rule.removeAll()
    const donor = postcss.parse(`x{${decls}}`).first as Rule
    donor.each((node) => {
      rule.append(node.clone())
    })
  }
  return root.toString()
}

describe("indicateur de focus des contrôles à `<input>` masqué — WCAG 1.4.11 / DEC-S58-001", () => {
  const coreCss = readFileSync(CORE, 'utf8')

  it.each(FOCUS_INDICATOR_CONTROLS)(
    '%s : contour `--color-focus`, jamais un `box-shadow` seul',
    (control) => {
      const violations = auditFocusIndicator(coreCss, control)
      expect(
        violations.length,
        `INDICATEUR DE FOCUS NON CONFORME sur ${control} (core.css).\n` +
          `Attendu : une règle dont le sélecteur porte \`:focus\` ET \`${control}\`, ` +
          `déclarant \`outline: 2px solid var(--color-focus)\`.\n` +
          `Violations : ${JSON.stringify(violations, null, 2)}`,
      ).toBe(0)
    },
  )
})

/**
 * ARMEMENT (contrôle négatif par assertion). Sans ce bloc, la garde ci-dessus
 * serait exactement le défaut qu'elle corrige : une assertion jamais vue rouge.
 */
const FOCUS_ARMING_CASES = [
  { label: 'règle de focus supprimée', decls: null, expected: 'missing-rule' },
  {
    label: '`box-shadow` seul (régression #415)',
    decls: 'box-shadow:var(--shadow-focus);',
    expected: 'box-shadow-only',
  },
  {
    label: 'aucun indicateur du tout',
    decls: 'border-color:var(--color-accent);',
    expected: 'no-outline',
  },
  {
    label: '`outline:none` réintroduit (DEC-S58-001)',
    decls: 'outline:none; box-shadow:var(--shadow-focus);',
    expected: 'outline-none',
  },
  {
    label: 'contour hors `--color-focus`',
    decls: 'outline:2px solid var(--color-rule); outline-offset:2px;',
    expected: 'outline-not-focus-token',
  },
] as const satisfies readonly {
  label: string
  decls: string | null
  expected: FocusViolationKind
}[]

describe('armement de la garde de focus — contrôles négatifs (#447)', () => {
  const coreCss = readFileSync(CORE, 'utf8')

  for (const control of FOCUS_INDICATOR_CONTROLS) {
    it.each(FOCUS_ARMING_CASES)(`${control} — $label ⇒ la garde rougit`, ({ decls, expected }) => {
      const mutated = withFocusRuleReplaced(coreCss, control, decls)
      // Le CSS muté DOIT différer, sinon la fixture est un no-op silencieux.
      expect(mutated).not.toBe(coreCss)

      const kinds = auditFocusIndicator(mutated, control).map((v) => v.kind)
      expect(
        kinds,
        `Le CSS muté pour ${control} aurait dû produire \`${expected}\`. Rendu : ${JSON.stringify(kinds)}`,
      ).toContain(expected)
    })
  }

  it('les mutations restent en mémoire — `core.css` sur disque est intact', () => {
    expect(readFileSync(CORE, 'utf8')).toBe(coreCss)
  })
})
