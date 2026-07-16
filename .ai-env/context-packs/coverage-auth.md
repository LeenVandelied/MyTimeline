# Coverage — auth (màj clôture S43, 2026-07-16)

> Énumération réelle des tests (comptage `@Test` / `it|test(`). Remplace la version post-S10,
> périmée sur deux points : « Refresh token : non implémenté » (implémenté depuis S4 #105) et
> « E2E : aucun » (specs Playwright livrées S35+).

## Tests backend présents (123 tests, 23 classes)

### Controller auth (23)
- `AuthControllerSecurityTest` (11) — register/login, échecs d'auth, anti-énumération /me (#289), contrats d'erreur.
- `AuthControllerErrorContractTest` (5) — forme JSON des erreurs (codes `ErrorCode` depuis #288).
- `AuthControllerValidationTest` (3) — validation Bean payloads register/login.
- `AuthControllerDevProfileCookieTest` (2) / `AuthControllerProdProfileCookieTest` (2) — attributs cookie jwt par profil.

### Sessions (24)
- `SessionServiceImplTest` (10), `SessionControllerTest` (4), `SessionRevocationIntegrationTest` (8), `StatelessSessionGuardTest` (2) — gestion/révocation sessions (#73), garde stateless.

### Password reset (24)
- `PasswordResetServiceImplTest` (9) — token inexistant/expiré/consommé.
- `PasswordResetEndpointsIntegrationTest` (5), `ForgotPasswordAsyncTest` (2) — endpoints forgot/reset, envoi async.
- `PasswordResetTokenConcurrencyIntegrationTest` (1) — anti-TOCTOU #143.
- `PasswordResetTokenCreateStatisticsIntegrationTest` (1, NEW S43 #286) — create = INSERT pur, `loadCount==0` (PAT-S43-001).
- `PasswordResetTokenPurgeSchedulerIntegrationTest` (1), `ResetPasswordTokenRateLimitIntegrationTest` (5).

### Sécurité infra (22)
- `RateLimitingAndHeadersIntegrationTest` (14), `RateLimitingDisabledIntegrationTest` (2) — rate-limiting login/forgot + en-têtes.
- `AuthErrorContractIntegrationTest` (3) — erreurs auth bout-en-bout.
- `JwtServiceSecretValidationTest` (3) — validation du secret JWT au boot.

### User (30)
- `UserControllerTest` (22), `UserServiceImplTest` (3), `UserRoleConstraintIntegrationTest` (5).

## Tests frontend (50)
- `AuthContext.test.tsx` (6), `useCurrentUser` (2), `useSessionManager` (3), `authService` (1), `userService` (3).
- Settings : `SecuritySection` (4), `SessionList` (6), `AccountSection` (4), `PasswordStrength` (6).
- Pages (vitest/RTL) : `login/page` (4), `register/page` (4), `forgot-password/page` (3), `reset-password/page` (4).

## E2E (Playwright, gate CI only)
- `auth.setup.ts` — setup d'authentification partagé (storage state).
- `golden-path.spec.ts` — parcours complet full-stack (inscription → connexion → parcours cœur).
- `forgot-password.spec.ts` — parcours complet forgot/reset.
- `settings-security.spec.ts` (3) — changement de mot de passe + liste/révocation sessions.
- `settings-account.spec.ts` — compte (suppression).

## Gaps restants (non couverts)
- `SignatureException` sur `/me` → 500 via catch générique (vs 401 sur /refresh) — follow-up **#312**.
- Validation JWT (JwtFilter) : pas de test d'intégration isolé dédié (couverte indirectement via les *IntegrationTest).

> Transverses hors domaine : `GlobalExceptionHandlerContractTest` (5, NEW S43 #290 — codes stables + non-régression EventConflict enrichi), `AuditingAndEqualityTest`, `ProfileSafetyGuardTest` — non comptés ici.
