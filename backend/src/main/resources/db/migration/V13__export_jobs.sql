-- =============================================================
-- V13__export_jobs.sql — Jobs d'export RGPD asynchrones (issue #58, ADR-003)
--
-- Contexte : l'export RGPD (Art. 20) propose des formats ASYNCHRONES (ZIP, CSV)
-- générés en tâche de fond. Aucune infra de file de jobs (MQ/Redis) : le suivi de
-- statut vit en table `export_jobs` + exécution @Async (cf. ADR-003). Le chemin
-- SYNCHRONE (JSON/Markdown, inline) N'UTILISE PAS cette table.
--
-- Schéma reflétant EXACTEMENT ExportJobEntity (ddl-auto=validate dev/test/prod ->
-- tout écart entité/DDL casse le boot). Types : `uuid` pour PK/FK, `varchar` pour
-- format/status/refs, `timestamp` pour les LocalDateTime (cohérent V10 sessions).
-- PAS de @Version sur l'entité -> pas de colonne version (writer unique = worker).
--
-- FK user_id -> users(id) ON DELETE CASCADE : la suppression d'un compte (#78, RGPD
-- droit à l'effacement) purge automatiquement ses jobs d'export. NB : la purge des
-- FICHIERS générés sur disque reste une dette (scheduler de nettoyage, cf. ADR-003).
--
-- CHECK format/status : bornent les valeurs au sous-ensemble légitime (enums domaine
-- ExportFormat async + ExportJobStatus). Seuls ZIP/CSV créent un job (JSON/MD inline).
--
-- Index idx_export_jobs_user : la FK n'est pas indexée par Postgres (cf. V5) ; sert le
-- listing/purge par utilisateur.
--
-- NE PAS éditer V1..V12 (déjà appliquées -> checksum mismatch Flyway). V13 only.
-- =============================================================

create table export_jobs (
    id           uuid         not null,
    user_id      uuid         not null,
    format       varchar(16)  not null,
    status       varchar(16)  not null,
    storage_ref  varchar(255),
    error_code   varchar(64),
    created_at   timestamp    not null,
    completed_at timestamp,
    expires_at   timestamp,
    primary key (id),
    constraint fk_export_jobs_user
        foreign key (user_id) references users (id) on delete cascade,
    constraint ck_export_jobs_format
        check (format in ('ZIP', 'CSV')),
    constraint ck_export_jobs_status
        check (status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'))
);

create index idx_export_jobs_user on export_jobs (user_id);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--   drop index if exists idx_export_jobs_user;
--   drop table if exists export_jobs;
-- =============================================================
