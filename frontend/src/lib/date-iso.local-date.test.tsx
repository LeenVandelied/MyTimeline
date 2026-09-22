import { cleanup, render, renderHook } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { parseLocalDate, parseLocalIsoDate, toLocalIsoDate } from '@/lib/date-iso'
import { nextEvent } from '@/components/dashboard/lib'
import { WeekAgenda } from '@/components/dashboard/WeekAgenda'
import { ProductList } from '@/components/dashboard/ProductList'
import { ProductCarousel } from '@/components/dashboard/ProductCarousel'
import {
  buildDensityBuckets,
  buildEventAriaLabel,
  getEventsInRange,
  getWeekRange,
} from '@/components/timeline/lib'
import {
  buildMinimapBuckets,
  computeRange,
  indexEventsByResource,
} from '@/components/timeline/zoom'
import { EventDrawer } from '@/components/timeline/EventDrawer'
import { TimelineBottomSheet } from '@/components/timeline/TimelineBottomSheet'
import { TimelineLandscapeDrawer } from '@/components/timeline/TimelineLandscapeDrawer'
import { makePositionedEvent } from '@/components/timeline/fixtures'
import { useDashboardData } from '@/hooks/useDashboardData'

/**
 * #652 — Une `LocalDate` backend (`"2026-07-13"`) est une date CIVILE, lue en
 * heure LOCALE (arbitrage option A, cf. `lib/date-iso.ts`).
 *
 * POURQUOI CE FICHIER FORCE `TZ` : le défaut est un NO-OP en UTC (CI Ubuntu) ET
 * à l'est de Greenwich (poste Europe/Paris) — minuit UTC y tombe le même jour
 * civil. Seul un fuseau NÉGATIF le rend observable. `America/New_York` (UTC−4 en
 * juillet) : `new Date("2026-07-13")` y vaut le 12 juillet à 20 h. Chaque test
 * ci-dessous est ROUGE si un appelant relit la chaîne via `new Date(str)`.
 * Le fuseau est posé par le TEST, pas par le shell : il rougit aussi sous
 * `TZ=UTC npx vitest`.
 *
 * ⚠ AUCUNE `Date` locale au niveau module : elle serait construite AVANT le
 * `beforeAll`, dans le fuseau ambiant. Tout passe par des fonctions.
 *
 * CE QU'IL NE PROUVE PAS : `ProductsListView` / `ProductDetailView` (router +
 * react-query) — couverts par l'E2E `sprint-89-local-date-west.spec.ts` sous
 * `timezoneId` ; ni la tenue visuelle de la frise (jsdom ne met rien en page).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

const productsFixture = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: () => ({
    data: productsFixture.current,
    isLoading: false,
    isError: false,
    refetch: () => {},
  }),
}))

const WEST_TZ = 'America/New_York'
const LOCALE = 'fr'

const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = WEST_TZ
})
afterAll(() => {
  // PIT-S83-007 : `process.env.TZ = undefined` écrirait la CHAÎNE "undefined".
  if (previousTz === undefined) delete process.env.TZ
  else process.env.TZ = previousTz
})
afterEach(cleanup)

/** Mercredi 15 juillet 2026, 9 h LOCALE (semaine ISO du lundi 13 au dimanche 19). */
const now = () => new Date(2026, 6, 15, 9, 0, 0)
/** Minuit LOCAL d'un jour civil — la référence attendue. */
const civil = (y: number, m: number, d: number) => new Date(y, m - 1, d)

const evt = (id: string, start: string, end = start): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
})

const product = (startDate: string): Product =>
  ({
    id: 'p1',
    name: 'Produit A',
    color: '#3E8BD6',
    category: { id: 'c1', name: 'Cat', color: '#4FA459' },
    events: [{ id: 'e0', title: 'Event 0', startDate, endDate: startDate, archived: false }],
  }) as unknown as Product

describe('#652 — non-vacance : le fuseau OUEST est bien actif', () => {
  it('le fuseau de test est négatif, et la lecture UTC naïve y recule d’un jour', () => {
    expect(civil(2026, 7, 13).getTimezoneOffset()).toBeGreaterThan(0)
    // Le défaut lui-même, documenté : c'est CE comportement que le helper neutralise.
    expect(new Date('2026-07-13').getDate()).toBe(12)
  })
})

describe('#652 — helper `parseLocalDate` (lib/date-iso.ts)', () => {
  it('lit `YYYY-MM-DD` à minuit LOCAL du jour civil', () => {
    const d = parseLocalDate('2026-07-13')
    expect(d.getTime()).toBe(civil(2026, 7, 13).getTime())
    expect(toLocalIsoDate(d)).toBe('2026-07-13')
  })

  it('garde le contrat de `new Date` : Date INVALIDE plutôt que null', () => {
    expect(Number.isNaN(parseLocalDate('').getTime())).toBe(true)
    expect(Number.isNaN(parseLocalDate('pas-une-date').getTime())).toBe(true)
  })

  it('laisse un horodatage COMPLET (instant explicite) à `new Date`', () => {
    const iso = '2026-07-16T00:00:00.000Z'
    expect(parseLocalDate(iso).getTime()).toBe(new Date(iso).getTime())
  })

  it('`parseLocalIsoDate` reste strict (null hors date-seule)', () => {
    expect(parseLocalIsoDate('2026-07-13')?.getTime()).toBe(civil(2026, 7, 13).getTime())
    expect(parseLocalIsoDate(null)).toBeNull()
    expect(parseLocalIsoDate('2026-07-13T00:00:00Z')).toBeNull()
  })
})

