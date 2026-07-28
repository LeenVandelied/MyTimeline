// @vitest-environment node

import { createRequire } from 'node:module'

import { describe, it, expect, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

import middleware, { config } from './middleware'
import { AUTH_COOKIE_NAME } from '@/lib/auth-guard-paths'
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
    (pathname) => {
      const response = middleware(request(pathname))

      expect(response.status).toBe(307)
      expect(redirectTarget(response)).toBe('/fr/login')
      // Aucun rewrite interne : la requête ne doit PAS atteindre le rendu.
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    },
  )

  it('redirige vers la page de connexion de la locale COURANTE', () => {
    expect(redirectTarget(middleware(request('/en/dashboard')))).toBe('/en/login')
    expect(redirectTarget(middleware(request('/es/timeline')))).toBe('/es/login')
    expect(redirectTarget(middleware(request('/de/products')))).toBe('/de/login')
  })

  it('protège aussi les sous-routes (détail produit)', () => {
    const response = middleware(request('/fr/products/9f4c1e2a-0000-4000-8000-000000000000'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr/login')
  })

  it('ne reporte PAS la query string dans la cible (pas d’open-redirect)', () => {
    const response = middleware(request('/fr/dashboard?redirect=https://evil.example'))
    const location = response.headers.get('location')

    expect(new URL(location!, ORIGIN).search).toBe('')
    expect(location).not.toContain('evil.example')
  })
})

describe('middleware — cookie jwt présent', () => {
  it.each(['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings'])(
    'laisse passer %s (délégation à next-intl, aucune redirection auth)',
    (pathname) => {
      const response = middleware(request(pathname, { authenticated: true }))

      expect(redirectTarget(response)).not.toBe('/fr/login')
      expect(response.status).toBe(200)
    },
  )

  it('ne vérifie NI la signature NI l’expiration (limite assumée, ADR-004)', () => {
    // Un cookie `jwt` arbitraire suffit à passer la garde : c'est `JwtFilter`
    // côté backend (401) + `useAuthGuard` côté client qui tranchent réellement.
    const req = new NextRequest(new URL('/fr/dashboard', ORIGIN))
    req.cookies.set(AUTH_COOKIE_NAME, 'ceci-n-est-pas-un-jwt')

    expect(redirectTarget(middleware(req))).not.toBe('/fr/login')
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
  ])('laisse passer %s pour un anonyme', (pathname) => {
    expect(redirectTarget(middleware(request(pathname)))).not.toBe('/fr/login')
  })
})

