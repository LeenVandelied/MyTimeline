import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

/**
 * #56 — la landing décomposée. Ce fichier teste l'ORCHESTRATION (présence et ordre des
 * sections, propagation de la locale) ; le contenu de chaque section est couvert par
 * son propre test dans `components/landing/`.
 */
vi.mock('next-intl', () => ({
  // Préfixe le namespace : `HowItWorksSection` appelle `useTranslations('common.landing.howItWorks')`.
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
  useLocale: () => 'fr',
}))

describe('HomePage', () => {
  it('rend toutes les sections de la landing', () => {
    render(<HomePage params={{ locale: 'fr' }} />)

    expect(screen.getByText('common.landing.hero.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.howItWorks.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.cta.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.footer.description')).toBeInTheDocument()
  })

  it('expose l’ancre ciblée par la navigation, le pied de page et le hero', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    expect(container.querySelector('#how-it-works')).not.toBeNull()
  })

  /**
   * #612 — une seule section explicative : la frise de cas d'usage remplace les 3 cartes
   * de `FeaturesSection`. Ni la section, ni son ancre, ni aucun lien vers elle ne doivent
   * revenir — et toute ancre interne de la page doit avoir sa cible (pas de lien mort).
   */
  it('ne rend plus la section fonctionnalités ni aucun lien vers elle (#612)', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    expect(container.querySelector('#features')).toBeNull()
    expect(container.querySelector('a[href="#features"]')).toBeNull()
    expect(container.innerHTML).not.toContain('landing.features')
    expect(container.querySelectorAll('section#how-it-works')).toHaveLength(1)
    for (const a of Array.from(container.querySelectorAll('a[href^="#"]'))) {
      const id = a.getAttribute('href')!.slice(1)
      expect(container.querySelector(`#${id}`), `cible de ${a.outerHTML}`).not.toBeNull()
    }
  })

  /**
   * #613 — la section témoignages est retirée (avis nominatifs inventés). Elle ne doit
   * pas revenir par un simple ré-import : ni la section, ni son titre, ni aucun lien
   * vers son ancre.
   */
  it('ne rend plus la section témoignages ni aucun lien vers elle (#613)', () => {
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    expect(container.querySelector('#testimonials')).toBeNull()
    expect(container.querySelector('a[href="#testimonials"]')).toBeNull()
    expect(container.innerHTML).not.toMatch(/testimonial/i)
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
