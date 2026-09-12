-- =============================================================
-- V11__events_conditional_check_constraints.sql — Filet DB conditionnel sur
-- la PRÉSENCE des unités selon la nature de l'event (issue #128, BR-EVE-004 /
-- BR-EVE-006).
--
-- CONTEXTE : les contraintes events existantes portent sur le DOMAINE DE VALEURS
--   - ck_events_type            (V4)      : type IN ('duration','single')
--   - ck_events_duration_unit   (V4)      : duration_unit IS NULL OR IN ('days','weeks','months','years')
--   - ck_events_recurrence_unit (V7/V9)   : recurrence_unit IS NULL OR IN ('WEEK','MONTH','YEAR')
-- V11 ajoute une garantie DIFFÉRENTE et COMPLÉMENTAIRE : la PRÉSENCE (NOT NULL)
-- de l'unité conditionnée par type / is_recurring. Filet DB derrière les
-- validations applicatives déjà livrées ce sprint (#164 Utils null-guard 422,
-- #168 Bean validation, BR-EVE-006 garde service PATCH). Ne remplace PAS ces
-- couches : dernière ligne de défense contre une écriture SQL directe / un bug
-- applicatif.
--
-- CONTRAINTES POSÉES :
--   1. ck_events_duration_unit_required
--        type <> 'duration'  OR  duration_unit IS NOT NULL
--        (un event 'duration' DOIT porter une durée d'unité ; 'single' est libre)
--   2. ck_events_recurrence_unit_required
--        is_recurring IS NOT TRUE  OR  recurrence_unit IS NOT NULL
--        (un event récurrent DOIT porter une unité de récurrence)
--
-- ⚠️ SÉMANTIQUE NULL (PostgreSQL) :
--   - Un CHECK n'échoue QUE si la condition s'évalue à FALSE. NULL => la ligne
--     passe. D'où le choix de `is_recurring IS NOT TRUE` (et pas `= false`) :
--     is_recurring est NULLABLE (V1 baseline), et `NULL = false` vaut NULL
--     (accepté) alors que `NULL IS NOT TRUE` vaut TRUE (accepté aussi) — les deux
--     n'exigent l'unité QUE pour is_recurring strictement TRUE. Intention métier
--     respectée : seul un event explicitement récurrent requiert l'unité.
--   - type est NOT NULL (V4) ; `type <> 'duration'` est donc soit TRUE soit FALSE.
--
-- ROBUSTESSE PROD (base peuplée) : un `ADD CONSTRAINT` échoue si des lignes non
-- conformes préexistent. Testcontainers repart d'une base construite par les
-- migrations (aucun legacy) ; en prod la cible est propre (nets applicatifs
-- #164/#168 déjà en place). Par prudence — et à l'image de V9 pour
-- recurrence_unit — on NEUTRALISE défensivement AVANT l'ADD les rares lignes
-- historiques incohérentes, plutôt que de faire avorter la migration :
--   - event 'duration' sans duration_unit -> reclassé 'single' (l'event survit ;
--     endDate n'est pas recalculée par la migration, mais la ligne cesse de
--     prétendre à une durée qu'elle ne porte pas). Choix documenté, réversible
--     conceptuellement mais l'unité d'origine étant ABSENTE il n'y a rien à
--     restaurer.
--   - event is_recurring=true sans recurrence_unit -> is_recurring repassé false
--     (la récurrence sans unité est inexploitable ; on retire le flag orphelin).
-- Sur base fraîche/propre ces UPDATE ne touchent AUCUNE ligne (no-op idempotent).
--
-- ddl-auto=validate : V11 ne modifie AUCUNE colonne/type (schéma JPA inchangé),
-- uniquement des données résiduelles + 2 CHECK. Aucun impact mapping Hibernate.
--
-- NE PAS éditer V1..V10 (déjà appliquées -> checksum mismatch Flyway). V11 only.
-- =============================================================

-- 1. Neutralisation défensive (no-op sur base propre) — AVANT l'ADD CONSTRAINT.
update events
    set type = 'single'
    where type = 'duration'
      and duration_unit is null;

update events
    set is_recurring = false
    where is_recurring is true
      and recurrence_unit is null;

-- 2. duration_unit requis quand type='duration'.
alter table events
    drop constraint if exists ck_events_duration_unit_required;

alter table events
    add constraint ck_events_duration_unit_required
    check (type <> 'duration' or duration_unit is not null);

-- 3. recurrence_unit requis quand is_recurring=true.
alter table events
    drop constraint if exists ck_events_recurrence_unit_required;

alter table events
    add constraint ck_events_recurrence_unit_required
    check (is_recurring is not true or recurrence_unit is not null);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo ; la neutralisation
-- défensive des lignes incohérentes est IRRÉVERSIBLE : l'unité manquante n'a
-- jamais existé, il n'y a rien à restaurer) :
--   alter table events drop constraint if exists ck_events_recurrence_unit_required;
--   alter table events drop constraint if exists ck_events_duration_unit_required;
-- =============================================================
