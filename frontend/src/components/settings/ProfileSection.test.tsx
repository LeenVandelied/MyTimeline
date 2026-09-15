import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
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
const uploadAvatarMutate = vi.fn()
const deleteAvatarMutate = vi.fn()
const mockUser: {
  id: string
  name: string
  username: string
  email: string
  role: string
  avatarUrl: string | null
} = {
  id: 'u1',
  name: 'Jane',
  username: 'jane',
  email: 'jane@ex.com',
  role: 'ROLE_USER',
  avatarUrl: null,
}
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    user: mockUser,
    updateProfile: { mutateAsync: updateProfileMutate, isPending: false },
    uploadAvatar: { mutateAsync: uploadAvatarMutate, isPending: false },
    deleteAvatar: { mutateAsync: deleteAvatarMutate, isPending: false },
  }),
}))

// AvatarUpload isolé : on expose des boutons pour déclencher onCropped/onDelete et
// on reflète `currentAvatarUrl` pour vérifier le branchement bout-en-bout.
vi.mock('./AvatarUpload', () => ({
  AvatarUpload: ({
    currentAvatarUrl,
    onCropped,
    onDelete,
  }: {
    currentAvatarUrl: string | null
    onCropped: (file: File) => void
    onDelete?: () => void
  }) => (
    <div data-testid="mock-avatar" data-avatar-url={currentAvatarUrl ?? ''}>
      <button
        type="button"
        data-testid="mock-avatar-crop"
        onClick={() => onCropped(new File(['x'], 'a.png', { type: 'image/png' }))}
      >
        crop
      </button>
      <button type="button" data-testid="mock-avatar-delete" onClick={() => onDelete?.()}>
        del
      </button>
    </div>
  ),
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

  it("passe l'avatarUrl du user courant à AvatarUpload", () => {
    render(<ProfileSection />)
    // #75 — plus de `null` en dur : la valeur vient de user.avatarUrl (ici null).
    expect(screen.getByTestId('mock-avatar')).toHaveAttribute('data-avatar-url', '')
  })

  it('upload avatar : mutation appelée + toast succès', async () => {
    uploadAvatarMutate.mockResolvedValue({})
    render(<ProfileSection />)
    fireEvent.click(screen.getByTestId('mock-avatar-crop'))

    await waitFor(() => expect(uploadAvatarMutate).toHaveBeenCalledTimes(1))
    expect(uploadAvatarMutate.mock.calls[0][0]).toBeInstanceOf(File)
    expect(toast.success).toHaveBeenCalledWith('settings.profile.avatar.uploaded')
  })

  it("upload avatar en échec : toast d'erreur (pas de toast succès)", async () => {
    uploadAvatarMutate.mockRejectedValue(new Error('boom'))
    render(<ProfileSection />)
    fireEvent.click(screen.getByTestId('mock-avatar-crop'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('settings.profile.avatar.uploadError'),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('suppression avatar : mutation appelée + toast succès', async () => {
    deleteAvatarMutate.mockResolvedValue(undefined)
    render(<ProfileSection />)
    fireEvent.click(screen.getByTestId('mock-avatar-delete'))

    await waitFor(() => expect(deleteAvatarMutate).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('settings.profile.avatar.deleted')
  })
})
