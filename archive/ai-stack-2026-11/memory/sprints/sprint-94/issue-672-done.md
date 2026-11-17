# Issue #672 — Les raccourcis de la frise agissent derrière le formulaire de création

**Vague :** 1 | **Taille :** S | **Agent :** fullstack-dev (opus/high)
**Commit :** `1be053a9` — `:bug: fix(timeline): ignorer les raccourcis sous une couche modale (#672)`

## Fichiers

- `frontend/src/components/timeline/TimelineView.tsx` (+42/-2)
- `frontend/src/components/timeline/TimelineView.modal-shortcuts.test.tsx` (+223, nouveau)

## Résumé

Garde `isOverlayLayerOpen()` en tête de `onKey` : toute couche `[role=dialog]` / `[role=alertdialog]`
montée **hors** de `rootRef` suspend `F`/`T`/`+`/`-`/`[`/`]` **et** `Escape`. Les couches montées **dans**
`rootRef` (EventDrawer, sheets) sont exclues de la garde → `T`/`[`/`]` y restent actifs.
La détection est lue **à la frappe** (`useCallback`), pas dérivée d'un état React : ces couches ne
provoquent aucun re-render de `TimelineView`.

## Preuve

- **Avant correctif** : `npx vitest run src/components/timeline/TimelineView.modal-shortcuts.test.tsx`
  → **4 failed / 3 passed**, exit 1. Bug **reproduit** : `F` appelait `requestFullscreen` 2×,
  le zoom passait de `month` à `week`, `scrollLeft` à 588.
- **Après correctif** : `npx vitest run src/components/timeline/ src/components/layout/AppShell.test.tsx src/components/events/`
  → **384 passed / 0 failed**, 23 fichiers, exit 0.
- `npx tsc --noEmit` → exit 0. `npx next lint --file …` → exit 0 (aucun avertissement).
  `npx prettier --check …` → exit 0.
- Toutes les commandes passées par `rtk proxy` (RTK falsifie ces sorties).

## ⚠ Erreur du briefing du lead, corrigée par l'agent

Le briefing affirmait que `[role="dialog"][aria-modal="true"]` ne matcherait **pas** le panneau de
création. **C'est faux** : `frontend/src/components/events/EventFormDrawer.tsx:173-174` pose
`role="dialog"` et `aria-modal="true"` **à la main** (vérifié par le lead après coup). La vérification du
lead n'avait porté que sur `node_modules/@radix-ui/react-dialog` — vrai mais non concluant, puisque la
coque du projet pose l'attribut elle-même.

Le reste de l'analyse tenait : `aria-modal` n'est pas le bon discriminant, parce qu'il ne distingue pas une
couche **superposée** d'une couche **interne** (`EventDrawer` de la frise). Le discriminant retenu est la
**containment DOM** (`!rootRef.current.contains(layer)`).

Autres constats de l'agent :
- `Escape` était **déjà** neutralisé de fait : `useFocusTrap` fait `stopPropagation()` sur `document`,
  donc avant le listener `window`. La garde rend ce comportement explicite.
- Sous jsdom, `isContentEditable` vaut `undefined`, pas `false`.

## Pitfalls rencontrés

- `PIT-S69-001` — hooks mockés plutôt qu'un `QueryClientProvider` (recette reprise de `NewEventDrawer.test.tsx`).
- `PIT-S82-001` — les frappes sont émises depuis `document.activeElement`, pas depuis `window`, sinon le test est vacuous.
- `PIT-S88-010` — message de commit passé par `git commit -F` (le hook `block-destructive` inspecte la ligne Bash entière).

## E2E à écrire en vague 2 (issue #712)

`/fr/timeline` → clic `timeline-new-event` → attendre `shell-new-event-drawer` → le focus-trap place seul
le focus sur `shell-new-event-drawer-close` → `keyboard.press('f' | 't' | '+' | ']')` → asserter :
`shell-new-event-drawer` toujours visible, `timeline-zoom-level` inchangé, `timeline-scroll.scrollLeft`
inchangé, `document.fullscreenElement === null`. Puis fermer le drawer et rejouer les mêmes touches pour
prouver que l'effet revient.

Testids disponibles : `timeline-view`, `timeline-scroll`, `timeline-zoom-level`, `timeline-new-event`,
`shell-new-event-drawer`, `shell-new-event-drawer-close`, `shell-new-event-drawer-product-trigger`,
`timeline-drawer`. **Aucun testid nouveau** ajouté par #672.

## Signaux mémoire

- `[MEMORY:pitfall]` Un briefing peut affirmer qu'un sélecteur ne matche pas alors que le composant pose l'attribut À LA MAIN (`EventFormDrawer:173-174`) : vérifier le `.tsx` de la coque, pas seulement le `node_modules` du primitif Radix.
- `[MEMORY:pattern]` Neutraliser des raccourcis globaux sous une modale : tester la containment DOM dans la ref de la surface (`!root.contains(layer)`), pas la présence d'un attribut ARIA — seule façon de distinguer une couche SUPERPOSÉE d'une couche INTERNE.
- `[MEMORY:decision]` Détection DOM lue à la frappe plutôt qu'état exposé par `CreateEventContext` : couvre aussi `TimelineEditHost`, `ConflictDialog` et toute future modale du shell, sans élargir le contrat du contexte.

## Recommandations suite

RECOMMAND_FOLLOWUP: garde symétrique pour les raccourcis globaux hors frise (aucun autre listener `window keydown` audité ce sprint) [triage XS | domaine events] — pas de RECOMMAND_SECURITY ni RECOMMAND_DB_EXPERT ni RECOMMAND_UI_DESIGN car aucun changement d'auth, de schéma ni de rendu visuel.

STATUS: COMPLETED
