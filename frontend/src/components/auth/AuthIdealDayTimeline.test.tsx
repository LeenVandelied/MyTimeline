import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthIdealDayTimeline } from './AuthIdealDayTimeline'

/**
 * #625 — frise statique « journée idéale » du panneau d'authentification.
 * Contrat de testids : `auth-timeline-ruler` (règle horaire), `auth-timeline-bar`
 * (une par barre d'activité). Distincte des frises animées de la landing.
 */
afterEach(cleanup)

describe('AuthIdealDayTimeline', () => {
  it('renders hour ruler and bars with no animation', () => {
    const { container } = render(<AuthIdealDayTimeline />)

    expect(screen.queryByTestId('auth-timeline-ruler')).not.toBeNull()
    expect(screen.queryAllByTestId('auth-timeline-bar').length).toBeGreaterThanOrEqual(3)

    // Animations SVG déclaratives (SMIL).
    expect(
      container.querySelectorAll('animate, animateTransform, animateMotion, set'),
    ).toHaveLength(0)

    for (const el of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
      expect(el.getAttribute('class') ?? '').not.toMatch(/(^|[\s:])(animate-|transition|duration-)/)
      expect(el.style.animation).toBe('')
      expect(el.style.transition).toBe('')
    }
  })
})
