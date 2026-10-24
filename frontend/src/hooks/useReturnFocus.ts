'use client'

import { useCallback, useRef } from 'react'

/**
 * #836 (Sprint 113) — RETOUR DU FOCUS AU DÉCLENCHEUR d'un dialogue Radix CONTRÔLÉ.
 *
 * LE DÉFAUT CORRIGÉ (PIT-S112-001). `DialogContent` modal de Radix Dialog 1.1.6
 * (`node_modules/@radix-ui/react-dialog/dist/index.mjs`, `DialogContentModal`) compose
 * `onCloseAutoFocus` avec un gestionnaire qui fait `event.preventDefault()` puis
 * `context.triggerRef.current?.focus()`. Aucun dialogue du front n'a de `Dialog.Trigger`
 * (tous sont pilotés par `open`) : la ref est NULLE, le focus tombait sur `body`
 * (mesuré : 7 dialogues sur 7 rouges, `e2e/sprint-113-focus-return.spec.ts`).
 *
 * LE MÉCANISME. Le `FocusScope` de Radix (`@radix-ui/react-focus-scope` 1.1.2,
 * `dist/index.mjs`, effet de montage) émet `onMountAutoFocus` — exposé en
 * `onOpenAutoFocus` — AVANT de déplacer le focus dans le dialogue : à cet instant,
 * `document.activeElement` est encore l'élément qui a ouvert le dialogue. On le capture
 * là (et non dans un effet de l'hôte, qui s'exécuterait APRÈS l'autofocus et capturerait
 * le dialogue lui-même), puis on le rend dans `onCloseAutoFocus`.
 *
 * RÈGLES À LA FERMETURE :
 *  - l'hôte passe d'abord (`onCloseAutoFocus` fourni) : s'il a placé le focus lui-même
 *    (`preventDefault`, ex. tiroirs de création #700, PAT-S112-001), on n'y touche pas ;
 *  - cible encore dans le document → focus rendu (sans défilement : elle était déjà à
 *    l'écran à l'ouverture) ;
 *  - cible démontée (ligne archivée, item retiré) ou rien d'utile capturé (`body`,
 *    pointeur sous Safari qui ne focalise pas les boutons) → comportement Radix
 *    inchangé. Un hôte qui connaît un meilleur repli le place via `onCloseAutoFocus`.
 *
 * Utilisé par `DialogContent` (`components/ui/dialog.tsx`) : le wrapper commun aux
 * dialogues du front, donc le correctif s'applique à tous sans câblage par hôte.
 */
export interface ReturnFocusHandlers {
  onOpenAutoFocus: (event: Event) => void
  onCloseAutoFocus: (event: Event) => void
}

export function useReturnFocus(
  onOpenAutoFocus?: (event: Event) => void,
  onCloseAutoFocus?: (event: Event) => void,
): ReturnFocusHandlers {
  const returnTargetRef = useRef<HTMLElement | null>(null)

  const handleOpenAutoFocus = useCallback(
    (event: Event) => {
      const active = document.activeElement
      returnTargetRef.current =
        active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    [onOpenAutoFocus],
  )

  const handleCloseAutoFocus = useCallback(
    (event: Event) => {
      const target = returnTargetRef.current
      returnTargetRef.current = null
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      if (target === null || !target.isConnected) return
      event.preventDefault()
      target.focus({ preventScroll: true })
    },
    [onCloseAutoFocus],
  )

  return { onOpenAutoFocus: handleOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus }
}
