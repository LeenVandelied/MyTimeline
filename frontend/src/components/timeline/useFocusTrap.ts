'use client'

import { RefObject, useEffect } from 'react'

/**
 * #63 — Focus-trap réutilisable (extrait de la logique inline d'`EventDrawer`).
 *
 * Piège le focus clavier dans `containerRef` tant que `active` est vrai :
 * focus initial sur le premier focusable, boucle Tab/Shift+Tab, restauration du
 * focus sur l'élément déclencheur à la désactivation. Mutualise le pattern entre
 * bottom sheet (#63) et action sheet (#63) — 3e duplication évitée (réserve
 * ui-design). `EventDrawer.tsx` (desktop) n'est PAS modifié : garder son
 * comportement intact évite toute régression desktop (dépendance intra-sprint).
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const previousFocus = document.activeElement as HTMLElement | null

    // Focus initial sur le premier focusable du conteneur.
    const first = container?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restaure le focus sur l'élément déclencheur (bloc event / bouton ⋯).
      previousFocus?.focus()
    }
  }, [containerRef, active])
}

export default useFocusTrap
