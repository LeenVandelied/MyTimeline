/**
 * #358 — DÉCOUVERTE de la clé publique de vérification RS256 auprès du backend (JWKS),
 * en remplacement de la variable d'environnement `AUTH_JWT_PUBLIC_KEY` recopiée à la main.
 *
 * ## Pourquoi
 *
 * Jusqu'ici la clé publique dérivée de `JWT_PRIVATE_KEY` était RECOPIÉE dans l'environnement
 * du frontend. Deux pannes en découlaient, toutes deux muettes :
 *
 * 1. la rotation n'était pas atomique — il existait une fenêtre où backend et frontend ne
 *    parlaient plus de la même clé ;
 * 2. une clé bien formée mais DÉPAREILLÉE faisait échouer 100 % des vérifications, donc
 *    renvoyait tout utilisateur connecté vers `/login`, sans le moindre signal exploitable.
 *
 * En découvrant la clé auprès de la SOURCE DE VÉRITÉ (le backend qui signe), les deux
 * disparaissent par construction : il n'y a plus de seconde configuration qui puisse diverger.
 *
 * ## Contraintes tenues
 *
 * - **Runtime Edge** : uniquement `fetch`, `AbortController`, `crypto.subtle`, `setTimeout`.
 *   AUCUNE dépendance npm ajoutée (ni `jose`, ni `jsonwebtoken`), aucun import Node.
 * - **Ne LÈVE JAMAIS.** Une exception non catchée dans `middleware.ts` produit un 500 sur
 *   TOUTES les routes protégées (BUG-S45-001). Toute fonction exportée ici renvoie `null`
 *   plutôt que de propager.
 * - **Jamais une découverte par requête.** Le middleware s'exécute sur chaque navigation :
 *   un `fetch` par requête serait inacceptable en Edge, et transformerait une panne du
 *   backend en tempête de requêtes. D'où le cache TTL, le cache NÉGATIF, la déduplication
 *   des appels concurrents et le garde-fou anti-tempête sur le rafraîchissement forcé.
 * - **Timeout dur** sur le `fetch` : un backend lent ne doit pas pendre l'Edge.
 *
 * ## Portée du cache
 *
 * L'état ci-dessous est un état de MODULE, donc propre à chaque isolat Edge. Plusieurs
 * instances peuvent donc détenir des vues différentes du JWKS pendant au plus un TTL — sans
 * conséquence : la seule décision prise ici est « accepter ou rediriger vers /login », et
 * `JwtFilter` reste le seul juge côté backend.
 */

/** Nom de la variable d'environnement portant l'URL du JWKS (documentation / tests). */
export const AUTH_JWKS_URL_ENV_VAR = 'AUTH_JWKS_URL'

/** Algorithme d'import/vérification WebCrypto correspondant à `alg: RS256` (RFC 7518 §3.3). */
export const RS256_PARAMS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

/**
 * Fraîcheur d'un JWKS récupéré avec succès. 10 min est un compromis : assez long pour que le
 * coût réseau soit négligeable devant le trafic, assez court pour qu'une rotation soit
 * absorbée même si le chemin de rafraîchissement forcé (ci-dessous) ne s'arme pas.
 */
export const JWKS_SUCCESS_TTL_MS = 10 * 60 * 1000

/**
 * Fraîcheur d'un ÉCHEC (cache négatif). Sans lui, un backend indisponible ferait partir un
 * `fetch` par navigation : le frontend amplifierait la panne au lieu de la traverser.
 * Volontairement court — on veut se rétablir vite dès que le backend revient.
 */
export const JWKS_FAILURE_TTL_MS = 30 * 1000

/**
 * Délai minimal entre deux rafraîchissements FORCÉS (ceux déclenchés par une signature qui ne
 * s'explique par aucune clé connue).
 *
 * ⚠ C'EST LE GARDE-FOU ANTI-TEMPÊTE. Sans lui, un attaquant envoyant des cookies forgés
 * déclencherait un `fetch` vers le backend à chaque requête : un DoS amplifié, monté par nos
 * soins, contre notre propre API. Avec lui, le coût est plafonné à un appel par minute et par
 * isolat, quel que soit le volume de jetons invalides.
 */
export const JWKS_REFRESH_COOLDOWN_MS = 60 * 1000

/** Plafond de temps accordé au backend. Au-delà : mode dégradé, jamais une requête pendue. */
export const JWKS_FETCH_TIMEOUT_MS = 2000

interface JwksCacheEntry {
  readonly url: string
  /** `null` = découverte impossible (URL injoignable, réponse illisible) — cache NÉGATIF. */
  readonly keys: readonly CryptoKey[] | null
  readonly expiresAt: number
}

let cacheEntry: JwksCacheEntry | null = null

