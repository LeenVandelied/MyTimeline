import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from './page'
import type { DashboardData } from '@/hooks/useDashboardData'
import type { Product } from '@/types/product'

/**
 * #624 — Le tableau de bord montre un APERÇU de la frise (ruban de densité) et un
 * bouton « Ouvrir la frise » vers `/timeline` ; il ne monte plus la frise complète
 * (`TimelineEditHost`) ni le CTA `AddProductButton` (arbitrage : le shell porte déjà
 * « Nouvel événement », la création de produit vit sur `/products`).
 *
 * jsdom : next-intl, auth, données et media queries mockés. `TimelineEditHost` est
 * remplacé par un stub TRAÇANT : si la page le montait encore, le stub serait rendu
 * et son espion appelé — l'absence est donc observable, pas supposée. `DensityRibbon`
 * et `GreetingHeader` sont RÉELS (le lien vit dans le ruban) ; les autres sections
 * sont neutralisées, elles ne portent pas l'objet de ces tests.
 *
 * Ce que ce fichier ne dit PAS : que le lien est peint et tient dans l'écran (cf.
 * `e2e/sprint-84-section-titles.spec.ts`), ni qu'il mène réellement à la frise
 * (cf. `e2e/golden-path.spec.ts`).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

vi.mock('@/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ user: { id: 'u1', username: 'alice' }, loading: false }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}))

const emptyData: DashboardData = {
  products: [],
  events: [],
  resources: [],
  kpis: { week: 0, weekRecurring: 0, dueSoon: 0, ongoing: 0, busiestCategory: null },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}
const oneProduct: Product = {
  id: 'p1',
  name: 'Produit A',
  color: null,
  category: { id: 'c1', name: 'Cat', color: null },
  events: [],
}
// Objet muable (lu à l’appel du mock) : chaque test peut remplacer `data`.
const dashboardState: { data: DashboardData } = { data: emptyData }
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => dashboardState.data,
}))

const media = { mobile: false, landscape: false }
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (query: string) =>
    query.includes('orientation') ? media.landscape : media.mobile,
}))

const hostSpy = vi.fn()
vi.mock('@/components/timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/timeline')>()
  return {
    ...actual,
    TimelineEditHost: () => {
      hostSpy()
      return <div data-testid="timeline-edit-host-stub" />
    },
  }
})

vi.mock('@/components/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/dashboard')>()
  return {
    ...actual,
    // Review S90 — stubs qui EXPOSENT `canCreateEvent` : la transmission par la page
    // est observable (un seul agenda monté par branche, desktop ou compact).
    WeekAgenda: ({ canCreateEvent }: { canCreateEvent?: boolean }) => (
      <div data-testid="agenda-stub" data-can-create-event={String(canCreateEvent)} />
    ),
    KpiMarginalia: () => null,
    ProductList: () => null,
    CompactAgenda: ({ canCreateEvent }: { canCreateEvent?: boolean }) => (
      <div data-testid="agenda-stub" data-can-create-event={String(canCreateEvent)} />
    ),
    ProductCarousel: () => null,
    MobileDrawer: () => null,
    CompactRail: () => null,
  }
})

vi.mock('@/components/ui/footer-app', () => ({
  AppFooter: () => null,
}))

beforeEach(() => {
  media.mobile = false
  media.landscape = false
  dashboardState.data = emptyData
  hostSpy.mockClear()
})

const BRANCHES = [
  { name: 'desktop', mobile: false, landscape: false, testid: null },
  { name: 'mobile portrait', mobile: true, landscape: false, testid: 'dashboard-mobile-portrait' },
  { name: 'mobile paysage', mobile: true, landscape: true, testid: 'dashboard-landscape' },
] as const

describe.each(BRANCHES)('Dashboard #624 — branche $name', ({ mobile, landscape, testid }) => {
  beforeEach(() => {
    media.mobile = mobile
    media.landscape = landscape
  })

  it('rend la branche attendue', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    for (const other of ['dashboard-mobile-portrait', 'dashboard-landscape']) {
      if (other === testid) expect(screen.getByTestId(other)).toBeInTheDocument()
      else expect(screen.queryByTestId(other)).not.toBeInTheDocument()
    }
  })

  it('un seul lien « Ouvrir la frise », vers /fr/timeline', () => {
    render(<Dashboard />)
    const links = screen.getAllByTestId('dashboard-open-timeline')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/fr/timeline')
    expect(links[0]).toHaveTextContent('dashboard.density.openTimeline')
    // Le lien est porté par l'aperçu (ruban), pas posé à côté.
    expect(screen.getByTestId('dashboard-density-ribbon')).toContainElement(links[0])
  })

  it('ne monte ni la frise complète ni le CTA produit', () => {
    render(<Dashboard />)
    expect(screen.queryByTestId('timeline-edit-host-stub')).not.toBeInTheDocument()
    expect(hostSpy).not.toHaveBeenCalled()
    expect(screen.queryByTestId('add-product-button')).not.toBeInTheDocument()
  })

  it('review S90 — agenda : canCreateEvent=false sans produit, true avec ≥ 1 produit', () => {
    const { unmount } = render(<Dashboard />)
    expect(screen.getByTestId('agenda-stub')).toHaveAttribute('data-can-create-event', 'false')
    unmount()

    dashboardState.data = { ...emptyData, products: [oneProduct] }
    render(<Dashboard />)
    expect(screen.getByTestId('agenda-stub')).toHaveAttribute('data-can-create-event', 'true')
  })
})
