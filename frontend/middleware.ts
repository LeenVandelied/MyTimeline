import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/i18n/locales'
import {
  AUTH_COOKIE_NAME,
  buildLoginPathname,
  isProtectedPathname,
  splitLocalizedPathname,
} from '@/lib/auth-guard-paths'
import { verifyAuthCookie } from '@/lib/auth-token-verify'
import { canonicalizeLocation, canonicalOrigins } from '@/lib/canonical-host'

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
 * #323 — la garde vérifie désormais aussi la SIGNATURE et l'EXPIRATION du cookie.
 * `JwtService` signe en RS256 : seule la clé PUBLIQUE est exposée à l'Edge, donc
 * aucun secret de frappe de jetons ne quitte le backend — ce qui levait le blocage
 * de l'ADR-004 §Option A. Un cookie `jwt` forgé ou expiré est maintenant redirigé,
 * plus servi.
 *
 * #358 — cette clé publique n'est PLUS recopiée à la main dans une variable
 * d'environnement (`AUTH_JWT_PUBLIC_KEY` n'existe plus). Elle est DÉCOUVERTE auprès
 * du backend via son JWKS (`AUTH_JWKS_URL`), qui en est la source de vérité :
 * la rotation devient atomique et la panne « clé dépareillée » disparaît par
 * construction. Cache, timeout et garde-fou anti-tempête : `src/lib/auth-jwks.ts`.
 *
 * ⚠ Ce n'est TOUJOURS PAS une frontière d'autorisation. Deux raisons subsistent :
 * (a) la RÉVOCATION de session (`jti`) n'est vérifiable qu'en base, donc côté
 * backend ; (b) sans JWKS configuré ou joignable, la garde retombe en mode dégradé
 * « présence seule » (cf. `auth-token-verify.ts`). `JwtFilter` reste le seul juge :
 * ne jamais rendre de donnée métier en se fiant à ce middleware.
 *
 * ORDRE : le check d'auth s'exécute AVANT `intlMiddleware`, mais ne traite que
 * les chemins DÉJÀ préfixés d'une locale supportée. Un `/dashboard` nu passe donc
 * à next-intl, qui le redirige vers `/fr/dashboard` ; le middleware re-tourne sur
 * cette nouvelle requête et applique alors la garde. Une seule implémentation de
 * la négociation de locale, celle de next-intl (pas de régression #235).
 */
/**
 * #322 — Réécrit l'origine de TOUTE redirection émise ici vers l'origine
 * canonique déclarée en configuration (`APP_CANONICAL_HOST`).
 *
 * S'applique aussi bien à la 307 de la garde qu'aux redirections de next-intl
 * (`/` → `/fr`, `/dashboard` → `/fr/dashboard`) : elles dérivent TOUTES de
 * `request.nextUrl`. N'en durcir qu'une laisserait le même vecteur ouvert sur
 * l'autre, sur des chemins bien plus atteignables.
 *
 * Variable non configurée → renvoie la réponse telle quelle (dégradé assumé,
 * cf. `canonical-host.ts` et ADR-004 §Limites). Ne lève jamais : une exception
 * ici redeviendrait un 500 sur toutes les routes protégées (BUG-S45-001).
 *
 * ⚠ La lecture de `process.env.APP_CANONICAL_HOST` est écrite en accès LITTÉRAL
 * (et non `process.env[CONST]`) : c'est la forme que l'analyse statique de Next
 * reconnaît. La variable n'étant pas `NEXT_PUBLIC_*`, elle n'est PAS inlinée au
 * build — elle est lue au RUNTIME depuis l'environnement du serveur Node
 * (`buildEnvironmentVariablesFrom`, `next/dist/server/web/sandbox/context.js`),
 * donc modifiable sans reconstruire l'image.
 */
function withCanonicalOrigin(response: NextResponse): NextResponse {
  try {
    // ⚠ DANS le `try` (revue S50) : ce `try` promet « ne lève jamais », or l'appel était
    // AU-DESSUS de lui. `canonicalOrigins` est réputée non levante, mais elle lit
    // `process.env` et parse de la configuration — la promesse doit couvrir toute la
    // fonction, pas la moitié. Une exception ici = 500 sur toutes les routes protégées
    // (BUG-S45-001), et la garantie ne doit pas dépendre de l'implémentation d'un appelé.
    const origins = canonicalOrigins(process.env.APP_CANONICAL_HOST)
    if (origins.length === 0) return response

    const location = response.headers.get('location')
    if (location === null) return response

    const canonical = canonicalizeLocation(location, origins)
    if (canonical !== location) response.headers.set('location', canonical)
  } catch {
    // Filet de sécurité : en-têtes non modifiables, valeur exotique… on préfère
    // une redirection non durcie à une panne totale des routes protégées.
  }

  return response
}

/**
 * #323 — `async` DEPUIS la vérification de signature : `crypto.subtle.verify` est
 * asynchrone et aucune API WebCrypto synchrone n'existe. Next accepte un middleware
 * qui renvoie une `Promise<NextResponse>` ; le coût est une vérification RSA (~0,1 ms)
 * sur les seules routes protégées, la clé publique n'étant importée qu'une fois par
 * instance (cache dans `auth-token-verify.ts`).
 *
 * ⚠ `verifyAuthCookie` ne LÈVE jamais, par construction : toute exception qui
 * remonterait ici deviendrait un 500 sur toutes les routes protégées (BUG-S45-001).
 */
export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // ⚠ `process.env.AUTH_JWKS_URL` en accès LITTÉRAL (et non `process.env[CONST]`) : c'est la
  // forme reconnue par l'analyse statique de Next. Variable NON `NEXT_PUBLIC_*`, donc lue au
  // RUNTIME, jamais inlinée au build ni envoyée au navigateur — l'URL doit d'ailleurs être
  // joignable DEPUIS LE SERVEUR Next, ce qui n'est pas la même adresse que celle du navigateur
  // (`NEXT_PUBLIC_API_URL` vaut `http://localhost:8080/api` en Docker et `/api` en E2E : ni
  // l'une ni l'autre n'est exploitable ici, d'où une variable dédiée — #358).
  //
  // ⚠ `verifyAuthCookie` fait un appel RÉSEAU (découverte JWKS) au plus une fois par TTL et
  // par isolat, jamais par requête, et ne LÈVE jamais : son `fetch` est enveloppé et borné par
  // un timeout. Un backend lent ou mort dégrade la garde, il ne pend pas l'Edge et ne produit
  // pas de 500 sur toutes les routes protégées (BUG-S45-001).
  const isRejected =
    isProtectedPathname(pathname) &&
    (await verifyAuthCookie(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
      process.env.AUTH_JWKS_URL,
    )) === 'rejected'

  if (isRejected) {
    // `splitLocalizedPathname` est non-null ici (garanti par `isProtectedPathname`),
    // mais on retombe sur `DEFAULT_LOCALE` plutôt que d'écrire un `!` non prouvable.
    const locale = splitLocalizedPathname(pathname)?.locale ?? DEFAULT_LOCALE

    // ⚠ `Location` ABSOLU, CONTRAINT PAR LE RUNTIME — ne pas « re-durcir » en
    // relatif (retour arrière assumé sur l'audit S45, cf. ADR-004 §Limites).
    // Next NORMALISE tout `Location` émis par un middleware :
    // `adapter.js` fait `new NextURL(location, …)` → `new URL(location)` SANS
    // base. Sur un chemin relatif, ce parse lève `TypeError: Invalid URL` et la
    // requête finit en **500** — reproduit localement (`ERR_INVALID_URL`,
    // `input: '/fr/login'`) et en CI (run 30269383403 : 10 specs `auth-guard`
    // attendaient 307, recevaient 500). Une garde qui 500 sur TOUTES les routes
    // protégées est une panne totale. Le `Host` hostile est désormais traité en
    // AVAL par `withCanonicalOrigin` (#322), PAS en repassant au relatif.
    //
    // On clone `request.nextUrl` (déjà parsé/normalisé par Next, `x-forwarded-*`
    // pris en compte) plutôt que de concaténer `request.url` à la main.
    // La query string n'est PAS reportée : pas de `?redirect=` (surface
    // d'open-redirect), cf. ADR-004 §Limites.
    //
    // #322 — l'ORIGINE de cette URL n'est plus considérée comme digne de
    // confiance : `withCanonicalOrigin` la remplace par l'origine canonique
    // configurée avant que la réponse ne parte.
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = buildLoginPathname(locale)
    loginUrl.search = ''

    return withCanonicalOrigin(NextResponse.redirect(loginUrl, 307))
  }

  return withCanonicalOrigin(intlMiddleware(request))
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
