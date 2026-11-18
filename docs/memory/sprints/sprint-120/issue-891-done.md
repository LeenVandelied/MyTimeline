# Issue #891 — Réactiver les 5 règles react-hooks 7

## Résumé
Mesure de départ (règles activées, React 19) : **89 occurrences** (refs 57, set-state-in-effect 18,
preserve-manual-memoization 6, purity 4, incompatible-library 4 — passées en erreur). Corriger `incompatible-library`
a démasqué 2 `set-state-in-effect` (les composants sautés par le compilateur n'étaient pas analysés plus loin).
Fan-out : volet frise (5 fichiers, 59 occ.) confié à un fullstack-dev (`bbf4cd6f`, briefing
`briefing-891-timeline.md`) ; le reste par le lead (`39e68f19`). Règles réactivées (`504fff6e`) : le bloc qui les
coupait dans `eslint.config.mjs` est supprimé, le preset `core-web-vitals` s'applique tel quel. `eslint .` : 0 problème.

Patrons appliqués :
- `incompatible-library` : `form.watch()` → `useWatch` (EventEditForm, CategoryDrawer, ProductDrawer, SecuritySection).
- `set-state-in-effect` : valeurs client seulement via `useSyncExternalStore` (nouveau `src/hooks/useHydrated.ts`,
  `useMediaQuery`, `useDensity`, `EphemerisLeaf`, `global-not-found-screen`) ; réinitialisation au changement de prop
  ajustée PENDANT le rendu (patron « valeur précédente » : BottomSheet, DeleteConfirmDialog, RestoreProductDialog,
  TimelineBottomSheet, TimelineSidebar, HeaderSection, useEventEditConflict, drawers) ; `useExportFlow` : transitions
  de phase pendant le rendu ; `useMobileKeyboard` : retour à IDLE pendant le rendu.
- `preserve-manual-memoization` : DensityRibbon (useCallback inutiles sur gestionnaires DOM), useEventEditConflict
  (dépendance `userId` exacte), TimelineView.
- `purity` : ProductSparkline (instant de référence figé au montage).
- `refs` (frise) : écritures de refs déplacées en `useLayoutEffect`/`useInsertionEffect`, refs déstructurées avant le
  JSX, cache d'identité du fenêtrage remplacé par un comparateur `React.memo` par contenu (détail : rapport du
  sous-agent, résumé ci-dessous).

Désactivations locales justifiées (3) : `AuthContext` (faux positif : état posé après `await`), `toaster` (remise à zéro
couplée à `target.focus()`), harnais `TimelineView.perf.stories.tsx` (chronométrage par construction).

Écart de comportement assumé : `useMediaQuery` lit la vraie valeur dès le premier rendu d'un montage CLIENT hors
hydratation (navigation, tests) — avant, toujours `false` puis correction en effet. Hydratation inchangée (instantané
serveur `false`).

## Volet frise (retour du fullstack-dev, distillé)
- `useTimelineMobileState` : `trackWidthRef`, `todayLeftPxRef`, `rawOnScrollRef`, `dayWidthRef` écrits en
  `useInsertionEffect` (phase mutation, AVANT l'attach des ref callbacks enfants qui les lisent : centrage initial,
  report à la rotation). `useTimelineViewport` : `stateRef` en `useLayoutEffect`. `TimelineView` : `todayLeftPxRef`/
  `dayWidthRef` en `useLayoutEffect` (lus par l'effet passif de centrage #449) ; `metricsRef` retiré (redondant #351) ;
  `useZoomCache` → `useMemo(source)` ; annonce de sélection détectée au rendu.
- Specs à rejouer citées : timeline, timeline-mobile, sprint-98-mobile-zoom-anchor, sprint-94-mobile-lane-gutter,
  sprint-97-lane-stacking, sprint-105-lane-zebra/fit-shortcut, sprint-108-density-ribbon, sprint-85-timeline-*,
  sprint-117-period-zoom-no-drift, sprint-91-event-pin, golden-path → couvertes par la suite complète (audit).

## Tests
Vitest 2359/2359 sans stderr ; tsc ; `eslint .` 0 problème règles actives. E2E : audit.

## Recommandations suite
- Pas de RECOMMAND_UI_DESIGN : refactor sans changement visuel. Pas de RECOMMAND_SECURITY : AuthContext inchangé
  fonctionnellement (seul un commentaire de désactivation ajouté).

[MEMORY:pitfall] react-hooks/refs 7 : une seule `ref={obj.xRef}` dans le JSX fait traiter tout `obj` comme une ref, et
chaque `obj.y` lu ensuite au rendu est signalé → déstructurer les refs d'un hook avant le JSX.
[MEMORY:pitfall] react-hooks 7 : corriger `incompatible-library` (RHF `watch()`) démasque d'autres erreurs dans le
même composant — le compilateur sautait son analyse. Recompter après chaque règle.
[MEMORY:pattern] Ref callback sur un ENFANT qui doit lire des valeurs fraîches d'un hook du PARENT : écrire ces refs en
`useInsertionEffect` (phase mutation, avant l'attach) ; en `useLayoutEffect` elles seraient celles du commit précédent.
[MEMORY:pattern] Valeur client seulement (matchMedia, localStorage, date du jour, URL) : `useSyncExternalStore` avec
instantané serveur, pas `useState` + `setState` en effet de montage (`useHydrated`).

STATUS: COMPLETED
