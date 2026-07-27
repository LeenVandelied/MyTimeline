import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/i18n/locales'
import {
  AUTH_COOKIE_NAME,
  buildLoginPathname,
  isProtectedPathname,
  splitLocalizedPathname,
} from '@/lib/auth-guard-paths'

// Ce middleware gère la redirection basée sur la langue
const intlMiddleware = createMiddleware({
  // Liste des langues supportées (source de vérité unique — #235)
  locales: [...SUPPORTED_LOCALES],

  // Langue par défaut
  defaultLocale: DEFAULT_LOCALE,

  // Préfixer tous les chemins avec la locale
  localePrefix: 'always',
})

/**
 * #302 — Garde SERVEUR des routes connectées, COMPOSÉE avec le routage i18n.
 * Décision et limites : `docs/adr/ADR-004-garde-serveur-middleware.md`.
 *
 * Avant #302, `/fr/dashboard` était servi INTÉGRALEMENT à un anonyme (shell,
 * sidebar) avant que `useAuthGuard` ne le redirige en JS. On coupe désormais en
 * amont : cookie `jwt` absent sur une route protégée → 307 vers `/<locale>/login`,
 * zéro octet de page protégée.
 *
 * ⚠ Ce n'est PAS une frontière d'autorisation : on ne vérifie que la PRÉSENCE du
 * cookie, jamais sa signature (le secret HMAC de `JwtService` est symétrique — le
 * partager avec l'Edge mettrait un secret de frappe de jetons côté frontend, cf.
 * ADR-004 §Option A). Un cookie `jwt` bidon ou expiré passe donc cette garde ;
 * `JwtFilter` répond alors 401 aux appels API et `useAuthGuard` redirige côté
 * client. Ne jamais rendre de donnée métier en se fiant à ce middleware.
 *
 * ORDRE : le check d'auth s'exécute AVANT `intlMiddleware`, mais ne traite que
 * les chemins DÉJÀ préfixés d'une locale supportée. Un `/dashboard` nu passe donc
 * à next-intl, qui le redirige vers `/fr/dashboard` ; le middleware re-tourne sur
 * cette nouvelle requête et applique alors la garde. Une seule implémentation de
 * la négociation de locale, celle de next-intl (pas de régression #235).
 */
export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (isProtectedPathname(pathname) && !request.cookies.has(AUTH_COOKIE_NAME)) {
    // `splitLocalizedPathname` est non-null ici (garanti par `isProtectedPathname`),
    // mais on retombe sur `DEFAULT_LOCALE` plutôt que d'écrire un `!` non prouvable.
    const locale = splitLocalizedPathname(pathname)?.locale ?? DEFAULT_LOCALE

    // `new URL(..., request.url)` conserve l'origine réelle (protocole/host) —
    // indispensable derrière un proxy. La query string n'est PAS reportée :
    // pas de `?redirect=` (surface d'open-redirect), cf. ADR-004 §Limites.
    const loginUrl = new URL(buildLoginPathname(locale), request.url)

    return NextResponse.redirect(loginUrl)
  }

  return intlMiddleware(request)
}

export const config = {
  // Intercepter toutes les requêtes qui commencent par / sauf celles liées à API, assets, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
