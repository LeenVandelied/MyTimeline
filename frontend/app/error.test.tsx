import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GlobalError from './error'

/**
 * #57 — Filet global racine (hors NextIntlClientProvider). Messages inlinés,
 * locale déduite du 1er segment de l'URL. console.error silencé.
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
  it('rend l\'écran 500 global + boutons retry / accueil', () => {
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByTestId('global-error-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('500')
    expect(screen.getByTestId('global-error-retry')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toBeInTheDocument()
  })

  it('locale déduite de l\'URL (/es/...) → messages espagnols + lien /es/home', () => {
    window.history.pushState({}, '', '/es/anything')
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText('Se produjo un error')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toHaveAttribute('href', '/es/home')
  })

  it('segment inconnu → fallback fr', () => {
    window.history.pushState({}, '', '/zz/nope')
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    expect(screen.getByTestId('global-error-home-link')).toHaveAttribute('href', '/fr/home')
  })

  it('clic « réessayer » appelle reset', async () => {
    const reset = vi.fn()
    render(<GlobalError error={new Error('boom')} reset={reset} />)
    await userEvent.click(screen.getByTestId('global-error-retry'))
    expect(reset).toHaveBeenCalledOnce()
  })
})
