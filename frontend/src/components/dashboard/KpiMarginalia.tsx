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
  /**
   * #72 — Locale de formatage des chiffres. Passée en prop (et non via
   * `useLocale()`) pour rester homogène avec les autres composants dashboard
   * (`ProductList`, `WeekAgenda`, `DensityRibbon`…) qui reçoivent tous `locale`.
   */
  locale: string
}

/** Une ligne de marginalia : phrase i18n avec le chiffre mis en valeur en mono. */
const KpiLine: React.FC<{ value: string; label: string; testid: string }> = ({
  value,
  label,
  testid,
}) => (
  <li className="border-rule flex items-baseline gap-2 border-b py-2 last:border-b-0">
    {/* #72 — `.mt-num` (DS i18n.css §7) remplace `font-mono … tabular-nums` :
        même famille et mêmes chiffres de chasse fixe, plus l'isolation bidi. */}
    <span className="text-ink mt-num text-xs" data-testid={testid}>
      {value}
    </span>
    <span className="text-ink-muted text-2xs">{label}</span>
  </li>
)

export const KpiMarginalia: React.FC<KpiMarginaliaProps> = ({ kpis, locale }) => {
  const t = useTranslations('dashboard.kpi')
  // #72 — KPIs = quantités → séparateur de milliers localisé.
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale])

  return (
    <section className="flex flex-col gap-3" data-testid="dashboard-kpi-marginalia" aria-label={t('label')}>
      <h2 className="text-ink-faint font-mono text-2xs tracking-widest uppercase">{t('title')}</h2>
      <ul className="flex flex-col">
        <KpiLine
          value={nf.format(kpis.activeProducts)}
          label={t('activeProducts', { count: kpis.activeProducts })}
          testid="dashboard-kpi-active-products"
        />
        <KpiLine
          value={nf.format(kpis.eventsThisMonth)}
          label={t('eventsThisMonth', { count: kpis.eventsThisMonth })}
          testid="dashboard-kpi-events-month"
        />
        <KpiLine
          value={nf.format(kpis.currentStreak)}
          label={t('currentStreak', { count: kpis.currentStreak })}
          testid="dashboard-kpi-streak"
        />
      </ul>
    </section>
  )
}

export default KpiMarginalia
