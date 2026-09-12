-- =============================================================
-- V14__idx_export_jobs_expires_at.sql — Index de purge TTL des exports RGPD (issue #267)
--
-- Contexte : les exports RGPD asynchrones (#58, V13) déposent un fichier sur disque avec
-- une durée de vie de 24h (`export_jobs.expires_at`). Le scheduler de purge (#267) balaye
-- périodiquement `export_jobs WHERE expires_at IS NOT NULL AND expires_at < now()` pour
-- supprimer fichier + ligne (RGPD minimisation, coût disque).
--
-- Sans index, ce balayage = SEQ SCAN de toute la table à chaque tick (horaire). `expires_at`
-- est NULLABLE (renseigné SEULEMENT à la complétion) : Postgres indexe aussi les NULL en
-- b-tree, mais le prédicat `expires_at < now()` élimine naturellement les NULL. L'index sert
-- exclusivement la requête de purge (aucun autre accès par expiration).
--
-- Ne modifie AUCUN mapping entité (un index n'est pas une colonne) -> `ddl-auto=validate`
-- reste vert, pas de changement d'ExportJobEntity. NE PAS éditer V1..V13 (checksum Flyway).
-- =============================================================

create index idx_export_jobs_expires_at on export_jobs (expires_at);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--   drop index if exists idx_export_jobs_expires_at;
-- =============================================================
