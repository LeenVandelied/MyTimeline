# Issue #162 — Upgrade Spring Boot 3.2.2 → 3.4.4 LTS (CVE) — DONE

## Résultat
Commit `3a4f6ae` (:arrow_up: Spring Boot 3.2.2→3.4.4 LTS + flyway-database-postgresql + jjwt 0.13). Fichiers : `backend/pom.xml`, `JwtService.java`.

## Changements
- **Boot 3.2.2 → 3.4.4** LTS. Via BOM : tomcat-embed 10.1.39+, spring-security 6.4.4, spring-core 6.2.5, jackson, postgresql 42.7.5. → CVE de l'issue (CVE-2024-38821, CVE-2024-1597, CVE-2025-24813, jackson 2.15.3, spring-core 6.1.3) TOUTES résolues.
- **Flyway 9.22.3 → 10.20.1** (BOM) + module **flyway-database-postgresql** (support Postgres hors flyway-core dès Flyway 10 — confirme **DEC-S3-001**).
- **jjwt 0.11.5 → 0.13.0**. Adaptation `JwtService` (API breaking) : `parserBuilder()`→`parser()`, `setSigningKey`→`verifyWith`, `parseClaimsJws`→`parseSignedClaims`, `getBody`→`getPayload`, builders fluent, `Key`→`SecretKey`. **HS256 figé explicite** (`Jwts.SIG.HS256`) → tokens legacy compatibles (ne dérive plus l'algo selon la taille de clé).

## Vérifications
- `./scripts/test-quiet.sh backend` : **224 tests, 0 fail, 0 error**. Compile + test-compile OK.
- Flyway base vide : Testcontainers rejoue V1..V10 from-scratch sur Postgres 16 réel — tous `@SpringBootTest` verts (boot Flyway + module Postgres OK).
- Flyway base existante : `baseline-on-migrate=true` configuré ; approximé par Testcontainers (pas de base pré-peuplée hors migrations testée). → voir RECOMMAND_DB_EXPERT.
- trivy : CVE de l'issue = 0 résiduel.

## Signaux
- `[MEMORY:decision]` DEC-S3-001 confirmée (flyway-database-postgresql requis en Boot 3.4/Flyway 10). jjwt.version=0.13.0, HS256 figé.
- `[MEMORY:pitfall]` jjwt 0.12+ : `signWith(key)` seul déduit HS256/384/512 selon taille clé → figer `signWith(key, Jwts.SIG.HS256)` explicite sinon rupture tokens existants.

## Audit sécurité JWT (security-expert, RECOMMAND_SECURITY traité)
**Verdict : OUI, sûr à merger. Aucune correction requise.**
- [OK] HS256 figé (`signWith(key, Jwts.SIG.HS256)`) → pas d'alg-drift ; `alg:none` rejeté par `verifyWith(SecretKey)` (pas d'alg confusion).
- [OK] Révocation jti BR-AUT-011 non régressée (`getPayload().getId()` ≡ ancien `getBody().getId()`), `JwtFilter` inchangé structurellement.
- [OK] Token expiré/malformé/mauvaise signature → `JwtException` → contexte anonyme → 401 (pas 500, pas de bypass). Pas de token/secret loggé en clair.
- [OK] `jwt.secret=${JWT_SECRET}` sans défaut en prod (fail-fast). Fallback dev hardcodé = ACK-005 (dette dev acceptée).
- [MINEUR non bloquant] `validateToken` catch générique `Exception` (préexistant, pas une régression de cet upgrade).

## Recommandations suite
- **RECOMMAND_SECURITY** : ✅ traité ce sprint (audit ci-dessus, verdict OUI).
- **RECOMMAND_DB_EXPERT** : Flyway 10 + module Postgres — valider un scénario "base réelle pré-peuplée non vide" avant prod.
- **RECOMMAND_FOLLOWUP** [triage M | domaine devops] : 5 CVE CRITICAL POSTÉRIEURES à 3.4.4 (CVE-2025-41232 spring-security 6.4.6, CVE-2026-22732 spring-security-web, 3× tomcat CVE-2026-*) → bump patch-release Boot 3.4.5+/spring-security 6.4.6+/tomcat 10.1.55+. HORS périmètre "sortie EOL 3.2.x" mais à traiter.

STATUS: COMPLETED
