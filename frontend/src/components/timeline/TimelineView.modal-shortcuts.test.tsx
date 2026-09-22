import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TimelineView } from './TimelineView'
import { NewEventDrawer } from '@/components/events/NewEventDrawer'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import type { Resource } from './lib'

/**
 * #672 — Les raccourcis de la frise (`F`/`T`/`+`/`-`/`[`/`]`) agissaient DERRIÈRE le
 * panneau de création du shell : la garde d'origine n'excluait que `INPUT`, `TEXTAREA`
 * et `contentEditable`, donc toute frappe sur un BOUTON du panneau retombait sur la
 * frise. Cas le plus gênant : `F` passait la frise en plein écran, le panneau — resté
 * ouvert et toujours saisi — devenant invisible derrière elle.
 *
 * Le VRAI `NewEventDrawer` est monté ici, en FRÈRE de la frise, exactement comme
 * `AppShell` le fait : sa coque (`EventFormDrawer`) se portalise dans `document.body`,
 * donc HORS de `rootRef`. Un faux drawer rendu dans l'arbre de la frise ne
 * reproduirait pas la topologie du bug.
 *
 * Toutes les frappes partent de `document.activeElement` (le bouton de fermeture du
 * panneau, saisi par le focus-trap au montage) et non de `window` : un test qui
 * viserait un `<input>` serait VACUOUS, la garde `typing` préexistante le couvrant
 * déjà (PIT-S82-001 — une assertion doit pouvoir rougir sur la violation).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

// Recette de montage de `NewEventDrawer` reprise de `NewEventDrawer.test.tsx` :
// les HOOKS réseau sont mockés, jamais enveloppés d'un provider (PIT-S69-001).
const mockProducts: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Produit Alpha',
    color: '#112233',
    category: { id: 'c1', name: 'Cat A', color: null },
    events: [],
  },
]

vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: () => ({ data: mockProducts, isLoading: false, isError: false }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Jane' }, loading: false }),
}))

// Variante DESKTOP (drawer latéral) : la bascule bottom sheet n'est pas le sujet.
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
  default: () => false,
}))

vi.mock('@/contexts/NetworkStatusContext', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}))

vi.mock('@/services/eventService', () => ({
  createEvent: vi.fn().mockResolvedValue({ id: 'new-event' }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
  },
]

const RESOURCES: Resource[] = [{ id: 'p1', title: 'Lait bio', category: 'Frais' }]

let requestFullscreenMock: ReturnType<typeof vi.fn>
let exitFullscreenMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  // jsdom n'implémente ni l'API Fullscreen ni le défilement — stubs neutres.
  requestFullscreenMock = vi.fn().mockResolvedValue(undefined)
  exitFullscreenMock = vi.fn().mockResolvedValue(undefined)
  Element.prototype.requestFullscreen = requestFullscreenMock
  document.exitFullscreen = exitFullscreenMock
})

/** Monte la frise, et — au besoin — le drawer de création DU SHELL en frère. */
function renderTimeline({ createOpen = false }: { createOpen?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TimelineView
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />
      {createOpen && <NewEventDrawer open onClose={vi.fn()} />}
    </QueryClientProvider>,
  )
}

/**
 * Frappe depuis l'élément FOCALISÉ (l'événement remonte jusqu'à `window`, comme dans
 * un vrai navigateur). Rend le `tagName` visé, pour prouver que la frappe ne part pas
 * d'un champ de saisie déjà couvert par la garde `typing`.
 */
function pressFromFocus(key: string): string {
  const active = document.activeElement as HTMLElement
  fireEvent.keyDown(active, { key })
  return active.tagName
}

