// @vitest-environment node

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_PUBLIC_KEY_ENV_VAR,
  resetVerificationKeyCache,
  verifyAuthCookie,
} from './auth-token-verify'

/**
 * #323 — vérification RS256 du cookie `jwt` avec la seule clé publique (WebCrypto, aucune
 * dépendance npm ajoutée).
 *
 * Environnement `node` (et non jsdom) : jsdom n'implémente pas `crypto.subtle`.
 *
 * ⚠ AUCUNE clé n'est committée — la paire de test est générée dans le `beforeAll` (le dépôt
 * est PUBLIC). Les jetons sont signés ICI, à la main, pour que le test exerce le VRAI format
 * JOSE plutôt qu'un mock du module de vérification.
 */

const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

let keyPair: CryptoKeyPair
let publicKeyBase64: string
/** Seconde paire, pour modéliser un jeton signé par une clé étrangère. */
let foreignKeyPair: CryptoKeyPair

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
async function makeToken(options: {
  header?: Record<string, unknown>
  claims?: Record<string, unknown>
  signWith?: CryptoKey
  /** Signature volontairement corrompue (bit flip) — modélise l'altération en transit. */
  tamper?: boolean
} = {}): Promise<string> {
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

beforeAll(async () => {
  const params = { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }
  keyPair = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
  foreignKeyPair = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
  publicKeyBase64 = base64Url(await crypto.subtle.exportKey('spki', keyPair.publicKey))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
})

beforeEach(() => {
  // Le cache d'import est global au module : sans reset, un cas contaminerait le suivant.
  resetVerificationKeyCache()
})

describe('verifyAuthCookie — jeton authentique', () => {
  it('accepte un jeton RS256 signé par la clé attendue', async () => {
    await expect(verifyAuthCookie(await makeToken(), publicKeyBase64, NOW)).resolves.toBe('accepted')
  })

  it('accepte une clé publique collée au format PEM complet (armure + sauts de ligne)', async () => {
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.replace(/(.{64})/g, '$1\n')}\n-----END PUBLIC KEY-----\n`

    // Ergonomie : un format refusé retomberait en DÉGRADÉ silencieux (accepté quand même),
    // donc on vérifie plutôt qu'un jeton INVALIDE est bien rejeté avec cette forme de clé.
    await expect(verifyAuthCookie(await makeToken({ tamper: true }), pem, NOW)).resolves.toBe(
      'rejected',
    )
  })
})

describe('verifyAuthCookie — rejets', () => {
  it('rejette un cookie absent ou vide', async () => {
    await expect(verifyAuthCookie(undefined, publicKeyBase64, NOW)).resolves.toBe('rejected')
    await expect(verifyAuthCookie('', publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it('rejette une signature altérée', async () => {
    await expect(
      verifyAuthCookie(await makeToken({ tamper: true }), publicKeyBase64, NOW),
    ).resolves.toBe('rejected')
  })

  it('rejette un jeton signé par une AUTRE clé privée', async () => {
    const foreign = await makeToken({ signWith: foreignKeyPair.privateKey })

    await expect(verifyAuthCookie(foreign, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton expiré', async () => {
    const expired = await makeToken({ claims: { sub: 'alice', exp: Math.floor(NOW / 1000) - 1 } })

    await expect(verifyAuthCookie(expired, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton SANS claim exp (sinon il serait éternel côté garde)', async () => {
    const eternal = await makeToken({ claims: { sub: 'alice' } })

    await expect(verifyAuthCookie(eternal, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it.each([
    { label: 'sans claim sub', claims: { exp: Math.floor(NOW / 1000) + 3600 } },
    { label: 'sub vide', claims: { sub: '', exp: Math.floor(NOW / 1000) + 3600 } },
    { label: 'sub non-string', claims: { sub: 42, exp: Math.floor(NOW / 1000) + 3600 } },
  ])('rejette un jeton $label (revue S50, 2e cycle)', async ({ claims }) => {
    // Sans cette exigence, TOUT jeton RS256 signé par cette clé ouvre la garde — y compris un
    // jeton d'un autre usage qui n'identifie personne. `JwtService` pose toujours un `sub` :
    // la garde cesse de dépendre du fait qu'il soit aujourd'hui le seul émetteur.
    const anonymous = await makeToken({ claims })

    await expect(verifyAuthCookie(anonymous, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it('rejette un jeton pas encore valide (nbf dans le futur)', async () => {
    const notYet = await makeToken({
      claims: { sub: 'alice', exp: Math.floor(NOW / 1000) + 3600, nbf: Math.floor(NOW / 1000) + 60 },
    })

    await expect(verifyAuthCookie(notYet, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })

  it.each(['pas-un-jwt', 'a.b', 'a.b.c.d', '...'])('rejette la valeur malformée %s', async (bad) => {
    await expect(verifyAuthCookie(bad, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })
})

describe('verifyAuthCookie — confusion d’algorithme', () => {
  it('rejette alg:none, même avec une signature vide', async () => {
    const header = encodeSegment({ alg: 'none', typ: 'JWT' })
    const claims = encodeSegment({ sub: 'mallory', exp: Math.floor(NOW / 1000) + 3600 })

    await expect(verifyAuthCookie(`${header}.${claims}.`, publicKeyBase64, NOW)).resolves.toBe(
      'rejected',
    )
  })

  it('rejette un jeton HS256 signé AVEC la clé publique', async () => {
    // La clé publique est publique par construction : si HS256 était accepté, n'importe qui
    // pourrait forger une identité en la connaissant. Barrière la plus critique du module.
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(publicKeyBase64),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const header = encodeSegment({ alg: 'HS256', typ: 'JWT' })
    const claims = encodeSegment({ sub: 'mallory', exp: Math.floor(NOW / 1000) + 3600 })
    const signature = base64Url(
      await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${header}.${claims}`)),
    )

    await expect(
      verifyAuthCookie(`${header}.${claims}.${signature}`, publicKeyBase64, NOW),
    ).resolves.toBe('rejected')
  })

  it('rejette un en-tête annonçant RS512 (algo non émis par JwtService)', async () => {
    const forged = await makeToken({ header: { alg: 'RS512', typ: 'JWT' } })

    await expect(verifyAuthCookie(forged, publicKeyBase64, NOW)).resolves.toBe('rejected')
  })
})

