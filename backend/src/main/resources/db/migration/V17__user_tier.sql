-- =============================================================
-- V17__user_tier.sql — Palier d'abonnement du compte (issue #88)
--
-- Ajoute users.tier : FREE (défaut), PLUS ou PRO. Le palier pilote le quota
-- d'événements actifs (PlanPolicy).
--
-- Colonne NOT NULL avec DEFAULT constant 'FREE' : sous Postgres (11+) c'est une
-- modification de métadonnées seule, sans réécriture de table. Les comptes
-- existants passent à FREE sans backfill.
--
-- Mapping JPA : UserEntity.tier (@Enumerated(EnumType.STRING), nullable = false,
-- length 16). ddl-auto=validate : nom et type (varchar) DOIVENT correspondre.
--
-- CHECK NOMMÉ ck_users_tier, précédé d'un drop if exists (rejouable).
-- IDEMPOTENCE : ADD COLUMN IF NOT EXISTS.
--
-- NE PAS éditer V1..V16 (déjà appliquées -> checksum mismatch Flyway). V17 only.
-- =============================================================

-- Un seul ALTER TABLE (un seul verrou ACCESS EXCLUSIVE) et un lock_timeout local :
-- la migration échoue vite plutôt que de bloquer les lectures de `users`.
set local lock_timeout = '5s';

alter table users
    add column if not exists tier varchar(16) not null default 'FREE',
    drop constraint if exists ck_users_tier,
    add constraint ck_users_tier
        check (tier in ('FREE', 'PLUS', 'PRO'));

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   alter table users drop constraint if exists ck_users_tier;
--   alter table users drop column if exists tier;
--   -- NB : les paliers posés sont PERDUS (non reconstructibles).
-- =============================================================
