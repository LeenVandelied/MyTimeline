import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from './EmptyState'

/** #57 — EmptyState : composant présentationnel pur (libellés en props). */
describe('EmptyState', () => {
  it('rend le titre + role=status', () => {
    render(<EmptyState title="Aucun produit" />)
    const root = screen.getByTestId('empty-state')
    expect(root).toBeInTheDocument()
    expect(root).toHaveAttribute('role', 'status')
    expect(screen.getByText('Aucun produit')).toBeInTheDocument()
  })

  it('description, icône et action optionnelles', () => {
    render(
      <EmptyState
        title="Vide"
        description="Rien ici"
        icon={<svg data-testid="empty-icon" />}
        action={<button type="button">Ajouter</button>}
      />,
    )
    expect(screen.getByText('Rien ici')).toBeInTheDocument()
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('testId personnalisable (préservation des tests appelants)', () => {
    render(<EmptyState title="x" testId="dashboard-product-list-empty" />)
    expect(screen.getByTestId('dashboard-product-list-empty')).toBeInTheDocument()
  })

  it('rend sous thème sombre (root .dark) sans planter', () => {
    render(
      <div className="dark">
        <EmptyState title="Sombre" />
      </div>,
    )
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('Sombre')).toBeInTheDocument()
  })
})
