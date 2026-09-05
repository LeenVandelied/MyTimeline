import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * #75 — Avatar bout-en-bout côté service : POST /me/avatar (multipart `file`) et
 * DELETE /me/avatar. On vérifie l'URL, la forme FormData (part `file`), l'absence
 * de header Content-Type forcé (axios pose la boundary), et le parse UserResponse.
 */
const postMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}))

import { uploadAvatar, deleteAvatar } from './userService'

const USER_RESPONSE = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Jane',
  username: 'jane',
  email: 'jane@ex.com',
  role: 'ROLE_USER',
  avatarUrl: '/api/me/avatar',
}

describe('userService avatar', () => {
  beforeEach(() => {
    postMock.mockReset()
    deleteMock.mockReset()
  })

  it('uploadAvatar POST /me/avatar en FormData (part `file`), parse UserResponse', async () => {
    postMock.mockResolvedValue({ data: USER_RESPONSE })
    const file = new File(['x'], 'avatar.png', { type: 'image/png' })

    const result = await uploadAvatar(file)

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, body, config] = postMock.mock.calls[0]
    expect(url).toBe('/me/avatar')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    // On NE force PAS le Content-Type : axios gère la boundary multipart.
    expect(config).toBeUndefined()
    expect(result.avatarUrl).toBe('/api/me/avatar')
  })

  it('uploadAvatar rejette si le backend renvoie un payload non conforme', async () => {
    postMock.mockResolvedValue({ data: { id: 'not-a-uuid' } })
    const file = new File(['x'], 'avatar.png', { type: 'image/png' })

    await expect(uploadAvatar(file)).rejects.toThrow()
  })

  it('deleteAvatar appelle DELETE /me/avatar', async () => {
    deleteMock.mockResolvedValue({ status: 204 })

    await deleteAvatar()

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock.mock.calls[0][0]).toBe('/me/avatar')
  })
})
