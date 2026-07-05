'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import type { DashboardKpis } from '@/hooks/useDashboardData'

/**
 * #80 — KPIs en marginalia phrasée (spec Designer §3 « En bref »).
 *
 * Corrections OBLIGATOIRES : AUCUN gros chiffre display. Chiffres exclusivement
 * IBM Plex Mono INLINE dans une phrase (`--text-xs`/`--text-2xs`) — jamais
 * `--text-xl/2xl/3xl`. Construction en filets (`border-b border-rule`), pas de
 * `<Card>` shadcn à ombre. Largeur fluide → colonne marginalia dans le parent.
 */
export interface KpiMarginaliaProps {
  kpis: DashboardKpis
}

/** Une ligne de marginalia : phrase i18n avec le chiffre mis en valeur en mono. */
const KpiLine: React.FC<{ value: number; label: string; testid: string }> = ({
  value,
  label,
  testid,
}) => (
  <li className="border-rule flex items-baseline gap-2 border-b py-2 last:border-b-0">
    <span className="text-ink font-mono text-xs tabular-nums" data-testid={testid}>
      {value}
    </span>
    <span className="text-ink-muted text-2xs">{label}</span>
  </li>
)

export const KpiMarginalia: React.FC<KpiMarginaliaProps> = ({ kpis }) => {
  const t = useTranslations('dashboard.kpi')

  return (
    <section className="flex flex-col gap-3" data-testid="dashboard-kpi-marginalia" aria-label={t('label')}>
      <h2 className="text-ink-faint font-mono text-2xs tracking-widest uppercase">{t('title')}</h2>
      <ul className="flex flex-col">
        <KpiLine
          value={kpis.activeProducts}
          label={t('activeProducts', { count: kpis.activeProducts })}
          testid="dashboard-kpi-active-products"
        />
        <KpiLine
          value={kpis.eventsThisMonth}
          label={t('eventsThisMonth', { count: kpis.eventsThisMonth })}
          testid="dashboard-kpi-events-month"
        />
        <KpiLine
          value={kpis.currentStreak}
          label={t('currentStreak', { count: kpis.currentStreak })}
          testid="dashboard-kpi-streak"
        />
      </ul>
    </section>
  )
}

export default KpiMarginalia
