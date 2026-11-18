import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DENSITY,
  DENSITY_ATTRIBUTE,
  DENSITY_INIT_SCRIPT,
  DENSITY_OPTIONS,
  DENSITY_STORAGE_KEY,
  isDensity,
} from './density'

/**
 * #898 — Script d'application précoce de la densité. Il est exécuté ICI tel que le
 * navigateur l'exécutera (texte brut, hors bundle) : un test sur une fonction
 * TypeScript équivalente ne prouverait rien sur la chaîne réellement servie.
 * Le fait que le layout la serve, et qu'elle s'applique sur toutes les pages après
 * rechargement, est prouvé par `e2e/sprint-121-density-persisted.spec.ts`.
 */
function runInitScript(): void {
  new Function(DENSITY_INIT_SCRIPT)()
}

function currentDensity(): string | null {
  return document.documentElement.getAttribute(DENSITY_ATTRIBUTE)
}

describe('DENSITY_INIT_SCRIPT (#898)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Valeur résiduelle impossible à confondre avec un résultat attendu (PIT-S120-001).
    document.documentElement.setAttribute(DENSITY_ATTRIBUTE, 'residuel')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE)
  })

  it.each(DENSITY_OPTIONS)('applique la densité persistée « %s »', (option) => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, option)
    runInitScript()
    expect(currentDensity()).toBe(option)
  })

  it('sans valeur persistée → densité par défaut', () => {
    runInitScript()
    expect(currentDensity()).toBe(DEFAULT_DENSITY)
  })

  it.each(['huge', '', 'COMPACT', ' compact'])(
    'valeur invalide « %s » → densité par défaut',
    (raw) => {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, raw)
      runInitScript()
      expect(currentDensity()).toBe(DEFAULT_DENSITY)
    },
  )

  it('localStorage inaccessible → densité par défaut, sans lever', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(runInitScript).not.toThrow()
    expect(currentDensity()).toBe(DEFAULT_DENSITY)
  })

  it('est généré depuis les constantes partagées (clé, attribut)', () => {
    expect(DENSITY_INIT_SCRIPT).toContain(JSON.stringify(DENSITY_STORAGE_KEY))
    expect(DENSITY_INIT_SCRIPT).toContain(JSON.stringify(DENSITY_ATTRIBUTE))
  })
})

describe('isDensity', () => {
  it('accepte les seules options déclarées', () => {
    for (const option of DENSITY_OPTIONS) expect(isDensity(option)).toBe(true)
    expect(isDensity(null)).toBe(false)
    expect(isDensity('huge')).toBe(false)
  })
})