describe('verifyAuthCookie — dégradé (clé non exploitable)', () => {
  it('accepte tout cookie présent quand AUCUNE clé publique n’est configurée', async () => {
    // Comportement d'avant #323 : la garde redevient un simple test de présence.
    await expect(verifyAuthCookie('cookie-bidon', undefined, NOW)).resolves.toBe('accepted')
    await expect(verifyAuthCookie('cookie-bidon', '', NOW)).resolves.toBe('accepted')
    await expect(verifyAuthCookie('cookie-bidon', '   ', NOW)).resolves.toBe('accepted')
  })

  it('DÉGRADE au lieu de tout bloquer quand la clé configurée est illisible', async () => {
    // Fail-closed ici déconnecterait 100 % des utilisateurs sur une faute de frappe — alors que
    // le backend continue de refuser les jetons invalides. Limite assumée, documentée dans
    // ADR-004. Depuis la revue S50 ce dégradé n'est plus SILENCIEUX (cf. bloc « signalement du
    // dégradé ») : on absorbe le `console.warn` ici pour ne pas polluer la sortie de la suite.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(verifyAuthCookie('cookie-bidon', 'ceci-n-est-pas-une-cle', NOW)).resolves.toBe(
      'accepted',
    )

    warn.mockRestore()
  })

  it('ne LÈVE jamais, quelle que soit l’entrée (une exception = 500 sur toutes les routes)', async () => {
    // Clé non vide et illisible → avertissement attendu, absorbé (cf. test précédent).
    // `mockRestore` explicite : aucun `restoreMocks` global n'est configuré côté Vitest, un
    // espion laissé en place fuirait sur les `describe` suivants.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(
      verifyAuthCookie(' ￿', ' -cle-corrompue', NOW),
    ).resolves.toBeDefined()

    warn.mockRestore()
  })
})

