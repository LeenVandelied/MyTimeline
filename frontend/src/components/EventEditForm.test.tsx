import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventEditForm, type EventEditFormValues } from './EventEditForm'
import { useRecurrencePreview } from '@/hooks/useRecurrencePreview'

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

// #67 — `EventEditForm` interroge désormais `useRecurrencePreview` (useQuery) pour
// le hint « plafond 4000 ». On mocke le HOOK (pas de QueryClientProvider dans ces
// tests, et on veut piloter `capped` sans réseau). Défaut : aucune donnée → pas de hint.
vi.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: vi.fn(() => ({ data: undefined })),
}))

const previewResult = (data: { count: number; capped: boolean } | undefined) =>
  ({ data }) as unknown as ReturnType<typeof useRecurrencePreview>

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
      expect(screen.getByTestId('event-form-preview-bar').style.getPropertyValue('--mt-evt')).toBe(
        '#3B82F6',
      ),
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
      <EventEditForm
        defaultValues={baseDefaults}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitState="error"
      />,
    )
    expect(screen.queryByTestId('event-form-conflict')).not.toBeInTheDocument()
    rerender(
      <EventEditForm
        defaultValues={baseDefaults}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitState="idle"
      />,
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
    // #230 — l'archivage passe désormais par une confirmation (effet quota).
    await userEvent.click(toggle)
    await userEvent.click(await screen.findByTestId('event-archive-confirm-button'))
    await waitFor(() => expect(toggle).toBeChecked())
  })

  it('la soumission (PATCH) transmet archived après toggle', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByTestId('event-form-archived-toggle'))
    await userEvent.click(await screen.findByTestId('event-archive-confirm-button'))
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ archived: true })
  })
})

/* ===========================================================================
   #230 — UX de l'archivage : confirmation (effet quota BR-EVE-011) + verrou
   d'édition (BR-EVE-013). Les tests ci-dessous couvrent les volets 1 et 3 du
   critère d'acceptation ; le volet 2 (grisage dans la frise) est couvert par
   `timeline/EventPill.test.tsx` et `timeline/lib-a11y.test.ts`.
   =========================================================================== */
