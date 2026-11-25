import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { LANE_TRACK_OFFSET_PX, TimelineView } from './TimelineView'
import {
  computeRange,
  cursorDayFromScroll,
  DAY_WIDTH_PX,
  formatHoursPerPx,
  MAX_PX_PER_DAY,
  scrollLeftForCursorDay,
  wheelZoomFactor,
  ZOOM_STEP,
} from './zoom'

/**
 * #593 (revue) — Molette Ctrl de la frise desktop : ancre du curseur purgée à la borne,
 * facteurs regroupés par image, annonce `aria-live` unique par geste.
 *
 * jsdom ne rabat pas `scrollLeft` (stub `scrollTo` de `vitest.setup.ts`) : les positions
 * lues sont celles que la frise écrit, ce qui suffit à vérifier QUELLE ancre elle
 * re-projette. Le rabattement réel vit dans les e2e.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    const full = namespace ? `${namespace}.${key}` : key
    return values ? `${full} ${Object.values(values).join(' ')}` : full
  },
}))

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

const TODAY = new Date(2026, 6, 15)

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

const TOTAL_DAYS = computeRange(EVENTS, TODAY).totalDays

function setup(locale = 'fr-FR') {
  return render(
    <TimelineView events={EVENTS} resources={RESOURCES} locale={locale} today={TODAY} />,
  )
}

function scroller(): HTMLElement {
  return screen.getByTestId('timeline-scroll')
}

/** Échelle peinte : largeur du rail moins la gouttière, rapportée à l'étendue. */
function pxPerDay(): number {
  const rail = scroller().firstElementChild as HTMLElement
  return (parseFloat(rail.style.width) - LANE_TRACK_OFFSET_PX) / TOTAL_DAYS
}

function ctrlWheel(deltaY: number, clientX = 600): void {
  fireEvent.wheel(scroller(), { deltaY, ctrlKey: true, clientX })
}

/** Laisse passer une image (rAF de la molette, de la synchro de défilement). */
async function nextFrame(): Promise<void> {
  await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
}

async function wait(ms: number): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
}

/** Textes successifs de la région `aria-live`, une entrée par mutation observée. */
function recordAnnouncements(): string[] {
  const live = screen.getByTestId('timeline-live-region')
  const seen: string[] = []
  new MutationObserver(() => seen.push(live.textContent ?? '')).observe(live, {
    childList: true,
    characterData: true,
    subtree: true,
  })
  return seen
}

describe('#593 TimelineView — molette Ctrl', () => {
  it('à MAX_PX_PER_DAY, la molette ne laisse pas d’ancre : `-` garde le jour au bord de la piste', async () => {
    const user = userEvent.setup()
    setup()
    for (let i = 0; i < 20 && pxPerDay() < MAX_PX_PER_DAY; i++) {
      ctrlWheel(-100)
      await nextFrame()
    }
    expect(pxPerDay()).toBeCloseTo(MAX_PX_PER_DAY, 6)

    // Cran à la borne : l'échelle ne bouge pas, aucune re-projection ne s'arme.
    ctrlWheel(-100, 900)
    await nextFrame()
    expect(pxPerDay()).toBeCloseTo(MAX_PX_PER_DAY, 6)

    // L'utilisateur défile : le jour au bord de la piste devient 5000 / 384.
    const el = scroller()
    el.scrollLeft = 5000
    fireEvent.scroll(el)
    await nextFrame()
    const anchoredDay = 5000 / MAX_PX_PER_DAY

    await user.keyboard('-')
    const zoomedOut = MAX_PX_PER_DAY / ZOOM_STEP
    expect(pxPerDay()).toBeCloseTo(zoomedOut, 6)
    // #449 : le jour ancré réaffleure l'en-tête, il n'est pas remplacé par le curseur.
    expect(el.scrollLeft / zoomedOut).toBeCloseTo(anchoredDay, 6)
  })

  it('regroupe les facteurs d’une même image en un seul dispatch, ancré au premier événement', async () => {
    setup()
    const el = scroller()
    const f = wheelZoomFactor(-20)
    const start = DAY_WIDTH_PX.month

    // 1er événement de l'image : appliqué tout de suite.
    ctrlWheel(-20)
    expect(pxPerDay()).toBeCloseTo(start * f, 6)

    // Les quatre suivants de la même image attendent, sans changer l'échelle.
    const scrollAtSecond = el.scrollLeft
    const scaleAtSecond = pxPerDay()
    ctrlWheel(-20, 300)
    for (let i = 0; i < 3; i++) {
      ctrlWheel(-20, 900)
      expect(pxPerDay()).toBeCloseTo(start * f, 6)
    }

    // Image suivante : un seul pas, facteurs multipliés, ancre du 2e événement (x = 300).
    await nextFrame()
    const final = start * f ** 5
    expect(pxPerDay()).toBeCloseTo(final, 6)
    const day = cursorDayFromScroll(scrollAtSecond, 300, scaleAtSecond, LANE_TRACK_OFFSET_PX)
    expect(el.scrollLeft).toBeCloseTo(
      scrollLeftForCursorDay(day, 300, final, LANE_TRACK_OFFSET_PX),
      6,
    )
  })

  it('cinq crans Ctrl rapprochés donnent au plus une annonce aria-live', async () => {
    setup()
    const live = screen.getByTestId('timeline-live-region')
    const seen = recordAnnouncements()

    for (let i = 0; i < 5; i++) {
      ctrlWheel(-20)
      await nextFrame()
    }
    // Pendant le geste : rien d'annoncé.
    expect(live.textContent).toBe('')

    await wait(700)
    const announced = seen.filter((text) => text !== '')
    expect(announced).toHaveLength(1)
    expect(live.textContent).toContain('dashboard.timeline.live.zoom')
    expect(live.textContent).toContain(formatHoursPerPx(pxPerDay(), 'fr-FR'))
  })

  it('un changement de langue à échelle égale ne s’annonce pas', async () => {
    const user = userEvent.setup()
    const view = setup('fr-FR')
    const live = screen.getByTestId('timeline-live-region')
    await user.keyboard('+')
    await wait(700)
    expect(live.textContent).toContain('dashboard.timeline.live.zoom')
    const before = live.textContent
    const readout = screen.getByTestId('timeline-zoom-level')
    const readoutFr = readout.textContent

    const seen = recordAnnouncements()
    view.rerender(
      <TimelineView events={EVENTS} resources={RESOURCES} locale="en-US" today={TODAY} />,
    )
    // Prémisse : le libellé de l'échelle a bien changé avec la langue (1,3 → 1.3).
    expect(readout.textContent).not.toBe(readoutFr)
    await wait(700)
    expect(seen).toEqual([])
    expect(live.textContent).toBe(before)
  })
})
