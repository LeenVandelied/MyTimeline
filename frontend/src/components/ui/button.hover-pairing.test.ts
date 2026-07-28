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

/** Corps du `cva(...)` — on ignore le commentaire d'en-tête et le composant. */
function variantSource(): string {
  const src = readFileSync(BUTTON, 'utf8')
  const start = src.indexOf('variant: {')
  const end = src.indexOf('size: {', start)
  expect(start, 'bloc `variant` introuvable dans button.tsx').toBeGreaterThan(-1)
  expect(end, 'bloc `size` introuvable dans button.tsx').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('Button — appariement fond/encre au survol', () => {
  it('aucun variant ne pose de `hover:text-*`', () => {
    const offenders = variantSource().match(/hover:text-[\w-]+/g) ?? []
    expect(
      offenders,
      "un variant impose une couleur de texte au survol : un consommateur qui redéfinit le seul fond ne pourra pas la neutraliser (cf. l'en-tête de button.tsx)",
    ).toEqual([])
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
