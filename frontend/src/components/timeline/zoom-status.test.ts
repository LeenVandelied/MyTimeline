import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { indexEventsByResource } from './zoom'

/**
 * #812 — statut « Terminé / En cours / À venir » de la frise, dérivé de `isPastEvent` et
 * de l'occurrence réelle qui couvre aujourd'hui. `today` en heure LOCALE (15 h 30) pour
 * prouver qu'un événement finissant aujourd'hui n'est pas « terminé » : la comparaison
 * se fait en jours civils, pas en instants.
 */
const TODAY = new Date(2026, 8, 22, 15, 30)
const RANGE_START = new Date(2026, 7, 1)

function evt(
  start: string,
  end: string,
  extendedProps: Record<string, unknown> = {},
): FullCalendarEvent {
  return {
    id: 'e1',
    title: 'Événement',
    start,
    end,
    allDay: true,
    resourceId: 'p1',
    extendedProps: {
      productId: 'p1',
      productName: 'Produit',
      category: 'Cat',
      type: 'duration',
      ...extendedProps,
    },
  } as FullCalendarEvent
}

const geometry = (event: FullCalendarEvent) => {
  const [g] = indexEventsByResource([event], RANGE_START, TODAY).get('p1') ?? []
  return g
}

describe('indexEventsByResource — statut et verdict passé (#812)', () => {
  it('un événement qui finit aujourd’hui est « en cours », pas passé', () => {
    const g = geometry(evt('2026-09-20', '2026-09-22'))
    expect(g.status).toBe('ongoing')
    expect(g.past).toBe(false)
  })

  it('une série bornée dont une occurrence couvre aujourd’hui est « en cours »', () => {
    // Hebdo 15/09, 22/09 (couvre 22→23/09), 29/09 ; borne 06/10.
    const g = geometry(
      evt('2026-09-15', '2026-09-16', {
        isRecurring: true,
        recurrenceUnit: 'WEEK',
        recurrenceEndDate: '2026-10-06',
      }),
    )
    expect(g.status).toBe('ongoing')
    expect(g.past).toBe(false)
  })

  it('une série bornée entre deux occurrences est « à venir »', () => {
    // Hebdo 17/09 (révolue), 24/09 : aujourd'hui (22/09) tombe entre les deux.
    const g = geometry(
      evt('2026-09-17', '2026-09-18', {
        isRecurring: true,
        recurrenceUnit: 'WEEK',
        recurrenceEndDate: '2026-10-15',
      }),
    )
    expect(g.status).toBe('upcoming')
    expect(g.past).toBe(false)
  })

  it('une série sans fin entre deux occurrences est « à venir »', () => {
    const g = geometry(
      evt('2026-09-17', '2026-09-18', {
        isRecurring: true,
        recurrenceUnit: 'WEEK',
        recurrenceEndDate: null,
      }),
    )
    expect(g.status).toBe('upcoming')
    expect(g.past).toBe(false)
  })

  it('une série bornée révolue est « terminée » alors que sa borne tombe après aujourd’hui', () => {
    // Occurrences 30/08 … 20/09 (→ 21/09) ; borne 26/09, 27/09 hors borne.
    const g = geometry(
      evt('2026-08-30', '2026-08-31', {
        isRecurring: true,
        recurrenceUnit: 'WEEK',
        recurrenceEndDate: '2026-09-26',
      }),
    )
    expect(g.status).toBe('expired')
    expect(g.past).toBe(true)
  })

  it('un ponctuel futur est « à venir », un ponctuel d’hier est « terminé »', () => {
    expect(geometry(evt('2026-10-01', '2026-10-01', { type: 'single' })).status).toBe('upcoming')
    const yesterday = geometry(evt('2026-09-21', '2026-09-21', { type: 'single' }))
    expect(yesterday.status).toBe('expired')
    expect(yesterday.past).toBe(true)
  })
})
