## Sprint 10 — Backend Produits + Catégories (Wave 3 back)

Débloque le frontend Wave 3 (S11) : CRUD backend Produits (PATCH + soft delete) et Catégories (+ réassignation), avec un modèle d'ownership catégorie par utilisateur.

### Issues traitées
- **#50** — Product PATCH partiel + suppression logique (`archived` / soft delete)
- **#52** — CRUD catégorie complet + suppression avec réassignation atomique + ownership

### Changements clés

**Produits (#50)**
- `PATCH /users/{userId}/products/{productId}` : mise à jour partielle (nom et/ou catégorie), 200/400/404/403.
- Soft delete : `DELETE` positionne `archived = true`, retourne **204** (corrigé de 200). `@SQLRestriction("archived = false")` sur `ProductEntity` → produits archivés invisibles dans tous les listings (produits + events).
- Ownership `path {userId} == JWT` sur PATCH et DELETE (403 sur mismatch).

**Catégories (#52) — ADR-002 ownership par utilisateur**
- `PATCH /api/categories/{id}` (name/color/description), DTOs `CategoryRequest`/`CategoryResponse`/`CategoryUpdateRequest` (fin de l'exposition du domain model).
- Ownership : colonne `owner_id` (migration **V8**), `owner NULL` = catégorie « système » (lisible de tous, non modifiable → 403). PATCH/DELETE exigent `owner_id == JWT`.
- Unicité du nom **par utilisateur** : `UNIQUE(owner_id, name)` + check métier (409).
- `DELETE /api/categories/{id}?reassignToCategoryId={uuid}` : réassignation atomique des produits (SQL natif contournant `@SQLRestriction` pour inclure les archivés) AVANT suppression, dans une seule `@Transactional` ; 409 explicite si suppression tentée sans réassignation.
- Nettoyage hexagonal : injection du port `CategoryService`, retrait du double `existsById`.

**Corrections sécurité & review (post-audit)**
- 🔒 Cross-tenant (security-expert) : `resolveAssignableCategory` — une catégorie n'est assignable à un produit (create + update) que si possédée par l'appelant ou système, sinon **404** (anti-énumération d'UUID).
- 🐛 Self-reassign (reviewer) : `deleteCategory` rejette `reassignToCategoryId == id` (409) — évitait une violation FK / des orphelins.
- 🐛 Nom blanc sur PATCH produit : `@Pattern` rejette `" "` (400, BR-PRO-001) sans casser le patch partiel.
- 🐛 `DataIntegrityViolationException` → 409 générique (plus de 500 avec fuite SQL sur race d'unicité).

### BR impactées
BR-PRO-001, BR-PRO-004, BR-PRO-007 · BR-CAT-001/002/003/004/006 + nouvelle BR ownership catégorie (owner_id == JWT).

### Migration
- **V8** `category_ownership.sql` : `owner_id` (FK users, NULLABLE), index `ix_categories_owner_id`, `UNIQUE(owner_id, name)`. Backfill : catégories existantes → owner NULL (système). Rollback commenté. Audité db-expert (OK).

### Audit tests
- Backend : **146/146 verts** (0 failed, 0 errors, 0 skipped), intégration Testcontainers (Postgres) incluse (réassignation atomique + rollback, filtre archived, unicité scoped-owner, listing scopé owner∪système).
- E2E : N/A (sprint backend pur ; parcours produit/catégorie livré avec le frontend Wave 3, #61).
- Détail : `docs/memory/audits/sprint-10-test-coverage.md`.

### Reviews
- **db-expert** (V8) : OK — 2 MINEUR déférés (#78 FK RESTRICT vs DELETE /me ; dette UUID-AUTO préexistante).
- **security-expert** : 1 CRITIQUE + 1 MAJEUR (cross-tenant) → corrigés.
- **reviewer batch** (mi-sprint) : 1 MAJEUR bloquant (self-reassign) + 2 MINEUR → corrigés. 2 MAJEUR de dette préexistante déférés en follow-ups.
- **/review-pr #153** (état final) : durcissement cross-tenant sur la lecture — `GET /api/categories` (liste + par-id) scopé à `owner == caller ∪ système`, `CategoryResponse` n'expose plus l'`ownerId` (booléen `system`), handler `DataIntegrityViolationException` restreint au niveau service (plus de 409 fourre-tout). `78c633b`.

### Follow-ups (triage à `/sprint end`)
- Extraire `resolveCaller` dans `ProductController` (boilerplate JWT dupliqué ~6×) `[S | products]`.
- `ProductResponse` DTO — stopper la fuite du domain model produit en HTTP (AP-CAT-03 non rétrofit) `[M | products]`.
- Front Wave 3 #61 (S11) : remplacer les 4 UUID hardcodés `AddProducts.tsx`, E2E métier, sync Zod.
- #78 : réassigner/nullifier `owner_id` avant suppression d'un user (FK RESTRICT).

### Décision d'architecture
**ADR-002** (`docs/adr/ADR-002-ownership-categorie.md`) : catégories par utilisateur (`ownerId`), backfill owner NULL = système, `UNIQUE(owner_id, name)`, 403 sur mismatch. Casse les 4 UUID hardcodés du front jusqu'à la Wave 3 (#61). Décision tranchée par le dev en début de sprint.

**Cohésion sprint : 0.50** · Vagues : V1 = #50, V2 = #52 (séquencé sur `ProductRepository.java` partagé).
