# Décisions ui-design — Sprint 66 (pré-implémentation, 2026-09-02)

Deux passes `ui-design` en lecture seule, AVANT chaque fullstack-dev. Les deux specs ont été appliquées
telles quelles (le reviewer l'a vérifié) ; les done.md nient donc `RECOMMAND_UI_DESIGN` à juste titre.

## #455 — déclencheur mobile de création d'événement — APPROUVÉ
- Placement : FAB fixe bas-droite dans `AppShell` (`lg:hidden`), seul point commun aux 4 écrans du groupe
  `(app)` (sous `lg`, seul le dashboard a une chrome mobile). Barre inférieure refusée (pattern hors charte,
  collision `AppFooter` + minimap).
- Spec : `<button>` natif 52×52 (`h-13 w-13`, token `--space-13`), `rounded-xl` (pill réservé), `bg-primary
  text-primary-foreground shadow-lg`, `fixed right-4 bottom-[calc(var(--space-6)+env(safe-area-inset-bottom))]`,
  `z-10` = `--z-sticky` sous `--z-modal` (l'overlay de la sheet recouvre le FAB), `transition-colors` seul.
- A11y : icône seule + `aria-label` = clé existante `shell.newEvent`, `aria-haspopup="dialog"`, focus-visible
  global, restauration du focus par `useFocusTrap`. testid `shell-mobile-new-event-button`. Paysage : idem.
- Refusé : bottom nav, FAB rond, token `--z-fab`, 2e state/drawer, `Button size="icon"` (36 px < 44),
  déclencheur limité au header dashboard.

## #79 — évitement du clavier virtuel — APPROUVÉ
- Redimensionnement : borner `maxHeight` à `vv.height - vv.offsetTop` et poser `top = vv.offsetTop` (iOS)
  en style inline quand le clavier est ouvert ; `undefined` sinon ; aucune transition sur ces propriétés.
- Footer : `.mt-sheet__footer` DS hors `.mt-sheet__body` (`min-height: var(--space-17)` = 68 px), rangée
  d'actions d'`EventEditForm` portalisée via prop opt-in (`footerPortalNode`) ; `BottomSheet` Réglages : slot
  `footer` optionnel.
- Mode réduit (< 600 px) : couleur + récurrence masquées (défauts conservés), produit/titre/type/date
  visibles, sous-titre conservé, récupération en fermant le clavier ; pas appliqué au `BottomSheet` Réglages.
- Détection : `innerHeight - vv.height > 120`, `visualViewport` `resize` (+ `scroll`), rAF ; jamais
  focus/blur, jamais `scrollIntoView`, jamais de scroll de page. Pas d'`aria-live`.
- Oracles E2E acceptés : `data-keyboard="open|closed"`, `data-compact="true"`, `{testId}-footer`.
- Refusé : scroll de page, `scrollIntoView`, nouveau token, disclosure « Plus d'options », plein viewport.
