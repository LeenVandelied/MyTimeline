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

  it('#630 — track : piste de frise vide décorative au-dessus du titre', () => {
    render(<EmptyState title="Frise vide" track testId="timeline-empty" />)
    const root = screen.getByTestId('timeline-empty')
    const piste = screen.getByTestId('timeline-empty-track')
    expect(piste).toHaveAttribute('aria-hidden', 'true')
    // Au-dessus du titre : premier enfant de la racine.
    expect(root.firstElementChild).toBe(piste)
    const lanes = Array.from(piste.children) as HTMLElement[]
    expect(lanes).toHaveLength(3)
    for (const lane of lanes) {
      expect(lane.style.height).toBe('var(--lane-height)')
      const trait = lane.firstElementChild as HTMLElement
      expect(trait.className).toContain('border-dashed')
      expect(trait.className).toContain('border-rule-emphasis')
    }
    // Aucune illustration : ni svg ni img dans la piste.
    expect(piste.querySelector('svg, img')).toBeNull()
  })

  it('#630 — piste absente par défaut', () => {
    render(<EmptyState title="Vide" />)
    expect(screen.queryByTestId('empty-state-track')).not.toBeInTheDocument()
  })

  it('#630 — track ignoré en compact (colonnes étroites)', () => {
    render(<EmptyState title="Vide" compact track />)
    expect(screen.queryByTestId('empty-state-track')).not.toBeInTheDocument()
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
