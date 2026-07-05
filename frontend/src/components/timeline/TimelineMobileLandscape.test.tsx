import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineMobileLandscape } from './TimelineMobileLandscape'
import { TimelineResponsive } from './TimelineResponsive'

/**
 * #64 — Tests vue mobile PAYSAGE + transition portrait ↔ paysage sans perte
 * d'état (jsdom). next-intl mocké → assertions locale-agnostiques sur les clés.
 * Couvre : rendu paysage + lanes denses, drawer latéral (PAS bottom sheet),
 * minimap masquable (forcée hauteur + toggle), gestes (long-press/pinch/⋯) parité
 * portrait, data-testid E2E préservés (#163), et le SWITCH d'orientation qui
 * conserve zoom + événement sélectionné (état hissé dans TimelineResponsive).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait longue durée à tronquer',
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
    start: '2026-07-20',
    end: '2026-07-20',
    allDay: true,
    resourceId: 'p2',
    color: '#4FA459',
    extendedProps: { productId: 'p2', productName: 'Pain', category: 'Boulangerie', type: 'single' },
  },
]

const RESOURCES: Resource[] = [
  { id: 'p1', title: 'Lait bio', category: 'Frais' },
  { id: 'p2', title: 'Pain', category: 'Boulangerie' },
]

/**
 * Mock matchMedia paramétrable par prédicat sur la query. Permet de simuler
 * `orientation: landscape` + seuils de hauteur (le mock global renvoie
 * `matches:false`). Le matcher est MUTABLE (`controller.setMatcher`) et
 * `controller.rotate()` ré-évalue toutes les MediaQueryList vivantes puis émet
 * l'événement `change` sur celles qui ont changé — c'est ainsi que
 * `useMediaQuery` (listener `change`) apprend une rotation SANS remontage de
 * l'arbre (indispensable pour tester la transition sans perte d'état).
 */
interface MatchMediaController {
  setMatcher: (m: (query: string) => boolean) => void
  rotate: (m: (query: string) => boolean) => void
  restore: () => void
}

function mockMatchMedia(initial: (query: string) => boolean): MatchMediaController {
  const original = window.matchMedia
  let matcher = initial
  const lists: Array<{
    query: string
    matches: boolean
    listeners: Set<(e: MediaQueryListEvent) => void>
  }> = []

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const entry = { query, matches: matcher(query), listeners: new Set<(e: MediaQueryListEvent) => void>() }
    lists.push(entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => entry.listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => entry.listeners.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.delete(cb),
      dispatchEvent: vi.fn(),
    }
  })

  const reevaluate = () => {
    for (const entry of lists) {
      const next = matcher(entry.query)
      if (next !== entry.matches) {
        entry.matches = next
        const ev = { matches: next, media: entry.query } as MediaQueryListEvent
        entry.listeners.forEach((cb) => cb(ev))
      }
    }
  }

  return {
    setMatcher(m) {
      matcher = m
    },
    rotate(m) {
      matcher = m
      act(() => {
        reevaluate()
      })
    },
    restore() {
      window.matchMedia = original
    },
  }
}

function renderLandscape(
  props: Partial<React.ComponentProps<typeof TimelineMobileLandscape>> = {},
) {
  return render(
    <TimelineMobileLandscape
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      {...props}
    />,
  )
}

