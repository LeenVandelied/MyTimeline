import { describe, expect, it } from 'vitest'
import { productCreateSchema, productUpdateSchema, productSchema } from './product'

/**
 * #61 — Sync Zod ↔ DTO backend (BR-PRO-001). Le fix clé : `name` passe de
 * `min(3)` (désynchronisé) à `min(1).max(100)` (aligné @Size backend).
 */
describe('productCreateSchema', () => {
  it('rejette un nom vide', () => {
    const result = productCreateSchema.safeParse({
      name: '',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
    })
    expect(result.success).toBe(false)
  })

  it('accepte un nom de 1 caractère (min(1), fix désync BR-PRO-001)', () => {
    const result = productCreateSchema.safeParse({
      name: 'A',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un nom > 100 caractères', () => {
    const result = productCreateSchema.safeParse({
      name: 'x'.repeat(101),
      category: '018f3a2b-0000-7000-8000-0000000000c1',
    })
    expect(result.success).toBe(false)
  })

  it('rejette une catégorie non-UUID', () => {
    const result = productCreateSchema.safeParse({ name: 'Voiture', category: 'nope' })
    expect(result.success).toBe(false)
  })

  it('accepte events optionnel (omis) sans erreur', () => {
    const result = productCreateSchema.safeParse({
      name: 'Voiture',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
    })
    expect(result.success).toBe(true)
  })

  // #157 review — désync min(3) vs min(1) : un produit "AB" (2 car., valide
  // BR-PRO-001) AVEC un premier événement couplé dont le nom dérive du nom
  // produit ne doit PLUS throw (ZodError générique → produit non créé).
  it('accepte un nom produit de 2 caractères AVEC un premier événement couplé', () => {
    const result = productCreateSchema.safeParse({
      name: 'AB',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
      events: [{ name: 'AB', type: 'single', date: new Date('2026-01-01') }],
    })
    expect(result.success).toBe(true)
  })
})

describe('productUpdateSchema', () => {
  it('accepte un patch name seul', () => {
    expect(productUpdateSchema.safeParse({ name: 'Nouveau' }).success).toBe(true)
  })

  it('accepte un patch categoryId seul (champ nommé categoryId, pas category)', () => {
    const result = productUpdateSchema.safeParse({
      categoryId: '018f3a2b-0000-7000-8000-0000000000c1',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un patch vide (au moins un champ requis)', () => {
    expect(productUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejette un name vide dans le patch', () => {
    expect(productUpdateSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('productSchema (lecture)', () => {
  it('accepte un nom de 1 caractère renvoyé par le backend (min(1))', () => {
    const result = productSchema.safeParse({
      id: 'p1',
      name: 'A',
      category: { id: 'c1', name: 'Cat' },
      events: [],
    })
    expect(result.success).toBe(true)
  })
})
