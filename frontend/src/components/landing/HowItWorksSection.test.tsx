import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HowItWorksSection } from './HowItWorksSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('HowItWorksSection', () => {
  it('porte l’ancre #how-it-works ciblée par la navigation et le Hero', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'how-it-works')
  })

  it('rend les quatre étapes numérotées', () => {
    render(<HowItWorksSection />)
    for (const step of [1, 2, 3, 4]) {
      expect(screen.getByText(String(step))).toBeInTheDocument()
      expect(screen.getByText(`common.landing.howItWorks.step${step}.title`)).toBeInTheDocument()
      expect(
        screen.getByText(`common.landing.howItWorks.step${step}.description`),
      ).toBeInTheDocument()
    }
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