describe('TimelineMobileLandscape', () => {
  it('rend la variante paysage (lanes denses) + events + règle', () => {
    renderLandscape()
    const root = screen.getByTestId('timeline-mobile-landscape')
    expect(root).toBeInTheDocument()
    expect(root).toHaveClass('mt-tlm--landscape')
    expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument()
    expect(screen.getAllByTestId('timeline-event')).toHaveLength(2)
  })

  it('préserve data-testid + data-event-title en paysage (dépendance E2E #163)', () => {
    renderLandscape()
    const events = screen.getAllByTestId('timeline-event')
    expect(events[0]).toHaveAttribute('data-event-title', 'Péremption lait longue durée à tronquer')
    expect(events[0]).toHaveTextContent('Péremption lait longue durée à tronquer')
  })

  it('ouvre un DRAWER LATÉRAL (pas de bottom sheet) au tap, fermable via close', async () => {
    const user = userEvent.setup()
    renderLandscape()
    expect(screen.queryByTestId('timeline-landscape-drawer')).not.toBeInTheDocument()
    // Pas de bottom sheet portrait présent dans cette variante.
    expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    const drawer = await screen.findByTestId('timeline-landscape-drawer')
    expect(drawer).toHaveAttribute('role', 'dialog')
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(drawer).toHaveTextContent('Lait bio')
    await user.click(screen.getByTestId('timeline-landscape-drawer-close'))
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-landscape-drawer')).not.toBeInTheDocument(),
    )
  })

  it('ferme le drawer latéral via Escape', async () => {
    const user = userEvent.setup()
    renderLandscape()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    await screen.findByTestId('timeline-landscape-drawer')
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-landscape-drawer')).not.toBeInTheDocument(),
    )
  })

  it('le bouton ⋯ ouvre le MÊME action sheet qu’en portrait', async () => {
    const user = userEvent.setup()
    renderLandscape()
    await user.click(screen.getAllByTestId('timeline-event-more')[0])
    const sheet = await screen.findByTestId('timeline-actionsheet')
    expect(sheet).toHaveAttribute('role', 'dialog')
    expect(screen.getByTestId('timeline-actionsheet-edit')).toBeInTheDocument()
    // Le tap sur ⋯ n'ouvre PAS le drawer détail.
    expect(screen.queryByTestId('timeline-landscape-drawer')).not.toBeInTheDocument()
  })

  it('le long-press ouvre l’action sheet (parité portrait)', () => {
    vi.useFakeTimers()
    try {
      renderLandscape()
      const evt = screen.getAllByTestId('timeline-event')[0]
      act(() => {
        fireEvent.pointerDown(evt, { clientX: 10, clientY: 10 })
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.queryByTestId('timeline-actionsheet')).not.toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.getByTestId('timeline-actionsheet')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('le pinch-zoom change le niveau (parité portrait)', () => {
    renderLandscape()
    const scroll = screen.getByTestId('timeline-scroll')
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    const dispatch = (type: string, pointerId: number, clientX: number) => {
      const ev = new Event(type, { bubbles: true })
      Object.assign(ev, { pointerId, clientX, clientY: 100 })
      scroll.dispatchEvent(ev)
    }
    act(() => {
      dispatch('pointerdown', 1, 100)
      dispatch('pointerdown', 2, 150)
      dispatch('pointermove', 2, 220)
    })
    expect(level.textContent).not.toBe(before)
  })

  it('minimap masquable : toggle utilisateur cache/affiche la minimap', async () => {
    const user = userEvent.setup()
    renderLandscape()
    expect(screen.getByTestId('timeline-minimap')).toBeInTheDocument()
    const toggle = screen.getByTestId('timeline-minimap-toggle')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByTestId('timeline-minimap')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByTestId('timeline-minimap')).toBeInTheDocument()
  })

  it('minimap masquée d’office + toggle neutralisé si hauteur < seuil', () => {
    renderLandscape({ minimapForcedHidden: true })
    expect(screen.queryByTestId('timeline-minimap')).not.toBeInTheDocument()
    const toggle = screen.getByTestId('timeline-minimap-toggle')
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('TimelineResponsive — orientation switch (transition sans perte d’état)', () => {
  afterEach(() => {
    // Chaque test restaure lui-même matchMedia via le teardown renvoyé.
  })

  it('rend la variante paysage quand orientation:landscape + hauteur basse', () => {
    const mm = mockMatchMedia((q) => q.includes('landscape') && q.includes('max-height: 600px'))
    try {
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-mobile-portrait')).not.toBeInTheDocument()
      expect(screen.queryByTestId('timeline-view')).not.toBeInTheDocument()
    } finally {
      mm.restore()
    }
  })

  it('paysage + max-height:400px → minimap masquée d’office', () => {
    const mm = mockMatchMedia(
      (q) =>
        (q.includes('landscape') && q.includes('max-height: 600px')) ||
        q.includes('max-height: 400px'),
    )
    try {
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-minimap')).not.toBeInTheDocument()
      expect(screen.getByTestId('timeline-minimap-toggle')).toBeDisabled()
    } finally {
      mm.restore()
    }
  })

  it('desktop par défaut (matchMedia:false) — non-régression', () => {
    render(
      <TimelineResponsive
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-mobile-landscape')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timeline-mobile-portrait')).not.toBeInTheDocument()
  })

  const PORTRAIT = (q: string) => q.includes('portrait')
  const LANDSCAPE = (q: string) => q.includes('landscape') && q.includes('max-height: 600px')

  it('rotation portrait → paysage : conserve le zoom ET l’événement sélectionné', async () => {
    const user = userEvent.setup()
    const mm = mockMatchMedia(PORTRAIT)
    try {
      // 1) Portrait : on zoome puis on ouvre un événement (bottom sheet).
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
      const zoomBefore = screen.getByTestId('timeline-zoom-level').textContent
      await user.click(screen.getByTestId('timeline-zoom-in'))
      const zoomAfter = screen.getByTestId('timeline-zoom-level').textContent
      expect(zoomAfter).not.toBe(zoomBefore)
      await user.click(screen.getAllByTestId('timeline-event')[0])
      expect(await screen.findByTestId('timeline-sheet')).toHaveTextContent('Lait bio')

      // 2) Rotation → paysage SANS remontage : l'état hissé dans
      //    TimelineResponsive persiste → zoom et sélection conservés.
      mm.rotate(LANDSCAPE)
      expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
      // Zoom CONSERVÉ.
      expect(screen.getByTestId('timeline-zoom-level').textContent).toBe(zoomAfter)
      // Sélection CONSERVÉE : le drawer latéral affiche le même event ; le bottom
      // sheet portrait a disparu.
      expect(screen.getByTestId('timeline-landscape-drawer')).toHaveTextContent('Lait bio')
      expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
    } finally {
      mm.restore()
    }
  })

  it('rotation paysage → portrait : ferme le drawer, rouvre le bottom sheet', async () => {
    const user = userEvent.setup()
    const mm = mockMatchMedia(LANDSCAPE)
    try {
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      await user.click(screen.getAllByTestId('timeline-event')[0])
      expect(await screen.findByTestId('timeline-landscape-drawer')).toHaveTextContent('Lait bio')

      // Rotation → portrait : drawer latéral fermé (variante démontée), bottom
      // sheet réaffiche l'event sélectionné (état conservé).
      mm.rotate(PORTRAIT)
      expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-landscape-drawer')).not.toBeInTheDocument()
      expect(screen.getByTestId('timeline-sheet')).toHaveTextContent('Lait bio')
    } finally {
      mm.restore()
    }
  })
})
