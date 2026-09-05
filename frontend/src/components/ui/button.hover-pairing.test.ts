// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou d'APPARIEMENT DE SURVOL — Sprint 49, suite de #337.
 *
 * CONTEXTE. `Button` portait sur `outline` et `ghost` la paire sémantique
 * `hover:bg-accent hover:text-accent-foreground` (« encre d'accent SUR fond
 * d'accent »). Les deux moitiés vivent dans des clés `tailwind-merge`
 * DIFFÉRENTES (`bg` vs `text`) : un consommateur qui ne redéfinit que le fond
 * du survol garde l'encre de l'accent et rend le libellé de la couleur exacte
 * du fond — 1.00:1 en clair, 1.07:1 en sombre. Trois occurrences vivantes
 * avaient été mesurées : CTA secondaire du hero de la landing, boutons
 * « Retour » de `/privacy` et de `/terms`.
 *
 * CE QUE CE TEST PROUVE. Aucun variant de `buttonVariants` ne pose
 * d'utilitaire `hover:text-*`. C'est l'invariant qui rend le couplage
 * indéformable : le survol ne change que la surface, l'encre de repos reste
 * en place, il n'y a plus de paire à casser à moitié. Un consommateur qui veut
 * le survol inversé écrit LUI-MÊME les deux moitiés et en assume les deux.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun ratio n'est calculé : jsdom ne résout ni
 * la précédence des `@layer` ni la mise en page (PIT-S48/PAT-S48-001). Les
 * ratios réels se mesurent au navigateur — cf. `e2e/landing-cta-contrast.spec.ts`.
 */

const BUTTON = fileURLToPath(new URL('./button.tsx', import.meta.url))

/**
 * Corps COMPLET de l'appel `cva(...)`, parenthèses équilibrées.
 *
 * DÉFAUT CORRIGÉ (revue du Sprint 49) : le scan était borné à
 * `indexOf('variant: {')` → `indexOf('size: {')`. La CHAÎNE DE BASE du `cva`
 * (premier argument, appliquée à TOUS les variants) et tout `compoundVariants`
 * placé après le bloc `size` échappaient donc au garde-fou. La base est propre
 * aujourd'hui — c'est un angle mort qu'on ferme, pas une régression trouvée —
 * mais un `hover:text-*` posé là aurait exactement l'effet que ce test prétend
 * interdire, et serait passé au vert.
 *
 * Les parenthèses sont comptées HORS chaînes : les classes du DS en contiennent
 * (`[&_svg:not([class*='size-'])]`), et une parenthèse déséquilibrée dans un
 * littéral fausserait la borne.
 */
export function cvaCall(source: string): string {
  const start = source.indexOf('cva(')
  if (start === -1) throw new Error('appel `cva(` introuvable')
  const open = source.indexOf('(', start)
  let depth = 0
  let quote: string | null = null
  for (let i = open; i < source.length; i += 1) {
    const char = source[i]
    if (quote !== null) {
      if (char === quote && source[i - 1] !== '\\') quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') quote = char
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, i)
    }
  }
  throw new Error('appel `cva(` non refermé')
}

/** Utilitaires `hover:text-*` posés dans l'appel `cva` — commentaires exclus. */
export function hoverInkOffenders(source: string): string[] {
  const withoutComments = cvaCall(source)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
  return withoutComments.match(/hover:text-[\w-]+/g) ?? []
}

function variantSource(): string {
  return cvaCall(readFileSync(BUTTON, 'utf8'))
}

describe('Button — appariement fond/encre au survol', () => {
  it('aucun variant ne pose de `hover:text-*`', () => {
    const offenders = hoverInkOffenders(readFileSync(BUTTON, 'utf8'))
    expect(
      offenders,
      "un variant impose une couleur de texte au survol : un consommateur qui redéfinit le seul fond ne pourra pas la neutraliser (cf. l'en-tête de button.tsx)",
    ).toEqual([])
  })

  it('le détecteur voit un `hover:text-*` posé dans la CHAÎNE DE BASE du `cva`', () => {
    // Témoin négatif : c'est précisément la zone que l'ancien scan
    // (`variant: {` → `size: {`) ne lisait pas. Sans cette preuve, le test
    // ci-dessus resterait vert pour la mauvaise raison.
    // ⚠ Aucune classe utilitaire RÉALISTE dans ces témoins : Tailwind v4 scanne
    // aussi les fichiers de test, et une chaîne qui ressemble à une classe finit
    // GÉNÉRÉE dans `globals.css`. Un sélecteur arbitraire avec guillemets
    // échappés y a produit du CSS invalide et un 500 sur toute l'application
    // (constaté au Sprint 49). D'où des jetons volontairement inertes.
    const base = hoverInkOffenders(
      "const v = cva('zzbase-inflex zzsvg-not(zzclass) hover:bg-zzaccent hover:text-zzink', { variants: { variant: { ghost: 'x' }, size: { sm: 'y' } } })",
    )
    expect(base).toEqual(['hover:text-zzink'])
  })

  it('le détecteur voit un `hover:text-*` posé dans `compoundVariants` (après `size`)', () => {
    const compound = hoverInkOffenders(
      "const v = cva('zzbase', { variants: { variant: { ghost: 'x' }, size: { sm: 'y' } }, compoundVariants: [{ variant: 'ghost', size: 'sm', class: 'hover:bg-zzaccent hover:text-zzink' }] })",
    )
    expect(compound).toEqual(['hover:text-zzink'])
  })

  it("`outline` et `ghost` survolent vers une teinte douce, pas vers l'accent plein", () => {
    const source = variantSource()
    expect(source, '`outline` doit survoler vers `accent-soft`').toContain('hover:bg-accent-soft')
    expect(
      // `(?![\w-])` et non `\b` : `-` est un non-mot, donc `\b` matcherait
      // aussi `hover:bg-accent-soft`, qui est précisément la valeur attendue.
      source.match(/hover:bg-accent(?![\w-])/g) ?? [],
      "`hover:bg-accent` (accent plein) exige une encre appariée : interdit au niveau du variant",
    ).toEqual([])
  })
})
