import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineResponsive } from './TimelineResponsive'

/**
 * #328 — Le scroll horizontal de la frise mobile survit à la rotation.
 *
 * `zoom` / `viewportStart` / la sélection étaient déjà hissés dans
 * `TimelineResponsive` (#63/#64) ; `scrollLeft` restait un état DOM porté par la
 * variante démontée → remis à 0 à chaque rotation (mesuré 400 → 0). On vérifie
 * ici le transport de la position à travers le démontage/remontage de variante,
 * ET la resynchronisation de la fenêtre minimap (`aria-valuenow` du slider).
 *
 * jsdom ne fait pas de layout : `clientWidth === 0`, donc `viewportRatio` tombe
 * sur le plancher 0.02 de la minimap et le centrage initial vaut exactement
 * `todayLeftPx`. Ces valeurs sont dérivées du DOM (largeur du rail) et jamais
 * codées en dur.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const TODAY = new Date(2026, 6, 15)

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: { productId: 'p1', productName: 'Lait bio', category: 'Frais', type: 'duration' },
  },
  {
    id: 'e2',
    title: 'Livraison pain',
    start: '2026-08-20',
    end: '2026-08-20',
    allDay: true,
    resourceId: 'p2',
    color: '#4FA459',
    extendedProps: {
      productId: 'p2',
      productName: 'Pain',
      category: 'Boulangerie',
      type: 'single',
    },
  },
]

const RESOURCES: Resource[] = [
  { id: 'p1', title: 'Lait bio', category: 'Frais' },
  { id: 'p2', title: 'Pain', category: 'Boulangerie' },
]

const isPortrait = (query: string) => query.includes('portrait')
/** Seule la requête paysage contient « landscape » → minimap NON forcée masquée. */
const isLandscape = (query: string) => query.includes('landscape')

/**
 * `matchMedia` mutable : `rotate()` ré-évalue les MediaQueryList vivantes et émet
 * `change` — `useMediaQuery` bascule donc SANS remontage de l'arbre, ce qui est
 * la condition même du scénario testé (l'état vit au-dessus des variantes).
 */
function mockMatchMedia(initial: (query: string) => boolean) {
  const original = window.matchMedia
  let matcher = initial
  const lists: Array<{
    query: string
    matches: boolean
    listeners: Set<(e: MediaQueryListEvent) => void>
  }> = []

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const entry = {
      query,
      matches: matcher(query),
      listeners: new Set<(e: MediaQueryListEvent) => void>(),
    }
    lists.push(entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => entry.listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        entry.listeners.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.delete(cb),
      dispatchEvent: vi.fn(),
    }
  })

  return {
    rotate(next: (query: string) => boolean) {
      matcher = next
      act(() => {
        for (const entry of lists) {
          const value = matcher(entry.query)
          if (value !== entry.matches) {
            entry.matches = value
            const ev = { matches: value, media: entry.query } as MediaQueryListEvent
            entry.listeners.forEach((cb) => cb(ev))
          }
        }
      })
    },
    restore() {
      window.matchMedia = original
    },
  }
}

/** Largeur du rail lue sur le DOM (source de vérité de l'échelle du zoom). */
function railWidth(): number {
  const rail = document.querySelector('.mt-tlm__rail') as HTMLElement | null
  expect(rail).not.toBeNull()
  return Number.parseFloat(rail!.style.width)
}

function scrollEl(): HTMLElement {
  return screen.getByTestId('timeline-scroll')
}

function minimapValueNow(): number {
  return Number(screen.getByTestId('timeline-minimap-viewport').getAttribute('aria-valuenow'))
}

function renderResponsive() {
  return render(
    <TimelineResponsive
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={TODAY}
    />,
  )
}

describe('#328 — rotation portrait ↔ paysage et scroll horizontal', () => {
  let media: ReturnType<typeof mockMatchMedia> | null = null

  afterEach(() => {
    media?.restore()
    media = null
  })

  it('portrait → paysage : restaure scrollLeft sur la variante remontée', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    const before = scrollEl()
    // L'utilisateur fait défiler la frise (état purement DOM avant #328).
    act(() => {
      before.scrollLeft = 400
    })
    expect(before.scrollLeft).toBe(400)

    media.rotate(isLandscape)

    expect(screen.queryByTestId('timeline-mobile-portrait')).toBeNull()
    expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
    const after = scrollEl()
    // Élément DOM RÉELLEMENT différent (sinon le test ne prouverait rien).
    expect(after).not.toBe(before)
    expect(after.scrollLeft).toBe(400)
  })

  it('paysage → portrait : restaure aussi au retour', () => {
    media = mockMatchMedia(isLandscape)
    renderResponsive()

    expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
    act(() => {
      scrollEl().scrollLeft = 250
    })

    media.rotate(isPortrait)

    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    expect(scrollEl().scrollLeft).toBe(250)
  })

  it('resynchronise la fenêtre minimap sur le scroll restauré', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    const width = railWidth()
    expect(width).toBeGreaterThan(0)
    act(() => {
      scrollEl().scrollLeft = 400
    })

    media.rotate(isLandscape)

    // `aria-valuenow` = fraction de départ de la fenêtre visible, en % arrondi.
    expect(minimapValueNow()).toBe(Math.round((400 / width) * 100))
    expect(scrollEl().scrollLeft).toBe(400)
  })

  it('centre sur aujourd’hui au PREMIER montage seulement (pas à la rotation)', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    // clientWidth = 0 sous jsdom → la cible du centrage vaut exactement todayLeftPx,
    // lisible sur le repère « today » du rail.
    const todayLeftPx = Number.parseFloat(
      (document.querySelector('.mt-tlm__today') as HTMLElement).style.left,
    )
    expect(todayLeftPx).toBeGreaterThan(0)
    expect(scrollEl().scrollLeft).toBe(todayLeftPx)

    // Position utilisateur ≠ centrage : la rotation ne doit PAS rejouer le centrage.
    act(() => {
      scrollEl().scrollLeft = todayLeftPx + 180
    })
    media.rotate(isLandscape)
    expect(scrollEl().scrollLeft).toBe(todayLeftPx + 180)
  })
})
