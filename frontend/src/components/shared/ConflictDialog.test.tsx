import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConflictDialog } from './ConflictDialog'
import type { Event, EventEditFormValues } from '@/types/event'

/**
 * #77 — Tests ConflictDialog (Dialog DS partagé, 409 optimistic locking).
 *
 * next-intl mocké → assertions locale-agnostiques sur les clés `namespace.key`.
 * Contrat 409 réel (#200) = corps plat sans version → une seule action
 * « recharger » (pas de diff serveur/local).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConflictDialog', () => {
  it('fermé (open=false) : rien de monté', () => {
    render(<ConflictDialog open={false} onOpenChange={vi.fn()} onReload={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ouvert : dialog accessible (role=dialog) + titre + description + action recharger', () => {
    render(<ConflictDialog open onOpenChange={vi.fn()} onReload={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('conflictDialog.title')).toBeInTheDocument()
    expect(screen.getByText('conflictDialog.description')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-reload')).toBeInTheDocument()
  })

  it('testId personnalisable (préservation event-form-conflict)', () => {
    render(
      <ConflictDialog open onOpenChange={vi.fn()} onReload={vi.fn()} testId="event-form-conflict" />,
    )
    expect(screen.getByTestId('event-form-conflict')).toBeInTheDocument()
  })

  it('clic recharger : appelle onReload puis ferme (onOpenChange false)', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.click(screen.getByTestId('conflict-dialog-reload'))
    expect(onReload).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('clic annuler : ferme sans recharger', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.click(screen.getByText('conflictDialog.dismiss'))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onReload).not.toHaveBeenCalled()
  })

  it('Échap : ferme le dialog sans recharger (a11y Radix)', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onReload).not.toHaveBeenCalled()
  })
})

/**
 * #231 — Mode COMPARATIF : quand `serverEvent` + `localValues` sont fournis (corps 409
 * enrichi), le dialog affiche un diff champ par champ + deux actions
 * (« garder mes modifications » / « prendre la version serveur ») au lieu de « recharger ».
 */
const localValues: EventEditFormValues = {
  title: 'Titre local',
  type: 'single',
  durationValue: undefined,
  durationUnit: undefined,
  isRecurring: false,
  recurrenceUnit: undefined,
  recurrenceEndDate: null,
  startDate: '2026-05-01',
  endDate: '2026-05-02',
  color: '#111111',
  archived: false,
}

const serverEvent: Event = {
  id: 'evt-1',
  title: 'Titre serveur',
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
}

describe('ConflictDialog — mode comparatif (#231)', () => {
  it('affiche le diff des champs modifiés + boutons garder/prendre (pas recharger)', () => {
    render(
      <ConflictDialog
        open
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        serverEvent={serverEvent}
        localValues={localValues}
        onKeepMine={vi.fn()}
        onTakeServer={vi.fn()}
      />,
    )
    // Seuls title + color diffèrent (dates/booléens/durée identiques ou vides).
    const rows = screen.getAllByTestId('conflict-dialog-diff-row')
    expect(rows).toHaveLength(2)
    const fields = rows.map((r) => r.getAttribute('data-field'))
    expect(fields).toEqual(expect.arrayContaining(['title', 'color']))
    // Actions comparatives présentes, action legacy « recharger » absente.
    expect(screen.getByTestId('conflict-dialog-keep-mine')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-take-server')).toBeInTheDocument()
    expect(screen.queryByTestId('conflict-dialog-reload')).not.toBeInTheDocument()
  })

  it('affiche les valeurs locale et serveur côte à côte pour un champ modifié', () => {
    render(
      <ConflictDialog
        open
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        serverEvent={serverEvent}
        localValues={localValues}
        onKeepMine={vi.fn()}
        onTakeServer={vi.fn()}
      />,
    )
    const titleRow = screen
      .getAllByTestId('conflict-dialog-diff-row')
      .find((r) => r.getAttribute('data-field') === 'title')!
    expect(titleRow).toHaveTextContent('Titre local')
    expect(titleRow).toHaveTextContent('Titre serveur')
  })

  it('clic « garder mes modifications » : appelle onKeepMine', async () => {
    const onKeepMine = vi.fn()
    render(
      <ConflictDialog
        open
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        serverEvent={serverEvent}
        localValues={localValues}
        onKeepMine={onKeepMine}
        onTakeServer={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('conflict-dialog-keep-mine'))
    expect(onKeepMine).toHaveBeenCalledOnce()
  })

  it('clic « prendre la version serveur » : appelle onTakeServer', async () => {
    const onTakeServer = vi.fn()
    render(
      <ConflictDialog
        open
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        serverEvent={serverEvent}
        localValues={localValues}
        onKeepMine={vi.fn()}
        onTakeServer={onTakeServer}
      />,
    )
    await userEvent.click(screen.getByTestId('conflict-dialog-take-server'))
    expect(onTakeServer).toHaveBeenCalledOnce()
  })

  it('aucun champ modifié : note « aucune différence » + actions comparatives', () => {
    render(
      <ConflictDialog
        open
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        serverEvent={serverEvent}
        localValues={{ ...localValues, title: 'Titre serveur', color: '#222222' }}
        onKeepMine={vi.fn()}
        onTakeServer={vi.fn()}
      />,
    )
    expect(screen.queryAllByTestId('conflict-dialog-diff-row')).toHaveLength(0)
    expect(screen.getByTestId('conflict-dialog-no-changes')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-keep-mine')).toBeInTheDocument()
  })
})
