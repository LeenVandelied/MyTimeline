'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { buildDensityBuckets } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'

/**
 * #80 — Ruban de densité (hero, spec Designer §3). Densité = HAUTEUR de barre ∝
 * events/jour (PAS gradient). Couleur barre = couleur event du jour (`--evt-*`,
 * BR-EVE-009), jour vide = filet neutre. Ligne TODAY = `--color-accent`. Réutilise
 * `buildDensityBuckets` (lib.ts). Largeur fluide, `rangeDays` paramétrable (#83/#85).
 */
export interface DensityRibbonProps {
  events: FullCalendarEvent[]
  rangeDays?: number
  now?: Date
  locale: string
}

export const DensityRibbon: React.FC<DensityRibbonProps> = ({
  events,
  rangeDays = 30,
  now = new Date(),
  locale,
}) => {
  const t = useTranslations('dashboard.density')
  // Fenêtre glissante : les `rangeDays` derniers jours (aujourd'hui = dernier jour).
  const from = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - (rangeDays - 1))
    return d
  }, [now, rangeDays])

  const buckets = useMemo(
    () => buildDensityBuckets(events, from, now, rangeDays),
    [events, from, now, rangeDays],
  )

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale],
  )
  const rangeLabel = `${fmt.format(from)} — ${fmt.format(now)}`

  return (
    <section
      className="bg-surface border-rule flex flex-col gap-2 rounded-lg border p-4"
      data-testid="dashboard-density-ribbon"
      aria-label={t('label')}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
          {t('eyebrow', { days: rangeDays })}
        </span>
        <span className="text-ink-muted font-mono text-2xs">{rangeLabel}</span>
      </div>
      <div className="flex h-24 items-end gap-px" role="img" aria-label={t('label')}>
        {buckets.map((b, i) => (
          <div
            key={i}
            className="relative flex-1"
            style={{ height: '100%' }}
            data-testid={b.isToday ? 'dashboard-density-today' : undefined}
            title={`${fmt.format(b.date)} · ${b.count}`}
          >
            <div
              className="absolute bottom-0 w-full rounded-xs"
              style={{
                height: `${Math.max(b.count > 0 ? 8 : 2, b.height * 100)}%`,
                background: b.color ?? 'var(--color-rule-strong)',
              }}
            />
            {b.isToday && (
              <div className="bg-accent pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default DensityRibbon
