import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'

import LoginPage from './page'

/**
 * #53 — états du formulaire Login : loading (spinner + bouton désactivé),
 * erreur serveur 401 inline (identifiants invalides), succès (pas d'erreur).
 * On mocke `useAuth` pour piloter le résultat de `login`.
 */

const loginMock = vi.fn()
let loadingFlag = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock, loading: loadingFlag, user: null }),
}))

// `useTranslations()` renvoie l'identité (la clé) : on teste la structure, pas la traduction.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

// React 18.3.1 (vitest) n'expose pas `use()` (dispo via le React de Next 15 au runtime).
// On le stubbe pour déballer `params` de façon synchrone dans les tests.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, use: () => ({ locale: 'fr' }) }
})

const params = Promise.resolve({ locale: 'fr' })

function make401(): AxiosError {
  return new AxiosError('Unauthorized', '401', undefined, undefined, {
    status: 401,
    data: {},
    statusText: 'Unauthorized',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset()
    loadingFlag = false
  })
  afterEach(() => {
    loadingFlag = false
  })

  it('affiche une erreur inline sur 401 (identifiants invalides)', async () => {
    loginMock.mockRejectedValue(make401())
    const user = userEvent.setup()
    render(<LoginPage params={params} />)

    await user.type(screen.getByTestId('login-username'), 'alice')
    await user.type(screen.getByTestId('login-password'), 'secret123')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent(
        'common.login.errors.invalidCredentials',
      )
    })
    expect(loginMock).toHaveBeenCalledWith('alice', 'secret123')
  })

  it('ne montre aucune erreur quand le login réussit', async () => {
    loginMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginPage params={params} />)

    await user.type(screen.getByTestId('login-username'), 'alice')
    await user.type(screen.getByTestId('login-password'), 'secret123')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => expect(loginMock).toHaveBeenCalled())
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('désactive le bouton et montre le spinner en état loading', () => {
    loadingFlag = true
    render(<LoginPage params={params} />)

    expect(screen.getByTestId('login-submit')).toBeDisabled()
    expect(screen.getByTestId('login-submit')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  // #146 — garde-fou lisibilité clair/sombre : les tokens Graphite theme-aware
  // doivent être présents (jsdom ne calcule pas les ratios, on vérifie les classes).
  it('utilise les tokens Graphite theme-aware (pas de couleur hardcodée, pas de tier décoratif)', () => {
    const { container } = render(<LoginPage params={params} />)

    expect(container.querySelector('.bg-bg.text-ink')).not.toBeNull()
    expect(container.querySelector('.bg-surface')).not.toBeNull()
    expect(container.querySelector('.bg-surface-2.border-rule-strong')).not.toBeNull()

    const submit = screen.getByTestId('login-submit')
    expect(submit).toHaveClass('bg-accent', 'text-accent-ink')

    // text-ink-faint (~2.8:1) interdit pour du texte essentiel.
    expect(container.querySelector('.text-ink-faint')).toBeNull()
  })
})
