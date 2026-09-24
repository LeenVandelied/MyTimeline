import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { CreateEventProvider } from '@/components/layout/CreateEventContext'
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
  useTranslations: (namespace?: string) => (key: string) =>
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
      <DensityRibbon
        events={[evt('a', '2026-07-15')]}
        now={NOW}
        locale={LOCALE}
        rangeDays={30}
        scrollable
      />,
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

  it('#630 — état vide sous le shell, avec produit : instruction + CTA qui ouvre le drawer, sans piste', () => {
    const openCreate = vi.fn()
    render(
      <CreateEventProvider onOpenCreate={openCreate}>
        <CompactAgenda events={[]} now={NOW} canCreateEvent />
      </CreateEventProvider>,
    )
    const empty = screen.getByTestId('dashboard-compact-agenda-empty')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    expect(within(empty).getByText('dashboard.mobile.compactAgenda.emptyTitle')).toBeInTheDocument()
    expect(
      within(empty).queryByTestId('dashboard-compact-agenda-empty-track'),
    ).not.toBeInTheDocument()
    fireEvent.click(within(empty).getByTestId('dashboard-compact-agenda-empty-cta'))
    expect(openCreate).toHaveBeenCalledTimes(1)
  })

  it('review S90 — état vide sous le shell, SANS produit : instruction sans CTA', () => {
    const openCreate = vi.fn()
    render(
      <CreateEventProvider onOpenCreate={openCreate}>
        <CompactAgenda events={[]} now={NOW} canCreateEvent={false} />
      </CreateEventProvider>,
    )
    const empty = screen.getByTestId('dashboard-compact-agenda-empty')
    expect(within(empty).getByText('dashboard.mobile.compactAgenda.emptyTitle')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-compact-agenda-empty-cta')).not.toBeInTheDocument()
    expect(within(empty).queryByRole('button')).not.toBeInTheDocument()
  })

  it('#701 — aujourd’hui vide + demain non vide : « rien aujourd’hui », JAMAIS « ni demain »', () => {
    // `now` est figé par le prop `NOW` (mer. 15 juil. 2026) : le test ne dépend ni de
    // l'heure du run ni du fuseau, contrairement à un `new Date()` par défaut.
    render(<CompactAgenda events={[evt('tom1', '2026-07-16')]} now={NOW} />)

    // Pas l'état vide GLOBAL : demain porte un event.
    expect(screen.queryByTestId('dashboard-compact-agenda-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-compact-agenda-row-tom1')).toBeInTheDocument()

    const today = screen.getByTestId('dashboard-compact-agenda-today')
    expect(within(today).getByText('dashboard.mobile.compactAgenda.emptyToday')).toBeInTheDocument()
    // Garde anti-régression : ni l'ancienne clé « ni demain », ni l'instruction globale.
    expect(
      within(today).queryByText('dashboard.mobile.compactAgenda.empty'),
    ).not.toBeInTheDocument()
    expect(
      within(today).queryByText('dashboard.mobile.compactAgenda.emptyTitle'),
    ).not.toBeInTheDocument()
  })

  it('#701 — demain vide + aujourd’hui non vide : groupe demain absent, aucun message trompeur', () => {
    render(<CompactAgenda events={[evt('today1', '2026-07-15')]} now={NOW} />)

    expect(screen.getByTestId('dashboard-compact-agenda-row-today1')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-compact-agenda-tomorrow')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-compact-agenda-empty')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.mobile.compactAgenda.emptyToday')).not.toBeInTheDocument()
  })

  it('#630 — hors shell : aucun CTA', () => {
    render(<CompactAgenda events={[]} now={NOW} />)
    expect(screen.queryByTestId('dashboard-compact-agenda-empty-cta')).not.toBeInTheDocument()
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

  it('#630 — état vide : CTA vers la liste produits, sans piste', () => {
    render(<ProductCarousel products={[]} now={NOW} locale={LOCALE} />)
    const empty = screen.getByTestId('dashboard-product-carousel-empty')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    expect(
      within(empty).queryByTestId('dashboard-product-carousel-empty-track'),
    ).not.toBeInTheDocument()
    const cta = within(empty).getByTestId('dashboard-product-carousel-empty-cta')
    expect(cta).toHaveAttribute('href', '/fr/products')
    expect(cta).toHaveTextContent('dashboard.productList.emptyCta')
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

  // #655 — le tiroir monte la bascule UNIQUE (`ui/theme-toggle.tsx`, gabarit
  // `labeled`) : libellé visible = thème de destination, lu dans `common`.
  it.each([
    ['light', 'common.theme.dark', 'false'],
    ['dark', 'common.theme.light', 'true'],
  ])('#655 — en thème %s, le libellé visible nomme la destination', (theme, label, pressed) => {
    mockResolvedTheme = theme
    render(<MobileDrawer open onClose={vi.fn()} onLogout={vi.fn()} />)
    const toggle = screen.getByTestId('dashboard-mobile-drawer-theme-toggle')
    expect(toggle).toHaveTextContent(label)
    expect(toggle).toHaveAttribute('aria-pressed', pressed)
    expect(toggle).not.toHaveAttribute('aria-label')
  })
})
