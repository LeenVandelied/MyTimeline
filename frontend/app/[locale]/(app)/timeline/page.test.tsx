import { render, screen } from '@testing-library/react'
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
 * Couvre : garde d'auth (spinner pendant restauration, rien si anonyme), état de
 * chargement des données, état vide (aucun produit), et montage du host avec les
 * données agrégées multi-produits ([MEMORY:decision] #301).
 */
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
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
    kpis: { activeProducts: 0, eventsThisMonth: 0, currentStreak: 0 },
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
  it('affiche le spinner de restauration tant que loading', () => {
    mockAuthLoading = true
    render(<TimelinePage />)
    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-screen')).not.toBeInTheDocument()
  })

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

  it('affiche l’état vide quand aucun produit (resources vide)', () => {
    mockDashboard = makeData({ resources: [], events: [] })
    render(<TimelinePage />)
    expect(screen.getByTestId('timeline-empty')).toBeInTheDocument()
    expect(screen.getByText('shell.timeline.emptyTitle')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-edit-host-stub')).not.toBeInTheDocument()
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
