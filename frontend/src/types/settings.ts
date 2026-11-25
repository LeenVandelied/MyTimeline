import { z } from 'zod'

import { SUPPORTED_LOCALES, type Locale } from '@/i18n/locales'

/**
 * #86 — Types & schémas Zod des Réglages (Profil / Sécurité / Préférences / Compte).
 *
 * Séparation logique/présentation : ces schémas sont consommés par les HOOKS
 * (`useSettings`, `useSessionManager`) et réutilisés tels quels par la variante
 * mobile (#87). Aucun couplage à un composant.
 */

/* ---------------------------------------------------------------------------
   Sessions actives (contrat #73 — GET /api/sessions -> SessionResponse[]).
   Backend `SessionResponse` : { id(UUID), deviceInfo, ipAddress, lastActivity,
   createdAt, current }. `deviceInfo`/`ipAddress` peuvent être null (User-Agent
   absent, IP illisible) -> `.nullable()`. Dates en ISO string (LocalDateTime
   sérialisé Jackson : "2026-07-05T12:34:56").
   --------------------------------------------------------------------------- */

export const SessionSchema = z.object({
  id: z.guid(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActivity: z.string(),
  createdAt: z.string(),
  current: z.boolean(),
})

export type Session = z.infer<typeof SessionSchema>

export const SessionListSchema = z.array(SessionSchema)

/* ---------------------------------------------------------------------------
   Préférences.
   Langue : gérée par next-intl (redirection locale).
   Thème : appliqué par next-themes (localStorage) ET porté par le compte
   (#653, `PUT /api/me/preferences`, arbitrage à la connexion — BR-AUT-013) ;
   seul point d'écriture : `hooks/useThemeChoice.ts`.
   Densité : persistée localStorage (non-PII) + appliquée via data-attribute.
   --------------------------------------------------------------------------- */

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const
export type ThemeOption = (typeof THEME_OPTIONS)[number]

// #898 — densité : source unique dans `@/lib/density` (module sans dépendance,
// importable par la spec Playwright et par le script d'application précoce).
export { DENSITY_OPTIONS, DENSITY_STORAGE_KEY, DEFAULT_DENSITY } from '@/lib/density'
export type { DensityOption } from '@/lib/density'

/** #235 — réexport de la source de vérité unique (cf. `@/i18n/locales`). */
export const LOCALE_OPTIONS = SUPPORTED_LOCALES
export type LocaleOption = Locale
