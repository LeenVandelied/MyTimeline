# Issue #180 — CVE CRITICAL post-Boot 3.4.4 (bump spring-security / tomcat)

**Vague :** 1 (∥ #167) · **Modèle :** opus/high · **Statut :** livré

## Commits
- `094e5ae1b11c3395e83fb36153a6904cce1ce7a8` (backend/pom.xml uniquement)

## Résumé
- Versions effectives (`./mvnw dependency:tree`) :
  - Spring Boot **3.4.4 → 3.4.13** (parent)
  - spring-security-web/core/config **6.4.4 → 6.5.11** (override property `spring-security.version`)
  - tomcat-embed-core **10.1.39 → 10.1.56** (override `tomcat.version`)
  - spring-framework **6.2.15 → 6.2.19** (aligné — floor requis par SS 6.5.11)
- trivy 0.69.4 : **AVANT 5 CRITICAL** (3× tomcat CVE-2026-41293/43512/43515 + CVE-2025-41232 + CVE-2026-22732) → **APRÈS 0 CRITICAL** ✅. (4 HIGH résiduelles hors périmètre, non bloquantes pour le gate #167 CRITICAL-only.)
- Tests : `./scripts/test-quiet.sh backend` = **270 run, 0 fail, 0 error** (Testcontainers Postgres 16). 7 classes sécurité (auth/session/CORS/rate-limit) exécutées → aucune régression.
- Smoke : 18 `@SpringBootTest` bootent contexte + filter-chain SS 6.5 + Flyway sur Postgres réel (verts). Prod jar repackagé OK (56.6M). Boot profil `prod` standalone non lancé (fail-fast sans secrets live en worktree — documenté).

## [MEMORY:pitfall]
CVE-2026-22732 (spring-security-web) **N'EST PAS backportée sur 6.4.x** (6.4.13 encore vulnérable, vérifié trivy). Le brief supposait « 6.4.6+ résout les deux CVE » → FAUX. Fix réel = SS 6.5.9+/7.0.4. Rester sur ligne Boot 3.4.x impose override `spring-security.version=6.5.x` + aligner `spring-framework.version=6.2.19` (sinon skew avec le pin BOM 6.2.15).

## [MEMORY:decision]
Ligne Boot 3.4.x conservée (bump patch) plutôt que montée minor 3.5 : overrides Maven ciblés SS/tomcat/SF tous patch-level → moindre surface de régression. SS 6.5.11 + SF 6.2.19 + Boot 3.4.13 compatibles (même minor SF 6.2), validé 270 tests + package.

## Recommandations suite
- RECOMMAND_FOLLOWUP [devops] : 4 CVE **HIGH** résiduelles subsistent (non bloquantes gate #167 CRITICAL-only). À trier hors #180.
- RECOMMAND_SECURITY **NON déclenché** : DSL SecurityConfig inchangé, aucune API filtre/CORS breaking en SS 6.5, tests verts. Bump comportementalement neutre.
- Note concurrence : `target/` propre après `package` — #123 peut builder maintenant sans collision.

STATUS: COMPLETED
