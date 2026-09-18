import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  FakeVisualViewport,
  installVisualViewport,
  removeVisualViewport,
} from '@/__tests__/support/visualViewport'
import {
  COMPACT_VIEWPORT_MAX_PX,
  KEYBOARD_HEIGHT_THRESHOLD_PX,
  useMobileKeyboard,
} from './useMobileKeyboard'

/**
 * #79 — `useMobileKeyboard` (jsdom).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CES TESTS PROUVENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Le CÂBLAGE, et rien d'autre : que le hook s'abonne bien à l'objet
 * `visualViewport` présent au montage (`resize` ET `scroll`), qu'il en dérive
 * `keyboardOpen` / `compact` / `availableHeight` / `offsetTop` selon les seuils
 * publiés, qu'il n'émet `onKeyboardShow`/`onKeyboardHide` qu'aux TRANSITIONS, et
 * qu'il est un NO-OP strict sans l'API ou quand il est désarmé.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ILS NE PROUVENT PAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Rien du comportement RÉEL du clavier virtuel. jsdom n'implémente pas
 * `visualViewport` (il est ici STUBBÉ), ne fait aucune mise en page, et aucun
 * moteur ne peut ouvrir un clavier logiciel en test — Playwright pas davantage.
 * Les valeurs de `height`/`offsetTop` injectées ci-dessous sont des postulats sur
 * ce que produisent iOS Safari et Android Chrome, PAS des mesures. La preuve que
 * les champs restent atteignables clavier ouvert ne peut venir que d'un test sur
 * appareil réel (cf. `issue-79-done.md`, section « ce qui n'est pas prouvé »).
 *
 * Le stub DISPATCHE l'événement qu'il est censé émettre : un stub qui muterait la
 * hauteur sans émettre `resize` ferait rougir une implémentation correcte et
 * passer une fausse ([[PIT-S56-002]]).
 */

const LAYOUT_HEIGHT = 844

/** Le stub vit dans `src/__tests__/support` : il sert AUSSI aux tests de composants. */
const installViewport = (vv: FakeVisualViewport | null): void =>
  installVisualViewport(vv, LAYOUT_HEIGHT)

afterEach(() => {
  removeVisualViewport()
  vi.restoreAllMocks()
})

