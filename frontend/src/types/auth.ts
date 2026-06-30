import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export type LoginData = z.infer<typeof LoginSchema>

/**
 * Payload d'inscription aligné sur le DTO backend `RegisterRequest`
 * {name, username, email, password} (cf. .claude/rules-jit/zod-dto-sync.md).
 * `name` ≠ `username` : champs distincts (bug pré-#40 où `username` était
 * envoyé comme `name`, désormais corrigé dans `useAuth.register`).
 */
export const RegisterSchema = z.object({
  name: z.string().min(3),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
})

export type RegisterData = z.infer<typeof RegisterSchema>

export interface User {
  id: string
  username: string
  email: string
  role: string
}

export interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (name: string, username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}
