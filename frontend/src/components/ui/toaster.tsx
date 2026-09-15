'use client'

import * as React from 'react'
import {
  Toaster,
  resolveValue,
  useToaster,
  useToasterStore,
  type DefaultToastOptions,
  type ToastType,
} from 'react-hot-toast'

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
 * POSITION — `top-right` à toutes les largeurs, SOUS la zone des contrôles du haut
 * (arbitrage dev 2026-09-15, conséquence de la pause au survol ci-dessous) :
 *   - le bouton flottant « Nouvel événement » (`AppShell`, `md:hidden`) est ancré en BAS
 *     à droite : un toast en haut ne peut pas le masquer ;
 *   - sous ~372px de viewport le toast (max 340px, `.mt-toast`) occupe la largeur utile,
 *     donc « haut-droite » y équivaut à « haut » : pas de variante mobile à maintenir ;
 *   - décalage haut = `--space-5 + --space-11 + --space-2` (20 + 44 + 8 = 72px) + encoche
 *     iOS. MOTIF : le plus bas des contrôles FIXES du bord haut droit est le bouton fermer
 *     TACTILE d'un drawer (`.mt-drawer__header` padding-top `--space-5`, puis
 *     `.mt-drawer__close--touch` 44px = `--space-11`, `timeline.css`) : il finit à 64px ;
 *     `--space-2` de respiration. La carte (≈46px : padding 12×2 + bordures + titre
 *     13px × `--leading-normal`) occupe donc ≈ 72–118px.
 *   - CONTRÔLES DÉGAGÉS (relevés dans le code, non peints) : bouton fermer des drawers
 *     desktop (`.mt-drawer__close`, cible 44px → 12–56px), fermer tactile du drawer paysage
 *     (20–64px), header mobile du tableau de bord (`h-14` → 0–56px, hamburger `h-11`
 *     → 6–50px), croix du `ProductDrawer` desktop (`ui/dialog`, `top-4` → 16–32px).
 *   - NON DÉGAGÉS (aucune constante ne le peut) : la croix du `ProductDrawer` en bottom
 *     sheet mobile (`max-h-[92vh]` : à ≥ 8vh + 16px, soit ≈ 84–100px à 844px de haut quand
 *     le formulaire remplit la sheet) ; le contenu EN FLUX (barre d'outils de la frise,
 *     haut du corps d'un drawer formulaire ouvert — seul un toast d'ERREUR s'y affiche,
 *     les succès partent après fermeture) ; le pied d'action d'un drawer, en bas, n'est
 *     jamais atteint.
 *
 * PAUSE AU SURVOL ET AU FOCUS (revue Designer #621, arbitrage dev 2026-09-15) — WCAG 2.2.1
 * (durée ajustable) : tant que le pointeur survole un toast OU que le focus clavier est sur
 * un toast, le compte à rebours est suspendu ; il reprend quand les deux cessent. Pas de
 * bouton fermer.
 *   - CAPTATION DU POINTEUR : la CARTE visible est en `pointer-events:auto` (explicite, comme
 *     la règle `> *` que la bibliothèque pose sur la ligne visible) ; le conteneur plein écran
 *     `#_rht_toaster` et la ligne d'empilement restent en `none` (défaut bibliothèque), donc
 *     seule la surface peinte de la carte capte. Une carte en sortie (`visible=false`)
 *     repasse en `none` : un toast qui disparaît ne capte plus rien.
 *   - SURVOL : géré par la bibliothèque — `<Toaster>` pose `onMouseEnter/onMouseLeave` →
 *     `handlers.startPause/endPause` sur `#_rht_toaster` (dist/index.mjs, ligne `Oe=`) ; il
 *     ne se déclenchait jamais tant que la carte était en `pointer-events:none`.
 *   - FOCUS : la bibliothèque ne gère pas le focus. La carte visible est `tabIndex=0` (hors
 *     tabulation en sortie) : dernier nœud du `<body>`, elle est atteinte par Tab en fin de
 *     page ou Maj+Tab depuis le début. `focusin`/`focusout` sur la carte tiennent un état
 *     `focused` ; l'état `hovered` est suivi en parallèle sur la même carte. Un effet
 *     réconcilie `(hovered || focused)` avec `pausedAt` du store (`useToasterStore`) et
 *     appelle `useToaster().handlers` — seule API publique qui suspend (`startPause` =
 *     action 5, `endPause` = action 6, dist/index.mjs l.2). La réconciliation couvre le cas
 *     « souris sortie mais focus toujours sur le toast » : la bibliothèque relance le
 *     décompte sur `mouseleave`, l'effet re-suspend aussitôt.
 *   - JAMAIS DE VOL DE FOCUS : aucun `focus()` à l'apparition ; le focus reste sur le
 *     déclencheur (test « ne prend pas le focus »).
 *   - `useToaster(TOAST_OPTIONS)` rejoue l'effet de minuterie de `<Toaster>` : deux
 *     `dismiss` du même id au même instant sont idempotents (action 3), la file de retrait
 *     est dédoublonnée par une `Map`. Les options sont PARTAGÉES (`TOAST_OPTIONS`) : sans
 *     elles, la seconde minuterie fermerait les succès à 2 s (défaut bibliothèque).
 *   - Toast retiré sous le pointeur ou le focus (aucun `mouseleave`/`focusout`) : dès qu'il
 *     ne reste aucun toast visible, les deux états retombent et la pause est levée — sinon
 *     les toasts suivants ne se fermeraient plus.
 * RECOUVREMENT : la carte capte le pointeur, donc tout contrôle SOUS elle deviendrait
 *   inopérant pendant l'affichage (un clic mettrait le toast en pause). À 16px du haut elle
 *   recouvrait la croix des drawers et le hamburger mobile : d'où le décalage de POSITION
 *   ci-dessus. Oracle peint : `e2e/sprint-92-business-toasts.spec.ts` (intersection des
 *   boîtes carte / croix du drawer / hamburger).
 *
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

/**
 * Décalage haut : padding-top du header de drawer (`--space-5`) + fermer tactile 44px
 * (`--space-11`) + respiration (`--space-2`) = 72px, plus l'encoche. Voir POSITION.
 */
export const TOASTER_TOP_OFFSET =
  'calc(var(--space-5) + var(--space-11) + var(--space-2) + env(safe-area-inset-top, 0px))'

/** Style du conteneur `#_rht_toaster` (fusionné APRÈS le style par défaut de la bibliothèque). */
export const TOASTER_CONTAINER_STYLE: React.CSSProperties = {
  zIndex: 'var(--z-toast)',
  top: TOASTER_TOP_OFFSET,
}

/** Durée de lecture : le défaut success (2 s) est trop court pour une phrase ; error = 4 s déjà. */
const SUCCESS_DURATION_MS = 4000

/** Partagées entre `<Toaster>` et `useToaster` (voir JSDoc : minuterie rejouée). */
const TOAST_OPTIONS: DefaultToastOptions = { success: { duration: SUCCESS_DURATION_MS } }

const TOAST_SELECTOR = '[data-testid="app-toast"]'

export function AppToaster() {
  const { toasts, pausedAt } = useToasterStore(TOAST_OPTIONS)
  const {
    handlers: { startPause, endPause },
  } = useToaster(TOAST_OPTIONS)
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const hasVisible = toasts.some((t) => t.visible)

  React.useEffect(() => {
    if (!hasVisible && (hovered || focused)) {
      setHovered(false)
      setFocused(false)
      return
    }
    const wantPause = hasVisible && (hovered || focused)
    if (wantPause && pausedAt === undefined) startPause()
    else if (!wantPause && pausedAt !== undefined) endPause()
  }, [hasVisible, hovered, focused, pausedAt, startPause, endPause])

  const handleBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Element && next.closest(TOAST_SELECTOR)) return
    setFocused(false)
  }, [])

  return (
    <Toaster
      position="top-right"
      containerStyle={TOASTER_CONTAINER_STYLE}
      toastOptions={TOAST_OPTIONS}
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
          tabIndex={t.visible ? 0 : -1}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          style={{
            opacity: t.visible ? 1 : 0,
            transition: 'opacity var(--dur-micro)',
            pointerEvents: t.visible ? 'auto' : 'none',
          }}
        />
      )}
    </Toaster>
  )
}

export default AppToaster
