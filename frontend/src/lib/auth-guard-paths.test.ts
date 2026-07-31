import { describe, it, expect } from 'vitest'

import {
  AUTH_COOKIE_NAME,
  LOGIN_SEGMENT,
  PROTECTED_APP_SEGMENTS,
  PROTECTED_EXTRA_SEGMENTS,
  PROTECTED_SEGMENTS,
  buildLoginPathname,
  isProtectedPathname,
  splitLocalizedPathname,
} from '@/lib/auth-guard-paths'
import { SUPPORTED_LOCALES } from '@/i18n/locales'

/**
 * #302 — Logique de chemins de la garde serveur (ADR-004).
 *
 * Ce fichier ANCRE la liste des segments protégés : ajouter un segment sous
 * `frontend/app/[locale]/(app)/` sans l'ajouter à `PROTECTED_APP_SEGMENTS` ne
 * casse AUCUN test existant (la garde reste silencieusement inactive). Le test
 * `PROTECTED_APP_SEGMENTS` ci-dessous est donc un rappel explicite, pas un filet.
 */
describe('auth-guard-paths — contrat', () => {
  it('nomme le cookie exactement comme JwtFilter.java:48', () => {
    expect(AUTH_COOKIE_NAME).toBe('jwt')
  })

  it('liste les segments du groupe (app) tels que présents sur le disque', () => {
    // Miroir de `frontend/app/[locale]/(app)/` — à mettre à jour EN MÊME TEMPS
    // que le système de fichiers (cf. ADR-004 §Limites).
    expect([...PROTECTED_APP_SEGMENTS]).toEqual(['dashboard', 'products', 'settings', 'timeline'])
  })

  it('protège settings, passé sous le groupe (app) en #299', () => {
    // #299 — la route a MIGRÉ de `app/[locale]/settings/` vers
    // `app/[locale]/(app)/settings/`. La garde serveur doit couvrir exactement
    // le même chemin qu'avant : c'est le seul point du déplacement qui pouvait
    // silencieusement ouvrir `/settings` aux anonymes.
    expect([...PROTECTED_EXTRA_SEGMENTS]).toEqual([])
    expect(PROTECTED_SEGMENTS).toContain('settings')
    expect(isProtectedPathname('/fr/settings')).toBe(true)
    expect(isProtectedPathname('/en/settings')).toBe(true)
  })

  it("n'inclut PAS les routes publiques (sinon boucle de redirection)", () => {
    for (const publicSegment of [
      LOGIN_SEGMENT,
      'register',
      'forgot-password',
      'reset-password',
      'home',
      'privacy',
      'terms',
    ]) {
      expect(PROTECTED_SEGMENTS).not.toContain(publicSegment)
    }
  })
})

describe('splitLocalizedPathname', () => {
  it('extrait locale et premier segment', () => {
    expect(splitLocalizedPathname('/fr/dashboard')).toEqual({
      locale: 'fr',
      segment: 'dashboard',
    })
  })

  it('ignore les slashes superflus (trailing / doublons)', () => {
    expect(splitLocalizedPathname('/fr/timeline/')).toEqual({
      locale: 'fr',
      segment: 'timeline',
    })
  })

  it('ne garde que le PREMIER segment sur une route imbriquée', () => {
    expect(splitLocalizedPathname('/en/products/9f4c1e2a')).toEqual({
      locale: 'en',
      segment: 'products',
    })
  })

  it('renvoie segment null sur la racine localisée', () => {
    expect(splitLocalizedPathname('/de')).toEqual({ locale: 'de', segment: null })
  })

  it('renvoie null quand le chemin n’est pas préfixé par une locale supportée', () => {
    // next-intl redirigera d'abord ces chemins ; la garde s'appliquera au tour suivant.
    expect(splitLocalizedPathname('/dashboard')).toBeNull()
    expect(splitLocalizedPathname('/it/dashboard')).toBeNull()
    expect(splitLocalizedPathname('/')).toBeNull()
  })
})

