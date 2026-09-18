// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou de PARITÉ DU SHELL DE POLICES — application vs Storybook (#191, revue S77).
 *
 * POURQUOI CE FICHIER EXISTE. `.storybook/preview.ts` doit reproduire sur le `<html>` du
 * preview ce que `app/[locale]/layout.tsx` pose sur le `<html>` de l'application : les
 * classes de variables `next/font`, ET la dérivée `--font-ui: var(--font-display)` que
 * `next/font` ne produit pas (il n'expose qu'une variable par famille). Jusqu'à la revue
 * du S77, cette dérivation était RECOPIÉE À LA MAIN des deux côtés, et son commentaire
 * annonçait qu'on la reproduisait « à l'identique » — sans qu'aucun test ne le vérifie.
 * Si `layout.tsx` avait changé de dérivation, `preview.ts` aurait dérivé EN SILENCE et
 * les 80 stories se seraient rendues dans une police autre que celle du produit : le
 * défaut exact que #191 venait de corriger (avant lui, `--font-display` / `--font-ui` /
 * `--font-mono` valaient la chaîne VIDE dans Storybook, et TOUT tombait en police
 * système). [[PIT-S58-004]] : une garantie décrite mais inexistante est pire que pas de
 * garantie, parce qu'elle dissuade d'en écrire une vraie.
 *
 * LE CORRECTIF EST STRUCTUREL, PAS DÉCLARATIF. La dérivation a été extraite dans
 * `app/fonts.ts` (`FONT_UI_VARIABLE`, `FONT_UI_VALUE`, `fontUiStyle`), module que les
 * DEUX côtés importaient déjà (`preview.ts` y prenait `archivo` / `ibmPlexMono`) — donc
 * importable par le builder Vite de Storybook comme par Next, ce que `build-storybook`
 * et `next build` attestent. Il n'existe plus qu'UNE dérivation : la divergence n'est
 * plus « détectée », elle est impossible.
 *
 * CE QUE LA PRÉSENTE GARDE AJOUTE. Le partage peut être DÉFAIT par un retour en arrière :
 * quelqu'un réécrit `'var(--font-display)'` en dur dans l'un des deux consommateurs, et
 * l'on retombe exactement dans l'état d'avant. Ce fichier interdit ce littéral hors du
 * module partagé, et vérifie que les deux consommateurs importent bien de `app/fonts`.
 *
 * POURQUOI CHERCHER LA FORME QUOTÉE ET NON LE MOT `--font-ui`. Un `grep` du nom nu
 * rougirait sur la PROSE de ces mêmes fichiers, qui le nomment abondamment (y compris
 * cet en-tête). Un garde-fou qui se déclenche sur sa propre documentation se désarme à
 * la première exécution. On cherche donc la forme de CODE — le littéral entre
 * apostrophes ou guillemets — que la prose n'emploie jamais.
 *
 * CE QU'ELLE NE PROUVE PAS :
 * • Elle ne rend AUCUN pixel et n'ouvre aucun navigateur : que la police soit
 *   effectivement peinte dans le preview relève d'une vérification visuelle, pas d'ici.
 * • Elle ignore les gabarits (`` `var(${x})` ``) et toute construction dynamique du
 *   littéral. Le retour en arrière réaliste est un copier-coller, pas une concaténation.
 * • Elle ne garde que les DEUX consommateurs nommés. Un troisième `<html>` (par ex.
 *   `app/global-error.tsx`, qui rend le sien) devra être ajouté à `CONSUMERS`.
 */

const FRONTEND = fileURLToPath(new URL('../../../', import.meta.url))

/** Module qui porte la dérivation — le SEUL endroit où le littéral a droit de cité. */
const SHARED = 'app/fonts.ts'

/** Les `<html>` qui appliquent le shell, et le spécificateur d'import attendu. */
const CONSUMERS = [
  { file: 'app/[locale]/layout.tsx', from: "from '../fonts'" },
  { file: '.storybook/preview.ts', from: "from '../app/fonts'" },
] as const

/**
 * Formes de CODE de la dérivation : le nom de la propriété personnalisée et sa valeur,
 * chacun tel qu'il s'écrirait dans un littéral de chaîne TS.
 */
const CODE_LITERALS = ['--font-ui', 'var(--font-display)'] as const

const read = (file: string): string => readFileSync(join(FRONTEND, file), 'utf8')

