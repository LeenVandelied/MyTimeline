# Coverage — auth (màj post-S10)

> Énumération réelle des tests. Remplace la version 2026-06-25 (« zéro test auth » — faux positif).

## Tests backend présents
- `AuthControllerSecurityTest` (10 tests, slice Mockito + standaloneSetup) — register/login, échecs d'auth, contrats d'erreur du controller.
- `AuthControllerValidationTest` (3 tests, slice Mockito + standaloneSetup) — validation Bean sur payloads register/login.
- `AuthControllerDevProfileCookieTest` (2 tests, @SpringBootTest + standaloneSetup) — cookie de session en profil dev.
- `AuthErrorContractIntegrationTest` (3 tests, intégration @SpringBootTest + Testcontainers Postgres) — forme JSON des erreurs d'auth bout-en-bout.
- `RateLimitingAndHeadersIntegrationTest` (8 tests, intégration Testcontainers) — rate-limiting login/forgot + en-têtes de sécurité.
- `PasswordResetEndpointsIntegrationTest` (5 tests, intégration Testcontainers) — endpoints forgot/reset password.
- `PasswordResetServiceImplTest` (9 tests, unit Mockito) — logique reset (token, expiration, invalidation).
- `ForgotPasswordAsyncTest` (2 tests, @SpringBootTest) — envoi asynchrone du mail forgot-password.
- `UserServiceImplTest` (3 tests, unit Mockito) — service utilisateur (création/lecture).
- `UserControllerTest` (9 tests, slice Mockito + standaloneSetup) — endpoints profil utilisateur.

## Tests frontend / E2E
- `src/contexts/AuthContext.test.tsx` (6) — état d'auth client.
- `src/hooks/useCurrentUser.test.tsx` (2), `src/services/authService.test.ts` (1) — hook user courant, service auth.
- Pages (vitest/RTL) : `login/page.test.tsx` (3), `register/page.test.tsx` (3), `forgot-password/page.test.tsx` (2), `reset-password/page.test.tsx` (3).
- E2E : aucun (`frontend/e2e/` = `.gitkeep` seul).

## Gaps restants (non couverts)
- Aucun E2E du parcours inscription → connexion → accès protégé.
- Validation JWT (filtre) : pas de test d'intégration isolé dédié (couverte indirectement via les *IntegrationTest).
- Refresh token : non implémenté, donc non testé.

## Total : 54 tests backend (auth + user/reset)
> Transverses hors domaine : `AuditingAndEqualityTest` (12), `ProfileSafetyGuardTest` (6, unit sans Spring) — non comptés ici.
