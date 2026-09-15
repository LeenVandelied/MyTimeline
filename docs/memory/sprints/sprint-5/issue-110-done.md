# Issue #110 — V5 index sur colonnes FK — DONE

**Commit :** b9818d2
**Fichiers :** db/migration/V5__fk_indexes.sql (+37)
**Résumé :** 3 index `CREATE INDEX IF NOT EXISTS` (idempotent), noms colonnes confirmés depuis V1 :
idx_products_category(products.category_id), idx_products_user(products.user_id), idx_events_product(events.product_id). Rollback commenté. V1-V4 intacts. Commit par chemin explicite.
**Tests :** test-quiet.sh unit → 55/55 (Testcontainers V1→V5 OK).

**[MEMORY:pattern]** PG ne crée pas d'index sur colonnes FK (≠ UNIQUE/PK) → migration dédiée CREATE INDEX IF NOT EXISTS, sinon scans séquentiels sur jointures/cascades.

## Recommandations suite
- RECOMMAND_DB_EXPERT : valider via pg_indexes/EXPLAIN l'usage des index sur DELETE produit (cascade events) + getProductsWithEvents ; évaluer index partiel (products.user_id nullable).
- RECOMMAND_FOLLOWUP [S | products] : BR-PRO-006 fait full scan + filtre Java (pas de WHERE user_id en SQL) → idx_products_user inutile tant que la requête n'est pas réécrite en JPQL avec filtre DB.

STATUS: COMPLETED
