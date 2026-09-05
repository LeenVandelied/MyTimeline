import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroTimelineAnimation } from './HeroTimelineAnimation'

/**
 * #56 — frise horizontale animée du Hero.
 * jsdom ne calcule ni animations ni media queries : on vérifie la STRUCTURE et les
 * classes de tokens/animation, pas le mouvement. Le respect de
 * `prefers-reduced-motion` vit dans `src/styles/hero-timeline.css` et n'est pas
 * observable ici.
 */
describe('HeroTimelineAnimation', () => {
  it('est masquée aux technologies d’assistance (purement décorative)', () => {
    const { container } = render(<HeroTimelineAnimation />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('rend cinq jalons dont un seul marqueur « aujourd’hui »', () => {
    const { container } = render(<HeroTimelineAnimation />)
    expect(container.querySelectorAll('.hero-timeline__today')).toHaveLength(1)
    // 5 jalons + le rail + la progression
    expect(container.querySelectorAll('span')).toHaveLength(5)
  })

  it('porte les crochets d’animation attendus par la feuille dédiée', () => {
    const { container } = render(<HeroTimelineAnimation />)
    expect(container.querySelector('.hero-timeline')).not.toBeNull()
    expect(container.querySelector('.hero-timeline__progress')).not.toBeNull()
  })

  /**
   * Charte Graphite : l'accent bleu est réservé à *today/active*. Les jalons neutres
   * restent sur les tiers `surface` / `rule-emphasis`.
   */
  it('réserve l’accent au marqueur « aujourd’hui » et à la progression', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const accented = container.querySelectorAll('.bg-accent')
    expect(accented).toHaveLength(2)
    expect(container.querySelector('.hero-timeline__today')?.className).toMatch(/\bbg-accent\b/)
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<HeroTimelineAnimation />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
