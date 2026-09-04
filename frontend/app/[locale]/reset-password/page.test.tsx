import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'

import ResetPasswordPage from './page'

/**
 * #53 — Reset password (contrat #49) : token via query param. 200 = succès,
 * 400 = token invalide/expiré inline. Token absent = message « lien invalide ».
 */

const resetPasswordMock = vi.fn()
let searchToken = 'valid-token'

vi.mock('@/services/authService', () => ({
  resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, use: () => ({ locale: 'fr' }) }
})

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useSearchParams: () => new URLSearchParams(searchToken ? `token=${searchToken}` : ''),
  }
})

const params = Promise.resolve({ locale: 'fr' })

function make400(): AxiosError {
  return new AxiosError('Bad Request', '400', undefined, undefined, {
    status: 400,
    data: {},
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetPasswordMock.mockReset()
    searchToken = 'valid-token'
  })

  it('réinitialise avec succès et propose le lien de connexion', async () => {
    resetPasswordMock.mockResolvedValue({})
    const user = userEvent.setup()
    render(<ResetPasswordPage params={params} />)

    await user.type(screen.getByTestId('reset-password'), 'Secret12')
    await user.type(screen.getByTestId('reset-confirm-password'), 'Secret12')
    await user.click(screen.getByTestId('reset-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-success')).toBeInTheDocument()
    })
    expect(resetPasswordMock).toHaveBeenCalledWith('valid-token', 'Secret12')
    expect(screen.getByTestId('reset-go-login')).toBeInTheDocument()
  })

  it('affiche une erreur inline sur token invalide (400)', async () => {
    resetPasswordMock.mockRejectedValue(make400())
    const user = userEvent.setup()
    render(<ResetPasswordPage params={params} />)

    await user.type(screen.getByTestId('reset-password'), 'Secret12')
    await user.type(screen.getByTestId('reset-confirm-password'), 'Secret12')
    await user.click(screen.getByTestId('reset-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-error')).toHaveTextContent(
        'common.resetPassword.errors.invalidToken',
      )
    })
  })

  it('affiche un message si le token est absent du lien', () => {
    searchToken = ''
    render(<ResetPasswordPage params={params} />)

    expect(screen.getByTestId('reset-missing-token')).toBeInTheDocument()
    expect(screen.queryByTestId('reset-form')).not.toBeInTheDocument()
  })

  // #146 — garde-fou lisibilité clair/sombre : tokens Graphite theme-aware présents
  // (token valide => formulaire rendu).
  it('utilise les tokens Graphite theme-aware (pas de couleur hardcodée, pas de tier décoratif)', () => {
    searchToken = 'valid-token'
    const { container } = render(<ResetPasswordPage params={params} />)

    expect(container.querySelector('.bg-bg.text-ink')).not.toBeNull()
    expect(container.querySelector('.bg-surface')).not.toBeNull()
    // #336 — bordure de champ = tier FONCTIONNEL (WCAG 1.4.11, ≥3:1).
    // `rule-strong` (1.46:1) est décoratif : sa présence sur un input est le bug.
    expect(container.querySelector('.bg-surface-2.border-rule-emphasis')).not.toBeNull()
    expect(container.querySelector('.border-rule-strong')).toBeNull()

    const submit = screen.getByTestId('reset-submit')
    expect(submit).toHaveClass('bg-accent', 'text-accent-ink')

    expect(container.querySelector('.text-ink-faint')).toBeNull()
  })
})
