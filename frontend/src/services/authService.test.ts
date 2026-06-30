import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * #40 — fix de la signature buggée : `register(name, username, email, password)`
 * DOIT envoyer un payload où `name` ≠ `username` (avant, `username` était passé
 * deux fois et le `name` réel ignoré — cf. anti-pattern A11 br-auth).
 */

const postMock = vi.fn()
const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    post: (...args: unknown[]) => postMock(...args),
    get: (...args: unknown[]) => getMock(...args),
  },
}))

import { registerUser } from './authService'

describe('authService.registerUser', () => {
  beforeEach(() => {
    postMock.mockReset()
    getMock.mockReset()
  })

  it('envoie name distinct de username dans le payload /auth/register', async () => {
    postMock.mockResolvedValue({ data: { message: 'ok' } })

    await registerUser('Alice Martin', 'alice', 'alice@example.com', 'secret123')

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, payload] = postMock.mock.calls[0]
    expect(url).toBe('/auth/register')
    expect(payload).toEqual({
      name: 'Alice Martin',
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret123',
    })
    // Garde-fou explicite contre la régression de signature.
    expect(payload.name).not.toBe(payload.username)
  })
})
