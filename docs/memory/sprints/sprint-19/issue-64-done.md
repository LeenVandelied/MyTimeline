# Issue #64 — Vue Timeline mobile paysage

**Statut :** COMPLETED
**Vague :** V2 (dépend #63)
**Commit :** ac935f8eea33dbb9a4d004b1e2b8c69a3ffdcffe
**Ancestry vérifiée :** ac935f8 → a0a94f1 (fix #192) → 962e6b7 (#63) → 5fd7fcd (#192). Pas de clobber (worktree guard renforcé appliqué avec succès).

## Résumé
Variante paysage `TimelineMobileLandscape` dérivée du portrait #63 : lanes denses (CSS scoped `.mt-tlm--landscape` dérivant `--lane-height`/`--ruler-height`, hitbox `::before` ≥44px préservée). Détail = **drawer latéral droit** (`TimelineLandscapeDrawer`, réutilise `.mt-drawer` + `useFocusTrap` + Escape + close 44px) AU LIEU du bottom sheet. Minimap masquable : forcée si `max-height<400px` + toggle utilisateur (`aria-pressed`, disabled si forcé).
Switch dans `TimelineResponsive` : paysage = `orientation:landscape AND max-height:600px` > portrait > desktop.

## Transition sans perte d'état (point clé)
État HISSÉ dans `TimelineResponsive` (`useTimelineMobileState` + nouveaux `useTimelineMobileSelection` + `useTimelineMobileGestures`), partagé aux 2 variantes. La rotation démonte la variante mais PAS le hook d'état → scroll/zoom/sélection conservés. Vérifié par 2 tests (portrait→paysage conserve zoom+sélection ; paysage→portrait ferme drawer + rouvre bottom sheet avec event).

## Fichiers clés
- `TimelineMobileLandscape.tsx`, `TimelineLandscapeDrawer.tsx`, `useTimelineMobileSelection.ts`, `useTimelineMobileGestures.ts` (nouveaux)
- `TimelineResponsive.tsx` (branche paysage + état hissé), `TimelineMobilePortrait.tsx` (refactor pour consommer hooks hissés), `timeline.css` (+36 paysage), `index.ts` (barrel), `public/locales/*/dashboard.json` (+toggle)
- 14 fichiers, staged précis (pas de `git add -A`).

## data-testid préservés
OUI — `timeline-event` + `data-event-title` en paysage (test dédié).

## Tests
64/64 timeline verts (portrait, desktop TimelineView, zoom, EventPill, paysage). tsc 0, eslint 0. 1 test portrait #63 ajusté (matcher matchMedia ciblé portrait — sinon `matches:true` global rendrait paysage ; intent préservé).

## [MEMORY:*] signaux
- **[MEMORY:decision]** Transition sans perte d'état : hisser `useTimelineMobileState`/selection/gestures dans `TimelineResponsive`, passés aux 2 variantes en props optionnelles. Sinon la rotation démonte la variante et perd scroll/zoom/sélection.
- **[MEMORY:decision]** Breakpoints paysage : `MOBILE_LANDSCAPE = orientation:landscape AND max-height:600px` ; `MINIMAP_HIDE = max-height:400px`. Distingue mobile retourné d'un iPad Pro paysage (~1024px → reste desktop). Aucun token `--bp-*` (cohérent réserve ui-design + DEC #63 → candidat futur token `--bp-*`).
- **[MEMORY:pattern]** Tester la rotation `matchMedia` : mock stockant les listeners par query + `rotate()` qui ré-évalue et émet `'change'` dans `act()`. Anti-pattern : `rerender` avec un nouveau mock global (démonte l'état, invalide le test de transition).

## Recommandations suite
- **RECOMMAND_FOLLOWUP** : story Storybook paysage (`TimelineMobileLandscape.stories.tsx`) + spec E2E Playwright rotation (frontend/e2e vide) non couverts (hors scope tests inline Vitest). [triage S | domaine events]
- Câblage service `onEdit`/`onDelete` (ownership BR-EVE-001) reste optionnel/parent comme #63 (parité desktop).

STATUS: COMPLETED
