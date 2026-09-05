# Issue #253 — done

**Titre :** [SECURITY] Fail-fast : refuser le boot prod si COOKIE_DOMAIN ou CORS_ALLOWED_ORIGINS vides
**Vague :** 2 | **Taille :** S | **Modèle :** opus-high

## Commits
- `b9e7596` — :lock: #253 fail-fast boot prod si COOKIE_DOMAIN/CORS_ALLOWED_ORIGINS vides

## Résumé
WARN #130 → fail-fast. Check placé dans `ProfileSafetyGuard` (event pré-beans), PAS dans
`ProdConfigStartupLogger` (bean `@Profile("prod")`/ApplicationReadyEvent, blocage tardif moins net).
- `ProfileSafetyGuard.java` : +2 checks (`checkMissingCookieDomainInProduction`,
  `checkMissingCorsOriginsInProduction`) ajoutés en FIN de `onApplicationEvent` (après #111/#216/#254
  pour préserver priorité messages), +2 constantes, +2 helpers. Réutilise `isProductionEffective`.
  Lecture CORS = String CSV brute (`null`/blank OU tous tokens blancs après trim).
- `ProdConfigStartupLogger.java` : 2 WARN domain/CORS RETIRÉS (devenus morts), remplacés par commentaire→#253 ;
  log INFO config effective CONSERVÉ.
- `application-prod.properties` : `app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:}` (default vide ajouté).

## Tests
- 31/31 PASS (ProfileSafetyGuardTest 28, ProdConfigStartupLoggerTest 3), BUILD SUCCESS.
- 4 tests prod-effectifs existants (#254/#216) ajustés pour poser domain/CORS valides (garder focalisés).
- 2 tests WARN morts supprimés de ProdConfigStartupLoggerTest.

## [MEMORY:pitfall]
Garde-fou fail-fast lisant une property CSV `${VAR}` sans default à `ApplicationEnvironmentPreparedEvent` :
`env.getProperty` lève "Could not resolve placeholder" OPAQUE AVANT le message #253 clair. Fix : ajouter
`:` (inner-default vide) dans le .properties prod → toute property lue par ProfileSafetyGuard doit avoir `${VAR:}`.

## [MEMORY:pattern]
Durcir un WARN de démarrage en fail-fast : déplacer la logique dans ProfileSafetyGuard (event pré-beans),
ordonner le nouveau check APRÈS les existants (préserve messages/tests antérieurs), retirer le WARN mort + ses tests.
Anti-pattern : bloquer tardivement dans un bean `@Profile("prod")` (ApplicationReadyEvent).

## Recommandations suite
- Pas de RECOMMAND_TEST_RUNNER (31 tests, <1min).
- Pas de RECOMMAND_DB_EXPERT/SECURITY (périmètre 100% infrastructure/config).
- Pitfall worktree cwd RÉEL rencontré : premier run tests parti dans le repo principal → WARN périmés (faux positif).
  Tout run de tests doit rester dans le worktree.

STATUS: COMPLETED
