/**
 * #323 — Vérification de la SIGNATURE du cookie `jwt` dans le runtime Edge, avec la seule
 * clé PUBLIQUE. Cf. ADR-004 §« Vérification de signature RS256 ».
 *
 * Ce module est PUR au sens de `auth-guard-paths.ts` : aucun import `next/server`, `fs` ou
 * `path`. Il n'utilise que `crypto.subtle` et `atob`, tous deux présents dans le runtime Edge
 * — **aucune dépendance npm n'a été ajoutée** (ni `jose`, ni `jsonwebtoken`). Un ajout de
 * dépendance dans un runtime frontend partagé se séquence, il ne s'improvise pas ; et
 * `RSASSA-PKCS1-v1_5 / SHA-256` est exactement l'algorithme de `RS256`, donc WebCrypto suffit.
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
 * Clé publique NON configurée, vide ou illisible → verdict `accepted` dès que le cookie est
 * présent, c'est-à-dire le comportement d'avant #323. Le choix est délibéré : une garde
 * fail-closed sur une clé mal configurée déconnecterait 100 % des utilisateurs sans qu'aucun
 * signal ne l'explique, alors que le backend, lui, continue de refuser les jetons invalides.
 * Même logique de dégradé que `APP_CANONICAL_HOST` (#322).
 *
 * ⚠ DEUX dégradés distincts, à ne pas confondre (revue S50) :
 *
 * - variable **ABSENTE / vide** → dégradé VOLONTAIRE. Silencieux HORS production (décision de
 *   dev : aucune clé n'est committée dans ce dépôt public, et journaliser à chaque boot local
 *   entraînerait l'ignorance du message par habitude) ; **signalé une fois EN production**
 *   (revue S50, 2e cycle) : c'est le mode de panne le plus probable — variable oubliée au
 *   premier déploiement — et il rendait #323 intégralement inerte sans le moindre symptôme.
 * - variable **PRÉSENTE mais inexploitable** (tronquée, typo, mauvais format) → ANOMALIE DE
 *   CONFIGURATION. Personne ne l'a voulue, et son effet est que 100 % des cookies sont acceptés
 *   sans qu'aucun signal n'existe : le spec E2E qui documente le dégradé reste VERT dans cet
 *   état, donc rien dans le pipeline ne peut détecter la panne. D'où le `console.warn`
 *   ci-dessous — le seul indice disponible.
 *
 * L'avertissement est **one-shot** : le middleware tourne sur CHAQUE navigation, un warn par
 * requête noierait les logs. Et il est enveloppé dans un `try` : voir l'avertissement final.
 *
 * ⚠ Aucune fonction de ce module ne LÈVE. Une exception non catchée dans `middleware.ts`
 * produit un 500 sur TOUTES les routes protégées (BUG-S45-001).
 */

/** Nom de la variable d'environnement portant la clé publique (documentation / tests). */
export const AUTH_PUBLIC_KEY_ENV_VAR = 'AUTH_JWT_PUBLIC_KEY'

/**
 * `accepted` — cookie présent ET (signature valide OU vérification indisponible).
 * `rejected` — cookie absent, malformé, expiré, ou signature invalide.
 */
export type AuthCookieVerdict = 'accepted' | 'rejected'

/** Algorithme d'import/vérification WebCrypto correspondant à `alg: RS256` (RFC 7518 §3.3). */
const RS256_PARAMS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

/**
 * Cache d'import de clé, indexé par le matériel brut. `crypto.subtle.importKey` est asynchrone
 * et serait sinon rejoué à CHAQUE navigation vers une route protégée. La clé de cache est la
 * chaîne de configuration elle-même : changer la variable d'environnement invalide l'entrée
 * sans logique d'éviction. `null` mémorise aussi les clés illisibles (pas de retry en boucle).
 */
const keyCache = new Map<string, Promise<CryptoKey | null>>()

