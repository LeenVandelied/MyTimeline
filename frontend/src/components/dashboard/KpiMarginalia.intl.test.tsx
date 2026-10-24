import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { KpiMarginalia } from './KpiMarginalia'
import { WeekAgenda } from './WeekAgenda'
import { computeDashboardKpis, type DashboardKpis } from './kpis'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'

/**
 * #640 — « En bref » rendu avec le VRAI `NextIntlClientProvider` et les VRAIS messages
 * des 4 locales (PIT-S63-006 : le mock `ns.key` des autres fichiers ne résout ni les
 * pluriels ICU, ni les balises `t.rich`, ni les placeholders manquants). Toute
 * `IntlError` (clé absente, valeur non fournie, balise sans fonction) est captée par
 * `onError` et fait échouer le test.
 *
 * CE QU'IL NE PROUVE PAS : le rendu (jsdom n'applique aucune feuille : ni la police
 * mono, ni la couleur d'accent). Ces faits sont joués par `e2e/sprint-108-en-bref.spec.ts`.
 */
afterEach(cleanup)

const MESSAGES = { fr: frDashboard, en: enDashboard, es: esDashboard, de: deDashboard } as const
type Locale = keyof typeof MESSAGES
const LOCALES = Object.keys(MESSAGES) as Locale[]

const ZERO: DashboardKpis = {
  week: 0,
  weekRecurring: 0,
  dueSoon: 0,
  ongoing: 0,
  busiestCategory: null,
}

function renderKpis(kpis: DashboardKpis, locale: Locale = 'fr') {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ dashboard: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <KpiMarginalia kpis={kpis} locale={locale} />
    </NextIntlClientProvider>,
  )
  return errors
}

const text = (testid: string) => screen.getByTestId(testid).textContent

