import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimelinePreviewSection } from './TimelinePreviewSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('TimelinePreviewSection', () => {
  it('rend l’illustration de la frise avec un texte alternatif traduit', () => {
    render(<TimelinePreviewSection />)
    const image = screen.getByAltText('common.landing.images.timeline')
    expect(image).toBeInTheDocument()
  })

  it('n’expose pas d’ancre (aucune navigation ne la cible)', () => {
    const { container } = render(<TimelinePreviewSection />)
    expect(container.querySelector('section')).not.toHaveAttribute('id')
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<TimelinePreviewSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
