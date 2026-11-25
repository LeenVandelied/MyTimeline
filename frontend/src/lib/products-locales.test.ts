import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #638 — la clé `add.categories` (4 anciens libellés d'ajout de produit, divergents du
 * handoff, référencée nulle part) ne doit subsister dans aucune des 4 locales. Lecture
 * des vrais fichiers : un oubli dans une seule locale se voit ici.
 */
const LOCALES = ['fr', 'en', 'de', 'es'] as const

function readProducts(locale: string): { add?: Record<string, unknown> } {
  const file = join(process.cwd(), 'public', 'locales', locale, 'products.json')
  return JSON.parse(readFileSync(file, 'utf8'))
}

describe('#638 — namespace products', () => {
  it('products namespace has no orphan add.categories key in any locale', () => {
    const withOrphan = LOCALES.filter((locale) => {
      const add = readProducts(locale).add
      return add !== undefined && Object.hasOwn(add, 'categories')
    })
    expect(withOrphan).toEqual([])
  })
})
