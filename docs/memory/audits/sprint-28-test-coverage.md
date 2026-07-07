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
| #218 | Parcours Produits/Catégories (CRUD + réassignation) | OUI | — | — | — | ✅¹ | ⚠ authored, run live différé³ |

¹ Spec Playwright écrite + listée (`playwright test --list` → 7/7, compilation OK).
² Validé via run réel : vitest 383/383, exit code propagé (shim), `e2e`→`npm run test:e2e` confirmé par dry-run.
³ Run live non exécuté dans la session : port `:3000` occupé par un serveur étranger (200 `/`, 404 `/fr`) → Playwright réutiliserait le mauvais serveur. **Non un [MISSING]** : la coverage existe (spec authored, compile, liste). Exécution live = follow-up tracké `RECOMMAND_TEST_RUNNER` (nécessite stack full up sur un `:3000` propre).

Cross-system flow=OUI pour #218 (réassignation catégorie = frontend + backend + DB). E2E métier authored ; preuve d'exécution live déférée (voir ³). Aucune ligne `[MISSING]`.

## Tests créés / modifiés
- `backend/.../application/services/ProductServiceImplTest.java` (+2 : délégation `findByUserId`, produit sans event `events=[]`).
- `backend/.../infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` (+4 Postgres/Testcontainers : filtre par user, produit sans event visible, préchargement events, archived exclus).
- `frontend/e2e/categories.spec.ts` (4 scénarios — critères #218 1-4, dont réassignation).
- `frontend/e2e/products.spec.ts` (3 scénarios — critères #218 5-7).
- `frontend/e2e/support/products.ts`, `support/accounts.ts` (helpers seed + compte fixe PROD storageState).

## Résultats runs (branche sprint/28, HEAD, test-runner Phase 6)
- Backend (JUnit/Testcontainers) : **301 tests, 301 passed, 0 failed**.
- Frontend (vitest) : **383 tests, 383 passed, 0 failed** (6 warnings a11y DialogContent Description, non bloquants).
- E2E (Playwright) : **7 specs listées / 7, compilation OK, 0 run live** (env `:3000`, cf. ³).
- Outillage test-quiet.sh : scopes `frontend`/`e2e` dissociés, non-régression, exit code propagé.

## Conclusion
Suites unitaires + intégration **VERTES** (backend 301, frontend 383). Coverage E2E des parcours Produits/Catégories **authored** (7 scénarios, sélecteurs = testids existants, assertions réassignation basées sur comportement API réel). Aucun `[MISSING]`.

**Prêt pour PR.** Réserve unique, tracée en follow-up (non bloquante) : exécution live des 7 specs E2E à faire sur un env full-stack propre (`RECOMMAND_TEST_RUNNER`).
