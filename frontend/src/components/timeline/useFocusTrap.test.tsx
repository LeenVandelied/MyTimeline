import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

/**
 * #858 — Le piège n'est installé qu'à l'ACTIVATION, pas à chaque rendu.
 *
 * L'appelant passe volontairement une lambda NOUVELLE à chaque rendu (cas
 * `AccountSection` → `BottomSheet`) : avant le correctif, chaque re-rendu
 * rejouait l'effet (focus rendu au déclencheur, puis focus initial sur le 1er
 * focusable du panneau).
 */
function Harness({
  active,
  onEscape,
  tick = 0,
}: {
  active: boolean
  onEscape?: () => void
  tick?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Lambda inline : identité différente à chaque rendu.
  useFocusTrap(panelRef, active, onEscape ? () => onEscape() : undefined)
  return (
    <>
      <button type="button" data-testid="trigger">
        déclencheur
      </button>
      {active ? (
        <div ref={panelRef} data-testid="panel" data-tick={tick}>
          <button type="button" data-testid="first">
            premier
          </button>
          <input data-testid="field" />
          <button type="button" data-testid="last">
            dernier
          </button>
        </div>
      ) : null}
    </>
  )
}

function keydownListenerCount(spy: { mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> } }) {
  return spy.mock.calls.filter((args) => args[0] === 'keydown').length
}

describe('useFocusTrap (#858)', () => {
  afterEach(() => vi.restoreAllMocks())

  it("n'installe le piège qu'une fois par ouverture malgré un onEscape inline", () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const onEscape = vi.fn()
    const { rerender } = render(<Harness active={false} onEscape={onEscape} />)
    screen.getByTestId('trigger').focus()

    rerender(<Harness active onEscape={onEscape} />)
    expect(keydownListenerCount(addSpy)).toBe(1)
    expect(document.activeElement).toBe(screen.getByTestId('first'))

    // L'utilisateur se place dans le champ, puis le parent re-rend 3 fois.
    const field = screen.getByTestId('field')
    field.focus()
    for (let tick = 1; tick <= 3; tick += 1) {
      rerender(<Harness active onEscape={onEscape} tick={tick} />)
      expect(document.activeElement).toBe(field)
    }
    expect(keydownListenerCount(addSpy)).toBe(1)
    expect(keydownListenerCount(removeSpy)).toBe(0)
  })

  it('Escape appelle le DERNIER onEscape reçu', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const { rerender } = render(<Harness active onEscape={first} />)
    rerender(<Harness active onEscape={latest} tick={1} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(latest).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it("Escape déjà consommé par une couche superposée n'appelle pas onEscape (#618)", () => {
    const onEscape = vi.fn()
    render(<Harness active onEscape={onEscape} />)
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('sans onEscape, Escape ne fait rien et ne stoppe pas la propagation', () => {
    const outer = vi.fn()
    window.addEventListener('keydown', outer)
    try {
      render(<Harness active />)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(outer).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('keydown', outer)
    }
  })

  it('Tab boucle du dernier au premier, Shift+Tab du premier au dernier', () => {
    render(<Harness active />)
    const firstEl = screen.getByTestId('first')
    const lastEl = screen.getByTestId('last')

    lastEl.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(firstEl)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastEl)
  })

  it('restaure le focus sur le déclencheur à la désactivation', () => {
    const { rerender } = render(<Harness active={false} />)
    const trigger = screen.getByTestId('trigger')
    trigger.focus()
    rerender(<Harness active />)
    expect(document.activeElement).toBe(screen.getByTestId('first'))

    rerender(<Harness active={false} />)
    expect(document.activeElement).toBe(trigger)
  })

  it('ramène dans le panneau un Tab parti de body (élément focusé démonté)', () => {
    const { rerender } = render(<Harness active={false} />)
    rerender(<Harness active />)
    const firstEl = screen.getByTestId('first')
    const lastEl = screen.getByTestId('last')

    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(firstEl)
    ;(document.activeElement as HTMLElement).blur()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastEl)
  })
})
