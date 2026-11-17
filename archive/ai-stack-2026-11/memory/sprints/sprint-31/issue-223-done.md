# Issue #223 — Trier CVE HIGH backend résiduelles post-#180

- commits: [SHA_PLACEHOLDER]
- resume: `trivy fs --severity HIGH backend/` remonte 6 HIGH (pas 4 — advisories
  ont évolué depuis brief), 0 CRITICAL. Actions :
  - **jackson-databind 2.18.5→2.18.8** (override `jackson-bom.version`) : fixe
    CVE-2026-54512 + CVE-2026-54513 (bypass PolymorphicTypeValidator → RCE). Patch.
  - **postgresql 42.7.8→42.7.11** (override `postgresql.version`) : fixe
    CVE-2026-42198 (DoS client SCRAM-SHA-256). Patch.
  - **3 CVE Boot ACCEPTÉES** (correctif = bump mineur 3.5.x seulement, hors
    périmètre patch #180, impossible à isoler du parent BOM) :
    - CVE-2026-40973 (spring-boot, session hijacking/ACE) — N/A : app STATELESS
      JWT cookie, aucune HttpSession (SecurityConfig:125).
    - CVE-2026-22731 (actuator health group additional-path) — N/A : aucune
      config `management.*`/health group.
    - CVE-2026-22733 (actuator CloudFoundry endpoints) — N/A : pas de CloudFoundry.
  - Fichier suivi : `docs/security/cve-acceptance.md` (créé).
  - Re-scan trivy : **6 HIGH → 3 HIGH acceptées, 0 CRITICAL**. Résolution
    confirmée via `mvn dependency:tree` (postgresql:42.7.11, jackson-databind:2.18.8).
  - Tests backend : `./scripts/test-quiet.sh backend` → **318 tests, 0 échec** (Testcontainers OK).
- [MEMORY:*] signaux:
  - [MEMORY:decision] Context: 3 CVE HIGH Boot (40973/22731/22733) sans patch
    3.4.x. Decision: acceptées+documentées (cve-acceptance.md) car correctif =
    bump mineur 3.5.x contredisant verrou #180 + non applicables (stateless, pas
    de CloudFoundry, pas de health group). Why: périmètre patch-release, blast
    radius plateforme, risque faible réel.
  - [MEMORY:pattern] Problem: CVE HIGH sur dépendance managée par BOM Spring Boot.
    Solution: override property BOM (`jackson-bom.version`, `postgresql.version`)
    au niveau patch sans quitter la ligne du parent. Anti-pattern: bumper le
    parent mineur pour un simple correctif de sous-dépendance.
- recommandations suite: RECOMMAND_FOLLOWUP — créer issue dédiée « upgrade
  plateforme Spring Boot 3.5.x » pour résoudre les 3 CVE Boot acceptées (bump
  mineur = re-test intégration complet, revalidation overrides SS/tomcat/flyway).
  Pas de RECOMMAND_TEST_RUNNER (suite 318 verte lancée localement). Pas de
  RECOMMAND_DB_EXPERT (aucun changement schéma).

STATUS: COMPLETED
