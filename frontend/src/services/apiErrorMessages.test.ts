import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  API_ERROR_KEYS,
  setApiErrorTranslator,
  translateApiError,
  type ApiErrorKey,
} from './apiErrorMessages'

/**
 * #713 — Le pont i18n de la couche transport.
 *
 * Ce fichier tient DEUX promesses que le code seul ne peut pas tenir :
 *  1. le repli français de `apiErrorMessages.ts` ne dérive pas de
 *     `public/locales/fr/errors.json` (sinon il deviendrait une 2e source de
 *     vérité, silencieusement périmée) ;
 *  2. les 4 clés existent dans les 4 locales, avec une VRAIE traduction — la
 *     garde `i18n-namespaces.test.ts` ne vérifie que les namespaces de premier
 *     niveau, pas les feuilles (elle le dit elle-même dans son en-tête).
 */

const LOCALES = ['fr', 'en', 'es', 'de'] as const
const ALL_KEYS: ApiErrorKey[] = Object.values(API_ERROR_KEYS)

const readErrors = (locale: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public', 'locales', locale, 'errors.json'), 'utf8'))

/** Résout `auth.sessionExpired` dans l'objet JSON chargé. */
const leaf = (messages: Record<string, unknown>, key: string): unknown => {
  let node: unknown = messages
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return node
}

afterEach(() => {
  // Registre = état de MODULE : un test qui l'alimente contaminerait les suivants.
  setApiErrorTranslator(null)
})

describe('apiErrorMessages — les 4 messages réseau existent dans les 4 locales (#713)', () => {
  it('balaye réellement 4 clés (garde anti-vacuité)', () => {
    // Sans ce plancher, un `API_ERROR_KEYS` vidé par accident rendrait toutes
    // les boucles ci-dessous VERTES en ne vérifiant rien.
    expect(ALL_KEYS.length).toBe(4)
  })

  it.each(LOCALES)('la locale `%s` définit les 4 clés, non vides', (locale) => {
    const messages = readErrors(locale)
    for (const key of ALL_KEYS) {
      const value = leaf(messages, key)
      expect(typeof value, `errors.${key} manquant en \`${locale}\``).toBe('string')
      expect(
        (value as string).trim().length,
        `errors.${key} vide en \`${locale}\``,
      ).toBeGreaterThan(0)
    }
  })

  it('les 3 autres locales ne recopient PAS le français (traduction réelle)', () => {
    // Le défaut de #713 est précisément « l'utilisateur en/de/es voit du
    // français ». Une clé ajoutée aux 4 fichiers avec la valeur FR partout
    // passerait le test précédent tout en laissant le bug intact.
    const fr = readErrors('fr')
    for (const locale of ['en', 'es', 'de'] as const) {
      const messages = readErrors(locale)
      for (const key of ALL_KEYS) {
        expect(leaf(messages, key), `errors.${key} non traduit en \`${locale}\``).not.toBe(
          leaf(fr, key),
        )
      }
    }
  })

  it('le repli français est identique à `public/locales/fr/errors.json`', () => {
    // `errors.json` reste la SOURCE UNIQUE. Le repli du module n'est qu'un filet
    // pour l'instant où le registre n'est pas encore alimenté : s'il dérive, un
    // utilisateur `fr` verrait deux libellés différents selon le timing.
    const fr = readErrors('fr')
    for (const key of ALL_KEYS) {
      expect(translateApiError(key), `repli désynchronisé pour errors.${key}`).toBe(leaf(fr, key))
    }
  })

  it("le 403 n'est PAS aiguillé sur la clé du 401", () => {
    // 403 = accès refusé à un utilisateur authentifié ; 401 = session morte.
    // Partager la clé ferait dire « session expirée » à un refus d'accès (#733).
    expect(API_ERROR_KEYS.forbidden).not.toBe(API_ERROR_KEYS.sessionExpired)
  })

  it('le libellé du 403 dit « accès refusé » et ne parle NI de session NI de redirection (#733)', () => {
    const expected = {
      fr: { denied: /accès refusé/i, banned: /session|expir|connexion|redirect/i },
      en: { denied: /access denied/i, banned: /session|expir|login|redirect/i },
      es: { denied: /acceso denegado/i, banned: /sesión|expir|inicio de sesión|redirig/i },
      de: { denied: /zugriff verweigert/i, banned: /sitzung|abgelaufen|anmeld|weiterleit/i },
    } as const
    for (const locale of LOCALES) {
      const label = leaf(readErrors(locale), API_ERROR_KEYS.forbidden)
      expect(label, `errors.auth.forbidden en \`${locale}\``).toMatch(expected[locale].denied)
      expect(label, `errors.auth.forbidden en \`${locale}\``).not.toMatch(expected[locale].banned)
    }
  })
})

describe('registre de traduction — repli et garde anti-clé-brute (#713)', () => {
  it('sans traducteur enregistré, rend le français', () => {
    expect(translateApiError(API_ERROR_KEYS.validation)).toBe(
      'Erreur de validation, veuillez vérifier vos données.',
    )
  })

  it('avec traducteur enregistré, rend sa valeur', () => {
    setApiErrorTranslator((key) => `[traduit:${key}]`)
    expect(translateApiError(API_ERROR_KEYS.serverError)).toBe('[traduit:server.error]')
  })

  it('après désenregistrement, revient au français', () => {
    setApiErrorTranslator(() => 'valeur de test')
    setApiErrorTranslator(null)
    expect(translateApiError(API_ERROR_KEYS.serverError)).toBe(
      'Erreur serveur. Veuillez réessayer plus tard',
    )
  })

  it("n'affiche JAMAIS un chemin de clé brut à l'utilisateur", () => {
    // C'est le `getMessageFallback` par défaut de next-intl, et le défaut exact
    // de #441 (« deleteDialog.product.title » affiché en toutes lettres).
    setApiErrorTranslator((key) => key)
    expect(translateApiError(API_ERROR_KEYS.validation)).toBe(
      'Erreur de validation, veuillez vérifier vos données.',
    )

    setApiErrorTranslator((key) => `errors.${key}`)
    expect(translateApiError(API_ERROR_KEYS.validation)).toBe(
      'Erreur de validation, veuillez vérifier vos données.',
    )
  })

  it('replie sur le français si le traducteur lève ou rend du vide', () => {
    setApiErrorTranslator(() => {
      throw new Error('MISSING_MESSAGE')
    })
    expect(translateApiError(API_ERROR_KEYS.sessionExpired)).toBe(
      'Votre session a expiré. Veuillez vous reconnecter',
    )

    setApiErrorTranslator(() => '')
    expect(translateApiError(API_ERROR_KEYS.sessionExpired)).toBe(
      'Votre session a expiré. Veuillez vous reconnecter',
    )
  })

  it('un traducteur qui rend une chaîne légitime passe (contrôle négatif)', () => {
    // Sans ce cas, une garde anti-clé-brute trop large (qui replierait TOUJOURS)
    // serait indétectable : tous les tests ci-dessus resteraient verts.
    const spy = vi.fn(() => 'Serverfehler. Bitte versuchen Sie es später erneut')
    setApiErrorTranslator(spy)
    expect(translateApiError(API_ERROR_KEYS.serverError)).toBe(
      'Serverfehler. Bitte versuchen Sie es später erneut',
    )
    expect(spy).toHaveBeenCalledWith('server.error')
  })
})
