import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { WeekAgenda } from './WeekAgenda'
import { CompactAgenda } from './CompactAgenda'
import { ProductList } from './ProductList'
import { ProductCarousel } from './ProductCarousel'
import { KpiMarginalia } from './KpiMarginalia'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'

/**
 * #664 — Compteurs à droite des titres de section (maquette `Dashboard.dc.html` /
 * `Mobile Dashboard.dc.html`, relevé S109) : « {n} événements » (semaine desktop,
 * agenda compact mobile) et « {n} produits » (liste desktop, carrousel mobile).
 * « En bref » n'en a pas.
 *
 * Rendu avec le VRAI `NextIntlClientProvider` et les VRAIS messages (PIT-S63-006 : le
 * mock `ns.key` ne résout pas les pluriels ICU). Toute `IntlError` fait échouer le test.
 *
 * CE QUE CE FICHIER PROUVE : le texte (pluriel, locale), ce qui est compté, l'absence
 * dans l'état vide, les classes posées (mono, `ink-muted`, sans capitales, `nowrap`).
 * CE QU'IL NE PROUVE PAS : le rendu (jsdom n'applique aucune feuille) — la tenue du
 * compteur dans la carte en `de` à 375 px est jouée par
 * `e2e/sprint-109-section-counts.spec.ts`.
 */
afterEach(cleanup)

const MESSAGES = { fr: frDashboard, en: enDashboard, es: esDashboard, de: deDashboard } as const
type Locale = keyof typeof MESSAGES

// Mercredi 15 juillet 2026, 9 h (même ancre que `section-titles.test.tsx`).
const NOW = new Date(2026, 6, 15, 9, 0, 0)

const evt = (id: string, start: string): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
})

const product = (id: string): Product => ({
  id,
  name: `Produit ${id}`,
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: [],
})

function renderIntl(ui: ReactElement, locale: Locale = 'fr') {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ dashboard: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      {ui}
    </NextIntlClientProvider>,
  )
  return errors
}

const text = (testid: string) => screen.getByTestId(testid).textContent

