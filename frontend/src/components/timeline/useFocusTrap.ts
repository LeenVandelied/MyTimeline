'use client'

import { RefObject, useEffect, useLayoutEffect, useRef } from 'react'

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
 *
 * #858 — `onEscape` n'est PLUS une dépendance de l'effet : il est lu dans une ref
 * au moment de la frappe. Avant, un appelant qui passait une lambda inline
 * (`AccountSection` → `BottomSheet`) rejouait le piège à CHAQUE re-rendu : cleanup
 * (focus rendu au déclencheur) puis focus initial sur le premier focusable (la
 * croix). Mesuré sur la suppression de compte mobile : seul le 1er caractère du
 * username atteignait le champ. Le piège n'est donc installé qu'à l'activation
 * (`active` false → true) ; la stabilité du callback n'est plus exigée des appelants.
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  // Dernier `onEscape` reçu, écrit après le commit (react-hooks 7 interdit l'écriture
  // d'une ref pendant le rendu). Lu seulement dans le handler `keydown`, donc
  // toujours après cette écriture : `useLayoutEffect` suffit (pas de ref enfant à
  // devancer, cf. PAT-S120-002).
  const onEscapeRef = useRef(onEscape)
  useLayoutEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const previousFocus = document.activeElement as HTMLElement | null

    // Focus initial sur le premier focusable du conteneur.
    const first = container?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      // #618 — Échap DÉJÀ consommé par une couche superposée (Radix `DismissableLayer`
      // écoute `document` en CAPTURE et fait `preventDefault()` quand il se ferme :
      // Select ouvert, `DeleteConfirmDialog`, `ConflictDialog`…). Sans cette garde, la
      // même frappe refermait AUSSI le panneau piégé dessous.
      if (e.key === 'Escape' && e.defaultPrevented) return
      const escape = onEscapeRef.current
      if (e.key === 'Escape' && escape) {
        e.stopPropagation()
        escape()
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
  }, [containerRef, active])
}

export default useFocusTrap
