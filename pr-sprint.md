## Sprint 5 — Durcissement DB & profils + dette reviews auth (S1–S4)

Sprint backend-only. Plan architect = 3 issues DB/profils ; **scope élargi par décision dev aux 8 issues du milestone** (ajout des 5 follow-ups auth/infra du triage S4). Cohésion volontairement dégradée (2 domaines), arbitrage assumé.

### Issues livrées (8)

**DB / profils (epic:devops)**
- **#108** — `V4__reconcile_events_constraints.sql` : CHECK + NOT NULL + varchar(20) sur `events.type/duration_unit/recurrence_unit`, absents de la baseline V1 (générée ex-métadonnées Hibernate). Idempotent (DROP IF EXISTS), enums croisés sur 3 sources (Utils backend + Zod frontend).
- **#110** — `V5__fk_indexes.sql` : index sur les colonnes FK (`products.category_id/user_id`, `events.product_id`) — PG ne les crée pas automatiquement.
- **#111** — `ProfileSafetyGuard` (ApplicationListener via `spring.factories`) : fail-fast si profil `dev` actif alors qu'un marqueur `ENVIRONMENT/APP_ENV=production` est présent. Garde le confort dev local intact.

**Auth / config (epic:auth, dette reviews S1–S4)**
- **#116** — body 401 BadCredentials → JSON `{"error":...}` (BR-AUT-005, message neutre). Frontend vérifié (0 usage en dur).
- **#117** — test profil dev : cookie JWT `Secure=false` + domaine `localhost` (classe dédiée, charge le vrai `application-dev.properties`).
- **#118** — doc `COOKIE_DOMAIN` prod : runbook consolidé en hub unique (`deploiement-profils.md`) listant toutes les env prod obligatoires.
- **#119** — 403 unifié sur `SecurityConfig.accessDeniedHandler` (suppression du handler mort dans `GlobalExceptionHandler`) ; test migré `standaloneSetup` → `@SpringBootTest` (chaîne Security réelle).
- **#120** — CORS externalisé (`app.cors.allowed-origins`, default fail-safe localhost, prod `${CORS_ALLOWED_ORIGINS}` fail-fast), `Authorization` retiré de `exposedHeaders`, SameSite maintenu `Lax` (justifié + runbook).

### Vagues d'exécution
- **V1** (∥) : #108 + #111 + #116 + #119
- **V2** (∥) : #110 + #117
- **V3** : #120 (solo — `SecurityConfig` + properties partagées)
- **V4** : #118 (solo — `application-prod.properties` partagé avec #120)

Matrice conflits respectée : `AuthControllerSecurityTest` (#116→#117), `SecurityConfig` (#119→#120), `application.properties` (#111), `application-prod.properties` (#120→#118), migrations (#108→#110).

### Migrations Flyway
`V4__reconcile_events_constraints.sql` + `V5__fk_indexes.sql` (schéma `public` → version 5). V1/V2/V3 intacts (checksum).

> **Pré-déploiement (base dev peuplée uniquement)** — avant V4 : `SELECT count(*) FROM events WHERE type IS NULL;` et `SELECT max(length(type)) FROM events;` (sinon `SET NOT NULL` / `varchar(20)` échouent proprement). Base fraîche (CI/Testcontainers) : aucun blocage.

### Reviews
- **db-expert** : V4/V5 mergeable, **0 CRITIQUE**.
- **security-expert** : **0 CRITIQUE**, BR-AUT-005 / 403 / CORS / SameSite conformes.
- **reviewer** : **0 CRITIQUE**, 3 MAJEUR + MINEURs — tous **pré-existants hors scope** (aucune régression S5), **déférés en follow-ups** (décision dev). Détail : `docs/memory/sprints/sprint-5/review-batch.md`.

### Tests
**Backend 56/56 verts** (Testcontainers Postgres, BUILD SUCCESS ~11.6s). Baseline S4 = 41 → +15 (ProfileSafetyGuard 6, cookie dev 1, 401 JSON 1, ownership migré, etc.). Frontend : aucun changement → pas d'E2E. Audit : `docs/memory/audits/sprint-5-test-coverage.md` (0 `[MISSING]`).

### Follow-ups identifiés (à trier au `/sprint end`)
- Contrat erreur `/me`+`/register`+`/logout` → JSON (S | auth)
- `users.role` enum sans CHECK DB → V6 (S | devops)
- `writeJsonError` concat / `buildBody` reasonPhrase (XS | auth/events)
- BR-PRO-006 full scan (idx_products_user inexploité tant que requête non réécrite)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
