// @vitest-environment node

import { createRequire } from 'node:module'

import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

import middleware, { config } from './middleware'
import { AUTH_COOKIE_NAME } from '@/lib/auth-guard-paths'
import { resetVerificationKeyCache } from '@/lib/auth-token-verify'
import { SUPPORTED_LOCALES } from '@/i18n/locales'

/**
 * #302 — Garde serveur COMPOSÉE avec next-intl (ADR-004).
 *
 * Environnement `node` (et non jsdom) : `NextRequest`/`NextResponse` s'appuient
 * sur les primitives Fetch globales (`Request`, `Headers`) que jsdom n'implémente
 * pas. Ce fichier vit à la racine (à côté de `middleware.ts`) — il est capté par
 * l'entrée `middleware.test.ts` du `include` de `vitest.config.mts`.
 */

const ORIGIN = 'http://localhost:3000'

function request(pathname: string, options: { authenticated?: boolean } = {}): NextRequest {
  const req = new NextRequest(new URL(pathname, ORIGIN), {
    headers: {
      // Locale explicite : neutralise toute négociation Accept-Language implicite
      // dans les assertions sur les chemins non préfixés.
      'accept-language': 'fr',
    },
  })
  if (options.authenticated) {
    req.cookies.set(AUTH_COOKIE_NAME, 'jeton-opaque-non-verifie-par-le-middleware')
  }
  return req
}

/** Chemin de la cible d'une réponse de redirection (307/308). */
function redirectTarget(response: Response): string | null {
  const location = response.headers.get('location')
  return location === null ? null : new URL(location, ORIGIN).pathname
}

/**
 * Requête arrivant sur un hôte ARBITRAIRE — modélise un `Host` /
 * `x-forwarded-host` falsifié sur les plateformes où `request.nextUrl` en dérive
 * (cf. le bloc « origine canonique » plus bas pour la mesure sur CE runtime).
 */
function requestFromHost(host: string, pathname = '/fr/dashboard'): NextRequest {
  return new NextRequest(new URL(pathname, `http://${host}`), {
    headers: { 'accept-language': 'fr', host },
  })
}

/**
 * #322 — la garde lit `APP_CANONICAL_HOST` au RUNTIME (pas au chargement du
 * module) : chaque test pose sa propre valeur. Le nettoyage est global pour
 * qu'une valeur oubliée ne contamine pas les blocs qui testent le DÉGRADÉ.
 */
afterEach(() => {
  delete process.env.APP_CANONICAL_HOST
})

