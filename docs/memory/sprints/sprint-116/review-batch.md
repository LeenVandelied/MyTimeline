# Review batch — Sprint 116 (reviewer, lecture seule, 2026-10-25)

**Verdict : APPROUVÉ — 0 CRITIQUE, 0 MAJEUR, 6 MINEUR** (tous traités par le lead, commit « corrections review »).

- [OK] `ci.yml` poll `/actuator/health` borné 45×2 s, `kill -0 "$BACKEND_PID"` sort si la JVM meurt ; préfixe `E2E_SETUP_ACCOUNTS=shared` sur la seule passe 2.
- [OK] `accounts.ts`/`auth.setup.ts` : défaut = 4 comptes, clé inconnue lève, `persistAccounts()` entier.
- [OK] #567 : arrondi sup./plancher 1, seau par jeton lit son propre probe, 3 sites d'appel, tests discriminants, CORS asserté sur le 429.
- [OK] #838 : seul le 500 inline est coupé (502/503/504 reportent), spec conforme au garde RAW_SESSION, testids existants, témoin anti-vert-par-construction.
- [MINEUR → corrigé] `ci.yml` `curl -sf` sans `--max-time` → `--max-time 5`.
- [MINEUR → corrigé] `RateLimitingFilter.retryAfterSeconds` débordement près de `Long.MAX_VALUE` → `Math.ceilDiv` ; + borne haute `Math.min(WINDOW)` (durcissement demandé par l'audit sécurité).
- [MINEUR → corrigé] `e2e-rate-limit-budget.test.ts` : limite du garde « imports nommés » documentée.
- [MINEUR → corrigé] ADR-010 §7 : « 12 points de rejet » reformulé (11 slots IP + seau jeton + seau utilisateur, via `writeTooManyRequests`).
- [MINEUR → corrigé] `RateLimitingAndHeadersIntegrationTest` : `assertFalse` + imports `Locale`/`Arrays`.
- [MINEUR → corrigé] `application-e2e.properties` : paragraphe « levier restant » marqué appliqué S116.

Vérification post-correction (lead) : Maven `RateLimiting*,UserRateLimiting*,CorsAllowedOrigins*` vert (64 tests + 7 CORS) ; Vitest budget 51/51 ; prettier OK ; YAML `ci.yml` valide.
