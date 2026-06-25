-- =============================================================
-- V4__reconcile_events_constraints.sql — Réconciliation contraintes events (issue #108)
--
-- Contexte : V1__baseline.sql a été généré depuis les métadonnées Hibernate
-- (source=metadata), pas depuis un pg_dump de la base dev réelle. Résultat :
-- la table `events` est créée SANS les contraintes d'intégrité legacy
-- présentes sur la base dev `eventmanager` (ajoutées hors Hibernate) :
--   - events.type      : varchar(20) NOT NULL + CHECK (type IN ('duration','single'))
--   - events.duration_unit   : CHECK (IN ('days','weeks','months','years'))
--   - events.recurrence_unit : CHECK (IN ('weeks','months','years'))
--
-- ddl-auto=validate ne détecte PAS ce drift (Hibernate ne valide ni CHECK
-- ni NOT NULL, et tolère les écarts de longueur varchar). Sur un déploiement
-- frais (CI, prod 1er run), events serait créée sans ces garde-fous →
-- divergence de schéma entre environnements. V4 aligne les bases fraîches
-- sur les contraintes legacy.
--
-- Valeurs d'enum alignées sur le code applicatif (NON devinées) :
--   - type            : Utils.calculateEndDate (branche "duration") + eventCreationSchema.type
--   - duration_unit   : switch days/weeks/months/years (Utils) + Zod durationUnit
--   - recurrence_unit : eventCreationSchema.recurrenceUnit (weeks/months/years)
--
-- IDEMPOTENCE OBLIGATOIRE : la base dev possède DÉJÀ ces contraintes (legacy).
-- On fait DROP CONSTRAINT IF EXISTS puis ADD pour rejouer V4 sans erreur
-- "already exists". duration_unit / recurrence_unit étant nullables (requis
-- seulement de façon conditionnelle côté applicatif), les CHECK tolèrent NULL.
--
-- NE PAS éditer V1/V2/V3 (déjà appliquées → checksum mismatch Flyway). V4 only.
-- =============================================================

-- events.type : aligner type/longueur puis poser NOT NULL + CHECK
-- (table vide sur base fraîche → SET NOT NULL sûr ; varchar(255)->varchar(20)
--  sûr car les valeurs autorisées 'duration'/'single' tiennent dans 20 chars).
alter table events
    alter column type type varchar(20);

alter table events
    alter column type set not null;

alter table events
    drop constraint if exists ck_events_type;

alter table events
    add constraint ck_events_type
    check (type in ('duration', 'single'));

-- events.duration_unit : CHECK (nullable toléré — requis seulement si type='duration')
alter table events
    drop constraint if exists ck_events_duration_unit;

alter table events
    add constraint ck_events_duration_unit
    check (duration_unit is null or duration_unit in ('days', 'weeks', 'months', 'years'));

-- events.recurrence_unit : CHECK (nullable toléré — requis seulement si is_recurring=true)
alter table events
    drop constraint if exists ck_events_recurrence_unit;

alter table events
    add constraint ck_events_recurrence_unit
    check (recurrence_unit is null or recurrence_unit in ('weeks', 'months', 'years'));

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   alter table events drop constraint if exists ck_events_recurrence_unit;
--   alter table events drop constraint if exists ck_events_duration_unit;
--   alter table events drop constraint if exists ck_events_type;
--   alter table events alter column type drop not null;
--   alter table events alter column type type varchar(255);
-- =============================================================
