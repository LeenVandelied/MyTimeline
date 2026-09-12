import { describe, expect, it } from 'vitest'
import { UserSchema } from './user'

/**
 * #75 — Synchro Zod/DTO : UserResponse expose désormais `avatarUrl` (relatif ou
 * null). Le champ est nullable (toujours présent), PAS optional.
 */
const BASE = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Jane',
  username: 'jane',
  email: 'jane@ex.com',
  role: 'ROLE_USER',
}

describe('UserSchema.avatarUrl', () => {
  it('accepte une URL relative d’avatar', () => {
    const parsed = UserSchema.parse({ ...BASE, avatarUrl: '/api/me/avatar' })
    expect(parsed.avatarUrl).toBe('/api/me/avatar')
  })

  it('accepte null (aucun avatar)', () => {
    const parsed = UserSchema.parse({ ...BASE, avatarUrl: null })
    expect(parsed.avatarUrl).toBeNull()
  })

  it('rejette l’absence du champ (nullable, pas optional)', () => {
    expect(() => UserSchema.parse(BASE)).toThrow()
  })
})
