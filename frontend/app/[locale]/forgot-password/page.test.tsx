import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ForgotPasswordPage from './page'

/**
 * #53 — BR-AUT-012 : forgot-password affiche un message NEUTRE quel que soit le
 * retour backend (anti-fuite). On vérifie aussi qu'une erreur réseau bascule
 * sur le message d'erreur générique sans révéler l'existence du compte.
 */

const forgotPasswordMock = vi.fn()

vi.mock('@/services/authService', () => ({
  forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, use: () => ({ locale: 'fr' }) }
})

const params = Promise.resolve({ locale: 'fr' })

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset()
  })

  it('affiche un message neutre après envoi (BR-AUT-012)', async () => {
    forgotPasswordMock.mockResolvedValue({})
    const user = userEvent.setup()
    render(<ForgotPasswordPage params={params} />)

    await user.type(screen.getByTestId('forgot-email'), 'alice@example.com')
    await user.click(screen.getByTestId('forgot-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('forgot-neutral')).toHaveTextContent(
        'common.forgotPassword.neutralMessage',
      )
    })
    // Le formulaire est remplacé par le message neutre.
    expect(screen.queryByTestId('forgot-form')).not.toBeInTheDocument()
  })

  it('affiche une erreur générique en cas d échec réseau', async () => {
    forgotPasswordMock.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<ForgotPasswordPage params={params} />)

    await user.type(screen.getByTestId('forgot-email'), 'alice@example.com')
    await user.click(screen.getByTestId('forgot-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('forgot-error')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('forgot-neutral')).not.toBeInTheDocument()
  })

  // #146 — garde-fou lisibilité clair/sombre : tokens Graphite theme-aware présents.
  it('utilise les tokens Graphite theme-aware (pas de couleur hardcodée, pas de tier décoratif)', () => {
    const { container } = render(<ForgotPasswordPage params={params} />)

    expect(container.querySelector('.bg-bg.text-ink')).not.toBeNull()
    expect(container.querySelector('.bg-surface')).not.toBeNull()
    // #336 — bordure de champ = tier FONCTIONNEL (WCAG 1.4.11, ≥3:1).
    // `rule-strong` (1.46:1) est décoratif : sa présence sur un input est le bug.
    expect(container.querySelector('.bg-surface-2.border-rule-emphasis')).not.toBeNull()
    expect(container.querySelector('.border-rule-strong')).toBeNull()

    const submit = screen.getByTestId('forgot-submit')
    expect(submit).toHaveClass('bg-accent', 'text-accent-ink')

    expect(container.querySelector('.text-ink-faint')).toBeNull()
  })
})
