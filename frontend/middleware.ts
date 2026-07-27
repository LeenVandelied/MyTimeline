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

    // `Location` RELATIF, délibérément. Construire une URL absolue à partir de
    // `request.url` reviendrait à faire confiance à l'en-tête `Host`, que
    // l'appelant contrôle : un `Host: evil.example` produirait un `Location:`
    // absolu vers un domaine arbitraire (open-redirect, et empoisonnement de
    // cache si un cache mutualisé mémorise la 307). Un chemin relatif est
    // résolu par le client contre l'origine réellement contactée — donc juste
    // derrière un proxy, sans dépendre d'un en-tête non fiable.
    // La query string n'est PAS reportée : pas de `?redirect=` (surface
    // d'open-redirect), cf. ADR-004 §Limites.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: buildLoginPathname(locale) },
    })
  }

  return intlMiddleware(request)
}

/**
 * ⚠ `matcher` doit rester une **littérale statique** : Next l'analyse au build,
 * il ne peut PAS être calculé (d'où la liste de locales dupliquée ci-dessous,
 * ancrée par un test contre `SUPPORTED_LOCALES` — #235).
 *
 * Entrée 1 — tout sauf `api`, les internes Next/Vercel et les **assets réels**.
 * L'ancien motif `.*\..*` excluait TOUT chemin contenant un point : un
 * `/fr/products/foo.bar` n'entrait jamais dans le middleware et échappait donc
 * à la garde (le paramètre `[productId]` accepte un point — trivialement
 * atteignable). L'exclusion est désormais limitée à une extension d'asset en
 * FIN de chemin.
 *
 * Entrée 2 — ré-inclut inconditionnellement tout chemin préfixé d'une locale,
 * extension ou non. Sans elle, `/fr/products/photo.png` resterait exclu par
 * l'entrée 1 et rouvrirait le même trou. Les assets réels vivent sous
 * `/public` et sont servis à la racine (`/favicon.ico`, `/images/logo.svg`) —
 * jamais sous un préfixe de locale : les deux entrées ne se marchent pas dessus.
 *
 * ⚠ POURQUOI `(?:[^%/]+/)*[^%/]+` ET NON `.*` DEVANT L'EXTENSION (revue S45) —
 * l'entrée 2 rattrape l'entrée 1 uniquement sur une locale **littérale**
 * (`fr|en|es|de`, l'alternation ne peut pas être calculée). Un `.*` laissait
 * donc passer entre les deux entrées tout chemin qui (a) finit par une
 * extension d'asset ET (b) porte une locale que l'entrée 2 ne reconnaît pas
 * littéralement :
 *   `/%66r/products/photo.png` → entrée 1 = exclu (finit par `.png`),
 *   entrée 2 = pas de match (`%66r` ≠ `fr`) → **middleware jamais invoqué**,
 *   puis le routeur Next décode `%66r` → `fr` et sert la page protégée.
 * Le décodage segment-par-segment d'`auth-guard-paths` ne pouvait rien : il
 * s'exécute APRÈS l'entrée dans le middleware.
 * Le motif exige désormais des segments NON VIDES et SANS `%` :
 *   - `[^%]` ferme le percent-encoding (`%66r`, `%2Epng`, double encodage) ;
 *   - `[^/]` + segments non vides ferment les slashes répétés
 *     (`/fr//products/photo.png`, non couvert par l'entrée 2 non plus).
 * Tout chemin « non canonique » retombe donc dans le middleware (fail-closed),
 * au prix d'un faux positif inoffensif : un asset de `/public` dont le nom
 * contiendrait un `%` serait traité par le middleware (aucun aujourd'hui —
 * vérifié sur l'arbre `public/`).
 * Vérifié en compilant les deux entrées avec le path-to-regexp EMBARQUÉ de Next
 * (`{ delimiter: '/', sensitive: false, strict: false }`), cf. les cas ancrés
 * dans `middleware.test.ts` et le cas E2E de `e2e/auth-guard.spec.ts`.
 */
export const config = {
  matcher: [
    '/((?!api|_next|_vercel|(?:[^%/]+/)*[^%/]+\\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|css|js|map|woff2?|ttf|otf|txt|xml|webmanifest)$).*)',
    '/:locale(fr|en|es|de)/:path*',
  ],
}