/**
 * Mémorise qu'on a déjà crié « clé illisible ». Le middleware s'exécute sur chaque navigation
 * vers une route protégée : sans ce verrou, l'anomalie produirait une ligne de log par requête.
 */
let unreadableKeyWarned = false

/** Idem pour « clé absente en production » (signalisation ajoutée à la revue S50, 2e cycle). */
let missingKeyWarned = false

/**
 * Signale UNE FOIS une clé publique ABSENTE **en production uniquement**.
 *
 * ⚠ Correction d'une signalisation INVERSÉE (revue S50, 2e cycle) : jusqu'ici seul le cas RARE
 * (variable présente mais illisible) criait, tandis que le mode de panne le PLUS PROBABLE — la
 * variable simplement oubliée au premier déploiement — restait totalement muet. Aucun garde-fou
 * frontend n'impose ces variables et aucune étape de déploiement ne les vérifie : le seul
 * symptôme d'un #323 intégralement inerte était l'ABSENCE d'un avertissement.
 *
 * Le silence reste le comportement voulu hors production : en dev et en test, aucune clé n'est
 * configurée (le dépôt est PUBLIC, rien n'y est committé) — crier à chaque boot local rendrait
 * le message invisible par habitude, et polluerait la sortie des suites de tests.
 *
 * Enveloppé et non levant, même raison que `warnUnreadableKeyOnce` (BUG-S45-001).
 */
function warnMissingKeyInProductionOnce(): void {
  if (missingKeyWarned) return
  if (process.env.NODE_ENV !== 'production') return
  missingKeyWarned = true

  try {
    console.warn(
      `[auth-token-verify] ${AUTH_PUBLIC_KEY_ENV_VAR} n’est PAS définie en production. La ` +
        'vérification de signature RS256 du cookie `jwt` (#323) est INACTIVE : la garde du ' +
        'middleware retombe sur la seule présence du cookie (comportement d’avant #323), donc ' +
        'un cookie forgé passe la garde. Le backend reste seul juge et continue de refuser les ' +
        'jetons invalides — ce n’est pas une brèche d’autorisation, mais la protection attendue ' +
        'n’existe pas. Poser la clé PUBLIQUE SPKI Base64 journalisée au boot du backend ' +
        '(`JwtService`), APPAIRÉE à la JWT_PRIVATE_KEY en service.',
    )
  } catch {
    // Journaliser est un confort d'exploitation, jamais une condition de service.
  }
}

/**
 * Signale UNE FOIS une clé publique configurée mais inexploitable.
 *
 * ⚠ Tout est enveloppé : un `console` absent ou monkey-patché sur un runtime exotique ne doit
 * pas transformer un dégradé en 500 sur toutes les routes protégées (BUG-S45-001). Le verrou est
 * posé AVANT l'appel, pour qu'un `console.warn` qui lève ne rejoue pas à chaque requête.
 */
function warnUnreadableKeyOnce(): void {
  if (unreadableKeyWarned) return
  unreadableKeyWarned = true

  try {
    console.warn(
      `[auth-token-verify] ${AUTH_PUBLIC_KEY_ENV_VAR} est définie mais INEXPLOITABLE ` +
        '(Base64/SPKI invalide, clé tronquée, ou algorithme non RSA). La vérification de ' +
        'signature du cookie `jwt` est DÉSACTIVÉE : la garde du middleware retombe sur la seule ' +
        'présence du cookie, donc un cookie forgé passe. Le backend continue de refuser les ' +
        'jetons invalides — ce n’est pas une brèche d’autorisation, mais la configuration est ' +
        'à corriger. Valeur attendue : la sortie de `JwtService.getPublicKeySpkiBase64()` ' +
        '(SPKI Base64, armure PEM tolérée). La valeur n’est PAS journalisée.',
    )
  } catch {
    // Journaliser est un confort d'exploitation, jamais une condition de service.
  }
}

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

/**
 * Décode le corps SPKI (DER) de la clé publique. Accepte le Base64 nu comme un PEM complet
 * collé tel quel (armure + retours à la ligne) — l'ergonomie évite la classe d'erreur
 * « la clé est bonne mais le format ne passe pas », qui produirait un dégradé silencieux.
 */
