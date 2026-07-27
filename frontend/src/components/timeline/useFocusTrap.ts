'use client'

import { RefObject, useEffect } from 'react'

/**
 * #63 — Focus-trap réutilisable (extrait de la logique inline d'`EventDrawer`).
 *
 * Piège le focus clavier dans `containerRef` tant que `active` est vrai :
 * focus initial sur le premier focusable, boucle Tab/Shift+Tab, restauration du
 * focus sur l'élément déclencheur à la désactivation. Mutualise le pattern entre
 * bottom sheet (#63) et action sheet (#63) — 3e duplication évitée (réserve
 * ui-design). `EventDrawer.tsx` (desktop) n'a PAS été migré au S44 (non-refactor
 * volontaire, éviter toute régression desktop pendant un sprint qui touchait déjà
 * cette zone) — consommateur ajouté au Sprint 46 (#316).
 *
 * #208 (review) — Paramètre OPTIONNEL `onEscape` : mutualise aussi la fermeture
 * clavier Escape (consommé par `MobileDrawer` #83). Défaut no-op → non-cassant
 * pour les consommateurs S19 existants (TimelineBottomSheet, etc.).
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const previousFocus = document.activeElement as HTMLElement | null

    // Focus initial sur le premier focusable du conteneur.
    const first = container?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation()
        onEscape()
        return
      }
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
  }, [containerRef, active, onEscape])
}

export default useFocusTrap
