import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeaturesSection } from './FeaturesSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('FeaturesSection', () => {
  it('porte l’ancre #features ciblée par la navigation', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'features')
  })

  it('rend les trois fonctionnalités pilotées par données', () => {
    render(<FeaturesSection />)
    for (const key of ['timeline', 'reminders', 'organization']) {
      expect(screen.getByText(`common.landing.features.${key}.title`)).toBeInTheDocument()
      expect(screen.getByText(`common.landing.features.${key}.description`)).toBeInTheDocument()
    }
  })

  it('rend une icône par fonctionnalité', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelectorAll('svg')).toHaveLength(3)
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
