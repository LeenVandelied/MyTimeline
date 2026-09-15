'use client'

import * as React from 'react'
import { Toaster, resolveValue, type ToastType } from 'react-hot-toast'

import { Toast } from '@/components/ui/toast'

/**
 * #621 — HÔTE UNIQUE des toasts de l'application (monté une fois, `app/[locale]/layout.tsx`).
 *
 * ARBITRAGE (dev, 2026-09-15) : react-hot-toast reste le MOTEUR (file, durées, retrait),
 * le RENDU est celui du DS (`ui/toast.tsx`, classes `.mt-toast*`). Il ne subsiste aucun
 * second mécanisme : l'ancien `<Toaster position="top-right" />` rendait le `ToastBar`
 * par défaut de la bibliothèque (hors DS, emoji-icônes animées).
 *
 * API retenue : la prop `children` (render-prop) de `<Toaster>`, et non `toast.custom`
 * ni `useToaster` :
 *   - `toast.custom` imposerait de réécrire les appels existants un par un
 *     (réglages, `apiClient`) — la render-prop, elle, s'applique à TOUS les toasts, donc
 *     `toast.success(msg)` / `toast.error(msg)` continuent de fonctionner tels quels ;
 *   - `useToaster` obligerait à réimplémenter le positionnement, l'empilement et la
 *     pause — et à perdre le conteneur `#_rht_toaster`, que `sprint-77-theme-visual`
 *     masque dans ses captures.
 * La render-prop n'est pas sérialisable : d'où ce composant client, le layout restant
 * un Server Component.
 *
 * APPEL (surfaces métier, #605 compris) : `import toast from 'react-hot-toast'` puis
 * `toast.success(t('…'))`. Variante déduite du type : success → success, error → danger,
 * blank / loading / custom → info. Le message est le TITRE du toast (une ligne, sobre).
 *
 * POSITION — `top-right` à toutes les largeurs :
 *   - le bouton flottant « Nouvel événement » (`AppShell`, `md:hidden`) est ancré en BAS
 *     à droite : un toast en haut ne peut pas le masquer ;
 *   - sous ~372px de viewport le toast (max 340px, `.mt-toast`) occupe la largeur utile,
 *     donc « haut-droite » y équivaut à « haut » : pas de variante mobile à maintenir ;
 *   - décalage haut = 16px (défaut de la bibliothèque) + encoche iOS.
 * NON BLOQUANT : `pointer-events:none` sur le toast. Il ne porte aucune action ; sans
 *   cela il intercepterait pendant 4 s les clics sur ce qu'il recouvre (barre d'outils
 *   de la frise, en-têtes) — gêne utilisateur et rouges intermittents E2E. Contrepartie
 *   assumée : pas de pause au survol.
 * PILE — `--z-toast` (DS) : au-dessus des drawers / sheets / modales, pour qu'une erreur
 *   levée pendant une saisie (`apiClient`) ne soit pas peinte SOUS le drawer ouvert ;
 *   sous la bannière réseau. Voir `ds/tokens/spacing.css`.
 * LECTEURS D'ÉCRAN — `role="status"` (porté par `Toast`) + `aria-live="polite"` explicite.
 */

export type AppToastVariant = 'info' | 'success' | 'danger'

/** Variante DS d'un toast à partir de son type react-hot-toast. */
export function toastVariantOf(type: ToastType): AppToastVariant {
  switch (type) {
    case 'success':
      return 'success'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

/** Style du conteneur `#_rht_toaster` (fusionné APRÈS le style par défaut de la bibliothèque). */
export const TOASTER_CONTAINER_STYLE: React.CSSProperties = {
  zIndex: 'var(--z-toast)',
  top: 'calc(16px + env(safe-area-inset-top, 0px))',
}

/** Durée de lecture : le défaut success (2 s) est trop court pour une phrase ; error = 4 s déjà. */
const SUCCESS_DURATION_MS = 4000

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={TOASTER_CONTAINER_STYLE}
      toastOptions={{ success: { duration: SUCCESS_DURATION_MS } }}
    >
      {(t) => (
        <Toast
          variant={toastVariantOf(t.type)}
          title={resolveValue(t.message, t)}
          aria-live="polite"
          aria-atomic="true"
          data-testid="app-toast"
          data-toast-type={t.type}
          data-visible={t.visible ? 'true' : 'false'}
          style={{
            opacity: t.visible ? 1 : 0,
            transition: 'opacity var(--dur-micro)',
            pointerEvents: 'none',
          }}
        />
      )}
    </Toaster>
  )
}

export default AppToaster
