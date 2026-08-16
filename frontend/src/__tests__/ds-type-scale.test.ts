import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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

/**
 * Bornes réelles de `ds/tokens/typography.css`. Au-delà, Tailwind reprend la main.
 *
 * ⚠ LE `(?<!-)` N'EST PAS COSMÉTIQUE — il distingue l'USAGE d'une classe hors
 * échelle de la DÉFINITION d'un token. Sans lui, `\btext-4xl\b` apparie aussi
 * `--text-4xl` (le `-` avant `t` est une frontière de mot) : le jour où le DS
 * ÉTEND légitimement son échelle en déclarant `--text-4xl` dans
 * `ds/tokens/typography.css`, le garde-fou rougissait sur la définition même du
 * token — un faux positif qui punit exactement la bonne action, et dont la seule
 * issue apparente est de désarmer le test. Relevé en review du Sprint 59.
 *
 * Ce que la lookbehind laisse passer, volontairement : `--text-4xl:` (définition)
 * et `var(--text-4xl)` (consommation). Ce qu'elle continue d'attraper :
 * `text-4xl`, `md:text-4xl`, `text-10xl`, `@apply text-4xl` — les usages en
 * classe utilitaire, seuls concernés par l'AC de #348.
 */
const OUT_OF_SCALE = /(?<!-)\b(?:[a-z0-9-]+:)*text-(?:[4-9]xl|\d\dxl)\b/g

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

/**
 * Balaye `dir` récursivement. Renvoie `[]` si le dossier n'existe pas.
 *
 * La garde d'existence n'est pas défensive « au cas où » : `SRC_ROOT` et
 * `APP_ROOT` sont résolus depuis `process.cwd()`, donc depuis `frontend/`.
 * Lancé d'ailleurs (racine du dépôt, IDE, runner configuré autrement),
 * `readdirSync` jetait un `ENOENT` — une erreur d'infrastructure déguisée en
 * échec de garde-fou. Le risque de ce repli, c'est la VACUITÉ : d'où
 * l'assertion sur le nombre de fichiers balayés dans le test lui-même.
 */
function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
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
    const files = [...walk(SRC_ROOT), ...walk(APP_ROOT)]

    // ANTI-VACUITÉ. `walk` renvoie `[]` sur un dossier absent : sans ce plancher,
    // un test lancé depuis un mauvais `cwd` balaierait ZÉRO fichier et serait
    // VERT — un garde-fou silencieusement désarmé, pire qu'un garde-fou rouge.
    expect(
      files.length,
      `aucun fichier balayé : \`src/\` (${SRC_ROOT}) et \`app/\` (${APP_ROOT}) sont ` +
        `résolus depuis \`process.cwd()\`. Ce test doit tourner avec \`frontend/\` ` +
        `pour \`cwd\` — sinon il ne vérifie RIEN.`,
    ).toBeGreaterThan(50)

    for (const file of files) {
      if (file === SELF) continue
      const source = stripComments(readFileSync(file, 'utf8'))
      const hits = source.match(OUT_OF_SCALE)
      if (hits)
        offenders.push(`${relative(process.cwd(), file)} → ${[...new Set(hits)].join(', ')}`)
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
