// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'

import middleware from './middleware'
import { AUTH_COOKIE_NAME } from '@/lib/auth-guard-paths'

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

  it('accepte les 4 locales supportées (es/de livrées S26)', () => {
    for (const locale of ['fr', 'en', 'es', 'de']) {
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
