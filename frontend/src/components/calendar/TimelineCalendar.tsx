'use client'

import React, { useMemo } from 'react'
import { FullCalendarEvent } from '@/types/event'
import { useTranslations } from 'next-intl'
import {
  Cursor,
  Lane,
  Resource,
  Ruler,
  buildEventsByResource,
  getDaysRange,
  groupResourcesByCategory,
} from '@/components/timeline'

/**
 * #47 — Orchestrateur Timeline. La logique de calcul (fenêtre 30j, positions %,
 * groupement) vit dans `@/components/timeline/lib` ; le rendu est délégué aux
 * sous-composants extraits (Ruler/DateStamp, Cursor, Lane/EventBar).
 * Contrat de props, data-testid et rendu visuel INCHANGÉS vs monolithe.
 *
 * Rappel `calendar.css` / sélecteurs `.fc-*` : N/A — absents du codebase (la
 * timeline est une CSS Grid custom Tailwind/tokens DS, pas FullCalendar).
 */

interface TimelineCalendarProps {
  events: FullCalendarEvent[]
  resources: Resource[]
  currentDate: Date
  locale: string
  showNowIndicator?: boolean
}

export const TimelineCalendar: React.FC<TimelineCalendarProps> = ({
  events,
  resources,
  currentDate,
  locale,
  showNowIndicator = true,
}) => {
  const t = useTranslations()
  const { days, start, end } = useMemo(() => getDaysRange(currentDate), [currentDate])

  const totalMs = end.getTime() - start.getTime() || 1
  const now = useMemo(() => new Date(), [])

  const eventsByResource = useMemo(
    () => buildEventsByResource(events, start, end, now, days.length),
    [events, start, end, now, days.length],
  )

  const resourcesByCategory = useMemo(() => groupResourcesByCategory(resources), [resources])

  const dayKeys = useMemo(() => days.map((day) => day.toISOString()), [days])

  const nowPositionPercent = useMemo(() => {
    if (!showNowIndicator) return null
    if (now < start || now > end) return null
    return ((now.getTime() - start.getTime()) / totalMs) * 100
  }, [showNowIndicator, now, start, end, totalMs])

  const viewTitle = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(currentDate)
  }, [currentDate, locale])

  return (
    <div className="relative w-full overflow-x-auto" data-testid="timeline-calendar">
      <div className="min-w-[800px]">
        {/* Header : colonne ressources + jours */}
        <Ruler days={days} locale={locale} now={now} productsLabel={t('dashboard.products')} />

        {/* Body : catégories, ressources, events */}
        <div className="relative">
          {/* Indicateur « maintenant » */}
          <Cursor positionPercent={nowPositionPercent} />

          {Object.entries(resourcesByCategory).map(([category, resList]) => (
            <div key={category}>
              {/* Ligne de catégorie */}
              <div className="flex">
                <div className="border-rule bg-surface text-ink w-[15%] border-r px-4 py-2 text-xs font-semibold tracking-wide uppercase">
                  {category}
                </div>
                <div
                  className="border-rule bg-surface-2 h-8 flex-1 border-b"
                  style={{ borderLeft: '1px solid var(--color-rule)' }}
                />
              </div>

              {/* Lignes de ressources */}
              {resList.map((resource) => (
                <Lane
                  key={resource.id}
                  resource={resource}
                  events={eventsByResource.get(resource.id) || []}
                  daysCount={days.length}
                  dayKeys={dayKeys}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Footer : titre de vue courant (cohérence UI) */}
        <div className="text-ink-muted mt-4 text-sm">{viewTitle}</div>
      </div>
    </div>
  )
}

export default TimelineCalendar
