/**
 * #323 / #358 — Vérification de la SIGNATURE du cookie `jwt` dans le runtime Edge, avec la
 * seule clé PUBLIQUE. Cf. ADR-004 §« Vérification de signature RS256 ».
 *
 * Ce module est PUR au sens de `auth-guard-paths.ts` : aucun import `next/server`, `fs` ou
 * `path`. Il n'utilise que `crypto.subtle` et `atob`, tous deux présents dans le runtime Edge
 * — **aucune dépendance npm n'a été ajoutée** (ni `jose`, ni `jsonwebtoken`). Un ajout de
 * dépendance dans un runtime frontend partagé se séquence, il ne s'improvise pas ; et
 * `RSASSA-PKCS1-v1_5 / SHA-256` est exactement l'algorithme de `RS256`, donc WebCrypto suffit.
 *
 * ## #358 — d'où vient la clé
 *
 * Elle n'est plus lue dans `AUTH_JWT_PUBLIC_KEY` : cette variable N'EXISTE PLUS. Elle est
 * DÉCOUVERTE auprès du backend (JWKS), qui est la source de vérité — cf. `auth-jwks.ts` pour
 * le cache, le timeout et le garde-fou anti-tempête. La classe de panne « clé publique
 * dépareillée » disparaît par construction : il n'y a plus de seconde copie de la clé.
 *
 * ## Ce que ce module ne fait PAS
 *
 * Il ne remplace pas `JwtFilter` côté backend, qui reste le SEUL juge : lui seul vérifie la
 * révocation de session (`jti`) et l'existence de l'utilisateur. Ce module transforme la garde
 * d'« il y a un cookie » en « il y a un cookie authentique et non expiré » — un cran de plus,
 * pas une frontière d'autorisation.
 *
 * ## Dégradé assumé
 *
 * JWKS non configuré OU injoignable → verdict `accepted` dès que le cookie est présent, soit
 * exactement le comportement d'avant #323. Le choix est délibéré et INCHANGÉ par #358 : une
 * garde fail-closed sur une découverte en échec déconnecterait 100 % des utilisateurs à la
 * moindre indisponibilité du backend, alors que le backend, lui, continue de refuser les
 * jetons invalides. Même logique de dégradé que `APP_CANONICAL_HOST` (#322).
 *
 * ⚠ Le mode de panne signalé a CHANGÉ avec #358. Avant, le cas criant était « variable
 * présente mais illisible » ; ce chemin n'existe plus (il n'y a plus de variable portant du
 * matériel de clé). Les deux `console.warn` one-shot de production ont été RECIBLÉS sur les
 * deux modes de panne actuels — URL absente, et JWKS injoignable — cf. `auth-jwks.ts`. Ils
 * restent le SEUL signal existant : un E2E qui documente le dégradé reste VERT dans cet état,
 * donc rien dans le pipeline ne peut détecter la panne autrement.
 *
 * ⚠ Aucune fonction de ce module ne LÈVE. Une exception non catchée dans `middleware.ts`
 * produit un 500 sur TOUTES les routes protégées (BUG-S45-001).
 */

import {
  RS256_PARAMS,
  getVerificationKeys,
  normalizeJwksUrl,
  refreshVerificationKeys,
  signalJwksNotConfigured,
  signalJwksUnreachable,
} from './auth-jwks'

/**
 * `accepted` — cookie présent ET (signature valide OU vérification indisponible).
 * `rejected` — cookie absent, malformé, expiré, ou signature invalide.
 */
export type AuthCookieVerdict = 'accepted' | 'rejected'

/** Décodage base64url (alphabet JWT) vers octets. Renvoie `null` sur entrée non décodable. */
function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** Charge utile minimale dont dépend la garde. Les autres claims ne l'intéressent pas. */
type TokenClaims = { sub?: unknown; exp?: unknown; nbf?: unknown }

/** Segments d'un JWT compact, décodés et désérialisés. */
interface JwtParts {
  /** `header.payload` en Base64url — l'octet-à-octet exact qui a été signé. */
  readonly signingInput: string
  readonly header: { alg?: unknown }
  readonly claims: TokenClaims
  readonly signature: Uint8Array
}

/**
 * Découpe et décode un JWT compact — `null` dès que la forme est invalide (nombre de segments,
 * Base64url indécodable, JSON illisible). Aucune décision de sécurité ici : uniquement du
 * décodage, pour que `isStructurallyAcceptable`/`matchesAnyKey` ne portent que les vérifications.
 */
function parseJwtParts(token: string): JwtParts | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [rawHeader, rawPayload, rawSignature] = parts

  const headerBytes = decodeBase64Url(rawHeader)
  const payloadBytes = decodeBase64Url(rawPayload)
  const signature = decodeBase64Url(rawSignature)
  if (headerBytes === null || payloadBytes === null || signature === null) return null

  try {
    return {
      signingInput: `${rawHeader}.${rawPayload}`,
      header: JSON.parse(new TextDecoder().decode(headerBytes)) as { alg?: unknown },
      claims: JSON.parse(new TextDecoder().decode(payloadBytes)) as TokenClaims,
      signature,
    }
  } catch {
    return null
  }
}

/**
 * Fenêtre temporelle du jeton.
 *
 * `exp` est OBLIGATOIRE : un token sans expiration serait éternel côté garde. `JwtService` en
 * pose toujours un (BR-AUT-007, 2 jours). `nbf` n'est vérifié que s'il est présent.
 */
