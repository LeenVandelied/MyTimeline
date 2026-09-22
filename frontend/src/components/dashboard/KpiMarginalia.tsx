'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { DUE_SOON_DAYS, type DashboardKpis } from './kpis'

/**
 * #80 — KPIs en marginalia phrasée (spec Designer §3 « En bref »).
 *
 * Corrections OBLIGATOIRES : AUCUN gros chiffre display. Chiffres exclusivement
 * IBM Plex Mono INLINE dans une phrase — jamais `--text-xl/2xl/3xl`. Pas de `<Card>`
 * shadcn à ombre : une carte à filet (`border-rule`). Largeur fluide → colonne
 * marginalia dans le parent.
 *
 * #640 (DEC-S82-007, DEC-S108-004) — les 4 phrases de la maquette `Dashboard.dc.html`
 * (extrait : `docs/memory/sprints/sprint-108/maquette-dashboard.md` § « En bref »)
 * REMPLACENT les 3 lignes « produits actifs / événements ce mois / jours de série ».
 * Chaque phrase est UN message ICU rendu par `t.rich` : les chiffres y sont enveloppés
 * par balise (`<weekNum>`…), jamais concaténés en fragments — l'ordre des mots reste
 * celui de la traduction. Si une traduction perd une balise, next-intl rend le texte
 * nu (dégradation, pas d'exception).
 *
 * Styles maquette : chiffres mono 600 `ink` ; le 2e chiffre (échéances) en `accent` ;
 * le « 14 » mono `ink` NON gras ; la catégorie en gras `ink`, PAS en mono. Écarts
 * assumés au DS : 14px → `text-xs` (15px, pas de 14 dans l'échelle) ; padding 16/18 et
 * gap 13 → `p-4` / `gap-3` (grille base 4).
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

/** #72 — `.mt-num` (DS i18n.css §7) : mono + chiffres tabulaires + isolation bidi. */
const NUM = 'text-ink mt-num font-semibold'

export const KpiMarginalia: React.FC<KpiMarginaliaProps> = ({ kpis, locale }) => {
  const t = useTranslations('dashboard.kpi')
  // #72 — KPIs = quantités → séparateur de milliers localisé.
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale])

  const num = (testid: string, className = NUM) => {
    const Tag = (chunks: React.ReactNode) => (
      <span className={className} data-testid={testid}>
        {chunks}
      </span>
    )
    return Tag
  }

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-kpi-marginalia"
      aria-label={t('label')}
    >
      {/* #575 — vrai titre de section (cf. `WeekAgenda`). */}
      <h2 className="text-ink font-display text-sm font-semibold">{t('title')}</h2>
      <div className="border-rule text-ink-muted flex flex-col gap-3 rounded-lg border p-4 text-xs leading-normal">
        <p data-testid="dashboard-kpi-week-sentence">
          {t.rich('week', {
            week: kpis.week,
            weekValue: nf.format(kpis.week),
            recurring: kpis.weekRecurring,
            recurringValue: nf.format(kpis.weekRecurring),
            weekNum: num('dashboard-kpi-week'),
            recurringNum: num('dashboard-kpi-recurring'),
          })}
        </p>
        <p data-testid="dashboard-kpi-due-sentence">
          {t.rich('dueSoon', {
            due: kpis.dueSoon,
            dueValue: nf.format(kpis.dueSoon),
            days: DUE_SOON_DAYS,
            daysValue: nf.format(DUE_SOON_DAYS),
            dueNum: num('dashboard-kpi-due-14d', 'text-accent mt-num font-semibold'),
            daysNum: (chunks) => <span className="text-ink mt-num">{chunks}</span>,
          })}
        </p>
        <p data-testid="dashboard-kpi-ongoing-sentence">
          {t.rich('ongoing', {
            ongoing: kpis.ongoing,
            ongoingValue: nf.format(kpis.ongoing),
            ongoingNum: num('dashboard-kpi-ongoing'),
          })}
        </p>
        <p data-testid="dashboard-kpi-busiest-sentence">
          {t.rich('busiestCategory', {
            category: kpis.busiestCategory ?? t('busiestCategoryNone'),
            categoryName: num('dashboard-kpi-busiest-category', 'text-ink font-semibold'),
          })}
        </p>
      </div>
    </section>
  )
}

export default KpiMarginalia
