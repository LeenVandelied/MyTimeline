import { act, renderHook } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DENSITY_ATTRIBUTE, DENSITY_STORAGE_KEY } from '@/lib/density'
import { useDensity } from './useDensity'

/**
 * #898 — `useDensity` ne sert plus qu'au CHOIX ; la valeur persistée est posée sur
 * <html> avant l'hydratation par `DENSITY_INIT_SCRIPT`. Le hook ne doit donc JAMAIS
 * réécrire la densité par défaut pendant l'hydratation (flash compact → normal →
 * compact sur une page qui monte la section Préférences dès le chargement).
 */

function Probe() {
  const { density } = useDensity()
  return <span data-testid="density">{density}</span>
}

function densityAttr(): string | null {
  return document.documentElement.getAttribute(DENSITY_ATTRIBUTE)
}

describe('useDensity (#898)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE)
  })

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE)
  })

  it("à l'hydratation, ne repasse jamais par la densité par défaut", async () => {
    // État laissé par le script précoce : valeur persistée déjà posée sur <html>.
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact')
    document.documentElement.setAttribute(DENSITY_ATTRIBUTE, 'compact')

    const container = document.createElement('div')
    // HTML serveur : rendu avec la densité par défaut (aucun accès au stockage).
    container.innerHTML = renderToString(<Probe />)
    document.body.appendChild(container)

    // Chaque ÉCRITURE de l'attribut, valeur par valeur. (Un MutationObserver qui relit
    // l'attribut dans son callback ne verrait que la valeur FINALE : oracle vacant,
    // constaté au contrôle négatif.)
    const written: string[] = []
    const html = document.documentElement
    const nativeSetAttribute = html.setAttribute.bind(html)
    const spy = vi.spyOn(html, 'setAttribute').mockImplementation((name, value) => {
      if (name === DENSITY_ATTRIBUTE) written.push(value)
      nativeSetAttribute(name, value)
    })

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, <Probe />)
    })
    spy.mockRestore()

    expect(written).not.toContain('normal')
    expect(densityAttr()).toBe('compact')
    expect(container.textContent).toBe('compact')

    act(() => root?.unmount())
    container.remove()
  })

  it('setDensity applique immédiatement et persiste', () => {
    const { result } = renderHook(() => useDensity())
    act(() => result.current.setDensity('comfortable'))

    expect(result.current.density).toBe('comfortable')
    expect(densityAttr()).toBe('comfortable')
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('comfortable')
  })

  it('monté après hydratation, relit la valeur persistée', () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact')
    const { result } = renderHook(() => useDensity())

    expect(result.current.density).toBe('compact')
    expect(densityAttr()).toBe('compact')
  })
})
