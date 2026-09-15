# Audit tests — Sprint 38

> Généré en fin de Phase 6 (test-runner, 2026-07-13). Un marqueur MISSING dans le tableau bloque la Phase 9 PR.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-001 | Register conflict 409 → `{"error":...}` JSON (#125) | NON | ✅ AuthControllerErrorContractTest | ✅ AuthErrorContractIntegrationTest | ✅ RegisterPage 409 inline error | ⚠ N/A | ⚠ N/A |
| BR-AUT-005 | Pas de fuite interne dans les erreurs auth (#125/#126) | NON | ✅ SecurityConfigWriteJsonErrorTest | ✅ AuthErrorContractIntegrationTest | ✅ ForgotPasswordPage message neutre | ⚠ N/A | ⚠ N/A |
| BR-AUT-008 | /me erreurs JSON, pas de secret (#125) | NON | ✅ AuthControllerErrorContractTest | ✅ | ✅ apiClient parsing | ⚠ N/A | ⚠ N/A |
| BR-AUT-010 | /logout erreurs JSON (#125) | NON | ✅ AuthControllerErrorContractTest | ✅ | ✅ (logout ignore body) | ⚠ N/A | ⚠ N/A |
| Contrat #127 | Codes stables `not_found`/`validation_failed` (buildBody) | NON | ✅ GlobalExceptionHandlerErrorCodeTest | ✅ | ✅ (aucun parsing dur reasonPhrase) | ⚠ N/A | ⚠ N/A |

Aucun flux cross-system 2+ systèmes/rôles touché → E2E métier non obligatoire.

## Tests créés
- backend/src/test/.../adapters/controllers/GlobalExceptionHandlerErrorCodeTest.java (#127)
- backend/src/test/.../infrastructure/security/SecurityConfigWriteJsonErrorTest.java (#126)
- backend/src/test/.../adapters/controllers/AuthControllerErrorContractTest.java (#125, 5 tests)

## Résultats runs (test-runner, HEAD 8e9e0fd)
- Backend : 398 tests, 398 passed, 0 failed (AuthErrorContractIntegrationTest 3/3, SecurityConfigWriteJsonErrorTest 2/2)
- Frontend : 421 tests, 421 passed, 0 failed (apiClient compatible nouveau format `{"error":...}`)
- E2E : SKIPPED — `E2E_DB_PASSWORD` absent de l'environnement (blocage infra, pas régression). Justification non-bloquante : sprint backend-only, aucun nouveau data-testid ([COVERAGE-E2E] OK), aucune BR cross-system P0/P1 introduite. E2E à re-exécuter via CI sur la PR.

## Conclusion
Prêt pour review batch + PR. Suites unit/integration/frontend vertes sur le HEAD réel (revalidation post-incident worktree #125 incluse).
