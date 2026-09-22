import { describe, expect, it } from 'vitest'

import { resolveLocale, loadMessages } from '../../i18n'

/**
 * #279 — Garde de la migration `getRequestConfig({locale})` →
 * `requestLocale` + `hasLocale` (PIT-S34-001).
 *
 * POURQUOI CE FICHIER, alors que `next build` prérend déjà 52 pages sur
 * 4 locales : le build n'exerce QUE des segments `[locale]` VALIDES. Il ne
 * prouve rien du repli, or c'est exactement la branche dont la sémantique
 * change ici. `requestLocale` peut valoir `undefined` (page rendue hors du
 * segment `[locale]`) ou une valeur ARBITRAIRE — le segment agit comme un
 * attrape-tout (`/unknown.txt`).
 *
 * ⚠ Le `default export` lui-même n'est PAS testable ici : Vitest résout
 * `next-intl/server` sur son bundle react-client, où `getRequestConfig` est un
 * stub qui lève « not supported in Client Components ». D'où le test sur
 * `resolveLocale`, que le `default export` appelle réellement.
 */
describe('#279 — résolution de locale du request config', () => {
  it('conserve chaque locale supportée', () => {
    for (const locale of ['fr', 'en', 'es', 'de']) {
      expect(resolveLocale(locale)).toBe(locale)
    }
  })

  it('replie sur `fr` quand la locale est absente', () => {
    expect(resolveLocale(undefined)).toBe('fr')
  })

  it('replie sur `fr` sur une valeur non supportée (attrape-tout)', () => {
    // Avant #279 : `'unknown.txt' || 'fr'` → `'unknown.txt'`, donc chargement
    // d'un répertoire de messages inexistant et page rendue MUETTE.
    expect(resolveLocale('unknown.txt')).toBe('fr')
    expect(resolveLocale('')).toBe('fr')
    expect(resolveLocale('FR')).toBe('fr')
  })

  it('la locale repliée a bien des messages sur le disque', async () => {
    expect(Object.keys(await loadMessages(resolveLocale('unknown.txt'))).length).toBeGreaterThan(0)
  })
})
