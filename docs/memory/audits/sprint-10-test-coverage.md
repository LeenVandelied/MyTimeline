# Audit tests — Sprint 10

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR.
> Sprint backend pur (aucun code frontend). Frontend Produits/Catégories livré en S11 (#61).

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration (Testcontainers) | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| BR-PRO-001 | Nom produit obligatoire/borné (PATCH 400) | NON | ✅ | ✅ | N/A (pas de front S10) |
| BR-PRO-004 | userId path fait autorité (ownership 403) | NON | ✅ | ✅ | N/A |
| BR-PRO-007 | Soft delete `archived` (DELETE 204) | NON | ✅ | ✅ (`ProductArchivedFilterIntegrationTest`) | N/A |
| BR-CAT-001 | Nom catégorie obligatoire (400) | NON | ✅ | ✅ | N/A |
| BR-CAT-002 | Delete catégorie inexistante (404) | NON | ✅ | ✅ | N/A |
| BR-CAT-003 | Update catégorie inexistante (404) | NON | ✅ | ✅ | N/A |
| BR-CAT-004 | Unicité nom par owner (409, `UNIQUE(owner_id,name)`) | NON | ✅ | ✅ (`CategoryDeleteReassignIntegrationTest`) | N/A |
| BR-CAT-006 | PATCH catégorie exposé (200) | NON | ✅ | ✅ | N/A |
| BR-CAT ownership | owner_id==JWT sur PATCH/DELETE (403), système NULL protégée | NON | ✅ | ✅ | N/A |
| Réassignation atomique | DELETE `?reassignToCategoryId=` (204/409), rollback | NON | ✅ | ✅ (actifs+archivés, atomicité) | N/A |
| Fix cross-tenant | catégorie cible ownership sur create/update produit (404) | NON | ✅ (+6 `ProductServiceImplTest`) | — | N/A |
| Fix self-reassign | DELETE cible==source rejeté 409 (garde FK/orphelins) | NON | ✅ | ✅ (`CategoryControllerTest`) | N/A |
| Fix nom blanc PATCH | `ProductUpdateRequest` `@Pattern` rejette `" "` (400), null OK | NON | ✅ (`ProductControllerOwnershipTest`) | — | N/A |
| Fix 500-leak unicité | `DataIntegrityViolationException` → 409 générique (pas de fuite SQL) | NON | ✅ (`GlobalExceptionHandlerValidationTest`) | — | N/A |

**Cross-system flow = NON pour toutes** : Sprint 10 est backend pur (API + DB, un seul système). Aucun parcours 2+ systèmes/rôles → pas d'E2E métier obligatoire. Les intégration Testcontainers (Postgres réel, `@SpringBootTest`) couvrent le contrat API bout-en-bout. L'E2E métier produit/catégorie viendra avec le frontend Wave 3 (S11, #61).

## Tests créés / modifiés
- `application/services/ProductServiceImplTest.java` (nouveau — soft delete + cross-tenant catégorie, +6 cas fix)
- `infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` (maj `archiveById`)
- `infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` (nouveau — `@SQLRestriction`)
- `infrastructure/adapters/controllers/CategoryControllerTest.java` (nouveau — POST/PATCH/DELETE 400/409/404/403/204)
- `application/services/CategoryServiceImplTest.java` (nouveau — unicité owner, ordre update-avant-delete, rollback)
- `infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` (nouveau — réassignation atomique)

## Résultats runs
- Backend (surefire) : **136 tests, 136 passed, 0 failed, 0 errors, 0 skipped** (125 après impl + 6 fix cross-tenant + 5 fix review)
- Integration Testcontainers (Postgres) : inclus (surefire, `*IntegrationTest` matché par `**/*Test.java`), exécutés et verts
- Frontend / E2E : aucun (sprint backend pur)

## Reviews / audits
- db-expert (V8) : OK — 2 MINEUR déférés (#78 FK RESTRICT vs DELETE /me ; dette UUID-AUTO préexistante).
- security-expert : 1 CRITIQUE + 1 MAJEUR (cross-tenant catégorie sur produit) → **corrigés** (`a94b279`, helper `resolveAssignableCategory`, 404 anti-énumération).
- reviewer batch : 1 MAJEUR bloquant (self-reassign FK) + 2 MINEUR bundlés → **corrigés** (`28a8a74`). 2 MAJEUR de dette préexistante déférés en follow-ups (dup `resolveCaller`, `ProductResponse` DTO).

## Conclusion
Prêt pour PR. Aucun `[MISSING]`. Follow-ups (triage /sprint end) : dup `resolveCaller` ProductController [S], `ProductResponse` DTO / AP-CAT-03 produit [M], E2E métier + UUID hardcodés front → #61 (S11).
