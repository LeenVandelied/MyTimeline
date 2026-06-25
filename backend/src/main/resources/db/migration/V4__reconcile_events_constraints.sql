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

-- =============================================================
-- PRÉ-VOL (review PR #121) — auto-sécurité sur base PEUPLÉE.
-- spring.flyway.baseline-on-migrate=true : V4 s'applique aussi à la base dev
-- réelle (et future prod), pas seulement aux bases fraîches CI/Testcontainers.
-- Les ALTER ci-dessous (SET NOT NULL, varchar(20), CHECK) échoueraient avec une
-- erreur Postgres cryptique si des données non conformes existent. On échoue
-- TÔT avec un message actionnable, SANS coercition silencieuse des données
-- (une ligne non conforme est un bug de données → le dev tranche, pas la migration).
-- Sur base fraîche/vide : tous les compteurs = 0 → la migration continue.
do $$
declare
    v_type_null   bigint;
    v_type_long   bigint;
    v_type_enum   bigint;
    v_dur_enum    bigint;
    v_rec_enum    bigint;
begin
    select count(*) into v_type_null from events where type is null;
    select count(*) into v_type_long from events where length(type) > 20;
    select count(*) into v_type_enum from events where type is not null and type not in ('duration', 'single');
    select count(*) into v_dur_enum  from events where duration_unit is not null and duration_unit not in ('days', 'weeks', 'months', 'years');
    select count(*) into v_rec_enum  from events where recurrence_unit is not null and recurrence_unit not in ('weeks', 'months', 'years');

    if v_type_null > 0 or v_type_long > 0 or v_type_enum > 0 or v_dur_enum > 0 or v_rec_enum > 0 then
        raise exception using
            message = 'V4 abort : données events non conformes avant durcissement (#108/#121). '
                || 'type NULL=' || v_type_null
                || ', type >20 chars=' || v_type_long
                || ', type hors enum=' || v_type_enum
                || ', duration_unit hors enum=' || v_dur_enum
                || ', recurrence_unit hors enum=' || v_rec_enum
                || '. Corriger/auditer ces lignes (cf. docs/runbook/deploiement-profils.md) puis rejouer la migration.';
    end if;
end $$;
-- =============================================================

-- events.type : aligner type/longueur puis poser NOT NULL + CHECK.
-- Pré-vol ci-dessus garantit 0 ligne NULL / >20 chars / hors enum → ALTER sûrs.
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
