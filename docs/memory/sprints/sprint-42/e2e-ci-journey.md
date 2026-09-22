# Sprint 42 — parcours CI E2E (3 itérations) + follow-ups

> Local (non commité — à consolider par /sprint end). L'E2E n'est pas exécutable en local
> (stack :3000/:8080 + Docker down) → **la CI est le seul gate réel**. Budget itératif attendu.

## Itérations e2e (toutes = bugs de SPEC, app verte à chaque run)
| Run | Commit | Résultat | Cause |
|-----|--------|----------|-------|
| 1 | `9db3fa5` | e2e ❌ (2) | (a) `filter({has:[data-field]})` sur attribut porté par la row elle-même (descendant-only) ; (b) clic sur `<input>` caché du Switch DS (opacity:0/width:0) |
| 2 | `e54b5ea` | e2e ❌ (1) | test 1 corrigé. Test archived : réouverture d'un event ARCHIVÉ via la frise → `timeline-event` absent |
| 3 | `f00940b` | **e2e ✅ (4/4 CLEAN)** | `ProductDetailView:59` filtre `!archived` → event archivé masqué de la frise. Assertion « réouverture toggle checked » impossible → remplacée par « frise vide (placeholder) après archivage » |

backend / frontend / security = **verts à TOUS les runs** (le fond n'a jamais été en cause).

## Découverte produit (à arbitrer — follow-up)
**Un event archivé est masqué de la frise (`ProductDetailView.tsx:59 .filter(!archived)`) et n'est
réouvrable/désarchivable par AUCUN parcours UI** (pas de vue « archivés »). Conséquence : le critère
d'origine #232 « toggle pré-rempli à la réouverture » n'est pas vérifiable pour un event archivé.
→ Décision produit requise : soit une vue/filtre « archivés » (ré-édition/désarchivage), soit acter que
« archiver » = terminal côté UI (et documenter). Le test vérifie désormais le comportement réel
(disparition de la frise), la persistance `archived=true` restant assertée via l'API.

## Follow-ups consolidés (pour /sprint end Phase 4)
- **[M | events]** Event archivé non réouvrable/désarchivable via l'UI (pas de vue « archivés »). ↑ ci-dessus.
- **[S | events]** Exécuter/surveiller les 3 specs e2e en CI (fait — vert run 3) ; garder l'œil (concurrence 409 = candidat flaky).
- **[S | infra]** `eslint-plugin-storybook` absent du node_modules worktree (déclaré package.json) → régulariser l'install local / pin CI (`console-error-guard.test.ts`).
- **[XS | timeline]** `onDeleteEvent` mobile (`TimelineActionSheet`) non câblé.
- **[XS | backend]** Pas de rate-limit sur le retry `onKeepMine` (résilience, self-DoS uniquement).
- **[XS | archi]** Revue mainteneur de la freeze-list ArchUnit (`EventMapper→getVersion`, application→infra).

## Statut final /sprint start
PR **#306** `sprint/42 → dev` — **CI 4/4 verte, mergeStateStatus=CLEAN, MERGEABLE**. Prêt pour `/sprint end 42`
(merge = confirmation explicite dev). NON mergé.