describe('middleware — non-régression i18n (#235)', () => {
  it('préfixe toujours un chemin nu avec la locale (localePrefix: always)', () => {
    const response = middleware(request('/'))

    expect(response.status).toBe(307)
    expect(redirectTarget(response)).toBe('/fr')
  })

  it('laisse next-intl localiser /dashboard AVANT que la garde ne s’applique', () => {
    // La garde ignore les chemins non préfixés : next-intl redirige d'abord vers
    // /fr/dashboard, requête sur laquelle le middleware re-tourne et redirige
    // alors vers /fr/login (ADR-004 §Décision 3). Aucune fuite : le 1er hop est
    // une redirection, pas un rendu.
    const first = middleware(request('/dashboard'))
    expect(first.status).toBe(307)
    expect(redirectTarget(first)).toBe('/fr/dashboard')

    const second = middleware(request(redirectTarget(first)!))
    expect(second.status).toBe(307)
    expect(redirectTarget(second)).toBe('/fr/login')
  })

  it('accepte toutes les locales supportées (es/de livrées S26)', () => {
    // Itère SUPPORTED_LOCALES — une liste en dur ici raterait une locale ajoutée
    // à la source de vérité (régression #235).
    for (const locale of SUPPORTED_LOCALES) {
      const response = middleware(request(`/${locale}/home`))
      expect(response.status).toBe(200)
    }
  })

  it('ne traite pas une locale non supportée comme une locale', () => {
    // `/it/dashboard` : `it` n'est pas une locale → next-intl le préfixe.
    const response = middleware(request('/it/dashboard'))
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

  const locationOf = (pathname: string): string => {
    const location = middleware(request(pathname)).headers.get('location')
    expect(location).not.toBeNull()
    return location!
  }

  it.each(['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings', '/fr/%64ashboard'])(
    'émet sur %s un Location ABSOLU, parsable sans base',
    (pathname) => {
      const location = locationOf(pathname)

      // Le cœur du garde-fou : ce que Next fera du `Location`. Un chemin
      // relatif lève ici, exactement comme en production.
      expect(() => new URL(location)).not.toThrow()
      expect(new URL(location).pathname).toBe('/fr/login')
    },
  )

  it('survit à la normalisation RÉELLE de Next (adapter.js → new NextURL)', () => {
    // Reproduction fidèle de `adapter.js` : c'est CETTE ligne qui jetait
    // `ERR_INVALID_URL { input: '/fr/login' }` et transformait la 307 en 500.
    expect(() => new NextURL(locationOf('/fr/dashboard'), { forceLocale: false })).not.toThrow()
  })

  it('ne reporte toujours PAS la query string (pas d’open-redirect)', () => {
    const location = middleware(request('/fr/dashboard?redirect=https://evil.example')).headers.get(
      'location',
    )!

    expect(new URL(location).search).toBe('')
    expect(location).not.toContain('evil.example')
  })

  it('DÉGRADÉ (APP_CANONICAL_HOST absente) : l’origine du Location suit la requête', () => {
    // Comportement d'AVANT #322, conservé tel quel quand la variable n'est pas
    // configurée (dev local, CI, preview). C'est le dégradé assumé : une garde
    // qui casse partout serait pire que le risque qu'elle corrige
    // (BUG-S45-001). Ancré ici pour que le compromis reste VISIBLE.
    const location = middleware(requestFromHost('evil.example')).headers.get('location')!

    expect(new URL(location).pathname).toBe('/fr/login')
    expect(new URL(location).host).toBe('evil.example')
  })

  it('protège un segment percent-encodé (contournement corrigé S45)', () => {
    const response = middleware(request('/fr/%64ashboard'))

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

  const locationFor = (req: NextRequest): URL =>
    new URL(middleware(req).headers.get('location')!)

  it('réécrit l’origine quand la requête arrive sur un Host FALSIFIÉ', () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = locationFor(requestFromHost('evil.example'))

    expect(location.host).toBe(CANONICAL)
    expect(location.pathname).toBe('/fr/login')
    // L'hôte hostile ne doit subsister NULLE PART dans l'en-tête.
    expect(location.toString()).not.toContain('evil.example')
  })

  it('ne bouge PAS un Host légitime (non-régression du cas nominal)', () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect(locationFor(requestFromHost(CANONICAL)).host).toBe(CANONICAL)
  })

  it('n’emporte PAS le port d’écoute interne dans la cible', () => {
    // Cas réel du self-hosting : le serveur écoute sur :3000 dans le conteneur
    // et `request.nextUrl` porte donc ce port, absent du domaine public.
    // Régression trouvée en interrogeant un `next start` réel, pas en unitaire.
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect(locationFor(requestFromHost('0.0.0.0:3000')).toString()).toBe(
      `http://${CANONICAL}/fr/login`,
    )
  })

  it('conserve le port quand la configuration en déclare un (dev/preview)', () => {
    process.env.APP_CANONICAL_HOST = 'localhost:3000'

    expect(locationFor(requestFromHost('evil.example')).toString()).toBe(
      'http://localhost:3000/fr/login',
    )
  })

  it('conserve les hôtes secondaires déclarés (preview / staging non cassés)', () => {
    // Le risque signalé par l'issue elle-même : une liste mal synchronisée qui
    // renvoie les environnements non-prod vers la prod.
    process.env.APP_CANONICAL_HOST = `${CANONICAL},preview.mytimeline.test`

    expect(locationFor(requestFromHost('preview.mytimeline.test')).host).toBe(
      'preview.mytimeline.test',
    )
  })

  it('bascule vers la PREMIÈRE entrée quand l’hôte n’est dans aucune (fail-closed)', () => {
    process.env.APP_CANONICAL_HOST = `${CANONICAL},preview.mytimeline.test`

    expect(locationFor(requestFromHost('evil.example')).host).toBe(CANONICAL)
  })

  it('impose aussi le protocole quand la config déclare une origine complète', () => {
    process.env.APP_CANONICAL_HOST = `https://${CANONICAL}`

    expect(locationFor(requestFromHost('evil.example')).toString()).toBe(
      `https://${CANONICAL}/fr/login`,
    )
  })

  it('durcit AUSSI les redirections de next-intl, pas seulement la garde', () => {
    // `/` → `/fr` et `/dashboard` → `/fr/dashboard` dérivent de la même
    // `request.nextUrl`. Ne durcir que la 307 de la garde laisserait le même
    // vecteur ouvert sur des chemins BIEN plus atteignables (la racine).
    process.env.APP_CANONICAL_HOST = CANONICAL

    expect(locationFor(requestFromHost('evil.example', '/')).host).toBe(CANONICAL)
    expect(locationFor(requestFromHost('evil.example', '/dashboard')).host).toBe(CANONICAL)
  })

  it.each(['', '   ', 'pas valide', ',,,'])(
    'retombe sur le dégradé (jamais 500, jamais de boucle) pour APP_CANONICAL_HOST=%o',
    (raw) => {
      // Le risque de régression #1 de cette issue : une config cassée qui
      // mettrait TOUTES les routes protégées en panne. Elle doit se contenter
      // de désactiver le durcissement.
      process.env.APP_CANONICAL_HOST = raw

      const response = middleware(requestFromHost('evil.example'))

      expect(response.status).toBe(307)
      expect(new URL(response.headers.get('location')!).pathname).toBe('/fr/login')
    },
  )

  it('laisse le Location ABSOLU et parsable sans base (non-régression BUG-S45-001)', () => {
    // Le durcissement ne doit surtout pas ramener un `Location` relatif : Next
    // le passe à `new URL(location)` SANS base → 500 sur toutes les routes
    // protégées. Même garde-fou que le bloc précédent, mais AVEC la config.
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = middleware(request('/fr/dashboard')).headers.get('location')!

    expect(() => new URL(location)).not.toThrow()
    expect(new URL(location).pathname).toBe('/fr/login')
  })

  it('ne reporte toujours PAS la query string une fois l’origine réécrite', () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const location = locationFor(requestFromHost('evil.example', '/fr/dashboard?redirect=https://evil.example'))

    expect(location.search).toBe('')
    expect(location.toString()).not.toContain('evil.example')
  })

  it('laisse passer sans redirection une route autorisée (aucun effet de bord)', () => {
    process.env.APP_CANONICAL_HOST = CANONICAL

    const response = middleware(request('/fr/dashboard', { authenticated: true }))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
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
