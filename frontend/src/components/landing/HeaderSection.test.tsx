import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderSection } from './HeaderSection'

/**
 * #56 / #295 — en-tête extrait du monolithe HomePage.
 * next-intl mocké → `t('a.b.c')` renvoie la clé littérale.
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
})
