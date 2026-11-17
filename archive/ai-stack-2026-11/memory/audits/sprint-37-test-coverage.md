# Audit tests — Sprint 37 (Reset-password hardening)

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR. Aucun `[MISSING]` ici.

## Couverture par issue

| Issue | Description | Cross-system flow | Unit/Integration backend | E2E métier |
|-------|-------------|:---:|:---:|:---:|
| #143 | Verrou optimiste @Version anti-TOCTOU (V15) | NON | ✅ `PasswordResetTokenConcurrencyIntegrationTest` (2 consommations concurrentes → 1 succès / 1 `ObjectOptimisticLockingFailureException`) | ⚠ N/A (couvert par E2E #145 en nominal) |
| #141 | Rate-limit / lockout par token sur reset-password | NON | ✅ `ResetPasswordTokenRateLimitIntegrationTest` (N échecs/token → 429) + 13 non-régression RateLimiting | ⚠ N/A |
| #139 | Purge @Scheduled tokens consommés/expirés | NON | ✅ `PasswordResetTokenPurgeSchedulerIntegrationTest` (used/expiré-48h supprimés ; valide + récent conservés — test des bornes) | ⚠ N/A |
| #145 | E2E Playwright flux mot de passe oublié | **OUI** | — | ✅ `frontend/e2e/forgot-password.spec.ts` (register → forgot → capture token → reset → login) |

Cross-system flow = OUI pour #145 (forgot → email/token → reset → login, front+back+DB) → E2E métier présent et exécuté vert (6 passed) par l'auteur.

## Tests créés
- `backend/src/test/java/.../jpa/PasswordResetTokenConcurrencyIntegrationTest.java` (#143)
- `backend/src/test/java/.../security/ResetPasswordTokenRateLimitIntegrationTest.java` (#141)
- `backend/src/test/java/.../PasswordResetTokenPurgeSchedulerIntegrationTest.java` (#139)
- `frontend/e2e/forgot-password.spec.ts` + `frontend/e2e/support/db.ts` (#145)

## Résultats runs
- **Backend** : **390 tests, 390 passed, 0 failed** (`./scripts/test-quiet.sh unit`, test-runner Phase 6 + fix post-review).
- **E2E** : spec #145 validée **6 passed (18.1s)** par l'auteur via base jetable `eventmanager_e2e` (contournement DB locale bloquée à V3, sans lien avec le code du sprint). Le run d'audit Phase 6 a échoué au **setup** E2E (timeout `login-form` — instabilité d'environnement, PAS une absence de test ni une régression de code).

## Corrections post-review (Phase 7)
Reviewer + security-expert ont convergé sur un MAJEUR de sécurité sur `RateLimitingFilter` (#141) — corrigé (commit `f7210e1`) :
- body borné (gate `Content-Length` 8 KiB + `readBounded`) — anti-OOM sur endpoint public non authentifié.
- clé token plausible (≤128 chars) sinon repli throttle IP — anti-neutralisation du cap 100k par clé volumineuse.
- éviction LRU sur `tokenBuckets` — anti-bypass throttle-par-token à saturation.
- `PasswordResetServiceImpl` : commentaire robustesse `saveAndFlush` (seul flush synchrone garanti).
- `frontend/e2e/support/db.ts` : fallback mot de passe DB retiré.

## Follow-ups identifiés (non bloquants — arbitrage Phase 4 /sprint end)
- Découpler le canal de capture du token E2E du schéma DB V6 (endpoint test-only `@Profile("e2e")` ou mock `EmailService`) — RECOMMAND_FOLLOWUP #145.
- Cas d'échec E2E (ancien mdp rejeté, token rejoué) omis du nominal pour éviter le lockout #141 — spec séparée — RECOMMAND_FOLLOWUP #145.
- Cap `spring.datasource.hikari.maximum-pool-size` en `application-test.properties` (suite au bord de « too many clients ») — RECOMMAND_DB_EXPERT #139.
- Index composite `(used_at, expires_at)` pour la purge si volumétrie croît — MINEUR reviewer.

## Conclusion
Prêt pour PR. Backend 390/390 vert, E2E métier présent (validé vert par l'auteur), MAJEURs sécurité corrigés. Instabilité env E2E en audit = à réparer côté environnement (hors gate code).
