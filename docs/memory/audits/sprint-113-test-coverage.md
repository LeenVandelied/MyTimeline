# Audit tests — Sprint 113

> Généré en fin de Phase 6 (lead, 2026-10-24). Base : `origin/dev` 21326349 → HEAD f558c5c6.

## Couverture par issue / règle

| Issue | Description | Cross-system flow | Unit frontend (Vitest, chaîne réelle) | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| #766 | 403 expliqué inline (édition d'événement, DeleteConfirmDialog) + opt-out du toast global | NON (affichage d'une erreur serveur, un seul rôle) | ✅ TimelineEditHost (PATCH, DELETE mobile/desktop, 500 témoin), ProductDrawer, CategoryDrawer, ProductsListView, ProductDetailView, CategoriesView + témoins sans opt-out qui toastent | ⚠ N/A — un 403 réel exige un accès inter-comptes que l'UI n'expose pas ; couvert en Vitest sur la chaîne réelle (seul l'adaptateur HTTP simulé) | ⚠ N/A |
| #836 | Focus rendu au déclencheur à la fermeture des dialogues | NON | ✅ useReturnFocus (6 tests), repli EventEditForm (2 tests) | ✅ `sprint-113-focus-return.spec.ts` (11 cas réels dont 409 concurrent), `sprint-112-focus-return.spec.ts` desktop + mobile 375×812 (16) | ⚠ N/A |

Mesure avant correctif #836 : 10 rouges sur 11 (focus sur `body`). Non-vacuité #766 prouvée par mutation (catch avalant / opt-out retiré → tests rouges).

## Tests créés / modifiés
- frontend/src/components/timeline/TimelineEditHost.forbidden.test.tsx
- frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx
- frontend/src/hooks/useReturnFocus.test.tsx
- frontend/src/components/EventEditForm.test.tsx (repli de focus, data-reason)
- frontend/e2e/sprint-113-focus-return.spec.ts (nouvelle)
- frontend/e2e/sprint-112-focus-return.spec.ts (boucle desktop + mobile)

## Résultats runs (lead, HEAD f558c5c6)
- Backend : non concerné (0 fichier backend modifié)
- Frontend Vitest : 2301/2301 (175 fichiers) ; tsc 0 ; lint 0 ; format:check 0
- E2E (suite complète contre `next build` + `next start`, backend e2e dédié :8086, `--ignore-snapshots`, darwin) : 648 tests — 638 passed / 1 failed / 8 skipped / 1 did not run (3,8 min)
  - Seul rouge : `sprint-77-theme-visual.spec.ts:620` (armement de comparaison visuelle) — échoue mécaniquement sous `--ignore-snapshots` sur darwin, identique avant correctifs de review ; la CI Linux tranche.
- Coverage testids : aucun nouveau `data-testid` produit (les 4 nouveaux sont des stubs Vitest ; `event-form-error` préexiste sur dev).

## Non vérifié
- Focus après une confirmation RÉUSSIE quand le déclencheur disparaît (archivage/suppression) → focus sur `body` (follow-up).
- Dialogues hors liste (édition TimelineEditHost, EventFormDrawer) : corrigés de fait par DialogContent, non mesurés.
- WebKit/Safari non joué.

## Conclusion
Prêt pour PR.
