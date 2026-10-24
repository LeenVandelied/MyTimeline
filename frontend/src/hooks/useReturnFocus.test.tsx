import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReturnFocus } from './useReturnFocus'

/**
 * #836 — Logique PROPRE du hook (capture à l'ouverture, restitution à la fermeture,
 * priorité à l'hôte, cible démontée). Ce test ne simule PAS Radix : que `FocusScope`
 * émette `onOpenAutoFocus` AVANT de déplacer le focus, et que le focus revienne bien au
 * déclencheur, n'est prouvé qu'en E2E réel (`e2e/sprint-113-focus-return.spec.ts`,
 * PIT-S112-002). Les événements sont des `Event` DOM annulables, comme ceux de Radix.
 */

function autoFocusEvent(): Event {
  return new Event('focusScope.autoFocus', { cancelable: true })
}

function mountButton(label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = label
  document.body.appendChild(button)
  return button
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useReturnFocus', () => {
  it('rend le focus à l’élément actif à l’ouverture et annule le défaut Radix', () => {
    const trigger = mountButton('trigger')
    const inside = mountButton('inside')
    const { result } = renderHook(() => useReturnFocus())

    trigger.focus()
    result.current.onOpenAutoFocus(autoFocusEvent())
    inside.focus()

    const close = autoFocusEvent()
    result.current.onCloseAutoFocus(close)

    expect(close.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })

  it('laisse la main à l’hôte qui place le focus lui-même (#700)', () => {
    const trigger = mountButton('trigger')
    const hostTarget = mountButton('host')
    const onClose = vi.fn((event: Event) => {
      event.preventDefault()
      hostTarget.focus()
    })
    const { result } = renderHook(() => useReturnFocus(undefined, onClose))

    trigger.focus()
    result.current.onOpenAutoFocus(autoFocusEvent())
    result.current.onCloseAutoFocus(autoFocusEvent())

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(hostTarget)
  })

  it('relaie onOpenAutoFocus à l’hôte après la capture', () => {
    const trigger = mountButton('trigger')
    const onOpen = vi.fn(() => {
      expect(document.activeElement).toBe(trigger)
    })
    const { result } = renderHook(() => useReturnFocus(onOpen))

    trigger.focus()
    const open = autoFocusEvent()
    result.current.onOpenAutoFocus(open)

    expect(onOpen).toHaveBeenCalledWith(open)
  })

  it('cible démontée pendant l’ouverture : ne touche à rien (défaut Radix)', () => {
    const trigger = mountButton('trigger')
    const { result } = renderHook(() => useReturnFocus())

    trigger.focus()
    result.current.onOpenAutoFocus(autoFocusEvent())
    trigger.remove()

    const close = autoFocusEvent()
    result.current.onCloseAutoFocus(close)

    expect(close.defaultPrevented).toBe(false)
  })

  it('rien d’utile à l’ouverture (focus sur body) : ne touche à rien', () => {
    const { result } = renderHook(() => useReturnFocus())

    ;(document.activeElement as HTMLElement | null)?.blur()
    result.current.onOpenAutoFocus(autoFocusEvent())

    const close = autoFocusEvent()
    result.current.onCloseAutoFocus(close)

    expect(close.defaultPrevented).toBe(false)
  })

  it('une capture ne sert qu’une fois : une fermeture sans ouverture préalable est neutre', () => {
    const trigger = mountButton('trigger')
    const other = mountButton('other')
    const { result } = renderHook(() => useReturnFocus())

    trigger.focus()
    result.current.onOpenAutoFocus(autoFocusEvent())
    result.current.onCloseAutoFocus(autoFocusEvent())

    other.focus()
    const second = autoFocusEvent()
    result.current.onCloseAutoFocus(second)

    expect(second.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(other)
  })
})