describe('EventEditForm — #230 confirmation d’archivage (BR-EVE-011)', () => {
  it('cocher « archivé » n’archive PAS directement : une confirmation s’ouvre', async () => {
    setup()
    const toggle = screen.getByTestId('event-form-archived-toggle')
    await userEvent.click(toggle)
    expect(await screen.findByTestId('event-archive-confirm')).toBeInTheDocument()
    // Le toggle reste décoché tant que rien n'est confirmé (checkbox contrôlée).
    expect(toggle).not.toBeChecked()
  })

  it('la confirmation énonce l’EFFET sur les events actifs + la réversibilité + la lecture seule', async () => {
    setup()
    await userEvent.click(screen.getByTestId('event-form-archived-toggle'))
    const dialog = await screen.findByTestId('event-archive-confirm')
    // BR-EVE-011 : l'effet quota est porté par la DESCRIPTION du dialog, que Radix
    // câble en `aria-describedby` → annoncé à l'ouverture.
    expect(dialog).toHaveTextContent('products.archiveDialog.quotaEffect')
    expect(screen.getByTestId('event-archive-confirm-reversible')).toHaveTextContent(
      'products.archiveDialog.reversible',
    )
    expect(screen.getByTestId('event-archive-confirm-readonly')).toHaveTextContent(
      'products.archiveDialog.readOnly',
    )
  })

  it('annuler laisse l’événement ACTIF et le formulaire éditable', async () => {
    setup()
    const toggle = screen.getByTestId('event-form-archived-toggle')
    await userEvent.click(toggle)
    await userEvent.click(await screen.findByTestId('event-archive-cancel'))
    await waitFor(() =>
      expect(screen.queryByTestId('event-archive-confirm')).not.toBeInTheDocument(),
    )
    expect(toggle).not.toBeChecked()
    expect(screen.getByTestId('event-form-title-input')).not.toBeDisabled()
  })

  it('DÉSARCHIVER ne demande AUCUNE confirmation (sortie du verrou immédiate)', async () => {
    setup({ defaultValues: { ...baseDefaults, archived: true } })
    const toggle = screen.getByTestId('event-form-archived-toggle')
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(screen.queryByTestId('event-archive-confirm')).not.toBeInTheDocument()
  })

  it('mode create : ni toggle ni confirmation (archived est PATCH-only, BR-EVE-013)', () => {
    setup({ mode: 'create' })
    expect(screen.queryByTestId('event-form-archived-toggle')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-archive-confirm')).not.toBeInTheDocument()
  })
})

describe('EventEditForm — #230 verrou d’édition d’un archivé (BR-EVE-013)', () => {
  const LOCKED_FIELDS = [
    'event-form-title-input',
    'event-form-duration-value',
    'event-form-start-date',
    'event-form-end-date',
    'event-form-color-input',
    'event-form-recurring-toggle',
  ]

  it('archived=true : les champs d’édition sont désactivés', () => {
    setup({ defaultValues: { ...baseDefaults, archived: true } })
    for (const testId of LOCKED_FIELDS) {
      expect(screen.getByTestId(testId), `${testId} doit être désactivé`).toBeDisabled()
    }
    expect(screen.getByTestId('event-form-type-trigger')).toBeDisabled()
  })

  it('archived=true : le toggle d’archivage et le submit RESTENT actifs (désarchivage possible)', () => {
    setup({ defaultValues: { ...baseDefaults, archived: true } })
    expect(screen.getByTestId('event-form-archived-toggle')).not.toBeDisabled()
    expect(screen.getByTestId('event-form-submit')).not.toBeDisabled()
  })

  it('archived=true : une explication TEXTUELLE accompagne le grisage (a11y)', () => {
    setup({ defaultValues: { ...baseDefaults, archived: true } })
    const note = screen.getByTestId('event-form-archived-lock-note')
    expect(note).toHaveTextContent('products.add.event.form.archivedLockNote')
    // Le champ désactivé pointe l'explication : un grisage muet n'est pas suffisant.
    expect(screen.getByTestId('event-form-title-input')).toHaveAttribute(
      'aria-describedby',
      note.getAttribute('id'),
    )
  })

  it('archived=false : aucun champ désactivé, aucune note (non-régression)', () => {
    setup()
    for (const testId of LOCKED_FIELDS) {
      expect(screen.getByTestId(testId)).not.toBeDisabled()
    }
    expect(screen.queryByTestId('event-form-archived-lock-note')).not.toBeInTheDocument()
  })

  it('le verrou suit le toggle DANS la session : confirmer archive → champs verrouillés', async () => {
    setup()
    expect(screen.getByTestId('event-form-title-input')).not.toBeDisabled()
    await userEvent.click(screen.getByTestId('event-form-archived-toggle'))
    await userEvent.click(await screen.findByTestId('event-archive-confirm-button'))
    await waitFor(() => expect(screen.getByTestId('event-form-title-input')).toBeDisabled())
    expect(screen.getByTestId('event-form-archived-lock-note')).toBeInTheDocument()
  })

  it('le verrou NE VIDE PAS les valeurs : le PATCH de désarchivage reste complet (BR-EVE-016/006)', async () => {
    // Piège évité : l'option `disabled` de RHF met la valeur à `undefined`. Le payload
    // partirait avec des dates vidées → garde backend endDate>=startDate sur un état
    // fusionné incohérent. Ici `disabled` est posé sur le NŒUD DOM seulement.
    const { onSubmit } = setup({ defaultValues: { ...baseDefaults, archived: true } })
    await userEvent.click(screen.getByTestId('event-form-archived-toggle'))
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      archived: false,
      title: 'Mon événement',
      type: 'duration',
      durationValue: 3,
      durationUnit: 'days',
      startDate: '2026-05-01',
      endDate: '2026-05-04',
      color: '#3B82F6',
    })
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
  // #67 — `clearAllMocks` ne réinitialise PAS les `mockReturnValue` : on repose le
  // défaut « pas de preview » pour ne pas fuiter un `capped:true` d'un test à l'autre.
  vi.mocked(useRecurrencePreview).mockReturnValue(previewResult(undefined))
})

/* ===========================================================================
   #67 — Hint « plafond 4000 occurrences récurrentes » (flag `capped` de la
   preview #439). NON bloquant, sous le champ `recurrenceEndDate`. Le hook
   `useRecurrencePreview` est mocké (cf. haut de fichier) pour piloter `capped`.
   =========================================================================== */
describe('EventEditForm — #67 hint plafond 4000 occurrences', () => {
  const recurringDefaults: EventEditFormValues = {
    ...baseDefaults,
    isRecurring: true,
    recurrenceUnit: 'WEEK',
  }

  it('capped=true → le hint est visible sous recurrenceEndDate', () => {
    vi.mocked(useRecurrencePreview).mockReturnValue(previewResult({ count: 4000, capped: true }))
    setup({ defaultValues: recurringDefaults })
    const hint = screen.getByTestId('event-form-recurrence-capped-hint')
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveTextContent('products.add.event.form.recurrenceCappedHint')
    // Ton informatif : role=status (pas alert), aria-live poli (avertissement neutre).
    expect(hint).toHaveAttribute('role', 'status')
    expect(hint).toHaveAttribute('aria-live', 'polite')
  })

  it('capped=false → aucun hint', () => {
    vi.mocked(useRecurrencePreview).mockReturnValue(previewResult({ count: 12, capped: false }))
    setup({ defaultValues: recurringDefaults })
    expect(screen.queryByTestId('event-form-recurrence-capped-hint')).not.toBeInTheDocument()
  })

  it('réponse absente (query non résolue / désactivée) → aucun hint', () => {
    // Défaut du mock : data undefined.
    setup({ defaultValues: recurringDefaults })
    expect(screen.queryByTestId('event-form-recurrence-capped-hint')).not.toBeInTheDocument()
  })

  it('récurrence désactivée → ni champ recurrenceEndDate ni hint (même si capped=true)', () => {
    vi.mocked(useRecurrencePreview).mockReturnValue(previewResult({ count: 4000, capped: true }))
    setup({ defaultValues: { ...baseDefaults, isRecurring: false } })
    expect(screen.queryByTestId('event-form-recurrence-end-date')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-recurrence-capped-hint')).not.toBeInTheDocument()
  })

  it('le hint ne BLOQUE PAS la soumission (capped=true → onSubmit appelé)', async () => {
    vi.mocked(useRecurrencePreview).mockReturnValue(previewResult({ count: 4000, capped: true }))
    const { onSubmit } = setup({ defaultValues: recurringDefaults })
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  })
})

/**
 * #79 — Props OPT-IN d'évitement du clavier mobile (`compact`, `footerPortalNode`).
 *
 * PROUVENT : le no-op par défaut (desktop/drawer inchangés), le retrait des champs
 * secondaires en mode réduit, la CONSERVATION de leurs valeurs dans le payload, et
 * que la rangée d'actions portalisée reste SOUMETTANTE.
 * NE PROUVENT PAS : que le pied est visible au-dessus d'un clavier réel — jsdom ne
 * fait aucune mise en page (cf. `useMobileKeyboard.test.ts`).
 */
describe('EventEditForm — #79 mode réduit & pied déporté', () => {
  it('sans prop : rien ne bouge (couleur, récurrence, actions dans le formulaire)', () => {
    setup()
    expect(screen.getByTestId('event-form-color-input')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-recurring-toggle')).toBeInTheDocument()
    // La rangée d'actions reste DANS le `<form>` : aucun portail, aucun pied.
    expect(screen.getByTestId('event-form')).toContainElement(
      screen.getByTestId('event-form-submit'),
    )
  })

  it('compact : couleur + récurrence retirées, champs primaires conservés', () => {
    setup({ compact: true })
    expect(screen.queryByTestId('event-form-color-input')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-recurring-toggle')).not.toBeInTheDocument()
    // Les champs sans lesquels l'événement n'est pas créable restent là.
    expect(screen.getByTestId('event-form-title-input')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-start-date')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-type-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-submit')).toBeInTheDocument()
  })

  it('compact : les valeurs NON MONTÉES partent quand même (BR-EVE-007 / BR-EVE-009)', async () => {
    // Le cœur du risque métier : masquer un champ ne doit PAS vider sa valeur.
    // RHF ne désenregistre pas les champs démontés (`shouldUnregister` défaut false),
    // donc `color` et `isRecurring` restent dans le payload.
    const { onSubmit } = setup({ compact: true })
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      color: '#3B82F6',
      isRecurring: false,
      title: 'Mon événement',
    })
  })

  it('footerPortalNode : les actions sont rendues DANS le nœud fourni et soumettent', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    try {
      const { onSubmit } = setup({ footerPortalNode: host })
      const submit = screen.getByTestId('event-form-submit')
      const formEl = screen.getByTestId('event-form')

      expect(host).toContainElement(submit)
      // Le portail sort le bouton du `<form>` : sans propriétaire de formulaire
      // explicite, le clic ne soumettrait RIEN (pas de `onSubmit` React).
      expect(formEl).not.toContainElement(submit)
      expect(submit).toHaveAttribute('form', formEl.getAttribute('id'))

      await userEvent.click(submit)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    } finally {
      host.remove()
    }
  })
})
