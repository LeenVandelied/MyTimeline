import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import DashboardLoading from './loading'

/**
 * #698 — Fallback de segment du dashboard. Structure seulement (jsdom ne calcule aucun
 * layout) : la LARGEUR contre la page réelle est mesurée au navigateur par
 * `e2e/sprint-106-product-detail.spec.ts`.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('DashboardLoading (#698)', () => {
  it('reprend l’enveloppe de la page réelle (max-w-7xl + paddings), plus max-w-3xl', () => {
    render(<DashboardLoading />)
    const layout = screen.getByTestId('dashboard-loading-layout')
    for (const cls of ['max-w-7xl', 'mx-auto', 'w-full', 'px-4', 'py-6', 'sm:px-6', 'lg:px-8']) {
      expect(layout).toHaveClass(cls)
    }
    expect(layout.className).not.toContain('max-w-3xl')
  })

  it('compose salutation, ruban puis grille agenda | marge', () => {
    render(<DashboardLoading />)
    const layout = screen.getByTestId('dashboard-loading-layout')
    const [greeting, ribbon, grid] = Array.from(layout.children)
    expect(greeting).toBe(screen.getByTestId('dashboard-loading-greeting'))
    expect(ribbon).toBe(screen.getByTestId('dashboard-loading-ribbon'))
    expect(grid).toHaveClass('lg:grid-cols-[minmax(0,1fr)_280px]')
    expect(grid).toContainElement(screen.getByTestId('dashboard-loading-skeleton'))
  })

  it('#623 — ruban : règle + barres dans un seul bloc `h-24`, comme le ruban réel', () => {
    render(<DashboardLoading />)
    const ribbon = screen.getByTestId('dashboard-loading-ribbon')
    const plots = ribbon.querySelectorAll('.h-24')
    expect(plots).toHaveLength(1)
    const [ruler, bars] = Array.from(plots[0].children)
    expect(ruler).toHaveClass('h-4.5')
    expect(bars).toHaveClass('flex-1')
  })

  it('une SEULE région status, avec le libellé accessible', () => {
    render(<DashboardLoading />)
    const statuses = screen.getAllByRole('status')
    expect(statuses).toHaveLength(1)
    expect(statuses[0]).toHaveAttribute('data-testid', 'dashboard-loading-skeleton')
    expect(screen.getByText('common.spinner.loading')).toHaveClass('sr-only')
  })
})
