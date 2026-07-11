# ISSUE #130 DONE

commits: 55254fa

## resume
- Objectif: logger config cookie/CORS effective au boot prod (diag pre-incident).
- Bean cree: `infrastructure/config/ProdConfigStartupLogger` `@Component @Profile("prod")`, ecoute `@EventListener(ApplicationReadyEvent.class)`.
- Valeurs loggees (INFO, non-sensibles): `app.cookie.secure` (bool), `app.cookie.domain` (`@Value ${app.cookie.domain:}`), `app.cors.allowed-origins` (List). Noms variables + valeurs resolues, lisible sans code source.
- WARN si `COOKIE_DOMAIN` vide (cookie host-only) et si `CORS_ALLOWED_ORIGINS` vide.
- Anti-fuite #160: aucun secret lu/logge (JWT_SECRET/DB_PASSWORD/BREVO_API_KEY jamais touches). Injection @Value read-only, SecurityConfig/AuthController NON modifies (memes properties Spring reutilisees).
- Profil STRICT prod: aucun log dev/test.

## test
- `ProdConfigStartupLoggerTest` (5 tests, LEGER, sans @SpringBootTest): ListAppender logback capture logs en invoquant directement `logEffectiveConfig()`; verif `@Profile` == prod; verif INFO contient noms vars+valeurs; verif WARN cookie/CORS vides; verif aucun secret. `./scripts/test-quiet.sh backend` => 311 tests OK (dont 5 miens).

## garde-fous respectes
- Branche sprint/30 verifiee avant commit.
- `git add` cible 2 fichiers uniquement; ProfileSafetyGuard.java (#216 parallele) NON ramasse.
- Aucun fichier interdit touche (SecurityConfig/AuthController/application*.properties/spring.factories).

## MEMORY
Pas de [MEMORY:*] — pattern boot-logger simple, deja couvert par convention infra/config.

## recommandations suite
- RECOMMAND_FOLLOWUP: le log AVERTIT (WARN) si COOKIE_DOMAIN/CORS_ALLOWED_ORIGINS vides mais NE BLOQUE PAS le boot. Une validation dure fail-fast (refus de boot prod si CORS vide) serait hors-scope #130 — envisager issue dediee si souhaite.
- Pas de RECOMMAND_TEST_RUNNER (suite legere, deja verte). Pas de RECOMMAND_DB_EXPERT (aucun schema).

STATUS: COMPLETED
