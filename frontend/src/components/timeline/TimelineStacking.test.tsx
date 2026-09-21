import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineView } from './TimelineView'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import { TimelineMobileLandscape } from './TimelineMobileLandscape'
import { LANE_ROW_PITCH_PX } from './lane-layout'

/**
 * #709 — Empilage en rangées sur les TROIS frises (jsdom : aucune mise en page, on
 * vérifie donc la DISPOSITION calculée — rangées, variables CSS, ordre — ; la preuve
 * géométrique « visible et cliquable » est l'E2E `sprint-97-lane-stacking.spec.ts`).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const mk = (
  id: string,
  resourceId: string,
  start: string,
  end: string,
  extra: Partial<FullCalendarEvent['extendedProps']> = {},
): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end,
  allDay: true,
  resourceId,
  color: '#3B62D4',
  extendedProps: {
    productId: resourceId,
    productName: resourceId,
    category: 'Cat',
    type: 'duration',
    ...extra,
  },
})

// Lane `pa` : `a1` et `a2` se chevauchent (10-20 / 15-25 juillet) → deux rangées ;
// `a3` (1er-3 août) reprend la rangée 0. `a2` est une SÉRIE mensuelle : ses fantômes
// doivent suivre la rangée 1. Lane `pb` : un seul événement → une rangée.
const EVENTS: FullCalendarEvent[] = [
  mk('a1', 'pa', '2026-07-10', '2026-07-20'),
  mk('a2', 'pa', '2026-07-15', '2026-07-25', { isRecurring: true, recurrenceUnit: 'MONTH' }),
  mk('a3', 'pa', '2026-08-01', '2026-08-03'),
  mk('b1', 'pb', '2026-07-12', '2026-07-14'),
]
const RESOURCES: Resource[] = [
  { id: 'pa', title: 'Prod A', category: 'Cat' },
  { id: 'pb', title: 'Prod B', category: 'Cat' },
]
const TODAY = new Date(2026, 6, 15)

const laneOf = (title: string) =>
  screen
    .getAllByTestId('timeline-resource-row')
    .find((row) =>
      within(row).queryByText(title, { selector: '[data-testid="timeline-resource-title"]' }),
    )!
const pill = (id: string) =>
  screen
    .getAllByTestId('timeline-event')
    .find((p) => p.getAttribute('data-event-title') === `Event ${id}`)!
const rowVar = (el: Element) => (el as HTMLElement).style.getPropertyValue('--mt-row-y')

describe('#709 empilage — frise desktop', () => {
  function setup() {
    return render(
      <TimelineView events={EVENTS} resources={RESOURCES} locale="fr-FR" today={TODAY} />,
    )
  }

  it('une lane dont des occurrences se chevauchent grandit d’un pas par rangée', () => {
    setup()
    const pitch = LANE_ROW_PITCH_PX.desktop
    const a = laneOf('Prod A')
    expect(a).toHaveAttribute('data-lane-rows', '2')
    expect(a).toHaveAttribute('data-lane-extra', String(pitch))
    expect(a.style.getPropertyValue('--mt-lane-extra')).toBe(`${pitch}px`)
    // Lane mono-rangée : DOM d'avant #709 (aucune variable posée).
    const b = laneOf('Prod B')
    expect(b).toHaveAttribute('data-lane-rows', '1')
    expect(b.style.getPropertyValue('--mt-lane-extra')).toBe('')
  })

  it('chaque occurrence est posée sur SA rangée (première rangée libre)', () => {
    setup()
    expect(rowVar(pill('a1'))).toBe('')
    expect(rowVar(pill('a2'))).toBe(`${LANE_ROW_PITCH_PX.desktop}px`)
    expect(rowVar(pill('a3'))).toBe('')
    expect(rowVar(pill('b1'))).toBe('')
  })

  it('fantômes et connecteur d’une série suivent la rangée de son occurrence réelle', () => {
    const { container } = setup()
    const marks = container.querySelectorAll('[data-recurrence-mark][data-event-id="a2"]')
    expect(marks.length).toBeGreaterThan(1)
    for (const mark of marks) expect(rowVar(mark)).toBe(`${LANE_ROW_PITCH_PX.desktop}px`)
  })

  it('clavier : ↓ passe à la rangée suivante DANS la lane, → suit l’ordre de lecture', async () => {
    const user = userEvent.setup()
    setup()
    pill('a1').focus()
    await user.keyboard('{ArrowRight}')
    // Rangée 0 de la lane A : a1 puis a3 (a2 est en rangée 1).
    expect(pill('a3')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(pill('a2')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(pill('b1')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(pill('a2')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(pill('a1')).toHaveFocus()
    // Un seul arrêt de tabulation (roving) malgré les rangées.
    expect(screen.getAllByTestId('timeline-event').filter((p) => p.tabIndex === 0)).toHaveLength(1)
  })

  it('le roving suit l’ÉVÉNEMENT à travers un changement de zoom (ré-empilage)', async () => {
    const user = userEvent.setup()
    setup()
    pill('a2').focus()
    await user.keyboard('{ArrowUp}') // → a1 (rangée 0)
    await user.keyboard('{ArrowRight}') // → a3
    expect(pill('a3')).toHaveFocus()
    await user.click(screen.getByTestId('timeline-zoom-in'))
    expect(pill('a3')).toHaveAttribute('tabindex', '0')
  })

  it('lane produit repliée : une rangée, aucune hauteur ajoutée', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(within(laneOf('Prod A')).getByTestId('timeline-resource-head'))
    const a = laneOf('Prod A')
    expect(a).toHaveAttribute('data-lane-rows', '1')
    expect(a).toHaveAttribute('data-lane-extra', '0')
  })
})

describe.each([
  ['portrait', TimelineMobilePortrait, LANE_ROW_PITCH_PX.portrait],
  ['paysage', TimelineMobileLandscape, LANE_ROW_PITCH_PX.landscape],
] as const)('#709 empilage — frise mobile %s', (_name, View, pitch) => {
  function setup() {
    return render(<View events={EVENTS} resources={RESOURCES} locale="fr-FR" today={TODAY} />)
  }
  const wrapOf = (id: string) => pill(id).closest('.mt-tlm__evt-wrap')!

  it('lane empilée : hauteur ajoutée = pas de la variante, wrap posé sur sa rangée', () => {
    setup()
    const a = laneOf('Prod A')
    expect(a).toHaveAttribute('data-lane-rows', '2')
    expect(a).toHaveAttribute('data-lane-extra', String(pitch))
    expect(a.style.getPropertyValue('--mt-lane-extra')).toBe(`${pitch}px`)
    expect(rowVar(wrapOf('a1'))).toBe('')
    expect(rowVar(wrapOf('a2'))).toBe(`${pitch}px`)
    expect(laneOf('Prod B')).toHaveAttribute('data-lane-rows', '1')
  })

  it('ordre DOM (= ordre de tabulation) : rangée 0 par date, puis rangée 1', () => {
    setup()
    const order = within(laneOf('Prod A'))
      .getAllByTestId('timeline-event')
      .map((p) => p.getAttribute('data-event-title'))
    expect(order).toEqual(['Event a1', 'Event a3', 'Event a2'])
  })

  it('fantômes de la série suivent sa rangée', () => {
    const { container } = setup()
    const ghosts = container.querySelectorAll('[data-recurrence-mark][data-event-id="a2"]')
    expect(ghosts.length).toBeGreaterThan(1)
    for (const g of ghosts) expect(rowVar(g)).toBe(`${pitch}px`)
  })
})
