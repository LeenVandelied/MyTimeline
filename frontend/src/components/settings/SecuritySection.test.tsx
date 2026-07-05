import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { SecuritySection } from './SecuritySection'

/**
 * #86 — Chapitre Sécurité. Changement de mot de passe (POST /api/me/change-password)
 * + indicateur de force + intégration liste sessions (hook mocké). On vérifie
 * l'appel de mutation et le mapping du 400 (ancien mot de passe faux) inline.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const changePasswordMutate = vi.fn()
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    changePassword: { mutateAsync: changePasswordMutate, isPending: false },
  }),
}))

const revokeOneMutate = vi.fn()
const revokeOthersMutate = vi.fn()
vi.mock('@/hooks/useSessionManager', () => ({
  useSessionManager: () => ({
    sessions: [],
    isLoading: false,
    isError: false,
    revokeOne: { mutateAsync: revokeOneMutate },
    revokeOthers: { mutateAsync: revokeOthersMutate, isPending: false },
  }),
}))

describe('SecuritySection — changement de mot de passe', () => {
  afterEach(() => vi.clearAllMocks())

  it("affiche l'indicateur de force à la saisie du nouveau mot de passe", () => {
    render(<SecuritySection />)
    fireEvent.change(screen.getByTestId('password-new'), { target: { value: 'Abcdef123!' } })
    expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    expect(screen.getByText('settings.security.strength.strong')).toBeInTheDocument()
  })

  it('soumet le changement de mot de passe', async () => {
    changePasswordMutate.mockResolvedValue(undefined)
    render(<SecuritySection />)
    fireEvent.change(screen.getByTestId('password-old'), { target: { value: 'oldpass' } })
    fireEvent.change(screen.getByTestId('password-new'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('password-confirm'), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByTestId('password-submit'))

    await waitFor(() =>
      expect(changePasswordMutate).toHaveBeenCalledWith({
        oldPassword: 'oldpass',
        newPassword: 'newpass1',
      }),
    )
  })

  it('bloque si la confirmation ne correspond pas', async () => {
    render(<SecuritySection />)
    fireEvent.change(screen.getByTestId('password-old'), { target: { value: 'oldpass' } })
    fireEvent.change(screen.getByTestId('password-new'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('password-confirm'), { target: { value: 'different' } })
    fireEvent.click(screen.getByTestId('password-submit'))

    await waitFor(() => expect(screen.getByText('validation.password.match')).toBeInTheDocument())
    expect(changePasswordMutate).not.toHaveBeenCalled()
  })

  it('mappe un 400 (ancien mot de passe faux) inline', async () => {
    const err = new AxiosError('bad request')
    // @ts-expect-error — minimal response mock
    err.response = { status: 400 }
    changePasswordMutate.mockRejectedValue(err)

    render(<SecuritySection />)
    fireEvent.change(screen.getByTestId('password-old'), { target: { value: 'oldpass' } })
    fireEvent.change(screen.getByTestId('password-new'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('password-confirm'), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByTestId('password-submit'))

    await waitFor(() =>
      expect(screen.getByText('settings.security.password.wrongOld')).toBeInTheDocument(),
    )
  })
})
