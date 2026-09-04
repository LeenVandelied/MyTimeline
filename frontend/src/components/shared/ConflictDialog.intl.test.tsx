import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import type { Event, EventEditFormValues } from '@/types/event'
import { ConflictDialog } from './ConflictDialog'
import commonMessages from '../../../public/locales/fr/common.json'

/**
 * #441 — Intégration next-intl RÉELLE de `ConflictDialog`.
 *
 * Même raison d'être que `DeleteConfirmDialog.intl.test.tsx` : `ConflictDialog.test.tsx`
 * mocke `next-intl` en `` `${namespace}.${key}` `` et ne peut donc pas distinguer
 * `useTranslations('conflictDialog')` (cassé) de `'common.conflictDialog'` (juste).
 * Constaté en navigateur avant correction : le dialog de conflit affichait
 * « conflictDialog.title » / « conflictDialog.description » à l'utilisateur, dans
 * les 4 locales, sur un vrai 409 d'optimistic locking.
 *
 * COUVERTURE VISÉE EN PRIORITÉ : la clé DYNAMIQUE `t(`fields.${f.key}`)` du mode
 * comparatif — 11 champs, aucun vérifiable statiquement. Le cas « diff » ci-dessous
 * force au moins deux d'entre eux à être résolus pour de vrai.
 */

const SERVER_EVENT = {
  id: 'evt-1',
  title: 'Titre serveur',
  type: 'single',
  durationValue: null,
  durationUnit: null,
  isRecurring: false,
  recurrenceUnit: null,
  recurrenceEndDate: null,
  startDate: '2026-08-31',
  endDate: '2026-08-31',
  color: '#3B62D4',
  archived: false,
} as unknown as Event

const LOCAL_VALUES = {
  ...SERVER_EVENT,
  title: 'Titre local',
  archived: true,
} as unknown as EventEditFormValues

function renderWithRealIntl(
  props: Partial<React.ComponentProps<typeof ConflictDialog>> = {},
): string[] {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale="fr"
      timeZone="Europe/Paris"
      messages={{ common: commonMessages }}
      onError={(error) => errors.push(error.message)}
    >
      <ConflictDialog open onOpenChange={vi.fn()} onReload={vi.fn()} {...props} />
    </NextIntlClientProvider>,
  )
  return errors
}

describe('ConflictDialog — intégration next-intl réelle (#441)', () => {
  it('mode legacy : titre, description et actions TRADUITS', () => {
    const errors = renderWithRealIntl()
    expect(screen.getByText('Modifié ailleurs')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-reload')).toHaveTextContent(
      'Recharger les données à jour',
    )
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    // Assertion frontale du symptôme utilisateur : aucun chemin de clé à l'écran.
    expect(document.body.textContent).not.toMatch(/conflictDialog\./)
    expect(errors).toEqual([])
  })

  it('mode comparatif : en-têtes de colonnes et actions TRADUITS', () => {
    const errors = renderWithRealIntl({
      serverEvent: SERVER_EVENT,
      localValues: LOCAL_VALUES,
      onKeepMine: vi.fn(),
      onTakeServer: vi.fn(),
    })
    expect(screen.getByText('Champ')).toBeInTheDocument()
    expect(screen.getByText('Vos modifications')).toBeInTheDocument()
    expect(screen.getByText('Version serveur')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-keep-mine')).toHaveTextContent(
      'Garder mes modifications',
    )
    expect(screen.getByTestId('conflict-dialog-take-server')).toHaveTextContent(
      'Prendre la version serveur',
    )
    expect(errors).toEqual([])
  })

  it('mode comparatif : libellés de champ dynamiques `fields.*` TRADUITS', () => {
    const errors = renderWithRealIntl({
      serverEvent: SERVER_EVENT,
      localValues: LOCAL_VALUES,
      onKeepMine: vi.fn(),
      onTakeServer: vi.fn(),
    })

    // `title` et `archived` diffèrent → deux lignes de diff, donc deux résolutions
    // de la clé dynamique `t(`fields.${f.key}`)`.
    const rows = screen.getAllByTestId('conflict-dialog-diff-row')
    expect(rows.map((r) => r.getAttribute('data-field'))).toEqual(['title', 'archived'])
    expect(rows[0]).toHaveTextContent('Titre')
    expect(rows[1]).toHaveTextContent('Archivé')
    // Rendu booléen (`t('yes')` / `t('no')`) résolu, pas un chemin de clé.
    expect(rows[1]).toHaveTextContent('Oui')
    expect(rows[1]).toHaveTextContent('Non')
    expect(document.body.textContent).not.toMatch(/conflictDialog\./)
    expect(errors).toEqual([])
  })

  it('#310 — message de plafond keep-mine TRADUIT (pas un chemin de cle)', () => {
    const errors = renderWithRealIntl({
      serverEvent: SERVER_EVENT,
      localValues: LOCAL_VALUES,
      onKeepMine: vi.fn(),
      onTakeServer: vi.fn(),
      keepMineExhausted: true,
    })
    const alert = screen.getByTestId('conflict-dialog-keep-mine-exhausted')
    expect(alert).toHaveTextContent('Trop de tentatives')
    // PIT-S63-006 : un namespace faux resterait invisible sous le mock `${ns}.${key}`.
    expect(document.body.textContent).not.toMatch(/conflictDialog\./)
    expect(errors).toEqual([])
  })
})