/**
 * Déduplication des appels concurrents. Le middleware traite plusieurs requêtes en parallèle :
 * sans cela, N navigations simultanées sur un cache froid partiraient en N `fetch`.
 */
let inFlight: { readonly url: string; readonly promise: Promise<JwksCacheEntry> } | null = null

/** Horodatage du dernier rafraîchissement FORCÉ, ancre du garde-fou anti-tempête. */
let lastForcedRefreshAt = 0

/** Verrous de signalisation one-shot (le middleware tourne sur CHAQUE navigation). */
let notConfiguredWarned = false
let unreachableWarned = false

/**
 * Signale UNE FOIS, **en production uniquement**, que l'URL du JWKS n'est pas exploitable.
 *
 * ⚠ Ce warn est le RECIBLAGE de celui de #323 (« clé publique absente »), pas un ajout : la
 * variable a changé, le mode de panne le plus probable reste le même — une variable oubliée au
 * premier déploiement, qui rend la vérification de signature intégralement inerte SANS le
 * moindre symptôme. Le seul signal disponible est ce message.
 *
 * Silencieux hors production : en dev et en test aucune URL n'est configurée par défaut, et
 * crier à chaque boot local rendrait le message invisible par habitude.
 */
function warnJwksNotConfiguredInProductionOnce(): void {
  if (notConfiguredWarned) return
  if (process.env.NODE_ENV !== 'production') return
  notConfiguredWarned = true

  try {
    console.warn(
      `[auth-jwks] ${AUTH_JWKS_URL_ENV_VAR} n’est pas définie (ou n’est pas une URL http(s) ` +
        'valide) en production. La vérification de signature RS256 du cookie `jwt` est ' +
        'INACTIVE : la garde du middleware retombe sur la seule PRÉSENCE du cookie, donc un ' +
        'cookie forgé la passe. Le backend reste seul juge et continue de refuser les jetons ' +
        'invalides — ce n’est pas une brèche d’autorisation, mais la protection attendue ' +
        'n’existe pas. Poser l’URL du JWKS du backend, ex. ' +
        'https://api.exemple/.well-known/jwks.json',
    )
  } catch {
    // Journaliser est un confort d'exploitation, jamais une condition de service.
  }
}

/**
 * Signale UNE FOIS, en production, un JWKS configuré mais INEXPLOITABLE (backend injoignable,
 * timeout, statut non-2xx, document illisible).
 *
 * C'est le pendant du warn « clé illisible » de #323, reciblé sur le nouveau mode de panne :
 * quelqu'un a explicitement activé la vérification, elle ne s'active pas, et sans ce message
 * rien dans le pipeline ne peut le détecter (un E2E qui documente le dégradé reste VERT).
 */
function warnJwksUnreachableInProductionOnce(): void {
  if (unreachableWarned) return
  if (process.env.NODE_ENV !== 'production') return
  unreachableWarned = true

  try {
    console.warn(
      `[auth-jwks] ${AUTH_JWKS_URL_ENV_VAR} est définie mais le JWKS n’a pas pu être récupéré ` +
        '(backend injoignable, timeout, statut non-2xx, ou document sans clé RSA exploitable). ' +
        'La vérification de signature du cookie `jwt` est DÉSACTIVÉE : la garde retombe sur la ' +
        'seule présence du cookie. Le backend continue de refuser les jetons invalides. ' +
        'Vérifier que l’URL est joignable DEPUIS LE SERVEUR Next (et non depuis le navigateur) ' +
        'et que le chemin /.well-known/jwks.json est bien public côté backend.',
    )
  } catch {
    // Idem.
  }
}

/**
 * Valide l'URL configurée. `null` = découverte désactivée (mode dégradé assumé).
 *
 * Le protocole est restreint à http(s) : `file:`, `data:` et consorts n'ont aucun sens ici et
 * ouvriraient une lecture de ressource locale sur une simple faute de configuration.
 */
