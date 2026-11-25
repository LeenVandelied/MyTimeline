// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { PROD, SHARED } from '../../e2e/support/accounts'
import { shouldWarmProductDetail } from '../../e2e/support/dev-warmup'

/**
 * #558 — le préchauffage de la fiche produit ne vise que le compte PROD, et seulement
 * quand Playwright démarre lui-même le serveur local (`PLAYWRIGHT_BASE_URL` absente).
 */
describe('#558 — shouldWarmProductDetail', () => {
  it('compte PROD sans PLAYWRIGHT_BASE_URL : préchauffe', () => {
    expect(shouldWarmProductDetail(PROD, undefined)).toBe(true)
  })

  it('compte PROD avec PLAYWRIGHT_BASE_URL : ne préchauffe pas', () => {
    expect(shouldWarmProductDetail(PROD, 'http://localhost:3000')).toBe(false)
  })

  it('autre compte sans PLAYWRIGHT_BASE_URL : ne préchauffe pas', () => {
    expect(shouldWarmProductDetail(SHARED, undefined)).toBe(false)
  })

  it('autre compte avec PLAYWRIGHT_BASE_URL : ne préchauffe pas', () => {
    expect(shouldWarmProductDetail(SHARED, 'http://localhost:3000')).toBe(false)
  })
})