function isWithinTimeWindow(claims: TokenClaims, nowMs: number): boolean {
  if (typeof claims.exp !== 'number' || Number.isNaN(claims.exp)) return false
  if (claims.exp * 1000 <= nowMs) return false
  if (typeof claims.nbf === 'number' && claims.nbf * 1000 > nowMs) return false
  return true
}

/**
 * Recevabilité STRUCTURELLE et TEMPORELLE du jeton — tout sauf la signature.
 *
 * Séparé de la vérification cryptographique parce que les deux appellent des réactions
 * différentes : un jeton malformé ou expiré est définitivement rejeté, tandis qu'une signature
 * qui ne s'explique par aucune clé connue peut signifier une ROTATION DE CLÉ et justifie une
 * re-découverte du JWKS (#358). Mélanger les deux ferait re-fetcher sur des jetons simplement
 * périmés — le cas le PLUS courant en production.
 */
function isStructurallyAcceptable(parts: JwtParts, nowMs: number): boolean {
  // CONFUSION D'ALGORITHME — barrière n°1. `alg` est choisi par le PORTEUR du token : accepter
  // `none` (aucune signature) ou `HS256` (HMAC avec la clé publique, qui est publique par
  // construction) laisserait n'importe qui forger une identité. On exige RS256, le seul
  // algorithme que `JwtService` émet, AVANT même de toucher à la signature.
  if (parts.header.alg !== 'RS256') return false

  // `sub` OBLIGATOIRE et non vide (revue S50) : sans lui, TOUT jeton RS256 signé par cette clé
  // ouvre la garde, y compris un jeton d'un autre usage qui n'identifie personne. Sans effet
  // aujourd'hui (`JwtService` est le seul émetteur et pose toujours un `sub`), mais la garde
  // cesse de dépendre de cette exclusivité.
  if (typeof parts.claims.sub !== 'string' || parts.claims.sub.length === 0) return false

  return isWithinTimeWindow(parts.claims, nowMs)
}

/**
 * La signature est-elle celle de l'UNE des clés publiées par le JWKS ?
 *
 * Un JWKS peut légitimement en porter plusieurs (rotation à recouvrement). Une clé qui fait
 * lever `verify` (matériel exotique importé sans erreur mais inutilisable) ne doit pas masquer
 * les suivantes : on passe à la clé d'après plutôt que d'abandonner.
 */
async function matchesAnyKey(parts: JwtParts, keys: readonly CryptoKey[]): Promise<boolean> {
  const signed = new TextEncoder().encode(parts.signingInput)

  for (const key of keys) {
    try {
      const valid = await crypto.subtle.verify(
        RS256_PARAMS.name,
        key,
        parts.signature as BufferSource,
        signed as BufferSource,
      )
      if (valid) return true
    } catch {
      // Clé inexploitable : on essaie la suivante.
    }
  }
  return false
}

/**
 * Verdict de la garde sur le cookie `jwt`.
 *
 * @param token valeur du cookie `jwt` (`undefined` = cookie absent)
 * @param rawJwksUrl contenu de `AUTH_JWKS_URL` (`undefined`/vide = découverte désactivée,
 *                   donc vérification désactivée : mode dégradé « présence seule »)
 * @param nowMs horloge injectable (défaut : `Date.now()`)
 */
export async function verifyAuthCookie(
  token: string | undefined,
  rawJwksUrl: string | undefined,
  nowMs: number = Date.now(),
): Promise<AuthCookieVerdict> {
  if (token === undefined || token.length === 0) return 'rejected'

  try {
    // ⚠ ORDRE DÉLIBÉRÉ : la disponibilité de la clé est tranchée AVANT toute analyse du jeton.
    // En mode dégradé, le contrat est « présence seule » (#302) — un cookie qui n'est même pas
    // un JWT doit donc passer. Analyser d'abord durcirait le dégradé en douce et ferait
    // diverger deux modes qui doivent rester exactement ceux documentés dans l'ADR-004.
    const url = normalizeJwksUrl(rawJwksUrl)
    if (url === null) {
      // Découverte non configurée → contrat de #302. Muet en dev/test, signalé UNE fois en
      // production (cf. `auth-jwks.ts`).
      signalJwksNotConfigured()
      return 'accepted'
    }

    const keys = await getVerificationKeys(url, nowMs)
    if (keys === null) {
      // JWKS configuré mais injoignable/illisible : dégradé plutôt que déconnexion globale.
      // Le backend reste seul juge et continue de refuser les jetons invalides.
      signalJwksUnreachable()
      return 'accepted'
    }

    const parts = parseJwtParts(token)
    if (parts === null) return 'rejected'
    if (!isStructurallyAcceptable(parts, nowMs)) return 'rejected'
    if (await matchesAnyKey(parts, keys)) return 'accepted'

    // ROTATION DE CLÉ — seul chemin de re-découverte. Le jeton est bien formé, non expiré, et
    // ne se vérifie avec AUCUNE clé connue : soit la clé du backend a tourné et notre cache est
    // périmé, soit le jeton est forgé. Les deux sont indiscernables ici, d'où le garde-fou
    // anti-tempête de `refreshVerificationKeys` (au plus un appel par minute) : sans lui, un
    // attaquant envoyant des cookies forgés déclencherait un fetch par requête vers notre
    // propre backend. `null` = garde-fou actif → on s'en tient au rejet.
    const refreshed = await refreshVerificationKeys(url, nowMs)
    if (refreshed === null) return 'rejected'

    return (await matchesAnyKey(parts, refreshed)) ? 'accepted' : 'rejected'
  } catch {
    // Filet ultime : `crypto.subtle` indisponible, runtime exotique… jamais de 500.
    return 'accepted'
  }
}