describe('useMobileKeyboard', () => {
  it('est un NO-OP sans `visualViewport` : aucun état, aucun style à poser', () => {
    installViewport(null)
    const onKeyboardShow = vi.fn()
    const { result } = renderHook(() => useMobileKeyboard({ onKeyboardShow }))

    // `availableHeight: null` est le signal EXPLICITE de « non mesuré » : les
    // consommateurs ne posent aucun `max-height` inline dans cet état.
    expect(result.current).toEqual({
      keyboardOpen: false,
      compact: false,
      availableHeight: null,
      offsetTop: 0,
    })
    expect(onKeyboardShow).not.toHaveBeenCalled()
  })

  it('mesure au montage sans attendre un `resize` (remontage clavier déjà ouvert)', async () => {
    installViewport(new FakeVisualViewport(494))
    const onKeyboardShow = vi.fn()
    const { result } = renderHook(() => useMobileKeyboard({ onKeyboardShow }))

    await waitFor(() => expect(result.current.keyboardOpen).toBe(true))
    expect(result.current.availableHeight).toBe(494)
    expect(onKeyboardShow).toHaveBeenCalledTimes(1)
  })

  it('dérive clavier ouvert + aperçu réduit du `resize` de `visualViewport`', async () => {
    const vv = new FakeVisualViewport(LAYOUT_HEIGHT)
    installViewport(vv)
    const onKeyboardShow = vi.fn()
    const onKeyboardHide = vi.fn()
    const { result } = renderHook(() => useMobileKeyboard({ onKeyboardShow, onKeyboardHide }))

    // Portrait, clavier fermé : rien n'est masqué, rien n'est borné.
    await waitFor(() => expect(result.current.availableHeight).toBe(LAYOUT_HEIGHT))
    expect(result.current.keyboardOpen).toBe(false)
    expect(result.current.compact).toBe(false)

    // Clavier ~350 px (iPhone 14 portrait).
    act(() => vv.emit({ height: 494 }))
    await waitFor(() => expect(result.current.keyboardOpen).toBe(true))
    expect(result.current.availableHeight).toBe(494)
    expect(494).toBeLessThan(COMPACT_VIEWPORT_MAX_PX)
    expect(result.current.compact).toBe(true)
    expect(onKeyboardShow).toHaveBeenCalledTimes(1)
    expect(onKeyboardHide).not.toHaveBeenCalled()

    // Fermeture : retour intégral à l'état initial (le consommateur retire son style).
    act(() => vv.emit({ height: LAYOUT_HEIGHT }))
    await waitFor(() => expect(result.current.keyboardOpen).toBe(false))
    expect(result.current.compact).toBe(false)
    expect(onKeyboardHide).toHaveBeenCalledTimes(1)
  })

  it("n'émet les callbacks qu'aux TRANSITIONS, pas à chaque `resize`", async () => {
    const vv = new FakeVisualViewport(LAYOUT_HEIGHT)
    installViewport(vv)
    const onKeyboardShow = vi.fn()
    const onKeyboardHide = vi.fn()
    const { result } = renderHook(() => useMobileKeyboard({ onKeyboardShow, onKeyboardHide }))

    act(() => vv.emit({ height: 494 }))
    await waitFor(() => expect(result.current.keyboardOpen).toBe(true))
    // Rafale typique de l'animation d'ouverture du clavier : la hauteur bouge
    // encore, l'ÉTAT ne change pas → un seul `onKeyboardShow`.
    act(() => vv.emit({ height: 480 }))
    await waitFor(() => expect(result.current.availableHeight).toBe(480))
    act(() => vv.emit({ height: 470 }))
    await waitFor(() => expect(result.current.availableHeight).toBe(470))

    expect(onKeyboardShow).toHaveBeenCalledTimes(1)
    expect(onKeyboardHide).not.toHaveBeenCalled()
  })

  it('applique le seuil STRICTEMENT : un écart égal au seuil ne suffit pas', async () => {
    const vv = new FakeVisualViewport(LAYOUT_HEIGHT)
    installViewport(vv)
    const { result } = renderHook(() => useMobileKeyboard())

    // Barre d'URL rétractable ~ seuil : ne doit PAS déclencher le mode clavier.
    act(() => vv.emit({ height: LAYOUT_HEIGHT - KEYBOARD_HEIGHT_THRESHOLD_PX }))
    await waitFor(() => expect(result.current.availableHeight).toBe(724))
    expect(result.current.keyboardOpen).toBe(false)

    act(() => vv.emit({ height: LAYOUT_HEIGHT - KEYBOARD_HEIGHT_THRESHOLD_PX - 1 }))
    await waitFor(() => expect(result.current.keyboardOpen).toBe(true))
  })

  it("suit `offsetTop` sur l'événement `scroll` (décalage iOS clavier ouvert)", async () => {
    const vv = new FakeVisualViewport(494)
    installViewport(vv)
    const { result } = renderHook(() => useMobileKeyboard())
    await waitFor(() => expect(result.current.keyboardOpen).toBe(true))

    // iOS fait glisser le viewport visuel : `height` est inchangée mais la zone
    // réellement visible commence 30 px plus bas.
    act(() => vv.emit({ offsetTop: 30 }, 'scroll'))
    await waitFor(() => expect(result.current.offsetTop).toBe(30))
    expect(result.current.availableHeight).toBe(464)
  })

  it('désarmé (`enabled: false`) : aucun abonnement, état neutre', async () => {
    const vv = new FakeVisualViewport(494)
    installViewport(vv)
    const addSpy = vi.spyOn(vv, 'addEventListener')
    const onKeyboardShow = vi.fn()
    const { result } = renderHook(() => useMobileKeyboard({ enabled: false, onKeyboardShow }))

    act(() => vv.emit({ height: 300 }))
    await waitFor(() => expect(result.current.availableHeight).toBeNull())
    expect(addSpy).not.toHaveBeenCalled()
    expect(onKeyboardShow).not.toHaveBeenCalled()
  })

  it('se désabonne au démontage (aucun callback après coup)', async () => {
    const vv = new FakeVisualViewport(LAYOUT_HEIGHT)
    installViewport(vv)
    const onKeyboardShow = vi.fn()
    const { unmount } = renderHook(() => useMobileKeyboard({ onKeyboardShow }))

    unmount()
    act(() => vv.emit({ height: 300 }))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    expect(onKeyboardShow).not.toHaveBeenCalled()
  })
})
