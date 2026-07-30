import { describe, expect, it } from 'vitest'
import { DEFAULT_COLOR, type FullCalendarEvent } from '@/types/event'
import { buildEventAriaLabel, eventLabelReadableInside } from './lib'

/**
 * #81 — Tests des helpers a11y purs (aria-label agrégé + garde-fou contraste).
 * `t` mocké renvoie la clé (assertions locale-agnostiques).
 */
const t = (k: string) => k

function evt(overrides: Partial<FullCalendarEvent> = {}): FullCalendarEvent & { status: 'upcoming' } {
  return {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    status: 'upcoming',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
    ...overrides,
  } as FullCalendarEvent & { status: 'upcoming' }
}

describe('buildEventAriaLabel', () => {
  it('agrège titre + statut + dates + produit en UNE phrase (séparée par des virgules)', () => {
    const label = buildEventAriaLabel(evt(), 'fr-FR', t)
    expect(label).toContain('Péremption lait')
    expect(label).toContain('dashboard.timeline.status.upcoming')
    expect(label).toContain('Lait bio')
    // Une seule chaîne, virgules comme séparateurs (annonce unique).
    expect(label.split(', ').length).toBeGreaterThanOrEqual(4)
  })

  it('ajoute le statut de récurrence quand isRecurring + recurrenceUnit (BR-EVE-006)', () => {
    const label = buildEventAriaLabel(
      evt({
        extendedProps: {
          productId: 'p1',
          productName: 'Lait bio',
          category: 'Frais',
          type: 'duration',
          isRecurring: true,
          recurrenceUnit: 'WEEK',
        },
      }),
      'fr-FR',
      t,
    )
    expect(label).toContain('dashboard.timeline.recurrence.week')
  })

  it('n’annonce PAS la récurrence si isRecurring absent/false', () => {
    const label = buildEventAriaLabel(evt(), 'fr-FR', t)
    expect(label).not.toContain('recurrence')
  })

  it('n’annonce PAS la récurrence si recurrenceUnit manque (isRecurring seul)', () => {
    const label = buildEventAriaLabel(
      evt({
        extendedProps: {
          productId: 'p1',
          productName: 'Lait bio',
          category: 'Frais',
          type: 'duration',
          isRecurring: true,
          recurrenceUnit: null,
        },
      }),
      'fr-FR',
      t,
    )
    expect(label).not.toContain('recurrence')
  })
})

describe('eventLabelReadableInside (garde-fou contraste, point 6)', () => {
  it('fond foncé → encre claire lisible dedans (true)', () => {
    expect(eventLabelReadableInside('#0B0C0E')).toBe(true)
  })

  it('citron #A7B83A → encre noire lisible dedans (8.91:1, true, pas de fallback)', () => {
    // Le helper choisit la MEILLEURE encre : noir passe largement AA sur ce ton clair.
    expect(eventLabelReadableInside('#A7B83A')).toBe(true)
  })

  it('indigo #6366f1 → aucune encre n’atteint 4.5:1 (4.47, false → libellé dehors)', () => {
    // Échantillon de couleur NON conforme : ni noir ni blanc ne passe AA sur ce ton,
    // d'où le libellé de secours À L'EXTÉRIEUR de la barre. #393 : ce hex a CESSÉ
    // d'être la couleur event par défaut (c'était précisément le bug — l'état normal
    // était le pire cas) ; il reste un excellent cas de test du fallback.
    expect(eventLabelReadableInside('#6366f1')).toBe(false)
  })

  // #393 — FILET ANTI-RÉGRESSION : la couleur event par défaut doit rester lisible
  // DEDANS. Porte sur la constante IMPORTÉE (pas un littéral recopié) → rougit si
  // quelqu'un remet un jour un `DEFAULT_COLOR` sous 4.5:1.
  it('DEFAULT_COLOR → lisible DEDANS (AA franchi, pas de libellé dehors)', () => {
    expect(eventLabelReadableInside(DEFAULT_COLOR)).toBe(true)
  })

  it('couleur absente → considéré lisible (theming DS, true)', () => {
    expect(eventLabelReadableInside(undefined)).toBe(true)
    expect(eventLabelReadableInside(null)).toBe(true)
  })
})
