import { describe, expect, it } from 'vitest'

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale } from './locales'

/**
 * #235 — Source de vérité unique des locales. Garantit que la config accepte
 * bien les 4 langues (fix 404 sur /es et /de : le layout ne reconnaissait que
 * fr/en alors que le middleware routait 4 langues). Ce test verrouille le
 * contrat consommé par middleware.ts ET app/[locale]/layout.tsx.
 */
describe('SUPPORTED_LOCALES', () => {
  it('contient exactement les 4 langues MVP (fr, en, es, de)', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['fr', 'en', 'es', 'de'])
  })

  it('déclare fr comme locale par défaut', () => {
    expect(DEFAULT_LOCALE).toBe('fr')
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE)
  })
})

describe('isSupportedLocale', () => {
  it.each(['fr', 'en', 'es', 'de'])('accepte %s (plus de notFound/404)', (locale) => {
    expect(isSupportedLocale(locale)).toBe(true)
  })

  it.each(['it', 'pt', 'EN', '', 'es-ES', 'xx'])('rejette %s', (locale) => {
    expect(isSupportedLocale(locale)).toBe(false)
  })
})
