import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { EventContent } from './EventContent'

/**
 * #77 — Tests d'INTERCEPTION du 409 optimistic dans EventContent : c'est ici que
 * le statut HTTP est requalifié en `submitState` puis propagé au ConflictDialog
 * partagé (via EventEditForm). On vérifie que SEUL un 409 ouvre le dialog ; un
 * 400/404 (ou tout autre statut) reste un `error` inline et n'ouvre PAS le dialog.
 *
 * EventEditForm est mocké : il expose un bouton "submit" qui appelle `onSubmit`
 * (déclenchant la mutation) et rend `submitState` + le pilotage du ConflictDialog
 * (`onReload`/`onConflictDismiss`) de façon observable. eventService mocké pour
 * contrôler le statut de l'erreur. useAuth/useQueryClient mockés.
 */

const updateEventMock = vi.fn()
const updateEventColorMock = vi.fn()
const invalidateQueriesMock = vi.fn()

vi.mock('@/services/eventService', () => ({
  updateEvent: (...args: unknown[]) => updateEventMock(...args),
  updateEventColor: (...args: unknown[]) => updateEventColorMock(...args),
  deleteEvent: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// EventEditForm mocké : bouton submit + rendu observable du submitState et des
// callbacks conflit (recharger / annuler).
vi.mock('./EventEditForm', () => ({
  EventEditForm: ({
    onSubmit,
    submitState,
    onReload,
    onConflictDismiss,
    conflictServerEvent,
    onKeepMine,
    onTakeServer,
    defaultValues,
  }: {
    onSubmit: (data: unknown) => Promise<void>
    submitState?: string
    onReload?: () => void
    onConflictDismiss?: () => void
    conflictServerEvent?: { title?: string }
    onKeepMine?: () => void
    onTakeServer?: () => void
    defaultValues?: { archived?: boolean }
  }) => (
    <div>
      <span data-testid="submit-state">{submitState}</span>
      {/* #188 — expose la valeur pré-remplie du toggle archivé (BR-EVE-013). */}
      <span data-testid="default-archived">{String(defaultValues?.archived)}</span>
      {/* #231 — expose le titre serveur capturé (corps 409 enrichi) pour l'observer. */}
      <span data-testid="conflict-server-title">{conflictServerEvent?.title ?? ''}</span>
      <button type="button" data-testid="do-submit" onClick={() => onSubmit({ title: 'x' })}>
        submit
      </button>
      <button type="button" data-testid="do-reload" onClick={() => onReload?.()}>
        reload
      </button>
      <button type="button" data-testid="do-dismiss" onClick={() => onConflictDismiss?.()}>
        dismiss
      </button>
      <button type="button" data-testid="do-keep-mine" onClick={() => onKeepMine?.()}>
        keep-mine
      </button>
      <button type="button" data-testid="do-take-server" onClick={() => onTakeServer?.()}>
        take-server
      </button>
    </div>
  ),
}))

const baseEvent: FullCalendarEvent = {
  id: 'evt-1',
  title: 'Mon événement',
  start: '2026-05-01T00:00:00.000Z',
  end: '2026-05-04T00:00:00.000Z',
  allDay: false,
  resourceId: 'prod-1',
  color: '#3B82F6',
  extendedProps: {
    productId: 'prod-1',
    productName: 'Produit',
    category: 'cat',
    type: 'duration',
  },
}

function axiosLikeError(status: number) {
  return { response: { status } }
}

/** #231 — 409 avec corps ENRICHI (serverVersion + serverEvent conforme à eventSchema). */
function enrichedConflictError(serverTitle: string) {
  return {
    response: {
      status: 409,
      data: {
        error: 'resource was modified concurrently, please retry',
        serverVersion: 3,
        serverEvent: {
          id: 'evt-1',
          title: serverTitle,
          type: 'single',
          durationValue: null,
          durationUnit: null,
          isRecurring: false,
          recurrenceUnit: null,
          recurrenceEndDate: null,
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          productId: 'prod-1',
          isAllDay: false,
          color: '#222222',
          archived: false,
          // #review S42 (BR-EVE-015) — version serveur portée par le corps 409 enrichi :
          // `onKeepMine` doit la RÉ-ARMER dans le 2e PATCH (sinon boucle de 409).
          version: 3,
        },
      },
    },
  }
}

/** Ouvre le drawer puis passe en mode édition (bouton edit du header). */
async function openEditor(event: FullCalendarEvent = baseEvent) {
  render(<EventContent event={event} />)
  await userEvent.click(screen.getAllByText(event.title)[0])
  // Bouton edit/save du header (title = products.edit.title en mode lecture).
  const editButton = screen.getByTitle('products.edit.title')
  await userEvent.click(editButton)
}

beforeEach(() => {
  updateEventMock.mockReset()
  updateEventColorMock.mockReset()
  invalidateQueriesMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('EventContent — pré-remplissage archived (#188 / BR-EVE-013)', () => {
  it('event archived=true → defaultValues.archived pré-rempli à true', async () => {
    await openEditor({
      ...baseEvent,
      extendedProps: { ...baseEvent.extendedProps, archived: true },
    })
    expect(screen.getByTestId('default-archived')).toHaveTextContent('true')
  })

  it('event non archivé → defaultValues.archived = false (fallback)', async () => {
    await openEditor()
    expect(screen.getByTestId('default-archived')).toHaveTextContent('false')
  })
})

describe('EventContent — interception 409 optimistic (#77)', () => {
  it('409 → submitState passe à conflict', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(409))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))
  })

  it('400 → submitState error (PAS conflict)', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(400))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('error'))
    expect(screen.getByTestId('submit-state')).not.toHaveTextContent('conflict')
  })

  it('404 → submitState error (PAS conflict)', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(404))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('error'))
    expect(screen.getByTestId('submit-state')).not.toHaveTextContent('conflict')
  })

  it('recharger (onReload) : invalidation ciblée products.withEvents + retour idle (pas de reload page)', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(409))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))

    invalidateQueriesMock.mockClear()
    await userEvent.click(screen.getByTestId('do-reload'))
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['products', { userId: 'user-1', withEvents: true }],
    })
  })

  it('annuler conflit (onConflictDismiss) : retour idle sans invalidation', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(409))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))

    invalidateQueriesMock.mockClear()
    await userEvent.click(screen.getByTestId('do-dismiss'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('idle'))
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
  })
})

