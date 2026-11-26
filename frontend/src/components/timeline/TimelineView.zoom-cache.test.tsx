import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { tickUnitForScale, DAY_WIDTH_PX, ZOOM_STEP } from './zoom'
import { createKeyedCache, TimelineView, ZOOM_CACHE_SIZE } from './TimelineView'

/**
 * #349 — Clé du cache de zoom (`useZoomCache`) : la règle mise en cache à une
 * échelle ne doit jamais servir à une autre.
 *
 * Avant #593, deux PALIERS de même largeur de jour pouvaient se voler leurs
 * graduations (clé sur `dayWidth` seul). #593 rend l'échelle continue : l'unité de
 * graduation dérive de l'échelle (`tickUnitForScale`) et la clé porte les deux
 * (`${unit}|${pxPerDay}`). Le cache est borné aux dernières échelles visitées.
 *
 * Ce test franchit un seuil d'unité (semaines → jours) puis revient : la règle
 * doit changer de granularité à l'aller, et retrouver EXACTEMENT ses graduations
 * de départ au retour (entrée relue, pas une autre).
 */

// #593 — valeurs interpolées rendues après la clé : la lecture « 1 px = X h » suit le zoom.
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    const full = namespace ? `${namespace}.${key}` : key
    return values ? `${full} ${Object.values(values).join(' ')}` : full
  },
}))

/**
 * jsdom n'implémente PAS l'API Fullscreen : on l'installe pour ce fichier, et on
 * la RETIRE ensuite. Sans restauration, la stub survit au fichier le jour où
 * l'isolation vitest (`isolate: false`, worker partagé) serait désactivée — un
 * autre test verrait alors un `requestFullscreen` résolu d'office. On capture les
 * descripteurs d'origine (absents ici, d'où la suppression) plutôt que d'affecter
 * `undefined`, qui laisserait la propriété en place.
 */
const ORIGINAL_REQUEST_FULLSCREEN = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'requestFullscreen',
)
const ORIGINAL_EXIT_FULLSCREEN = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

afterEach(() => {
  if (ORIGINAL_REQUEST_FULLSCREEN) {
    Object.defineProperty(Element.prototype, 'requestFullscreen', ORIGINAL_REQUEST_FULLSCREEN)
  } else {
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
  }
  if (ORIGINAL_EXIT_FULLSCREEN) {
    Object.defineProperty(document, 'exitFullscreen', ORIGINAL_EXIT_FULLSCREEN)
  } else {
    Reflect.deleteProperty(document, 'exitFullscreen')
  }
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
  it('trois crans depuis le mois franchissent le seuil semaines → jours', () => {
    // Garde-fou : si ces unités ne diffèrent plus, le test ne teste plus rien.
    expect(tickUnitForScale(DAY_WIDTH_PX.month)).toBe('week')
    expect(tickUnitForScale(DAY_WIDTH_PX.month * ZOOM_STEP ** 3)).toBe('day')
  })

  it('ne réutilise PAS les graduations d’une autre échelle, et retrouve les siennes', async () => {
    const user = userEvent.setup()
    render(
      <TimelineView
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )

    // Échelle initiale du mois → graduations à la SEMAINE.
    const level = screen.getByTestId('timeline-zoom-level')
    const monthTicks = countTicks()
    expect(monthTicks).toBeGreaterThan(0)
    const monthLabels = screen.getByTestId('timeline-ruler').textContent

    // Trois crans avant → graduations au JOUR. Une par jour au lieu d'une par
    // semaine : le rapport attendu est d'environ 7.
    for (let i = 0; i < 3; i++) {
      const before = level.textContent
      await user.click(screen.getByTestId('timeline-zoom-in'))
      await waitFor(() => expect(level.textContent).not.toBe(before))
    }
    expect(countTicks()).toBeGreaterThan(monthTicks * 3)

    // Retour : mêmes graduations qu'au départ.
    for (let i = 0; i < 3; i++) {
      const before = level.textContent
      await user.click(screen.getByTestId('timeline-zoom-out'))
      await waitFor(() => expect(level.textContent).not.toBe(before))
    }
    expect(countTicks()).toBe(monthTicks)
    expect(screen.getByTestId('timeline-ruler').textContent).toBe(monthLabels)
  })
})

/**
 * #593 — Le cache par échelle est borné (`ZOOM_CACHE_SIZE`, LRU) : testé directement, car
 * le test de rendu ci-dessus passerait aussi sans cache. Compteur d'appels de `compute`.
 */
describe('createKeyedCache — LRU par échelle', () => {
  it('garde les 8 dernières clés, et une clé relue repasse en dernier', () => {
    expect(ZOOM_CACHE_SIZE).toBe(8)
    const lookup = createKeyedCache<string>()
    const compute = vi.fn((key: string) => `value:${key}`)
    const read = (key: string) => lookup(key, () => compute(key))

    for (let i = 0; i < 8; i++) expect(read(`k${i}`)).toBe(`value:k${i}`)
    expect(compute).toHaveBeenCalledTimes(8)

    // Relue, k0 est promue : c'est k1 qui sort quand la 9e clé entre.
    expect(read('k0')).toBe('value:k0')
    expect(compute).toHaveBeenCalledTimes(8)
    read('k8')
    expect(compute).toHaveBeenCalledTimes(9)

    // k0 et k2..k8 restent en cache.
    for (const key of ['k0', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']) read(key)
    expect(compute).toHaveBeenCalledTimes(9)

    // k1 a été évincée : relue, elle est recalculée.
    expect(read('k1')).toBe('value:k1')
    expect(compute).toHaveBeenCalledTimes(10)
    expect(compute).toHaveBeenLastCalledWith('k1')
  })

  it('sans promotion, la plus ancienne clé sort à la 9e', () => {
    const lookup = createKeyedCache<number>()
    const compute = vi.fn(() => 1)
    for (let i = 0; i < 9; i++) lookup(`k${i}`, compute)
    expect(compute).toHaveBeenCalledTimes(9)
    lookup('k8', compute)
    lookup('k1', compute)
    expect(compute).toHaveBeenCalledTimes(9)
    lookup('k0', compute)
    expect(compute).toHaveBeenCalledTimes(10)
  })
})
