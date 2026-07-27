import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventPreviewTimeline } from './EventPreviewTimeline'

/**
 * #315 — Mini-frise d'aperçu (handoff §6) : règle + marqueur TODAY, occurrence
 * pleine, connecteur pointillé + occurrence fantôme (récurrence), légende
 * « prochaine occurrence ».
 *
 * `now` est INJECTÉ → assertions déterministes (pas de dépendance à la date du
 * runner). next-intl mocké → assertions locale-agnostiques (`namespace.key`).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

const NOW = new Date(2026, 4, 10)

function renderPreview(props: Partial<React.ComponentProps<typeof EventPreviewTimeline>> = {}) {
  return render(
    <EventPreviewTimeline
      title="Révision annuelle"
      color="#3B82F6"
      type="duration"
      durationValue={3}
      durationUnit="days"
      startDate="2026-05-12"
      isRecurring={false}
      now={NOW}
      {...props}
    />,
  )
}

describe('EventPreviewTimeline — frise de base', () => {
  it('rend la règle temporelle et le marqueur TODAY', () => {
    renderPreview()

    expect(screen.getByTestId('event-form-preview')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-preview-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-preview-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('event-form-preview-today')).toHaveTextContent('common.buttons.today')
  })

  it('rend la barre de l’occurrence avec le titre et la couleur choisie', () => {
    renderPreview()

    const bar = screen.getByTestId('event-form-preview-bar')
    expect(bar).toHaveTextContent('Révision annuelle')
    expect(bar.style.getPropertyValue('--mt-evt')).toBe('#3B82F6')
    // Encre calculée par contraste (BR-EVE-009) — jamais un blanc hardcodé.
    expect(bar.style.getPropertyValue('--mt-evt-ink')).not.toBe('')
  })

  it('retombe sur le libellé d’exemple quand le titre est vide', () => {
    renderPreview({ title: '   ' })

    expect(screen.getByTestId('event-form-preview-bar')).toHaveTextContent(
      'products.details.sampleEvent',
    )
  })

  it('affiche la légende « prochaine occurrence » avec la date de début (non récurrent)', () => {
    renderPreview()

    const legend = screen.getByTestId('event-form-preview-legend')
    expect(legend).toHaveTextContent('products.details.previewTimeline.nextOccurrence')
    expect(legend.querySelector('time')).toHaveAttribute('datetime', '2026-05-12')
  })

  it('n’affiche NI fantôme NI connecteur NI récurrence pour un événement ponctuel', () => {
    renderPreview({ type: 'single', durationValue: null, durationUnit: null })

    expect(screen.queryByTestId('event-form-preview-ghost')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-preview-connector')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-form-preview-recurrence')).not.toBeInTheDocument()
  })
})

describe('EventPreviewTimeline — récurrence (handoff §6)', () => {
  it('rend le connecteur pointillé + l’occurrence fantôme', () => {
    renderPreview({ isRecurring: true, recurrenceUnit: 'MONTH' })

    const ghost = screen.getByTestId('event-form-preview-ghost')
    // Contour pointillé du DS (`.mt-evt--draft`), pas une barre pleine.
    expect(ghost).toHaveClass('mt-evt--draft')
    expect(screen.getByTestId('event-form-preview-connector')).toBeInTheDocument()
  })

  it('pointe la prochaine occurrence sur le fantôme, pas sur le début', () => {
    renderPreview({ isRecurring: true, recurrenceUnit: 'MONTH' })

    expect(
      screen.getByTestId('event-form-preview-legend').querySelector('time'),
    ).toHaveAttribute('datetime', '2026-06-12')
  })

  it('rend le libellé de récurrence fourni par le formulaire (testid historique #300)', () => {
    renderPreview({
      isRecurring: true,
      recurrenceUnit: 'MONTH',
      recurrenceLabel: 'Récurrent · Mois',
    })

    expect(screen.getByTestId('event-form-preview-recurrence')).toHaveTextContent(
      'Récurrent · Mois',
    )
  })

  it('pas de fantôme quand la fréquence manque (BR-EVE-006)', () => {
    renderPreview({ isRecurring: true, recurrenceUnit: null })

    expect(screen.queryByTestId('event-form-preview-ghost')).not.toBeInTheDocument()
  })
})
