import { z } from 'zod'

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
})

export type User = z.infer<typeof UserSchema>