describe('#672 raccourcis de la frise sous le panneau de création du shell', () => {
  it('le focus-trap du panneau saisit un BOUTON (sinon le test serait vacuous)', () => {
    renderTimeline({ createOpen: true })
    expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument()
    const active = document.activeElement as HTMLElement
    expect(active).toBe(screen.getByTestId('shell-new-event-drawer-close'))
    expect(active.tagName).toBe('BUTTON')
    // `toBeFalsy` et non `toBe(false)` : jsdom n'implémente pas `isContentEditable`
    // (il rend `undefined`). Ce qui compte est qu'aucune branche de la garde `typing`
    // préexistante ne couvre cet élément.
    expect(active.isContentEditable).toBeFalsy()
  })

  it('panneau ouvert : "F" ne recadre PAS la frise (ni ne la passe en plein écran)', async () => {
    renderTimeline({ createOpen: true })
    // #597 — `F` recadre désormais. Viewport mesurable : sans largeur, le recadrage
    // serait un no-op et l'assertion ci-dessous vacante.
    const scroll = screen.getByTestId('timeline-scroll')
    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1000 })
    const level = screen.getByTestId('timeline-zoom-level')
    const before = { level: level.textContent, scroll: scroll.scrollLeft }
    expect(pressFromFocus('f')).toBe('BUTTON')
    pressFromFocus('F')
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
    expect({ level: level.textContent, scroll: scroll.scrollLeft }).toEqual(before)
    expect(requestFullscreenMock).not.toHaveBeenCalled()
  })

  it('panneau ouvert : "+" et "-" ne changent PAS le niveau de zoom', async () => {
    renderTimeline({ createOpen: true })
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    pressFromFocus('+')
    pressFromFocus('=')
    pressFromFocus('-')
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
    expect(level.textContent).toBe(before)
  })

  it('panneau ouvert : "T", "[" et "]" ne déplacent PAS la fenêtre', async () => {
    renderTimeline({ createOpen: true })
    const scroll = screen.getByTestId('timeline-scroll')
    const before = scroll.scrollLeft
    pressFromFocus(']')
    pressFromFocus('[')
    pressFromFocus('t')
    pressFromFocus('T')
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
    expect(scroll.scrollLeft).toBe(before)
  })

  it('panneau ouvert : Échap ne touche NI le plein écran NI la frise (le panneau se ferme seul)', async () => {
    renderTimeline({ createOpen: true })
    pressFromFocus('Escape')
    await waitFor(() => expect(screen.getByTestId('timeline-view')).toBeInTheDocument())
    expect(exitFullscreenMock).not.toHaveBeenCalled()
  })

  it('NON-RÉGRESSION — panneau fermé : "+", "]", "T" et "F" agissent normalement', async () => {
    renderTimeline()
    const level = screen.getByTestId('timeline-zoom-level')
    const scroll = screen.getByTestId('timeline-scroll')
    const beforeLevel = level.textContent

    fireEvent.keyDown(window, { key: '+' })
    await waitFor(() => expect(level.textContent).not.toBe(beforeLevel))

    fireEvent.keyDown(window, { key: '-' })
    await waitFor(() => expect(level.textContent).toBe(beforeLevel))

    // ] = NEXT_PERIOD : offset +30 j × 12 px au niveau `month`.
    fireEvent.keyDown(window, { key: ']' })
    await waitFor(() => expect(scroll.scrollLeft).toBe(360))
    // T = GO_TO_TODAY : 35 j × 12 px (même repère que `TimelineView.test.tsx`).
    fireEvent.keyDown(window, { key: 't' })
    await waitFor(() => expect(scroll.scrollLeft).toBe(420))

    // #597 — F RECADRE (4 j dans 744 px utiles → niveau `day`), sans plein écran.
    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1000 })
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(level).toHaveTextContent('dashboard.timeline.zoom.day'))
    expect(requestFullscreenMock).not.toHaveBeenCalled()
  })

  it('NON-RÉGRESSION — le drawer de détail de la frise (DANS `rootRef`) laisse les raccourcis actifs', async () => {
    renderTimeline()
    fireEvent.click(screen.getAllByTestId('timeline-event')[0])
    const drawer = await screen.findByTestId('timeline-drawer')
    // Ce drawer porte lui aussi `role="dialog" aria-modal="true"` : la garde #672 ne
    // doit PAS le prendre pour une couche superposée, il est peint DANS la frise.
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByTestId('timeline-view').contains(drawer)).toBe(true)

    const scroll = screen.getByTestId('timeline-scroll')
    expect(pressFromFocus(']')).toBe('BUTTON')
    await waitFor(() => expect(scroll.scrollLeft).toBe(360))
    pressFromFocus('t')
    await waitFor(() => expect(scroll.scrollLeft).toBe(420))
  })
})
