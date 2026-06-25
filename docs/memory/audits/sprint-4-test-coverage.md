# Audit tests — Sprint 4 (Auth & CSP)

> Généré en fin de Phase 6. Aucune couverture manquante → Phase 9 PR débloquée.
> Sprint backend pur (sécurité auth + CSP). Aucun changement frontend → pas d'E2E parcours/métier requis.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Frontend | E2E |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-008 / BR-EVT-005 | Ownership 403 uniforme (#100) | NON | ✅ | ✅ (MockMvc) | N/A | N/A |
| BR-SEC-003 | CSP stricte anti-XSS (#101) | NON | — | ✅ (RateLimitingAndHeadersIntegrationTest) | N/A | N/A |
| BR-AUT-007 | Login : plus de JWT en body (#104) | NON | ✅ (AuthControllerSecurityTest) | ✅ | N/A | N/A |
| BR-AUT-009 | Refresh exige token valide (#105) | NON | ✅ (3 cas : valide/expiré/signature) | ✅ | N/A | N/A |
| BR-AUT-007 / BR-AUT-010 | Cookies Secure/Domain par profil + cohérence (#99) | NON | ✅ (cohérence login/refresh/logout) | ✅ | N/A | N/A |

Aucun flux cross-system (2+ systèmes/rôles) introduit → E2E métier non requis pour ce sprint.

## Tests créés / modifiés
- `EventControllerOwnershipTest.java` (#100 — body 403 forbidden PATCH/DELETE cross-user, `.setControllerAdvice(GlobalExceptionHandler)`)
- `RateLimitingAndHeadersIntegrationTest.java` (#101 — assertion CSP stricte exacte + endpoint public)
- `AuthControllerSecurityTest.java` (#104 body login sans JWT + cookie httpOnly ; #105 refresh 3 cas + verify(never()).generateToken ; #99 cohérence attrs cookie login/refresh/logout)

## Résultats runs
- Backend (suite complète, Testcontainers Postgres) : **41 tests, 41 passed, 0 failed, 0 skipped** — BUILD SUCCESS (~11s)
- AuthControllerSecurityTest après correctif review (2e39e08) : 8/8 green
- Frontend / E2E : N/A (aucun changement frontend)

## Reviews
- Reviewer batch : 1 CRITIQUE + 4 MAJEUR + nits. Security-expert : 1 MAJEUR + mineurs.
- CRITIQUE/MAJEUR convergent (default cookie fail-safe `application.properties`) → **CORRIGÉ** (commit 2e39e08).
- Autres MAJEUR/MINEUR → follow-ups (voir PR + triage sprint-end) : divergence body 403 GlobalExceptionHandler vs SecurityConfig.accessDeniedHandler, deleteEvent 401/404 body vide, `/refresh` 404→401 oracle d'énumération, CORS origin non externalisé, outillage test cassé (test-quiet.sh absent + mvnw racine).

## Conclusion
Prêt pour PR. Suite verte, finding bloquant corrigé, aucune couverture manquante.
