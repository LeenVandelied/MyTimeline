'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getWeekRange, getEventsInRange } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'
import { toLocalIsoDate } from '@/lib/date-iso'

/**
 * #80 — Agenda de la semaine courante (spec Designer §3). Filets (pas de `<Card>`
 * shadcn) : date stamp mono + filet couleur event (BR-EVE-009) + titre + produit,
 * tri chronologique. Réutilise `getWeekRange`/`getEventsInRange`. `variant` table
 * (desktop) | stack (mobile #83/#85). Largeur fluide 100%.
 */
export interface WeekAgendaProps {
  events: FullCalendarEvent[]
  now?: Date
  locale: string
  variant?: 'table' | 'stack'
}

export const WeekAgenda: React.FC<WeekAgendaProps> = ({
  events,
  now = new Date(),
  locale,
  variant = 'table',
}) => {
  const t = useTranslations('dashboard.week')
  const { start, end } = useMemo(() => getWeekRange(now), [now])
  const weekEvents = useMemo(() => getEventsInRange(events, start, end), [events, start, end])
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }),
    [locale],
  )

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-week-agenda"
      aria-label={t('label')}
    >
      <h2 className="text-ink-faint text-2xs font-mono tracking-widest uppercase">{t('title')}</h2>
      {weekEvents.length === 0 ? (
        <p className="text-ink-muted text-xs" data-testid="dashboard-week-agenda-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col" data-variant={variant}>
          {weekEvents.map((event) => (
            <li
              key={event.id}
              className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
              data-testid={`dashboard-week-agenda-row-${event.id}`}
            >
              {/* #72 — `.mt-date--long` (DS i18n.css §7) : mono + tabular-nums +
                  `unicode-bidi:isolate` + `nowrap`. Sa `font-size:13px` est la
                  valeur EXACTE de `--text-2xs` → aucun delta de taille. On ne pose
                  PAS `.mt-date--short` : elle force `uppercase` + 11px, un
                  traitement qui relève d'un arbitrage Designer (cf. rapport #72). */}
              {/* #518 — `toLocalIsoDate` REMPLACE `toISOString()`. `dayFmt` rend
                  `{weekday, day}` dans le fuseau du navigateur ; `toISOString()`
                  bascule en UTC et pouvait donc nommer un AUTRE jour que le libellé
                  peint juste à côté (Paris UTC+2 : « mer. 24 » ↔ `2026-06-23T22:00Z`).
                  Il levait en outre une `RangeError` sur une date invalide, là où
                  l'helper rend `null` et l'attribut est simplement omis. */}
              <time
                className="text-ink-muted mt-date--long w-16 shrink-0"
                dateTime={toLocalIsoDate(new Date(event.start)) ?? undefined}
              >
                {dayFmt.format(new Date(event.start))}
              </time>
              <span
                className="h-6 w-0.5 shrink-0 rounded-full"
                style={{ background: event.color ?? 'var(--color-rule-strong)' }}
                aria-hidden="true"
              />
              <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">
                {event.title}
              </span>
              <span className="text-ink-faint text-2xs hidden truncate sm:inline">
                {event.extendedProps.productName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default WeekAgenda
