import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSectionAnimation } from './useSectionAnimation'

/**
 * #56 — effet de révélation au scroll, extrait du monolithe HomePage.
 *
 * jsdom N'IMPLÉMENTE PAS `IntersectionObserver` (et `vitest.setup.ts` ne le stubbe
 * pas) : le repli est donc le chemin par défaut ici, et c'est précisément pourquoi il
 * existe — sans lui, `.section-animation { opacity: 0 }` laisserait la landing
 * invisible partout où l'API manque.
 */

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void

/** Pose des sections dans le DOM et rend leur nettoyage automatique. */
function mountSections(count: number): Element[] {
  document.body.innerHTML = Array.from(
    { length: count },
    () => '<section class="section-animation"></section>',
  ).join('')
  return Array.from(document.querySelectorAll('.section-animation'))
}

afterEach(() => {
  document.body.innerHTML = ''
  Reflect.deleteProperty(globalThis, 'IntersectionObserver')
})

describe('useSectionAnimation', () => {
  it('révèle tout immédiatement quand IntersectionObserver est absent', () => {
    const sections = mountSections(3)

    renderHook(() => useSectionAnimation())

    sections.forEach((section) => expect(section.classList.contains('visible')).toBe(true))
  })

  it('n’explose pas quand aucune section n’est présente', () => {
    document.body.innerHTML = '<main></main>'
    expect(() => renderHook(() => useSectionAnimation())).not.toThrow()
  })

  describe('avec IntersectionObserver disponible', () => {
    const observe = vi.fn()
    const unobserve = vi.fn()
    const disconnect = vi.fn()
    let notify: ObserverCallback

    function installObserver() {
      observe.mockClear()
      unobserve.mockClear()
      disconnect.mockClear()

      class FakeObserver {
        constructor(callback: ObserverCallback) {
          notify = callback
        }
        observe = observe
        unobserve = unobserve
        disconnect = disconnect
      }

      Reflect.set(globalThis, 'IntersectionObserver', FakeObserver)
    }

    it('observe chaque section et ne révèle rien avant intersection', () => {
      installObserver()
      const sections = mountSections(2)

      renderHook(() => useSectionAnimation())

      expect(observe).toHaveBeenCalledTimes(2)
      sections.forEach((section) => expect(section.classList.contains('visible')).toBe(false))
    })

    it('révèle puis cesse d’observer une section devenue visible', () => {
      installObserver()
      const [first, second] = mountSections(2)

      renderHook(() => useSectionAnimation())
      notify([
        { isIntersecting: true, target: first },
        { isIntersecting: false, target: second },
      ])

      expect(first.classList.contains('visible')).toBe(true)
      expect(second.classList.contains('visible')).toBe(false)
      expect(unobserve).toHaveBeenCalledTimes(1)
      expect(unobserve).toHaveBeenCalledWith(first)
    })

    it('déconnecte l’observateur au démontage', () => {
      installObserver()
      mountSections(1)

      const { unmount } = renderHook(() => useSectionAnimation())
      unmount()

      expect(disconnect).toHaveBeenCalledOnce()
    })
  })
})
