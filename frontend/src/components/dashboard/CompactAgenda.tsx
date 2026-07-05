'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getEventsInRange } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'

/**
 * #83 — Agenda compact mobile portrait : liste verticale des événements du JOUR
 * courant + du LENDEMAIN (PAS la semaine complète — critère d'acceptation). Le
 * dashboard desktop (#80) conserve `WeekAgenda variant="table"` ; ce composant est
 * la variante compacte dédiée pour l'espace vertical réduit du portrait.
 *
 * Réutilise `getEventsInRange` (lib.ts, même helper que `WeekAgenda`). Filets DS
 * Graphite (pas de `<Card>`), filet couleur event (BR-EVE-009), tri chronologique
 * assuré par `getEventsInRange`. Sépare jour / lendemain par un intertitre mono.
 * `data-testid` contractuels pour l'E2E #85. Largeur fluide 100%.
 *
 * NB : pas de `locale` — les lignes n'affichent pas de date formatée (le groupe
 * jour/lendemain porte l'info temporelle via un intertitre i18n) ; on évite un
 * prop mort. Si un affichage d'heure par ligne devient nécessaire, réintroduire
 * `locale` + `Intl.DateTimeFormat` comme dans `WeekAgenda`.
 */
export interface CompactAgendaProps {
  events: FullCalendarEvent[]
  now?: Date
}

/** Bornes [00:00, 23:59:59.999] d'un jour donné. */
function dayBounds(base: Date): { start: Date; end: Date } {
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const AgendaRow: React.FC<{ event: FullCalendarEvent }> = ({ event }) => (
  <li
    className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
    data-testid={`dashboard-compact-agenda-row-${event.id}`}
  >
    <span
      className="h-6 w-0.5 shrink-0 rounded-full"
      style={{ background: event.color ?? 'var(--color-rule-strong)' }}
      aria-hidden="true"
    />
    <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">{event.title}</span>
    <span className="text-ink-faint shrink-0 truncate text-2xs">
      {event.extendedProps.productName}
    </span>
  </li>
)

export const CompactAgenda: React.FC<CompactAgendaProps> = ({ events, now = new Date() }) => {
  const t = useTranslations('dashboard.mobile.compactAgenda')

  const today = useMemo(() => dayBounds(now), [now])
  const tomorrow = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return dayBounds(base)
  }, [now])

  const todayEvents = useMemo(
    () => getEventsInRange(events, today.start, today.end),
    [events, today],
  )
  const tomorrowEvents = useMemo(
    () => getEventsInRange(events, tomorrow.start, tomorrow.end),
    [events, tomorrow],
  )

  const isEmpty = todayEvents.length === 0 && tomorrowEvents.length === 0

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-compact-agenda"
      aria-label={t('label')}
    >
      <h2 className="text-ink-faint font-mono text-2xs tracking-widest uppercase">{t('title')}</h2>
      {isEmpty ? (
        <p className="text-ink-muted text-xs" data-testid="dashboard-compact-agenda-empty">
          {t('empty')}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1" data-testid="dashboard-compact-agenda-today">
            <span className="text-ink-muted font-mono text-2xs tracking-widest uppercase">
              {t('today')}
            </span>
            {todayEvents.length === 0 ? (
              <p className="text-ink-faint text-2xs">{t('empty')}</p>
            ) : (
              <ul className="flex flex-col">
                {todayEvents.map((event) => (
                  <AgendaRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </div>
          {tomorrowEvents.length > 0 && (
            <div className="flex flex-col gap-1" data-testid="dashboard-compact-agenda-tomorrow">
              <span className="text-ink-muted font-mono text-2xs tracking-widest uppercase">
                {t('tomorrow')}
              </span>
              <ul className="flex flex-col">
                {tomorrowEvents.map((event) => (
                  <AgendaRow key={event.id} event={event} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default CompactAgenda
