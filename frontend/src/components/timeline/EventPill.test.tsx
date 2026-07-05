import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EventPill } from './EventPill'
import { makePositionedEvent } from './fixtures'
import { INK_DARK, INK_LIGHT } from '@/lib/color'

/**
 * #192 — Tests de rendu EventPill. Composant présentation pur (aucune dep
 * next-intl/auth). On vérifie : data-testid/attrs préservés (dépendance E2E
 * #163), positionnement px, callback de sélection, et l'encre calculée par
 * contraste WCAG (BR-EVE-009 : pas de blanc hardcodé sur fond clair).
 */
describe('EventPill', () => {
  it('rend le titre et préserve data-testid + data-event-title', () => {
    render(
      <EventPill
        event={makePositionedEvent({ title: 'Péremption lait' })}
        ariaLabel="label a11y"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveAttribute('data-event-title', 'Péremption lait')
    expect(pill).toHaveTextContent('Péremption lait')
  })

  it('expose le label a11y fourni', () => {
    render(
      <EventPill
        event={makePositionedEvent()}
        ariaLabel="Péremption, à venir"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('timeline-event')).toHaveAttribute('aria-label', 'Péremption, à venir')
  })

  it('positionne la pastille via leftPx/widthPx', () => {
    render(
      <EventPill
        event={makePositionedEvent({ leftPx: 80, widthPx: 200 })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.left).toBe('80px')
    expect(pill.style.width).toBe('200px')
  })

  it('appelle onSelect avec l’event au clic', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const event = makePositionedEvent({ id: 'e42' })
    render(<EventPill event={event} ariaLabel="x" onSelect={onSelect} />)
    await user.click(screen.getByTestId('timeline-event'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(event)
  })

  it('calcule une encre foncée sur fond clair (BR-EVE-009, pas de blanc hardcodé)', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#A7B83A' })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_DARK)
  })

  it('calcule une encre claire sur fond foncé', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#0B0C0E' })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_LIGHT)
  })
})
