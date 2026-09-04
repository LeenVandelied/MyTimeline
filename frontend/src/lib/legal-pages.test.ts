// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  LEGAL_LAST_UPDATED_ISO,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  formatLegalDate,
  shouldShowLegalDisclaimer,
  toRomanNumeral,
  type LegalSection,
} from './legal-pages'

/**
 * Garde-fous des finitions des pages légales — #60 (absorbe #172), Sprint 75.
 *
 * CE QUE CE FICHIER PROUVE.
 *  (1) Plus aucune chaîne « Retour » ni date `01/06/2023` en dur dans le JSX.
 *  (2) Chaque `id` déclaré dans `PRIVACY_SECTIONS` / `TERMS_SECTIONS` est
 *      RÉELLEMENT posé sur une `<section>` de la page correspondante, et chaque
 *      `titleKey` existe dans les 4 locales — un sommaire dont une entrée
 *      pointerait dans le vide serait sinon indétectable hors navigateur.
 *  (3) Parité EXACTE du namespace `legal` sur `fr`/`en`/`es`/`de`, et
 *      non-recopie du français pour les clés ajoutées.
 *  (4) Numérotation romaine et format de date.
 *
 * CE QUE CE FICHIER NE PROUVE PAS. Le SAUT D'ANCRE lui-même : jsdom ne résout
 * aucun fragment d'URL et ne défile pas ([[jsdom-scroll-tests-prove-nothing]]).
 * Un `id` présent dans la source n'atteste pas que le clic amène à la section.
 * Ce critère est couvert au navigateur par `e2e/sprint-75-legal-pages.spec.ts`,
 * et par lui seul.
 */

const here = fileURLToPath(new URL('.', import.meta.url))

const LOCALES = ['fr', 'en', 'es', 'de'] as const
const TRANSLATED_LOCALES = ['en', 'es', 'de'] as const

type Messages = Record<string, unknown>

function readLegal(locale: string): Messages {
  return JSON.parse(
    readFileSync(`${here}../../public/locales/${locale}/legal.json`, 'utf8'),
  ) as Messages
}

function readPageSource(page: 'privacy' | 'terms'): string {
  return readFileSync(`${here}../../app/[locale]/${page}/page.tsx`, 'utf8')
}

/** Résout `a.b.c` dans l'arbre de messages ; `undefined` si le chemin casse. */
function resolveKey(messages: Messages, key: string): unknown {
  return key.split('.').reduce<unknown>((node, segment) => {
    if (node === null || typeof node !== 'object') return undefined
    return (node as Record<string, unknown>)[segment]
  }, messages)
}

function flattenKeys(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  )
}

describe('toRomanNumeral', () => {
  it.each([
    [1, 'I'],
    [2, 'II'],
    [3, 'III'],
    [4, 'IV'],
    [5, 'V'],
    [9, 'IX'],
    [10, 'X'],
    [11, 'XI'],
    [14, 'XIV'],
    [40, 'XL'],
  ])('convertit %i en %s', (value, expected) => {
    expect(toRomanNumeral(value)).toBe(expected)
  })

  it.each([0, -1, 1.5])('refuse %s', (value) => {
    expect(() => toRomanNumeral(value)).toThrow(RangeError)
  })
})

describe('formatLegalDate', () => {
  it.each([
    ['fr', '1 juin 2023'],
    ['en', 'June 1, 2023'],
    ['es', '1 de junio de 2023'],
    ['de', '1. Juni 2023'],
  ])('rend le mois en toutes lettres en %s', (locale, expected) => {
    expect(formatLegalDate(locale)).toBe(expected)
  })

  it("ne rend jamais le format numérique ambigu d'origine", () => {
    for (const locale of LOCALES) {
      expect(formatLegalDate(locale)).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
    }
  })

  /**
   * `new Date('2023-06-01')` est minuit UTC : sans `timeZone: 'UTC'`, un poste à
   * l'ouest de Greenwich afficherait « 31 mai ». Les assertions de chaîne exacte
   * ci-dessus attrapent la régression — mais SEULEMENT sur une machine dans un
   * tel fuseau. Ce test-ci la rend visible partout : il compare au rendu qu'on
   * obtiendrait dans un fuseau occidental et exige qu'ils DIFFÈRENT, ce qui
   * n'est vrai que si la fonction épingle bien un fuseau.
   */
  it("épingle le fuseau et ne peut pas glisser d'un jour", () => {
    const drifting = new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Los_Angeles',
    }).format(new Date(`${LEGAL_LAST_UPDATED_ISO}T00:00:00Z`))

    expect(drifting).toBe('May 31, 2023')
    expect(formatLegalDate('en')).not.toBe(drifting)
  })
})

