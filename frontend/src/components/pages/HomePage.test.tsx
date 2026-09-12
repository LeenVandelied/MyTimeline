import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

/**
 * #56 — la landing décomposée. Ce fichier teste l'ORCHESTRATION (présence et ordre des
 * sections, propagation de la locale) ; le contenu de chaque section est couvert par
 * son propre test dans `components/landing/`.
 */
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('HomePage', () => {
  it('rend toutes les sections de la landing', () => {
    render(<HomePage params={{ locale: 'fr' }} />)

    expect(screen.getByText('common.landing.hero.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.features.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.howItWorks.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.testimonials.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.mobileApp.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.cta.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.footer.description')).toBeInTheDocument()
  })

  it('expose les ancres ciblées par la navigation et le pied de page', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    for (const id of ['features', 'how-it-works', 'testimonials']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })

  it('propage la locale reçue aux sections qui construisent des liens', () => {
    render(<HomePage params={{ locale: 'de' }} />)
    expect(screen.getByText('common.landing.cta.button').closest('a')).toHaveAttribute(
      'href',
      '/de/register',
    )
    expect(screen.getByText('common.landing.footer.terms')).toHaveAttribute('href', '/de/terms')
  })

  it('retombe sur la locale du contexte quand params est incomplet', () => {
    render(<HomePage params={{ locale: '' }} />)
    expect(screen.getByText('common.landing.footer.terms')).toHaveAttribute('href', '/fr/terms')
  })

  /**
   * #295 — invariant à l'échelle de la PAGE : aucun contrôle interactif imbriqué dans
   * un autre. C'est le filet le plus large contre la réintroduction du motif
   * `<Link passHref><Button>` dans n'importe quelle section de la landing.
   */
  it('n’imbrique aucun contrôle interactif dans un autre (#295)', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    expect(container.querySelector('a button')).toBeNull()
    expect(container.querySelector('button a')).toBeNull()
  })

  it('n’utilise aucune couleur hex hardcodée sur l’ensemble de la landing', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
