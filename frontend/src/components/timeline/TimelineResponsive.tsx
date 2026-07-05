'use client'

import React from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TimelineView, type TimelineViewProps } from './TimelineView'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import type { PositionedEvent } from './zoom'

/**
 * #63 — Point de commutation desktop / mobile portrait.
 *
 * ISOLE le conditionnel de rendu HORS de `TimelineView` (desktop) : celui-ci
 * reste inchangé → aucune régression desktop (dépendance intra-sprint). Le choix
 * se fait ici via `matchMedia`.
 *
 * Breakpoint AD HOC (aucun token `--bp-*` n'existe dans le DS Graphite, réserve
 * ui-design #3) : `max-width: 640px` = seuil "portrait mobile". Documenté ici et
 * signalé en [MEMORY:decision] comme candidat futur token `--bp-mobile-max`.
 * #64 (paysage) introduira un second seuil (orientation + hauteur).
 *
 * SSR-safe : `useMediaQuery` rend `false` au 1er rendu → variante desktop par
 * défaut (pas de hydration mismatch), bascule mobile après hydratation.
 */
const MOBILE_PORTRAIT_QUERY = '(max-width: 640px)'

export interface TimelineResponsiveProps extends TimelineViewProps {
  onEditEvent?: (event: PositionedEvent) => void
  onDeleteEvent?: (event: PositionedEvent) => void
}

export const TimelineResponsive: React.FC<TimelineResponsiveProps> = ({
  onEditEvent,
  onDeleteEvent,
  ...props
}) => {
  const isMobilePortrait = useMediaQuery(MOBILE_PORTRAIT_QUERY)

  if (isMobilePortrait) {
    return (
      <TimelineMobilePortrait
        {...props}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
      />
    )
  }
  return <TimelineView {...props} />
}

export default TimelineResponsive
