# Mini-plans architect — Sprint 34

> Généré par /sprint plan (architect, 2026-07-12). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implémentation").
> Thème : Supply-chain / CVE platform upgrade — cohésion 0.55 | Migrations : aucune | Dépend de : aucune (racine)

```yaml
issue_0260:
  fichiers_cles: ["backend/pom.xml", "docs/security/cve-acceptance.md", "backend/src/test/java/.../StatelessSessionGuardTest.java"]
  couches_touchees: ["build","infrastructure"]
  strategie_test: "integration (Testcontainers full suite verte + trivy 0 HIGH Boot)"
  risque_regression: "Boot 3.5 déplace le BOM → skew sur overrides (spring-security/tomcat/spring-framework/flyway/jackson) ; ddl-auto=validate impose que Testcontainers rejoue V1..V13 sans dérive."
  ordre_ecriture: "pom (parent+overrides) → revalider flyway.version (Boot 3.5 bump Flyway) → run Testcontainers → trivy → doc"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "pom parent = 3.4.13 confirmé ; 3 CVE HIGH toujours acceptées dans docs/security/cve-acceptance.md."
issue_0261:
  fichiers_cles: ["frontend/package.json", "frontend/package-lock.json"]
  couches_touchees: ["frontend/build"]
  strategie_test: "integration (build + suite frontend + non-régression i18n routes localisées)"
  risque_regression: "bump next-intl peut casser le routing i18n (middleware localisé) ; postcss XSS possiblement sans fix upstream → documenter au lieu de forcer."
  ordre_ecriture: "bump next-intl → build → vérif routes /es /de /fr + formats → statuer postcss (fix ou veille tracée)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "next ^15.2.4 + next-intl présents ; CVE MODERATE PROD non résolues."
issue_0224:
  fichiers_cles: ["backend/pom.xml", ".github/workflows/ci.yml", "backend/src/test/java/.../BomDriftTest.java (option JUnit)"]
  couches_touchees: ["build","CI"]
  strategie_test: "integration (diff mvn dependency:tree versionné OU test assertant versions effectives)"
  risque_regression: "garde trop strict = faux échec CI à chaque bump légitime ; commenter le POURQUOI des overrides."
  ordre_ecriture: "après #260 : capturer le BOM post-upgrade → garde reflète ce BOM"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: ".github/workflows/ci.yml existe ; aucun garde anti-drift BOM."
```
