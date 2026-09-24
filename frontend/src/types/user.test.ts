import { describe, expect, it } from 'vitest'
import { UserSchema } from './user'

/**
 * #75 — Synchro Zod/DTO : UserResponse expose désormais `avatarUrl` (relatif ou
 * null). Le champ est nullable (toujours présent), PAS optional.
 *
 * #653 — idem pour `themePreference` (`light`|`dark`|`system`|`null`) : la clé
 * est TOUJOURS présente côté backend, `null` = aucun choix explicite.
 */
const BASE = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Jane',
  username: 'jane',
  email: 'jane@ex.com',
  role: 'ROLE_USER',
  themePreference: null,
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

describe('UserSchema.themePreference (#653)', () => {
  const WITH_AVATAR = { ...BASE, avatarUrl: null }

  it.each(['light', 'dark', 'system'] as const)('accepte %s', (value) => {
    expect(UserSchema.parse({ ...WITH_AVATAR, themePreference: value }).themePreference).toBe(value)
  })

  it('accepte null (aucun choix explicite, distinct de system)', () => {
    expect(UserSchema.parse(WITH_AVATAR).themePreference).toBeNull()
  })

  it('rejette l’absence de la clé (nullable, pas optional)', () => {
    const withoutKey: Record<string, unknown> = { ...WITH_AVATAR }
    delete withoutKey.themePreference
    expect(() => UserSchema.parse(withoutKey)).toThrow()
  })

  it.each(['LIGHT', 'auto', ''])('rejette une valeur hors contrat (%j)', (value) => {
    expect(() => UserSchema.parse({ ...WITH_AVATAR, themePreference: value })).toThrow()
  })
})
