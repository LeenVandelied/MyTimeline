import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HANDLES_FORBIDDEN_INLINE, handlesStatusInline } from './inlineErrorHandling'

/**
 * #761 — Transport de l'opt-out 403 : écran → hook → service → config axios.
 *
 * Vérifie que les services ne posent le drapeau QUE si l'appelant le fournit :
 * un appel sans option doit partir sans `inlineHandledStatuses` (sinon le toast
 * global serait tu pour des écrans qui n'affichent pas le 403 eux-mêmes).
 */

const postMock = vi.fn()
const patchMock = vi.fn()
vi.mock('./apiClient', () => ({
  default: {
    post: (...a: unknown[]) => postMock(...a),
    patch: (...a: unknown[]) => patchMock(...a),
  },
}))

const CATEGORY = { id: '11111111-1111-4111-8111-111111111111', name: 'Cat', system: false }

/** 3e argument (config axios) du dernier appel, lu sans cast. */
const lastConfig = (mock: ReturnType<typeof vi.fn>): unknown => mock.mock.calls.at(-1)?.[2]

const carriesFlag = (config: unknown): boolean =>
  typeof config === 'object' && config !== null && 'inlineHandledStatuses' in config

describe('handlesStatusInline', () => {
  it('reconnaît le 403 déclaré, ignore une config absente ou sans option', () => {
    expect(handlesStatusInline(HANDLES_FORBIDDEN_INLINE, 403)).toBe(true)
    expect(handlesStatusInline(undefined, 403)).toBe(false)
    expect(handlesStatusInline({ url: '/categories' }, 403)).toBe(false)
    expect(handlesStatusInline({ inlineHandledStatuses: [] }, 403)).toBe(false)
  })

  it("HANDLES_FORBIDDEN_INLINE est gelé (un appelant ne peut pas l'élargir)", () => {
    expect(Object.isFrozen(HANDLES_FORBIDDEN_INLINE)).toBe(true)
    expect(Object.isFrozen(HANDLES_FORBIDDEN_INLINE.inlineHandledStatuses)).toBe(true)
  })
})

describe("services produits / catégories — transport de l'option", () => {
  beforeEach(() => {
    postMock.mockReset().mockResolvedValue({ data: CATEGORY })
    patchMock.mockReset().mockResolvedValue({ data: CATEGORY })
  })

  it('sans option : aucun drapeau dans la config axios (4 fonctions)', async () => {
    const { createProduct, updateProduct } = await import('./productService')
    const { createCategory, updateCategory } = await import('./categoryService')

    await createProduct('u1', { name: 'P', category: CATEGORY.id })
    expect(carriesFlag(lastConfig(postMock))).toBe(false)
    await updateProduct('u1', 'p1', { name: 'P2' })
    expect(carriesFlag(lastConfig(patchMock))).toBe(false)
    await createCategory({ name: 'C' })
    expect(carriesFlag(lastConfig(postMock))).toBe(false)
    await updateCategory(CATEGORY.id, { name: 'C2' })
    expect(carriesFlag(lastConfig(patchMock))).toBe(false)
  })

  it('avec HANDLES_FORBIDDEN_INLINE : la config axios porte [403] (4 fonctions)', async () => {
    const { createProduct, updateProduct } = await import('./productService')
    const { createCategory, updateCategory } = await import('./categoryService')

    await createProduct('u1', { name: 'P', category: CATEGORY.id }, HANDLES_FORBIDDEN_INLINE)
    expect(lastConfig(postMock)).toEqual({ inlineHandledStatuses: [403] })
    await updateProduct('u1', 'p1', { name: 'P2' }, HANDLES_FORBIDDEN_INLINE)
    expect(lastConfig(patchMock)).toEqual({ inlineHandledStatuses: [403] })
    await createCategory({ name: 'C' }, HANDLES_FORBIDDEN_INLINE)
    expect(lastConfig(postMock)).toEqual({ inlineHandledStatuses: [403] })
    await updateCategory(CATEGORY.id, { name: 'C2' }, HANDLES_FORBIDDEN_INLINE)
    expect(lastConfig(patchMock)).toEqual({ inlineHandledStatuses: [403] })
  })
})
