# Issue #260 — Upgrade Spring Boot 3.5.x (done)

**Commits :** `a9fc47d` (bump Boot) + `bb6120a` (fix sprint# doc, lead)

## Résumé
Bump parent BOM `spring-boot-starter-parent 3.4.13 → 3.5.16` (dernière 3.5.x stable). Résout les 3 CVE HIGH acceptées en S31 :
- CVE-2026-40973 (fix @3.5.14+), CVE-2026-22731 & CVE-2026-22733 (fix @3.5.12+).

Les 6 overrides `<*.version>` #180/#223 sont TOUS devenus superflus (BOM 3.5.16 ≥ correctifs) → **retirés**. Conservés hors BOM : `jjwt 0.13.0`, `docker.api.version 1.44` (surefire). Module `flyway-database-postgresql` toujours requis (Flyway 11.7.2).

## Versions effectives POST-upgrade (input pour #224)
- Parent : `spring-boot-starter-parent 3.5.16`
- Overrides restants (hors BOM) : `jjwt.version=0.13.0`, `docker.api.version=1.44`
- Managées par le BOM (à asserter par #224 via help:evaluate / dependency:tree) :
  - `spring-security=6.5.11`, `spring-framework=6.2.19`, `tomcat=10.1.55`,
    `jackson-bom=2.21.4`, `postgresql=42.7.11`, `testcontainers=1.21.4`, `flyway=11.7.2`

## Tests
- Testcontainers full suite : **355 tests, 0 échec, 0 skip (47s)**. StatelessSessionGuardTest + règle ArchUnit `productionCodeShouldNotUseHttpSession` incluses & vertes. Flyway 11 rejoue V1..V13 sans dérive, `ddl-auto=validate` OK.
- `trivy 0.69.4 fs --severity HIGH,CRITICAL backend/` = **0 CRITICAL / 0 HIGH** (down 3→0).

## Fichiers
- `backend/pom.xml` (parent + suppression overrides)
- `docs/security/cve-acceptance.md` (3 CVE Boot → section « résolues »)

## Signaux mémoire
- **[MEMORY:decision]** Retirer tous les overrides `<*.version>` #180/#223 après bump Boot 3.5.16 (BOM manage ≥ correctifs). Seul override justifié restant : jjwt (non BOM). `docker.api.version=1.44` + module `flyway-database-postgresql` restent obligatoires.

## Recommandations suite
Aucune. Pas de RECOMMAND_SECURITY (config Spring Security inchangée, session STATELESS). Pas de RECOMMAND_TEST_RUNNER (suite < 500 tests / < 3 min).

STATUS: COMPLETED
