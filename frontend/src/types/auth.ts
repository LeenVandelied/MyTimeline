/**
 * #53 — Les schémas Zod auth ont migré vers `@/lib/schemas/auth` (source unique,
 * corrige A12). On les ré-exporte ici pour préserver les imports historiques
 * (`@/types/auth` → `LoginSchema`, `LoginData`, `RegisterSchema`, `RegisterData`).
 */
import type { ThemeOption } from '@/types/settings'

export { LoginSchema, RegisterSchema, type LoginData, type RegisterData } from '@/lib/schemas/auth'

export interface User {
  id: string
  name: string
  username: string
  email: string
  role: string
  // #75 — URL relative de l'avatar (`/api/me/avatar`, endpoint authentifié) ou
  // `null`. Peuplée par `getUserProfile` (parse `UserSchema`) et propagée via
  // AuthContext. Le backend renvoie toujours le champ (nullable).
  avatarUrl: string | null
  // #653 — préférence de thème du compte ; `null` = aucun choix explicite
  // (≠ `system`). Arbitrée à la connexion par `AuthProvider` (BR-AUT-013).
  themePreference: ThemeOption | null
}

export interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (name: string, username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /**
   * #75 — Force une resynchro du user depuis `/api/auth/me` (source de vérité
   * serveur). Utilisé après upload/suppression d'avatar pour que l'`avatarUrl`
   * du user en mémoire reflète le nouvel état backend.
   */
  refreshUser: () => Promise<void>
  loading: boolean
}
