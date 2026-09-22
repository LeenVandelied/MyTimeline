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

  // #158 — couleur produit optionnelle (hex #RRGGBB).
  it('accepte une couleur hex #RRGGBB (surcharge produit)', () => {
    const result = productCreateSchema.safeParse({
      name: 'Voiture',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
      color: '#ff8800',
    })
    expect(result.success).toBe(true)
  })

  it('rejette une couleur non-hex', () => {
    const result = productCreateSchema.safeParse({
      name: 'Voiture',
      category: '018f3a2b-0000-7000-8000-0000000000c1',
      color: 'red',
    })
    expect(result.success).toBe(false)
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

  // #158 — couleur produit en PATCH : `color` (surcharge) ou `clearColor` (reset).
  it('accepte un patch color seul (surcharge)', () => {
    expect(productUpdateSchema.safeParse({ color: '#123456' }).success).toBe(true)
  })

  it('accepte un patch clearColor:true seul (reset -> ré-héritage)', () => {
    expect(productUpdateSchema.safeParse({ clearColor: true }).success).toBe(true)
  })

  it('rejette une couleur non-hex dans le patch', () => {
    expect(productUpdateSchema.safeParse({ color: 'blue' }).success).toBe(false)
  })

  it('rejette clearColor:false (non porteur de mutation, doit être omis)', () => {
    expect(productUpdateSchema.safeParse({ clearColor: false }).success).toBe(false)
  })
})

describe('productSchema (lecture)', () => {
  it('accepte un produit avec color null + category.color null (héritage)', () => {
    const result = productSchema.safeParse({
      id: 'p1',
      name: 'A',
      color: null,
      category: { id: 'c1', name: 'Cat', color: null },
      events: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepte un produit avec surcharge color + couleur catégorie hex (#158)', () => {
    const result = productSchema.safeParse({
      id: 'p1',
      name: 'A',
      color: '#ff8800',
      category: { id: 'c1', name: 'Cat', color: '#112233' },
      events: [],
    })
    expect(result.success).toBe(true)
  })
})
