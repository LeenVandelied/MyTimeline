# Audit tests — Sprint 12

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR.
> Comptes vérifiés par le lead (re-run direct sur HEAD `c50a341`) — le test-runner
> avait sous-compté (148/60) ; chiffres autoritatifs ci-dessous.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-002 | Recalcul `endDate` au PATCH (fin ≥ début) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-EVE-004 | null-guard `calculateEndDate` → 422 (plus de NPE) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-EVE-006 | `recurrenceUnit` requis si `isRecurring=true` → 400 (create **ET** PATCH) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-PRO-001 | Nom produit borné (create/update avec color) | OUI² | ✅ | ✅ | ✅ | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-PRO-002 | Catégorie obligatoire (résolution + color héritée) | OUI² | ✅ | ✅ | ✅ | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-PRO-009 | PATCH produit partiel (color + clearColor) | OUI² | ✅ | ✅ | ✅ | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-PRO-010 | Ownership catégorie cible (anti cross-tenant) | OUI² | ✅ | ✅ | ⚠ N/A | ⚠ N/A¹ | ⚠ N/A¹ |
| — (refactor #95) | `findEventById` single-hit, plus de printStackTrace | NON | ✅ | — | ⚠ N/A | ⚠ N/A | ⚠ N/A |

¹ **E2E : harness absent du projet** (`frontend/e2e/` = `.gitkeep` vide, aucun runner Playwright réel — gap **pré-existant** documenté, cf. Sprint 11 clôture). Ce n'est PAS une régression du sprint → non bloquant `[MISSING]`. Plan : `/create-e2e` post-merge quand le harness E2E sera monté (dépend du sprint frontend events / #47).

² **Cross-system flow #158 (couleur produit)** = backend persistance + frontend surcharge : couvert par unit backend (`ProductServiceImplTest` create/update color) + intégration (`ProductArchivedFilterIntegrationTest`) + Vitest frontend (`ProductDrawer.test`, `product.test` schémas Zod). Le flux complet POST/PATCH→persist→re-render est testé aux deux bouts (pas d'E2E cross-navigateur faute de harness, cf. ¹).

## Tests créés / modifiés
- `backend/.../RecurrenceExpansionServiceImplTest.java` (BR-EVE, +11 : 52 semaines=52 occ, cap 4000, WEEK/MONTH/YEAR)
- `backend/.../UtilsTest.java` (BR-EVE-004, +7 : null-guard, unités valides/invalides)
- `backend/.../EventServiceImplTest.java` (BR-EVE-002 recalc PATCH +4 ; #95 findEventById single-hit +3, purge 8 stubs stale)
- `backend/.../EventCreationRequest` validation (BR-EVE-006, @AssertTrue)
- `backend/.../ProductServiceImplTest.java` (BR-PRO color, +117 lignes)
- `backend/.../ProductArchivedFilterIntegrationTest.java` (+38 : create endToEnd, corrige version=null CREATE)
- `frontend/.../ProductDrawer.test.tsx` (+87), `frontend/src/types/product.test.ts` (+52), hooks create/update

## Résultats runs (vérifiés lead, HEAD d711ea8 post-correctif review)
- **Backend** : 187 tests, 187 passed, 0 failed, 0 error, 0 skip (`./scripts/test-quiet.sh backend`, Testcontainers Postgres 16, Flyway V1..V9 rejouées). Inclut les 5 tests du correctif BR-EVE-006 PATCH (voir §Revue).
- **Frontend** : 70 tests, 70 passed, 0 failed (`npx vitest run`) + `tsc --noEmit` propre
- **E2E** : aucun (harness absent, gap pré-existant — cf. ¹)

## Revue batch (Phase 7 reviewer) + correctif
- **1 [CRITIQUE] RÉSOLU** : BR-EVE-006 n'était appliquée qu'au CREATE (`@AssertTrue`), pas au PATCH → `PATCH {isRecurring:true}` sur event à `recurrenceUnit=null` persistait un état incohérent sans 400. Correctif `d711ea8` : garde au niveau service sur l'état fusionné de l'entité (`EventServiceImpl.updateEvent`) → nouvelle `RecurrenceUnitRequiredException` → 400 via `GlobalExceptionHandler`. +5 tests (unit + intégration), dont non-régression « PATCH isRecurring=true avec recurrenceUnit déjà en base → 200 ».
- 2 [MAJEUR] auto-rétractés par le reviewer (faux positifs après relecture).
- 1 [MINEUR] : commentaire V9 (mécanisme `lower(trim())`) — corrigé.
- Reste [OK] : cap 4000, null-guard, recalcul endDate, pattern JPA update-in-place, `findEventById` Optional, logique `clearColor`, `ProductResponse` sans leak, sync Zod.

## Revue migration (Phase 5 db-expert)
- `V9__neutralize_invalid_recurrence_unit.sql` : verdict **[OK]** (saine, idempotente, rollback honnête). 1 `[MINEUR]` cosmétique (commentaire l.20-22 décrit mal le mécanisme `lower('WEEK')='week'` → matche branche `'week'`, effet net idempotent identique, aucun bug) — à corriger en commit nettoyage.
- Pas de V10 (#158) : colonne `products.color` préexistante (V7/#44).

## Conclusion
Prêt pour PR. Aucun `[MISSING]` bloquant (E2E = gap pré-existant projet, non régressif). Reste avant merge : commit nettoyage `[MINEUR]` commentaire V9 + éventuelles trouvailles review Phase 7.
