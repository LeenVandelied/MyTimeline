// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou i18n de l'ÉTIQUETTE ACCESSIBLE du sélecteur de langue — #353,
 * Sprint 58.
 *
 * CONTEXTE. Le `<span className="sr-only">` du déclencheur portait la chaîne
 * française « Changer de langue » EN DUR. C'est le seul contenu textuel du
 * bouton (l'icône `Globe` n'en a aucun), donc la seule chose qu'annonce un
 * lecteur d'écran — annoncée en français en `en`, `es` et `de`, sur un bouton
 * dont la fonction est précisément de changer de langue.
 *
 * CE QUE CE TEST PROUVE. (1) Le composant ne contient plus la chaîne FR en dur
 * et passe par `t('navigation.changeLanguage')`. (2) La clé
 * `navigation.changeLanguage` existe dans les 4 fichiers `common.json`, est non
 * vide, et n'est pas une recopie du français dans `en`/`es`/`de`.
 *
 * CE QUE CE TEST NE PROUVE PAS. Rien de la CIBLE TACTILE ni du débordement du
 * header : jsdom ne résout aucune mise en page, ne calcule aucune bounding box
 * de pseudo-élément et ne connaît pas `scrollWidth` (PIT-S51). Ces deux
 * critères ne se vérifient qu'au navigateur — mesures reportées dans le pavé de
 * commentaire de `language-selector.tsx`. Il ne prouve pas non plus la
 * QUALITÉ des traductions, seulement leur non-identité au français.
 */

const here = fileURLToPath(new URL('.', import.meta.url))
const componentSource = readFileSync(`${here}language-selector.tsx`, 'utf8')

const LOCALES = ['fr', 'en', 'es', 'de'] as const

type CommonMessages = {
  navigation?: Record<string, string>
}

function readCommon(locale: string): CommonMessages {
  const raw = readFileSync(`${here}../../../public/locales/${locale}/common.json`, 'utf8')
  return JSON.parse(raw) as CommonMessages
}

describe('LanguageSelector — étiquette accessible', () => {
  it("ne contient plus la chaîne française en dur", () => {
    expect(componentSource).not.toContain('>Changer de langue<')
  })

  it('rend le libellé via next-intl', () => {
    expect(componentSource).toContain("useTranslations('common')")
    expect(componentSource).toContain("t('navigation.changeLanguage')")
  })
})

describe('common.navigation.changeLanguage', () => {
  it.each(LOCALES)('est renseignée et non vide en %s', (locale) => {
    const label = readCommon(locale).navigation?.changeLanguage
    expect(typeof label).toBe('string')
    expect(label?.trim().length).toBeGreaterThan(0)
  })

  it.each(['en', 'es', 'de'])("n'est pas une recopie du français en %s", (locale) => {
    const fr = readCommon('fr').navigation?.changeLanguage
    expect(readCommon(locale).navigation?.changeLanguage).not.toBe(fr)
  })

  it('conserve les clés de navigation préexistantes dans les 4 locales', () => {
    for (const locale of LOCALES) {
      const navigation = readCommon(locale).navigation ?? {}
      expect(Object.keys(navigation)).toEqual([
        'home',
        'profile',
        'settings',
        'back',
        'backToHome',
        'changeLanguage',
      ])
    }
  })
})
