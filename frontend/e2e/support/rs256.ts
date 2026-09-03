import crypto from 'node:crypto'

/**
 * Outillage de forge/vérification de jetons RS256 pour `auth-signature.spec.ts` (#323).
 *
 * POURQUOI DU CODE DE FORGE ICI — la vérification de signature du middleware Edge ne peut
 * être prouvée en E2E qu'en lui présentant des jetons qu'aucun parcours utilisateur ne peut
 * produire : signature altérée, `alg: none`, jeton expiré mais VALIDEMENT signé. Ces trois
 * cas exigent de manipuler le jeton octet par octet, ce que ni l'UI ni le backend n'offrent.
 *
 * ⚠ AUCUNE CLÉ N'EST EMBARQUÉE ICI. Le dépôt est PUBLIC. Le matériel de signature est lu
 * dans l'environnement du process Playwright, où il doit être injecté à l'exécution :
 *
 *   - `AUTH_JWT_PUBLIC_KEY` — la clé publique SPKI Base64 de la paire jetable, MATÉRIEL DE
 *     TEST uniquement. ⚠ #358 : le SERVEUR Next ne lit PLUS cette variable — il découvre la
 *     clé sur le JWKS du backend (`AUTH_JWKS_URL`). Elle reste indispensable ICI, parce que
 *     forger un HS256 « signé avec la clé publique » et vérifier un jeton authentique
 *     exigent d'avoir ce matériel sous la main dans le process de test.
 *     Sa présence est ce qui déclenche la spec ; son absence la fait SKIPPER.
 *   - `E2E_JWT_PRIVATE_KEY` — la clé privée PKCS#8 Base64 appairée, celle passée au backend
 *     via `JWT_PRIVATE_KEY`. Requise UNIQUEMENT pour le cas « jeton expiré » (seul cas qui
 *     exige de produire une signature authentique). Facultative : sans elle, ce cas skippe.
 *
 * La paire attendue est JETABLE, générée au lancement de la stack (cf. l'en-tête de
 * `auth-signature.spec.ts`) — jamais une clé de production, jamais une clé committée.
 */

/** Clé PUBLIQUE de vérification (SPKI Base64), telle que servie au middleware Next. */
export const PUBLIC_KEY_SPKI_BASE64 = (process.env.AUTH_JWT_PUBLIC_KEY ?? '').trim()

/** Clé PRIVÉE de signature (PKCS#8 Base64), appairée à la précédente. Facultative. */
export const PRIVATE_KEY_PKCS8_BASE64 = (process.env.E2E_JWT_PRIVATE_KEY ?? '').trim()

/**
 * La spec de signature n'a de sens que si le serveur Next tourne en mode VÉRIFIANT.
 *
 * ⚠ #358 — cette variable est une procuration ENCORE PLUS INDIRECTE qu'avant : le serveur
 * n'est plus gouverné par elle mais par `AUTH_JWKS_URL` (et par la joignabilité du JWKS).
 * Les poser ensemble reste la convention du job CI et de la recette locale, mais rien ne le
 * garantit. C'est pourquoi le PREMIER cas de `auth-signature.spec.ts` (« garde anti-dégradé »)
 * SONDE réellement le serveur : c'est lui l'oracle, pas cette constante.
 */
export const SIGNATURE_VERIFICATION_CONFIGURED = PUBLIC_KEY_SPKI_BASE64.length > 0

/** La forge d'un jeton authentiquement signé (cas « expiré ») exige la clé privée. */
export const SIGNING_KEY_AVAILABLE = PRIVATE_KEY_PKCS8_BASE64.length > 0

/** Claims minimales manipulées ici. Les autres sont recopiées telles quelles. */
export type JwtClaims = Record<string, unknown>

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function fromBase64Url(segment: string): Buffer {
  return Buffer.from(segment, 'base64url')
}

/** Découpe un JWT compact. Lève si la forme n'est pas `header.payload.signature`. */
function splitToken(token: string): { header: string; payload: string; signature: string } {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error(`jeton non conforme (attendu 3 segments, reçu ${parts.length})`)
  const [header, payload, signature] = parts
  return { header, payload, signature }
}

/** En-tête décodé d'un JWT (pour affirmer `alg: RS256` sur le jeton RÉEL du backend). */
export function decodeHeader(token: string): Record<string, unknown> {
  return JSON.parse(fromBase64Url(splitToken(token).header).toString('utf8')) as Record<
    string,
    unknown
  >
}

/** Claims décodées d'un JWT (aucune vérification : usage strictement descriptif). */
export function decodeClaims(token: string): JwtClaims {
  return JSON.parse(fromBase64Url(splitToken(token).payload).toString('utf8')) as JwtClaims
}

/**
 * Vérifie la signature RS256 d'un jeton avec `AUTH_JWT_PUBLIC_KEY`.
 *
 * C'est l'assertion CROSS-SYSTEM du cas nominal : elle prouve que le jeton émis par le
 * backend Spring est bien vérifiable avec la clé publique publiée au frontend. Sans elle,
 * un run « vert » pourrait tourner sur une paire dépareillée sans que rien ne le signale.
 */
