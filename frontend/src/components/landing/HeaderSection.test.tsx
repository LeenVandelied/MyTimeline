import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HeaderSection } from './HeaderSection'

/**
 * #56 / #295 — en-tête extrait du monolithe HomePage.
 * next-intl mocké → `t('a.b.c')` renvoie la clé littérale.
 *
 * ⚠ #334 — CE QUE CES TESTS NE PROUVENT PAS. jsdom ne résout ni les media
 * queries, ni la précédence des `@layer`, ni la moindre mise en page : il ne
 * peut PAS constater l'absence de scroll horizontal, qui est le cœur de #334.
 * On y vérifie la STRUCTURE et l'A11Y (présence des classes de bascule, rôles,
 * attributs ARIA, ouverture/fermeture). La mesure `scrollWidth <= clientWidth`
 * à 375 / 390 px se fait au navigateur (cf. rapport #334).
 */
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('HeaderSection', () => {
  it('rend les trois ancres de navigation', () => {
    render(<HeaderSection locale="fr" />)
    expect(screen.getByText('common.landing.navigation.features')).toHaveAttribute(
      'href',
      '#features',
    )
    expect(screen.getByText('common.landing.navigation.howItWorks')).toHaveAttribute(
      'href',
      '#how-it-works',
    )
    expect(screen.getByText('common.landing.navigation.testimonials')).toHaveAttribute(
      'href',
      '#testimonials',
    )
  })

  it('préfixe les liens d’authentification par la locale reçue', () => {
    render(<HeaderSection locale="de" />)
    expect(screen.getByText('common.login.title').closest('a')).toHaveAttribute('href', '/de/login')
    expect(screen.getByText('common.landing.buttons.register').closest('a')).toHaveAttribute(
      'href',
      '/de/register',
    )
  })

  /**
   * #295 — RÉGRESSION. `<Link passHref><Button>` rendait un `<button>` DANS un `<a>` :
   * HTML invalide, deux arrêts de tabulation pour une seule action, et une sémantique
   * ambiguë pour les lecteurs d'écran. `<Button asChild>` fusionne les deux en une
   * seule ancre. On interdit ici les DEUX sens d'imbrication.
   */
  it('n’imbrique aucun contrôle interactif dans un autre (#295)', () => {
    const { container } = render(<HeaderSection locale="fr" />)
    expect(container.querySelector('a button')).toBeNull()
    expect(container.querySelector('button a')).toBeNull()
  })

  it('rend les liens d’authentification comme de vraies ancres', () => {
    render(<HeaderSection locale="fr" />)
    const login = screen.getByText('common.login.title')
    expect(login.tagName).toBe('A')
    expect(screen.getByText('common.landing.buttons.register').tagName).toBe('A')
  })

  /**
   * #334 — le groupe droit débordait de 173 px à 375 px. Sous `md`, seuls le CTA
   * « Inscription » et le burger restent dans le header ; le sélecteur de langue et
   * « Connexion » passent derrière la classe de bascule `hidden md:flex`.
   */
  it('masque sous `md` le sélecteur de langue et « Connexion » (#334)', () => {
    const { container } = render(<HeaderSection locale="fr" />)
    const secondary = container.querySelector('header > div:last-of-type > div')
    expect(secondary?.className).toContain('hidden')
    expect(secondary?.className).toContain('md:flex')
    expect(within(secondary as HTMLElement).getByText('common.login.title')).toBeInTheDocument()
  })

  it('garde « Inscription » visible à toute largeur et le burger sous `md` (#334)', () => {
    render(<HeaderSection locale="fr" />)
    const register = screen.getByText('common.landing.buttons.register')
    // `classList` et pas `className` : la classe utilitaire `focus-visible:outline-hidden`
    // du Button contient la sous-chaîne « hidden » et fausserait un `toContain`.
    expect(register.classList.contains('hidden')).toBe(false)
    expect(register.classList.contains('md:hidden')).toBe(false)

    const toggle = screen.getByTestId('landing-header-menu-toggle')
    expect(toggle.classList.contains('md:hidden')).toBe(true)
    // Cible tactile 44x44 (h-11 w-11 = --space-11 = 44px).
    expect(toggle.classList.contains('h-11')).toBe(true)
    expect(toggle.classList.contains('w-11')).toBe(true)
  })

  it('expose un burger correctement câblé en ARIA (#334)', () => {
    render(<HeaderSection locale="fr" />)
    const toggle = screen.getByTestId('landing-header-menu-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'landing-header-menu')
    expect(toggle).toHaveAttribute('aria-label', 'common.landing.navigation.menuOpen')
    expect(screen.queryByTestId('landing-header-menu')).not.toBeInTheDocument()
  })

  it('ouvre le panneau et y expose nav + Connexion + langue (#334)', async () => {
    const user = userEvent.setup()
    render(<HeaderSection locale="fr" />)
    await user.click(screen.getByTestId('landing-header-menu-toggle'))

    const panel = screen.getByTestId('landing-header-menu')
    expect(panel).toHaveAttribute('role', 'dialog')
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(panel).toHaveAttribute('aria-labelledby', 'landing-header-menu-title')
    expect(screen.getByTestId('landing-header-menu-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    // Les 3 ancres + « Connexion » sont atteignables depuis le panneau (critère 2).
    expect(within(panel).getByText('common.landing.navigation.features')).toBeInTheDocument()
    expect(within(panel).getByText('common.login.title').closest('a')).toHaveAttribute(
      'href',
      '/fr/login',
    )
  })

  it('ferme le panneau via le bouton fermer, Escape et le clic sur une ancre (#334)', async () => {
    const user = userEvent.setup()
    render(<HeaderSection locale="fr" />)
    const open = () => user.click(screen.getByTestId('landing-header-menu-toggle'))

    await open()
    await user.click(screen.getByTestId('landing-header-menu-close'))
    expect(screen.queryByTestId('landing-header-menu')).not.toBeInTheDocument()

    await open()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('landing-header-menu')).not.toBeInTheDocument()

    await open()
    const panel = screen.getByTestId('landing-header-menu')
    await user.click(within(panel).getByText('common.landing.navigation.features'))
    expect(screen.queryByTestId('landing-header-menu')).not.toBeInTheDocument()
  })

  it('restaure le focus sur le burger à la fermeture (#334)', async () => {
    const user = userEvent.setup()
    render(<HeaderSection locale="fr" />)
    const toggle = screen.getByTestId('landing-header-menu-toggle')

    toggle.focus()
    await user.click(toggle)
    // `useFocusTrap` place le focus sur le premier focusable du panneau.
    expect(screen.getByTestId('landing-header-menu').contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(toggle)
  })
})
