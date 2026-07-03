import React from 'react'
import { EventBar } from './EventBar'
import { EventWithComputedPosition, Resource } from './lib'

/**
 * #47 — Lane : une ligne de ressource (produit) avec ses séparateurs de jours
 * et ses events. Extrait tel quel du monolithe.
 * data-testid `timeline-resource-row` / `timeline-resource-title` PRÉSERVÉS.
 *
 * `renderEventContent` est relayé à chaque EventBar (défaut = `EventContent`).
 */
export interface LaneProps {
  resource: Resource
  events: EventWithComputedPosition[]
  /** Nombre de jours de la fenêtre (grille des séparateurs verticaux). */
  daysCount: number
  /** Clé stable par séparateur de jour (ISO du jour correspondant). */
  dayKeys: string[]
  renderEventContent?: (event: EventWithComputedPosition) => React.ReactNode
}

export const Lane: React.FC<LaneProps> = ({
  resource,
  events,
  daysCount,
  dayKeys,
  renderEventContent,
}) => {
  return (
    <div className="flex" data-testid="timeline-resource-row">
      <div
        className="border-rule bg-surface-2 text-ink w-[15%] truncate border-r px-4 py-3 text-sm font-medium"
        data-testid="timeline-resource-title"
      >
        {resource.title}
      </div>
      <div
        className="border-rule bg-surface-2 relative h-16 flex-1 border-b"
        style={{ borderLeft: '1px solid var(--color-rule)' }}
      >
        {/* Séparateurs de jours verticaux */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${daysCount}, minmax(0, 1fr))` }}
        >
          {dayKeys.map((key) => (
            <div key={key} className="border-rule border-r" />
          ))}
        </div>

        {/* Events */}
        <div className="relative h-full">
          {events.map((event) => (
            <EventBar key={event.id} event={event} renderContent={renderEventContent} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Lane