export function verifyRs256(token: string): boolean {
  const { header, payload, signature } = splitToken(token)
  const key = crypto.createPublicKey({
    key: Buffer.from(PUBLIC_KEY_SPKI_BASE64, 'base64'),
    format: 'der',
    type: 'spki',
  })
  return crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`, 'utf8'),
    key,
    fromBase64Url(signature),
  )
}

/**
 * URL du backend, telle que joignable depuis le PROCESS DE TEST (et non depuis le navigateur).
 *
 * Sert au seul contrôle du document JWKS (#358) : celui-ci vit sur `/.well-known/jwks.json`,
 * HORS du préfixe `/api`, donc il n'est PAS relayé par le rewrite same-origin de Next — on
 * l'interroge donc en direct. Le défaut vaut pour le job CI comme pour la recette locale
 * documentée en tête de `auth-signature.spec.ts` ; il est délibérément NON VIDE afin que le
 * contrôle s'exécute vraiment au lieu de skipper en silence (un test qui skippe ne prouve rien).
 */
export const BACKEND_ORIGIN = (process.env.E2E_BACKEND_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  '',
)

/** Chemin canonique du JWKS — miroir de `JwksController.JWKS_PATH` côté backend. */
export const JWKS_PATH = '/.well-known/jwks.json'

/**
 * Recompose la clé publique SPKI Base64 à partir des paramètres JWK `n` et `e`.
 *
 * C'est l'assertion CROSS-SYSTEM de #358 : elle prouve que la clé PUBLIÉE par le backend est
 * bien celle de la paire avec laquelle il SIGNE (comparaison à `PUBLIC_KEY_SPKI_BASE64`, la
 * moitié publique de la paire jetable injectée au backend). Sans elle, un JWKS bien formé mais
 * portant une AUTRE clé passerait inaperçu — le middleware rejetterait alors tous les cookies
 * et le diagnostic accuserait le middleware plutôt que la publication.
 */
export function spkiBase64FromJwk(n: string, e: string): string {
  const key = crypto.createPublicKey({ key: { kty: 'RSA', n, e }, format: 'jwk' })
  return key.export({ type: 'spki', format: 'der' }).toString('base64')
}

/**
 * Altère la SIGNATURE seule : en-tête et charge utile restent ceux du jeton authentique.
 *
 * On mute le PREMIER caractère (et non le dernier) : les derniers bits d'une signature RSA
 * peuvent tomber dans le bourrage base64url et une mutation en fin de chaîne risque de
 * produire des octets identiques après décodage — le test passerait alors pour la mauvaise
 * raison. La substitution est stable (`A` <-> `B`), donc le jeton forgé est déterministe.
 */
export function tamperSignature(token: string): string {
  const { header, payload, signature } = splitToken(token)
  const first = signature[0] === 'A' ? 'B' : 'A'
  const tampered = `${first}${signature.slice(1)}`
  if (tampered === signature) throw new Error('mutation de signature sans effet')
  return `${header}.${payload}.${tampered}`
}

/**
 * Forge un jeton `alg: none` (signature vide) portant les claims fournies.
 *
 * C'est l'attaque de confusion d'algorithme la plus élémentaire : une bibliothèque qui
 * choisit l'algorithme de vérification d'après l'en-tête FOURNI PAR LE PORTEUR accepte ce
 * jeton sans aucune clé. `auth-token-verify.ts` exige `alg === 'RS256'` avant de toucher à
 * la signature ; ce cas ancre cette barrière dans le runtime réel.
 */
export function forgeAlgNone(claims: JwtClaims): string {
  const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = toBase64Url(JSON.stringify(claims))
  return `${header}.${payload}.`
}

/**
 * Forge un jeton HS256 dont le secret HMAC est le matériel de la clé PUBLIQUE.
 *
 * Seconde forme de confusion d'algorithme, plus vicieuse que `alg: none` : la clé publique
 * étant publique par construction, un vérifieur qui accepterait `HS256` laisserait
 * n'importe qui frapper des identités valides. Ce cas est gratuit à écrire et couvre la
 * moitié de la classe d'attaque que `alg: none` seul laisserait ouverte.
 */
export function forgeHs256(claims: JwtClaims): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = toBase64Url(JSON.stringify(claims))
  const mac = crypto
    .createHmac('sha256', Buffer.from(PUBLIC_KEY_SPKI_BASE64, 'base64'))
    .update(`${header}.${payload}`)
    .digest()
  return `${header}.${payload}.${toBase64Url(mac)}`
}

/**
 * Signe RÉELLEMENT un jeton RS256 avec la clé privée appairée au backend.
 *
 * Seul moyen d'exercer l'EXPIRATION sans la confondre avec un rejet de signature : bidouiller
 * l'`exp` d'un jeton authentique casserait sa signature, et le middleware le rejetterait alors
 * pour la mauvaise raison — le test serait vert sans rien prouver sur la fenêtre temporelle.
 */
export function signRs256(claims: JwtClaims): string {
  if (!SIGNING_KEY_AVAILABLE) throw new Error('E2E_JWT_PRIVATE_KEY absente : signature impossible')
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = toBase64Url(JSON.stringify(claims))
  const key = crypto.createPrivateKey({
    key: Buffer.from(PRIVATE_KEY_PKCS8_BASE64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`, 'utf8'), key)
  return `${header}.${payload}.${toBase64Url(signature)}`
}
