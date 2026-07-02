-- =============================================================
-- V9__neutralize_invalid_recurrence_unit.sql — Neutralisation des valeurs
-- recurrence_unit invalides résiduelles (issue #54, BR-EVE-006)
--
-- CONTEXTE : V7 (#44) a converti recurrence_unit texte libre (week(s)/month(s)/
-- year(s)) vers l'enum RecurrenceUnit(WEEK/MONTH/YEAR) et posé le CHECK
-- ck_events_recurrence_unit. V7 AVORTE toutefois si une valeur hors
-- {week(s)/month(s)/year(s)} existe (pré-vol). #54 introduit l'enum côté
-- validation/mapping et impose une couverture des ALIAS COURANTS supplémentaires
-- (« weekly », « monthly », « yearly », variantes FR) susceptibles d'exister sur
-- des bases historiques échappées au pré-vol V7 (import, seed, restauration
-- partielle). Cette migration :
--   1. retire temporairement le CHECK,
--   2. mappe les alias reconnus vers WEEK/MONTH/YEAR,
--   3. met à NULL toute valeur restante non convertible (neutralisation SANS
--      perte de la ligne événement — seule l'unité de récurrence orpheline est
--      effacée ; un event à recurrence_unit NULL reste valide, cf. CHECK),
--   4. repose le CHECK aligné sur l'enum.
--
-- IDEMPOTENTE / SÛRE sur base déjà propre (post-V7) : une valeur déjà en enum
-- (ex. 'WEEK') passe par lower(trim())='week' et matche la branche 'week' ->
-- réécrite à l'identique 'WEEK' (aucune corruption, pas de double-conversion) ;
-- aucune valeur invalide -> le UPDATE de neutralisation ne touche rien.
--
-- ddl-auto=validate : V9 ne modifie AUCUNE colonne/type (schéma inchangé),
-- uniquement des données + le CHECK. Aucun impact mapping JPA.
--
-- NE PAS éditer V1..V8 (déjà appliquées). NE PAS créer de V10 (réservée #158).
-- =============================================================

-- 1. Retirer le CHECK pour autoriser la réécriture des données.
alter table events
    drop constraint if exists ck_events_recurrence_unit;

-- 2. Mapper les alias courants (casse-insensible, trim) vers les noms d'enum.
--    Couvre le legacy V7 (idempotent) + les alias élargis #54.
update events
    set recurrence_unit = case lower(trim(recurrence_unit))
        when 'week'    then 'WEEK'
        when 'weeks'   then 'WEEK'
        when 'weekly'  then 'WEEK'
        when 'hebdo'   then 'WEEK'
        when 'hebdomadaire' then 'WEEK'
        when 'month'   then 'MONTH'
        when 'months'  then 'MONTH'
        when 'monthly' then 'MONTH'
        when 'mensuel' then 'MONTH'
        when 'year'    then 'YEAR'
        when 'years'   then 'YEAR'
        when 'yearly'  then 'YEAR'
        when 'annuel'  then 'YEAR'
        when 'annual'  then 'YEAR'
        else recurrence_unit  -- laissé tel quel, neutralisé à l'étape 3
    end
    where recurrence_unit is not null;

-- 3. Neutraliser (NULL) toute valeur encore non conforme à l'enum.
--    Perte contrôlée : seule l'unité de récurrence invalide est effacée, l'event
--    survit (recurrence_unit NULL est un état légal). Documenté (risque #54).
update events
    set recurrence_unit = null
    where recurrence_unit is not null
      and recurrence_unit not in ('WEEK', 'MONTH', 'YEAR');

-- 4. Reposer le CHECK aligné sur RecurrenceUnit (@Enumerated(EnumType.STRING)).
alter table events
    add constraint ck_events_recurrence_unit
    check (recurrence_unit is null or recurrence_unit in ('WEEK', 'MONTH', 'YEAR'));

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo ; la neutralisation
-- des valeurs invalides -> NULL est IRRÉVERSIBLE, l'unité d'origine est perdue) :
--   alter table events drop constraint if exists ck_events_recurrence_unit;
--   -- (impossible de restaurer les valeurs mises à NULL sans backup applicatif)
--   alter table events add constraint ck_events_recurrence_unit
--       check (recurrence_unit is null or recurrence_unit in ('WEEK','MONTH','YEAR'));
-- =============================================================
