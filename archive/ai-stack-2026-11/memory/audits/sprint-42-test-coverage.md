# Audit tests — Sprint 42

> Généré fin de Phase 6 (test-runner indépendant). Un marqueur de couverture manquante bloquerait la Phase 9 PR — aucun présent ici.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Intégration | RTL frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-015 | Édition concurrente → 409 (corps enrichi + check déterministe) | OUI | ✅ `EventServiceImplTest` (stale→409 / aligné→200 / null→skip) | ✅ `EventOptimisticLockConflictIntegrationTest` + `EventPatchAndRecurrenceIntegrationTest` + `GlobalExceptionHandlerOptimisticLockTest` | ✅ `ConflictDialog.test.tsx`, `EventContent.test.tsx`, `EventEditForm.test.tsx` | ✅ `sprint-42-events.spec.ts` (conflit 409 comparatif) | ✅ spec active — **validation CI requise** |
| BR-EVE-013 | `archived` PATCH-only (toggle persisté + pré-rempli) | NON | — | ✅ (via patch integration) | ✅ `EventEditForm.test.tsx` | ✅ `sprint-42-events.spec.ts` (toggle archived) | N/A (mono-système) |

Cross-system flow=OUI pour BR-EVE-015 (2 clients concurrents / contrôle de concurrence). E2E métier présent
(spec active), mais **non exécuté localement** (stack applicative down :3000/:8080, Docker E2E indispo) →
gate d'exécution = **CI post-push**.

## Tests créés / modifiés
- Backend : `EventServiceImplTest` (+3 : stale→409, aligné→200, null→skip), `GlobalExceptionHandlerOptimisticLockTest`
  (contrat 409 enrichi), `EventOptimisticLockConflictIntegrationTest`, `EventPatchAndRecurrenceIntegrationTest`,
  baseline ArchUnit maj (`archunit_store` — nouveau getter boundary `EventMapper.getVersion`).
- Frontend : `ConflictDialog.test.tsx`, `EventContent.test.tsx`, `EventEditForm.test.tsx`,
  `ProductDetailView.test.tsx` (mock `TimelineEditHost`).
- E2E : `frontend/e2e/sprint-42-events.spec.ts` (3 specs actives : conflit 409 keep-mine/take-server + toggle archived).

## Résultats runs (test-runner indépendant, 2026-07-14)
- Backend : **403 / 403 passed**, 0 failed.
- Frontend : **462 / 469 passed** (après refactor review `cd29644`), 0 régression code, 7 skipped,
  **1 ÉCHEC DEP-LOCALE** (`console-error-guard.test.ts` — `eslint-plugin-storybook` absent du node_modules
  worktree ; dep DÉCLARÉE `package.json:73` → verte en CI `npm ci`). PAS une régression de code.
- E2E : 3 specs actives (sur 11 au total), **non exécutées** localement (stack down) → à valider en CI.

## Review batch + corrections
- Reviewer : **PRÊT MERGE** (0 CRITIQUE). 1 MAJEUR (duplication logique 409 dans EventContent) + 2 MINEUR
  → corrigés commit `cd29644` (EventContent consomme `useEventEditConflict`, champ `version` explicite,
  test montage `TimelineEditHost`). Détail : `sprints/sprint-42/review-batch.md` + `review-fixes-done.md`.
- MINEUR surfacé (non auto-corrigé) : entrée frozen ArchUnit `ff7c6079` (mapper→getVersion) — à confirmer en revue mainteneur (mentionné en PR).

## Conclusion
Prêt pour PR. Aucune couverture manquante (aucun marqueur bloquant). Réserve unique : validation E2E déférée à la CI (stack requise) —
`RECOMMAND_TEST_RUNNER` consigné. Le seul échec frontend est un désync de dépendances locales, non bloquant.
