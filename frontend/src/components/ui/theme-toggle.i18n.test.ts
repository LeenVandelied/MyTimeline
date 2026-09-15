// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * #642 (DEC-S82-009) — garde-fou i18n ET garde-fou d'EXPOSITION de la bascule
 * de thème hors connexion.
 *
 * Deux choses seulement peuvent faire échouer l'issue en silence :
 *  - un libellé manquant ou francophone dans une des 4 locales (le bouton est à
 *    icône seule : `aria-label` est le SEUL contenu que lit un lecteur d'écran) ;
 *  - un point de montage oublié ou retiré plus tard — la bascule ne « casse »
 *    rien en disparaissant, elle redevient simplement invisible aux visiteurs
 *    non connectés, ce qui est exactement le défaut que #642 corrige.
 *
 * CE QUE CE TEST NE PROUVE PAS : que la bascule soit ATTEIGNABLE au rendu. Un
 * composant monté dans une branche masquée resterait vert ici. C'est le rôle de
 * `e2e/landing-auth-theme-toggle.spec.ts`.
 */

const here = fileURLToPath(new URL('.', import.meta.url))
const read = (rel: string) => readFileSync(`${here}${rel}`, 'utf8')

const LOCALES = ['fr', 'en', 'es', 'de'] as const
const THEME_KEYS = ['toggle', 'toLight', 'toDark'] as const

type CommonMessages = { theme?: Record<string, string> }

function readCommon(locale: string): CommonMessages {
  return JSON.parse(read(`../../../public/locales/${locale}/common.json`)) as CommonMessages
}

describe('common.theme — les 4 locales', () => {
  it.each(LOCALES)('renseigne les 3 clés en %s', (locale) => {
    const theme = readCommon(locale).theme ?? {}
    for (const key of THEME_KEYS) {
      expect(typeof theme[key], `${locale}.theme.${key}`).toBe('string')
      expect(theme[key]?.trim().length, `${locale}.theme.${key}`).toBeGreaterThan(0)
    }
  })

  it.each(['en', 'es', 'de'])("n'est pas une recopie du français en %s", (locale) => {
    const fr = readCommon('fr').theme ?? {}
    const other = readCommon(locale).theme ?? {}
    for (const key of THEME_KEYS) {
      expect(other[key], `${locale}.theme.${key}`).not.toBe(fr[key])
    }
  })

  it('ne laisse aucune chaîne française en dur dans le composant', () => {
    const source = read('theme-toggle.tsx')
    expect(source).toContain("useTranslations('common')")
    expect(source).toContain("t('theme.toLight')")
    expect(source).toContain("t('theme.toDark')")
    expect(source).toContain("t('theme.toggle')")
  })
})

describe('ThemeToggle — points de montage publics', () => {
  const MOUNTS: Array<[string, string]> = [
    ['landing (nav desktop)', '../landing/HeaderSection.tsx'],
    ['landing (menu mobile)', '../landing/LandingMobileMenu.tsx'],
    ['auth — connexion', '../../../app/[locale]/login/page.tsx'],
    ['auth — inscription', '../../../app/[locale]/register/page.tsx'],
    ['auth — mot de passe oublié', '../../../app/[locale]/forgot-password/page.tsx'],
    ['auth — réinitialisation', '../../../app/[locale]/reset-password/page.tsx'],
  ]

  it.each(MOUNTS)('%s monte <ThemeToggle>', (_name, rel) => {
    const source = read(rel)
    expect(source).toContain("from '@/components/ui/theme-toggle'")
    expect(source).toContain('<ThemeToggle')
  })

  it('monte la bascule À CÔTÉ du sélecteur de langue partout', () => {
    for (const [, rel] of MOUNTS) {
      expect(read(rel), rel).toContain('<LanguageSelector />')
    }
  })

  it("n'introduit pas de second contrôle de thème concurrent sur ces surfaces", () => {
    // Aucun de ces fichiers ne doit rappeler `useTheme` en direct : la logique
    // vit dans `ui/theme-toggle.tsx` et nulle part ailleurs côté public.
    for (const [, rel] of MOUNTS) {
      expect(read(rel), rel).not.toContain("from 'next-themes'")
    }
  })
})