function decodeSpki(raw: string): Uint8Array | null {
  const body = raw.replace(/-----(BEGIN|END)[^-]*-----/g, '').replace(/\s/g, '')
  if (body.length === 0) return null
  return decodeBase64Url(body)
}

function importVerificationKey(raw: string): Promise<CryptoKey | null> {
  const cached = keyCache.get(raw)
  if (cached !== undefined) return cached

  const imported = (async (): Promise<CryptoKey | null> => {
    const spki = decodeSpki(raw)
    if (spki === null) return null
    try {
      // `spki` = X.509 SubjectPublicKeyInfo, exactement ce que produit
      // `JwtService.getPublicKeySpkiBase64()` côté backend (#323).
      return await crypto.subtle.importKey('spki', spki as BufferSource, RS256_PARAMS, false, [
        'verify',
      ])
    } catch {
      return null
    }
  })()

  keyCache.set(raw, imported)
  return imported
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
 * décodage, pour que `isTokenAuthentic` ne porte plus que les vérifications.
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
 * Vérifie signature + fenêtre temporelle d'un JWT RS256.
 *
 * `nowMs` est injectable pour rendre les tests d'expiration déterministes (même parti pris que
 * le `Clock` de `ExportTokenService` côté backend).
 */
async function isTokenAuthentic(token: string, key: CryptoKey, nowMs: number): Promise<boolean> {
  const parts = parseJwtParts(token)
  if (parts === null) return false

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

  if (!isWithinTimeWindow(parts.claims, nowMs)) return false

  try {
    const signed = new TextEncoder().encode(parts.signingInput)
    return await crypto.subtle.verify(
      RS256_PARAMS.name,
      key,
      parts.signature as BufferSource,
      signed as BufferSource,
    )
  } catch {
    return false
  }
}

/**
 * Verdict de la garde sur le cookie `jwt`.
 *
 * @param token valeur du cookie `jwt` (`undefined` = cookie absent)
 * @param rawPublicKey contenu de `AUTH_JWT_PUBLIC_KEY` (`undefined` = vérification désactivée)
 * @param nowMs horloge injectable (défaut : `Date.now()`)
 */
export async function verifyAuthCookie(
  token: string | undefined,
  rawPublicKey: string | undefined,
  nowMs: number = Date.now(),
): Promise<AuthCookieVerdict> {
  if (token === undefined || token.length === 0) return 'rejected'

  // Vérification non configurée → on retombe sur le contrat de #302 (présence seule).
  // Muet en dev/test, signalé UNE fois en production (cf. `warnMissingKeyInProductionOnce`).
  if (rawPublicKey === undefined || rawPublicKey.trim().length === 0) {
    warnMissingKeyInProductionOnce()
    return 'accepted'
  }

  try {
    const key = await importVerificationKey(rawPublicKey)
    // Clé configurée mais ILLISIBLE : dégradé plutôt que déconnexion globale (cf. en-tête).
    // On dégrade toujours, mais plus en SILENCE : la variable est non vide (testé ci-dessus),
    // donc quelqu'un a voulu activer la vérification et elle ne s'active pas.
    if (key === null) {
      warnUnreadableKeyOnce()
      return 'accepted'
    }

    return (await isTokenAuthentic(token, key, nowMs)) ? 'accepted' : 'rejected'
  } catch {
    // Filet ultime : `crypto.subtle` indisponible, runtime exotique… jamais de 500.
    return 'accepted'
  }
}

/**
 * Vide le cache d'import de clés ET le verrou d'avertissement. Réservé aux tests (isolation
 * entre cas : sans la remise à zéro du verrou, un seul cas pourrait observer le `console.warn`).
 */
export function resetVerificationKeyCache(): void {
  keyCache.clear()
  unreadableKeyWarned = false
  missingKeyWarned = false
}
