-- =============================================================
-- V10__create_sessions.sql — Sessions actives + révocation JWT (issue #73)
--
-- Contexte : JWT stateless -> aucune révocation possible avant expiration (2 j).
-- Redis absent sur ce projet : registre de sessions en TABLE DB. Chaque token émis
-- (login/refresh) crée une ligne identifiée par son claim `jti` (unique). La
-- révocation (logout, DELETE /api/sessions/{id}, DELETE /others) pose revoked_at.
-- Le JwtFilter vérifie à CHAQUE requête authentifiée que le jti n'est pas révoqué.
--
-- Schéma reflétant EXACTEMENT SessionEntity (ddl-auto=validate dev/test/prod ->
-- tout écart entité/DDL casse le boot). Types : `uuid` pour PK/FK, `varchar(255)`
-- pour jti/device_info/ip_address, `timestamp` pour les LocalDateTime. PAS de
-- @Version sur l'entité -> pas de colonne version ici (updates ciblés revoked_at).
--
-- RGPD : ip_address contient l'IP TRONQUÉE (dernier octet IPv4 à zéro), jamais
-- l'IP complète en clair (troncature applicative — ClientIpAnonymizer).
--
-- FK user_id -> users(id) ON DELETE CASCADE : la suppression d'un compte purge ses
-- sessions (elles n'ont plus de sens), cohérent avec password_reset_tokens (V6).
--
-- Index (perf — lookup jti sur le chemin CHAUD de chaque requête authentifiée) :
--   - uq_sessions_jti     : UNIQUE(jti). Un jti = une session. Sert le lookup du
--                           JwtFilter en O(index), critère d'acceptation (index
--                           OBLIGATOIRE) et le filet d'unicité du jti.
--   - idx_sessions_user   : FK non indexée par Postgres (cf. V5) ; sert GET
--                           /api/sessions (sessions actives par user) et les
--                           révocations bulk par user (DELETE /others, #78).
--
-- NE PAS éditer V1..V9 (déjà appliquées -> checksum mismatch Flyway). V10 only.
-- V11 est RÉSERVÉE à #78 — ne pas la consommer ici.
-- =============================================================

create table sessions (
    id            uuid not null,
    jti           varchar(255) not null,
    user_id       uuid not null,
    device_info   varchar(255),
    ip_address    varchar(255),
    last_activity timestamp not null,
    created_at    timestamp not null,
    expires_at    timestamp not null,
    revoked_at    timestamp,
    primary key (id)
);

-- Index UNIQUE sur jti : lookup révocation à chaque requête + unicité du jti.
create unique index uq_sessions_jti on sessions (jti);

alter table sessions
    add constraint fk_sessions_user
    foreign key (user_id) references users (id) on delete cascade;

create index idx_sessions_user on sessions (user_id);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   drop index if exists idx_sessions_user;
--   alter table sessions drop constraint if exists fk_sessions_user;
--   drop index if exists uq_sessions_jti;
--   drop table if exists sessions;
-- =============================================================