describe('EventContent — conflit 409 COMPARATIF (#231)', () => {
  it('409 enrichi : capture le serverEvent et le transmet au formulaire', async () => {
    updateEventMock.mockRejectedValue(enrichedConflictError('Titre serveur'))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))
    expect(screen.getByTestId('conflict-server-title')).toHaveTextContent('Titre serveur')
  })

  it('409 plat (corps legacy) : conflict SANS serverEvent (fallback recharger)', async () => {
    updateEventMock.mockRejectedValue(axiosLikeError(409))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))
    expect(screen.getByTestId('conflict-server-title')).toHaveTextContent('')
  })

  it('« garder mes modifications » (onKeepMine) : re-soumet (updateEvent rappelé)', async () => {
    // 1er submit → 409 enrichi ; keep-mine re-soumet et réussit (pas de boucle).
    updateEventMock
      .mockRejectedValueOnce(enrichedConflictError('Titre serveur'))
      .mockResolvedValueOnce({ id: 'evt-1' })
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))

    expect(updateEventMock).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByTestId('do-keep-mine'))
    // Re-soumission : updateEvent rappelé (pas de boucle de 409). Succès → l'éditeur
    // se referme (mode lecture) donc le formulaire mocké est démonté.
    await waitFor(() => expect(updateEventMock).toHaveBeenCalledTimes(2))
    // #review S42 — anti-boucle 409 : le 2e PATCH porte la VERSION SERVEUR (corps 409),
    // pas la version locale périmée → le check backend passe (plus de décalage).
    expect(updateEventMock.mock.calls[1][1].version).toBe(3)
    await waitFor(() => expect(screen.queryByTestId('submit-state')).not.toBeInTheDocument())
  })

  it('« prendre la version serveur » (onTakeServer) : invalidation ciblée + éditeur fermé', async () => {
    updateEventMock.mockRejectedValue(enrichedConflictError('Titre serveur'))
    await openEditor()
    await userEvent.click(screen.getByTestId('do-submit'))
    await waitFor(() => expect(screen.getByTestId('submit-state')).toHaveTextContent('conflict'))

    invalidateQueriesMock.mockClear()
    await userEvent.click(screen.getByTestId('do-take-server'))
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['products', { userId: 'user-1', withEvents: true }],
    })
    // Abandon du local → sortie du mode édition (formulaire démonté).
    await waitFor(() => expect(screen.queryByTestId('submit-state')).not.toBeInTheDocument())
  })
})