describe('#652 — dashboard', () => {
  it('nextEvent : un événement d’AUJOURD’HUI reste « à venir » à minuit local', () => {
    // Sans le correctif : 15 juil. 20 h la veille < minuit du 16 → écarté.
    const midnight = civil(2026, 7, 16)
    expect(nextEvent(product('2026-07-16'), midnight)).toEqual({
      title: 'Event 0',
      start: '2026-07-16',
    })
  })

  it('WeekAgenda : l’événement du lundi 13 est dans la semaine, libellé et datetime au 13', () => {
    const fmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' })
    const { container } = render(
      <WeekAgenda events={[evt('a', '2026-07-13')]} locale={LOCALE} now={now()} />,
    )
    const el = container.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('datetime')).toBe('2026-07-13')
    expect(el?.textContent).toBe(fmt.format(civil(2026, 7, 13)))
  })

  it.each([
    ['ProductList', ProductList],
    ['ProductCarousel', ProductCarousel],
  ] as const)('%s : prochaine échéance affichée au 16, pas au 15', (_name, Component) => {
    const fmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
    const { container } = render(
      <Component products={[product('2026-07-16')]} locale={LOCALE} now={now()} />,
    )
    const el = container.querySelector('time')
    expect(el?.getAttribute('datetime')).toBe('2026-07-16')
    expect(el?.textContent).toBe(fmt.format(civil(2026, 7, 16)))
  })

  it('useDashboardData : série courante et KPI du mois comptent le jour CIVIL', () => {
    productsFixture.current = [
      {
        id: 'p1',
        name: 'Produit A',
        color: null,
        category: { id: 'c1', name: 'Cat', color: '#4FA459' },
        events: [
          {
            id: 'e1',
            title: 'Aujourd’hui',
            startDate: '2026-07-15',
            endDate: '2026-07-15',
            archived: false,
            productId: 'p1',
            type: 'single',
          },
          {
            id: 'e2',
            title: 'Août',
            startDate: '2026-08-01',
            endDate: '2026-08-01',
            archived: false,
            productId: 'p1',
            type: 'single',
          },
        ],
      },
    ]
    const fixedNow = now()
    const { result } = renderHook(() => useDashboardData('u1', fixedNow))
    // Sans le correctif : e1 = 14 juil. 20 h (série 0) ; e2 = 31 juil. 20 h (compté en juillet).
    expect(result.current.kpis.currentStreak).toBe(1)
    expect(result.current.kpis.eventsThisMonth).toBe(1)
  })
})

describe('#652 — frise (timeline/lib.ts, timeline/zoom.ts)', () => {
  it('getEventsInRange : le lundi 13 appartient à la semaine du 13', () => {
    const { start, end } = getWeekRange(now())
    expect(getEventsInRange([evt('a', '2026-07-13')], start, end).map((e) => e.id)).toEqual(['a'])
  })

  it('buildDensityBuckets : l’événement du 15 tombe dans le seau du 15', () => {
    const buckets = buildDensityBuckets([evt('a', '2026-07-15')], civil(2026, 7, 15), now(), 7)
    expect(buckets.map((b) => b.count)).toEqual([1, 0, 0, 0, 0, 0, 0])
  })

  it('buildEventAriaLabel : la plage annoncée est celle des jours civils', () => {
    const fmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })
    const label = buildEventAriaLabel(
      { ...evt('a', '2026-07-10', '2026-07-12'), status: 'upcoming' },
      LOCALE,
      (k) => k,
    )
    expect(label).toContain(`${fmt.format(civil(2026, 7, 10))} – ${fmt.format(civil(2026, 7, 12))}`)
  })

  it('indexEventsByResource : décalage et étendue en jours civils', () => {
    const map = indexEventsByResource(
      [evt('a', '2026-07-10', '2026-07-12')],
      civil(2026, 7, 1),
      now(),
    )
    const [geometry] = map.get('p1') ?? []
    expect(geometry?.dayOffset).toBe(9)
    expect(geometry?.spanDays).toBe(2)
  })

  it('computeRange : bornes calées sur les jours civils des événements', () => {
    const { rangeStart, rangeEnd } = computeRange(
      [evt('a', '2026-07-01', '2026-07-31')],
      civil(2026, 7, 15),
      0,
    )
    expect(toLocalIsoDate(rangeStart)).toBe('2026-07-01')
    expect(toLocalIsoDate(rangeEnd)).toBe('2026-07-31')
  })

  it('buildMinimapBuckets : un seau par jour, l’événement du 10 au seau 9', () => {
    const buckets = buildMinimapBuckets([evt('a', '2026-07-10')], civil(2026, 7, 1), 60, 60)
    expect(buckets.indexOf(1)).toBe(9)
  })

  it.each([
    ['EventDrawer', EventDrawer],
    ['TimelineBottomSheet', TimelineBottomSheet],
    ['TimelineLandscapeDrawer', TimelineLandscapeDrawer],
  ] as const)('%s : début et fin affichés au 5 et au 10 juillet', (_name, Drawer) => {
    const fmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })
    const event = makePositionedEvent({ start: '2026-07-05', end: '2026-07-10' })
    const { container } = render(<Drawer event={event} locale={LOCALE} onClose={() => {}} />)
    const times = Array.from(container.querySelectorAll('time'))
    expect(times.map((t) => t.getAttribute('datetime'))).toEqual(['2026-07-05', '2026-07-10'])
    expect(times.map((t) => t.textContent)).toEqual([
      fmt.format(civil(2026, 7, 5)),
      fmt.format(civil(2026, 7, 10)),
    ])
  })
})
