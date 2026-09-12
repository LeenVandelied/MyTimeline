# DONE — #207 + #133 (fusionnées) — test-quiet.sh scopes vitest vs Playwright

commits: [da745b8]

resume:
- Fichier modifié: `scripts/test-quiet.sh` uniquement.
- Bug #207: scopes `e2e` ET `frontend` retombaient tous deux sur `run_frontend()` -> `npm test` (Vitest). Playwright jamais lancé.
- Fix: `run_frontend()` = scope `frontend` -> `npm test` (=vitest run). Nouvelle `run_e2e()` = scope `e2e` -> `npm run test:e2e` (Playwright). `case` dissocié (`frontend)` / `e2e)` séparés).
- `all` = backend + frontend unit (E2E EXCLU volontairement: nécessite stack complète up).
- Exit code Vitest/Playwright propagé (capture `|| status=$?` + `return`). Skip explicite conservé (grep `"test"` / `"test:e2e"` dans package.json).
- Docstring d'en-tête réécrite (frontend=Vitest, e2e=Playwright).
- CI `.github/workflows/ci.yml` DÉJÀ correcte (aucune modif requise): job `frontend` l.88 `npm run test` (Vitest full), job `e2e` l.218 `npm run test:e2e` (Playwright full-stack Postgres+backend+front). Vérifié conforme aux critères #133.

tests:
- RÉEL `./scripts/test-quiet.sh frontend` -> Vitest 54 fichiers / 383 tests passed, exit 0. (context-pack disait 12 tests — PÉRIMÉ, réel=383).
- Dry-run shim npm (PATH) `e2e` -> capture exacte `npm run test:e2e`, exit 0. `frontend` -> `npm test --silent`. Bon aiguillage confirmé.
- Propagation échec (shim exit 3): `frontend`->EXIT=3, `e2e`->EXIT=3. OK.
- Playwright réel NON lancé localement (navigateurs/stack absents) — pas de faux vert. La CI job `e2e` lève la stack complète.

[MEMORY:pitfall] Context: test-quiet.sh scope `e2e` aliasé sur Vitest -> E2E jamais exécutés (faux vert silencieux depuis création). Solution: 1 fonction par runner, jamais partager un case-arm entre scopes de nature différente. Prevention: valider l'aiguillage réel via shim npm en PATH (dry-run), pas seulement la lecture du code.

[MEMORY:business-rule] context-pack cp-frontend PÉRIMÉ: dit `frontend/e2e/` VIDE + 12 tests. Réel: e2e/ contient golden-path + 6 specs settings; 383 tests Vitest. À resync.

recommandations suite:
- #218 (specs Playwright Vague 2): DÉBLOQUÉ. `./scripts/test-quiet.sh e2e` invoque désormais réellement `npm run test:e2e`. Note: e2e/ contient déjà des specs (golden-path.spec.ts + settings-*.spec.ts) — le context-pack les ignorait. Env local requiert `npx playwright install` + stack up; la CI (job `e2e`) le fournit déjà.
- Pas de RECOMMAND_TEST_RUNNER (validation inline suffisante, suite déjà lancée réellement).
- Pas de RECOMMAND_DB_EXPERT / backend intact.
- RECOMMAND: resync context-pack cp-frontend (e2e non vide, 383 tests).

STATUS: COMPLETED
