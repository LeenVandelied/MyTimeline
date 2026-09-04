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

import { forgotPassword, registerUser } from './authService'

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

/**
 * #142 — la langue de l'email de réinitialisation transite par le DTO
 * `ForgotPasswordRequest.locale` (le serveur ne persiste aucune locale utilisateur).
 * Une locale non supportée est omise : le backend retombe alors sur `fr`.
 */
describe('authService.forgotPassword', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it.each(['fr', 'en', 'es', 'de'])('envoie la locale %s dans le payload', async (locale) => {
    postMock.mockResolvedValue({ data: {} })

    await forgotPassword('alice@example.com', locale)

    const [url, payload] = postMock.mock.calls[0]
    expect(url).toBe('/auth/forgot-password')
    expect(payload).toEqual({ email: 'alice@example.com', locale })
  })

  it.each([undefined, '', 'zz'])(
    'omet la locale quand elle est absente ou non supportée (%s)',
    async (locale) => {
      postMock.mockResolvedValue({ data: {} })

      await forgotPassword('alice@example.com', locale)

      const [, payload] = postMock.mock.calls[0]
      expect(payload).toEqual({ email: 'alice@example.com' })
    },
  )
})
