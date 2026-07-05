import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { DensityRibbon } from './DensityRibbon'
import { CompactAgenda } from './CompactAgenda'
import { ProductCarousel } from './ProductCarousel'
import { MobileDrawer } from './MobileDrawer'

/**
 * #83 — Tests des briques mobile portrait (jsdom). next-intl mocké → assertions
 * locale-agnostiques (clés `ns.key`). Couvre : ruban scrollable + hint, agenda
 * compact jour/lendemain + vide, carousel produits (>= 3 cartes) + vide, drawer
 * a11y (role dialog, Escape ferme, logout, toggle thème). Contrats `data-testid`
 * pour l'E2E #85.
 */
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

const setTheme = vi.fn()
let mockResolvedTheme = 'light'
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme }),
}))

const NOW = new Date(2026, 6, 15, 9, 0, 0) // mer. 15 juil. 2026, 9h
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

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Produit ${id}`,
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: [],
  ...overrides,
})

describe('DensityRibbon (scrollable)', () => {
  it('rend un rail scrollable-x avec hint de scroll en mode scrollable', () => {
    render(
      <DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale={LOCALE} rangeDays={30} scrollable />,
    )
    expect(screen.getByTestId('dashboard-density-ribbon-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-density-today')).toBeInTheDocument()
  })

  it('ne rend PAS le rail scrollable en mode desktop (défaut)', () => {
    render(<DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale={LOCALE} />)
    expect(screen.queryByTestId('dashboard-density-ribbon-scroll')).not.toBeInTheDocument()
  })
})

describe('CompactAgenda', () => {
  it('liste les events du jour et du lendemain', () => {
    render(
      <CompactAgenda events={[evt('today1', '2026-07-15'), evt('tom1', '2026-07-16')]} now={NOW} />,
    )
    expect(screen.getByTestId('dashboard-compact-agenda-today')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-compact-agenda-tomorrow')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-compact-agenda-row-today1')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-compact-agenda-row-tom1')).toBeInTheDocument()
  })

  it('ignore les events hors jour/lendemain (pas la vue semaine)', () => {
    render(<CompactAgenda events={[evt('far', '2026-07-20')]} now={NOW} />)
    expect(screen.queryByTestId('dashboard-compact-agenda-row-far')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-compact-agenda-empty')).toBeInTheDocument()
  })

  it('affiche l’état vide sans event', () => {
    render(<CompactAgenda events={[]} now={NOW} />)
    expect(screen.getByTestId('dashboard-compact-agenda-empty')).toBeInTheDocument()
  })
})

describe('ProductCarousel', () => {
  it('rend un carousel snap avec une carte par produit (>= 3)', () => {
    render(
      <ProductCarousel
        products={[product('p1'), product('p2'), product('p3')]}
        now={NOW}
        locale={LOCALE}
      />,
    )
    const carousel = screen.getByTestId('dashboard-product-carousel')
    expect(carousel).toBeInTheDocument()
    expect(carousel.className).toContain('snap-x')
    expect(screen.getByTestId('dashboard-product-carousel-card-p1')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-product-carousel-card-p2')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-product-carousel-card-p3')).toBeInTheDocument()
  })

  it('affiche l’état vide sans produit', () => {
    render(<ProductCarousel products={[]} now={NOW} locale={LOCALE} />)
    expect(screen.getByTestId('dashboard-product-carousel-empty')).toBeInTheDocument()
  })
})

describe('MobileDrawer', () => {
  beforeEach(() => {
    setTheme.mockClear()
    mockResolvedTheme = 'light'
  })

  it('ne rend rien quand fermé', () => {
    render(<MobileDrawer open={false} onClose={vi.fn()} onLogout={vi.fn()} />)
    expect(screen.queryByTestId('dashboard-mobile-drawer')).not.toBeInTheDocument()
  })

  it('rend un dialog modal a11y quand ouvert', () => {
    render(<MobileDrawer open onClose={vi.fn()} onLogout={vi.fn()} />)
    const drawer = screen.getByTestId('dashboard-mobile-drawer')
    expect(drawer).toHaveAttribute('role', 'dialog')
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(drawer).toHaveAttribute('aria-labelledby', 'dashboard-mobile-drawer-title')
  })

  it('ferme sur Escape', () => {
    const onClose = vi.fn()
    render(<MobileDrawer open onClose={onClose} onLogout={vi.fn()} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ferme au clic sur l’overlay', () => {
    const onClose = vi.fn()
    render(<MobileDrawer open onClose={onClose} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByTestId('dashboard-mobile-drawer-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('appelle onLogout au clic déconnexion', () => {
    const onLogout = vi.fn()
    render(<MobileDrawer open onClose={vi.fn()} onLogout={onLogout} />)
    fireEvent.click(screen.getByTestId('dashboard-mobile-drawer-logout'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('bascule le thème via next-themes', () => {
    render(<MobileDrawer open onClose={vi.fn()} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByTestId('dashboard-mobile-drawer-theme-toggle'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
