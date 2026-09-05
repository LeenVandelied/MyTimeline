# Issue #37 — Docker compose dev + Dockerfiles

**Commit :** 591e30b
**Scope livré :** implémentation complète, validée end-to-end.

## Fichiers
Créés : `backend/Dockerfile` (multi-stage maven→temurin-21-jre, non-root, HEALTHCHECK /actuator/health), `frontend/Dockerfile` (multi-stage standalone node:20-alpine, ARG NEXT_PUBLIC_API_URL baké au build), `docker-compose.yml` (postgres:16 pg_isready + backend depends_on healthy + frontend ; volumes nommés ; ports 5432/8080/3000), `.env.example`, `backend/.dockerignore`, `frontend/.dockerignore`.
Modifiés : `backend/pom.xml` (+spring-boot-starter-actuator), `SecurityConfig.java` (`/actuator/health` permitAll), `frontend/next.config.mjs` (`output: 'standalone'`, rewrites next-intl/E2E préservés).

## Vérifs exécutées (toutes OK)
- `./mvnw compile` OK · `docker compose config` OK
- `docker compose build backend` + `frontend` OK
- `docker compose up -d` : postgres Healthy → backend Healthy `{"status":"UP"}` (DB check inclus) → frontend HTTP 307 (redirect locale next-intl)
- `docker compose down` OK (sans `-v`, volumes conservés)

## Signaux mémoire (à consolider en /sprint end)
- [MEMORY:pattern] Healthcheck Docker Spring Boot sans Actuator → starter-actuator + `/actuator/health` permitAll (health seul, show-details=never) + `curl` installé dans l'image temurin-jre (absent par défaut). Anti-pattern : HealthController maison.
- [MEMORY:pitfall] RTK proxy tronque/mélange la sortie de `docker compose build/ps` → rediriger vers log + Read ; exit code fiable, stdout non.
- [MEMORY:decision] `NEXT_PUBLIC_API_URL=http://localhost:8080/api` (URL hôte, pas nom de service compose) car l'appel part du NAVIGATEUR sur l'hôte.

## Notes
- Stack réelle = Spring Boot **3.4.13** (pas 3.2.2 du CLAUDE.md/briefing) — sans impact. → mémoire stack à corriger.
- `backend/pom.xml.correct` traîne en untracked (pré-existant, hors scope, non touché) — cleanup à arbitrer.

## Recommandations suite
- RECOMMAND_TEST_RUNNER : lancer la suite backend (impact `SecurityConfig` + actuator) avant PR.

## STATUS
COMPLETED
