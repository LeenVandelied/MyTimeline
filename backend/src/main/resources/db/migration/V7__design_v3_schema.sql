-- =============================================================
-- V7__design_v3_schema.sql — Alignement modèle métier sur design v3 (issue #44)
--
-- Enrichit le schéma pour les nouvelles vues design v3 :
--   categories : + color (#RRGGBB nullable), + description (nullable)
--   events     : consolidation 3 couleurs -> 1 seule `color` (background survit),
--                recurrence_unit texte libre -> enum RecurrenceUnit(WEEK/MONTH/YEAR),
--                + recurrence_end_date (nullable), + archived (NOT NULL default false)
--   products   : + archived (NOT NULL default false), + color (nullable, override cat)
--   users      : + avatar (nullable)
--
-- ddl-auto=validate (#42) : chaque colonne DOIT matcher EXACTEMENT le mapping JPA.
--   - archived : boolean NOT NULL (EventEntity/ProductEntity `boolean archived`).
--   - recurrence_unit : varchar (@Enumerated(EnumType.STRING)).
--   - color / description / avatar / recurrence_end_date : nullables.
--
-- ⚠️ MIGRATION IRRÉVERSIBLE (ADR-001) : border_color + text_color sont SUPPRIMÉS.
-- Seul background_color est conservé (recopié dans color). Perte de données
-- définitive sur border/text. NE PAS rejouer contre une base de prod sans
-- validation métier préalable. Backfill archived = false (BR-EVE-011 : actif =
-- non archivé). BR-EVT-001/BR-CAT-001 inchangées (propriété + unicité nom).
--
-- NE PAS éditer V1..V6 (déjà appliquées -> checksum mismatch Flyway). V7 only.
-- =============================================================

-- =============================================================
-- PRÉ-VOL — auto-sécurité sur base PEUPLÉE (pattern V4/#121).
-- Avant de convertir recurrence_unit vers l'enum, on échoue TÔT avec un message
-- actionnable si une valeur non convertible existe. Le CHECK V4 tolère
-- (weeks/months/years) + NULL ; on vérifie qu'aucune autre valeur n'a pu se
-- glisser. Sur base fraîche/vide : compteur = 0 -> la migration continue.
do $$
declare
    v_rec_unknown bigint;
begin
    select count(*) into v_rec_unknown
    from events
    where recurrence_unit is not null
      and lower(recurrence_unit) not in ('week', 'weeks', 'month', 'months', 'year', 'years');

    if v_rec_unknown > 0 then
        raise exception using
            message = 'V7 abort : recurrence_unit non convertible vers RecurrenceUnit (#44). '
                || 'Lignes hors {week(s)/month(s)/year(s)} = ' || v_rec_unknown
                || '. Auditer/corriger ces lignes puis rejouer la migration.';
    end if;
end $$;
-- =============================================================

-- ---------- categories ----------
alter table categories
    add column color       varchar(255),
    add column description  varchar(255);

-- ---------- users ----------
alter table users
    add column avatar varchar(255);

-- ---------- products ----------
-- archived NOT NULL : DEFAULT false backfill les lignes existantes (base peuplée).
alter table products
    add column archived boolean not null default false,
    add column color    varchar(255);

-- ---------- events : couleurs ----------
-- Consolidation 3 -> 1. `color` recopie background_color (survivant, ADR-001).
alter table events
    add column color varchar(255);

update events
    set color = background_color
    where background_color is not null;

-- Suppression définitive des colonnes couleur legacy (irréversible).
-- background_color d'abord recopié ci-dessus ; border/text_color perdus.
alter table events
    drop column background_color,
    drop column border_color,
    drop column text_color;

-- ---------- events : recurrence_unit -> enum ----------
-- Le CHECK V4 (weeks/months/years en minuscules) bloque la conversion vers
-- WEEK/MONTH/YEAR : on le DROP avant, on convertit, on repose un CHECK aligné
-- sur les noms de constantes RecurrenceUnit (@Enumerated(EnumType.STRING)).
alter table events
    drop constraint if exists ck_events_recurrence_unit;

update events
    set recurrence_unit = case lower(recurrence_unit)
        when 'week'   then 'WEEK'
        when 'weeks'  then 'WEEK'
        when 'month'  then 'MONTH'
        when 'months' then 'MONTH'
        when 'year'   then 'YEAR'
        when 'years'  then 'YEAR'
    end
    where recurrence_unit is not null;

alter table events
    add constraint ck_events_recurrence_unit
    check (recurrence_unit is null or recurrence_unit in ('WEEK', 'MONTH', 'YEAR'));

-- ---------- events : recurrence_end_date + archived ----------
alter table events
    add column recurrence_end_date date,
    add column archived            boolean not null default false;

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo, et border/text
-- color sont DÉFINITIVEMENT perdus, cf. ADR-001) :
--
--   alter table events drop column archived;
--   alter table events drop column recurrence_end_date;
--   alter table events drop constraint if exists ck_events_recurrence_unit;
--   -- (recurrence_unit reste en MAJUSCULES ; pas de re-conversion fiable)
--   alter table events add column background_color varchar(255);
--   update events set background_color = color;   -- border/text NON restaurables
--   alter table events add column border_color varchar(255);
--   alter table events add column text_color   varchar(255);
--   alter table events drop column color;
--   alter table products drop column color;
--   alter table products drop column archived;
--   alter table users drop column avatar;
--   alter table categories drop column description;
--   alter table categories drop column color;
-- =============================================================
