# Sprint 3 — Fondations infra & DB : secrets, Flyway, audit JPA

Milestone : **Sprint 3** (#3) · Cohésion ~0.4 · Base : `dev`

## Objectif
Durcir les fondations : externaliser les secrets compromis, versionner le schéma avec Flyway (fin du `ddl-auto=update`), poser l'audit JPA (timestamps + verrou optimiste `@Version`) prérequis de la gestion de conflit 409 (Wave 6).

## Issues livrées (3)

### #34 — Externaliser les secrets + rotation jwt.secret (P0, sécurité)
- `spring.datasource.password` et `jwt.secret` lus via `${DB_PASSWORD}` / `${JWT_SECRET}` (plus de secret en clair dans `application.properties`).
- Profils `application-dev.properties` (defaults locaux) / `application-prod.properties` (fail-fast : aucun default → boot prod refusé sans secret).
- `application.properties.example` + `frontend/.env.example` (doc des variables, sans valeurs).
- `.gitignore` corrigé (vrai chemin `backend/src/main/resources/application.properties`). Fichier gardé tracké mais secret-free (corriger l'ignore ne dé-tracke pas un fichier déjà suivi).
- ⚠️ Rotation effective des vraies valeurs = hors-repo. Les anciens secrets restent dans l'historique git → follow-up BFG.

### #42 — Adopter Flyway + baseline + contraintes uniques (P1)
- `flyway-core` (BOM Boot 3.2.2 = Flyway 9.22.3 ; `flyway-database-postgresql` n'existe qu'en Flyway 10+, non ajouté).
- `V1__baseline.sql` (schéma Hibernate : users/products/events/categories, PK uuid, FK nommées).
- `V2__unique_constraints.sql` : `uq_users_username` + `uq_users_email` (Option A : V1 omet les uniques inline, V2 les pose nommées ; `@Column(unique=true)` conservé, `validate` n'audite pas les uniques → 0 redondance).
- `ddl-auto=validate` (dev + prod) + `baseline-on-migrate=true`.
- 🔧 **Donnée dev assainie** (validée avec le mainteneur) : 3 comptes partageaient `loic.de-laforcade@emgsa.ch` → 3 UPDATE (plus-addressing, réversible, aucune perte — les comptes possèdent des produits). Sans ça, V2 cassait au boot.

### #43 — Audit JPA : timestamps + @Version + equals/hashCode (P1, transversal)
- `@EnableJpaAuditing` + sur les 4 entités : `@EntityListeners(AuditingEntityListener.class)`, `@CreatedDate createdAt`, `@LastModifiedDate updatedAt`, `@Version Integer`, `equals/hashCode`.
- `equals/hashCode` = pattern Vlad Mihalcea (id `@GeneratedValue` transient) : `hashCode()=getClass().hashCode()`, `equals()` compare l'id non-null + même type.
- `V3__add_audit_columns.sql` : `created_at`/`updated_at timestamp NOT NULL DEFAULT now()`, `version integer NOT NULL DEFAULT 0` (DEFAULT = backfill des lignes existantes ; types alignés sur `validate`).

## Vagues d'exécution
Chaîne strictement séquentielle (fichiers/migrations partagés) : V1 #34 → V2 #42 → V3 #43.

## Tests
- Backend : **32 / 32 verts, 0 failure, 0 error** (`cd backend && SKIP_DELEGATION=1 DB_PASSWORD=motdepasse mvn test`).
- Flyway : « Successfully validated 4 migrations », schéma `public` version 3, Hibernate `validate` OK.
- Nouveaux tests : `AuditingAndEqualityTest` (3, `@Transactional`).
- Audit complet : `docs/memory/audits/sprint-3-test-coverage.md`.

## Review (3 reviewers : général + db-expert + security-expert)
- **Corrigé** : `ProductEntity.id` → `private` (cohérence des 4 entités).
- **Faux positif** : « DB_PASSWORD commun sans default casse le boot dev » — le profil dev surcharge (`${DB_PASSWORD:…}`), boot vérifié vert.
- **Non corrigeable sans violer Flyway** : rollback-comments sur V1/V2/V3 (déjà appliquées → checksum) → convention pour migrations futures.
- **Follow-ups** (voir ci-dessous).

## Follow-ups identifiés (à trier au `/sprint end`)
- Isolation des tests d'intégration (Testcontainers / profil test) — les `@SpringBootTest` tapent la base dev réelle (gap pré-existant).
- Index sur les colonnes FK (`products.category_id/user_id`, `events.product_id`) → nouvelle migration V4 (perf).
- `SPRING_PROFILES_ACTIVE` défaut `dev` : durcir pour qu'un prod sans la variable ne tombe pas sur le profil dev (mitigé : DB URL dev = localhost).
- `.gitignore` : convention « jamais de vraie valeur » dans `application-dev/prod.properties` (tracking par convention, pas par protection git).
- Nettoyage historique git des anciens secrets (BFG/filter-branch — validation requise).
- Default DB password du profil dev (`motdepasse_dev_local`) ≠ vrai mot de passe local (`motdepasse`).

## Note workflow
Le subagent #34 a initialement committé dans le checkout principal (`dev`) ; recovery par cherry-pick propre sur `sprint/3` (conflit rate-limit #33 résolu, fichiers `mobile/gradlew*` hors-scope écartés). Les vagues #42/#43 ont été épinglées au worktree (commits corrects sur `sprint/3`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
