# Audit tests — Sprint 28

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR.
> Thème : Couverture E2E Produits/Catégories + fiabilité CI tests. Cohésion 0.68.

## Couverture par BR / issue

| BR / Issue | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E spec | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-PRO-006 (#124) | Listing produits filtré `user_id` en SQL indexé | NON | ✅ | ✅ | ⚠ N/A | — | — |
| BR-PROD-001 (#41) | Produit sans événement visible (`events: []`) | NON | ✅ | ✅ | ⚠ N/A | ✅¹ | — |
| #207 | Scope `e2e` de test-quiet.sh lance Playwright | NON (outillage) | ⚠ N/A | ⚠ N/A | ✅² | — | — |
| #133 | Scope `frontend` de test-quiet.sh lance vitest + CI | NON (outillage) | ⚠ N/A | ⚠ N/A | ✅² | — | — |
| #218 | Parcours Produits/Catégories (CRUD + réassignation) | OUI | — | — | — | ✅¹ | ✅ vert CI³ |

¹ Spec Playwright écrite + listée (`playwright test --list` → 7/7, compilation OK).
² Validé via run réel : vitest 383/383, exit code propagé (shim), `e2e`→`npm run test:e2e` confirmé par dry-run.
³ Run live impossible dans la session (port `:3000` occupé par un serveur étranger), MAIS **exécuté en CI GitHub Actions (full-stack) : vert**. 1er run CI rouge (2 tests catégories, sélecteurs texte devinés) → fix `b2b304a` (data-testid `DeleteConfirmDialog` + rewire specs) → 2e run CI **e2e pass** (25 tests, 0 fail). Coverage E2E prouvée verte.

Cross-system flow=OUI pour #218 (réassignation catégorie = frontend + backend + DB). E2E métier authored ET vert en CI. Aucune ligne `[MISSING]`.

## Tests créés / modifiés
- `backend/.../application/services/ProductServiceImplTest.java` (+2 : délégation `findByUserId`, produit sans event `events=[]`).
- `backend/.../infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` (+4 Postgres/Testcontainers : filtre par user, produit sans event visible, préchargement events, archived exclus).
- `frontend/e2e/categories.spec.ts` (4 scénarios — critères #218 1-4, dont réassignation).
- `frontend/e2e/products.spec.ts` (3 scénarios — critères #218 5-7).
- `frontend/e2e/support/products.ts`, `support/accounts.ts` (helpers seed + compte fixe PROD storageState).

## Résultats runs (branche sprint/28, HEAD, test-runner Phase 6)
- Backend (JUnit/Testcontainers) : **301 tests, 301 passed, 0 failed**.
- Frontend (vitest) : **383 tests, 383 passed, 0 failed** (6 warnings a11y DialogContent Description, non bloquants).
- E2E (Playwright, **CI full-stack**) : **e2e job VERT** (25 tests pass, 0 fail, 1 flaky golden-path préexistant passé au retry). 1er run rouge (2 tests catégories) réparé par `b2b304a`.
- Outillage test-quiet.sh : scopes `frontend`/`e2e` dissociés, non-régression, exit code propagé.

## Conclusion
Suites unitaires + intégration + E2E **VERTES** (backend 301, frontend 383, e2e CI pass). Coverage E2E des parcours Produits/Catégories authored ET exécutée verte en CI (7 scénarios #218 + golden-path). Aucun `[MISSING]`.

**Prêt pour merge.** CI 4/4 verte (backend, frontend, e2e, security). Le fix e2e `b2b304a` a résolu le follow-up RF1 (data-testid `DeleteConfirmDialog`) et le `RECOMMAND_TEST_RUNNER` (specs prouvées vertes en CI).
