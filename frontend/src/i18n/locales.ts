/**
 * #235 — Source de vérité UNIQUE des locales supportées.
 *
 * Avant : chaque fichier (middleware.ts, layout.tsx, error.tsx, apiClient.ts,
 * settings.ts) redéclarait son propre tableau de locales. `layout.tsx` était
 * resté sur `['fr', 'en']` alors que le middleware acceptait 4 langues → toute
 * URL `/es/...` ou `/de/...` passait le middleware puis tombait sur `notFound()`
 * (404) dans le layout. Les traductions es/de livrées au Sprint 26 étaient donc
 * inutilisables.
 *
 * Cette constante centralise la liste. Elle est PURE (aucune dépendance Node
 * fs/path) → importable sans risque depuis le runtime Edge de `middleware.ts`.
 * Toute évolution de la liste des langues se fait ICI et se propage partout.
 */

export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

/** Garde de type : `true` si `value` est une locale supportée. */
export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
