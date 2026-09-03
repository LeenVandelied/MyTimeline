// @vitest-environment node

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_JWKS_URL_ENV_VAR,
  JWKS_FAILURE_TTL_MS,
  JWKS_REFRESH_COOLDOWN_MS,
  JWKS_SUCCESS_TTL_MS,
  getVerificationKeys,
  normalizeJwksUrl,
  refreshVerificationKeys,
  resetJwksCache,
} from './auth-jwks'

/**
 * #358 — comportement de CACHE de la découverte JWKS, isolé de la vérification de signature
 * (couverte par `auth-token-verify.test.ts`).
 *
 * Pourquoi un fichier séparé : ce sont les propriétés qui protègent le BACKEND (une découverte
 * par requête, ou un refetch par cookie forgé, transformeraient le middleware en amplificateur
 * de charge) et l'EDGE (un backend lent ne doit pas pendre la requête). Elles ne se déduisent
 * d'aucun verdict d'authentification, donc elles s'ancrent ici, en comptant les appels réseau.
 *
 * Environnement `node` : `crypto.subtle` est requis pour l'import de clé.
 */

const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const
const URL_A = 'http://backend-a.test/.well-known/jwks.json'
const URL_B = 'http://backend-b.test/.well-known/jwks.json'
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0)

let publicJwk: JsonWebKey

function jwksBody(): unknown {
  return { keys: [{ kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, alg: 'RS256', use: 'sig' }] }
}

function stubOkFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(jwksBody()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeAll(async () => {
  const keyPair = await crypto.subtle.generateKey(
    { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  )
  publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
})

beforeEach(() => {
  resetJwksCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeJwksUrl', () => {
  it('accepte http et https, et normalise la forme', () => {
    expect(normalizeJwksUrl('https://api.test/.well-known/jwks.json')).toBe(
      'https://api.test/.well-known/jwks.json',
    )
    expect(normalizeJwksUrl('  http://api.test/jwks  ')).toBe('http://api.test/jwks')
  })

  it('traite l’absence, le vide et le blanc comme « non configuré »', () => {
    expect(normalizeJwksUrl(undefined)).toBeNull()
    expect(normalizeJwksUrl('')).toBeNull()
    expect(normalizeJwksUrl('   ')).toBeNull()
  })

  it('refuse tout ce qui n’est pas http(s)', () => {
    // `file:` / `data:` n'ont aucun sens ici et ouvriraient une lecture de ressource locale
    // sur une simple faute de configuration.
    expect(normalizeJwksUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeJwksUrl('data:application/json,{}')).toBeNull()
    expect(normalizeJwksUrl('ftp://api.test/jwks.json')).toBeNull()
    expect(normalizeJwksUrl('/relatif/jwks.json')).toBeNull()
    expect(normalizeJwksUrl('pas une url du tout')).toBeNull()
  })
})

describe('getVerificationKeys — cache', () => {
  it('ne fait qu’UN appel réseau tant que le TTL de succès n’est pas écoulé', async () => {
    const fetchMock = stubOkFetch()

    await getVerificationKeys(URL_A, NOW)
    await getVerificationKeys(URL_A, NOW + JWKS_SUCCESS_TTL_MS - 1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('redécouvre une fois le TTL de succès écoulé', async () => {
    const fetchMock = stubOkFetch()

    await getVerificationKeys(URL_A, NOW)
    await getVerificationKeys(URL_A, NOW + JWKS_SUCCESS_TTL_MS + 1)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('MÉMORISE l’échec (cache négatif) : un backend mort ne provoque pas un fetch par requête', async () => {
    // Sans cache négatif, une panne du backend serait AMPLIFIÉE par le frontend.
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    vi.stubGlobal('fetch', fetchMock)

    for (let i = 0; i < 10; i += 1) {
      await expect(getVerificationKeys(URL_A, NOW + i)).resolves.toBeNull()
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('réessaie après le TTL d’échec, plus court que celui de succès', async () => {
    expect(JWKS_FAILURE_TTL_MS).toBeLessThan(JWKS_SUCCESS_TTL_MS)

    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    vi.stubGlobal('fetch', fetchMock)

    await getVerificationKeys(URL_A, NOW)
    await getVerificationKeys(URL_A, NOW + JWKS_FAILURE_TTL_MS + 1)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('DÉDOUBLONNE les découvertes concurrentes (cache froid + rafale de navigations)', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const fetchMock = vi.fn(async () => {
      await gate
      return new Response(JSON.stringify(jwksBody()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = Promise.all([
      getVerificationKeys(URL_A, NOW),
      getVerificationKeys(URL_A, NOW),
      getVerificationKeys(URL_A, NOW),
    ])
    release()
    const results = await pending

    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const keys of results) expect(keys).toHaveLength(1)
  })

  it('n’applique JAMAIS le cache d’une URL à une autre', async () => {
    const fetchMock = stubOkFetch()

    await getVerificationKeys(URL_A, NOW)
    await getVerificationKeys(URL_B, NOW)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('demande explicitement à ne PAS passer par le cache de fetch', async () => {
    // Un second niveau de cache, dont la politique nous échappe, déciderait à notre place
    // combien de temps une clé tournée reste servie.
    const fetchMock = stubOkFetch()

    await getVerificationKeys(URL_A, NOW)

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(init?.cache).toBe('no-store')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('refreshVerificationKeys — garde-fou anti-tempête', () => {
  it('rafraîchit une première fois, puis REFUSE pendant toute la fenêtre de cooldown', async () => {
    const fetchMock = stubOkFetch()

    await expect(refreshVerificationKeys(URL_A, NOW)).resolves.toHaveLength(1)
    await expect(refreshVerificationKeys(URL_A, NOW + 1)).resolves.toBeNull()
    await expect(
      refreshVerificationKeys(URL_A, NOW + JWKS_REFRESH_COOLDOWN_MS - 1),
    ).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('réarme une fois la fenêtre écoulée', async () => {
    const fetchMock = stubOkFetch()

    await refreshVerificationKeys(URL_A, NOW)
    await expect(
      refreshVerificationKeys(URL_A, NOW + JWKS_REFRESH_COOLDOWN_MS),
    ).resolves.toHaveLength(1)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignore le cache frais : c’est le chemin de la rotation de clé', async () => {
    const fetchMock = stubOkFetch()

    await getVerificationKeys(URL_A, NOW)
    await refreshVerificationKeys(URL_A, NOW)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('contrat de configuration', () => {
  it('expose le nom de variable attendu par le middleware', () => {
    // Ancré : le middleware lit `process.env.AUTH_JWKS_URL` en accès LITTÉRAL (analyse
    // statique de Next), donc un renommage ici doit être visible.
    expect(AUTH_JWKS_URL_ENV_VAR).toBe('AUTH_JWKS_URL')
  })
})
