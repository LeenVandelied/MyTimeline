import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CtaSection } from './CtaSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('CtaSection', () => {
  it('rend le titre, le sous-titre et le bouton', () => {
    render(<CtaSection locale="fr" />)
    expect(screen.getByText('common.landing.cta.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.cta.subtitle')).toBeInTheDocument()
    expect(screen.getByText('common.landing.cta.button')).toBeInTheDocument()
  })

  it('pointe vers la page register de la locale reçue', () => {
    render(<CtaSection locale="es" />)
    expect(screen.getByText('common.landing.cta.button').closest('a')).toHaveAttribute(
      'href',
      '/es/register',
    )
  })

  /** #295 — voir HeaderSection.test.tsx pour le détail du défaut. */
  it('n’imbrique aucun contrôle interactif dans un autre (#295)', () => {
    const { container } = render(<CtaSection locale="fr" />)
    expect(container.querySelector('a button')).toBeNull()
    expect(container.querySelector('button a')).toBeNull()
    expect(screen.getByText('common.landing.cta.button').tagName).toBe('A')
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<CtaSection locale="fr" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
