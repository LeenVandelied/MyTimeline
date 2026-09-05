# Issue #42 — Adopter Flyway + baseline + contraintes uniques — COMPLETED

**Commits :** bb70830 (sprint/3)
**Vague :** V2

## Résumé
Flyway adopté, baseline V1 (4 tables users/products/events/categories + PK + 3 FK nommées), contraintes uniques V2 nommées, ddl-auto durci. Code PROUVÉ correct sur base Postgres vierge (Flyway V1+V2 OK, Hibernate `validate` OK, BUILD SUCCESS).

## Fichiers
- `backend/pom.xml` — `flyway-core` seul (BOM Boot 3.2.2 = Flyway 9.22.3 ; `flyway-database-postgresql` n'existe qu'en Flyway 10+ → NE PAS l'ajouter sous Boot 3.2.x). Commentaire pom note l'ajout requis si upgrade Boot 3.3+/Flyway 10+.
- `db/migration/V1__baseline.sql` (NEW) — schéma Hibernate exporté (metadata), uniques users volontairement OMISES.
- `db/migration/V2__unique_constraints.sql` (NEW) — `uq_users_username` + `uq_users_email` (noms stables = AC).
- `application-dev.properties` — ddl-auto `update`→`validate` (prod déjà validate).
- `application.properties` — `spring.flyway.enabled/baseline-on-migrate=true/locations`.

## Décision technique (Option A)
Baseline V1 omet les uniques inline, V2 pose les contraintes NOMMÉES ; `@Column(unique=true)` conservé sur l'entité (`validate` ne contrôle pas les uniques → aucun conflit). DB = source unique des noms stables. Schéma final = exactement 2 uniques nommées, 0 redondance.

## Résolution blocage (dev decision : clean dirty data)
La suite `@SpringBootTest` était rouge car la base dev `eventmanager` avait 3 users à email dupliqué (`loic.de-laforcade@emgsa.ch`). Les 3 comptes (testtest3, nouveluser, Nouveautest) possèdent chacun des produits → DELETE écarté (perte de données). Résolu par 3 UPDATE (plus-addressing, réversible, validé par le dev) :
- `loic.de-laforcade+testtest3@emgsa.ch`, `+nouveluser@`, `+nouveautest@`.
Après cleanup : Flyway applique V1+V2 sur la base dev (schema version 2), unicité email/username effective.

## Tests (après cleanup)
Suite backend complète VERTE : **29 tests, 0 failures, 0 errors** (`cd backend && SKIP_DELEGATION=1 DB_PASSWORD=motdepasse mvn test`). Flyway "Successfully validated 3 migrations", schema "public" version 2, Hibernate `validate` OK.

## État laissé
Base dev `eventmanager` : `flyway_schema_history` à V2 (V1 baseline + V2 uniques appliquées). Emails dédupliqués. Schéma cohérent avec les entités.

## Signaux mémoire
- [MEMORY:decision] Boot 3.2.2 = Flyway 9.22.3 (pas 10). En 9.x, support Postgres dans flyway-core ; `flyway-database-postgresql` inexistant. Ne pas l'ajouter sous Boot 3.2.x (erreur `version is missing`).
- [MEMORY:decision] Baseline Flyway vs @Column(unique) : Option A — V1 omet uniques inline, V2 contraintes nommées, @Column(unique=true) conservé.
- [MEMORY:pitfall] `ddl-auto=update` ne fiabilise PAS la création des contraintes UNIQUE (dump live sans uniques malgré @Column(unique) de #32). Toujours poser les contraintes explicitement en migration.

## Recommandations suite
- RECOMMAND_FOLLOWUP : isoler les tests d'intégration (profil test / Testcontainers) au lieu de taper la base dev réelle — gap pré-existant (pas d'application-test.properties, pas de Testcontainers/H2). Tous les `@SpringBootTest` dépendent de l'état de la base dev. (Partie « dédup emails » du chip task_d9b2cff4 = FAITE.)
- RECOMMAND_FOLLOWUP : default DB password du profil dev (`motdepasse_dev_local`) ≠ vrai mot de passe local (`motdepasse`) → boot dev/test exige `DB_PASSWORD=motdepasse` en env. Aligner le default ou documenter.
- Pas de RECOMMAND_DB_EXPERT : migration triviale et validée.
- categories : pas de contrainte unique ajoutée (AC ne liste que users). BR-CAT-001 séparément si besoin.

STATUS: COMPLETED
