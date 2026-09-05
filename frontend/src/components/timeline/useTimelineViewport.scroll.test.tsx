import { act, renderHook } from '@testing-library/react'
import { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimelineViewport } from './useTimelineViewport'

/**
 * #351 (défaut 2) — L'écouteur `scroll` était posé en capture sur `window` sans
 * aucun filtre : il se déclenchait pour TOUT élément défilant de l'application
 * (dialogue, tiroir, liste de réglages) dès qu'une frise était montée, chaque
 * déclenchement programmant une `requestAnimationFrame` + une lecture de layout.
 *
 * Ces tests établissent les deux moitiés du contrat :
 *  - le bruit est filtré (un scroller SANS lien avec la frise ne planifie rien) ;
 *  - RIEN N'EST PERDU — c'est le risque de régression nommé par l'issue : la
 *    frise se déplace aussi quand la PAGE défile ou quand un ANCÊTRE défilant
 *    (tiroir, plein écran) la translate, sans qu'elle défile elle-même.
 *
 * Observable choisi : le nombre d'appels à `requestAnimationFrame`, qui est
 * exactement le « travail inutile » que l'issue demande de supprimer.
 */
describe('useTimelineViewport — ciblage de l’écouteur de défilement (#351)', () => {
  let drawer: HTMLDivElement // ancêtre défilant de la frise (tiroir / plein écran)
  let scrollEl: HTMLDivElement // le scroller horizontal de la frise
  let railEl: HTMLDivElement
  let unrelated: HTMLDivElement // scroller SANS lien avec la frise

  // Refs STABLES entre les rendus : le hook mémoïse `sync` sur leur identité,
  // en recréer à chaque rendu réarmerait l'effet et fausserait le comptage.
  let scrollRef: RefObject<HTMLDivElement | null>
  let railRef: RefObject<HTMLDivElement | null>

  const makeRafSpy = () =>
    vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })
  let raf: ReturnType<typeof makeRafSpy>

  const mount = () => renderHook(() => useTimelineViewport(scrollRef, railRef, 'geometry'))

  const scrollOn = (target: EventTarget) => {
    act(() => {
      target.dispatchEvent(new Event('scroll'))
    })
  }

  beforeEach(() => {
    drawer = document.createElement('div')
    scrollEl = document.createElement('div')
    railEl = document.createElement('div')
    unrelated = document.createElement('div')
    scrollEl.appendChild(railEl)
    drawer.appendChild(scrollEl)
    document.body.append(drawer, unrelated)
    scrollRef = { current: scrollEl }
    railRef = { current: railEl }

    // Exécution synchrone de la frame : `schedule` se réarme, ce qui permet de
    // compter plusieurs déclenchements successifs dans un même test.
    raf = makeRafSpy()
  })

  afterEach(() => {
    raf.mockRestore()
    document.body.replaceChildren()
  })

  it('planifie une mesure quand le scroller de la frise défile', () => {
    mount()
    raf.mockClear()

    scrollOn(scrollEl)

    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('NE planifie RIEN quand un tiroir/dialogue sans lien avec la frise défile', () => {
    mount()
    raf.mockClear()

    scrollOn(unrelated)
    scrollOn(unrelated)
    scrollOn(unrelated)

    expect(raf).not.toHaveBeenCalled()
  })

  it('planifie une mesure quand la PAGE défile (cible `document`)', () => {
    mount()
    raf.mockClear()

    scrollOn(document)

    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('planifie une mesure quand un ANCÊTRE défilant translate la frise (tiroir, plein écran)', () => {
    // Risque de régression explicitement nommé par l'issue : un ciblage naïf sur
    // `scrollEl` seul perdrait cet événement et figerait la bande verticale.
    mount()
    raf.mockClear()

    scrollOn(drawer)

    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('retire l’écouteur au démontage (aucune fuite)', () => {
    const { unmount } = mount()
    unmount()
    raf.mockClear()

    scrollOn(scrollEl)
    scrollOn(document)

    expect(raf).not.toHaveBeenCalled()
  })
})
