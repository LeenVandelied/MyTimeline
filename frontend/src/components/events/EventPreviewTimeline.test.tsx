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

    expect(screen.getByTestId('event-form-preview-legend').querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-06-12',
    )
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

describe('EventPreviewTimeline — plancher de lisibilité des traits colorés (#497)', () => {
  /**
   * ⚠ PORTÉE DE CES TESTS. `jsdom` ne peint rien, ne résout pas `color-mix()`
   * et n'applique aucune feuille du DS : ils ne peuvent PAS prouver un contraste
   * ([[PIT-S48-002]], [[jsdom-scroll-tests-prove-nothing]]). Ils prouvent le
   * CÂBLAGE — que les variables calculées sont réellement posées sur les deux
   * bons éléments — parce que c'est exactement le mode d'échec « symbole testé,
   * zéro appelant » de [[PIT-S61-002]]. Le contraste, lui, est mesuré au
   * navigateur par `e2e/sprint-70-preview-visual.spec.ts`.
   */
  const recurring = { isRecurring: true, recurrenceUnit: 'MONTH' as const }

  it('pose les DEUX variables de thème sur le connecteur ET sur le fantôme', () => {
    // Citron : cassé en CLAIR (2.20 / 2.07 mesurés au S70), conforme en sombre.
    renderPreview({ ...recurring, color: '#A7B83A' })

    for (const testid of ['event-form-preview-connector', 'event-form-preview-ghost']) {
      const el = screen.getByTestId(testid)
      const light = el.style.getPropertyValue('--mt-evt-outline')
      const dark = el.style.getPropertyValue('--mt-evt-outline-dark')
      // Casse indifférente : une couleur DÉJÀ conforme ressort telle qu'elle a
      // été saisie (`contrastFloor` court-circuite sans passer par `mixHex`).
      expect(light, `${testid} — plancher clair absent`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(dark, `${testid} — plancher sombre absent`).toMatch(/^#[0-9a-f]{6}$/i)
      // Le pire cas du citron est le thème CLAIR : c'est là que la couleur doit
      // avoir bougé, et seulement là.
      expect(light.toLowerCase(), `${testid} — clair non planché`).not.toBe('#a7b83a')
      expect(dark.toLowerCase(), `${testid} — sombre modifié sans raison`).toBe('#a7b83a')
    }
  })

  it('le connecteur porte la classe DS et non plus un `borderColor` inline', () => {
    renderPreview({ ...recurring, color: '#A7B83A' })

    const connector = screen.getByTestId('event-form-preview-connector')
    expect(connector).toHaveClass('mt-evt-connector')
    // Un inline survivant écraserait la commutation `.dark` et rendrait le
    // plancher sombre inopérant sans qu'aucun test unitaire ne le voie.
    expect(connector.style.borderColor).toBe('')
  })

  it('le FOND de l’événement reste la couleur BRUTE (périmètre strict)', () => {
    renderPreview({ ...recurring, color: '#A7B83A' })

    // La barre pleine et le fond à 8 % du fantôme portent l'identité colorée :
    // le plancher ne les touche pas. Étendre le plancher aux aplats serait un
    // élargissement de doctrine sans mandat.
    for (const testid of ['event-form-preview-bar', 'event-form-preview-ghost']) {
      expect(screen.getByTestId(testid).style.getPropertyValue('--mt-evt')).toBe('#A7B83A')
    }
    expect(
      screen.getByTestId('event-form-preview-bar').style.getPropertyValue('--mt-evt-outline'),
    ).toBe('')
  })

  it('sans couleur choisie, aucune variable n’est émise (repli DS intact)', () => {
    renderPreview({ ...recurring, color: undefined })

    for (const testid of ['event-form-preview-connector', 'event-form-preview-ghost']) {
      const el = screen.getByTestId(testid)
      expect(el.style.getPropertyValue('--mt-evt-outline')).toBe('')
      expect(el.style.getPropertyValue('--mt-evt-outline-dark')).toBe('')
    }
  })
})
