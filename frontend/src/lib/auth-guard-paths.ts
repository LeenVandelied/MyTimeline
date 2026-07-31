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
 * laisserait la nouvelle route SANS garde serveur, silencieusement.**
 *
 * ✅ #318 — ce n'est plus silencieux : `auth-guard-paths.test.ts` LIT le système
 * de fichiers (`readdirSync` sur `frontend/app/[locale]/(app)/`, profondeur 1) et
 * fait échouer la suite dans les DEUX sens — dossier présent non déclaré ici, ou
 * segment déclaré ici sans dossier correspondant. Le middleware, lui, ne peut
 * toujours pas dériver la liste à l'exécution (Edge : ni `fs`, ni `path`) : c'est
 * le test qui porte la synchronisation, pas le runtime.
 *
 * Conséquence pratique : cette liste ne se modifie JAMAIS seule. Si le test rouge
 * te renvoie ici, c'est l'arborescence qui a bougé — son message nomme le segment
 * fautif et le sens de l'écart.
 *
 * ⚠ **Segments en MINUSCULES, impérativement.** `isProtectedPathname` compare
 * `segment.toLowerCase()` à cette liste : un segment déclaré `'Billing'` n'y est
 * JAMAIS trouvé, donc `/fr/Billing` resterait ouvert aux anonymes. Le dossier sur
 * le disque, lui, garde sa casse — c'est la comparaison qui la normalise. Le
 * garde-fou du fichier de test fait échouer toute déclaration en casse mixte.
 *
 * Dérivée de `frontend/app/[locale]/(app)/` (vérifié #302, re-vérifié #299,
 * désormais VÉRIFIÉ EN CONTINU #318) : dashboard, products, settings, timeline.
 */
export const PROTECTED_APP_SEGMENTS = ['dashboard', 'products', 'settings', 'timeline'] as const

/**
 * Segments connectés vivant HORS du groupe `(app)`.
 *
 * VIDE depuis #299 : `settings` était le seul occupant, parce que sa coquille
 * portait une sidebar 220px incompatible avec celle d'`AppShell`. Ses chapitres
 * étant passés en onglets horizontaux, la route a été déplacée sous `(app)/` et
 * a rejoint `PROTECTED_APP_SEGMENTS` — la garde serveur couvre exactement le
 * même périmètre qu'avant, par une autre constante.
 *
 * La constante est CONSERVÉE (plutôt que supprimée) : elle documente la
 * distinction « connecté hors du groupe », qui reste un cas possible, et son
 * test ancre le fait qu'aucune route n'est aujourd'hui dans cette situation.
 *
 * ⚠ #318 — le garde-fou filesystem ne couvre QUE le groupe `(app)`. Tout segment
 * ajouté ici échappe donc, par construction, à toute vérification automatique :
 * rien sur le disque ne le contredit, rien ne le confirme. Si tu la re-remplis :
 * 1. la route visée doit vivre HORS de `(app)/` — le test échoue si le segment
 *    est déclaré des deux côtés (déclaration contradictoire, cf. #299) ;
 * 2. remplace ici le motif de l'exception (pourquoi cette route ne peut pas
 *    rejoindre `(app)`), comme `settings` le documentait avant #299 ;
 * 3. ancre-la par un test de chemin explicite (`isProtectedPathname('/fr/<seg>')`),
 *    seul filet disponible hors du groupe.
 */
export const PROTECTED_EXTRA_SEGMENTS = [] as const

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
  const [rawLocale, ...rest] = pathname.split('/').filter(Boolean)

  if (rawLocale === undefined) return null

  // `nextUrl.pathname` n'est PAS décodé : `/fr/%64ashboard` arrive tel quel.
  // On décode SEGMENT PAR SEGMENT (jamais le pathname entier — un `%2F` décodé
  // en `/` créerait un segment fantôme après coup).
  const locale = decodeSegment(rawLocale)
  if (locale === null || !isSupportedLocale(locale)) return null

  const rawSegment = rest[0] ?? null
  if (rawSegment === null) return { locale, segment: null }

  // Segment malformé (`%zz`) : on conserve le BRUT. `isProtectedPathname` le
  // reconnaît alors comme malformé et bascule fail-closed (= protégé).
  return { locale, segment: decodeSegment(rawSegment) ?? rawSegment }
}

/**
 * Décode UN segment de chemin — `null` si le percent-encoding est malformé
 * (`decodeURIComponent` lève `URIError` sur `%zz`).
 *
 * ⚠ **Un seul niveau** de décodage, délibérément : c'est ce que fait le routeur
 * Next. `/fr/%2564ashboard` se décode en `%64ashboard`, qui ne correspond à
 * aucune route — le traiter comme `dashboard` divergerait du routage réel.
 */
function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/**
 * `true` si le pathname cible une route exigeant une session.
 *
 * Comparaison insensible à la casse : le routage App Router est sensible à la
 * casse (`/fr/Dashboard` → 404), mais on ne veut pas qu'une future normalisation
 * d'URL transforme la casse en contournement de garde.
 *
 * Le segment comparé est DÉCODÉ (`splitLocalizedPathname`) : `/fr/%64ashboard`
 * est protégé au même titre que `/fr/dashboard`. Un segment au percent-encoding
 * **malformé** est traité comme protégé (fail-closed) : on ignore ce que le
 * routeur en fera, donc on refuse plutôt que de servir.
 */
export function isProtectedPathname(pathname: string): boolean {
  const parsed = splitLocalizedPathname(pathname)
  if (parsed === null || parsed.segment === null) return false

  if (decodeSegment(parsed.segment) === null) return true // fail-closed

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
