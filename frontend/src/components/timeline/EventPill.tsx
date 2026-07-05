import React from 'react'
import { contrastInk } from '@/lib/color'
import { statusToVar, type PositionedEvent } from './zoom'

/**
 * #192 — EventPill : rendu compact d'un event sur la frise desktop continue.
 *
 * Décision (critère d'acceptation) : composant DÉDIÉ, PAS une réutilisation
 * d'`EventContent`. `EventContent` est le rendu « riche » du calendrier (dialog
 * d'édition, popover couleur, deps next-intl/auth/services). La frise desktop
 * (`TimelineView`) n'a besoin que d'une pastille cliquable (point de statut +
 * titre tronqué) qui ouvre le `EventDrawer` — un rendu volontairement léger,
 * sans les dépendances lourdes d'`EventContent`. `EventBar.tsx` (brique #47,
 * fenêtre fixe 30 j + `EventContent`) n'est PAS consommé par `TimelineView` :
 * la vraie pastille compacte à extraire était le `<button className="mt-tlv__evt">`
 * inline de `TimelineView`. C'est ce bloc qui devient `EventPill`.
 *
 * data-testid `timeline-event` + `data-event-title` PRÉSERVÉS (dépendance
 * E2E golden-path #163 + TimelineView.test.tsx).
 *
 * BR-EVE-009 : l'encre du texte est calculée par contraste WCAG via `contrastInk`
 * (helper mutualisé `lib/color.ts`), poussée dans `--mt-evt-ink`. Fini le
 * fallback `#fff` hardcodé du CSS : illisible sur les fonds clairs de la palette.
 */
export interface EventPillProps {
  event: PositionedEvent
  /** Label a11y complet (titre + statut + dates + produit), construit par l'appelant. */
  ariaLabel: string
  onSelect: (event: PositionedEvent) => void
}

export const EventPill: React.FC<EventPillProps> = ({ event, ariaLabel, onSelect }) => {
  const statusVar = statusToVar(event.status)
  const bg = event.color || 'var(--color-accent)'
  return (
    <button
      type="button"
      className="mt-tlv__evt"
      data-testid="timeline-event"
      data-event-title={event.title}
      aria-label={ariaLabel}
      onClick={() => onSelect(event)}
      style={{
        left: `${event.leftPx}px`,
        width: `${event.widthPx}px`,
        ['--mt-evt' as string]: bg,
        ['--mt-evt-status' as string]: statusVar,
        // BR-EVE-009 : encre lisible calculée (contraste WCAG), plus de `#fff` hardcodé.
        ['--mt-evt-ink' as string]: contrastInk(event.color),
      }}
    >
      <span
        className="mt-tlv__evt-dot"
        style={{ background: statusVar }}
        aria-hidden="true"
      />
      {event.title}
    </button>
  )
}

export default EventPill
