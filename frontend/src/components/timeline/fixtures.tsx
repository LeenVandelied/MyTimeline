import { EventWithComputedPosition, Resource } from './lib'

/**
 * #47 — Fixtures partagées par les stories Timeline.
 * Données statiques minimales (aucune dépendance runtime) pour rendre les
 * sous-composants isolément en Storybook.
 */

/** Jours factices contigus à partir d'une base fixe (rendu déterministe). */
export function makeDays(count: number, base = new Date(2026, 6, 1)): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

export const sampleResource: Resource = {
  id: 'prod-1',
  title: 'Lait entier bio',
  category: 'Produits frais',
}

/** Event factice positionné + statut, sans passer par `buildEventsByResource`. */
export function makeEvent(
  overrides: Partial<EventWithComputedPosition> = {},
): EventWithComputedPosition {
  return {
    id: 'evt-1',
    title: 'Péremption',
    start: '2026-07-05T00:00:00.000Z',
    end: '2026-07-10T00:00:00.000Z',
    allDay: true,
    resourceId: 'prod-1',
    color: '#6366f1',
    extendedProps: {
      productId: 'prod-1',
      productName: 'Lait entier bio',
      category: 'Produits frais',
      type: 'duration',
    },
    leftPercent: 12,
    widthPercent: 18,
    status: 'upcoming',
    ...overrides,
  }
}

/**
 * Stub de contenu d'EventBar pour Storybook : évite les dépendances next-intl /
 * auth / services de `EventContent`. Reproduit l'aspect compact (titre tronqué).
 */
export function stubEventContent(event: EventWithComputedPosition) {
  return (
    <span className="text-ink block truncate px-2 py-1 text-xs font-medium">{event.title}</span>
  )
}