/**
 * Revue S50 — le dégradé sur clé ILLISIBLE était totalement muet : 100 % des cookies acceptés,
 * et le spec E2E qui documente le dégradé reste VERT dans cet état. Rien dans le pipeline ne
 * pouvait détecter la panne de configuration. Ces tests sont le filet manquant.
 */
describe('verifyAuthCookie — signalement du dégradé (revue S50)', () => {
  const UNREADABLE_KEY = 'ceci-n-est-pas-une-cle'

  function spyOnWarn() {
    return vi.spyOn(console, 'warn').mockImplementation(() => {})
  }

  it('AVERTIT quand la clé est configurée mais inexploitable', async () => {
    const warn = spyOnWarn()

    await expect(verifyAuthCookie('cookie-bidon', UNREADABLE_KEY, NOW)).resolves.toBe('accepted')

    expect(warn).toHaveBeenCalledTimes(1)
    // Le message doit nommer la variable, sinon il est inexploitable en exploitation.
    expect(warn.mock.calls[0]?.[0]).toContain(AUTH_PUBLIC_KEY_ENV_VAR)
    warn.mockRestore()
  })

  it('n’avertit qu’UNE FOIS (le middleware tourne sur chaque navigation)', async () => {
    const warn = spyOnWarn()

    for (let i = 0; i < 5; i += 1) {
      await verifyAuthCookie('cookie-bidon', UNREADABLE_KEY, NOW)
    }

    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('reste SILENCIEUX HORS production quand la variable est absente ou vide', async () => {
    const warn = spyOnWarn()

    // C'est la décision de dev : aucune clé n'est committée dans ce dépôt public. Crier à
    // chaque boot ferait ignorer le message par habitude, y compris quand il compte.
    await verifyAuthCookie('cookie-bidon', undefined, NOW)
    await verifyAuthCookie('cookie-bidon', '', NOW)
    await verifyAuthCookie('cookie-bidon', '   ', NOW)

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('reste SILENCIEUX quand la clé est valide', async () => {
    const warn = spyOnWarn()

    await expect(verifyAuthCookie(await makeToken(), publicKeyBase64, NOW)).resolves.toBe(
      'accepted',
    )

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('ne LÈVE pas si console.warn lui-même lève (BUG-S45-001)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('transport de log en panne')
    })

    // Un logger cassé ne doit pas transformer un dégradé en 500 sur toutes les routes protégées.
    await expect(verifyAuthCookie('cookie-bidon', UNREADABLE_KEY, NOW)).resolves.toBe('accepted')

    warn.mockRestore()
  })
})

/**
 * Revue S50, 2e cycle — SIGNALISATION INVERSÉE. Seul le cas rare (clé présente mais illisible)
 * criait ; la clé simplement OUBLIÉE au déploiement — mode de panne le plus probable, puisque
 * rien côté frontend ni côté pipeline ne l'exige — laissait #323 intégralement inerte sans le
 * moindre symptôme observable.
 */
describe('verifyAuthCookie — clé absente EN PRODUCTION (revue S50, 2e cycle)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([undefined, '', '   '])(
    'AVERTIT (une seule fois) pour %o quand NODE_ENV=production',
    async (raw) => {
      vi.stubEnv('NODE_ENV', 'production')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      for (let i = 0; i < 3; i += 1) {
        await expect(verifyAuthCookie('cookie-bidon', raw, NOW)).resolves.toBe('accepted')
      }

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain(AUTH_PUBLIC_KEY_ENV_VAR)
      warn.mockRestore()
    },
  )

  it('ne LÈVE pas si console.warn lui-même lève (BUG-S45-001)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('transport de log en panne')
    })

    await expect(verifyAuthCookie('cookie-bidon', undefined, NOW)).resolves.toBe('accepted')

    warn.mockRestore()
  })
})

describe('contrat de configuration', () => {
  it('expose le nom de variable attendu par le middleware', () => {
    // Ancre : `middleware.ts` lit `process.env.AUTH_JWT_PUBLIC_KEY` en accès LITTÉRAL
    // (contrainte d'analyse statique Next, #322) — les deux doivent rester alignés.
    expect(AUTH_PUBLIC_KEY_ENV_VAR).toBe('AUTH_JWT_PUBLIC_KEY')
  })
})
