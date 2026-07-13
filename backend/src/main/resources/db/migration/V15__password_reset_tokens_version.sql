-- =============================================================
-- V15__password_reset_tokens_version.sql — Verrou optimiste anti-TOCTOU (issue #143)
--
-- Contexte : la consommation d'un token de reset (reset-password) fait un CHECK
-- (findByToken + isUsable) puis un USE (marquage used_at) en deux étapes. Deux
-- requêtes concurrentes exactement simultanées pouvaient toutes deux passer le CHECK
-- avant que l'une ne marque used_at -> même token consommé deux fois (TOCTOU).
--
-- Correctif : colonne `version` mappée @Version (verrou optimiste JPA) sur
-- PasswordResetTokenEntity. Le UPDATE de consommation devient
--   UPDATE ... SET used_at=?, version=version+1 WHERE id=? AND version=?
-- avec la version LUE au CHECK (cache L1 Hibernate = lecture répétable dans la
-- transaction). Deux consommations concurrentes -> une seule affecte une ligne,
-- l'autre déclenche ObjectOptimisticLockingFailureException -> rejet 400 générique.
--
-- Cohérence projet : les 5 autres @Version (users/categories/products/events V3,
-- sessions V10) sont `integer NOT NULL DEFAULT 0` <-> `@Version Integer`. On garde
-- ce type. ddl-auto=validate (dev/test/prod) : le mapping @Version Integer DOIT
-- correspondre EXACTEMENT à cette colonne, sinon SchemaManagementException au boot.
--
-- DEFAULT 0 : backfill des tokens déjà en base (le cas échéant) + valeur initiale
-- des INSERT (Hibernate pose 0 sur persist). NOT NULL des deux côtés
-- (@Column(nullable=false)).
--
-- NE PAS éditer V1..V14 (déjà appliquées -> checksum mismatch Flyway). V15 only.
-- =============================================================

alter table password_reset_tokens
    add column version integer not null default 0;

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   alter table password_reset_tokens drop column if exists version;
-- =============================================================
