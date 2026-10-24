import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import LocaleError from './error'

/**
 * #57 — Crash boundary [locale] : branche 500 (retry via reset) + branche 403
 * (accès refusé, pas de retry). next-intl mocké ; le namespace effectif
 * (errors.crash vs errors.forbidden) est choisi par le composant → on l'assert
 * via la clé résolue. console.error est silencé (log intentionnel de l'erreur).
 */
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
})

describe('LocaleError — branche 500', () => {
  it("rend l'écran 500 avec retry + retour accueil", () => {
    render(<LocaleError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByTestId('error-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('500')
    expect(screen.getByText('errors.crash.title')).toBeInTheDocument()
    expect(screen.getByTestId('error-retry')).toBeInTheDocument()
    // ADR-006 — landing canonique = racine de locale.
    const home = screen.getByTestId('error-home-link')
    expect(home).toHaveAttribute('href', '/fr')
  })

  it('clic « réessayer » appelle reset', async () => {
    const reset = vi.fn()
    render(<LocaleError error={new Error('boom')} reset={reset} />)
    await userEvent.click(screen.getByTestId('error-retry'))
    expect(reset).toHaveBeenCalledOnce()
  })

  it("journalise l'erreur (console.error)", () => {
    render(<LocaleError error={new Error('boom')} reset={vi.fn()} />)
    expect(errorSpy).toHaveBeenCalled()
  })

  // #628 — le digest n'existe QUE pour les erreurs SERVEUR (prod) : absent en
  // dev/tests par défaut. Sans lui, ni libellé orphelin ni espace réservé.
  it('sans digest → aucune référence d’incident, actions intactes', () => {
    render(<LocaleError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.queryByTestId('error-incident-ref')).not.toBeInTheDocument()
    expect(screen.getByTestId('error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('error-home-link')).toBeInTheDocument()
  })

  it('avec digest → référence affichée avec le libellé et la valeur brute', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })
    render(<LocaleError error={error} reset={vi.fn()} />)
    expect(screen.getByTestId('error-incident-ref')).toHaveTextContent('errors.crash.incidentRef')
    expect(screen.getByTestId('error-incident-ref-value')).toHaveTextContent('abc123')
  })
})

describe('LocaleError — branche 403', () => {
  it('erreur 403 → écran accès refusé, sans retry', () => {
    render(<LocaleError error={new Error('403 Forbidden')} reset={vi.fn()} />)
    expect(screen.getByTestId('forbidden-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('403')
    expect(screen.getByText('errors.forbidden.title')).toBeInTheDocument()
    expect(screen.queryByTestId('error-retry')).not.toBeInTheDocument()
    expect(screen.getByTestId('error-home-link')).toHaveAttribute('href', '/fr')
  })

  // #628 — même traitement sur la branche 403 (la maquette montre la référence
  // sur les deux écrans).
  it('sans digest → aucune référence d’incident (403)', () => {
    render(<LocaleError error={new Error('403 Forbidden')} reset={vi.fn()} />)
    expect(screen.queryByTestId('error-incident-ref')).not.toBeInTheDocument()
  })

  it('avec digest → référence affichée (403)', () => {
    const error = Object.assign(new Error('403 Forbidden'), { digest: 'xyz789' })
    render(<LocaleError error={error} reset={vi.fn()} />)
    expect(screen.getByTestId('error-incident-ref')).toHaveTextContent(
      'errors.forbidden.incidentRef',
    )
    expect(screen.getByTestId('error-incident-ref-value')).toHaveTextContent('xyz789')
  })
})
