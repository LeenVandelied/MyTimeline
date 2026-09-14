import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TimelineLoading from './loading'

/**
 * #629 — Fallback de segment de `/timeline`. jsdom ne mesure aucune géométrie :
 * ces tests attestent la STRUCTURE (variante, libellés, en-tête), pas l'absence de
 * décalage, qui reste à vérifier au navigateur.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('TimelineLoading (#629)', () => {
  it('monte le squelette en lanes avec le libellé de chargement de la frise', () => {
    render(<TimelineLoading />)
    const root = screen.getByTestId('timeline-loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(root).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('shell.timeline.loading')).toBeInTheDocument()
    const lanes = screen.getAllByTestId('loading-skeleton-item')
    expect(lanes).toHaveLength(6)
    // Seule la variante `timeline` pose la hauteur de lane du DS en style inline.
    for (const lane of lanes) expect(lane.style.height).toBe('var(--lane-height)')
  })

  it('reprend l’en-tête réel de l’écran (eyebrow + h1)', () => {
    render(<TimelineLoading />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('shell.timeline.title')
    expect(screen.getByText('shell.timeline.eyebrow')).toBeInTheDocument()
  })

  it('ne porte ni le testid de la page ni l’ancien `timeline-loading` (DEC-S56-003)', () => {
    render(<TimelineLoading />)
    expect(screen.queryByTestId('timeline-data-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timeline-loading')).not.toBeInTheDocument()
  })
})
