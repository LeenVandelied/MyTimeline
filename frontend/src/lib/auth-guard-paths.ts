/**
 * #302 — Logique de chemins de la garde serveur (`middleware.ts`). Cf. ADR-004.
 *
 * Ce module est PUR : aucun import `next/server`, `fs` ou `path` → importable
 * sans risque depuis le runtime **Edge** de `middleware.ts` (même contrainte que
 * `src/i18n/locales.ts`, #235) et testable sans mocker `NextRequest`.
 */

import { isSupportedLocale, type Locale } from '@/i18n/locales'

/**
 * Nom du cookie de session posé par le backend au login.
 *
 * ⚠ Source de vérité : `JwtFilter.java:48` (`"jwt".equals(cookie.getName())`) et
 * `AuthController` (BR-AUT-007 — HttpOnly, Path=/, SameSite=Lax, MaxAge 2 jours).
 * Le cookie étant HttpOnly, il est invisible à JS : seul le serveur (middleware
 * ou backend) peut le lire.
 */
export const AUTH_COOKIE_NAME = 'jwt'

/**
 * Premier segment d'URL des routes du groupe connecté `(app)`.
 *
 * ⚠ Un route group `(app)` **n'apparaît PAS dans l'URL** : `/fr/dashboard`, pas
 * `/fr/(app)/dashboard`. Le middleware ne peut donc pas déduire cette liste du
 * système de fichiers à l'exécution — elle est explicite, donc faillible.
 *
 * **Ajouter un segment sous `frontend/app/[locale]/(app)/` sans l'ajouter ici
 * laisse la nouvelle route SANS garde serveur, silencieusement.** Le test
 * `auth-guard-paths.test.ts` ancre la liste ; il ne la synchronise pas.
 *
 * Dérivée de `frontend/app/[locale]/(app)/` (vérifié #302) : dashboard, products,
 * timeline.
 */
export const PROTECTED_APP_SEGMENTS = ['dashboard', 'products', 'timeline'] as const

/**
 * Segments connectés vivant HORS du groupe `(app)`.
 *
 * `settings` a son propre shell (`SettingsShell`, cf. commentaire de
 * `app/[locale]/(app)/layout.tsx`) et porte sa propre garde client
 * (`app/[locale]/settings/page.tsx:35-39`, même pattern que `useAuthGuard`). Il
 * est tout aussi authentifié que les routes de `(app)` : l'exclure de la garde
 * serveur laisserait un trou évident. Isolé dans une constante distincte pour
 * rendre le périmètre explicite et révisable.
 */
export const PROTECTED_EXTRA_SEGMENTS = ['settings'] as const

/** Union des segments exigeant une session côté serveur. */
export const PROTECTED_SEGMENTS: readonly string[] = [
  ...PROTECTED_APP_SEGMENTS,
  ...PROTECTED_EXTRA_SEGMENTS,
]

/** Segment de la page de connexion (cible de redirection). */
export const LOGIN_SEGMENT = 'login'

/**
 * Découpe un pathname en `{ locale, segment }` — `null` si le chemin n'est pas
 * préfixé par une locale SUPPORTÉE.
 *
 * `localePrefix: 'always'` garantit que toute URL applicative finit préfixée,
 * mais le middleware voit AUSSI les URLs non préfixées (`/dashboard`) AVANT que
 * next-intl ne les redirige. On renvoie `null` dans ce cas : next-intl redirige
 * d'abord vers `/<locale>/dashboard`, requête sur laquelle le middleware
 * re-tourne et applique la garde. On évite ainsi de dupliquer la négociation de
 * locale (Accept-Language / cookie `NEXT_LOCALE`) — cf. ADR-004 §Décision 3.
 */
export function splitLocalizedPathname(
  pathname: string,
): { locale: Locale; segment: string | null } | null {
  const [maybeLocale, ...rest] = pathname.split('/').filter(Boolean)

  if (maybeLocale === undefined || !isSupportedLocale(maybeLocale)) return null

  return { locale: maybeLocale, segment: rest[0] ?? null }
}

/**
 * `true` si le pathname cible une route exigeant une session.
 *
 * Comparaison insensible à la casse : le routage App Router est sensible à la
 * casse (`/fr/Dashboard` → 404), mais on ne veut pas qu'une future normalisation
 * d'URL transforme la casse en contournement de garde.
 */
export function isProtectedPathname(pathname: string): boolean {
  const parsed = splitLocalizedPathname(pathname)
  if (parsed === null || parsed.segment === null) return false

  return PROTECTED_SEGMENTS.includes(parsed.segment.toLowerCase())
}

/**
 * Chemin de connexion LOCALISÉ. Toujours préfixé par la locale : un `/login` nu
 * serait re-redirigé par next-intl (`localePrefix: 'always'`) — et une cible de
 * redirection elle-même redirigée est le point de départ classique d'une boucle.
 */
export function buildLoginPathname(locale: Locale): string {
  return `/${locale}/${LOGIN_SEGMENT}`
}
