import React from 'react'
import { formatDay } from './lib'

/**
 * #47 — DateStamp : une cellule de jour dans l'en-tête (Ruler).
 * Extrait tel quel du monolithe : libellé `formatDay`, highlight `bg-accent-soft`
 * quand le jour correspond à `now`, sinon `bg-surface-2`. Purement présentationnel.
 */
export interface DateStampProps {
  day: Date
  locale: string
  /** Date de référence pour le highlight « aujourd'hui ». */
  now: Date
}

export const DateStamp: React.FC<DateStampProps> = ({ day, locale, now }) => {
  const isToday = day.toDateString() === now.toDateString()

  return (
    <div
      className={`text-ink border-rule border-r px-2 py-2 text-center text-xs font-medium ${
        isToday ? 'bg-accent-soft' : 'bg-surface-2'
      }`}
    >
      {formatDay(day, locale)}
    </div>
  )
}

export default DateStamp
