-- =============================================================
-- V2__unique_constraints.sql — Contraintes uniques nommées (issue #42)
--
-- BR-AUT-001 : username unique (filet DB en complément du 409 applicatif).
-- email unique également (#32).
--
-- Noms STABLES exigés par l'AC : uq_users_username / uq_users_email.
-- Ces contraintes remplacent les UNIQUE auto-générées par Hibernate
-- (volontairement omises de V1, cf. Option A). @Column(unique=true) reste
-- sur l'entité : `validate` ne contrôle pas les uniques, donc pas de conflit.
-- =============================================================

alter table users
    add constraint uq_users_username unique (username);

alter table users
    add constraint uq_users_email unique (email);
