-- =============================================================
-- V16__user_theme_preference.sql — Préférence de thème du compte (issue #653, ADR-010)
--
-- Contexte : #642 (Sprint 83) n'a livré que la persistance LOCALE du thème
-- (next-themes, localStorage). Le temps 2 de DEC-S82-009 — « à la connexion, la
-- préférence du compte gagne si elle existe, sinon le choix local est adopté » —
-- exige une préférence portée par le compte, inexistante jusqu'ici.
--
-- Colonne NULLABLE, SANS défaut, et c'est voulu :
--   NULL      = le compte n'a encore exprimé AUCUN choix -> le front adopte le
--               choix local et l'écrit sur le compte (PUT /api/me/preferences) ;
--   'system'  = choix EXPLICITE « suivre l'OS » -> il écrase le choix local.
-- Un DEFAULT 'system' rendrait ces deux cas indistinguables (alternative écartée,
-- ADR-010). Aucun backfill : les comptes existants partent à NULL.
--
-- Valeurs en minuscules, identiques à celles de next-themes et de l'API.
-- Mapping JPA : UserEntity.themePreference (ThemePreferenceConverter, enum domaine
-- <-> minuscules), @Column(name = "theme_preference", length = 16) nullable.
-- ddl-auto=validate (dev/test/prod) : le type varchar DOIT correspondre.
--
-- CHECK NOMMÉ (PIT-S88-001 : un CHECK anonyme reçoit un nom automatique que
-- `drop constraint if exists ck_*` ne retire jamais). NULL satisfait un CHECK en
-- SQL : la contrainte ne borne que les valeurs effectivement posées.
--
-- IDEMPOTENCE : ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT IF EXISTS avant ADD.
-- Sur base peuplée : ADD COLUMN nullable sans défaut = métadonnée seule (pas de
-- réécriture de table sous Postgres), aucune ligne existante ne viole le CHECK.
--
-- NE PAS éditer V1..V15 (déjà appliquées -> checksum mismatch Flyway). V16 only.
-- =============================================================

alter table users
    add column if not exists theme_preference varchar(16);

alter table users
    drop constraint if exists ck_users_theme_preference;

alter table users
    add constraint ck_users_theme_preference
    check (theme_preference in ('light', 'dark', 'system'));

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   alter table users drop constraint if exists ck_users_theme_preference;
--   alter table users drop column if exists theme_preference;
--   -- NB : les préférences posées sont PERDUES (non reconstructibles).
-- =============================================================
