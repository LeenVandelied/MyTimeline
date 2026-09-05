import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { GreetingHeader } from './GreetingHeader'
import { DensityRibbon } from './DensityRibbon'
import { WeekAgenda } from './WeekAgenda'
import { KpiMarginalia } from './KpiMarginalia'
import { ProductList } from './ProductList'

/**
 * #80 — Tests de rendu des composants dashboard. next-intl mocké → assertions
 * locale-agnostiques (clés `ns.key`). On vérifie : data-testid contractuels
 * (E2E #83/#85), délégation aux helpers, filet couleur, chiffres mono inline.
 */
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}))

const NOW = new Date(2026, 6, 15, 9, 0, 0) // mer. 15 juil. 2026, 9h (matin)
const LOCALE = 'fr'

const evt = (id: string, start: string, color = '#3E8BD6'): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId: 'p1',
  color,
  extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
})

describe('GreetingHeader', () => {
  it('rend la salutation du matin en fonction de l’heure locale', () => {
    render(<GreetingHeader name="Alice" now={NOW} />)
    expect(screen.getByTestId('dashboard-greeting')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent('dashboard.greeting.morning')
  })

  it('bascule sur le soir après 18h', () => {
    render(<GreetingHeader name="Alice" now={new Date(2026, 6, 15, 20)} />)
    expect(screen.getByRole('heading')).toHaveTextContent('dashboard.greeting.evening')
  })
})

describe('DensityRibbon', () => {
  it('rend une barre par jour de la fenêtre et marque TODAY', () => {
    render(<DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale={LOCALE} rangeDays={30} />)
    expect(screen.getByTestId('dashboard-density-ribbon')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-density-today')).toBeInTheDocument()
  })
})

describe('WeekAgenda', () => {
  it('liste les events de la semaine courante avec data-testid par ligne', () => {
    render(<WeekAgenda events={[evt('e1', '2026-07-15')]} now={NOW} locale={LOCALE} />)
    expect(screen.getByTestId('dashboard-week-agenda-row-e1')).toBeInTheDocument()
  })

  it('affiche l’état vide hors semaine', () => {
    render(<WeekAgenda events={[evt('e1', '2026-08-30')]} now={NOW} locale={LOCALE} />)
    expect(screen.getByTestId('dashboard-week-agenda-empty')).toBeInTheDocument()
  })
})

describe('KpiMarginalia', () => {
  it('rend les 3 KPIs en chiffres inline', () => {
    render(
      <KpiMarginalia kpis={{ activeProducts: 4, eventsThisMonth: 7, currentStreak: 2 }} locale={LOCALE} />,
    )
    expect(screen.getByTestId('dashboard-kpi-active-products')).toHaveTextContent('4')
    expect(screen.getByTestId('dashboard-kpi-events-month')).toHaveTextContent('7')
    expect(screen.getByTestId('dashboard-kpi-streak')).toHaveTextContent('2')
  })
})

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Produit ${id}`,
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: [],
  ...overrides,
})

describe('ProductList', () => {
  it('rend une ligne par produit avec compteur d’events non archivés', () => {
    const p = product('p1', {
      events: [
        {
          id: 'ev',
          title: 'Prochain',
          type: 'single',
          startDate: '2026-08-01',
          endDate: '2026-08-01',
          productId: 'p1',
          archived: false,
        },
        {
          id: 'ev2',
          title: 'Archivé',
          type: 'single',
          startDate: '2026-08-02',
          endDate: '2026-08-02',
          productId: 'p1',
          archived: true,
        },
      ],
    })
    render(<ProductList products={[p]} locale={LOCALE} now={NOW} />)
    const row = screen.getByTestId('dashboard-product-list-row-p1')
    expect(row).toBeInTheDocument()
    // 1 event non archivé → compteur "1".
    expect(row).toHaveTextContent('1')
  })

  it('affiche l’état vide sans produit', () => {
    render(<ProductList products={[]} locale={LOCALE} now={NOW} />)
    expect(screen.getByTestId('dashboard-product-list-empty')).toBeInTheDocument()
  })
})
