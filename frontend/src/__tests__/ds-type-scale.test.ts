import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * #348 — GARDE-FOU SOURCE : aucune utilitaire de taille HORS échelle DS.
 *
 * L'AC d'origine (« aucune classe `text-4xl`/`text-5xl` INTRODUITE ») était mal
 * formulée : le défaut PRÉEXISTAIT à `HeroSection.tsx:59`. Elle est reformulée en
 * « ZÉRO classe `text-4xl`/`text-5xl` RESTANTE dans `frontend/src` », et c'est ce
 * que fige ce test.
 *
 * POURQUOI CE DÉFAUT EST SILENCIEUX. `ds/tokens/typography.css` s'arrête à
 * `--text-3xl` (échelle non standard 13/15/17/21/27/35/45/57) et le `@theme inline`
 * de `globals.css` ne mappe que `2xs..3xl` SANS poser de `--text-*: initial`.
 * Écrire `text-4xl` ne produit donc pas une erreur ni une classe morte : Tailwind
 * émet ses propres défauts (2.25rem / 3rem = 36 / 48 px), la classe RESSEMBLE à
 * l'échelle DS mais rend hors d'elle — et peut rendre PLUS PETIT que `text-3xl`
 * (57 px). C'est exactement l'inversion de hiérarchie qu'a produite #348.
 *
 * ⚠ CE QUE CE TEST NE PROUVE PAS. Il lit du TEXTE SOURCE : il ne mesure aucun
 * rendu et ne verrait pas une classe composée dynamiquement (`text-${n}xl`), ni un
 * `4xl` arrivé par une dépendance. La preuve de rendu est un E2E, pas un unitaire —
 * cf. `e2e/landing-typography-hierarchy.spec.ts` (PIT S48/S51 : jsdom ne met rien
 * en page).
 */

/** Bornes réelles de `ds/tokens/typography.css`. Au-delà, Tailwind reprend la main. */
const OUT_OF_SCALE = /\b(?:[a-z0-9-]+:)*text-(?:[4-9]xl|\d\dxl)\b/g

const SRC_ROOT = join(process.cwd(), 'src')
const APP_ROOT = join(process.cwd(), 'app')
const EXTENSIONS = ['.ts', '.tsx', '.css']
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage'])
/** Ce fichier CITE les classes fautives pour les décrire : il doit s'exclure. */
const SELF = fileURLToPath(import.meta.url)

/**
 * Retire commentaires de bloc et de ligne AVANT le balayage.
 *
 * Nécessaire, et vérifié en écrivant ce test : les JSDoc de `HeroSection` et de
 * `HowItWorksSection` CITENT `text-4xl md:text-5xl` pour expliquer POURQUOI ces
 * classes sont parties. Sans ce filtrage, le garde-fou rougit sur sa propre
 * documentation et pousse à effacer l'explication — l'inverse du but.
 *
 * ⚠ Approximation assumée : un découpage lexical, pas un parseur. Le `[^:]` devant
 * `//` épargne les URLs (`https://`), mais un `//` dans une chaîne de caractères
 * serait traité comme un commentaire. Conséquence possible : un FAUX NÉGATIF (on
 * masque du code), jamais un faux positif. Acceptable pour un garde-fou de style.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function walk(dir: string): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full))
      continue
    }
    if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full)
  }
  return out
}

describe('échelle typographique DS — aucune taille hors échelle (#348)', () => {
  it('aucune classe `text-4xl`+ ne subsiste dans `src/` ni `app/`', () => {
    const offenders: string[] = []

    for (const file of [...walk(SRC_ROOT), ...walk(APP_ROOT)]) {
      if (file === SELF) continue
      const source = stripComments(readFileSync(file, 'utf8'))
      const hits = source.match(OUT_OF_SCALE)
      if (hits) offenders.push(`${relative(process.cwd(), file)} → ${[...new Set(hits)].join(', ')}`)
    }

    expect(
      offenders,
      `Classe(s) de taille hors échelle DS trouvée(s). \`ds/tokens/typography.css\` ` +
        `s'arrête à \`--text-3xl\` (57 px) : au-delà, Tailwind sert ses propres défauts ` +
        `(36 / 48 px), donc PLUS PETIT que \`text-3xl\`. Utiliser \`text-3xl\` au maximum.\n` +
        offenders.join('\n'),
    ).toEqual([])
  })
})
