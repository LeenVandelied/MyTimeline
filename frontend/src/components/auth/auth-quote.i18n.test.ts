// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * #625 — la citation du panneau d'authentification vit dans `auth.json`, clés
 * `quote.text` et `quote.attribution`, dans les quatre langues du produit.
 */
const LOCALES = ['fr', 'en', 'es', 'de'] as const

function readAuth(locale: string) {
  const url = new URL(`../../../public/locales/${locale}/auth.json`, import.meta.url)
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as {
    quote?: { text?: unknown; attribution?: unknown }
  }
}

describe('auth quote translations', () => {
  it('quote keys exist in fr en es de', () => {
    for (const locale of LOCALES) {
      const quote = readAuth(locale).quote
      expect(typeof quote?.text, `${locale} quote.text`).toBe('string')
      expect((quote?.text as string | undefined)?.trim(), `${locale} quote.text`).toBeTruthy()
      expect(typeof quote?.attribution, `${locale} quote.attribution`).toBe('string')
      expect(
        (quote?.attribution as string | undefined)?.trim(),
        `${locale} quote.attribution`,
      ).toBeTruthy()
    }
  })
})
