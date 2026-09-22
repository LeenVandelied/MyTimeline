import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSelector } from './language-selector'

/**
 * Garde-fou d'imbrication d'interactifs — #342, Sprint 74.
 *
 * CONTEXTE. Les items de locale étaient rendus `<Link><DropdownMenuItem/></Link>`.
 * Radix pose `role="menuitem"` et un `tabindex` sur l'item : imbriqué dans
 * l'ancre de `next/link`, cela produisait deux éléments interactifs empilés par
 * langue (HTML invalide, double cible de tabulation). Le correctif inverse
 * l'imbrication via `asChild`, comme #295 l'avait fait avec `<Button asChild>`.
 *
 * CE QUE CE TEST PROUVE. (1) Le menu ouvert ne contient AUCUN interactif
 * imbriqué dans un autre. (2) Chaque item de locale est UN SEUL élément : le
 * `<a>` EST le `menuitem` — donc une seule cible de tabulation par langue.
 * (3) Le `href` reste préfixé par la locale cible (`localePrefix: 'always'`),
 * le chemin courant étant conservé : le comportement fonctionnel du sélecteur
 * est inchangé.
 *
 * CE QUE CE TEST NE PROUVE PAS. Rien du RENDU. jsdom ne résout ni la précédence
 * des `@layer` ni aucune mise en page (PIT-S48-005) : les contrastes de l'item
 * actif, la cible tactile 44x44 du déclencheur et l'absence de compression du
 * `<a>` fusionné ne se vérifient qu'au navigateur. Il ne prouve pas non plus la
 * navigation réelle — `next/link` ne route pas sous jsdom.
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/dashboard',
}))

const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
] as const

async function openMenu() {
  const user = userEvent.setup()
  render(<LanguageSelector />)
  await user.click(screen.getByRole('button'))
  const menu = await screen.findByRole('menu')
  return menu
}

describe('LanguageSelector — imbrication d’interactifs (#342)', () => {
  it("n'imbrique aucun contrôle interactif dans un autre", async () => {
    const menu = await openMenu()

    expect(menu.querySelector('a [role="menuitem"]')).toBeNull()
    expect(menu.querySelector('a button')).toBeNull()
    expect(menu.querySelector('button a')).toBeNull()
    expect(menu.querySelector('a a')).toBeNull()
  })

  it('rend une seule cible par langue : le <a> EST le menuitem', async () => {
    const menu = await openMenu()

    const items = screen.getAllByRole('menuitem')
    const anchors = Array.from(menu.querySelectorAll('a'))

    expect(items).toHaveLength(LANGUAGES.length)
    expect(anchors).toHaveLength(LANGUAGES.length)
    for (const item of items) {
      expect(item.tagName).toBe('A')
    }
    // Aucune ancre n'est un point d'arrêt de tabulation natif en PLUS du
    // roving tabindex de Radix : chacune est celui-là même que Radix pilote.
    expect(anchors.every((a) => a.hasAttribute('tabindex'))).toBe(true)
  })

  it('conserve le href localisé, chemin courant préservé', async () => {
    await openMenu()

    for (const language of LANGUAGES) {
      const item = screen.getByRole('menuitem', { name: language.name })
      expect(item).toHaveAttribute('href', `/${language.code}/dashboard`)
    }
  })
})
