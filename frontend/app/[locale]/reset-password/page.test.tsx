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

    await user.type(screen.getByTestId('reset-password'), 'Secret1')
    await user.type(screen.getByTestId('reset-confirm-password'), 'Secret1')
    await user.click(screen.getByTestId('reset-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-success')).toBeInTheDocument()
    })
    expect(resetPasswordMock).toHaveBeenCalledWith('valid-token', 'Secret1')
    expect(screen.getByTestId('reset-go-login')).toBeInTheDocument()
  })

  it('affiche une erreur inline sur token invalide (400)', async () => {
    resetPasswordMock.mockRejectedValue(make400())
    const user = userEvent.setup()
    render(<ResetPasswordPage params={params} />)

    await user.type(screen.getByTestId('reset-password'), 'Secret1')
    await user.type(screen.getByTestId('reset-confirm-password'), 'Secret1')
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
})
