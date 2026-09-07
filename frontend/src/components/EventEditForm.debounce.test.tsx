import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EventEditForm, type EventEditFormValues } from './EventEditForm'

/**
 * #507 — GARDE de `BR-EVE-017` : l'aperçu live de `EventEditForm` est alimenté par
 * des valeurs DÉBOUNCÉES à 150 ms (helper local `useDebounced`), jamais par les
 * `watch()` bruts de react-hook-form.
 *
 * ⚠ POURQUOI UN FICHIER DÉDIÉ, et pourquoi ces assertions-là.
 *
 * Le seul test qui citait `BR-EVE-017` jusqu'ici — « l'aperçu épinglé reste LIVE »
 * dans `events/NewEventDrawer.test.tsx` — assert un `waitFor(toHaveTextContent(…))`.
 * Cette forme passe À L'IDENTIQUE avec et sans debounce : elle protège le PORTAIL
 * d'affichage (la valeur finit par traverser l'arbre React), pas le contrat de perf.
 * C'était donc un faux positif de couverture, pas une garde.
 *
 * Le pouvoir discriminant vient d'assertions sur le NON-RENDU pendant la fenêtre :
 * à `t + 149 ms` l'aperçu doit encore afficher l'ANCIENNE valeur, la nouvelle
 * n'arrivant qu'à `t + 150 ms`. Rebrancher une prop d'aperçu sur `form.watch(…)`
 * brut rend la nouvelle valeur IMMÉDIATEMENT → l'assertion « ancienne valeur »
 * échoue. Vérifié manuellement avant merge (cf. `docs/memory/sprints/sprint-82/`).
 *
 * Chaque test vérifie AUSSI que le champ de saisie porte bien la nouvelle valeur
 * dès la frappe : sans ce garde-fou, un test où RIEN ne se propage (champ inerte,
 * testid renommé) passerait pour un debounce correct.
 *
 * Faux amis évités : pas d'assertion de géométrie en pixels (jsdom ne mesure ni
 * ne clampe le layout — cf. la note `scrollTo` de `vitest.setup.ts`). Les
 * observables retenus sont textuels ou déclaratifs : libellé de la barre,
 * propriété personnalisée `--mt-evt`, attribut `dateTime` de la légende.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({ color }: { color: string }) => (
    <div data-testid="mock-picker" data-color={color} />
  ),
}))

// Le hint « plafond 4000 » n'a rien à voir avec cette garde : on neutralise la query.
vi.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: () => ({ data: undefined }),
}))

vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}))

/** Délai porté par `useDebounced` dans `EventEditForm` (BR-EVE-017). */
const DEBOUNCE_MS = 150

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

function setup() {
  render(<EventEditForm defaultValues={baseDefaults} onSubmit={vi.fn()} onCancel={vi.fn()} />)
}

/**
 * Avance les timers factices en purgeant les mises à jour React qu'ils déclenchent.
 * `await act(async …)` (et non `act(…)` synchrone) : le resolver Zod de RHF résout
 * des microtâches à chaque frappe — sans le `await`, elles retombent hors `act`.
 */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('EventEditForm — BR-EVE-017 : l’aperçu est alimenté par des valeurs débouncées à 150 ms', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('titre : la barre garde l’ancien libellé pendant la fenêtre, et seulement pendant', async () => {
    setup()
    // L'aperçu est monté avec la valeur initiale (le debounce ne retarde que les
    // CHANGEMENTS : `useDebounced` s'initialise sur la valeur courante).
    expect(screen.getByTestId('event-form-preview-bar')).toHaveTextContent('Mon événement')

    await act(async () => {
      fireEvent.change(screen.getByTestId('event-form-title-input'), {
        target: { value: 'Refonte' },
      })
    })
    // Garde-fou : la frappe a bien été enregistrée par le formulaire.
    expect(screen.getByTestId('event-form-title-input')).toHaveValue('Refonte')

    await advance(DEBOUNCE_MS - 1)
    // ⚠ L'ASSERTION QUI PORTE LA RÈGLE. Avec `title={form.watch('title')}` brut,
    // la barre afficherait déjà « Refonte » ici et ce test rougirait.
    expect(screen.getByTestId('event-form-preview-bar')).toHaveTextContent('Mon événement')
    expect(screen.getByTestId('event-form-preview-bar')).not.toHaveTextContent('Refonte')

    await advance(1)
    expect(screen.getByTestId('event-form-preview-bar')).toHaveTextContent('Refonte')
  })

  it('couleur : `--mt-evt` reste l’ancienne teinte pendant la fenêtre', async () => {
    setup()
    const evtColor = () =>
      screen.getByTestId('event-form-preview-bar').style.getPropertyValue('--mt-evt')
    expect(evtColor()).toBe('#3B82F6')

    await act(async () => {
      fireEvent.change(screen.getByTestId('event-form-color-input'), {
        target: { value: '#FF0000' },
      })
    })
    expect(screen.getByTestId('event-form-color-input')).toHaveValue('#FF0000')

    await advance(DEBOUNCE_MS - 1)
    // Repeindre la barre à chaque caractère tapé dans le champ hex est exactement
    // ce que BR-EVE-017 interdit.
    expect(evtColor()).toBe('#3B82F6')

    await advance(1)
    expect(evtColor()).toBe('#FF0000')
  })

  it('startDate : la fenêtre temporelle de la frise ne se recalcule qu’après 150 ms', async () => {
    setup()
    // Événement non récurrent → `nextOccurrence === startDate` (`previewTimeline.ts`),
    // exposée en clair par l'attribut `dateTime` de la légende : un observable
    // textuel de la GÉOMÉTRIE dérivée, sans mesure de layout (inutilisable en jsdom).
    const nextOccurrence = () =>
      screen
        .getByTestId('event-form-preview-legend')
        .querySelector('time')
        ?.getAttribute('datetime')
    expect(nextOccurrence()).toBe('2026-05-01')

    // Antérieure à `endDate` (2026-05-04) : on ne veut pas qu'une erreur de
    // validation BR-EVE-016 vienne brouiller ce que l'on observe.
    await act(async () => {
      fireEvent.change(screen.getByTestId('event-form-start-date'), {
        target: { value: '2026-04-20' },
      })
    })
    expect(screen.getByTestId('event-form-start-date')).toHaveValue('2026-04-20')

    await advance(DEBOUNCE_MS - 1)
    // Sans debounce, la frise « glisserait » à chaque frappe dans le champ date.
    expect(nextOccurrence()).toBe('2026-05-01')

    await advance(1)
    expect(nextOccurrence()).toBe('2026-04-20')
  })
})
