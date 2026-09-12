'use client'

import { useState } from 'react'
import type { PositionedEvent } from './zoom'

/**
 * #64 — Sélection mobile partagée (événement détaillé + cible d'action).
 *
 * Extrait le `selected`/`actionTarget` de `TimelineMobilePortrait` pour pouvoir
 * les HISSER au niveau de `TimelineResponsive` : c'est la clé de la transition
 * portrait ↔ paysage SANS perte de l'événement sélectionné (critère #64). Chaque
 * variante consomme le même bundle ; la rotation ne réinitialise rien car l'état
 * vit au-dessus des variantes (elles se démontent/remontent, pas l'état).
 */
export interface TimelineMobileSelection {
  selected: PositionedEvent | null
  actionTarget: PositionedEvent | null
  setSelected: (event: PositionedEvent | null) => void
  setActionTarget: (event: PositionedEvent | null) => void
}

export function useTimelineMobileSelection(): TimelineMobileSelection {
  const [selected, setSelected] = useState<PositionedEvent | null>(null)
  const [actionTarget, setActionTarget] = useState<PositionedEvent | null>(null)
  return { selected, actionTarget, setSelected, setActionTarget }
}

export default useTimelineMobileSelection
