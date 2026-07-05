import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import { TimelineResponsive } from './TimelineResponsive'

/**
 * #63 — Tests vue mobile portrait (jsdom).
 * next-intl mocké → assertions locale-agnostiques sur les clés. Couvre :
 * rendu frise/lanes/règle, tap → bottom sheet, fermeture Escape/close/overlay,
 * bouton ⋯ → action sheet, long-press → action sheet, pinch-zoom (niveau change),
 * data-testid E2E préservés (#163). + non-régression du switch responsive
 * (TimelineResponsive rend le desktop par défaut sous jsdom matchMedia:false).
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

function renderPortrait(props: Partial<React.ComponentProps<typeof TimelineMobilePortrait>> = {}) {
  return render(
    <TimelineMobilePortrait
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      {...props}
    />,
  )
}

describe('TimelineMobilePortrait', () => {
  it('rend la frise, la règle, la minimap et les events', () => {
    renderPortrait()
    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-minimap')).toBeInTheDocument()
    const events = screen.getAllByTestId('timeline-event')
    expect(events).toHaveLength(2)
  })

  it('préserve data-testid + data-event-title sur les blocs (dépendance E2E #163)', () => {
    renderPortrait()
    const events = screen.getAllByTestId('timeline-event')
    expect(events[0]).toHaveAttribute('data-event-title', 'Péremption lait longue durée à tronquer')
    // Le titre complet reste dans le DOM (tronqué visuellement en CSS, lisible au tap).
    expect(events[0]).toHaveTextContent('Péremption lait longue durée à tronquer')
  })

  it('affiche le nom du produit dans chaque lane', () => {
    renderPortrait()
    const titles = screen.getAllByTestId('timeline-resource-title').map((el) => el.textContent)
    expect(titles).toContain('Lait bio')
    expect(titles).toContain('Pain')
  })

  it('ouvre le bottom sheet au tap sur un bloc, puis ferme via le bouton close', async () => {
    const user = userEvent.setup()
    renderPortrait()
    expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    const sheet = await screen.findByTestId('timeline-sheet')
    expect(sheet).toHaveAttribute('role', 'dialog')
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(sheet).toHaveTextContent('Lait bio')
    await user.click(screen.getByTestId('timeline-sheet-close'))
    await waitFor(() => expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument())
  })

  it('ferme le bottom sheet via Escape', async () => {
    const user = userEvent.setup()
    renderPortrait()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    await screen.findByTestId('timeline-sheet')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument())
  })

  it('le bouton ⋯ ouvre l’action sheet (modifier/supprimer)', async () => {
    const user = userEvent.setup()
    renderPortrait()
    await user.click(screen.getAllByTestId('timeline-event-more')[0])
    const sheet = await screen.findByTestId('timeline-actionsheet')
    expect(sheet).toHaveAttribute('role', 'dialog')
    expect(screen.getByTestId('timeline-actionsheet-edit')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-actionsheet-delete')).toBeInTheDocument()
    // Le tap sur ⋯ n'ouvre PAS le bottom sheet détail.
    expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
  })

  it('câble onEdit/onDelete de l’action sheet', async () => {
    const user = userEvent.setup()
    const onEditEvent = vi.fn()
    const onDeleteEvent = vi.fn()
    renderPortrait({ onEditEvent, onDeleteEvent })
    await user.click(screen.getAllByTestId('timeline-event-more')[0])
    await screen.findByTestId('timeline-actionsheet')
    await user.click(screen.getByTestId('timeline-actionsheet-edit'))
    expect(onEditEvent).toHaveBeenCalledOnce()
    expect(onEditEvent.mock.calls[0][0].id).toBe('e1')
  })

  it('le long-press ouvre le MÊME action sheet que ⋯', async () => {
    vi.useFakeTimers()
    try {
      renderPortrait()
      const evt = screen.getAllByTestId('timeline-event')[0]
      act(() => {
        fireEvent.pointerDown(evt, { clientX: 10, clientY: 10 })
      })
      // Avant le seuil : pas d'action sheet.
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.queryByTestId('timeline-actionsheet')).not.toBeInTheDocument()
      // Après le seuil (500ms) : l'action sheet s'ouvre.
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.getByTestId('timeline-actionsheet')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('le pinch-zoom (2 pointeurs qui s’écartent) change le niveau de zoom', () => {
    renderPortrait()
    const scroll = screen.getByTestId('timeline-scroll')
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    // jsdom : `PointerEvent` absent + fireEvent ne conserve pas pointerId → on
    // dispatche des Events dont on force pointerId/clientX (lus par le handler).
    const dispatch = (type: string, pointerId: number, clientX: number) => {
      const ev = new Event(type, { bubbles: true })
      Object.assign(ev, { pointerId, clientX, clientY: 100 })
      scroll.dispatchEvent(ev)
    }
    act(() => {
      dispatch('pointerdown', 1, 100)
      dispatch('pointerdown', 2, 150)
      // Écartement 50 → 120 (> +22%) → ZOOM_IN.
      dispatch('pointermove', 2, 220)
    })
    expect(level.textContent).not.toBe(before)
  })

  it('les boutons +/- changent le niveau de zoom (alternative accessible au pinch)', async () => {
    const user = userEvent.setup()
    renderPortrait()
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    await user.click(screen.getByTestId('timeline-zoom-in'))
    expect(level.textContent).not.toBe(before)
  })
})

describe('TimelineResponsive (switch)', () => {
  it('rend la vue desktop par défaut sous jsdom (matchMedia:false) — non-régression', () => {
    render(
      <TimelineResponsive
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )
    // matchMedia mock → matches:false → variante desktop.
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-mobile-portrait')).not.toBeInTheDocument()
  })

  it('bascule sur la vue mobile portrait quand la media query portrait matche', () => {
    const original = window.matchMedia
    // #64 : le switch distingue désormais portrait / paysage. On ne matche QUE
    // la query portrait (matcher ciblé) — un `matches:true` global rendrait la
    // variante paysage (priorité dans TimelineResponsive).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('portrait'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    try {
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-view')).not.toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })
})
