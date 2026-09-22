import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TimelineView } from './TimelineView'
import { CreateEventProvider } from '@/components/layout/CreateEventContext'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import type { PositionedEvent } from './zoom'

/**
 * #712 — En plein écran, le navigateur ne peint QUE l'élément passé à
 * `requestFullscreen` (ici `rootRef`, la `<section class="mt-tlv">`). Les couches du
 * shell — drawer d'édition (`TimelineEditHost`), drawer de création, toaster global du
 * layout — sont montées HORS de cet élément : ouvertes en plein écran, elles sont
 * invisibles et leur piège de focus bloque le clavier hors champ.
 *
 * L'ORACLE de ces tests n'est donc PAS « `exitFullscreen` a été appelé » (une garde qui
 * n'attend pas la promesse le satisferait aussi, PIT-S85-005) mais : **au moment précis
 * où la couche est demandée, le document n'est PLUS en plein écran**. `exitFullscreen()`
 * est asynchrone ; c'est tout l'enjeu de la correction.
 *
 * jsdom n'implémente ni l'API Fullscreen ni `document.fullscreenElement` en écriture :
 * on pose un getter sur une variable de test, que le faux `exitFullscreen` remet à
 * `null` — exactement l'ordre que le navigateur garantit (la promesse ne se résout
 * qu'une fois le plein écran quitté).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
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

/** Élément déclaré « en plein écran » par le faux `document.fullscreenElement`. */
let fullscreenElement: Element | null = null
let exitFullscreenMock: ReturnType<typeof vi.fn>

function markFullscreen(element: Element | null) {
  fullscreenElement = element
}

beforeEach(() => {
  fullscreenElement = null
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  })
  // `markFullscreen(this)` plutôt que `fullscreenElement = this` : ESLint
  // (`@typescript-eslint/no-this-alias`, bloquant au `next build`) interdit
  // d'affecter `this` à une variable.
  Element.prototype.requestFullscreen = vi.fn(function requestFullscreenStub(this: Element) {
    markFullscreen(this)
    return Promise.resolve()
  })
  // `document.fullscreenElement` reste renseigné TANT QUE la sortie n'est pas effective,
  // et la promesse ne se résout qu'ensuite — comme dans un navigateur. Un faux qui
  // remettrait `null` de façon synchrone rendrait ces tests VACUOUS : une garde qui
  // n'attend pas la promesse les satisferait tout autant (PIT-S85-005).
  exitFullscreenMock = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          fullscreenElement = null
          resolve()
        }, 0)
      }),
  )
  document.exitFullscreen = exitFullscreenMock
})

function renderTimeline(props: {
  onEditEvent?: (event: PositionedEvent) => void
  onOpenCreate?: () => void
}) {
  const view = (
    <TimelineView
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      layout="screen"
      onEditEvent={props.onEditEvent}
    />
  )
  return render(
    props.onOpenCreate ? (
      <CreateEventProvider onOpenCreate={props.onOpenCreate}>{view}</CreateEventProvider>
    ) : (
      view
    ),
  )
}

/** Passe la frise en plein écran par son bouton de barre d'outils (chemin réel). */
function enterFullscreen() {
  fireEvent.click(screen.getByTestId('timeline-fullscreen'))
  expect(document.fullscreenElement).toBe(screen.getByTestId('timeline-view'))
}

describe('#712 couches du shell ouvertes depuis la frise en plein écran', () => {
  it('« Éditer » : le plein écran est QUITTÉ avant que la demande d’édition parte', async () => {
    // Enregistre l'état du plein écran AU MOMENT de l'appel, pas après coup.
    const fullscreenAtCall: (Element | null)[] = []
    const onEditEvent = vi.fn(() => {
      fullscreenAtCall.push(document.fullscreenElement)
    })
    renderTimeline({ onEditEvent })
    enterFullscreen()

    fireEvent.click(screen.getAllByTestId('timeline-event')[0])
    fireEvent.click(await screen.findByTestId('event-drawer-edit'))

    await waitFor(() => expect(onEditEvent).toHaveBeenCalledTimes(1))
    // Le cœur du correctif : l'édition ne part pas dans un document encore plein écran.
    expect(fullscreenAtCall).toEqual([null])
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1)
  })

  it('« Éditer » : l’événement ciblé est bien celui du drawer (l’attente ne le perd pas)', async () => {
    const onEditEvent = vi.fn()
    renderTimeline({ onEditEvent })
    enterFullscreen()

    fireEvent.click(screen.getAllByTestId('timeline-event')[0])
    fireEvent.click(await screen.findByTestId('event-drawer-edit'))

    await waitFor(() => expect(onEditEvent).toHaveBeenCalledTimes(1))
    expect(onEditEvent.mock.calls[0][0]).toMatchObject({ id: 'e1' })
  })

  it('« Nouvel événement » : le plein écran est QUITTÉ avant l’ouverture du drawer de création', async () => {
    const fullscreenAtCall: (Element | null)[] = []
    const onOpenCreate = vi.fn(() => {
      fullscreenAtCall.push(document.fullscreenElement)
    })
    renderTimeline({ onOpenCreate })
    enterFullscreen()

    fireEvent.click(screen.getByTestId('timeline-new-event'))

    await waitFor(() => expect(onOpenCreate).toHaveBeenCalledTimes(1))
    // #602 posait déjà la garde mais n'attendait PAS la promesse : sans l'attente,
    // cette assertion rougit (la valeur observée serait la `<section>` de la frise).
    expect(fullscreenAtCall).toEqual([null])
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1)
  })

  it('NON-RÉGRESSION — hors plein écran, « Éditer » reste SYNCHRONE et ne sort de rien', () => {
    const onEditEvent = vi.fn()
    renderTimeline({ onEditEvent })

    fireEvent.click(screen.getAllByTestId('timeline-event')[0])
    fireEvent.click(screen.getByTestId('event-drawer-edit'))

    // Aucun `waitFor` : différer l'ouverture hors plein écran serait une régression.
    expect(onEditEvent).toHaveBeenCalledTimes(1)
    expect(exitFullscreenMock).not.toHaveBeenCalled()
  })

  it('NON-RÉGRESSION — hors plein écran, « Nouvel événement » reste SYNCHRONE', () => {
    const onOpenCreate = vi.fn()
    renderTimeline({ onOpenCreate })

    fireEvent.click(screen.getByTestId('timeline-new-event'))

    expect(onOpenCreate).toHaveBeenCalledTimes(1)
    expect(exitFullscreenMock).not.toHaveBeenCalled()
  })

  it('le drawer de détail de la frise est DANS l’élément plein écran (il n’a rien à quitter)', async () => {
    renderTimeline({ onEditEvent: vi.fn() })
    enterFullscreen()

    fireEvent.click(screen.getAllByTestId('timeline-event')[0])
    const drawer = await screen.findByTestId('timeline-drawer')
    expect(screen.getByTestId('timeline-view').contains(drawer)).toBe(true)
    expect(exitFullscreenMock).not.toHaveBeenCalled()
  })
})
