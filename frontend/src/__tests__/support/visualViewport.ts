/**
 * #79 — Stub de `window.visualViewport` pour jsdom (qui ne l'implémente PAS).
 *
 * ⚠ CE QUE CE STUB PERMET, ET SA LIMITE. Il rend le CÂBLAGE de `useMobileKeyboard`
 * observable en test unitaire ; il ne simule EN RIEN un clavier virtuel réel (aucune
 * mise en page, aucune barre d'URL, aucun comportement iOS). Toute conclusion sur
 * l'ergonomie réelle exige un appareil.
 *
 * Il MUTE la géométrie ET ÉMET l'événement correspondant : un stub qui mute sans
 * émettre fait rougir une implémentation correcte (celle qui dérive son état de
 * l'événement) et passer une fausse ([[PIT-S56-002]]).
 */
export class FakeVisualViewport extends EventTarget {
  height: number
  offsetTop: number
  width = 390
  offsetLeft = 0
  pageTop = 0
  pageLeft = 0
  scale = 1

  constructor(height: number, offsetTop = 0) {
    super()
    this.height = height
    this.offsetTop = offsetTop
  }

  emit(next: { height?: number; offsetTop?: number }, type: 'resize' | 'scroll' = 'resize'): void {
    if (next.height !== undefined) this.height = next.height
    if (next.offsetTop !== undefined) this.offsetTop = next.offsetTop
    this.dispatchEvent(new Event(type))
  }
}

/**
 * Installe (ou retire, avec `null`) le viewport visuel simulé et fige
 * `window.innerHeight` — c'est l'ÉCART entre les deux qui vaut « clavier ouvert ».
 */
export function installVisualViewport(vv: FakeVisualViewport | null, layoutHeight = 844): void {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: layoutHeight })
  if (vv === null) {
    removeVisualViewport()
    return
  }
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
}

/** Rend `window.visualViewport` de nouveau ABSENT (état natif de jsdom). */
export function removeVisualViewport(): void {
  delete (window as { visualViewport?: unknown }).visualViewport
}
