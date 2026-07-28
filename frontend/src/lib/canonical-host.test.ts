import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import {
  applyCanonicalOrigin,
  canonicalizeLocation,
  canonicalOrigins,
  CANONICAL_HOST_ENV_VAR,
  parseCanonicalOrigins,
  resetCanonicalHostWarning,
  resolveCanonicalOrigin,
} from './canonical-host'

// Le verrou d'avertissement est un état de MODULE : sans remise à zéro, un seul cas de tout le
// fichier pourrait observer le `console.warn` (revue S50).
beforeEach(() => {
  resetCanonicalHostWarning()
})

/**
 * #322 — Origine canonique des redirections du middleware (ADR-004 §Limites).
 *
 * Module PUR : aucun `NextRequest` ici. La composition réelle avec la garde et
 * avec next-intl est couverte par `middleware.test.ts`.
 */

describe('parseCanonicalOrigins — formes acceptées', () => {
  it('accepte un hôte nu, sans imposer de protocole', () => {
    expect(parseCanonicalOrigins('app.example.com')).toEqual([
      { host: 'app.example.com', hostname: 'app.example.com', port: '', protocol: null },
    ])
  })

  it('accepte un hôte avec port et l’isole de l’hôte', () => {
    expect(parseCanonicalOrigins('localhost:3000')).toEqual([
      { host: 'localhost:3000', hostname: 'localhost', port: '3000', protocol: null },
    ])
  })

  it('accepte une origine complète et en retient le protocole', () => {
    expect(parseCanonicalOrigins('https://app.example.com')).toEqual([
      { host: 'app.example.com', hostname: 'app.example.com', port: '', protocol: 'https:' },
    ])
  })

  it('normalise la casse de l’hôte', () => {
    expect(parseCanonicalOrigins('APP.Example.COM')[0]?.host).toBe('app.example.com')
  })

  it('élague le port par défaut du protocole', () => {
    expect(parseCanonicalOrigins('https://app.example.com:443')[0]?.port).toBe('')
  })

  it('accepte une liste séparée par des virgules et conserve l’ORDRE', () => {
    // Le premier est le canonique (cible du fail-closed) : l'ordre est porteur
    // de sens, ce n'est pas un simple ensemble.
    expect(
      parseCanonicalOrigins('app.example.com, preview.example.com , staging.example.com').map(
        (origin) => origin.host,
      ),
    ).toEqual(['app.example.com', 'preview.example.com', 'staging.example.com'])
  })

  it('accepte un littéral IPv6 sous forme d’origine complète', () => {
    expect(parseCanonicalOrigins('http://[::1]:3000')).toEqual([
      { host: '[::1]:3000', hostname: '[::1]', port: '3000', protocol: 'http:' },
    ])
  })
})

describe('parseCanonicalOrigins — entrées rejetées (jamais d’exception)', () => {
  // Ces cas déclenchent LÉGITIMEMENT l'avertissement « configuration inexploitable » ajouté à la
  // revue S50 — ce n'est pas leur objet, et 9 warns pollueraient la sortie de la suite. Le
  // comportement du warn lui-même est couvert par le bloc « signalement du dégradé » ci-dessous.
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it.each([undefined, null, '', '   ', ',,,'])('renvoie une liste vide pour %o', (raw) => {
    expect(parseCanonicalOrigins(raw)).toEqual([])
  })

  it.each([
    'app.example.com/login', // porte un chemin
    'user@app.example.com', // credential
    'app example.com', // espace
    'https://', // origine sans hôte
    'ftp://app.example.com', // protocole non HTTP
    'javascript:alert(1)', // schéma dangereux
    '//app.example.com', // protocol-relative
    '-app.example.com', // label commençant par un tiret
  ])('ignore l’entrée invalide %s', (entry) => {
    expect(parseCanonicalOrigins(entry)).toEqual([])
  })

  it('ignore UNIQUEMENT les entrées invalides d’une liste mixte', () => {
    expect(
      parseCanonicalOrigins('app.example.com,pas valide,preview.example.com').map(
        (origin) => origin.host,
      ),
    ).toEqual(['app.example.com', 'preview.example.com'])
  })

  it('ne lève JAMAIS, quelle que soit l’entrée (contrainte BUG-S45-001)', () => {
    for (const raw of ['%', 'http://%', '::::', '\u0000', 'a'.repeat(5000)]) {
      expect(() => parseCanonicalOrigins(raw)).not.toThrow()
    }
  })
})

