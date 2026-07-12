# Issue #224 — Garde CI anti-drift BOM Boot (done)

**Commit :** `cd03cf8`

## Résumé
Approche = **test JUnit pur** (pas de diff `dependency:tree`, jugé plus fragile). Fichier `backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` (163 l, 6 `@Test`, aucune annotation Spring → pas de Docker/Postgres, ~0.065s). Ramassé par le job backend existant (`mvnw verify` → `**/*Test.java`) → **aucune modif `ci.yml` ni `pom.xml`** (aucun `<*.version>` réintroduit).

Scope adapté par #260 : les overrides que #224 devait garder ont été retirés (#260). La garde asserte donc les versions **effectives managées par le BOM** via un plancher `>=` CVE-corrective (pas égalité — éviter faux échec à chaque bump légitime).

## Planchers assertés (chacun = une CVE à ne pas régresser)
| Lib | Plancher `>=` | Effectif | CVE protégée |
|-----|:---:|:---:|---|
| spring-security | 6.5.9 | 6.5.11 | CVE-2026-22732 / CVE-2025-41232 |
| spring-framework | 6.2.19 | 6.2.19 | — |
| tomcat | 10.1.55 | 10.1.55 | CVE-2026-41293 / 43512 / 43515 |
| jackson | 2.18.8 | 2.21.4 | CVE-2026-54512 / 54513 |
| postgresql | 42.7.11 | 42.7.11 | CVE-2026-42198 |
| flyway | 11.7.2 | 11.7.2 | alignement module PG |

## Détail technique (correctness)
- Lecture version : accesseurs statiques (`SpringSecurityCoreVersion.getVersion()`, `SpringVersion.getVersion()`, `ServerInfo.getServerNumber()`, `VersionPrinter.getVersion()`).
- jackson `PackageVersion.VERSION` + postgresql `DriverInfo.DRIVER_VERSION` lues **par réflexion** : ce sont des constantes `static final` → sinon inlinées à la compilation (refléteraient le jar de compile, pas le runtime).
- Comparateur **sémantique par composants numériques** (évite le piège lexicographique `6.2.19` < `6.2.9`).
- Run : `Tests run: 6, Failures: 0, Errors: 0` — BUILD SUCCESS.

## Fichiers
- `backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` (nouveau)

## Signaux mémoire
- **[MEMORY:pattern]** Asserter la version effective d'une lib au runtime test sans Spring : test unitaire pur lisant accesseurs statiques + réflexion sur constantes `static final` (sinon inlinées) + comparateur sémantique numérique. Anti-patterns : égalité stricte (casse à chaque bump légitime) ; comparaison lexicographique de chaînes.

## Recommandations suite
Aucune (pas de RECOMMAND_TEST_RUNNER — 6 tests, <1s).

STATUS: COMPLETED
