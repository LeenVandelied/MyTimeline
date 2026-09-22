import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import TimelinePage from './page'
import type { DashboardData } from '@/hooks/useDashboardData'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from '@/components/timeline'

/**
 * #301 — Tests de la page `/timeline` (jsdom). next-intl / auth / data-hook mockés
 * → assertions locale-agnostiques (clés `ns.key`). `TimelineEditHost` (frise lourde
 * + invariant AuthProvider) est STUBBÉ : on isole le câblage page → host, pas le
 * rendu de la frise (couvert par TimelineView/TimelineResponsive/TimelineEditHost).
 *
 * Couvre : garde d'auth (rien si anonyme), état de chargement des DONNÉES, état
 * vide (aucun produit), et montage du host avec les données agrégées
 * multi-produits ([MEMORY:decision] #301).
 *
 * #391 — Le test « spinner de restauration » (`timeline-loading`) a été SUPPRIMÉ
 * avec la branche qu'il couvrait. Il rendait `TimelinePage` en ISOLATION, hors de
 * `AppShell` : il prouvait que la branche s'affichait si on la forçait, jamais
 * qu'un utilisateur pouvait la voir (le shell ne monte `children` qu'une fois
 * `loading` retombé). Le chargement de session est couvert par `app-shell-loading`
 * (`AppShell.test.tsx` + `e2e/timeline.spec.ts`). Ne pas réintroduire de test de
 * `loading` sur cette page : il ne décrirait aucun état atteignable.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

let mockAuthUser: { id: string } | null = { id: 'u1' }
let mockAuthLoading = false
vi.mock('@/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ user: mockAuthUser, loading: mockAuthLoading }),
}))

let mockDashboard: DashboardData
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashboard,
}))

// Stub du host lourd : capture les props reçues (events/resources/locale).
const hostSpy = vi.fn()
vi.mock('@/components/timeline', () => ({
  TimelineEditHost: (props: { events: unknown[]; resources: unknown[]; locale: string }) => {
    hostSpy(props)
    return <div data-testid="timeline-edit-host-stub" />
  },
}))

const resource: Resource = { id: 'p1', title: 'Produit 1', category: 'Cat' }
const event = { id: 'e1', title: 'E1', start: '2026-01-01', resourceId: 'p1' } as FullCalendarEvent

function makeData(over: Partial<DashboardData> = {}): DashboardData {
  return {
    products: [],
    events: [],
    resources: [],
    kpis: { week: 0, weekRecurring: 0, dueSoon: 0, ongoing: 0, busiestCategory: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...over,
  }
}

beforeEach(() => {
  mockAuthUser = { id: 'u1' }
  mockAuthLoading = false
  mockDashboard = makeData()
  hostSpy.mockClear()
})

describe('TimelinePage — garde d’auth', () => {
  it('ne rend rien si anonyme (user null, loading retombé)', () => {
    mockAuthUser = null
    mockAuthLoading = false
    const { container } = render(<TimelinePage />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TimelinePage — écran frise', () => {
  it('affiche le chargement des données (isLoading) sans monter le host', () => {
    mockDashboard = makeData({ isLoading: true })
    render(<TimelinePage />)
    expect(screen.getByTestId('timeline-screen')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-data-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-edit-host-stub')).not.toBeInTheDocument()
  })

  it('#629 — le chargement des données est le squelette en lanes, libellé conservé', () => {
    mockDashboard = makeData({ isLoading: true })
    render(<TimelinePage />)
    const loading = screen.getByTestId('timeline-data-loading')
    expect(loading).toHaveAttribute('role', 'status')
    expect(loading).not.toHaveAttribute('aria-busy')
    expect(screen.getByText('shell.timeline.loading')).toBeInTheDocument()
    const lanes = screen.getAllByTestId('loading-skeleton-item')
    expect(lanes.length).toBeGreaterThan(0)
    for (const lane of lanes) expect(lane.style.height).toBe('var(--lane-height)')
  })

  it('affiche l’état vide quand aucun produit (resources vide)', () => {
    mockDashboard = makeData({ resources: [], events: [] })
    render(<TimelinePage />)
    expect(screen.getByTestId('timeline-empty')).toBeInTheDocument()
    expect(screen.getByText('shell.timeline.emptyTitle')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-edit-host-stub')).not.toBeInTheDocument()
  })

  it('#630 — état vide dédié : EmptyState + piste pointillée + CTA vers les produits', () => {
    mockDashboard = makeData({ resources: [], events: [] })
    render(<TimelinePage />)
    const empty = screen.getByTestId('timeline-empty')
    expect(within(empty).getByRole('status')).toBeInTheDocument()
    // Encombrement conservé (l'écran vide ne « remonte » pas).
    expect(empty.className).toContain('flex-1')
    expect(within(empty).getByTestId('timeline-empty-track')).toHaveAttribute('aria-hidden', 'true')
    expect(within(empty).getByText('shell.timeline.emptyBody')).toBeInTheDocument()
    // CTA = créer un PRODUIT (BR-EVE-002), pas « Nouvel événement ».
    const cta = within(empty).getByTestId('timeline-empty-cta')
    expect(cta).toHaveAttribute('href', '/fr/products')
    expect(cta).toHaveTextContent('shell.timeline.emptyCta')
  })

  it('monte TimelineEditHost avec les données agrégées quand des produits existent', () => {
    mockDashboard = makeData({ resources: [resource], events: [event] })
    render(<TimelinePage />)
    expect(screen.getByTestId('timeline-host')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-edit-host-stub')).toBeInTheDocument()
    expect(hostSpy).toHaveBeenCalledWith(
      expect.objectContaining({ events: [event], resources: [resource], locale: 'fr' }),
    )
    expect(screen.queryByTestId('timeline-empty')).not.toBeInTheDocument()
  })

  it('n’affiche plus le placeholder « coming soon » (#301 purge #166)', () => {
    mockDashboard = makeData({ resources: [resource] })
    render(<TimelinePage />)
    expect(screen.queryByTestId('timeline-placeholder')).not.toBeInTheDocument()
    expect(screen.queryByText('shell.timeline.comingSoon')).not.toBeInTheDocument()
  })
})
