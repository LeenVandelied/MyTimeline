import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeroSection } from './HeroSection'

/**
 * #56 (slice contraste) — Hero extrait du monolithe HomePage.
 * En jsdom les valeurs CSS ne sont pas calculées : on vérifie la PRÉSENCE des
 * classes token theme-aware (qui suivent clair/sombre via les variables DS) et
 * l'ABSENCE de couleur hex hardcodée, pas les ratios calculés.
 * next-intl mocké → t('a.b.c') renvoie la clé littérale.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

describe('HeroSection', () => {
  it('rend les textes clés du hero (titre, sous-titre, CTA, secondaire)', () => {
    render(<HeroSection locale="fr" />)
    expect(screen.getByText('common.landing.hero.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.hero.subtitle')).toBeInTheDocument()
    expect(screen.getByText(/common\.landing\.hero\.cta/)).toBeInTheDocument()
    expect(screen.getByText('common.landing.hero.secondary')).toBeInTheDocument()
  })

  it('pointe le CTA primaire vers la page register de la locale', () => {
    render(<HeroSection locale="en" />)
    const registerLink = screen
      .getByText(/common\.landing\.hero\.cta/)
      .closest('a')
    expect(registerLink).toHaveAttribute('href', '/en/register')
  })

  it('utilise des tokens sémantiques theme-aware (clair + sombre) — pas de hex', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const html = container.innerHTML

    // tokens clair/sombre : bg-accent / text-accent-ink / text-ink / text-ink-muted
    // suivent le thème via les variables CSS du DS.
    expect(html).toMatch(/\btext-ink\b/)
    expect(html).toMatch(/\btext-ink-muted\b/)
    expect(html).toMatch(/\bbg-accent\b/)
    expect(html).toMatch(/\btext-accent-ink\b/)

    // #293 — bordure fonctionnelle du bouton secondaire : tier dédié
    // `border-rule-emphasis` (≥3:1 UI, clair + sombre). Il remplace l'emprunt
    // S39 au tier TEXTE `border-ink-muted`, qui ne doit plus réapparaître.
    expect(html).toMatch(/\bborder-rule-emphasis\b/)
    expect(html).not.toMatch(/\bborder-ink-muted\b/)

    // Le cadre de l'image est décoratif → il reste sur `border-rule` nu.
    // (négative lookahead : `border-rule-emphasis` ne doit pas satisfaire ce test)
    expect(html).toMatch(/\bborder-rule(?![-\w])/)
  })

  it('ne contient aucune couleur hex hardcodée', () => {
    const { container } = render(<HeroSection locale="fr" />)
    // aucune valeur hex (#RGB / #RRGGBB) dans le markup rendu
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
