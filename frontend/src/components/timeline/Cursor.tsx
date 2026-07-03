import React from 'react'

/**
 * #47 — Cursor : l'indicateur « maintenant » (barre verticale).
 * Extrait tel quel du monolithe. Positionné en absolu à
 * `calc(15% + positionPercent * 0.85%)` (15% = largeur colonne ressources,
 * 0.85 = fraction restante réservée à la grille des jours). Ne rend rien si
 * `positionPercent` est `null` (now hors fenêtre / indicateur désactivé).
 */
export interface CursorProps {
  /** Position en % dans la fenêtre, ou `null` pour ne rien afficher. */
  positionPercent: number | null
}

export const Cursor: React.FC<CursorProps> = ({ positionPercent }) => {
  if (positionPercent === null) return null

  return (
    <div
      className="pointer-events-none absolute inset-y-0"
      style={{ left: `calc(15% + ${positionPercent} * 0.85%)` }}
    >
      <div className="bg-accent h-full w-[2px] shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]" />
    </div>
  )
}

export default Cursor
