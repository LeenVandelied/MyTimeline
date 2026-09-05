import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StateScreen, stateActionPrimary, stateActionSecondary } from './StateScreen'

/** #57 — StateScreen : coquille plein page 404/403/500 (présentationnel pur). */
describe('StateScreen', () => {
  it('rend code, titre, description dans une landmark <main>', () => {
    render(<StateScreen code="404" title="Introuvable" description="Perdu" />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('404')
    expect(screen.getByRole('heading', { name: 'Introuvable' })).toBeInTheDocument()
    expect(screen.getByText('Perdu')).toBeInTheDocument()
  })

  it('code / description / actions optionnels', () => {
    render(<StateScreen title="Seul le titre" />)
    expect(screen.queryByTestId('state-screen-code')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seul le titre' })).toBeInTheDocument()
  })

  it('rend les actions fournies + testId custom + thème sombre', () => {
    render(
      <div className="dark">
        <StateScreen
          testId="err"
          title="x"
          actions={<a href="#retour">Retour</a>}
        />
      </div>,
    )
    expect(screen.getByTestId('err')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toBeInTheDocument()
  })

  it('classes d\'action exposées (accent primaire / bordure secondaire)', () => {
    expect(stateActionPrimary).toContain('bg-accent')
    // #336 — l'action secondaire est un bouton outline : sa bordure EST
    // l'affordance, donc tier fonctionnel `rule-emphasis` (≥3:1, WCAG 1.4.11)
    // et non le tier décoratif `rule-strong` (1.46:1).
    expect(stateActionSecondary).toContain('border-rule-emphasis')
    expect(stateActionSecondary).not.toMatch(/\bborder-rule-strong\b/)
  })
})
