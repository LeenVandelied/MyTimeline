-- =============================================================
-- V3__add_audit_columns.sql — Audit JPA (issue #43)
--
-- Ajoute traçabilité + verrou optimiste aux 4 tables :
--   - created_at / updated_at : timestamp NOT NULL DEFAULT now()
--     (mappés @CreatedDate / @LastModifiedDate, type LocalDateTime → timestamp).
--   - version : integer NOT NULL DEFAULT 0 (mappé @Version, type Integer).
--
-- DEFAULT obligatoires : les tables dev (base eventmanager) sont peuplées.
-- now() backfill created_at/updated_at, 0 backfill version pour les lignes
-- existantes. ddl-auto=validate (#42) exige cohérence EXACTE entité↔colonne :
--   nullability NOT NULL des deux côtés (@Column(nullable=false)),
--   types timestamp/integer conformes à LocalDateTime/Integer.
-- =============================================================

alter table users
    add column created_at timestamp not null default now(),
    add column updated_at timestamp not null default now(),
    add column version    integer   not null default 0;

alter table categories
    add column created_at timestamp not null default now(),
    add column updated_at timestamp not null default now(),
    add column version    integer   not null default 0;

alter table products
    add column created_at timestamp not null default now(),
    add column updated_at timestamp not null default now(),
    add column version    integer   not null default 0;

alter table events
    add column created_at timestamp not null default now(),
    add column updated_at timestamp not null default now(),
    add column version    integer   not null default 0;
