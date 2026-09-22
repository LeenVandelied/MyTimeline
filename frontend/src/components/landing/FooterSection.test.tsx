import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FooterSection } from './FooterSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('FooterSection', () => {
  it('lie les pages légales existantes, préfixées par la locale', () => {
    render(<FooterSection locale="en" />)
    expect(screen.getByText('common.landing.footer.terms')).toHaveAttribute('href', '/en/terms')
    expect(screen.getByText('common.landing.footer.privacy')).toHaveAttribute('href', '/en/privacy')
  })

  it('retombe sur la locale du contexte quand aucune n’est passée', () => {
    render(<FooterSection />)
    expect(screen.getByText('common.landing.footer.terms')).toHaveAttribute('href', '/fr/terms')
  })

  /**
   * #56 — l'entrée « mentions légales » pointait sur `<a href="#">` : un lien mort qui
   * remonte en haut de page. Retirée faute de contenu juridique existant (cf. docstring
   * de FooterSection). Ce test interdit sa réintroduction sous forme d'ancre morte —
   * pas la page elle-même, qui sera un lien réel le jour où elle existera.
   */
  it('ne contient aucun lien mort', () => {
    const { container } = render(<FooterSection locale="fr" />)
    expect(container.querySelector('a[href="#"]')).toBeNull()
    expect(screen.queryByText('common.landing.footer.legalNotice')).not.toBeInTheDocument()
  })

  it('cible les ancres de sections de la landing', () => {
    render(<FooterSection locale="fr" />)
    expect(screen.getByText('common.landing.footer.features')).toHaveAttribute('href', '#features')
    expect(screen.getByText('common.landing.footer.howItWorks')).toHaveAttribute(
      'href',
      '#how-it-works',
    )
    expect(screen.getByText('common.landing.footer.testimonials')).toHaveAttribute(
      'href',
      '#testimonials',
    )
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<FooterSection locale="fr" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
