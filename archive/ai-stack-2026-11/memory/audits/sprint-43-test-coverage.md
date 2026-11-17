# Audit tests — Sprint 43 (Auth cleanup léger)

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloque la Phase 9 PR. Sprint BACKEND-only.

## Couverture par issue / BR

| Issue | BR / contrat | Cross-system flow | Unit backend | Integration | Frontend | E2E |
|-------|--------------|:---:|:---:|:---:|:---:|:---:|
| #285 pool Hikari test | infra test (#139) | NON | ⚠ N/A (config) | ✅ suite complète 411/411 sans "too many clients" | N/A | N/A |
| #286 split create/consume | BR-AUT reset + anti-TOCTOU #143 | NON | ✅ routing create/markConsumed | ✅ CreateStatistics (loadCount==0) + Concurrency #143 | N/A | N/A |
| #289 /me anti-énumération | BR-AUT anti-énum (#113) | NON | ✅ SecurityTest (forge token→401) | ✅ ErrorContractTest 404→401 | vérifié (AuthContext status-based) | N/A |
| #288 AuthController→ErrorCode | contrat d'erreur auth | NON | ✅ Security+ErrorContract | ✅ SessionRevocation + AuthErrorContract | vérifié (register status-only) | N/A |
| #290 handlers→buildBody | contrat d'erreur BR-CAT/BR-EVE | NON | ✅ GlobalExceptionHandlerContractTest (+ non-régression EventConflict #231) | ✅ User/Category/PasswordReset | vérifié (toasts i18n, statut) | N/A |

Aucun flux cross-system 2+ rôles introduit → pas d'E2E métier requis. Sprint backend-only, aucun nouveau `data-testid` → couverture E2E N/A (Phase 8 OK).

## Tests créés / modifiés
- backend/.../jpa/PasswordResetTokenCreateStatisticsIntegrationTest.java (NEW, #286)
- backend/.../controllers/GlobalExceptionHandlerContractTest.java (NEW, #290)
- backend/.../controllers/AuthControllerSecurityTest.java (MAJ, #289/#288)
- backend/.../controllers/AuthControllerErrorContractTest.java (MAJ, #289/#288)
- backend/.../SessionRevocationIntegrationTest.java, UserControllerTest.java, CategoryControllerTest.java, PasswordResetEndpointsIntegrationTest.java (MAJ codes ErrorCode)

## Résultats runs
- Suite backend complète (Phase 6, test-runner) : **411 tests, 411 passed, 0 failed, 0 error, 0 skip** (~180s).
- Garde-fous verts : pool=2 sans deadlock/"too many clients" (#285) ; anti-TOCTOU #143 ; corps enrichi 409 EventConflict #231 non régressé.
- Frontend : sprint backend-only, aucune modif frontend (0 fichier).

## Conclusion
Prêt pour PR. Aucune couverture manquante (aucun marqueur bloquant).