/** Occurrences de la dérivation écrites EN DUR (littéral quoté) dans une source. */
export function hardcodedDerivationSites(source: string): string[] {
  return CODE_LITERALS.flatMap((value) =>
    [`'${value}'`, `"${value}"`].filter((quoted) => source.includes(quoted)),
  )
}

describe('parité du shell de polices app / Storybook (#191, revue S77)', () => {
  it('`app/fonts.ts` porte la dérivation, une seule fois', () => {
    const source = read(SHARED)
    // Témoin de PÉRIMÈTRE : si la dérivation quittait ce module (renommée, supprimée,
    // déplacée), les assertions d'absence ci-dessous passeraient à vide et la garde
    // serait verte sans rien garder (PIT-S62-003).
    for (const value of CODE_LITERALS) {
      const occurrences = source.split(`'${value}'`).length - 1
      expect(occurrences, `\`${value}\` doit être écrit UNE fois dans ${SHARED}`).toBe(1)
    }
    expect(source).toContain('export const FONT_UI_VARIABLE')
    expect(source).toContain('export const FONT_UI_VALUE')
    expect(source).toContain('export const fontUiStyle')
  })

  it.each(CONSUMERS)('$file importe la dérivation au lieu de la recopier', ({ file, from }) => {
    const source = read(file)

    expect(
      hardcodedDerivationSites(source),
      `${file} réécrit la dérivation \`--font-ui\` en dur au lieu de l'importer de ` +
        `${SHARED}. C'est la copie manuelle que la revue du S77 a supprimée : deux ` +
        `sources qui divergent en silence, et un Storybook rendu dans une police autre ` +
        `que l'application (#191). Remède : importer \`FONT_UI_VARIABLE\` / ` +
        `\`FONT_UI_VALUE\` (ou \`fontUiStyle\` pour un style inline React).`,
    ).toEqual([])

    expect(source, `${file} doit importer de ${SHARED} (${from})`).toContain(from)
  })

  it('les deux consommateurs prennent aussi les CLASSES de variables au même endroit', () => {
    // `fontVariables` est la chaîne exacte posée en `className` sur le `<html>` de
    // l'app ; `preview.ts` la découpe au lieu de reconstruire `[archivo.variable, …]`,
    // qui était la seconde copie manuelle du même shell.
    for (const { file } of CONSUMERS) {
      expect(read(file), `${file} doit utiliser \`fontVariables\``).toContain('fontVariables')
    }
  })
})

/**
 * ARMEMENT — méthode `tsx-focus-utility.test.ts` / `control-border-tier.test.ts` :
 * mutation d'un fichier RÉEL du dépôt, EN MÉMOIRE, et témoin final que le disque est
 * intact. Sans lui, les `toEqual([])` ci-dessus seraient verts même si
 * `hardcodedDerivationSites` ne regardait rien.
 */
describe('armement de la garde de parité (#191, revue S77)', () => {
  it.each([
    {
      label: '`preview.ts` réécrit `setProperty` avec les littéraux en dur',
      injected: "root.style.setProperty('--font-ui', 'var(--font-display)')",
      expected: ["'--font-ui'", "'var(--font-display)'"],
    },
    {
      label: '`layout.tsx` réécrit le style inline en dur (guillemets doubles)',
      injected: 'style={{ "--font-ui": "var(--font-display)" }}',
      expected: ['"--font-ui"', '"var(--font-display)"'],
    },
    {
      label: 'un seul des deux littéraux suffit à rougir',
      injected: "const v = 'var(--font-display)'",
      expected: ["'var(--font-display)'"],
    },
  ])('$label ⇒ la garde rougit', ({ injected, expected }) => {
    const mutated = `${read('.storybook/preview.ts')}\n${injected}\n`
    expect(hardcodedDerivationSites(mutated)).toEqual(expected)
  })

  it('la prose des fichiers réels ne suffit PAS à faire rougir la garde', () => {
    // Contrôle POSITIF, et il n'est pas cosmétique : les trois fichiers nomment
    // `--font-ui` et `--font-display` dans leurs commentaires. Une garde qui rougirait
    // sur sa propre documentation serait désarmée dès le premier run.
    for (const { file } of CONSUMERS) {
      const source = read(file)
      expect(source, `${file} est censé PARLER de la dérivation en prose`).toContain('--font-ui')
      expect(hardcodedDerivationSites(source)).toEqual([])
    }
  })

  it('les fichiers du disque restent intacts après armement', () => {
    expect(hardcodedDerivationSites(read('.storybook/preview.ts'))).toEqual([])
  })
})
