import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventEditForm, type EventEditFormValues } from './EventEditForm'

/**
 * #66 — Tests EventEditForm : submitState (4 états), validations inline
 * (BR-EVE-002/003/006/009), preview live, dialog suppression.
 *
 * next-intl mocké → assertions locale-agnostiques sur les clés `namespace.key`.
 * PopoverPicker (react-colorful, canvas non testable en jsdom) mocké par un input
 * texte. DeleteConfirmDialog mocké par un bouton qui appelle `onConfirm`.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  // #315 — la mini-frise d'aperçu formate ses dates via `useLocale()`.
  useLocale: () => 'fr',
}))

vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({ color }: { color: string }) => (
    <div data-testid="mock-picker" data-color={color} />
  ),
}))

vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: () => void | Promise<void>
  }) =>
    open ? (
      <button type="button" data-testid="mock-delete-confirm" onClick={() => onConfirm()}>
        confirm-delete
      </button>
    ) : null,
}))

const baseDefaults: EventEditFormValues = {
  title: 'Mon événement',
  type: 'duration',
  durationValue: 3,
  durationUnit: 'days',
  isRecurring: false,
  recurrenceUnit: undefined,
  recurrenceEndDate: null,
  startDate: '2026-05-01',
  endDate: '2026-05-04',
  color: '#3B82F6',
  archived: false,
}

function setup(props: Partial<React.ComponentProps<typeof EventEditForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(
    <EventEditForm
      defaultValues={baseDefaults}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

describe('EventEditForm — pré-remplissage & preview', () => {
  it('pré-remplit le formulaire depuis defaultValues (mode édition)', () => {
    setup()
    expect(screen.getByTestId('event-form-title-input')).toHaveValue('Mon événement')
    expect(screen.getByTestId('event-form-color-input')).toHaveValue('#3B82F6')
    expect(screen.getByTestId('event-form-start-date')).toHaveValue('2026-05-01')
    expect(screen.getByTestId('event-form-end-date')).toHaveValue('2026-05-04')
  })

  it('affiche le preview live avec la couleur choisie', async () => {
    setup()
    // #315 — l'aperçu est désormais une MINI-FRISE : la couleur porte la barre
    // d'occurrence (`--mt-evt`, API du DS), plus le conteneur.
    await waitFor(() =>
      expect(
        screen.getByTestId('event-form-preview-bar').style.getPropertyValue('--mt-evt'),
      ).toBe('#3B82F6'),
    )
    expect(screen.getByTestId('event-form-preview')).toBeInTheDocument()
  })

  it('#315 — la mini-frise expose règle, marqueur TODAY et légende « prochaine occurrence »', async () => {
    setup()
    await waitFor(() => expect(screen.getByTestId('event-form-preview-ruler')).toBeInTheDocument())
    expect(screen.getByTestId('event-form-preview-today')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-preview-legend')).toHaveTextContent(
      'products.details.previewTimeline.nextOccurrence',
    )
    // Événement non récurrent : ni fantôme ni connecteur.
    expect(screen.queryByTestId('event-form-preview-ghost')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-preview-connector')).not.toBeInTheDocument()
  })

  it('#315 — un événement récurrent affiche le connecteur pointillé et l’occurrence fantôme', async () => {
    setup({
      defaultValues: { ...baseDefaults, isRecurring: true, recurrenceUnit: 'MONTH' },
    })
    await waitFor(() => expect(screen.getByTestId('event-form-preview-ghost')).toBeInTheDocument())
    expect(screen.getByTestId('event-form-preview-connector')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-preview-recurrence')).toBeInTheDocument()
  })
})

describe('EventEditForm — submitState (4 états)', () => {
  it('idle : bouton actif, pas de spinner', () => {
    setup({ submitState: 'idle' })
    expect(screen.getByTestId('event-form-submit')).not.toBeDisabled()
    expect(screen.queryByTestId('event-form-error')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-conflict')).not.toBeInTheDocument()
  })

  it('submitting : bouton désactivé + spinner', () => {
    setup({ submitState: 'submitting' })
    expect(screen.getByTestId('event-form-submit')).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('error : message générique inline', () => {
    setup({ submitState: 'error' })
    expect(screen.getByTestId('event-form-error')).toBeInTheDocument()
    expect(screen.queryByTestId('event-form-conflict')).not.toBeInTheDocument()
  })

  it('conflict : ouvre le ConflictDialog partagé (event-form-conflict) + bouton recharger, distinct de error', () => {
    const onReload = vi.fn()
    setup({ submitState: 'conflict', onReload })
    // #77 — le conflit 409 optimistic ouvre un Dialog partagé (role=dialog Radix)
    // dont le conteneur préserve data-testid=event-form-conflict (tests #66).
    expect(screen.getByTestId('event-form-conflict')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('event-form-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-reload')).toBeInTheDocument()
  })

  it("conflict : le dialog n'est PAS monté pour idle/error", () => {
    const { rerender } = render(
      <EventEditForm defaultValues={baseDefaults} onSubmit={vi.fn()} onCancel={vi.fn()} submitState="error" />,
    )
    expect(screen.queryByTestId('event-form-conflict')).not.toBeInTheDocument()
    rerender(
      <EventEditForm defaultValues={baseDefaults} onSubmit={vi.fn()} onCancel={vi.fn()} submitState="idle" />,
    )
    expect(screen.queryByTestId('event-form-conflict')).not.toBeInTheDocument()
  })

  it('conflict : clic recharger appelle onReload', async () => {
    const onReload = vi.fn()
    setup({ submitState: 'conflict', onReload })
    await userEvent.click(screen.getByTestId('conflict-dialog-reload'))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it('conflict : Échap ferme le dialog et appelle onConflictDismiss (pas onReload)', async () => {
    const onReload = vi.fn()
    const onConflictDismiss = vi.fn()
    setup({ submitState: 'conflict', onReload, onConflictDismiss })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onConflictDismiss).toHaveBeenCalledOnce())
    expect(onReload).not.toHaveBeenCalled()
  })

  it('conflict COMPARATIF (#231) : serverEvent+localValues → boutons garder/prendre (pas recharger)', async () => {
    const onKeepMine = vi.fn()
    const onTakeServer = vi.fn()
    setup({
      submitState: 'conflict',
      onKeepMine,
      onTakeServer,
      conflictLocalValues: { ...baseDefaults, title: 'Titre local' },
      conflictServerEvent: {
        id: 'evt-1',
        title: 'Titre serveur',
        type: 'duration',
        durationValue: 3,
        durationUnit: 'days',
        isRecurring: false,
        recurrenceUnit: null,
        recurrenceEndDate: null,
        startDate: '2026-05-01',
        endDate: '2026-05-04',
        productId: 'prod-1',
        isAllDay: false,
        color: '#3B82F6',
        archived: false,
      },
    })
    expect(screen.getByTestId('event-form-conflict')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-keep-mine')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-take-server')).toBeInTheDocument()
    expect(screen.queryByTestId('conflict-dialog-reload')).not.toBeInTheDocument()
    // Diff = seul le titre diffère (le reste des champs est identique).
    const rows = screen.getAllByTestId('conflict-dialog-diff-row')
    expect(rows.map((r) => r.getAttribute('data-field'))).toEqual(['title'])

    await userEvent.click(screen.getByTestId('conflict-dialog-keep-mine'))
    expect(onKeepMine).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByTestId('conflict-dialog-take-server'))
    expect(onTakeServer).toHaveBeenCalledOnce()
  })
})

describe('EventEditForm — validations inline (BR-EVE)', () => {
  it('BR-EVE-003 : titleErr inline si titre vidé et champ touché (sans submit)', async () => {
    setup()
    const input = screen.getByTestId('event-form-title-input')
    await userEvent.clear(input)
    await userEvent.tab() // blur → onTouched
    await waitFor(() =>
      expect(screen.getByTestId('event-form-title-error')).toHaveTextContent(/titleRequired/),
    )
  })

  it('BR-EVE-002 : endErr si endDate < startDate', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EventEditForm
        defaultValues={{ ...baseDefaults, startDate: '2026-05-10', endDate: '2026-05-01' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() =>
      expect(screen.getByTestId('event-form-end-error')).toHaveTextContent(/endBeforeStart/),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('BR-EVE-009 : colorErr pour une valeur hex invalide', async () => {
    setup()
    const color = screen.getByTestId('event-form-color-input')
    await userEvent.clear(color)
    await userEvent.type(color, 'pasunehex')
    await userEvent.tab()
    await waitFor(() =>
      expect(screen.getByTestId('event-form-color-error')).toHaveTextContent(/colorInvalid/),
    )
  })

  it('BR-EVE-006 : seriesErr si isRecurring=true sans recurrenceUnit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EventEditForm
        defaultValues={{ ...baseDefaults, isRecurring: true, recurrenceUnit: undefined }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() =>
      expect(screen.getByTestId('event-form-series-error')).toHaveTextContent(
        /recurrenceUnitRequired/,
      ),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('soumission valide appelle onSubmit avec les données', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Mon événement', color: '#3B82F6' })
  })
})

describe('EventEditForm — threading version (#review S42 / BR-EVE-015)', () => {
  it('soumission sans toucher version → payload conserve la version d’origine', async () => {
    // `version` n'est pas éditable : lue au chargement, renvoyée telle quelle (arme le 409
    // déterministe #231). Désormais registered (Controller hidden) → robuste à reset()/setValue.
    const { onSubmit } = setup({ defaultValues: { ...baseDefaults, version: 7 } })
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ version: 7 })
  })

  it('version=null (event sans version connue) → null transmis tel quel (pas de coercion)', async () => {
    const { onSubmit } = setup({ defaultValues: { ...baseDefaults, version: null } })
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ version: null })
  })
})

describe('EventEditForm — récurrence', () => {
  it("n'affiche recurrenceEndDate que si récurrence activée", async () => {
    setup({ submitState: 'idle' })
    expect(screen.queryByTestId('event-form-recurrence-end-date')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('event-form-recurring-toggle'))
    await waitFor(() =>
      expect(screen.getByTestId('event-form-recurrence-end-date')).toBeInTheDocument(),
    )
  })
})

describe('EventEditForm — archivage (BR-EVE-013)', () => {
  it('toggle archived visible et pré-rempli depuis defaultValues', () => {
    setup({ defaultValues: { ...baseDefaults, archived: true } })
    const toggle = screen.getByTestId('event-form-archived-toggle')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toBeChecked()
  })

  it('toggle archived est modifiable (non conditionnel à isRecurring)', async () => {
    setup()
    const toggle = screen.getByTestId('event-form-archived-toggle')
    expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    expect(toggle).toBeChecked()
  })

  it('la soumission (PATCH) transmet archived après toggle', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByTestId('event-form-archived-toggle'))
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ archived: true })
  })
})

describe('EventEditForm — suppression (mode édition)', () => {
  it('affiche le bouton supprimer uniquement si onDelete fourni', () => {
    const { rerender } = renderWithDelete(undefined)
    expect(screen.queryByTestId('event-form-delete')).not.toBeInTheDocument()
    rerender(vi.fn().mockResolvedValue(undefined))
    expect(screen.getByTestId('event-form-delete')).toBeInTheDocument()
  })

  it('ouvre le dialog de confirmation puis appelle onDelete', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <EventEditForm
        defaultValues={baseDefaults}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
      />,
    )
    await userEvent.click(screen.getByTestId('event-form-delete'))
    await userEvent.click(await screen.findByTestId('mock-delete-confirm'))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})

function renderWithDelete(onDelete: (() => Promise<void>) | undefined) {
  const view = render(
    <EventEditForm
      defaultValues={baseDefaults}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      onDelete={onDelete}
    />,
  )
  return {
    rerender: (next: (() => Promise<void>) | undefined) =>
      view.rerender(
        <EventEditForm
          defaultValues={baseDefaults}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          onDelete={next}
        />,
      ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})
