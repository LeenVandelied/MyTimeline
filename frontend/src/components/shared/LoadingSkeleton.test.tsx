import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoadingSkeleton } from './LoadingSkeleton'

/** #57 — LoadingSkeleton : a11y (role=status, libellé annoncé) + variantes. */
describe('LoadingSkeleton', () => {
  it('role=status + libellé sr-only dans la région', () => {
    render(<LoadingSkeleton label="Chargement" />)
    const root = screen.getByTestId('loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
  })

  it('review S90 — aucun aria-busy (la région se démonte sans repasser à false)', () => {
    const { container } = render(<LoadingSkeleton label="Chargement" variant="timeline" />)
    expect(screen.getByTestId('loading-skeleton')).not.toHaveAttribute('aria-busy')
    expect(container.querySelector('[aria-busy]')).toBeNull()
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
