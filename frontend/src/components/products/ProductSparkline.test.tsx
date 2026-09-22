import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductSparkline } from './ProductSparkline'

/**
 * #608 — densité de la mini-frise. Le défaut (220×40) est celui de l'aperçu du
 * `ProductDrawer` et ne doit PAS bouger ; la variante compacte de la liste recalcule
 * la géométrie à sa taille (points r=3 conservés, fenêtre 90 j resserrée).
 * Horloge figée au 15 sept. 2026 (seul `Date` simulé).
 */

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 15, 10, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

// Il y a 90 j (bord gauche), 45 j (milieu), aujourd'hui (bord droit), + un hors fenêtre.
const DATES = ['2026-06-17', '2026-08-01', '2026-09-15', '2026-05-01']

const xs = (svg: Element) =>
  Array.from(svg.querySelectorAll('circle')).map((c) => Number(c.getAttribute('cx')))

describe('ProductSparkline', () => {
  it('défaut 220×40 (aperçu du drawer) : géométrie inchangée', () => {
    render(<ProductSparkline dates={DATES} label="frise" />)
    const svg = screen.getByRole('img', { name: 'frise' })
    expect(svg).toHaveAttribute('viewBox', '0 0 220 40')
    expect(svg).toHaveAttribute('width', '220')
    expect(svg).toHaveAttribute('height', '40')
    expect(svg.getAttribute('class')).toBe('text-ink-muted')
    // 3 points dans la fenêtre, de PADDING (4) à 220 - 4.
    expect(xs(svg)).toEqual([4, 110, 216])
    svg.querySelectorAll('circle').forEach((c) => {
      expect(c).toHaveAttribute('r', '3')
      expect(c).toHaveAttribute('cy', '20')
    })
  })

  it('compacte 64×24 : viewBox à la taille rendue, points non déformés', () => {
    render(<ProductSparkline dates={DATES} label="frise" width={64} height={24} />)
    const svg = screen.getByRole('img', { name: 'frise' })
    expect(svg).toHaveAttribute('viewBox', '0 0 64 24')
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).not.toHaveAttribute('preserveAspectRatio')
    expect(xs(svg)).toEqual([4, 32, 60])
    svg.querySelectorAll('circle').forEach((c) => {
      expect(c).toHaveAttribute('r', '3')
      expect(c).toHaveAttribute('cy', '12')
    })
    const base = svg.querySelector('line')!
    expect(base).toHaveAttribute('x2', '60')
  })
})
