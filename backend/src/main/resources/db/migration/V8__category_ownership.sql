-- =============================================================
-- V8__category_ownership.sql — Propriété des catégories PAR UTILISATEUR (issue #52, ADR-002)
--
-- SUPERSEDE l'état « référentiel global partagé » (br-categories / AP-CAT-09).
-- Décision tranchée (ADR-002) : chaque catégorie appartient à un utilisateur
-- (owner_id). PATCH/DELETE exigent owner_id == subject JWT (403 sinon). L'unicité
-- du nom (BR-CAT-004) devient PAR UTILISATEUR : UNIQUE(owner_id, name).
--
-- ddl-auto=validate (#42) : owner_id DOIT matcher EXACTEMENT le mapping JPA
-- (CategoryEntity.owner @ManyToOne @JoinColumn(name="owner_id"), NULLABLE).
--
-- NE PAS éditer V1..V7 (déjà appliquées -> checksum mismatch Flyway). V8 only.
-- =============================================================

-- ---------- categories : owner_id ----------
-- Colonne NULLABLE et volontairement SANS backfill vers un user arbitraire.
--
-- STRATÉGIE DE BACKFILL EXPLICITE (ADR-002) :
--   owner_id IS NULL == catégorie « SYSTÈME ».
--   - Lisible par TOUS les utilisateurs authentifiés (GET /api/categories les liste).
--   - Modifiable/supprimable par PERSONNE : PATCH/DELETE d'une catégorie à owner NULL
--     renvoie 403 (le contrôleur exige owner_id == caller, or NULL != caller).
--
-- Justification : au moment de la migration la table `categories` ne contient AUCUNE
-- ligne seedée (les 4 UUID hardcodés côté front — AddProducts.tsx, BR-CAT-007 — ne
-- correspondent à AUCUNE ligne en base ; ce sont des références fantômes cassées
-- jusqu'à la Wave 3 front #61). Rattacher les catégories existantes à « le premier
-- user seedé » serait donc arbitraire ET incorrect (aucun user n'en est réellement
-- propriétaire). On préfère la sémantique explicite « système / non modifiable »
-- plutôt qu'une appropriation implicite. AUCUN comportement implicite laissé.
alter table categories
    add column owner_id uuid;

-- FK vers users (pas de cascade : la suppression d'un user ne doit pas effacer
-- silencieusement ses catégories — décision produit hors scope #52, laissée RESTRICT
-- par défaut Postgres).
alter table categories
    add constraint fk_categories_owner
    foreign key (owner_id) references users (id);

-- Index sur owner_id : les futures lectures filtrées par propriétaire (Wave 3)
-- et la vérification d'unicité par owner s'appuient dessus.
create index ix_categories_owner_id on categories (owner_id);

-- ---------- BR-CAT-004 : unicité du nom PAR UTILISATEUR ----------
-- UNIQUE(owner_id, name). En Postgres, deux lignes avec owner_id NULL ne sont PAS
-- considérées « égales » -> les catégories système (owner NULL) ne sont pas
-- contraintes en unicité entre elles (acceptable : elles ne sont ni créées ni
-- modifiables via l'API après cette migration). L'unicité mordante s'applique donc
-- aux catégories possédées (owner_id NON NULL), ce qui est le comportement voulu.
alter table categories
    add constraint uq_categories_owner_name unique (owner_id, name);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--   alter table categories drop constraint if exists uq_categories_owner_name;
--   drop index if exists ix_categories_owner_id;
--   alter table categories drop constraint if exists fk_categories_owner;
--   alter table categories drop column if exists owner_id;
-- =============================================================
