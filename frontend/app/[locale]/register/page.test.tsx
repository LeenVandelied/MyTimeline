import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'

import RegisterPage from './page'

/**
 * #53 — Register : erreur 409 (BR-AUT-001, username déjà pris) mappée inline
 * sous le champ username via `setError`. Validation Zod alignée BR-AUT-003.
 */

const registerMock = vi.fn()
const pushMock = vi.fn()
let loadingFlag = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ register: registerMock, loading: loadingFlag }),
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
  return { ...actual, useRouter: () => ({ push: pushMock, replace: vi.fn() }) }
})

const params = Promise.resolve({ locale: 'fr' })

function make409(): AxiosError {
  return new AxiosError('Conflict', '409', undefined, undefined, {
    status: 409,
    data: {},
    statusText: 'Conflict',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId('register-email'), 'alice@example.com')
  await user.type(screen.getByTestId('register-name'), 'Alice')
  await user.type(screen.getByTestId('register-username'), 'alice')
  await user.type(screen.getByTestId('register-password'), 'Secret12')
  await user.type(screen.getByTestId('register-confirm-password'), 'Secret12')
}

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset()
    pushMock.mockReset()
    loadingFlag = false
  })

  it('mappe le 409 vers une erreur inline sous le champ username (BR-AUT-001)', async () => {
    registerMock.mockRejectedValue(make409())
    const user = userEvent.setup()
    render(<RegisterPage params={params} />)

    await fillValidForm(user)
    await user.click(screen.getByTestId('register-submit'))

    await waitFor(() => {
      expect(screen.getByText('common.register.errors.usernameTaken')).toBeInTheDocument()
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('affiche le succès et redirige après inscription réussie', async () => {
    registerMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegisterPage params={params} />)

    await fillValidForm(user)
    await user.click(screen.getByTestId('register-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('register-success')).toBeInTheDocument()
    })
    expect(pushMock).toHaveBeenCalledWith('/fr/login')
  })

  it('bloque la soumission si la validation Zod échoue (password court)', async () => {
    const user = userEvent.setup()
    render(<RegisterPage params={params} />)

    await user.type(screen.getByTestId('register-email'), 'alice@example.com')
    await user.type(screen.getByTestId('register-name'), 'Alice')
    await user.type(screen.getByTestId('register-username'), 'alice')
    await user.type(screen.getByTestId('register-password'), 'Ab1')
    await user.type(screen.getByTestId('register-confirm-password'), 'Ab1')
    await user.click(screen.getByTestId('register-submit'))

    await waitFor(() => {
      expect(screen.getByText('validation.password.min')).toBeInTheDocument()
    })
    expect(registerMock).not.toHaveBeenCalled()
  })

  // #146 — garde-fou lisibilité clair/sombre : tokens Graphite theme-aware présents.
  it('utilise les tokens Graphite theme-aware (pas de couleur hardcodée, pas de tier décoratif)', () => {
    const { container } = render(<RegisterPage params={params} />)

    expect(container.querySelector('.bg-bg.text-ink')).not.toBeNull()
    expect(container.querySelector('.bg-surface')).not.toBeNull()
    // #336 — bordure de champ = tier FONCTIONNEL (WCAG 1.4.11, ≥3:1).
    // `rule-strong` (1.46:1) est décoratif : sa présence sur un input est le bug.
    expect(container.querySelector('.bg-surface-2.border-rule-emphasis')).not.toBeNull()
    expect(container.querySelector('.border-rule-strong')).toBeNull()

    const submit = screen.getByTestId('register-submit')
    expect(submit).toHaveClass('bg-accent', 'text-accent-ink')

    expect(container.querySelector('.text-ink-faint')).toBeNull()
  })
})
