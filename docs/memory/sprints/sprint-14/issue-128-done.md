# Issue #128 — Contraintes CHECK conditionnelles DB events (V11) — DONE

## Résultat
Commit `8494edc` (:card_file_box: V11 contraintes CHECK conditionnelles events). Suite complète **237 run, 0 fail** sous Flyway 10.20.1.

## Migration V11 (`V11__events_conditional_check_constraints.sql`)
Numéro = V11 (dernière réelle = V10__create_sessions ; le `ls` masquait V10 via tri lexicographique / cache rtk — compté à la main / `find`).
- `ck_events_duration_unit_required` : `type <> 'duration' OR duration_unit IS NOT NULL`
- `ck_events_recurrence_unit_required` : `is_recurring IS NOT TRUE OR recurrence_unit IS NOT NULL` (`IS NOT TRUE` car `is_recurring` NULLABLE V1 → NULL toléré, unité exigée seulement si strictement true).
- Neutralisation défensive AVANT ADD (pattern V9), idempotente, no-op sur base propre : `duration` sans unité → reclassé `single` ; `is_recurring=true` sans unité → `false`.
- Distinct des CHECK domaine-de-valeurs existants (V4 duration_unit, V7/V9 recurrence_unit) : filet sur la PRÉSENCE, complémentaire à #164 (déjà résolu) / #168 (Bean).

## Tests
- `EventConditionalCheckConstraintIntegrationTest` (Postgres jetable, SQL natif) : 2 rejets DB (duration+unit NULL ; recurring+unit NULL) + 4 non-régression (duration+unit, single sans unit, recurring+unit, is_recurring NULL). 6/6 verts.

## Commits
- `8494edc` — V11__...sql (+88), EventConditionalCheckConstraintIntegrationTest.java (+148).

## Signaux
- `[MEMORY:pattern]` Présence conditionnelle d'une colonne selon un discriminant NULLABLE : `CHECK (discriminant IS NOT TRUE OR col IS NOT NULL)` (jamais `= false` — `NULL = false` = NULL) + neutralisation idempotente AVANT ADD (pattern V9). Anti-pattern : `ADD CONSTRAINT` sec sur base prod peuplée → avorte la migration.

## Recommandations suite
- **RECOMMAND_DB_EXPERT** : review rollback / impact volume — la neutralisation reclasse SILENCIEUSEMENT des lignes legacy (`duration`→`single`, `recurring`→`false`). Valider que la perte sémantique est acceptable en prod + confirmer qu'aucun index n'est requis sur ces CHECK. → spawn db-expert ce sprint.

STATUS: COMPLETED
