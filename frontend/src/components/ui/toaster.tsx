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
 *   - RECOUVREMENTS RÉSIDUELS — ARBITRÉS ET ACCEPTÉS (#714, arbitrage Designer S95).
 *     Aucun décalage fixe ne les dégage, et l'ancrage contextuel est ÉCARTÉ ; la position
 *     et `TOASTER_TOP_OFFSET` restent donc INCHANGÉS. Deux cas : (i) la croix du
 *     `ProductDrawer` en bottom sheet mobile ; (ii) le contenu EN FLUX (barre d'outils de
 *     la frise, haut du corps d'un drawer formulaire ouvert — seul un toast d'ERREUR s'y
 *     affiche, les succès partent après fermeture). Le pied d'action d'un drawer, en bas,
 *     n'est jamais atteint.
 *     ⚠ GÉOMÉTRIE DU CAS (i) — CORRIGÉE PAR LA MESURE (#714). La note du S92 le situait
 *     « à ≈ 84–100px à 844px de haut quand le formulaire remplit la sheet » : les deux
 *     moitiés de cette phrase sont FAUSSES, et l'écart n'est pas anodin puisque c'est le
 *     cas sur lequel l'arbitrage portait.
 *       · Le formulaire ne REMPLIT PAS la sheet à 844px. Le contenu du drawer de création
 *         mesure ≈ 672px ; `max-h-[92vh]` vaut 776px à cette hauteur, donc le plafond
 *         n'est jamais atteint, la sheet se dimensionne à son contenu et démarre à
 *         ≈ 170px. La croix tombe à ≈ 188px, soit 50px SOUS la carte : à 390×844 le
 *         recouvrement est NUL. La sheet ne se fait clamper qu'en dessous de ≈ 730px de
 *         viewport (0,92·H < 672).
 *       · La carte ne fait pas ≈ 46px : le message d'erreur se replie sur deux lignes, la
 *         carte mesure ≈ 65px — bande ≈ 72–137px.
 *       · Le recouvrement EXISTE, mais sur les viewports COURTS. Pire cas mesuré à
 *         390×740 (sheet libre démarrant à 67px) : la croix, 84–100px, est ENTIÈREMENT
 *         dans la bande. À 390×667 la sheet est clampée à 92vh et démarre à 53px : croix
 *         70–86px, recouvrement PARTIEL de ≈ 14px.
 *     POURQUOI PAS L'ANCRAGE CONTEXTUEL : le seul signal DOM qui dirait « une couche
 *     modale est ouverte » est le `pointer-events:none` que Radix pose sur `<body>` —
 *     faux ami documenté (PIT-S62-001, ADR-008 § conséquence d'interaction). Il ne
 *     distingue ni la sheet du drawer latéral, ni l'ouverture de la fermeture animée :
 *     un décalage qui en dépendrait sauterait au montage ET au démontage de CHAQUE
 *     couche, pour ne rien dire des popovers portalisés. On échangerait un recouvrement
 *     borné contre une position instable.
 *     POURQUOI C'EST TOLÉRABLE — la sortie utilisateur n'est PAS la croix recouverte :
 *     c'est le tap sur la bande d'overlay Radix (`ui/dialog.tsx`, overlay `fixed inset-0`)
 *     laissée libre en HAUT D'ÉCRAN. Elle va de 0 jusqu'au premier obstacle : le haut de
 *     la sheet, ou le haut de la carte. Comme la carte est à 72px par CONSTRUCTION, ce
 *     ruban existe toujours et est DISJOINT d'elle — 0–67px à 390×740, 0–53px à 390×667,
 *     0–72px à 390×844. C'est ce décalage fixe, et non un hasard de gabarit, qui garantit
 *     la sortie. Cette bande ferme réellement :
 *     ni `onPointerDownOutside`, ni `onInteractOutside`, ni `onEscapeKeyDown` ne sont
 *     interceptés sur `ProductDrawer` / `ui/dialog`, et aucune garde de formulaire sale
 *     ne retient `onOpenChange` (appelé nu). Escape ferme de même.
 *     ⚠ Ce n'est PAS un « swipe-down » : le geste N'EXISTE PAS dans le dépôt (zéro
 *     handler tactile sur `ProductDrawer` / `ui/dialog`, `vaul` absent de `package.json`,
 *     et Radix Dialog n'implémente pas le swipe-to-dismiss). Deux commentaires
 *     l'affirmaient ; corrigés en #714.
 *     BORNE DE DURÉE : un toast d'ERREUR vit 4 s — valeur de la BIBLIOTHÈQUE
 *     (`react-hot-toast/dist/index.js`, `{blank:4e3, error:4e3, success:2e3, …}`), pas
 *     d'un commentaire ; `TOAST_OPTIONS` ne surcharge QUE `success`. Sans bouton fermer
 *     (DEC-S92-002) et sans `hover` tactile pour prolonger la pause, le recouvrement est
 *     BORNÉ dans le temps sans action de l'utilisateur.
 *     ORACLE PEINT (#714) : `e2e/sprint-95-toast-overlap.spec.ts`, sur les TROIS régimes
 *     de hauteur (390×844 non recouvrant, 390×740 pire cas, 390×667 clampé) — borne du
 *     recouvrement mesurée par une assertion ENCADRANTE (elle rougit si la géométrie
 *     dérive dans un sens COMME dans l'autre, pas seulement si elle empire), disjonction
 *     bande/carte, et fermeture par tap sur la bande ALORS QUE le toast est affiché. Si
 *     ce dernier point rougit, c'est CETTE DÉCISION qui tombe — pas le test à ajuster.
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
 *   - PAUSE GLOBALE AU STORE (comportement de la bibliothèque, vérifié dans dist/index.mjs :
 *     action 5 pose UN `pausedAt` pour tout le store, action 6 ajoute la durée de pause à
 *     `pauseDuration` de CHAQUE toast, et l'effet de minuterie ne programme rien tant que
 *     `pausedAt` est défini) : survoler ou focaliser UN toast suspend TOUS les toasts
 *     visibles. VOULU — WCAG 2.2.1 : pendant que l'utilisateur lit un toast, aucun autre ne
 *     doit disparaître sous ses yeux ; tous reprennent ensemble, sans perdre de durée.
 *   - FOCUS : la bibliothèque ne gère pas le focus. La carte visible est `tabIndex=0` (hors
 *     tabulation en sortie) : dernier nœud du `<body>`, elle est atteinte par Tab en fin de
 *     page ou Maj+Tab depuis le début. `focusin`/`focusout` sur la carte tiennent
 *     l'IDENTIFIANT du toast focalisé (`focusedId`) ; l'identifiant du toast survolé
 *     (`hoveredId`) est suivi en parallèle. Un toast n'est « actif » que si son identifiant
 *     figure parmi les toasts `visible`. Un effet réconcilie `(survol actif || focus actif)`
 *     avec `pausedAt` du store (`useToasterStore`) et appelle `useToaster().handlers` — seule
 *     API publique qui suspend (`startPause` = action 5, `endPause` = action 6). La
 *     réconciliation couvre le cas « souris sortie mais focus toujours sur le toast » : la
 *     bibliothèque relance le décompte sur `mouseleave`, l'effet re-suspend aussitôt.
 *   - JAMAIS DE VOL DE FOCUS : aucun `focus()` à l'apparition ; le focus reste sur le
 *     déclencheur (test « ne prend pas le focus »).
 *   - RESTAURATION DU FOCUS : au `focusin` venant de HORS des toasts, `relatedTarget` (l'élément
 *     quitté) est mémorisé ; un passage d'un toast à l'autre le conserve, une sortie du focus
 *     vers la page l'oublie. Si le toast focalisé se retire, le focus est rendu à cet élément
 *     à trois conditions : il est encore dans le document, focusable (ni `:disabled`, ni sous
 *     `inert`/`hidden`), et le focus n'a pas déjà été porté ailleurs (il est encore sur une
 *     carte ou retombé sur `<body>`). Sinon rien : le focus n'est jamais envoyé ailleurs.
 *   - `useToaster(TOAST_OPTIONS)` rejoue l'effet de minuterie de `<Toaster>` : deux
 *     `dismiss` du même id au même instant sont idempotents (action 3), la file de retrait
 *     est dédoublonnée par une `Map`. Les options sont PARTAGÉES (`TOAST_OPTIONS`) : sans
 *     elles, la seconde minuterie fermerait les succès à 2 s (défaut bibliothèque).
 *   - Toast retiré sous le pointeur ou le focus (`toast.dismiss`/`toast.remove`, aucun
 *     `mouseleave`/`focusout`) : dès que SON identifiant quitte les toasts visibles (action 3
 *     `visible:false`, immédiate — sans attendre le démontage `removeDelay` de 1 s), l'état
 *     retombe et la pause est levée, même si d'autres toasts restent affichés. Un booléen
 *     n'aurait retombé qu'avec le dernier toast visible : les survivants restaient en pause.
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

/** Élément encore dans le document et focusable (ni désactivé, ni sous `inert` / `hidden`). */
function canReceiveFocus(el: HTMLElement): boolean {
  return el.isConnected && !el.matches(':disabled') && el.closest('[inert],[hidden]') === null
}

/**
 * Le focus est-il resté « orphelin » du toast (encore sur une carte, ou retombé sur `<body>`
 * après démontage) ? Faux si l'utilisateur l'a déjà porté ailleurs : on ne le reprend pas.
 */
function focusIsOrphaned(): boolean {
  const active = document.activeElement
  return active === null || active === document.body || active.closest(TOAST_SELECTOR) !== null
}

export function AppToaster() {
  const { toasts, pausedAt } = useToasterStore(TOAST_OPTIONS)
  const {
    handlers: { startPause, endPause },
  } = useToaster(TOAST_OPTIONS)
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  /** Élément focalisé AVANT l'entrée du focus dans les toasts (cible de restauration). */
  const returnFocusRef = React.useRef<HTMLElement | null>(null)

  const visibleIds = toasts.filter((t) => t.visible).map((t) => t.id)
  const hoverActive = hoveredId !== null && visibleIds.includes(hoveredId)
  const focusActive = focusedId !== null && visibleIds.includes(focusedId)

  // Toast survolé / focalisé retiré (dismiss, remove) sans `mouseleave` / `focusout` : son
  // identifiant n'est plus parmi les visibles → l'état retombe, même si d'AUTRES toasts restent.
  React.useEffect(() => {
    if (hoveredId !== null && !hoverActive) setHoveredId(null)
  }, [hoveredId, hoverActive])

  React.useEffect(() => {
    if (focusedId === null || focusActive) return
    const target = returnFocusRef.current
    returnFocusRef.current = null
    setFocusedId(null)
    if (target && canReceiveFocus(target) && focusIsOrphaned()) target.focus()
  }, [focusedId, focusActive])

  React.useEffect(() => {
    const wantPause = hoverActive || focusActive
    if (wantPause && pausedAt === undefined) startPause()
    else if (!wantPause && pausedAt !== undefined) endPause()
  }, [hoverActive, focusActive, pausedAt, startPause, endPause])

  const handleFocus = React.useCallback((id: string, event: React.FocusEvent<HTMLDivElement>) => {
    const previous = event.relatedTarget
    // Passage d'un toast à l'autre : on garde la cible mémorisée à l'entrée.
    if (previous instanceof HTMLElement && previous.closest(TOAST_SELECTOR) === null) {
      returnFocusRef.current = previous
    }
    setFocusedId(id)
  }, [])

  const handleBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Element && next.closest(TOAST_SELECTOR)) return
    returnFocusRef.current = null
    setFocusedId(null)
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
          onMouseEnter={() => setHoveredId(t.id)}
          onMouseLeave={() => setHoveredId((current) => (current === t.id ? null : current))}
          onFocus={(event) => handleFocus(t.id, event)}
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
