# Issue #108 — V4 réconcilier contraintes events — DONE

**Commit :** 66f1b96
**Fichiers :** db/migration/V4__reconcile_events_constraints.sql (idempotent, +71)
**Résumé :** Pose CHECK + NOT NULL legacy absents de V1 (baseline générée ex-métadonnées Hibernate, pas pg_dump).
- events.type → varchar(20) NOT NULL + ck_events_type CHECK IN ('duration','single')
- duration_unit → ck nullable IN ('days','weeks','months','years') ; recurrence_unit → ck nullable IN ('weeks','months','years')
- Enums NON devinés : croisés Utils.calculateEndDate (backend) + eventCreationSchema Zod (frontend) + briefing.
- Idempotence : DROP CONSTRAINT IF EXISTS avant ADD ; CHECK nullables via `col is null or col in (...)`. Rollback commenté. V1/V2/V3 intacts.
- Drift autres tables : products/categories = pas d'enum-like. users.role = enum implicite sans CHECK → follow-up.

**Tests :** test-quiet.sh unit → 49 run 0 fail (au run agent). Suite finale full = 55/55 green.

**[MEMORY:pitfall]** Baseline Flyway générée depuis Hibernate metadata ne capture ni CHECK ni NOT NULL ni longueur → drift base fraîche vs base dev. Fix : générer baseline depuis `pg_dump --schema-only`. Réconciliation = migration séparée DROP IF EXISTS + CHECK nullable.
**[MEMORY:decision]** V4 séparée plutôt qu'édition V1 (checksum Flyway).
**[MEMORY:pattern]** Aligner CHECK SQL sur enum applicatif en croisant 3 sources, jamais deviner.

## Recommandations suite
- RECOMMAND_DB_EXPERT : review V4 (sémantique CHECK, idempotence, vérifier events.type ≤20 chars en données réelles avant prod).
- RECOMMAND_FOLLOWUP [S | devops] : auditer drift legacy `users.role` (varchar(255) free-text, enum implicite ROLE_USER/ROLE_ADMIN sans CHECK/NOT NULL) via pg_dump vs V1 ; éventuel V6 si confirmé.

STATUS: COMPLETED
