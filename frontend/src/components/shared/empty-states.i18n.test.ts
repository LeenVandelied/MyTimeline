import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #630 — Garde des libellés d'états vides dans les 4 locales.
 *
 * Les tests de rendu des surfaces mockent `next-intl` en `${ns}.${key}` : une clé
 * ABSENTE y rend exactement la même chose qu'une clé présente (PIT-S63-006). Ce
 * fichier lit donc les VRAIS messages et vérifie, pour chaque clé consommée par
 * un état vide ou son CTA : présence dans fr/en/es/de, chaîne non vide, et aucun
 * emoji (contrainte explicite du handoff : pas d'illustration ni d'emoji).
 *
 * CE QU'IL N'ATTRAPE PAS : une clé orthographiée différemment dans le COMPOSANT
 * (`t('emptyCTA')`) — la liste ci-dessous est tenue à la main, en miroir des appels.
 */

const LOCALES = ['fr', 'en', 'es', 'de'] as const

/** [fichier de namespace, chemin de clé] consommés par les états vides #630. */
const KEYS: ReadonlyArray<readonly [string, string]> = [
  ['shell', 'timeline.emptyTitle'],
  ['shell', 'timeline.emptyBody'],
  ['shell', 'timeline.emptyCta'],
  ['products', 'list.empty'],
  ['products', 'list.emptyCta'],
  ['products', 'list.emptySearch'],
  ['products', 'list.clearSearch'],
  ['products', 'categories.empty'],
  ['products', 'categories.emptyCta'],
  ['dashboard', 'week.empty'],
  ['dashboard', 'week.emptyCta'],
  ['dashboard', 'productList.empty'],
  ['dashboard', 'productList.emptyCta'],
  ['dashboard', 'mobile.compactAgenda.emptyTitle'],
  ['dashboard', 'mobile.compactAgenda.emptyCta'],
]

function load(locale: string, file: string): unknown {
  const path = join(process.cwd(), 'public', 'locales', locale, `${file}.json`)
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function resolve(messages: unknown, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((node, segment) => {
    if (node && typeof node === 'object' && segment in node) {
      return (node as Record<string, unknown>)[segment]
    }
    return undefined
  }, messages)
}

describe('#630 — libellés des états vides', () => {
  for (const locale of LOCALES) {
    it(`${locale} : chaque clé existe, non vide, sans emoji`, () => {
      for (const [file, keyPath] of KEYS) {
        const value = resolve(load(locale, file), keyPath)
        expect(typeof value, `${locale}/${file}.json → ${keyPath}`).toBe('string')
        expect(
          (value as string).trim().length,
          `${locale}/${file}.json → ${keyPath}`,
        ).toBeGreaterThan(0)
        expect(/\p{Extended_Pictographic}/u.test(value as string), `${locale} ${keyPath}`).toBe(
          false,
        )
      }
    })
  }
})