/**
 * Revue S50 — même angle mort que `auth-token-verify.ts` : une `APP_CANONICAL_HOST` non vide
 * mais entièrement invalide désactivait la réécriture d'origine EN SILENCE. L'opérateur croit
 * avoir fermé l'open-redirect, il ne l'a pas fermé, et rien ne le lui dit.
 */
describe('parseCanonicalOrigins — signalement du dégradé (revue S50)', () => {
  function spyOnWarn() {
    return vi.spyOn(console, 'warn').mockImplementation(() => {})
  }

  it('AVERTIT quand la valeur est non vide mais qu’aucune entrée n’est exploitable', () => {
    const warn = spyOnWarn()

    expect(parseCanonicalOrigins('user@app.example.com,ftp://x')).toEqual([])

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain(CANONICAL_HOST_ENV_VAR)
    warn.mockRestore()
  })

  it('n’avertit qu’UNE FOIS (appelée à chaque requête matchée)', () => {
    const warn = spyOnWarn()

    for (let i = 0; i < 5; i += 1) parseCanonicalOrigins('pas valide')

    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it.each([undefined, null, '', '   ', ',,,'])(
    'reste SILENCIEUX pour %o (dégradé volontaire, pas une anomalie)',
    (raw) => {
      const warn = spyOnWarn()

      expect(parseCanonicalOrigins(raw)).toEqual([])

      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    },
  )

  it('reste SILENCIEUX dès qu’UNE entrée est valide, même en liste mixte', () => {
    const warn = spyOnWarn()

    // Une entrée valide suffit à armer la réécriture : il n'y a pas de dégradé à signaler.
    expect(parseCanonicalOrigins('pas valide,app.example.com')).toHaveLength(1)

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('ne LÈVE pas si console.warn lui-même lève (BUG-S45-001)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('transport de log en panne')
    })

    expect(() => parseCanonicalOrigins('pas valide')).not.toThrow()

    warn.mockRestore()
  })
})

describe('canonicalOrigins — mémoïsation', () => {
  it('renvoie la MÊME référence pour la même valeur brute', () => {
    expect(canonicalOrigins('app.example.com')).toBe(canonicalOrigins('app.example.com'))
  })

  it('recalcule quand la valeur brute change (pas de cache figé au boot)', () => {
    const first = canonicalOrigins('app.example.com')
    const second = canonicalOrigins('autre.example.com')

    expect(second).not.toBe(first)
    expect(second[0]?.host).toBe('autre.example.com')
  })
})

describe('resolveCanonicalOrigin — choix de l’origine', () => {
  const origins = parseCanonicalOrigins('app.example.com,preview.example.com')

  it('conserve un hôte DÉCLARÉ (preview/staging non cassés)', () => {
    expect(resolveCanonicalOrigin('preview.example.com', origins)?.host).toBe('preview.example.com')
  })

  it('compare sans tenir compte de la casse', () => {
    expect(resolveCanonicalOrigin('APP.Example.com', origins)?.host).toBe('app.example.com')
  })

  it('bascule vers la PREMIÈRE entrée sur un hôte inconnu (fail-closed)', () => {
    expect(resolveCanonicalOrigin('evil.example', origins)?.host).toBe('app.example.com')
  })

  it('renvoie null sans configuration (dégradé)', () => {
    expect(resolveCanonicalOrigin('evil.example', [])).toBeNull()
  })
})

describe('applyCanonicalOrigin — réécriture en place', () => {
  it('remplace un hôte hostile et signale la modification', () => {
    const url = new URL('http://evil.example/fr/login')

    expect(applyCanonicalOrigin(url, parseCanonicalOrigins('app.example.com'))).toBe(true)
    expect(url.host).toBe('app.example.com')
  })

  it('EFFACE le port de la requête quand le canonique n’en déclare pas', () => {
    // ⚠ Régression trouvée sur le serveur RÉEL, invisible tant qu'aucune URL de
    // départ ne portait de port : `url.host = 'app.example.com'` ne touche PAS au
    // port déjà présent (WHATWG). La 307 sortait en
    // `http://app.example.com:3133/fr/login` — un port interne au conteneur.
    const url = new URL('http://0.0.0.0:3133/fr/login')

    expect(applyCanonicalOrigin(url, parseCanonicalOrigins('app.example.com'))).toBe(true)
    expect(url.toString()).toBe('http://app.example.com/fr/login')
  })

  it('impose le port du canonique quand il en déclare un', () => {
    const url = new URL('http://evil.example/fr/login')

    applyCanonicalOrigin(url, parseCanonicalOrigins('localhost:3000'))

    expect(url.toString()).toBe('http://localhost:3000/fr/login')
  })

  it('préserve chemin, query et fragment', () => {
    const url = new URL('http://evil.example/fr/login?a=1#frag')
    applyCanonicalOrigin(url, parseCanonicalOrigins('app.example.com'))

    expect(url.pathname).toBe('/fr/login')
    expect(url.search).toBe('?a=1')
    expect(url.hash).toBe('#frag')
  })

  it('n’impose PAS de protocole quand l’entrée est un hôte nu', () => {
    const url = new URL('http://evil.example/fr/login')
    applyCanonicalOrigin(url, parseCanonicalOrigins('app.example.com'))

    expect(url.protocol).toBe('http:')
  })

  it('impose le protocole quand l’entrée est une origine complète (anti x-forwarded-proto menteur)', () => {
    const url = new URL('http://app.example.com/fr/login')

    expect(applyCanonicalOrigin(url, parseCanonicalOrigins('https://app.example.com'))).toBe(true)
    expect(url.toString()).toBe('https://app.example.com/fr/login')
  })

  it('ne modifie rien quand l’hôte est déjà canonique', () => {
    const url = new URL('https://app.example.com/fr/login')

    expect(applyCanonicalOrigin(url, parseCanonicalOrigins('https://app.example.com'))).toBe(false)
    expect(url.toString()).toBe('https://app.example.com/fr/login')
  })

  it('ne modifie rien sans configuration', () => {
    const url = new URL('http://evil.example/fr/login')

    expect(applyCanonicalOrigin(url, [])).toBe(false)
    expect(url.host).toBe('evil.example')
  })
})

describe('canonicalizeLocation — en-tête Location', () => {
  const origins = parseCanonicalOrigins('app.example.com')

  it('réécrit une Location absolue vers un hôte hostile', () => {
    expect(canonicalizeLocation('http://evil.example/fr/login', origins)).toBe(
      'http://app.example.com/fr/login',
    )
  })

  it('laisse intacte une Location déjà canonique (aucune normalisation surprise)', () => {
    expect(canonicalizeLocation('http://app.example.com/fr/login', origins)).toBe(
      'http://app.example.com/fr/login',
    )
  })

  it('laisse intacte une Location RELATIVE (rien à empoisonner, et pas de 500)', () => {
    expect(canonicalizeLocation('/fr/login', origins)).toBe('/fr/login')
  })

  it('laisse intacte toute valeur non parsable', () => {
    expect(canonicalizeLocation('pas une url', origins)).toBe('pas une url')
  })

  it('ne fait rien sans configuration', () => {
    expect(canonicalizeLocation('http://evil.example/fr/login', [])).toBe(
      'http://evil.example/fr/login',
    )
  })
})
