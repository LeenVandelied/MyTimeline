'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * #79 — Évitement du clavier virtuel dans les bottom sheets (mobile).
 *
 * PROBLÈME. À l'ouverture du clavier, le viewport VISUEL rétrécit sans que le
 * viewport de MISE EN PAGE bouge (iOS Safari, et Android Chrome en
 * `interactive-widget=resizes-visual`). Un panneau `position:fixed; bottom:0`
 * reste donc ancré au bas du viewport de mise en page, c'est-à-dire DERRIÈRE le
 * clavier : les champs et les boutons d'action deviennent inatteignables.
 *
 * POURQUOI `visualViewport` ET PAS `focus`/`blur`. Un `focus` n'implique pas
 * l'ouverture du clavier (clavier matériel, focus programmatique, `<select>`),
 * et le `blur` n'arrive pas toujours à la fermeture (bouton « Terminé » iOS).
 * Seul `visualViewport` mesure ce qui est RÉELLEMENT visible.
 *
 * CE QUE CE HOOK NE FAIT PAS (décisions Designer #79) : aucun scroll de page,
 * aucun `scrollIntoView`, aucune animation. Il ne fait que MESURER ; c'est
 * l'appelant qui borne la hauteur de son panneau.
 *
 * NO-OP par construction quand `window.visualViewport` est absent (SSR, jsdom,
 * vieux navigateurs) ou quand `enabled` est faux (variante desktop) : l'état
 * reste `IDLE` et aucun écouteur n'est posé.
 *
 * ⚠ TESTABILITÉ. `window.visualViewport` est relu PARESSEUSEMENT à chaque
 * mesure (jamais capturé une fois pour toutes), afin qu'un test puisse
 * substituer l'objet. L'écouteur, lui, est attaché à l'objet présent AU
 * MONTAGE : une simulation doit donc remplacer `window.visualViewport` AVANT
 * que le composant ne se monte, ou déclencher un `resize` sur `window`
 * (également écouté, ce qui couvre aussi les rotations d'écran).
 */

/**
 * Écart (px) entre viewport de mise en page et viewport visuel au-delà duquel on
 * considère le clavier ouvert. 120 px : au-dessus des barres d'URL rétractables
 * (~60-90 px) et très en-dessous d'un clavier réel (~260-350 px).
 */
export const KEYBOARD_HEIGHT_THRESHOLD_PX = 120

/**
 * Hauteur visible (px) sous laquelle le formulaire bascule en aperçu réduit
 * (champs secondaires masqués). 600 px : un iPhone 14 (844) clavier ouvert
 * tombe à ~490, un petit Android (667) à ~330 — les deux passent en réduit,
 * tandis qu'un portrait sans clavier n'y bascule jamais.
 */
export const COMPACT_VIEWPORT_MAX_PX = 600

export interface MobileKeyboardState {
  /** Le clavier virtuel occupe le viewport (écart > `KEYBOARD_HEIGHT_THRESHOLD_PX`). */
  keyboardOpen: boolean
  /** Hauteur visible < `COMPACT_VIEWPORT_MAX_PX` → aperçu réduit. */
  compact: boolean
  /**
   * Hauteur RÉELLEMENT visible (`visualViewport.height - offsetTop`), ou `null`
   * tant que rien n'a été mesuré (hook désactivé / API absente).
   */
  availableHeight: number | null
  /** `visualViewport.offsetTop` : décalage iOS à répercuter sur un `position:fixed`. */
  offsetTop: number
}

export interface UseMobileKeyboardOptions {
  /** Faux → aucun écouteur, état `IDLE` (variante desktop, panneau fermé). */
  enabled?: boolean
  /** Appelé à la TRANSITION fermé → ouvert (jamais à chaque `resize`). */
  onKeyboardShow?: () => void
  /** Appelé à la TRANSITION ouvert → fermé. */
  onKeyboardHide?: () => void
}

const IDLE: MobileKeyboardState = {
  keyboardOpen: false,
  compact: false,
  availableHeight: null,
  offsetTop: 0,
}

const sameState = (a: MobileKeyboardState, b: MobileKeyboardState): boolean =>
  a.keyboardOpen === b.keyboardOpen &&
  a.compact === b.compact &&
  a.availableHeight === b.availableHeight &&
  a.offsetTop === b.offsetTop

export function useMobileKeyboard({
  enabled = true,
  onKeyboardShow,
  onKeyboardHide,
}: UseMobileKeyboardOptions = {}): MobileKeyboardState {
  const [state, setState] = useState<MobileKeyboardState>(IDLE)

  // Callbacks lus par référence : les changer ne doit PAS re-poser les écouteurs
  // (un parent qui recrée ses handlers à chaque rendu ferait sinon un
  // détacher/rattacher par frame).
  const showRef = useRef(onKeyboardShow)
  const hideRef = useRef(onKeyboardHide)
  useEffect(() => {
    showRef.current = onKeyboardShow
    hideRef.current = onKeyboardHide
  })

  useEffect(() => {
    if (!enabled) {
      setState((prev) => (sameState(prev, IDLE) ? prev : IDLE))
      return
    }
    if (typeof window === 'undefined') return
    const viewportAtMount = window.visualViewport
    // NO-OP explicite : pas d'API, pas de mesure, pas de style inline posé.
    if (!viewportAtMount) return

    let frame = 0
    // Drapeau SÉPARÉ de l'identifiant de frame : avec un `requestAnimationFrame`
    // stubbé SYNCHRONE (tests), l'affectation `frame = rAF(...)` a lieu APRÈS
    // l'exécution du callback et laisserait un identifiant non nul en garde — plus
    // aucune mesure ne serait planifiée ensuite.
    let pending = false
    // Mémoire LOCALE de la dernière transition émise : un state React serait relu
    // périmé dans la closure de l'écouteur.
    let lastKeyboardOpen = false

    const measure = () => {
      pending = false
      // Lecture PARESSEUSE (cf. en-tête) : jamais `viewportAtMount`.
      const vv = window.visualViewport
      if (!vv) return
      const offsetTop = vv.offsetTop
      const availableHeight = Math.max(0, vv.height - offsetTop)
      const keyboardOpen = window.innerHeight - vv.height > KEYBOARD_HEIGHT_THRESHOLD_PX
      const next: MobileKeyboardState = {
        keyboardOpen,
        compact: availableHeight < COMPACT_VIEWPORT_MAX_PX,
        availableHeight,
        offsetTop,
      }
      setState((prev) => (sameState(prev, next) ? prev : next))

      if (keyboardOpen !== lastKeyboardOpen) {
        lastKeyboardOpen = keyboardOpen
        if (keyboardOpen) showRef.current?.()
        else hideRef.current?.()
      }
    }

    /**
     * Throttle par `requestAnimationFrame` (et non par timer) : `visualViewport`
     * émet en rafale pendant l'animation d'ouverture du clavier, et chaque mesure
     * écrit un style inline → une mesure par frame au plus, jamais deux reflows
     * dans la même.
     */
    const schedule = () => {
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(measure)
    }

    viewportAtMount.addEventListener('resize', schedule)
    // `scroll` : sur iOS c'est lui (pas `resize`) qui suit `offsetTop` quand la
    // page défile clavier ouvert. Sans ça le panneau se décale.
    viewportAtMount.addEventListener('scroll', schedule)
    // Filet : rotation d'écran, et Android en `resizes-content` (le viewport de
    // mise en page bouge lui aussi).
    window.addEventListener('resize', schedule)

    // Mesure initiale synchrone : un panneau ouvert alors que le clavier l'est
    // déjà (re-montage) doit naître borné, pas après le premier `resize`.
    measure()

    return () => {
      if (pending) window.cancelAnimationFrame(frame)
      viewportAtMount.removeEventListener('resize', schedule)
      viewportAtMount.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [enabled])

  return state
}

export default useMobileKeyboard