export function normalizeJwksUrl(raw: string | undefined): string | null {
  if (raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

/** Importe une entrée JWK RSA en `CryptoKey` de vérification. `null` si inexploitable. */
async function importJwk(entry: unknown): Promise<CryptoKey | null> {
  if (typeof entry !== 'object' || entry === null) return null
  const jwk = entry as { kty?: unknown; alg?: unknown; use?: unknown; n?: unknown; e?: unknown }

  // On ne consomme QUE des clés RSA de signature. `alg`/`use` sont facultatifs dans un JWKS :
  // absents, on accepte ; présents et contradictoires, on ignore la clé plutôt que de tenter
  // un import qui réussirait avec le mauvais algorithme.
  if (jwk.kty !== 'RSA') return null
  if (jwk.alg !== undefined && jwk.alg !== 'RS256') return null
  if (jwk.use !== undefined && jwk.use !== 'sig') return null
  if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') return null

  try {
    return await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      RS256_PARAMS,
      false,
      ['verify'],
    )
  } catch {
    return null
  }
}

/** Convertit un document JWKS en clés importées. `null` si aucune clé exploitable. */
async function importJwks(payload: unknown): Promise<readonly CryptoKey[] | null> {
  if (typeof payload !== 'object' || payload === null) return null
  const keys = (payload as { keys?: unknown }).keys
  if (!Array.isArray(keys)) return null

  const imported: CryptoKey[] = []
  for (const entry of keys) {
    const key = await importJwk(entry)
    if (key !== null) imported.push(key)
  }
  // Un JWKS vide (ou dont aucune entrée n'est exploitable) est un ÉCHEC, pas un succès à zéro
  // clé : le traiter comme un succès ferait rejeter 100 % des cookies pendant tout le TTL.
  return imported.length > 0 ? imported : null
}

/**
 * Récupère et importe le JWKS. Ne lève jamais ; `null` couvre tous les échecs.
 *
 * `cache: 'no-store'` : le cache de `fetch` doublonnerait le nôtre, avec une politique qu'on
 * ne contrôle pas — or c'est précisément la fraîcheur de cette valeur qui décide si une
 * rotation de clé déconnecte les utilisateurs ou non.
 */
async function fetchJwks(url: string): Promise<readonly CryptoKey[] | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      try {
        controller.abort()
      } catch {
        // Un runtime sans abort exploitable ne doit pas faire échouer la découverte.
      }
    }, JWKS_FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })
      if (!response.ok) return null
      return await importJwks((await response.json()) as unknown)
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

/** Lance (ou rejoint) une découverte, et mémorise le résultat — succès COMME échec. */
function load(url: string, nowMs: number): Promise<readonly CryptoKey[] | null> {
  if (inFlight !== null && inFlight.url === url) {
    return inFlight.promise.then((entry) => entry.keys)
  }

  const promise = (async (): Promise<JwksCacheEntry> => {
    const keys = await fetchJwks(url)
    const entry: JwksCacheEntry = {
      url,
      keys,
      expiresAt: nowMs + (keys === null ? JWKS_FAILURE_TTL_MS : JWKS_SUCCESS_TTL_MS),
    }
    cacheEntry = entry
    return entry
  })()

  const pending = { url, promise }
  inFlight = pending
  return promise
    .finally(() => {
      if (inFlight === pending) inFlight = null
    })
    .then((entry) => entry.keys)
}

/**
 * Clés de vérification courantes : cache si frais, découverte sinon.
 *
 * @param url URL normalisée du JWKS (cf. {@link normalizeJwksUrl})
 * @param nowMs horloge injectable — les TTL sont testables sans attendre réellement
 */
export async function getVerificationKeys(
  url: string,
  nowMs: number,
): Promise<readonly CryptoKey[] | null> {
  if (cacheEntry !== null && cacheEntry.url === url && cacheEntry.expiresAt > nowMs) {
    return cacheEntry.keys
  }
  return await load(url, nowMs)
}

/**
 * Rafraîchissement FORCÉ, ignorant le cache — chemin de la ROTATION DE CLÉ.
 *
 * Appelé uniquement quand un jeton structurellement valide et NON expiré ne se vérifie avec
 * aucune clé connue : soit la clé a tourné, soit le jeton est forgé. Les deux hypothèses sont
 * indiscernables ici, d'où le garde-fou : au plus un appel par
 * {@link JWKS_REFRESH_COOLDOWN_MS}, quel que soit le volume de jetons invalides reçus.
 *
 * @returns les clés fraîches, ou `null` si le garde-fou a bloqué l'appel (l'appelant doit
 *          alors s'en tenir à son verdict de rejet)
 */
export async function refreshVerificationKeys(
  url: string,
  nowMs: number,
): Promise<readonly CryptoKey[] | null> {
  if (nowMs - lastForcedRefreshAt < JWKS_REFRESH_COOLDOWN_MS) return null
  lastForcedRefreshAt = nowMs
  return await load(url, nowMs)
}

/** Signalisation des deux modes dégradés — appelée par `auth-token-verify.ts`. */
export function signalJwksNotConfigured(): void {
  warnJwksNotConfiguredInProductionOnce()
}

/** Idem, pour un JWKS configuré mais inexploitable. */
export function signalJwksUnreachable(): void {
  warnJwksUnreachableInProductionOnce()
}

/**
 * Vide le cache, la déduplication, le garde-fou anti-tempête ET les verrous d'avertissement.
 * Réservé aux tests : sans cette remise à zéro, un cas contaminerait le suivant (un seul cas
 * pourrait observer les `console.warn`, et une clé chargée resterait active dans les cas qui
 * testent le dégradé).
 */
export function resetJwksCache(): void {
  cacheEntry = null
  inFlight = null
  lastForcedRefreshAt = 0
  notConfiguredWarned = false
  unreachableWarned = false
}
