# Issue #52 — CRUD catégorie complet + suppression avec réassignation

**Commit :** 794433b
**Vague :** 2 | **Taille :** M | **Modèle :** opus/high

## Résumé
CRUD catégorie complet + ownership PAR UTILISATEUR (ADR-002).
- BR-CAT-001 : name `@NotBlank` → 400.
- BR-CAT-002/003 : 404 delete/update inexistante.
- BR-CAT-004 : unicité PAR OWNER — `UNIQUE(owner_id, name)` + check métier 409.
- BR-CAT-006 : PATCH exposé.
- Nouvelle BR ownership : `owner_id == JWT` sur PATCH/DELETE → 403.

## Décision d'archi
**ADR-002** (`docs/adr/ADR-002-ownership-categorie.md`) : catégories par utilisateur (`owner_id`).
- Migration V8 : `owner_id uuid` NULLABLE + FK users + index `ix_categories_owner_id` + `UNIQUE(owner_id, name)`.
- Backfill EXPLICITE : catégories existantes → `owner NULL` = « système » (lisibles de tous via GET, non modifiables/supprimables, 403). Justif : table `categories` sans lignes seedées + 4 UUID front = fantômes → pas d'appropriation arbitraire.
- Casse les 4 UUID hardcodés `AddProducts.tsx` jusqu'à la Wave 3 front (#61, S11).

## Réassignation atomique
`DELETE ?reassignToCategoryId=` → bulk update SQL natif AVANT delete, une seule `@Transactional`.
- Sans cible + produits référencés → 409 message métier explicite.
- Ownership de la catégorie cible aussi vérifié (403).

## Fichiers clés
- `CategoryController.java` (+151), `CategoryServiceImpl.java` (+64), `CategoryRepositoryJpaImpl.java` (+72, `findByOwnerAndName` + `setMaxResults(1)`), `ProductRepositoryJpaImpl.java` (`countByCategoryId` + `updateCategoryForProducts`), `CategoryEntity.java`, `V8__category_ownership.sql`, `docs/adr/ADR-002-ownership-categorie.md`.
- DTOs `CategoryRequest/Response/UpdateRequest`. Port `CategoryService` injecté (AP-CAT-01/02), double `existsById` retiré (AP-CAT-04). 2 exceptions → 409 (`GlobalExceptionHandler`).

## Tests
**125 verts** — `CategoryControllerTest` (POST 400/409, PATCH 200/400/404/409/403+système, DELETE 204/409/403+reassign), `CategoryServiceImplTest` (ordre update-avant-delete + rollback + unicité owner), `CategoryDeleteReassignIntegrationTest` (Testcontainers : unicité scoped-owner, 409 in-use, réassignation atomique actifs+archivés).

## Signaux mémoire
- `[MEMORY:business-rule]` Ownership catégorie : `owner_id` FK users ; PATCH/DELETE exigent `owner_id == JWT` sinon 403 ; unicité nom PAR UTILISATEUR ; `owner NULL` = système (lisible, non modifiable). Supersede AP-CAT-09.
- `[MEMORY:decision]` ADR-002 ownership catégorie.
- `[MEMORY:pitfall]` Réassignation catégorie : `ProductEntity @SQLRestriction("archived=false")` → count/update HQL masquent les archivés ⇒ orphelins FK. Fix : SQL natif pour `countByCategoryId` + `updateCategoryForProducts` (toutes lignes). Réassignation AVANT delete, même `@Transactional`.

## Recommandations suite
- RECOMMAND_DB_EXPERT (obligatoire) — valider V8 (owner_id NULLABLE vs ddl-auto=validate, sémantique NULL dans UNIQUE, FK sans cascade, index, backfill).
- RECOMMAND_SECURITY (obligatoire) — auditer ownership (IDOR PATCH/DELETE, cible de réassignation d'un autre owner, PII owner_id).
- RECOMMAND_FOLLOWUP — Wave 3 front #61 : remplacer les 4 UUID hardcodés `AddProducts.tsx` par GET/POST `/api/categories` + sync Zod (S11).

STATUS: COMPLETED
