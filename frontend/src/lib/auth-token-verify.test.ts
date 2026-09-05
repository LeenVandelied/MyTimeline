// @vitest-environment node

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_JWKS_URL_ENV_VAR, resetJwksCache } from './auth-jwks'
import { verifyAuthCookie } from './auth-token-verify'

/**
 * #323 / #358 — vérification RS256 du cookie `jwt` avec la seule clé publique, celle-ci étant
 * désormais DÉCOUVERTE auprès du backend (JWKS) et non plus lue dans `AUTH_JWT_PUBLIC_KEY`.
 *
 * Environnement `node` (et non jsdom) : jsdom n'implémente pas `crypto.subtle`.
 *
 * ⚠ AUCUNE clé n'est committée — les paires de test sont générées dans le `beforeAll` (le dépôt
 * est PUBLIC). Les jetons sont signés ICI, à la main, pour que le test exerce le VRAI format
 * JOSE plutôt qu'un mock du module de vérification.
 *
 * ⚠ Ce qui est mocké, c'est le SEUL `fetch` du JWKS — pas la cryptographie, pas le parsing.
 * Le document servi est un vrai JWK exporté par WebCrypto, donc l'import est exercé pour de
 * bon. Ce que ce fichier ne peut PAS prouver : que la découverte fonctionne dans le runtime
 * Edge réel, contre un vrai backend. C'est l'objet de `e2e/auth-signature.spec.ts` (passe 2 de
 * la CI) et de `JwksEndpointIntegrationTest` côté backend.
 */

const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

const JWKS_URL = 'http://backend.test/.well-known/jwks.json'

let keyPair: CryptoKeyPair
let publicJwk: JsonWebKey
/** Seconde paire, pour modéliser un jeton signé par une clé étrangère / une ROTATION. */
let foreignKeyPair: CryptoKeyPair
let foreignPublicJwk: JsonWebKey

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0)

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function encodeSegment(value: object): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

/** Fabrique un JWT complet, signature comprise, avec un en-tête et des claims arbitraires. */
async function makeToken(
  options: {
    header?: Record<string, unknown>
    claims?: Record<string, unknown>
    signWith?: CryptoKey
    /** Signature volontairement corrompue (bit flip) — modélise l'altération en transit. */
    tamper?: boolean
  } = {},
): Promise<string> {
  const header = options.header ?? { alg: 'RS256', typ: 'JWT' }
  const claims = options.claims ?? { sub: 'alice', exp: Math.floor(NOW / 1000) + 3600 }
  const signingInput = `${encodeSegment(header)}.${encodeSegment(claims)}`

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      RS256.name,
      options.signWith ?? keyPair.privateKey,
      new TextEncoder().encode(signingInput),
    ),
  )
  if (options.tamper) signature[0] ^= 0xff

  return `${signingInput}.${base64Url(signature)}`
}

/**
 * Réduit un JWK exporté par WebCrypto aux SEULS paramètres qu'un JWKS publie réellement
 * (`kty`, `n`, `e`, plus `alg`/`use` déclaratifs) — l'export WebCrypto porte aussi `key_ops`
 * et `ext`, absents du document du backend. Servir le JWK brut rendrait le test plus permissif
 * que la réalité.
 */