/** Le compteur n'est PAS un sur-titre : mono, `ink-muted`, sans capitales ni `.mt-eyebrow`. */
function expectCounterBesideTitle(testid: string) {
  const counter = screen.getByTestId(testid)
  const classes = counter.className.split(/\s+/)
  for (const cls of ['font-mono', 'text-ink-muted', 'text-2xs', 'whitespace-nowrap'])
    expect(classes, `${testid} sans ${cls}`).toContain(cls)
  for (const cls of ['uppercase', 'mt-eyebrow', 'tracking-widest'])
    expect(classes, `${testid} porte ${cls}`).not.toContain(cls)
  // Même rangée que le `h2` (frère dans le conteneur flex), APRÈS lui : à droite.
  const row = counter.parentElement!
  expect(row.className.split(/\s+/)).toEqual(
    expect.arrayContaining(['flex', 'flex-wrap', 'items-baseline', 'justify-between']),
  )
  const h2 = row.querySelector('h2')
  expect(h2, `${testid} : pas de h2 dans la même rangée`).not.toBeNull()
  expect(h2!.compareDocumentPosition(counter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // Le titre cède la place (retour à la ligne) au lieu de pousser le compteur (PIT-S84-004).
  expect(h2!.className.split(/\s+/)).toContain('min-w-0')
}

describe('#664 — WeekAgenda : « {n} événements » = lignes affichées', () => {
  it('pluriel fr, et le compteur égale le nombre de lignes rendues', () => {
    const errors = renderIntl(
      <WeekAgenda
        // 2 dans la semaine (lun. 13 → dim. 19), 1 hors semaine : non compté.
        events={[evt('a', '2026-07-15'), evt('b', '2026-07-17'), evt('x', '2026-07-28')]}
        now={NOW}
        locale="fr"
      />,
    )
    expect(errors).toEqual([])
    expect(text('dashboard-week-count')).toBe('2 événements')
    expect(document.querySelectorAll('[data-testid^="dashboard-week-agenda-row-"]')).toHaveLength(2)
    expectCounterBesideTitle('dashboard-week-count')
  })

  it('singulier fr et vrais libellés allemands', () => {
    renderIntl(<WeekAgenda events={[evt('a', '2026-07-15')]} now={NOW} locale="fr" />)
    expect(text('dashboard-week-count')).toBe('1 événement')
    cleanup()
    renderIntl(
      <WeekAgenda
        events={[evt('a', '2026-07-15'), evt('b', '2026-07-16')]}
        now={NOW}
        locale="de"
      />,
      'de',
    )
    expect(text('dashboard-week-count')).toBe('2 Ereignisse')
  })

  it('état vide : pas de compteur (le message vide dit déjà « rien »)', () => {
    renderIntl(<WeekAgenda events={[evt('x', '2026-07-28')]} now={NOW} locale="fr" />)
    expect(screen.getByTestId('dashboard-week-agenda-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-week-count')).toBeNull()
  })
})

describe('#664 — CompactAgenda : compte ce qu’il MONTRE (aujourd’hui + demain)', () => {
  it('aujourd’hui + demain comptés, après-demain (dans la semaine) exclu', () => {
    const errors = renderIntl(
      <CompactAgenda
        events={[
          evt('t1', '2026-07-15'),
          evt('t2', '2026-07-15'),
          evt('d1', '2026-07-16'),
          // Vendredi 17 : dans la semaine, mais PAS affiché par l'agenda compact.
          evt('x', '2026-07-17'),
        ]}
        now={NOW}
      />,
    )
    expect(errors).toEqual([])
    expect(text('dashboard-compact-agenda-count')).toBe('3 événements')
    expect(
      document.querySelectorAll('[data-testid^="dashboard-compact-agenda-row-"]'),
    ).toHaveLength(3)
    expectCounterBesideTitle('dashboard-compact-agenda-count')
  })

  it('demain seul (aujourd’hui vide) : compteur présent, au singulier', () => {
    renderIntl(<CompactAgenda events={[evt('d1', '2026-07-16')]} now={NOW} />)
    expect(text('dashboard-compact-agenda-count')).toBe('1 événement')
  })

  it('allemand : forme longue, pas d’abréviation', () => {
    renderIntl(
      <CompactAgenda events={[evt('t1', '2026-07-15'), evt('d1', '2026-07-16')]} now={NOW} />,
      'de',
    )
    expect(text('dashboard-compact-agenda-count')).toBe('2 Ereignisse')
  })

  it('état vide : pas de compteur', () => {
    renderIntl(<CompactAgenda events={[evt('x', '2026-07-17')]} now={NOW} />)
    expect(screen.getByTestId('dashboard-compact-agenda-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-compact-agenda-count')).toBeNull()
  })
})

describe('#664 — ProductList / ProductCarousel : « {n} produits » = total listé', () => {
  const cases = [
    {
      name: 'ProductList',
      testid: 'dashboard-product-list-count',
      ui: (products: Product[], locale: Locale) => (
        <ProductList products={products} locale={locale} now={NOW} />
      ),
    },
    {
      name: 'ProductCarousel',
      testid: 'dashboard-product-carousel-count',
      ui: (products: Product[], locale: Locale) => (
        <ProductCarousel products={products} locale={locale} now={NOW} />
      ),
    },
  ]

  it.each(cases)('$name : pluriel fr, singulier, allemand', ({ testid, ui }) => {
    const errors = renderIntl(ui([product('p1'), product('p2'), product('p3')], 'fr'))
    expect(errors).toEqual([])
    expect(text(testid)).toBe('3 produits')
    expectCounterBesideTitle(testid)
    cleanup()
    renderIntl(ui([product('p1')], 'fr'))
    expect(text(testid)).toBe('1 produit')
    cleanup()
    renderIntl(ui([product('p1'), product('p2')], 'de'), 'de')
    expect(text(testid)).toBe('2 Produkte')
  })

  it.each(cases)('$name : état vide sans compteur', ({ testid, ui }) => {
    renderIntl(ui([], 'fr'))
    expect(screen.queryByTestId(testid)).toBeNull()
  })
})

describe('#664 — « En bref » : titre seul (maquette)', () => {
  it('aucun compteur ni sur-titre à côté du titre', () => {
    renderIntl(
      <KpiMarginalia
        kpis={{ week: 2, weekRecurring: 0, dueSoon: 1, ongoing: 0, busiestCategory: null }}
        locale="fr"
      />,
    )
    const h2 = screen.getByRole('heading', { level: 2 })
    // Le h2 est un enfant DIRECT de la section : pas de rangée titre + compteur.
    expect(h2.parentElement).toBe(screen.getByTestId('dashboard-kpi-marginalia'))
    expect(h2.previousElementSibling).toBeNull()
  })
})

describe('#664 — parité des clés de compteur dans les 4 locales', () => {
  it.each(Object.keys(MESSAGES) as Locale[])('%s : 3 clés, pluriel ICU avec `#`', (locale) => {
    const m = MESSAGES[locale]
    for (const message of [m.week.count, m.productList.count, m.mobile.compactAgenda.count]) {
      expect(message).toMatch(/^\{count, plural, one \{# [^}]+\} other \{# [^}]+\}\}$/)
    }
  })
})
