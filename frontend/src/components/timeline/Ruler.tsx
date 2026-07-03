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
  /** Libellé de la colonne ressources (i18n résolu par l'orchestrateur). */
  productsLabel: string
}

export const Ruler: React.FC<RulerProps> = ({ days, locale, now, productsLabel }) => {
  return (
    <div className="border-rule bg-surface flex border-b">
      <div className="border-rule text-ink w-[15%] border-r px-4 py-3 text-xs font-semibold tracking-wide uppercase">
        {productsLabel}
      </div>
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