describe('#640 — les 4 phrases de la maquette (fr, textes exacts)', () => {
  it('pluriels : 3 événements, 1 récurrent, 2 échéances, 1 couverture', () => {
    const errors = renderKpis({
      week: 3,
      weekRecurring: 1,
      dueSoon: 2,
      ongoing: 1,
      busiestCategory: 'Assurance',
    })
    expect(errors).toEqual([])
    expect(text('dashboard-kpi-week-sentence')).toBe(
      'Tu as 3 événements cette semaine, dont 1 récurrent.',
    )
    expect(text('dashboard-kpi-due-sentence')).toBe('2 arrivent à échéance sous 14 jours.')
    expect(text('dashboard-kpi-ongoing-sentence')).toBe('1 couverture est en cours actuellement.')
    expect(text('dashboard-kpi-busiest-sentence')).toBe(
      'Catégorie la plus chargée ce mois : Assurance.',
    )
  })

  it('compte vide : phrases lisibles, valeurs à zéro, catégorie « — »', () => {
    expect(renderKpis(ZERO)).toEqual([])
    expect(text('dashboard-kpi-week-sentence')).toBe(
      'Tu as 0 événement cette semaine, dont 0 récurrent.',
    )
    expect(text('dashboard-kpi-due-sentence')).toBe('0 arrive à échéance sous 14 jours.')
    expect(text('dashboard-kpi-ongoing-sentence')).toBe('0 couverture est en cours actuellement.')
    expect(text('dashboard-kpi-busiest-sentence')).toBe('Catégorie la plus chargée ce mois : —.')
    expect(text('dashboard-kpi-busiest-category')).toBe('—')
  })

  it('DEC-S82-007 : plus aucune « série » ni ancien indicateur', () => {
    renderKpis({ ...ZERO, week: 2 })
    const section = screen.getByTestId('dashboard-kpi-marginalia')
    expect(section.textContent).not.toMatch(/série|produits? actifs?/i)
    expect(screen.queryByTestId('dashboard-kpi-streak')).toBeNull()
    expect(screen.queryByTestId('dashboard-kpi-active-products')).toBeNull()
    expect(screen.queryByTestId('dashboard-kpi-events-month')).toBeNull()
  })

  it('styles maquette : chiffres mono 600 ink, échéances en accent, « 14 » non gras, catégorie non mono', () => {
    renderKpis({ ...ZERO, busiestCategory: 'Assurance' })
    for (const testid of [
      'dashboard-kpi-week',
      'dashboard-kpi-recurring',
      'dashboard-kpi-ongoing',
    ]) {
      const cls = screen.getByTestId(testid).className.split(/\s+/)
      expect(cls, testid).toEqual(expect.arrayContaining(['text-ink', 'mt-num', 'font-semibold']))
    }
    const due = screen.getByTestId('dashboard-kpi-due-14d').className.split(/\s+/)
    expect(due).toEqual(expect.arrayContaining(['text-accent', 'mt-num', 'font-semibold']))
    expect(due).not.toContain('text-ink')

    const days = screen.getByText('14')
    expect(days.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-ink', 'mt-num']))
    expect(days.className).not.toContain('font-semibold')

    const category = screen.getByTestId('dashboard-kpi-busiest-category').className.split(/\s+/)
    expect(category).toEqual(expect.arrayContaining(['text-ink', 'font-semibold']))
    expect(category).not.toContain('mt-num')
    // Marginalia (#80) : jamais de gros chiffre display.
    const section = screen.getByTestId('dashboard-kpi-marginalia')
    expect(section.innerHTML).not.toMatch(/text-(xl|2xl|3xl)/)
  })
})

describe('#640 — 4 locales : aucune IntlError, les 5 valeurs rendues', () => {
  it.each(LOCALES)('%s — compte vide', (locale) => {
    expect(renderKpis(ZERO, locale)).toEqual([])
    for (const testid of [
      'dashboard-kpi-week',
      'dashboard-kpi-recurring',
      'dashboard-kpi-due-14d',
      'dashboard-kpi-ongoing',
    ]) {
      expect(text(testid), `${locale} ${testid}`).toBe('0')
    }
    expect(text('dashboard-kpi-busiest-category')).toBe('—')
  })

  it.each(LOCALES)('%s — singuliers et pluriels', (locale) => {
    for (const n of [1, 2, 5]) {
      expect(
        renderKpis(
          { week: n, weekRecurring: n, dueSoon: n, ongoing: n, busiestCategory: 'Cat' },
          locale,
        ),
        `${locale} n=${n}`,
      ).toEqual([])
      cleanup()
    }
  })
})

/** #72 — séparateurs de milliers (déplacé d'`intl-formats.test.tsx`, qui mocke next-intl). */
const EXPECTED_12345: Record<Locale, RegExp> = {
  fr: /^12\s345$/u,
  en: /^12,345$/u,
  es: /^12\.345$/u,
  de: /^12\.345$/u,
}

describe('#72 — Intl.NumberFormat sur les 4 locales', () => {
  it.each(LOCALES)('KpiMarginalia groupe les milliers en %s', (locale) => {
    renderKpis(
      { week: 12345, weekRecurring: 12345, dueSoon: 12345, ongoing: 12345, busiestCategory: null },
      locale,
    )
    for (const testid of [
      'dashboard-kpi-week',
      'dashboard-kpi-recurring',
      'dashboard-kpi-due-14d',
      'dashboard-kpi-ongoing',
    ]) {
      expect(text(testid) ?? '').toMatch(EXPECTED_12345[locale])
    }
  })
})

describe('#640 — « … événements cette semaine » égale la liste « Cette semaine »', () => {
  const NOW = new Date(2026, 6, 15, 9, 0, 0) // mer. 15 juil. 2026 — semaine du 13 au 19
  const evt = (id: string, start: string, recurring = false): FullCalendarEvent => ({
    id,
    title: `Event ${id}`,
    start,
    end: start,
    allDay: true,
    resourceId: 'p1',
    color: '#3E8BD6',
    extendedProps: {
      productId: 'p1',
      productName: 'Produit A',
      category: 'Cat',
      type: 'single',
      isRecurring: recurring,
      recurrenceUnit: recurring ? 'MONTH' : null,
    },
  })

  it('même nombre que les lignes rendues par `WeekAgenda`', () => {
    const events = [
      evt('lun', '2026-07-13'),
      evt('mer', '2026-07-15', true),
      evt('dim', '2026-07-19'),
      evt('avant', '2026-07-12'),
      evt('apres', '2026-07-20'),
      evt('serie-juin', '2026-06-17', true),
    ]
    const kpis = computeDashboardKpis(events, NOW)
    const errors: string[] = []
    render(
      <NextIntlClientProvider
        locale="fr"
        timeZone="Europe/Paris"
        messages={{ dashboard: frDashboard }}
        onError={(error) => errors.push(error.message)}
      >
        <WeekAgenda events={events} now={NOW} locale="fr" />
        <KpiMarginalia kpis={kpis} locale="fr" />
      </NextIntlClientProvider>,
    )
    expect(errors).toEqual([])
    const rows = screen.getAllByTestId(/^dashboard-week-agenda-row-/)
    expect(rows).toHaveLength(3)
    expect(text('dashboard-kpi-week')).toBe(String(rows.length))
    expect(text('dashboard-kpi-recurring')).toBe('1')
  })
})
