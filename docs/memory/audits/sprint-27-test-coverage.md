# Audit tests — Sprint 27

> Généré en fin de Phase 6. Thème : Refactor identité auth + sécurité contrôleurs (100% backend).
> `[MISSING]` bloque la Phase 9 PR. Aucun ici.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Intégration | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| BR-AUT-005 | 401 sans fuite (CallerResolver empty → 401 ; #92 exceptions non-JWT non masquées) | NON | ✅ | ✅ | ⚠ N/A |
| BR-AUT-011 | JwtFilter cookie OU Bearer → SecurityContext (CallerResolver cohérent) | NON | ✅ | ✅ | ⚠ N/A |
| BR-EVT-001 | Ownership 403 events (EventController rebranché CallerResolver) | NON | ✅ | ✅ | ⚠ N/A |
| BR-PRO-004 | userId path fait autorité (ProductController ownership) | NON | ✅ | ⚠ N/A | ⚠ N/A |
| BR-PRO-010 | Catégorie cible ownership (anti cross-tenant, préservé) | NON | ✅ | ⚠ N/A | ⚠ N/A |
| users.role | NOT NULL + CHECK(role IN ROLE_USER/ROLE_ADMIN) (V12) | NON | — | ✅ | ⚠ N/A |

Cross-system flow = OUI si flux 2+ systèmes/rôles. **Tous les changements sont backend-only, mono-système,
sans nouveau parcours frontend** → aucun E2E métier requis (aucune régression de flux cross-system).

## Tests créés
- `backend/.../infrastructure/security/CallerResolverTest.java` (#93, 4 tests : authentifié / vide / user-inconnu / anonymous)
- `backend/.../infrastructure/persistence/UserRoleConstraintIntegrationTest.java` (#122, 5 tests : role null rejeté, hors-enum rejeté, valides OK, boot Flyway V12)
- `backend/.../ProductControllerOwnershipTest.java` (#154 adapté mock CallerResolver + #92 : +2 tests — `getProducts_unauthenticated_returns401`, `getProducts_serviceThrows_propagates_notMaskedAs401`)
- Fixtures corrigées (#122) : 6× `setRole("USER")` → `"ROLE_USER"` (littéral invalide sous le nouveau CHECK)

## Résultats runs
- Backend : **291 tests, 291 passed, 0 failed, 0 error, 0 skipped** (test-runner Haiku, ~45s, Testcontainers Postgres 16).
- Frontend : aucun changement ce sprint (100% backend) → pas de suite frontend.
- E2E : aucune spec (aucun changement frontend/parcours).

## Reviews spécialistes
- **db-expert** (V12) : MERGEABLE. 2 MINEUR (ddl-auto=validate ne vérifie pas nullability/CHECK → filet = migration ; lock ACCESS EXCLUSIVE prod sur ALTER, table `users` petite → négligeable, reco NOT VALID+VALIDATE si volumineuse — déjà gated à décision humaine).
- **security-expert** (auth refactor) : RAS. Ownership préservé sur tous endpoints, CallerResolver null-safe, defense-in-depth (SecurityConfig exige ROLE_USER en amont), pas de fuite d'internes, 403→401 = uniformisation Bearer (durcissement, pas affaiblissement).
- **reviewer batch** : CORRECTIONS MINEURES — 1 MAJEUR (javadoc obsolète UserController resolveCaller → **CORRIGÉ** commit 26d5056) + 2 MINEUR (dette pré-existante non aggravée : dup ownership 5×, SessionController jti dual-source).

## Conclusion
**Prêt pour PR.** Suite 291/291 verte, 3 revues (db/sécu/code) OK, MAJEUR review corrigé. Aucun `[MISSING]`.
