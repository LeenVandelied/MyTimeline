# Coverage — auth (màj clôture S71, 2026-09-04 ; compteurs backend recomptés)

> Énumération réelle des tests. Remplace la version post-S10, périmée sur deux points :
> « Refresh token : non implémenté » (implémenté depuis S4 #105) et « E2E : aucun »
> (specs Playwright livrées S35+).
>
> ⚠ MÉTHODE DE COMPTAGE (corrigée au S71). Les compteurs backend viennent désormais des
> rapports **surefire** d'un run complet vert (`target/surefire-reports/*.txt`, ligne
> `Tests run:`), PAS d'un `grep -c '@Test'`. C'est la cause de la dérive corrigée ici :
> un `@ParameterizedTest` compte pour 1 au grep et pour N à l'exécution — `PasswordPolicyTest`
> vaut 4 `@Test` déclarés mais 29 tests exécutés. Tout recomptage futur doit repartir de
> surefire, sinon la dérive revient.
>
> ⚠ La section « Tests frontend (99) » n'a PAS été recomptée au S71 (hors périmètre du
> correctif de review) : ses chiffres restent à vérifier.

## Tests backend présents (172 tests, 25 classes — recomptés à la clôture S71)

### Controller auth (26)
- `AuthControllerSecurityTest` (16) — register/login, échecs d'auth, anti-énumération /me (#289), contrats d'erreur.
- `AuthControllerErrorContractTest` (5) — forme JSON des erreurs (codes `ErrorCode` depuis #288).
- `AuthControllerValidationTest` (3) — validation Bean payloads register/login.
- `AuthControllerDevProfileCookieTest` (1) / `AuthControllerProdProfileCookieTest` (1) — attributs cookie jwt par profil.

### Politique de mot de passe (32, NEW S71 #148)
- `PasswordPolicyTest` (29) — BR-AUT-003 : rejet hors politique sur register / reset / change,
  **égalité des verdicts entre les 3 endpoints**, non-application au login, borne haute à 100.
- `AuthControllerLegacyPasswordLoginTest` (3) — garde-fou de non-régression : un compte semé en base
  avec un hash BCrypt d'un mot de passe à 6 caractères se connecte toujours (200 + cookie jwt), le même
  mot de passe est refusé au register, et le compte peut se mettre en conformité via change-password.

### Sessions (24)
- `SessionServiceImplTest` (10), `SessionControllerTest` (4), `SessionRevocationIntegrationTest` (8), `StatelessSessionGuardTest` (2) — gestion/révocation sessions (#73), garde stateless.

### Password reset (23)
- `PasswordResetServiceImplTest` (9) — token inexistant/expiré/consommé.
- `PasswordResetEndpointsIntegrationTest` (5), `ForgotPasswordAsyncTest` (2) — endpoints forgot/reset, envoi async.
- `PasswordResetTokenConcurrencyIntegrationTest` (1) — anti-TOCTOU #143.
- `PasswordResetTokenCreateStatisticsIntegrationTest` (1, NEW S43 #286) — create = INSERT pur, `loadCount==0` (PAT-S43-001).
- `PasswordResetTokenPurgeSchedulerIntegrationTest` (1), `ResetPasswordTokenRateLimitIntegrationTest` (4).

### Sécurité infra (36)
- `RateLimitingAndHeadersIntegrationTest` (18), `RateLimitingDisabledIntegrationTest` (1) — rate-limiting login/forgot/change-password/PATCH me + en-têtes.
- `AuthErrorContractIntegrationTest` (3) — erreurs auth bout-en-bout.
- `JwtServiceRs256Test` (14) — paire RS256 (génération éphémère, validation au boot, signature/vérification).
  ⚠ Remplace `JwtServiceSecretValidationTest` (3) listé jusqu'au S71 : cette classe N'EXISTE PAS à HEAD (renommée à la migration RS256). Compteur invérifiable pendant N sprints.

### User (31)
- `UserControllerTest` (23, +1 au S71 #134 : `patchMe_conflictBody_leaksNoUsernameExistenceHint`), `UserServiceImplTest` (3), `UserRoleConstraintIntegrationTest` (5).

## Tests frontend (99)
- `AuthContext.test.tsx` (6), `useCurrentUser` (2), `useSessionManager` (3), `authService` (1), `userService` (3).
- Settings : `SecuritySection` (4), `SessionList` (6), `AccountSection` (4), `PasswordStrength` (6).
- Pages (vitest/RTL) : `login/page` (4), `register/page` (4), `forgot-password/page` (3), `reset-password/page` (4).
- `src/lib/schemas/password-policy.test.ts` (49, NEW S71 #148) — pendant frontend de `PasswordPolicyTest` :
  identité des verdicts register/reset/change, clés i18n émises, et login épargné (`validation.password.loginMin`).

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
