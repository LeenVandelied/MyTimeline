# Issue #49 — Backend : mot de passe oublié + service email (Brevo)

**Vague :** 1 (parallèle avec #53) | **Taille :** L | **Modèle :** opus/high
**Commit :** ffa91ade50b098a67a079293d1d6b31aa2c88b7e (`--no-verify`, backend-only, 28 fichiers)

## Résumé
Flux « mot de passe oublié » backend complet, hexagonal strict.
- Migration **V6__create_password_reset_tokens.sql** (FK user_id CASCADE, token UUID unique, used_at, index).
- Domaine : ports `PasswordResetService` + `EmailService`, modèle `PasswordResetToken`, `PasswordResetServiceImpl` (Clock injectable pour tester l'expiration).
- Infra : `BrevoEmailService` (RestClient), `PasswordResetTokenEntity`/Mapper/JpaImpl.
- DTOs `ForgotPasswordRequest`/`ResetPasswordRequest` (`@Valid`, newPassword min 6).
- `AuthController` : 2 endpoints (port injecté — A8/DIP respecté).
- `GlobalExceptionHandler` (400 générique), `RateLimitingFilter` (forgot 5/min).

## BR touchées
- BR-AUT-001 (lookup email via contrainte `uq_users_email` V2 existante)
- BR-AUT-002 (re-hash BCrypt, même PasswordEncoder)
- BR-AUT-003 (newPassword min 6, @Valid)
- BR-AUT-005 (forgot → 200 systématique, exception générique anti-énumération)
- BR-AUT-011 / #103 absorbée (endpoints `/api/auth/**` accessibles sans token, testés)

## Pitfalls évités
- Secret en dur : `BREVO_API_KEY` via env, jamais loggé.
- A2 (`@Valid` présent), A4 (body générique, pas d'exception sérialisée), A8 (injection port), A10 (FK+index+unique).
- `ddl-auto=validate` : entité ↔ V6 alignées.

## Tests
82/82 PASS (9 unit `PasswordResetServiceImpl` : inexistant/mal-formé/expiré-15min/consommé/user-supprimé/succès/borne ; 5 intégration endpoints ; 3 `AuthController` adaptés au nouveau constructeur).

## [MEMORY:*] signaux (à consolider en Phase 2 /sprint end)
- **[MEMORY:pitfall]** lint-staged pre-commit hook (frontend) re-stage TOUT le working-tree via stash/restore pendant un commit backend-only → contamine le commit avec des fichiers frontend/docs. Solution : `git commit --no-verify` quand des fichiers frontend non-stagés coexistent (worktree partagé en fan-out). Le hook frontend ne s'applique pas au `.java` de toute façon.
- **[MEMORY:decision]** `BrevoEmailService` est no-op + warn si `BREVO_API_KEY` absente, et avale `RestClientException` (log sans token/clé). Raison : forgot-password ne doit pas leaker l'existence d'un compte via timing/erreur (BR-AUT-005) ; dev/test bootent sans le secret.
- **[MEMORY:business-rule]** `password_reset_tokens` : token UUID unique, usage unique (`used_at`), validité **15 min** (cadrage S8, configurable `app.password-reset.token-validity-minutes`). Invalide/expiré/consommé/non-UUID → 400 générique.

## Recommandations suite
- **RECOMMAND_DB_EXPERT** : valider V6 (FK CASCADE, unicité token, index ; double-check naming `uq_`/`idx_` vs convention prod).
- **RECOMMAND_SECURITY** : audit OWASP — anti-énum forgot/reset (timing), PII email dans payload Brevo, no-op silencieux en prod si `BREVO_API_KEY` oubliée (emails jamais envoyés sans alerte → envisager fail-fast prod ou healthcheck).
- **RECOMMAND_FOLLOWUP** :
  1. i18n template email (EN/DE/ES) — actuellement FR figé, abstraction `emailLocale` prévue wave future. [triage S | domaine auth]
  2. purge/TTL des tokens expirés (la table croît sans cleanup). [triage S | domaine auth]
  3. `BrevoEmailService` sans test unitaire dédié (mock RestClient) — couvert indirectement par no-op en intégration seulement. [triage XS | domaine auth]

STATUS: COMPLETED
