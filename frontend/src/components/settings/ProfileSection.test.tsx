import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { ProfileSection } from './ProfileSection'

/**
 * #86 — Chapitre Profil. PATCH /api/me via useSettings ; on vérifie l'appel avec
 * le payload et le mapping du 409 (username déjà pris, BR-AUT-001) inline.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const updateProfileMutate = vi.fn()
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    user: { id: 'u1', name: 'Jane', username: 'jane', email: 'jane@ex.com', role: 'ROLE_USER' },
    updateProfile: { mutateAsync: updateProfileMutate, isPending: false },
  }),
}))

// AvatarUpload est testé indirectement ; on l'isole pour ce test de formulaire.
vi.mock('./AvatarUpload', () => ({
  AvatarUpload: () => <div data-testid="mock-avatar" />,
}))

describe('ProfileSection', () => {
  afterEach(() => vi.clearAllMocks())

  it('pré-remplit le formulaire avec le user courant', () => {
    render(<ProfileSection />)
    expect(screen.getByTestId('profile-username')).toHaveValue('jane')
    expect(screen.getByTestId('profile-email')).toHaveValue('jane@ex.com')
  })

  it('soumet le payload profil via updateProfile', async () => {
    updateProfileMutate.mockResolvedValue({})
    render(<ProfileSection />)
    fireEvent.change(screen.getByTestId('profile-name'), { target: { value: 'Janet' } })
    fireEvent.click(screen.getByTestId('profile-submit'))

    await waitFor(() =>
      expect(updateProfileMutate).toHaveBeenCalledWith({
        name: 'Janet',
        username: 'jane',
        email: 'jane@ex.com',
      }),
    )
  })

  it('mappe un 409 vers une erreur inline sur username', async () => {
    const err = new AxiosError('conflict')
    // @ts-expect-error — minimal response mock pour le test
    err.response = { status: 409 }
    updateProfileMutate.mockRejectedValue(err)

    render(<ProfileSection />)
    fireEvent.click(screen.getByTestId('profile-submit'))

    await waitFor(() =>
      expect(screen.getByText('settings.profile.errors.usernameTaken')).toBeInTheDocument(),
    )
  })
})
