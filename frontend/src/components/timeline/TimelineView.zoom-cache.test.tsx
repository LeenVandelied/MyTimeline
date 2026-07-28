import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { DAY_WIDTH_PX, MAJOR_TICK_UNIT } from './zoom'
import { TimelineView } from './TimelineView'

/**
 * #349 — INJECTIVITÉ de la clé du cache de zoom (`useZoomCache`).
 *
 * `buildRulerTicks` consomme le niveau de zoom ET la largeur de jour, mais le
 * cache était clé sur `dayWidth` SEUL. La correction ne tenait que par un
 * invariant tacite — que les valeurs de `DAY_WIDTH_PX` soient deux à deux
 * distinctes — que rien ne garantissait. Le jour où deux niveaux partagent une
 * largeur, la règle graduée devient silencieusement fausse : pas d'erreur, pas
 * de test rouge, juste un mauvais rendu.
 *
 * Ce test SUPPRIME l'invariant (mock : `week` et `month` à la même largeur) et
 * vérifie que les graduations restent propres à chaque niveau. Il ÉCHOUE avec
 * l'ancienne clé `dayWidth` (les deux niveaux se partagent une entrée de cache)
 * et passe avec la clé composite `${zoom.level}|${dayWidth}`.
 */

// Les deux niveaux partagent DÉLIBÉRÉMENT la même largeur de jour.
// (Littéral inliné : `vi.mock` est hoisté au-dessus des déclarations du module.)
vi.mock('./zoom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./zoom')>()
  return {
    ...actual,
    DAY_WIDTH_PX: { ...actual.DAY_WIDTH_PX, week: 34, month: 34 },
  }
})

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
  },
]

const RESOURCES: Resource[] = [{ id: 'p1', title: 'Lait bio', category: 'Frais' }]

function countTicks(): number {
  return screen.getByTestId('timeline-ruler').querySelectorAll('.mt-tlv__tick').length
}

describe('useZoomCache — clé de cache de zoom', () => {
  it('le mock rend bien les deux niveaux indiscernables par leur largeur de jour', () => {
    // Garde-fou : si cette égalité saute, le test ne teste plus rien.
    expect(DAY_WIDTH_PX.week).toBe(DAY_WIDTH_PX.month)
    // ...alors que la granularité des graduations, elle, DIFFÈRE.
    expect(MAJOR_TICK_UNIT.week).not.toBe(MAJOR_TICK_UNIT.month)
  })

  it('ne réutilise PAS les graduations d’un autre niveau de même largeur de jour', async () => {
    const user = userEvent.setup()
    render(
      <TimelineView
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )

    // Niveau initial `month` → graduations à la SEMAINE.
    const level = screen.getByTestId('timeline-zoom-level')
    const monthTicks = countTicks()
    expect(monthTicks).toBeGreaterThan(0)

    // Zoom avant → `week`, même largeur de jour, mais graduations au JOUR.
    const before = level.textContent
    await user.click(screen.getByTestId('timeline-zoom-in'))
    await waitFor(() => expect(level.textContent).not.toBe(before))

    const weekTicks = countTicks()

    // Avec l'ancienne clé (`dayWidth` seul), `week` recevait le tableau mis en
    // cache par `month` → compte INCHANGÉ. Une graduation par jour au lieu
    // d'une par semaine : le rapport attendu est d'environ 7.
    expect(weekTicks).toBeGreaterThan(monthTicks * 3)
  })
})
