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
        <StateScreen testId="err" title="x" actions={<a href="#retour">Retour</a>} />
      </div>,
    )
    expect(screen.getByTestId('err')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toBeInTheDocument()
  })

  // #627 — l'extension `eyebrow`/`aside` ne doit PAS toucher les écrans 500/403,
  // qui n'en passent aucun : rendu centré d'origine, code en gros, pas de sur-titre.
  it('sans aside : mise en page centrée d’origine inchangée (500 / 403)', () => {
    render(<StateScreen code="500" title="Erreur" description="d" icon={<svg />} />)
    const main = screen.getByRole('main')
    expect(main.className).toContain('text-center')
    expect(screen.queryByTestId('state-screen-with-aside')).not.toBeInTheDocument()
    expect(screen.queryByTestId('state-screen-eyebrow')).not.toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('500')
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-2xl')
  })

  it('avec aside : feuillet + texte aligné à gauche, colonne puis rangée à sm, sur-titre', () => {
    render(
      <StateScreen
        code="404"
        icon={<svg data-testid="icon" />}
        eyebrow="Erreur 404"
        aside={<div data-testid="leaf" aria-hidden="true" />}
        title="Cette page n'a pas de date dans l'almanach."
        description="Perdu"
        actions={<a href="#retour">Retour</a>}
      />,
    )
    const main = screen.getByRole('main')
    expect(main.className).not.toContain('text-center')

    const row = screen.getByTestId('state-screen-with-aside')
    expect(row.className).toContain('flex-col')
    expect(row.className).toContain('sm:flex-row')
    // Le feuillet précède le texte (à gauche en rangée, au-dessus en colonne).
    expect(row.firstElementChild).toBe(screen.getByTestId('leaf'))

    const eyebrow = screen.getByTestId('state-screen-eyebrow')
    expect(eyebrow).toHaveTextContent('Erreur 404')
    expect(eyebrow.className).toBe('mt-eyebrow')
    // Le titre reste le `<h1>` de la page ; le code et l'icône ne sont plus rendus.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "Cette page n'a pas de date dans l'almanach.",
      }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('state-screen-code')).not.toBeInTheDocument()
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toBeInTheDocument()
  })

  it("classes d'action exposées (accent primaire / bordure secondaire)", () => {
    expect(stateActionPrimary).toContain('bg-accent')
    // #336 — l'action secondaire est un bouton outline : sa bordure EST
    // l'affordance, donc tier fonctionnel `rule-emphasis` (≥3:1, WCAG 1.4.11)
    // et non le tier décoratif `rule-strong` (1.46:1).
    expect(stateActionSecondary).toContain('border-rule-emphasis')
    expect(stateActionSecondary).not.toMatch(/\bborder-rule-strong\b/)
  })
})
