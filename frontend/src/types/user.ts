import { z } from 'zod'
import { THEME_OPTIONS } from '@/types/settings'

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().email('Invalid email'),
  role: z.string(),
  // #75 — URL relative de l'avatar (endpoint authentifié `/api/me/avatar`) ou
  // `null` si aucun avatar. Le backend renvoie TOUJOURS le champ (nullable, pas
  // optional). Synchro DTO UserResponse.
  avatarUrl: z.string().nullable(),
  // #653 — préférence de thème du compte (ADR-010, BR-AUT-013). Clé TOUJOURS
  // présente : `null` = aucun choix explicite, DISTINCT de `system` (choix
  // explicite « suivre l'OS »). `.nullable()`, jamais `.optional()`/`.nullish()`.
  themePreference: z.enum(THEME_OPTIONS).nullable(),
})

export type User = z.infer<typeof UserSchema>
