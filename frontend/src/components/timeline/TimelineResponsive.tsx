'use client'

import React from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TimelineView, type TimelineViewProps } from './TimelineView'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import { TimelineMobileLandscape } from './TimelineMobileLandscape'
import { useTimelineMobileState } from './useTimelineMobileState'
import { useTimelineMobileSelection } from './useTimelineMobileSelection'
import { useTimelineMobileGestures } from './useTimelineMobileGestures'
import type { PositionedEvent } from './zoom'

/**
 * #63/#64 — Point de commutation desktop / mobile portrait / mobile paysage.
 *
 * ISOLE le conditionnel de rendu HORS de `TimelineView` (desktop, inchangé →
 * aucune régression). Le choix se fait ici via `matchMedia`.
 *
 * Breakpoints AD HOC (aucun token `--bp-*` dans le DS Graphite, réserve
 * ui-design #3 ; [MEMORY:decision] #63) :
 *  - MOBILE (portrait) : `max-width:640px` ET `orientation:portrait`.
 *  - MOBILE PAYSAGE (#64) : `orientation:landscape` ET `max-height:600px`. Le
 *    seuil de HAUTEUR (pas seulement l'orientation) distingue un mobile/petite
 *    tablette retourné(e) d'un iPad Pro paysage (~1024px de haut → reste desktop,
 *    largeur ≈ desktop). Réserve ui-design : tenir compte de la hauteur absolue.
 *  - MINIMAP masquable d'office (#64) : `max-height:400px` → trop peu de vertical
 *    pour la garder (critère d'acceptation). Documenté ici, pas de token.
 *
 * TRANSITION SANS PERTE D'ÉTAT (point clé #64) : `useTimelineMobileState`
 * (zoom + scroll + positions), `useTimelineMobileSelection` (event sélectionné /
 * cible d'action) et `useTimelineMobileGestures` sont HISSÉS ici et passés aux
 * DEUX variantes mobiles. La rotation portrait ↔ paysage démonte/remonte la
 * variante mais PAS l'état (il vit au-dessus) → scroll, zoom et sélection
 * conservés. Le hook d'état ne reset pas au resize (préparé en #63).
 *
 * SSR-safe : `useMediaQuery` rend `false` au 1er rendu → variante desktop par
 * défaut (pas de hydration mismatch), bascule après hydratation.
 */
const MOBILE_PORTRAIT_QUERY = '(max-width: 640px) and (orientation: portrait)'
const MOBILE_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)'
const MINIMAP_HIDE_QUERY = '(max-height: 400px)'

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
  const isMobileLandscape = useMediaQuery(MOBILE_LANDSCAPE_QUERY)
  const isMinimapForcedHidden = useMediaQuery(MINIMAP_HIDE_QUERY)

  // État HISSÉ : partagé entre portrait et paysage → transition sans perte.
  // Toujours instancié (règles des hooks) ; inerte quand desktop est rendu
  // (scrollRef non monté → effets no-op).
  const state = useTimelineMobileState(props.events, props.resources, props.locale, props.today)
  const selection = useTimelineMobileSelection()
  const gestures = useTimelineMobileGestures(
    state.onPinchZoom,
    selection.setSelected,
    selection.setActionTarget,
  )

  // Priorité : paysage mobile > portrait mobile > desktop. En paysage, le drawer
  // latéral remplace le bottom sheet ; le passage paysage→portrait ferme donc de
  // facto le drawer (variante démontée) et le bottom sheet réaffiche `selected`
  // (état conservé) → critère d'acceptation rotation.
  if (isMobileLandscape) {
    return (
      <TimelineMobileLandscape
        {...props}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        state={state}
        selection={selection}
        gestures={gestures}
        minimapForcedHidden={isMinimapForcedHidden}
      />
    )
  }

  if (isMobilePortrait) {
    return (
      <TimelineMobilePortrait
        {...props}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        state={state}
        selection={selection}
        gestures={gestures}
      />
    )
  }

  return <TimelineView {...props} />
}

export default TimelineResponsive
