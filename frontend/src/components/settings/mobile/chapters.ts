/**
 * #87 — Chapitres partagés du drill-down mobile Réglages. Aligné sur l'ordre
 * du `SettingsShell` desktop (#86) : Profil / Sécurité / Préférences / Compte.
 */
export type ChapterId = 'profile' | 'security' | 'preferences' | 'account'

export const MOBILE_CHAPTERS: readonly ChapterId[] = [
  'profile',
  'security',
  'preferences',
  'account',
] as const