describe('middleware — anonyme sur route protégée', () => {
  it.each(['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings'])(
    'redirige %s vers /fr/login SANS rendre la page',
    async (pathname) => {
      const response = await middleware(request(pathname))

      expect(response.status).toBe(307)
      expect(redirectTarget(response)).toBe('/fr/login')
      // Aucun rewrite interne : la requête ne doit PAS atteindre le rendu.
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    },
  )

  it('redirige vers la page de connexion de la locale COURANTE', async () => {
    expect(redirectTarget(await middleware(request('/en/dashboard')))).toBe('/en/login')
    expect(redirectTarget(await middleware(request('/es/timeline')))).toBe('/es/login')
    expect(redirectTarget(await middleware(request('/de/products')))).toBe('/de/login')
  })

  it('protège aussi les sous-routes (détail produit)', async () => {
    const response = await middleware(request('/fr/products/9f4c1e2a-0000-4000-8000-000000000000'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })

  it('ne reporte PAS la query string dans la cible (pas d’open-redirect)', async () => {
    const response = await middleware(request('/fr/dashboard?redirect=https://evil.example'))
    const location = response.headers.get('location')

    expect(new URL(location!, ORIGIN).search).toBe('')
    expect(location).not.toContain('evil.example')
  })
})

describe('middleware — cookie jwt présent', () => {
  it.each(['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings'])(
    'laisse passer %s (délégation à next-intl, aucune redirection auth)',
    async (pathname) => {
      const response = await middleware(request(pathname, { authenticated: true }))

      expect(redirectTarget(response)).not.toBe('/fr/login')
      expect(response.status).toBe(200)
    },
  )

  it('DÉGRADÉ (AUTH_JWT_PUBLIC_KEY absente) : un cookie arbitraire passe encore', async () => {
    // Comportement d'avant #323, conservé TEL QUEL quand la clé publique n'est pas
    // configurée (dev local, CI e2e, preview) — cf. le bloc « signature RS256 » plus
    // bas pour le comportement AVEC clé. Ancré ici pour que le dégradé reste VISIBLE :
    // c'est `JwtFilter` (401) + `useAuthGuard` qui tranchent réellement dans ce mode.
    const req = new NextRequest(new URL('/fr/dashboard', ORIGIN))
    req.cookies.set(AUTH_COOKIE_NAME, 'ceci-n-est-pas-un-jwt')

    expect(redirectTarget(await middleware(req))).not.toBe('/fr/login')
  })
})

describe('middleware — routes publiques (aucune boucle de redirection)', () => {
  it.each([
    '/fr/login',
    '/fr/register',
    '/fr/forgot-password',
    '/fr/reset-password',
    '/fr/home',
    '/fr/privacy',
    '/fr/terms',
    '/fr',
  ])('laisse passer %s pour un anonyme', async (pathname) => {
    expect(redirectTarget(await middleware(request(pathname)))).not.toBe('/fr/login')
  })
})

describe('middleware — non-régression i18n (#235)', () => {
  it('préfixe toujours un chemin nu avec la locale (localePrefix: always)', async () => {
    const response = await middleware(request('/'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr')
  })

  it('laisse next-intl localiser /dashboard AVANT que la garde ne s’applique', async () => {
    // La garde ignore les chemins non préfixés : next-intl redirige d'abord vers
    // /fr/dashboard, requête sur laquelle le middleware re-tourne et redirige
    // alors vers /fr/login (ADR-004 §Décision 3). Aucune fuite : le 1er hop est
    // une redirection, pas un rendu.
    const first = await middleware(request('/dashboard'))
    expect(first.status).toBe(307)
    expect(redirectTarget(first)).toBe('/fr/dashboard')

    const second = await middleware(request(redirectTarget(first)!))
    expect(second.status).toBe(307)
    expect(redirectTarget(second)).toBe('/fr/login')
  })

  it('accepte toutes les locales supportées (es/de livrées S26)', async () => {
    // Itère SUPPORTED_LOCALES — une liste en dur ici raterait une locale ajoutée
    // à la source de vérité (régression #235).
    for (const locale of SUPPORTED_LOCALES) {
      const response = await middleware(request(`/${locale}/home`))
      expect(response.status).toBe(200)
    }
  })

  it('ne traite pas une locale non supportée comme une locale', async () => {
    // `/it/dashboard` : `it` n'est pas une locale → next-intl le préfixe.
    const response = await middleware(request('/it/dashboard'))
    expect(redirectTarget(response)).toBe('/fr/it/dashboard')
  })
})

describe('middleware — Location exploitable par Next (régression 500, S45)', () => {
  /**
   * ⚠ ANGLE MORT QUI A COÛTÉ UN RUN CI (30269383403 : 10 specs `auth-guard` en
   * 500 au lieu de 307, vitest VERT).
   *
   * L'audit S45 avait rendu le `Location` RELATIF (`/fr/login`) pour ne pas
   * dériver l'URL de l'en-tête `Host`. Les tests d'alors assertaient
   * `expect(location).toBe('/fr/login')` et résolvaient tout via
   * `new URL(location, ORIGIN)` — **avec une base**. Or Next NORMALISE la
   * réponse ensuite (`adapter.js`) : `new NextURL(location, …)`, donc
   * `new URL(location)` **SANS base** → `TypeError: Invalid URL` → 500.
   * Asserter la chaîne relative reproduisait exactement l'angle mort : il faut
   * asserter que le `Location` survit au TRAITEMENT DE NEXT.
   *
   * On charge le `NextURL` RÉEL (même module que l'adapter) plutôt que d'imiter
   * son comportement : une imitation dérive du moteur, c'est déjà ce qui avait
   * laissé passer le contournement du matcher. Pas de typings publics →
   * `createRequire` + type explicite (aucun `any`).
   */
  const NextURL = ((): new (input: string, opts: { forceLocale: boolean }) => { href: string } => {
    const requireCjs = createRequire(import.meta.url)
    const mod = requireCjs('next/dist/server/web/next-url') as {
      NextURL: new (input: string, opts: { forceLocale: boolean }) => { href: string }
    }
    return mod.NextURL
  })()

  const locationOf = async (pathname: string): Promise<string> => {
    const location = (await middleware(request(pathname))).headers.get('location')
    expect(location).not.toBeNull()
    return location!
  }

  it.each(['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings', '/fr/%64ashboard'])(
    'émet sur %s un Location ABSOLU, parsable sans base',
    async (pathname) => {
      const location = await locationOf(pathname)

      // Le cœur du garde-fou : ce que Next fera du `Location`. Un chemin
      // relatif lève ici, exactement comme en production.
      expect(() => new URL(location)).not.toThrow()
      expect(new URL(location).pathname).toBe('/fr/login')
    },
  )

  it('survit à la normalisation RÉELLE de Next (adapter.js → new NextURL)', async () => {
    // Reproduction fidèle de `adapter.js` : c'est CETTE ligne qui jetait
    // `ERR_INVALID_URL { input: '/fr/login' }` et transformait la 307 en 500.
    const location = await locationOf('/fr/dashboard')
    expect(() => new NextURL(location, { forceLocale: false })).not.toThrow()
  })

  it('ne reporte toujours PAS la query string (pas d’open-redirect)', async () => {
    const location = (
      await middleware(request('/fr/dashboard?redirect=https://evil.example'))
    ).headers.get('location')!

    expect(new URL(location).search).toBe('')
    expect(location).not.toContain('evil.example')
  })

  it('DÉGRADÉ (APP_CANONICAL_HOST absente) : l’origine du Location suit la requête', async () => {
    // Comportement d'AVANT #322, conservé tel quel quand la variable n'est pas
    // configurée (dev local, CI, preview). C'est le dégradé assumé : une garde
    // qui casse partout serait pire que le risque qu'elle corrige
    // (BUG-S45-001). Ancré ici pour que le compromis reste VISIBLE.
    const location = (await middleware(requestFromHost('evil.example'))).headers.get('location')!

    expect(new URL(location).pathname).toBe('/fr/login')
    expect(new URL(location).host).toBe('evil.example')
  })

  it('protège un segment percent-encodé (contournement corrigé S45)', async () => {
    const response = await middleware(request('/fr/%64ashboard'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })
})

describe('middleware — origine canonique du Location (#322)', () => {
  /**
   * ⚠ CE QUI A ÉTÉ MESURÉ SUR LE RUNTIME RÉEL, avant d'écrire ces tests
   * (`next build` + `next start`, curl avec `Host: evil.example` puis
   * `X-Forwarded-Host: evil.example`) :
   *
   *   `initURL` de Next = `${proto}://${fetchHostname}:${port}${req.url}` —
   *   l'hôte de BIND du serveur, PAS l'en-tête `Host`
   *   (`next/dist/server/next-server.js`, `attachRequestMeta`). En self-hosting
   *   (`next start` / sortie `standalone`), un `Host` falsifié ne déplace donc
   *   PAS `request.nextUrl` : le vecteur décrit par #322 n'est pas atteignable
   *   TEL QUEL sur cette configuration.
   *
   * Il le redevient dès que `request.nextUrl` dérive des en-têtes : option
   * `experimental.trustHostHeader`, ou une plateforme edge qui construit l'URL
   * depuis le `Host` reçu. Les tests ci-dessous injectent donc l'hôte hostile
   * DANS l'URL de la `NextRequest` — c'est-à-dire exactement l'état dans lequel
   * le middleware se trouverait sur ces plateformes. C'est une défense en
   * profondeur assumée, pas la correction d'un trou reproductible ici.
   */
  const CANONICAL = 'app.mytimeline.test'

  const locationFor = async (req: NextRequest): Promise<URL> =>
    new URL((await middleware(req)).headers.get('location')!)

  it('réécrit l’origine quand la requête arrive sur un Host FALSIFIÉ', async () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = await locationFor(requestFromHost('evil.example'))

    expect(location.host).toBe(CANONICAL)
    expect(location.pathname).toBe('/fr/login')
    // L'hôte hostile ne doit subsister NULLE PART dans l'en-tête.
    expect(location.toString()).not.toContain('evil.example')
  })

  it('ne bouge PAS un Host légitime (non-régression du cas nominal)', async () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect((await locationFor(requestFromHost(CANONICAL))).host).toBe(CANONICAL)
  })

  it('n’emporte PAS le port d’écoute interne dans la cible', async () => {
    // Cas réel du self-hosting : le serveur écoute sur :3000 dans le conteneur
    // et `request.nextUrl` porte donc ce port, absent du domaine public.
    // Régression trouvée en interrogeant un `next start` réel, pas en unitaire.
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect((await locationFor(requestFromHost('0.0.0.0:3000'))).toString()).toBe(
      `http://${CANONICAL}/fr/login`,
    )
  })

  it('conserve le port quand la configuration en déclare un (dev/preview)', async () => {
    process.env.APP_CANONICAL_HOST = 'localhost:3000'

    expect((await locationFor(requestFromHost('evil.example'))).toString()).toBe(
      'http://localhost:3000/fr/login',
    )
  })

  it('conserve les hôtes secondaires déclarés (preview / staging non cassés)', async () => {
    // Le risque signalé par l'issue elle-même : une liste mal synchronisée qui
    // renvoie les environnements non-prod vers la prod.
    process.env.APP_CANONICAL_HOST = `${CANONICAL},preview.mytimeline.test`

    expect((await locationFor(requestFromHost('preview.mytimeline.test'))).host).toBe(
      'preview.mytimeline.test',
    )
  })

  it('bascule vers la PREMIÈRE entrée quand l’hôte n’est dans aucune (fail-closed)', async () => {
    process.env.APP_CANONICAL_HOST = `${CANONICAL},preview.mytimeline.test`

    expect((await locationFor(requestFromHost('evil.example'))).host).toBe(CANONICAL)
  })

  it('impose aussi le protocole quand la config déclare une origine complète', async () => {
    process.env.APP_CANONICAL_HOST = `https://${CANONICAL}`

    expect((await locationFor(requestFromHost('evil.example'))).toString()).toBe(
      `https://${CANONICAL}/fr/login`,
    )
  })

  it('durcit AUSSI les redirections de next-intl, pas seulement la garde', async () => {
    // `/` → `/fr` et `/dashboard` → `/fr/dashboard` dérivent de la même
    // `request.nextUrl`. Ne durcir que la 307 de la garde laisserait le même
    // vecteur ouvert sur des chemins BIEN plus atteignables (la racine).
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect((await locationFor(requestFromHost('evil.example', '/'))).host).toBe(CANONICAL)
    expect((await locationFor(requestFromHost('evil.example', '/dashboard'))).host).toBe(CANONICAL)
  })

  it.each(['', '   ', 'pas valide', ',,,'])(
    'retombe sur le dégradé (jamais 500, jamais de boucle) pour APP_CANONICAL_HOST=%o',
    async (raw) => {
      // Le risque de régression #1 de cette issue : une config cassée qui
      // mettrait TOUTES les routes protégées en panne. Elle doit se contenter
      // de désactiver le durcissement.
      //
      // ⚠ `console.warn` MOCKÉ (MEMO-007, revue S50 2e cycle) : `'pas valide'` traverse
      // `warnUnusableConfigOnce`, qui écrivait un bloc `stderr |` dans la sortie de la suite.
      // Un test vert ne doit rien écrire sur stderr, sinon le bruit devient la norme et une
      // vraie anomalie passe inaperçue. `canonical-host.test.ts` couvre le CONTENU du message ;
      // ici on ne fait que taire le canal.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        process.env.APP_CANONICAL_HOST = raw

        const response = await middleware(requestFromHost('evil.example'))

        expect(response.status).toBe(307)
        expect(new URL(response.headers.get('location')!).pathname).toBe('/fr/login')
      } finally {
        warn.mockRestore()
      }
    },
  )

  it('laisse le Location ABSOLU et parsable sans base (non-régression BUG-S45-001)', async () => {
    // Le durcissement ne doit surtout pas ramener un `Location` relatif : Next
    // le passe à `new URL(location)` SANS base → 500 sur toutes les routes
    // protégées. Même garde-fou que le bloc précédent, mais AVEC la config.
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = (await middleware(request('/fr/dashboard'))).headers.get('location')!

    expect(() => new URL(location)).not.toThrow()
    expect(new URL(location).pathname).toBe('/fr/login')
  })

  it('ne reporte toujours PAS la query string une fois l’origine réécrite', async () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = await locationFor(
      requestFromHost('evil.example', '/fr/dashboard?redirect=https://evil.example'),
    )

    expect(location.search).toBe('')
    expect(location.toString()).not.toContain('evil.example')
  })

  it('laisse passer sans redirection une route autorisée (aucun effet de bord)', async () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const response = await middleware(request('/fr/dashboard', { authenticated: true }))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})

describe('middleware — signature RS256 du cookie (#323)', () => {
  /**
   * #323 — la garde ne se contente plus de la PRÉSENCE du cookie : elle vérifie sa
   * signature avec la clé PUBLIQUE (`AUTH_JWT_PUBLIC_KEY`), ce que la migration de
   * `JwtService` en RS256 rend possible sans exposer de secret d'émission à l'Edge.
   *
   * Les jetons sont signés ICI avec une paire générée à la volée (aucune clé committée,
   * dépôt PUBLIC). La mécanique de vérification elle-même est couverte finement par
   * `src/lib/auth-token-verify.test.ts` ; ce bloc vérifie l'INTÉGRATION : le rejet doit
   * produire une REDIRECTION 307, jamais un throw — une exception non catchée ici
   * deviendrait un 500 sur toutes les routes protégées (BUG-S45-001).
   */
  const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

  let keyPair: CryptoKeyPair
  let publicKeyBase64: string

  const base64Url = (bytes: ArrayBuffer): string => {
    let binary = ''
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const segment = (value: object): string =>
    base64Url(new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer)

  const signToken = async (expSecondsFromNow: number): Promise<string> => {
    const input = `${segment({ alg: 'RS256', typ: 'JWT' })}.${segment({
      sub: 'alice',
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    })}`
    const signature = await crypto.subtle.sign(
      RS256.name,
      keyPair.privateKey,
      new TextEncoder().encode(input),
    )
    return `${input}.${base64Url(signature)}`
  }

  const requestWithToken = (token: string, pathname = '/fr/dashboard'): NextRequest => {
    const req = new NextRequest(new URL(pathname, ORIGIN), { headers: { 'accept-language': 'fr' } })
    req.cookies.set(AUTH_COOKIE_NAME, token)
    return req
  }

  beforeAll(async () => {
    keyPair = await crypto.subtle.generateKey(
      { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
      true,
      ['sign', 'verify'],
    )
    publicKeyBase64 = base64Url(await crypto.subtle.exportKey('spki', keyPair.publicKey))
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  })

  afterEach(() => {
    delete process.env.AUTH_JWT_PUBLIC_KEY
    // Le cache d'import de clé est global au module : sans reset, une clé posée par un
    // cas resterait active dans le suivant (dont ceux qui testent le DÉGRADÉ).
    resetVerificationKeyCache()
  })

  it('laisse passer un jeton BIEN SIGNÉ et non expiré', async () => {
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64

    const response = await middleware(requestWithToken(await signToken(3600)))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('REDIRIGE (307) un jeton à signature invalide — jamais un throw, jamais un 500', async () => {
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64
    const tampered = `${(await signToken(3600)).slice(0, -6)}AAAAAA`

    const response = await middleware(requestWithToken(tampered))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })

  it('REDIRIGE un cookie qui n’est pas un JWT du tout', async () => {
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64

    const response = await middleware(requestWithToken('ceci-n-est-pas-un-jwt'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })

  it('REDIRIGE un jeton EXPIRÉ (le trou fonctionnel que #323 vient fermer)', async () => {
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64

    const response = await middleware(requestWithToken(await signToken(-60)))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })

  it('DÉGRADE sans erreur quand la clé publique est ABSENTE (comportement d’avant #323)', async () => {
    const response = await middleware(requestWithToken('cookie-arbitraire'))

    expect(response.status).toBe(200)
  })

  it('DÉGRADE sans erreur quand la clé publique configurée est ILLISIBLE', async () => {
    // Fail-closed déconnecterait tout le monde sur une faute de frappe ; le backend
    // reste seul juge (401). Limite assumée, ADR-004 §Vérification de signature RS256.
    //
    // ⚠ `console.warn` MOCKÉ (MEMO-007, revue S50 2e cycle) : ce cas traverse
    // `warnUnreadableKeyOnce`, qui écrivait un bloc `stderr |` dans la sortie de la suite.
    // Le CONTENU du message est couvert par `auth-token-verify.test.ts` ; ici on ne fait
    // que taire le canal, pour qu'un run vert reste silencieux.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      process.env.AUTH_JWT_PUBLIC_KEY = 'pas-une-cle-publique'

      const response = await middleware(requestWithToken('cookie-arbitraire'))

      expect(response.status).toBe(200)
    } finally {
      warn.mockRestore()
    }
  })

  it('n’applique la vérification QUE sur les routes protégées', async () => {
    // Une route publique ne doit jamais coûter une vérification RSA ni être redirigée
    // à cause d'un cookie périmé traînant dans le navigateur.
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64

    const response = await middleware(requestWithToken(await signToken(-60), '/fr/home'))

    expect(response.status).toBe(200)
  })

  it('compose avec l’origine canonique (#322) : le rejet est redirigé vers l’hôte canonique', async () => {
    // Les deux durcissements du sprint doivent tenir ENSEMBLE : la 307 émise par la
    // vérification de signature passe bien par `withCanonicalOrigin`.
    process.env.AUTH_JWT_PUBLIC_KEY = publicKeyBase64
    process.env.APP_CANONICAL_HOST = 'app.mytimeline.test'

    const req = new NextRequest(new URL('/fr/dashboard', 'http://evil.example'), {
      headers: { 'accept-language': 'fr', host: 'evil.example' },
    })
    req.cookies.set(AUTH_COOKIE_NAME, 'jeton-forge')

    const location = new URL((await middleware(req)).headers.get('location')!)

    expect(location.host).toBe('app.mytimeline.test')
    expect(location.pathname).toBe('/fr/login')
  })
})

describe('middleware — matcher (audit sécurité S45)', () => {
  /**
   * ⚠ Les entrées du matcher sont compilées par le path-to-regexp EMBARQUÉ de Next,
   * avec les MÊMES options que `next/dist/lib/try-to-parse-path` — et non par un
   * `new RegExp('^' + source + '$')` reconstruit à la main. La version reconstruite
   * divergeait du moteur réel (pas de `[\/]?$` optionnel, `sensitive` non modélisé) :
   * c'est précisément ce qui avait laissé passer le contournement percent-encodé.
   *
   * Le module compilé n'expose pas de typings → `createRequire` + type explicite
   * (aucun `any`, aucun cast non prouvé).
   */
  const compileMatcher = ((): ((source: string) => RegExp) => {
    const requireCjs = createRequire(import.meta.url)
    const { pathToRegexp } = requireCjs('next/dist/compiled/path-to-regexp') as {
      pathToRegexp: (
        path: string,
        keys: unknown[],
        options: { delimiter: string; sensitive: boolean; strict: boolean },
      ) => RegExp
    }
    return (source) => pathToRegexp(source, [], { delimiter: '/', sensitive: false, strict: false })
  })()

  const assetExclusion = compileMatcher(config.matcher[0])
  const localeEntry = compileMatcher(config.matcher[1])

  /** `true` si Next INVOQUE le middleware sur ce pathname (union des 2 entrées). */
  const isHandled = (pathname: string): boolean =>
    assetExclusion.test(pathname) || localeEntry.test(pathname)

  it('N’exclut PLUS un chemin applicatif contenant un point', () => {
    // Avant correctif : `.*\..*` excluait tout chemin pointé → garde inactive
    // sur `/fr/products/<id contenant un point>`.
    expect(assetExclusion.test('/fr/products/foo.bar')).toBe(true)
    expect(assetExclusion.test('/fr/dashboard')).toBe(true)
  })

  it('exclut toujours les assets réels et les internes Next', () => {
    for (const pathname of [
      '/favicon.ico',
      '/images/logo.svg',
      '/next.svg',
      '/vercel.svg',
      '/images/dashboard-preview.svg',
      '/_next/static/chunk.js',
      '/api/auth/me',
    ]) {
      expect(isHandled(pathname), `${pathname} doit rester hors middleware`).toBe(false)
    }
  })

  it('ré-inclut tout chemin préfixé d’une locale, extension comprise', () => {
    // L'entrée 1 exclut `/fr/products/photo.png` (extension d'asset en fin) ;
    // l'entrée 2 le rattrape pour que la garde s'applique quand même.
    expect(assetExclusion.test('/fr/products/photo.png')).toBe(false)
    expect(isHandled('/fr/products/photo.png')).toBe(true)
    expect(config.matcher[1]).toBe('/:locale(fr|en|es|de)/:path*')
  })

  it('ne laisse AUCUN chemin non canonique passer entre les deux entrées', () => {
    // Contournement RÉSIDUEL corrigé en revue S45 : l'entrée 2 ne rattrape que les
    // locales LITTÉRALES. Tout chemin finissant par une extension d'asset mais dont
    // la locale n'est pas littérale (percent-encodée, slash doublé) échappait aux
    // DEUX entrées → middleware jamais invoqué → shell `(app)` servi à un anonyme,
    // le routeur Next décodant ensuite `%66r` en `fr`.
    for (const pathname of [
      '/%66r/products/photo.png', // locale percent-encodée + extension
      '/%66r/products/x.js',
      '/%66r/settings/x.css',
      '/%66r/timeline/a.svg',
      '/%66r/products/x.woff2',
      '/%66r/products/deep/nested/x.map',
      '/%2566r/dashboard', // double encodage
      '/%66r/products/photo%2Epng', // extension elle-même encodée
      '/fr//products/photo.png', // slash doublé : ni entrée 1 ni entrée 2 avant correctif
      '/fr//dashboard/x.png',
      '/%66r//products/x.css',
    ]) {
      expect(isHandled(pathname), `${pathname} doit être pris en charge par le middleware`).toBe(
        true,
      )
    }
  })

  it('couvre les chemins protégés canoniques, avec ou sans extension', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const segment of ['dashboard', 'products', 'timeline', 'settings']) {
        expect(isHandled(`/${locale}/${segment}`)).toBe(true)
        expect(isHandled(`/${locale}/${segment}/photo.png`)).toBe(true)
        expect(isHandled(`/${locale.toUpperCase()}/${segment}/photo.png`)).toBe(true)
      }
    }
  })

  it('garde l’alternation de locales du matcher alignée sur SUPPORTED_LOCALES (#235)', () => {
    // Le matcher NE PEUT PAS être calculé (analyse statique Next) : ce test est
    // le seul filet contre une locale ajoutée à `SUPPORTED_LOCALES` et oubliée ici.
    const alternation = /^\/:locale\(([^)]+)\)\/:path\*$/.exec(config.matcher[1])?.[1]

    expect(alternation?.split('|').sort()).toEqual([...SUPPORTED_LOCALES].sort())
  })
})
