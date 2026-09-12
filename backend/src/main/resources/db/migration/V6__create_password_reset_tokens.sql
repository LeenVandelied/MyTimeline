-- =============================================================
-- V6__create_password_reset_tokens.sql — Tokens de réinitialisation (issue #49)
--
-- Contexte : flux "mot de passe oublié". forgot-password génère un token UUID,
-- l'enregistre ici ; reset-password le consomme (vérifie existence + non expiré
-- + non consommé, met à jour le hash BCrypt, marque used_at).
--
-- Décision de cadrage (sprint S8) : durée de validité = 15 min (calculée
-- applicativement, expires_at posé à la création). Le token est à usage unique
-- (used_at non nul = consommé). BR-AUT-005 : forgot-password répond toujours 200.
--
-- Schéma reflétant EXACTEMENT l'entité PasswordResetTokenEntity (ddl-auto=validate
-- en dev/test → tout écart entité/DDL casse le boot). Types : `uuid` pour PK/FK/token,
-- `timestamp` pour les LocalDateTime (expires_at / used_at).
--
-- FK user_id -> users(id), ON DELETE CASCADE : si un compte est supprimé, ses
-- tokens en attente n'ont plus de sens et sont purgés avec lui.
--
-- Index (anti-pattern A10 — colonnes interrogées indexées) :
--   - uq_password_reset_tokens_token : le lookup de reset-password se fait par
--     token ; UNIQUE (un token = un seul enregistrement) + accélère la recherche.
--   - idx_password_reset_tokens_user : FK non indexée par Postgres (cf. V5) ;
--     index pour les requêtes/cascades par user_id.
--
-- NE PAS éditer V1..V5 (déjà appliquées → checksum mismatch Flyway). V6 only.
-- =============================================================

create table password_reset_tokens (
    id         uuid not null,
    user_id    uuid not null,
    token      uuid not null,
    expires_at timestamp not null,
    used_at    timestamp,
    primary key (id)
);

alter table password_reset_tokens
    add constraint uq_password_reset_tokens_token unique (token);

alter table password_reset_tokens
    add constraint fk_password_reset_tokens_user
    foreign key (user_id) references users (id) on delete cascade;

create index idx_password_reset_tokens_user on password_reset_tokens (user_id);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   drop index if exists idx_password_reset_tokens_user;
--   alter table password_reset_tokens drop constraint if exists fk_password_reset_tokens_user;
--   alter table password_reset_tokens drop constraint if exists uq_password_reset_tokens_token;
--   drop table if exists password_reset_tokens;
-- =============================================================
