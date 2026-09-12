# Issue #111 — Garde-fou fail-fast profil dev en prod — DONE

**Commit :** 0a0973c
**Fichiers :** infrastructure/config/ProfileSafetyGuard.java + META-INF/spring.factories + application.properties (commentaire) + .example + ProfileSafetyGuardTest.java + docs/runbook/deploiement-profils.md
**Résumé :** Option 2 retenue — garder `${SPRING_PROFILES_ACTIVE:dev}` + garde-fou fail-fast. Suppression sèche du défaut (option 1) casserait mvn/IDE/tests ; doc-only (option 3) = défense passive.
- ProfileSafetyGuard = ApplicationListener<ApplicationEnvironmentPreparedEvent> (via spring.factories, s'exécute avant le contexte) : refuse le boot si profil `dev` actif ET marqueur ENVIRONMENT/APP_ENV=production|prod. Double signal prod requis.
- Impact confort dev : NUL (marqueur absent en local → fallback dev intact).

**Tests :** ProfileSafetyGuardTest 6/6 (MockEnvironment, sans Docker) + smoke boot OK. Suite finale full = 55/55 green.

**[MEMORY:decision]** Garder default dev + ApplicationListener fail-fast plutôt que suppression ou doc-only.
**[MEMORY:pattern]** Garde au démarrage testable sans Docker : ApplicationListener<ApplicationEnvironmentPreparedEvent> via spring.factories + test MockEnvironment. Anti-pattern @PostConstruct (trop tard).
**[MEMORY:pitfall]** Linter du repo revert les commentaires ajoutés à application.properties → re-Read + ré-Edit.

## Recommandations suite
- RECOMMAND_FOLLOWUP : #118 (vague 3) doit documenter `ENVIRONMENT=production` à côté de COOKIE_DOMAIN dans la procédure prod ; ancrage = runbook deploiement-profils.md.
- Note : garde-fou couvre uniquement dev-en-prod (cas inverse prod-en-local non gardé, acceptable).

STATUS: COMPLETED
