# Audit tests — Sprint 5

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR.
> Sprint backend-only (DB/profils + auth/config). Aucun changement frontend → pas de parcours E2E UI introduit.

## Couverture par changement

| Réf | Description | Cross-system flow | Unit/Intégration backend | Frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| #108 BR events | V4 CHECK/NOT NULL events (type/duration_unit/recurrence_unit) | NON | ✅ Testcontainers V1→V4 (migration appliquée, 0 erreur) | N/A | N/A | N/A |
| #110 perf | V5 index FK (products.category_id/user_id, events.product_id) | NON | ✅ Testcontainers V1→V5 (migration appliquée) | N/A | N/A | N/A |
| #116 BR-AUT-005 | 401 BadCredentials → body JSON neutre | NON (backend contract) | ✅ AuthControllerSecurityTest (401 + jsonPath $.error, message neutre) | N/A (grep frontend = 0 usage en dur) | N/A | N/A |
| #117 config dev | Cookie JWT Secure=false + domaine localhost en profil dev | NON | ✅ AuthControllerDevProfileCookieTest (charge vrai application-dev.properties) | N/A | N/A | N/A |
| #119 BR-AUT-007 | 403 unifié sur SecurityConfig.accessDeniedHandler | NON (backend contract) | ✅ EventControllerOwnershipTest migré @SpringBootTest (filtre Security réel → {"error":"forbidden"}) | N/A | N/A | N/A |
| #120 sécu CORS | Origins externalisées + Authorization retiré + SameSite Lax | NON | ✅ RateLimitingAndHeadersIntegrationTest (CORS/headers OK avec @Value default) | N/A | N/A | N/A |
| #118 config/doc | COOKIE_DOMAIN prod documenté (runbook hub) | NON | ✅ sanity 56/56 (config+doc, pas de code) | N/A | N/A | N/A |
| #111 sécu profil | ProfileSafetyGuard fail-fast dev-en-prod | NON | ✅ ProfileSafetyGuardTest 6 cas (MockEnvironment, sans Docker) | N/A | N/A | N/A |

Cross-system flow = NON pour toutes : sprint de durcissement backend (DB, config, contrats d'erreur). Aucun nouveau flux 2+ systèmes/rôles côté UI → pas d'E2E métier requis. Les contrats d'erreur 401/403 sont validés au niveau intégration backend avec la chaîne Spring Security réelle (le bon niveau, cf. PIT #119 : @RestControllerAdvice jamais atteint en prod).

## Tests créés / modifiés ce sprint
- `backend/.../config/ProfileSafetyGuardTest.java` (#111, +6 tests)
- `backend/.../controllers/AuthControllerSecurityTest.java` (#116, +1 test 401 JSON)
- `backend/.../controllers/AuthControllerDevProfileCookieTest.java` (#117, +1 test, classe dédiée @TestPropertySource dev)
- `backend/.../controllers/EventControllerOwnershipTest.java` (#119, migré standaloneSetup → @SpringBootTest, 403 réel)
- Migrations couvertes par le run Testcontainers existant (V1→V5).

## Résultats runs
- Backend : **56 tests, 56 passed, 0 failed, 0 errors, 0 skipped** (BUILD SUCCESS ~11.6s, Testcontainers Postgres).
- Baseline S4 = 41 → S5 = 56 (+15 : ProfileSafetyGuard 6, AuthControllerDevProfileCookie 1, 401 JSON 1, EventControllerOwnership migration, etc.).
- Frontend : aucun changement → pas d'E2E à compléter.
- E2E : aucun runner frontend configuré sur le repo (état connu).

> Note : le subagent test-runner a initialement rapporté 41/41 (run stale/agrégat) ; ré-exécution directe par le lead sur HEAD 0f01b4b = 56/56 vert. Pas de régression.

## Conseils pré-déploiement (db-expert, base dev peuplée uniquement)
Sur base fraîche (CI/Testcontainers) : aucun blocage. Sur **base dev déjà peuplée**, exécuter avant V4 :
- `SELECT count(*) FROM events WHERE type IS NULL;` (SET NOT NULL échoue si > 0)
- `SELECT max(length(type)) FROM events;` (varchar(20) échoue si > 20)
ALTER échoue proprement (pas de perte silencieuse) — risque borné.

## Conclusion
Prêt pour PR. 0 [MISSING]. Suite 56/56 verte. Reviews db-expert (0 CRITIQUE) + security-expert (0 CRITIQUE) passées. Findings MINEUR/MAJEUR = follow-ups hors scope (users.role drift, /me plain text, BR-PRO-006 full scan, CHECK conditionnels).
