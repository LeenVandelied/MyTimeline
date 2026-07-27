import React from 'react'
import { DateStamp } from './DateStamp'

/**
 * #47 — Ruler : l'en-tête de la timeline.
 * Colonne « produits » (w-15%) + grille des jours (une DateStamp par jour).
 * Extrait tel quel du monolithe (mêmes classes, même grid-template). Le libellé
 * de la colonne produits est passé en prop (`productsLabel`) pour rester
 * indépendant de next-intl et rendable en Storybook.
 */
export interface RulerProps {
  days: Date[]
  locale: string
  now: Date
  /**
   * Libellé de la colonne ressources (i18n résolu par l'orchestrateur).
   * Inutile — et ignoré — quand `gutterPercent` vaut 0.
   */
  productsLabel?: string
  /**
   * #315 — Largeur de la colonne ressources en %. Défaut `15` = comportement
   * historique (frise principale). `0` supprime la colonne : la grille des jours
   * occupe 100% de la largeur, pour une règle SANS lanes (mini-frise d'aperçu du
   * formulaire). Passer la MÊME valeur à `Cursor` pour garder les deux alignés.
   */
  gutterPercent?: number
}

export const Ruler: React.FC<RulerProps> = ({
  days,
  locale,
  now,
  productsLabel,
  gutterPercent = 15,
}) => {
  return (
    <div className="border-rule bg-surface flex border-b">
      {gutterPercent > 0 && (
        <div
          className="border-rule text-ink border-r px-4 py-3 text-xs font-semibold tracking-wide uppercase"
          style={{ width: `${gutterPercent}%` }}
        >
          {productsLabel}
        </div>
      )}
      <div
        className="grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <DateStamp key={day.toISOString()} day={day} locale={locale} now={now} />
        ))}
      </div>
    </div>
  )
}

export default Ruler
