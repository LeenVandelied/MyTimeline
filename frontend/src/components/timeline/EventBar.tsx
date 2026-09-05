import React from 'react'
import EventContent from '@/components/EventContent'
import { EventWithComputedPosition, statusBarClass } from './lib'

/**
 * #47 — EventBar : une barre d'événement positionnée dans une Lane.
 * Extrait tel quel du monolithe : position left/width %, pastille de statut
 * (expired/ongoing/upcoming) + contenu interne. data-testid `timeline-event`
 * et `data-event-title` PRÉSERVÉS (tests/E2E en dépendent).
 *
 * `renderContent` : point d'injection du rendu interne. Par défaut = `EventContent`
 * (comportement runtime IDENTIQUE au monolithe). Storybook injecte un stub léger
 * pour éviter les dépendances next-intl/auth de `EventContent`.
 */
export interface EventBarProps {
  event: EventWithComputedPosition
  /** Rendu du contenu interne de la barre. Défaut : `EventContent`. */
  renderContent?: (event: EventWithComputedPosition) => React.ReactNode
}

const defaultRenderContent = (event: EventWithComputedPosition) => <EventContent event={event} />

export const EventBar: React.FC<EventBarProps> = ({
  event,
  renderContent = defaultRenderContent,
}) => {
  return (
    <div
      data-testid="timeline-event"
      data-event-title={event.title}
      className="absolute top-1 bottom-1 flex cursor-pointer items-stretch overflow-hidden rounded-md shadow-md transition-transform hover:-translate-y-0.5"
      style={{
        left: `${event.leftPercent}%`,
        width: `${Math.max(event.widthPercent, 2)}%`,
        borderColor: event.color || 'rgba(15,23,42,0.8)',
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <div className={`w-1 ${statusBarClass(event.status)}`} />
      <div className="min-w-0 flex-1">{renderContent(event)}</div>
    </div>
  )
}

export default EventBar
