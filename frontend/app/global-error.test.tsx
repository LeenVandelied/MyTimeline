import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// #413 — `global-error.tsx` importe `globals.css` (il rend son propre document,
// aucun layout ne monte la feuille au-dessus de lui). Vitest tourne avec
// `css: true` : sans ce stub, jsdom tente de parser le CSS Tailwind 4 compilé,
// échoue (`Could not parse CSS stylesheet`) et déverse ~5 500 lignes sur stderr —
// contraire à MEMO-007 (zéro stderr). Le style n'est pas l'objet de ces tests.
vi.mock('../src/styles/globals.css', () => ({}))

import GlobalError from './global-error'
import deErrors from '../public/locales/de/errors.json'
import enErrors from '../public/locales/en/errors.json'
import esErrors from '../public/locales/es/errors.json'
import frErrors from '../public/locales/fr/errors.json'

/**
 * #57 / #413 — Filet global racine (hors NextIntlClientProvider). Messages
 * inlinés, locale déduite du 1er segment de l'URL. console.error silencé.
 *
 * ⚠ #413 — ce composant est devenu un `global-error` : il rend SON PROPRE
 * `<html>` / `<body>` (il remplace le layout racine, qui ne porte plus la
 * balise). RTL monte donc ce `<html>` dans le `container` (un `<div>`) : le
 * `validateDOMNesting` de React est attendu, et absorbé par le spy
 * `console.error` déjà en place. Les requêtes `screen.*` restent valides — le
 * sous-arbre vit bien sous `document.body`.
 */
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  window.history.pushState({}, '', '/')
})

describe('GlobalError', () => {
  it("rend l'écran 500 global + boutons retry / accueil", () => {
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    // #413 : un global-error rend son propre document.
    expect(screen.getByTestId('global-error-screen').closest('body')).not.toBeNull()
    expect(screen.getByTestId('global-error-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('500')
    expect(screen.getByTestId('global-error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toBeInTheDocument()
  })

  // ADR-006 — la landing canonique est la racine de locale (`/es`, `/fr`), plus `/…/home`.
  it("locale déduite de l'URL (/es/...) → messages espagnols + lien /es", () => {
    window.history.pushState({}, '', '/es/anything')
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText('Se produjo un error')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toHaveAttribute('href', '/es')
  })

  // #413 (WCAG 3.1.1) — le <html> propre au global-error porte lui aussi la locale.
  it.each([
    ['/fr/anything', 'fr'],
    ['/en/anything', 'en'],
    ['/es/anything', 'es'],
    ['/de/anything', 'de'],
    ['/zz/anything', 'fr'],
  ])('%s → <html lang="%s">', (pathname, expected) => {
    window.history.pushState({}, '', pathname)
    const { container } = render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(container.querySelector('html')).toHaveAttribute('lang', expected)
  })

  it('segment inconnu → fallback fr', () => {
    window.history.pushState({}, '', '/zz/nope')
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toHaveAttribute('href', '/fr')
  })

  it('clic « réessayer » appelle reset', async () => {
    const reset = vi.fn()
    render(<GlobalError error={new Error('boom')} reset={reset} />)
    await userEvent.click(screen.getByTestId('global-error-retry'))
    expect(reset).toHaveBeenCalledOnce()
  })

  // #628 — le digest n'existe QUE pour les erreurs SERVEUR (prod) : absent en
  // dev/tests par défaut. Sans lui, ni libellé orphelin ni espace réservé.
  it('sans digest → aucune référence d’incident, actions intactes', () => {
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.queryByTestId('global-error-incident-ref')).not.toBeInTheDocument()
    expect(screen.getByTestId('global-error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toBeInTheDocument()
  })

  it('avec digest → référence affichée avec le libellé et la valeur brute', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })
    render(<GlobalError error={error} reset={vi.fn()} />)
    expect(screen.getByTestId('global-error-incident-ref')).toHaveTextContent(
      'Référence à communiquer au support :',
    )
    expect(screen.getByTestId('global-error-incident-ref-value')).toHaveTextContent('abc123')
  })

  // Les messages sont INLINÉS ici (aucun provider next-intl) : ce test échoue
  // dès que `incidentRef` diverge de `errors.json` → `crash.incidentRef`.
  it.each([
    ['fr', frErrors.crash.incidentRef],
    ['en', enErrors.crash.incidentRef],
    ['es', esErrors.crash.incidentRef],
    ['de', deErrors.crash.incidentRef],
  ])('%s : incidentRef identique à errors.json → crash.incidentRef', (locale, expected) => {
    window.history.pushState({}, '', `/${locale}/anything`)
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })
    render(<GlobalError error={error} reset={vi.fn()} />)
    expect(screen.getByTestId('global-error-incident-ref').textContent).toBe(`${expected} abc123`)
  })
})
