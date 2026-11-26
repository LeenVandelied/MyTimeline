// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diffLocales, flattenKeys } from '@/i18n/key-parity'

/**
 * #745 : parité des clés de traduction entre fr, en, es et de.
 *
 * `i18n-namespaces.test.ts` ne vérifie que les namespaces de premier niveau
 * (un par fichier). Ce test comble sa limite documentée : les clés sous un
 * namespace. Les textes sont lus dans `public/locales/<locale>/<fichier>.json`.
 *
 * API FIXÉE POUR L'ÉTAPE CODE (module pur `src/i18n/key-parity.ts`, sans
 * import Spring/Next, aucune lecture disque) :
 *
 *   flattenKeys(obj: unknown): string[]
 *     Chemins pointés des FEUILLES, triés. Une feuille est toute valeur non
 *     objet. Un tableau est une feuille (son chemin est rendu, pas ses index).
 *     Un objet vide ne rend rien.
 *     Ex. { a: { b: 'x', c: ['y'] }, d: 'z' } -> ['a.b', 'a.c', 'd']
 *
 *   type KeyDiff = { file: string; locale: string; missing: string[]; extra: string[] }
 *
 *   diffLocales(
 *     namespace: string,                       // nom du fichier, ex. 'common'
 *     byLocale: Record<string, string[]>,      // clés aplaties par langue
 *     reference = 'fr',
 *   ): KeyDiff[]
 *     Un élément par langue (hors référence) qui diverge de la référence, dans
 *     l'ordre de `byLocale`. `file` = namespace, `missing` = clés de la
 *     référence absentes de la langue, `extra` = clés de la langue absentes de
 *     la référence, les deux triés. Rend [] si aucune langue ne diverge.
 *     Une langue sans écart n'apparaît pas.
 *
 * Le même `diffLocales` sert à comparer les listes de fichiers (T2), en
 * passant les noms de fichier à la place des clés.
 */

const LOCALES_ROOT = join(process.cwd(), 'public', 'locales')
const LOCALES = ['fr', 'en', 'es', 'de']

function listFiles(locale: string): string[] {
  const dir = join(LOCALES_ROOT, locale)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
}

function readKeys(locale: string, file: string): string[] {
  return flattenKeys(JSON.parse(readFileSync(join(LOCALES_ROOT, locale, file), 'utf8')))
}

describe('i18n : parité des clés entre les 4 langues (#745)', () => {
  it('every namespace exposes the same key paths in fr, en, es and de', () => {
    const files = listFiles('fr')
    let counted = 0
    const diffs = files.flatMap((file) => {
      const byLocale: Record<string, string[]> = {}
      for (const locale of LOCALES) {
        // Un fichier absent d'une langue est l'affaire de T2.
        if (!existsSync(join(LOCALES_ROOT, locale, file))) continue
        byLocale[locale] = readKeys(locale, file)
      }
      counted += byLocale.fr.length
      return diffLocales(file.replace('.json', ''), byLocale)
    })

    // Anti-vacuité : un mauvais `cwd` lirait zéro fichier et resterait vert.
    expect(files.length, `fichiers lus dans ${LOCALES_ROOT} (cwd doit être frontend/)`).toBeGreaterThanOrEqual(10)
    expect(counted, 'aucune clé comptée dans les fichiers fr').toBeGreaterThan(100)

    const report = diffs
      .map(
        (d) =>
          `${d.file}.json [${d.locale}] manquantes: ${d.missing.join(', ') || '-'} | en trop: ${d.extra.join(', ') || '-'}`,
      )
      .join('\n  ')
    expect(diffs, `écarts de clés par rapport à fr :\n  ${report}`).toEqual([])
  })

  it('every locale ships the same namespace files', () => {
    const byLocale: Record<string, string[]> = {}
    for (const locale of LOCALES) byLocale[locale] = listFiles(locale)

    expect(byLocale.fr.length, 'aucun fichier fr lu').toBeGreaterThanOrEqual(10)

    const diffs = diffLocales('(fichiers)', byLocale)
    const report = diffs
      .map((d) => `[${d.locale}] fichiers manquants: ${d.missing.join(', ') || '-'} | en trop: ${d.extra.join(', ') || '-'}`)
      .join('\n  ')
    expect(diffs, `fichiers de textes différents de fr :\n  ${report}`).toEqual([])
  })

  it('diff helper reports missing and extra keys per locale', () => {
    const diffs = diffLocales('common', {
      fr: ['a.one', 'a.two', 'b'],
      en: ['a.one', 'b', 'c.extra'],
      es: ['a.one', 'a.two', 'b'],
      de: ['a.two', 'b', 'z.extra', 'a.extra'],
    })

    // es est identique à fr : il n'apparaît pas.
    expect(diffs).toEqual([
      { file: 'common', locale: 'en', missing: ['a.two'], extra: ['c.extra'] },
      { file: 'common', locale: 'de', missing: ['a.one'], extra: ['a.extra', 'z.extra'] },
    ])
  })

  it('fails when a key is removed from a single locale', () => {
    // En mémoire : les vrais fichiers ne sont pas touchés.
    const file = 'common.json'
    const frKeys = readKeys('fr', file)
    expect(frKeys.length, 'aucune clé lue dans fr/common.json').toBeGreaterThan(0)
    const removed = frKeys[0]

    const byLocale: Record<string, string[]> = {}
    for (const locale of LOCALES) byLocale[locale] = readKeys(locale, file)
    byLocale.es = byLocale.es.filter((k) => k !== removed)

    expect(diffLocales('common', byLocale)).toEqual([
      { file: 'common', locale: 'es', missing: [removed], extra: [] },
    ])
  })
})
