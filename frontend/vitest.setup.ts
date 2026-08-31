import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Setup global Vitest.
 * - jest-dom matchers (`toBeInTheDocument`, …).
 * - cleanup RTL après chaque test (isole le DOM).
 * - mock `next/font` : en jsdom le loader de polices Google échoue ; on renvoie
 *   des classes/variables stables pour ne pas casser le rendu des composants.
 * - mock `next/navigation` : hooks routeur indisponibles hors contexte App Router.
 */

afterEach(() => {
  cleanup()
})

vi.mock('next/font/google', () => ({
  Archivo: () => ({
    className: 'mock-archivo',
    variable: '--font-display',
    style: { fontFamily: 'Archivo' },
  }),
  IBM_Plex_Mono: () => ({
    className: 'mock-ibm-plex-mono',
    variable: '--font-mono',
    style: { fontFamily: 'IBM Plex Mono' },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// ResizeObserver non implémenté dans jsdom — requis par Radix (Select, Popover…).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// matchMedia non implémenté dans jsdom — requis par next-themes / composants responsive.
// Garde `typeof window` (#302) : ce setup s'applique AUSSI aux fichiers déclarant
// `// @vitest-environment node` (ex. `middleware.test.ts`, qui a besoin des
// primitives Fetch globales absentes de jsdom). Sans la garde, ils échouaient
// à la collecte sur `window is not defined`. Même garde qu'au bloc Radix ci-dessous.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

/**
 * jsdom n'implémente pas les Pointer Capture APIs ni `scrollIntoView`, requis
 * par Radix Select (et d'autres primitives Radix) au clic sur le trigger. Sans
 * ces stubs, le rendu du menu déroulant lève `hasPointerCapture is not a
 * function`. On les neutralise globalement (aucun composant ne dépend de leur
 * comportement réel en test).
 */
if (typeof window !== 'undefined') {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
  /**
   * #449 — jsdom n'implémente pas non plus `Element.scrollTo` : sans ce stub,
   * `TimelineView` lève `el.scrollTo is not a function` au montage (44 tests).
   *
   * Le stub REPORTE les valeurs sur `scrollLeft`/`scrollTop` au lieu de ne rien
   * faire : un no-op ferait diverger silencieusement les tests qui lisent ces
   * propriétés après un défilement programmatique. ⚠ Cela ne rend PAS le
   * défilement observable pour autant — jsdom ne clampe pas `scrollLeft` (il
   * relit ce qu'on lui écrit) : toute affirmation sur un défilement RÉEL exige
   * un E2E, cf. la spec #449 de `e2e/timeline.spec.ts`.
   */
  if (!window.Element.prototype.scrollTo) {
    window.Element.prototype.scrollTo = function scrollToStub(
      this: Element,
      xOrOptions?: number | ScrollToOptions,
      y?: number,
    ): void {
      if (typeof xOrOptions === 'object' && xOrOptions !== null) {
        if (xOrOptions.left !== undefined) this.scrollLeft = xOrOptions.left
        if (xOrOptions.top !== undefined) this.scrollTop = xOrOptions.top
        return
      }
      if (xOrOptions !== undefined) this.scrollLeft = xOrOptions
      if (y !== undefined) this.scrollTop = y
    }
  }
}
