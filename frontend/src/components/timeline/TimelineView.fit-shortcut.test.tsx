import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { LANE_TRACK_OFFSET_PX, TimelineView } from './TimelineView'
import { computeRange, DAY_WIDTH_PX } from './zoom'

/**
 * #597 — La touche `F` RECADRE la frise sur les événements AFFICHÉS (maquette) ; le
 * plein écran ne s'ouvre plus qu'au bouton `timeline-fullscreen`.
 *
 * Repères (fixture ci-dessous, aujourd'hui = 15/07/2026) : `rangeStart` = 10/06
 * (premier événement − 30 j). Événements aux jours 30 (Cat A, ×2 : 10 et 11/07),
 * 38 (Cat B, 18/07) et 46 (Cat C, 26/07). Viewport de 1000 px → piste utile
 * 1000 − 176 (gouttière) − 40 − 135 (marges #804 `FIT_MARGINS_PX.desktop`) = 649 px.
 * #593 — `F` pose l'échelle CONTINUE idéale : l'étendue remplit la piste utile, l'avance
 * se réduit à la marge de 40 px.
 *  - tout affiché : 16 j → 649 / 16 = 40,5625 px/j ⇒ `scrollLeft` = 30 × 40,5625 − 40
 *    = 1176,875 ;
 *  - Cat C exclue : 8 j → 81,125 px/j ⇒ 30 × 81,125 − 40 = 2393,75.
 * L'échelle se lit sur la largeur du rail (étendue en jours × px/jour + gouttière).
 *
 * ⚠ jsdom ne clampe pas `scrollLeft` et ne mesure rien : la position RÉELLE des
 * pastilles dans le viewport est prouvée par `e2e/sprint-105-fit-shortcut.spec.ts`.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const mk = (id: string, resourceId: string, category: string, start: string) => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId,
  color: '#3B62D4',
  extendedProps: { productId: resourceId, productName: resourceId, category, type: 'single' },
})

const EVENTS: FullCalendarEvent[] = [
  mk('a1', 'pa', 'Cat A', '2026-07-10'),
  mk('a2', 'pa', 'Cat A', '2026-07-11'),
  mk('b1', 'pb', 'Cat B', '2026-07-18'),
  mk('c1', 'pc', 'Cat C', '2026-07-26'),
]
const RESOURCES: Resource[] = [
  { id: 'pa', title: 'Prod A', category: 'Cat A', categoryColor: '#3E8BD6' },
  { id: 'pb', title: 'Prod B', category: 'Cat B', categoryColor: '#4FA459' },
  { id: 'pc', title: 'Prod C', category: 'Cat C', categoryColor: null },
]

const FIT_ALL_SCALE = 649 / 16
const FIT_ALL_PX = 1176.875
const FIT_WITHOUT_C_SCALE = 649 / 8
const FIT_WITHOUT_C_PX = 2393.75
const TOTAL_DAYS = computeRange(EVENTS, new Date(2026, 6, 15)).totalDays

function pxPerDay(): number {
  const rail = screen.getByTestId('timeline-scroll').firstElementChild as HTMLElement
  return (parseFloat(rail.style.width) - LANE_TRACK_OFFSET_PX) / TOTAL_DAYS
}

function setupScreen(events: FullCalendarEvent[] = EVENTS) {
  render(
    <TimelineView
      events={events}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      layout="screen"
    />,
  )
  const scroll = screen.getByTestId('timeline-scroll')
  // jsdom ne mesure rien : sans largeur, `computeFit` rend null et F serait un no-op.
  Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1000 })
  return { scroll }
}

const filterFor = (category: string) =>
  screen
    .getAllByTestId('timeline-sidebar-filter')
    .find((b) => b.getAttribute('data-category') === category)!
const groupHeadFor = (category: string) =>
  screen
    .getAllByTestId('timeline-group-head')
    .find((h) => h.getAttribute('data-category') === category)!

describe('#597 touche F = recadrage', () => {
  it('F recadre (échelle + position) et N’OUVRE PAS le plein écran', async () => {
    const { scroll } = setupScreen()
    expect(pxPerDay()).toBeCloseTo(DAY_WIDTH_PX.month, 6)
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_ALL_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6)
    fireEvent.keyDown(window, { key: 'F' })
    expect(Element.prototype.requestFullscreen).not.toHaveBeenCalled()
  })

  it('le bouton plein écran reste le déclencheur du plein écran', async () => {
    const user = userEvent.setup()
    setupScreen()
    await user.click(screen.getByTestId('timeline-fullscreen'))
    expect(Element.prototype.requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('F deux fois, et F après un défilement manuel : même cadrage ré-appliqué', async () => {
    const { scroll } = setupScreen()
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_ALL_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6)
    // 2e F immédiat : stable.
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6))
    // Défilement manuel, puis F : même échelle, même `offsetDays` — la frise doit
    // pourtant revenir au cadrage (l'effet #392 gardé sur `offsetDays` l'ignorerait).
    scroll.scrollLeft = 0
    fireEvent.scroll(scroll)
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6))
  })

  it('catégorie MASQUÉE : ses événements sont ignorés par le cadrage', async () => {
    const user = userEvent.setup()
    const { scroll } = setupScreen()
    await user.click(filterFor('Cat C'))
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_WITHOUT_C_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_WITHOUT_C_PX, 6)
  })

  it('catégorie REPLIÉE : son résumé est affiché, ses événements comptent', async () => {
    const user = userEvent.setup()
    const { scroll } = setupScreen()
    await user.click(groupHeadFor('Cat C'))
    await waitFor(() => expect(groupHeadFor('Cat C')).toHaveAttribute('aria-expanded', 'false'))
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_ALL_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6)
  })

  it('PRODUIT replié (catégorie dépliée) : sa lane ne peint rien, ses événements sont ignorés', async () => {
    const user = userEvent.setup()
    const { scroll } = setupScreen()
    const heads = screen.getAllByTestId('timeline-resource-head')
    await user.click(heads[2]) // Prod C
    await waitFor(() =>
      expect(screen.getAllByTestId('timeline-resource-head')[2]).toHaveAttribute(
        'aria-expanded',
        'false',
      ),
    )
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_WITHOUT_C_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_WITHOUT_C_PX, 6)
  })

  it('aucun événement affiché (tout masqué) : F ne fait rien', async () => {
    const user = userEvent.setup()
    const { scroll } = setupScreen()
    for (const category of ['Cat A', 'Cat B', 'Cat C']) await user.click(filterFor(category))
    await waitFor(() => expect(screen.queryAllByTestId('timeline-group-head')).toHaveLength(0))
    scroll.scrollLeft = 123
    fireEvent.keyDown(window, { key: 'f' })
    // Laisse passer un rendu éventuel avant de conclure à l'absence d'effet.
    await new Promise((r) => setTimeout(r, 20))
    expect(pxPerDay()).toBeCloseTo(DAY_WIDTH_PX.month, 6)
    expect(scroll.scrollLeft).toBe(123)
  })
})

/**
 * #804 (suite, Sprint 117) — la marge droite du cadrage suit la réserve RÉELLE du libellé
 * du pin de queue. Titre de 44 caractères sur c1 (jour 46) : réserve 11 + 240 = 251 px
 * (plafond `label-reserve.ts`) ⇒ `trailPx` = 251 + 35 = 286 ; piste utile
 * 1000 − 176 − 40 − 286 = 498 px ; 16 j → 31,125 px/j (#593 : échelle continue) ⇒
 * `scrollLeft` = 30 × 31,125 − 40 = 893,75. Avec le seul plancher (135 px) on restait à
 * 40,5625 px/j et le libellé débordait la piste.
 */
describe('#804 (suite) — F : marge droite = réserve réelle du libellé de queue', () => {
  const LONG_TITLE = 'Kfz-Haftpflichtversicherungsbeitragserhöhung'
  const FIT_LONG_TAIL_SCALE = 498 / 16
  const FIT_LONG_TAIL_PX = 893.75

  it('titre long en queue : échelle plus large et avance recalculée', async () => {
    const events = EVENTS.map((e) => (e.id === 'c1' ? { ...e, title: LONG_TITLE } : e))
    const { scroll } = setupScreen(events)
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_LONG_TAIL_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_LONG_TAIL_PX, 6)
  })

  it('titre long hors queue : sans effet (plancher 135 px)', async () => {
    const events = EVENTS.map((e) => (e.id === 'a1' ? { ...e, title: LONG_TITLE } : e))
    const { scroll } = setupScreen(events)
    fireEvent.keyDown(window, { key: 'f' })
    await waitFor(() => expect(pxPerDay()).toBeCloseTo(FIT_ALL_SCALE, 6))
    expect(scroll.scrollLeft).toBeCloseTo(FIT_ALL_PX, 6)
  })
})
