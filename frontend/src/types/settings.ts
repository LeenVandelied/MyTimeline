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
  id: z.string().uuid(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActivity: z.string(),
  createdAt: z.string(),
  current: z.boolean(),
})

export type Session = z.infer<typeof SessionSchema>

export const SessionListSchema = z.array(SessionSchema)

/* ---------------------------------------------------------------------------
   Préférences (client-only pour l'instant — aucun endpoint backend dédié).
   Langue : gérée par next-intl (redirection locale). Thème : next-themes.
   Densité : persistée localStorage (non-PII) + appliquée via data-attribute.
   --------------------------------------------------------------------------- */

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const
export type ThemeOption = (typeof THEME_OPTIONS)[number]

export const DENSITY_OPTIONS = ['compact', 'normal', 'comfortable'] as const
export type DensityOption = (typeof DENSITY_OPTIONS)[number]

/** #235 — réexport de la source de vérité unique (cf. `@/i18n/locales`). */
export const LOCALE_OPTIONS = SUPPORTED_LOCALES
export type LocaleOption = Locale

/** Clé localStorage de la densité (non-PII, cf. DEC-S9-002 : jamais de PII ici). */
export const DENSITY_STORAGE_KEY = 'mt-density'
export const DEFAULT_DENSITY: DensityOption = 'normal'