describe('shouldShowLegalDisclaimer', () => {
  it("est faux en fr — la page EST la version qui fait foi", () => {
    expect(shouldShowLegalDisclaimer('fr')).toBe(false)
  })

  it.each(TRANSLATED_LOCALES)('est vrai en %s', (locale) => {
    expect(shouldShowLegalDisclaimer(locale)).toBe(true)
  })
})

describe.each([
  ['privacy', PRIVACY_SECTIONS] as const,
  ['terms', TERMS_SECTIONS] as const,
])('sommaire de /%s', (page, sections: readonly LegalSection[]) => {
  const source = readPageSource(page)

  it('déclare au moins une section', () => {
    expect(sections.length).toBeGreaterThan(0)
  })

  it("n'a aucun id en double", () => {
    const ids = sections.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('pose chaque ancre déclarée sur une <section> de la page', () => {
    for (const section of sections) {
      expect(source).toContain(`<section id="${section.id}"`)
    }
  })

  it("ne laisse aucune <section> sans ancre (sinon le sommaire est incomplet)", () => {
    const total = source.match(/<section[\s>]/g) ?? []
    expect(total).toHaveLength(sections.length)
  })

  it('réutilise dans le JSX la clé de titre citée par le sommaire', () => {
    for (const section of sections) {
      expect(source).toContain(`t('${section.titleKey}')`)
    }
  })

  it.each(LOCALES)('résout chaque clé de titre en %s', (locale) => {
    const messages = readLegal(locale)
    for (const section of sections) {
      const title = resolveKey(messages, section.titleKey)
      expect(typeof title, `${section.titleKey} @ ${locale}`).toBe('string')
      expect((title as string).trim().length).toBeGreaterThan(0)
    }
  })

  it('câble le sommaire et le disclaimer', () => {
    expect(source).toContain('<LegalTableOfContents')
    expect(source).toContain('shouldShowLegalDisclaimer(locale)')
    expect(source).toContain("t('disclaimerOriginalFrench')")
  })

  it("n'a plus de libellé « Retour » ni de date en dur", () => {
    expect(source).not.toContain('<span>Retour</span>')
    expect(source).not.toContain("Retour à l&apos;accueil")
    expect(source).not.toContain('01/06/2023')
    expect(source).toContain("tCommon('navigation.back')")
    expect(source).toContain("tCommon('navigation.backToHome')")
    expect(source).toContain('formatLegalDate(locale)')
  })
})

describe('namespace legal — parité des 4 locales', () => {
  it('expose exactement le même jeu de clés', () => {
    const reference = flattenKeys(readLegal('fr')).sort()
    expect(reference).toContain('disclaimerOriginalFrench')
    expect(reference).toContain('tableOfContents')

    for (const locale of TRANSLATED_LOCALES) {
      expect(flattenKeys(readLegal(locale)).sort(), `locale ${locale}`).toEqual(reference)
    }
  })

  it.each(LOCALES)('ne contient aucune valeur vide en %s', (locale) => {
    const messages = readLegal(locale)
    for (const key of flattenKeys(messages)) {
      const value = resolveKey(messages, key)
      expect(typeof value, key).toBe('string')
      expect((value as string).trim().length, key).toBeGreaterThan(0)
    }
  })

  it.each(TRANSLATED_LOCALES)(
    'ne recopie pas le français pour les clés ajoutées en %s',
    (locale) => {
      const fr = readLegal('fr')
      const translated = readLegal(locale)
      for (const key of ['disclaimerOriginalFrench', 'tableOfContents']) {
        expect(resolveKey(translated, key), key).not.toBe(resolveKey(fr, key))
      }
    },
  )
})

describe('common.navigation — libellés « Retour » réutilisés', () => {
  it.each(LOCALES)('fournit back et backToHome en %s', (locale) => {
    const common = JSON.parse(
      readFileSync(`${here}../../public/locales/${locale}/common.json`, 'utf8'),
    ) as Messages
    for (const key of ['navigation.back', 'navigation.backToHome']) {
      const label = resolveKey(common, key)
      expect(typeof label, `${key} @ ${locale}`).toBe('string')
      expect((label as string).trim().length).toBeGreaterThan(0)
    }
  })

  it.each(TRANSLATED_LOCALES)("n'est pas une recopie du français en %s", (locale) => {
    const read = (loc: string) =>
      JSON.parse(readFileSync(`${here}../../public/locales/${loc}/common.json`, 'utf8')) as Messages
    for (const key of ['navigation.back', 'navigation.backToHome']) {
      expect(resolveKey(read(locale), key), `${key} @ ${locale}`).not.toBe(
        resolveKey(read('fr'), key),
      )
    }
  })
})