function asPublishedJwk(jwk: JsonWebKey, extra: Record<string, unknown> = {}): unknown {
  return { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig', kid: 'test-kid', ...extra }
}

/** Installe un `fetch` qui sert le document JWKS donné. Renvoie le mock pour compter les appels. */
function stubJwksResponse(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Raccourci : un JWKS ne portant que la clé nominale. */
function stubNominalJwks(): ReturnType<typeof vi.fn> {
  return stubJwksResponse({ keys: [asPublishedJwk(publicJwk)] })
}

beforeAll(async () => {
  const params = { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }
  keyPair = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
  foreignKeyPair = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
  publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  foreignPublicJwk = await crypto.subtle.exportKey('jwk', foreignKeyPair.publicKey)
})

beforeEach(() => {
  // Cache JWKS, déduplication, garde-fou anti-tempête et verrous de warn sont GLOBAUX au
  // module : sans reset, un cas contaminerait le suivant.
  resetJwksCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyAuthCookie — jeton authentique', () => {
  it('accepte un jeton RS256 signé par la clé publiée au JWKS', async () => {
    stubNominalJwks()

    await expect(verifyAuthCookie(await makeToken(), JWKS_URL, NOW)).resolves.toBe('accepted')
  })

  it('accepte une clé publiée sans les champs facultatifs alg/use', async () => {
    // Un JWKS conforme peut les omettre : les exiger casserait la découverte sur un backend
    // parfaitement valide.
    stubJwksResponse({ keys: [{ kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e }] })

    await expect(verifyAuthCookie(await makeToken(), JWKS_URL, NOW)).resolves.toBe('accepted')
  })

  it('accepte quand la BONNE clé n’est pas la première du JWKS (rotation à recouvrement)', async () => {
    stubJwksResponse({
      keys: [asPublishedJwk(foreignPublicJwk), asPublishedJwk(publicJwk)],
    })

    await expect(verifyAuthCookie(await makeToken(), JWKS_URL, NOW)).resolves.toBe('accepted')
  })
})

describe('verifyAuthCookie — rejets', () => {
  beforeEach(() => {
    stubNominalJwks()
  })

  it('rejette un cookie absent ou vide', async () => {
    await expect(verifyAuthCookie(undefined, JWKS_URL, NOW)).resolves.toBe('rejected')
    await expect(verifyAuthCookie('', JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette une signature altérée', async () => {
    await expect(verifyAuthCookie(await makeToken({ tamper: true }), JWKS_URL, NOW)).resolves.toBe(
      'rejected',
    )
  })

  it('rejette un jeton signé par une AUTRE clé privée', async () => {
    const foreign = await makeToken({ signWith: foreignKeyPair.privateKey })

    await expect(verifyAuthCookie(foreign, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton expiré', async () => {
    const expired = await makeToken({ claims: { sub: 'alice', exp: Math.floor(NOW / 1000) - 1 } })

    await expect(verifyAuthCookie(expired, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton SANS claim exp (sinon il serait éternel côté garde)', async () => {
    const eternal = await makeToken({ claims: { sub: 'alice' } })

    await expect(verifyAuthCookie(eternal, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton sans claim sub (n’identifie personne)', async () => {
    const anonymous = await makeToken({ claims: { exp: Math.floor(NOW / 1000) + 3600 } })

    await expect(verifyAuthCookie(anonymous, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton pas encore valide (nbf dans le futur)', async () => {
    const notYet = await makeToken({
      claims: { sub: 'alice', exp: Math.floor(NOW / 1000) + 3600, nbf: Math.floor(NOW / 1000) + 60 },
    })

    await expect(verifyAuthCookie(notYet, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un cookie qui n’est pas un JWT', async () => {
    await expect(verifyAuthCookie('ceci-n-est-pas-un-jwt', JWKS_URL, NOW)).resolves.toBe('rejected')
  })
})

describe('verifyAuthCookie — confusion d’algorithme', () => {
  beforeEach(() => {
    stubNominalJwks()
  })

  it('rejette alg:none, même avec une signature vide', async () => {
    const header = encodeSegment({ alg: 'none', typ: 'JWT' })
    const claims = encodeSegment({ sub: 'alice', exp: Math.floor(NOW / 1000) + 3600 })

    await expect(verifyAuthCookie(`${header}.${claims}.`, JWKS_URL, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton HS256 signé AVEC le matériel de la clé publique', async () => {
    // La clé publique est publique par construction : un vérifieur qui accepterait HS256
    // laisserait n'importe qui frapper des identités valides.
    const header = encodeSegment({ alg: 'HS256', typ: 'JWT' })
    const claims = encodeSegment({ sub: 'alice', exp: Math.floor(NOW / 1000) + 3600 })
    const secret = new TextEncoder().encode(String(publicJwk.n))
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const mac = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      new TextEncoder().encode(`${header}.${claims}`),
    )

    await expect(
      verifyAuthCookie(`${header}.${claims}.${base64Url(mac)}`, JWKS_URL, NOW),
    ).resolves.toBe('rejected')
  })

  it('rejette un en-tête annonçant RS512 (algo non émis par JwtService)', async () => {
    const forged = await makeToken({ header: { alg: 'RS512', typ: 'JWT' } })

    await expect(verifyAuthCookie(forged, JWKS_URL, NOW)).resolves.toBe('rejected')
  })
})

describe('verifyAuthCookie — dégradé (découverte impossible)', () => {
  /**
   * ⚠ CONTRAT DU DÉGRADÉ, INCHANGÉ PAR #358 : « présence seule » (#302). Un cookie qui n'est
   * même pas un JWT doit PASSER. Durcir ce mode en douce ferait diverger le comportement réel
   * de ce que documentent l'ADR-004, `e2e/auth-guard.spec.ts § DÉGRADÉ` et l'oracle de mode
   * du job CI `e2e`.
   */
  it('accepte tout cookie présent quand AUCUNE URL de JWKS n’est configurée', async () => {
    const fetchMock = stubNominalJwks()

    await expect(verifyAuthCookie('cookie-bidon', undefined, NOW)).resolves.toBe('accepted')
    await expect(verifyAuthCookie('cookie-bidon', '', NOW)).resolves.toBe('accepted')
    await expect(verifyAuthCookie('cookie-bidon', '   ', NOW)).resolves.toBe('accepted')

    expect(fetchMock, 'aucune découverte ne doit partir sans URL configurée').not.toHaveBeenCalled()
  })

  it('accepte tout cookie présent quand l’URL configurée n’est pas une URL http(s)', async () => {
    for (const raw of ['pas-une-url', 'file:///etc/passwd', 'ftp://x/jwks.json']) {
      resetJwksCache()
      await expect(verifyAuthCookie('cookie-bidon', raw, NOW)).resolves.toBe('accepted')
    }
  })

  it('DÉGRADE quand le backend est injoignable (fetch qui rejette)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )

    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')
  })

  it('DÉGRADE sur statut non-2xx et sur document sans clé exploitable', async () => {
    stubJwksResponse({ keys: [asPublishedJwk(publicJwk)] }, 503)
    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')

    resetJwksCache()
    stubJwksResponse({ keys: [] })
    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')

    resetJwksCache()
    stubJwksResponse({ keys: [{ kty: 'EC', crv: 'P-256' }] })
    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')

    resetJwksCache()
    stubJwksResponse({ pas: 'un jwks' })
    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')
  })

  it('DÉGRADE quand le backend dépasse le timeout (l’Edge ne doit jamais pendre)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      ),
    )

    await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')
  }, 10_000)

  it('ne LÈVE jamais, quelle que soit l’entrée (une exception = 500 sur toutes les routes)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('boom')
      }),
    )

    const verdicts = await Promise.all([
      verifyAuthCookie('...', JWKS_URL, NOW),
      verifyAuthCookie('a.b.c', JWKS_URL, NOW),
      verifyAuthCookie(' ￿', ' url-corrompue', NOW),
      verifyAuthCookie('%%%.%%%.%%%', JWKS_URL, Number.NaN),
    ])

    expect(verdicts).toHaveLength(4)
  })
})

describe('verifyAuthCookie — cache de découverte (#358)', () => {
  it('ne redécouvre PAS le JWKS à chaque vérification', async () => {
    // Une découverte par requête serait inacceptable en Edge — c'est une exigence de l'issue,
    // pas une optimisation.
    const fetchMock = stubNominalJwks()
    const token = await makeToken()

    for (let i = 0; i < 5; i += 1) {
      await expect(verifyAuthCookie(token, JWKS_URL, NOW)).resolves.toBe('accepted')
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('REDÉCOUVRE quand aucune clé connue n’explique une signature (rotation de clé)', async () => {
    // JWKS initial : l'ancienne clé. Le jeton est signé par la NOUVELLE. Sans re-découverte,
    // l'utilisateur serait renvoyé vers /login alors que son jeton est authentique.
    const rotated = await makeToken({ signWith: foreignKeyPair.privateKey })
    // Le backend sert l'ANCIENNE clé au premier appel, la NOUVELLE ensuite : c'est
    // exactement ce que voit un isolat Edge dont le cache précède la rotation.
    const fetchMock = vi.fn(async () => {
      const keys =
        fetchMock.mock.calls.length === 1
          ? [asPublishedJwk(publicJwk)]
          : [asPublishedJwk(foreignPublicJwk)]
      return new Response(JSON.stringify({ keys }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(verifyAuthCookie(rotated, JWKS_URL, NOW)).resolves.toBe('accepted')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ANTI-TEMPÊTE : un flot de cookies forgés ne déclenche pas un fetch par requête', async () => {
    // Sans garde-fou, un attaquant transformerait notre middleware en amplificateur de DoS
    // vers notre propre backend.
    const fetchMock = stubNominalJwks()
    const forged = await makeToken({ signWith: foreignKeyPair.privateKey })

    for (let i = 0; i < 20; i += 1) {
      await expect(verifyAuthCookie(forged, JWKS_URL, NOW + i)).resolves.toBe('rejected')
    }

    // 1 découverte initiale + 1 seul rafraîchissement forcé sur la fenêtre de cooldown.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('un jeton EXPIRÉ ne déclenche AUCUN rafraîchissement (cas le plus courant en prod)', async () => {
    const fetchMock = stubNominalJwks()
    const expired = await makeToken({ claims: { sub: 'alice', exp: Math.floor(NOW / 1000) - 1 } })

    await expect(verifyAuthCookie(expired, JWKS_URL, NOW)).resolves.toBe('rejected')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('verifyAuthCookie — signalement du dégradé en production', () => {
  const withProduction = async (run: () => Promise<void>): Promise<void> => {
    const previous = process.env.NODE_ENV
    // `NODE_ENV` est en lecture seule dans les types de Node : l'écriture passe par un cast
    // ciblé, seule entorse acceptée ici (le module lit littéralement `process.env.NODE_ENV`).
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    try {
      await run()
    } finally {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = previous
    }
  }

  it('AVERTIT une seule fois quand l’URL du JWKS est absente EN PRODUCTION', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await withProduction(async () => {
        for (let i = 0; i < 3; i += 1) {
          await expect(verifyAuthCookie('cookie-bidon', undefined, NOW)).resolves.toBe('accepted')
        }
      })

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain(AUTH_JWKS_URL_ENV_VAR)
    } finally {
      warn.mockRestore()
    }
  })

  it('AVERTIT une seule fois quand le JWKS est configuré mais INJOIGNABLE', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    try {
      await withProduction(async () => {
        for (let i = 0; i < 3; i += 1) {
          await expect(verifyAuthCookie('cookie-bidon', JWKS_URL, NOW)).resolves.toBe('accepted')
        }
      })

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain(AUTH_JWKS_URL_ENV_VAR)
    } finally {
      warn.mockRestore()
    }
  })

  it('reste SILENCIEUX hors production, et silencieux quand la découverte réussit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await verifyAuthCookie('cookie-bidon', undefined, NOW)

      resetJwksCache()
      stubNominalJwks()
      await withProduction(async () => {
        await expect(verifyAuthCookie(await makeToken(), JWKS_URL, NOW)).resolves.toBe('accepted')
      })

      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('ne LÈVE pas si console.warn lui-même lève (BUG-S45-001)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('console indisponible')
    })
    try {
      await withProduction(async () => {
        await expect(verifyAuthCookie('cookie-bidon', undefined, NOW)).resolves.toBe('accepted')
      })
    } finally {
      warn.mockRestore()
    }
  })
})
