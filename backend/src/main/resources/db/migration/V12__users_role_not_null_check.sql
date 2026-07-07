-- =============================================================
-- V12__users_role_not_null_check.sql — Durcissement users.role (issue #122)
--
-- Contexte : V1__baseline.sql:30 crée `users.role varchar(255)` NULLABLE, sans
-- aucune contrainte CHECK. Aucune migration V2..V11 ne durcit cette colonne.
-- Même drift baseline que #108 (V1 généré depuis les métadonnées Hibernate,
-- source=metadata, qui n'exprime ni NOT NULL ni CHECK sur `role`).
-- Conséquence : une valeur hors-enum (bug de code, import manuel) est acceptée
-- silencieusement -> données incohérentes, risque sécurité (rôle inattendu).
--
-- Enum réel des rôles légitimes (aligné sur le CODE applicatif, NON deviné) :
--   AuthController.java:190 force 'ROLE_USER' au register (BR-AUT-006).
--   'ROLE_ADMIN' est déclaré comme rôle valide (aucun endpoint ne l'exige encore).
--   => CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN')) couvre l'ensemble réel.
--
-- STRATÉGIE self-safe base PEUPLÉE (spring.flyway.baseline-on-migrate=true :
-- V12 s'applique aussi à la base dev réelle / future prod, pas seulement aux
-- bases fraîches CI/Testcontainers). Contrairement à V4 (fail-fast), l'issue
-- #122 mandate une COERCITION corrective des lignes non conformes AVANT le
-- durcissement, avec un défaut justifié :
--   role NULL ou hors-enum  ->  'ROLE_USER'  (principe de MOINDRE PRIVILÈGE :
--   on ne promeut jamais vers ROLE_ADMIN ; le pire cas est un downgrade sûr).
-- Ordre : UPDATE assainit -> SET NOT NULL -> ADD CONSTRAINT CHECK.
-- Sur base fraîche/vide : UPDATE touche 0 ligne, la suite s'applique normalement.
--
-- IDEMPOTENCE : UPDATE et SET NOT NULL sont rejouables ; DROP CONSTRAINT
-- IF EXISTS avant ADD permet un rejeu propre sans erreur "already exists".
--
-- NE PAS éditer V1..V11 (déjà appliquées -> checksum mismatch Flyway). V12 only.
-- ⚠ NE PAS exécuter contre une base de PRODUCTION sans décision humaine :
--   l'UPDATE + ALTER TABLE sont des opérations sensibles. Validation ici
--   UNIQUEMENT via Testcontainers / base de test locale (cf. CLAUDE.md).
-- =============================================================

-- 1) Assainissement des lignes non conformes AVANT durcissement.
--    Défaut = 'ROLE_USER' (moindre privilège) pour tout NULL / hors-enum.
update users
   set role = 'ROLE_USER'
 where role is null
    or role not in ('ROLE_USER', 'ROLE_ADMIN');

-- 2) NOT NULL : plus aucune ligne role NULL après l'étape 1 -> ALTER sûr.
alter table users
    alter column role set not null;

-- 3) CHECK : borne les valeurs au sous-ensemble légitime.
alter table users
    drop constraint if exists ck_users_role;

alter table users
    add constraint ck_users_role
    check (role in ('ROLE_USER', 'ROLE_ADMIN'));

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   alter table users drop constraint if exists ck_users_role;
--   alter table users alter column role drop not null;
--   -- NB : l'UPDATE de l'étape 1 n'est PAS réversible (valeurs d'origine
--   --      hors-enum perdues). Sur base réelle, auditer avant bascule.
-- =============================================================
