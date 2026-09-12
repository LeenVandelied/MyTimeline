import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoadingSkeleton } from './LoadingSkeleton'

/** #57 — LoadingSkeleton : a11y (role=status, aria-busy) + variantes. */
describe('LoadingSkeleton', () => {
  it('role=status + aria-busy + libellé sr-only', () => {
    render(<LoadingSkeleton label="Chargement" />)
    const root = screen.getByTestId('loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(root).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Chargement')).toBeInTheDocument()
  })

  it('variant list : rend `rows` éléments', () => {
    render(<LoadingSkeleton variant="list" rows={5} />)
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(5)
  })

  it('variant cards : rend `rows` cartes', () => {
    render(<LoadingSkeleton variant="cards" rows={3} />)
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(3)
  })

  it('variant timeline : rend `rows` lanes', () => {
    render(<LoadingSkeleton variant="timeline" rows={2} />)
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(2)
  })

  it('testId personnalisable + rendu thème sombre', () => {
    render(
      <div className="dark">
        <LoadingSkeleton testId="dashboard-loading-skeleton" label="x" />
      </div>,
    )
    expect(screen.getByTestId('dashboard-loading-skeleton')).toBeInTheDocument()
  })
})
