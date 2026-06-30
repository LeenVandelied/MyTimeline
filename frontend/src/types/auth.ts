/**
 * #53 — Les schémas Zod auth ont migré vers `@/lib/schemas/auth` (source unique,
 * corrige A12). On les ré-exporte ici pour préserver les imports historiques
 * (`@/types/auth` → `LoginSchema`, `LoginData`, `RegisterSchema`, `RegisterData`).
 */
export { LoginSchema, RegisterSchema, type LoginData, type RegisterData } from '@/lib/schemas/auth'

export interface User {
  id: string
  name: string
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