describe('isProtectedPathname', () => {
  it.each([...SUPPORTED_LOCALES])('protège toutes les routes (app) en %s', (locale) => {
    for (const segment of PROTECTED_SEGMENTS) {
      expect(isProtectedPathname(`/${locale}/${segment}`)).toBe(true)
    }
  })

  it('protège les sous-routes (ex. détail produit)', () => {
    expect(isProtectedPathname('/fr/products/9f4c1e2a-0000-4000-8000-000000000000')).toBe(true)
  })

  it('ne protège pas les routes publiques', () => {
    for (const pathname of [
      '/fr/login',
      '/fr/register',
      '/fr/forgot-password',
      '/fr/reset-password',
      '/fr/home',
      '/fr/privacy',
      '/fr/terms',
      '/fr',
      '/',
    ]) {
      expect(isProtectedPathname(pathname)).toBe(false)
    }
  })

  it('ne protège pas un chemin non préfixé (next-intl redirige d’abord)', () => {
    expect(isProtectedPathname('/dashboard')).toBe(false)
  })

  it('résiste à un contournement par la casse', () => {
    expect(isProtectedPathname('/fr/DASHBOARD')).toBe(true)
    expect(isProtectedPathname('/fr/DaShBoArD')).toBe(true)
  })

  it('ne confond pas un segment préfixé par un segment protégé', () => {
    expect(isProtectedPathname('/fr/dashboards')).toBe(false)
    expect(isProtectedPathname('/fr/timeline-public')).toBe(false)
  })

  // --- Contournement par percent-encoding (audit sécurité S45) ---
  // `nextUrl.pathname` n'est pas décodé : sans décodage par segment, `%64ashboard`
  // ne matchait aucun segment protégé et la garde sautait.

  it('résiste à un contournement par percent-encoding du segment', () => {
    expect(isProtectedPathname('/fr/%64ashboard')).toBe(true) // %64 = 'd'
    expect(isProtectedPathname('/fr/%53ettings')).toBe(true) // %53 = 'S' (+ insensible casse)
    expect(isProtectedPathname('/fr/%70roducts/9f4c1e2a')).toBe(true) // %70 = 'p'
  })

  it('résiste à un contournement par percent-encoding de la LOCALE', () => {
    expect(isProtectedPathname('/%66r/dashboard')).toBe(true) // %66 = 'f'
    expect(splitLocalizedPathname('/%66r/dashboard')).toEqual({
      locale: 'fr',
      segment: 'dashboard',
    })
  })

  it('ne décode QU’UN niveau (aligné sur le routeur Next)', () => {
    // `/fr/%2564ashboard` → segment réel `%64ashboard` : aucune route ne
    // correspond. Le décoder deux fois divergerait du routage réel.
    expect(isProtectedPathname('/fr/%2564ashboard')).toBe(false)
  })

  it('traite un segment au percent-encoding MALFORMÉ comme protégé (fail-closed)', () => {
    expect(isProtectedPathname('/fr/%zz')).toBe(true)
    expect(isProtectedPathname('/fr/%')).toBe(true)
    expect(isProtectedPathname('/fr/dash%E0%A4board')).toBe(true)
  })

  it('ne fait pas dérailler les cas nominaux publics après décodage', () => {
    expect(isProtectedPathname('/fr/login')).toBe(false)
    expect(isProtectedPathname('/fr/forgot-password')).toBe(false)
    expect(isProtectedPathname('/fr/reset-password')).toBe(false)
  })
})

describe('buildLoginPathname', () => {
  it.each([...SUPPORTED_LOCALES])('préfixe toujours la locale (%s)', (locale) => {
    expect(buildLoginPathname(locale)).toBe(`/${locale}/login`)
  })

  it('produit une cible NON protégée (pas de boucle de redirection)', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isProtectedPathname(buildLoginPathname(locale))).toBe(false)
    }
  })
})
