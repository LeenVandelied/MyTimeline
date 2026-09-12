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
   * #334 — le groupe droit débordait de 173 px à 375 px. Sous le point de bascule, seuls
   * le CTA « Inscription » et le burger restent dans le header ; le sélecteur de langue et
   * « Connexion » passent derrière la classe `hidden lg:flex`.
   * #347 — bascule remontée de `md` à `lg` : le palier tablette (768–1023 px) rendait la
   * mise en page desktop et débordait de 90 à 108 px selon la locale.
   */
  it('masque sous `lg` le sélecteur de langue et « Connexion » (#334, seuil #347)', () => {
    const { container } = render(<HeaderSection locale="fr" />)
    const secondary = container.querySelector('header > div:last-of-type > div')
    expect(secondary?.className).toContain('hidden')
    expect(secondary?.className).toContain('lg:flex')
    expect(secondary?.className).not.toContain('md:flex')
    expect(within(secondary as HTMLElement).getByText('common.login.title')).toBeInTheDocument()
  })

  /**
   * #347 — les ancres de navigation desktop suivent le MÊME palier que le reste du
   * groupe secondaire : elles réapparaissaient à `md` et pesaient 302 à 322 px à elles
   * seules, mesurées au navigateur, dans un conteneur de 736 px utiles.
   */
  it('ne fait réapparaître la navigation desktop qu’à `lg` (#347)', () => {
    const { container } = render(<HeaderSection locale="fr" />)
    const nav = container.querySelector('header nav')
    expect(nav?.className).toContain('hidden')
    expect(nav?.className).toContain('lg:flex')
    expect(nav?.className).not.toContain('md:flex')
  })

  it('garde « Inscription » visible à toute largeur et le burger sous `lg` (#334, seuil #347)', () => {
    render(<HeaderSection locale="fr" />)
    const register = screen.getByText('common.landing.buttons.register')
    // `classList` et pas `className` : `contains()` compare des classes ENTIÈRES,
    // là où un `toContain` sur la chaîne apparierait n'importe quelle utilitaire
    // contenant « hidden » en sous-chaîne (p. ex. `focus-visible:outline-hidden`,
    // que le Button portait avant #383) et rendrait l'assertion fausse.
    expect(register.classList.contains('hidden')).toBe(false)
    expect(register.classList.contains('lg:hidden')).toBe(false)

    const toggle = screen.getByTestId('landing-header-menu-toggle')
    expect(toggle.classList.contains('lg:hidden')).toBe(true)
    expect(toggle.classList.contains('md:hidden')).toBe(false)
    // Cible tactile 44x44 (h-11 w-11 = --space-11 = 44px).
    expect(toggle.classList.contains('h-11')).toBe(true)
    expect(toggle.classList.contains('w-11')).toBe(true)
  })

  /**
   * #347 — GARDE-FOU DE SYNCHRONISATION. Le burger, l'overlay et le panneau doivent
   * porter le MÊME palier que la requête `matchMedia` de `HeaderSection`. Désynchronisés,
   * `useFocusTrap` tourne sur un panneau masqué : Escape avalé pour toute la page et
   * tabulation piégée dans un dialogue invisible, burger disparu.
   * Ce que ce test NE prouve PAS : que le palier CSS vaut bien 1024 px — jsdom ne résout
   * aucune media query. La frontière 1023/1024 est mesurée au navigateur (E2E).
   */
  it('applique le même palier au burger, à l’overlay et au panneau (#347)', async () => {
    const user = userEvent.setup()
    render(<HeaderSection locale="fr" />)
    await user.click(screen.getByTestId('landing-header-menu-toggle'))

    for (const testId of [
      'landing-header-menu-toggle',
      'landing-header-menu-overlay',
      'landing-header-menu',
    ]) {
      const el = screen.getByTestId(testId)
      expect(el.classList.contains('lg:hidden'), `${testId} n’est pas en lg:hidden`).toBe(true)
      expect(el.classList.contains('md:hidden'), `${testId} est resté en md:hidden`).toBe(false)
    }
  })

  it('expose un burger correctement câblé en ARIA (#334)', async () => {
    const user = userEvent.setup()
    render(<HeaderSection locale="fr" />)
    const toggle = screen.getByTestId('landing-header-menu-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-label', 'common.landing.navigation.menuOpen')
    expect(screen.queryByTestId('landing-header-menu')).not.toBeInTheDocument()

    // `aria-controls` ne doit PAS être posé à l'état fermé : le panneau n'est
    // alors pas rendu (`if (!open) return null`), l'attribut pointerait vers un
    // id absent du DOM — une référence pendante, invalide pour les technologies
    // d'assistance. Il apparaît avec sa cible et disparaît avec elle.
    expect(toggle).not.toHaveAttribute('aria-controls')

    await user.click(toggle)
    expect(screen.getByTestId('landing-header-menu-toggle')).toHaveAttribute(
      'aria-controls',
      'landing-header-menu',
    )
    expect(document.getElementById('landing-header-menu')).not.toBeNull()
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
