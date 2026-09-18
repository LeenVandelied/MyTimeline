import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiErrorTranslatorBridge } from './ApiErrorTranslatorBridge'
import { API_ERROR_KEYS, setApiErrorTranslator, translateApiError } from './apiErrorMessages'

/**
 * #713 — Preuve de bout en bout de la chaîne : VRAI `NextIntlClientProvider`,
 * VRAIS messages du dépôt, puis lecture depuis la couche TRANSPORT
 * (`translateApiError`, celle qu'appelle l'intercepteur axios).
 *
 * POURQUOI CE TEST ET PAS SEULEMENT `apiErrorMessages.test.ts` : ce dernier
 * injecte un traducteur factice. Il prouve le registre, PAS que `useTranslations`
 * résout réellement `errors.validation.error` sous le provider. Un namespace
 * faux (défaut de #441) ou une clé absente y serait invisible — ici, non : le
 * message attendu est lu dans le JSON de la locale.
 */

const readErrors = (locale: string): Record<string, Record<string, string>> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public', 'locales', locale, 'errors.json'), 'utf8'))

const renderBridge = (locale: string) =>
  render(
    <NextIntlClientProvider locale={locale} messages={{ errors: readErrors(locale) }}>
      <ApiErrorTranslatorBridge />
    </NextIntlClientProvider>,
  )

afterEach(() => {
  setApiErrorTranslator(null)
})

describe('ApiErrorTranslatorBridge — les messages réseau suivent la locale (#713)', () => {
  it.each(['en', 'es', 'de'])(
    'en locale `%s`, la couche transport rend la traduction, pas le français',
    (locale) => {
      const expected = readErrors(locale)
      const fr = readErrors('fr')
      renderBridge(locale)

      expect(translateApiError(API_ERROR_KEYS.validation)).toBe(expected.validation.error)
      expect(translateApiError(API_ERROR_KEYS.sessionExpired)).toBe(expected.auth.sessionExpired)
      expect(translateApiError(API_ERROR_KEYS.forbidden)).toBe(expected.auth.forbiddenRedirect)
      expect(translateApiError(API_ERROR_KEYS.serverError)).toBe(expected.server.error)

      // Le défaut corrigé, énoncé frontalement : plus une seule chaîne française.
      expect(translateApiError(API_ERROR_KEYS.validation)).not.toBe(fr.validation.error)
      expect(translateApiError(API_ERROR_KEYS.serverError)).not.toBe(fr.server.error)
    },
  )

  it('en locale `fr`, rend les libellés français du dépôt', () => {
    const fr = readErrors('fr')
    renderBridge('fr')
    expect(translateApiError(API_ERROR_KEYS.validation)).toBe(fr.validation.error)
    expect(translateApiError(API_ERROR_KEYS.forbidden)).toBe(fr.auth.forbiddenRedirect)
  })

  it('ne rend aucun élément dans le DOM (pont, pas interface)', () => {
    const { container } = renderBridge('fr')
    expect(container.innerHTML).toBe('')
  })

  it('au démontage, la couche transport retombe sur le français', () => {
    const { unmount } = renderBridge('de')
    expect(translateApiError(API_ERROR_KEYS.serverError)).toBe(readErrors('de').server.error)
    unmount()
    expect(translateApiError(API_ERROR_KEYS.serverError)).toBe(readErrors('fr').server.error)
  })
})
