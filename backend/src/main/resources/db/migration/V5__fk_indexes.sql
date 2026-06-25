-- =============================================================
-- V5__fk_indexes.sql — Index sur les colonnes FK (issue #110)
--
-- Contexte : V1__baseline.sql crée les contraintes FK
--   - fk_products_category : products(category_id) -> categories
--   - fk_products_user     : products(user_id)     -> users
--   - fk_events_product    : events(product_id)    -> products
-- mais PostgreSQL ne crée PAS automatiquement d'index sur les colonnes
-- portant une FK (contrairement aux colonnes UNIQUE/PRIMARY KEY). Sans index,
-- les jointures et surtout les cascades (Product -> events en cascade=ALL,
-- orphanRemoval=true : DELETE produit -> scan events WHERE product_id = ?)
-- déclenchent des scans séquentiels qui dégradent à mesure que le volume croît.
--
-- Colonnes confirmées depuis V1__baseline.sql (NON devinées) :
--   - products.category_id (uuid not null)
--   - products.user_id     (uuid, nullable)
--   - events.product_id    (uuid not null)
--
-- IDEMPOTENCE : CREATE INDEX IF NOT EXISTS — la base dev peut déjà porter
-- des index manuels équivalents ; rejouer V5 ne doit pas échouer.
--
-- NE PAS éditer V1/V2/V3/V4 (déjà appliquées → checksum mismatch Flyway). V5 only.
-- =============================================================

create index if not exists idx_products_category on products (category_id);

create index if not exists idx_products_user on products (user_id);

create index if not exists idx_events_product on events (product_id);

-- =============================================================
-- ROLLBACK (manuel — Flyway Community ne rejoue pas les undo) :
--
--   drop index if exists idx_events_product;
--   drop index if exists idx_products_user;
--   drop index if exists idx_products_category;
-- =============================================================
