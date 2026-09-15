# Mini-plans architect — Sprint 93

> Généré par /sprint plan (architect, 2026-09-15, axe « bugs du parcours »). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> Prémisses #711 et #695 contre-vérifiées par le lead (aucun endpoint restore ; compteur client sans archivés).

**Vagues :** V1 = #711 | V2 = #695 (mêmes `ProductRepository.java`, `ProductRepositoryJpaImpl.java`, namespace `products.json`, verrou Maven)
**Migrations Flyway :** aucune (`archived` existe depuis V7)
**À trancher au démarrage :** surface des archivés (route `/products/archived` ou filtre dans `ProductsListView`) ; libellé #695 (total ou « N archivés »).

```yaml
issue_711:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/ProductController.java:135-157 (motif DELETE + ownership)"
    - "backend/.../domain/ports/services/ProductService.java:26-29"
    - "backend/.../application/services/ProductServiceImpl.java:177 (archiveById)"
    - "backend/.../domain/ports/repositories/ProductRepository.java:32-57"
    - "backend/.../infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java:118-150 (natifs qui contournent @SQLRestriction)"
    - "backend/.../infrastructure/entities/ProductEntity.java:25"
    - "frontend/src/services/productService.ts:66-77"
    - "frontend/src/hooks/useArchiveProduct.ts:13-23"
    - "frontend/src/components/products/ProductsListView.tsx (point d'entrée)"
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx:49-51"
    - "frontend/public/locales/*/common.json:74-79 (deleteDialog.product.description)"
    - "frontend/public/locales/*/products.json"
    - ".ai-env/context-packs/br-products.md:15,83-87"
  couches_touchees: ["domain-port", "application-service", "infrastructure-controller", "infrastructure-jpa-natif", "frontend-service", "frontend-hook", "frontend-vue", "locales", "doc-BR"]
  strategie_test: "unit + integration (IT restore visible partout, 403 autre user, 404 inconnu/non archivé) + E2E (archiver → liste archivés → désarchiver → produit + événements réapparaissent)"
  risque_regression: "ownership actuel via findDomainProductById filtré par @SQLRestriction → 404 sur archivé ; une native de restauration sans user_id lié = IDOR"
  ordre_ecriture: "port repo (findArchivedByUserId, restoreByIdAndUserId natifs) → service → controller (GET .../products/archived, POST .../products/{id}/restore) → IT → service+hook front (invalider products.all ET categories.all) → surface → dialog + locales → br-products §1"
  zod_dto_sync: "OUI (réponse liste archivés ; ProductResponse n'expose pas archived, ProductResponse.java:28)"
  possibly_done: false
  etat_reel_du_code: "Aucun endpoint restore (6 mappings ProductController, vérifié lead) ; ProductUpdateRequest.java:32-39 sans archived ; JSDoc productService.ts:66-67, useArchiveProduct.ts:23, DeleteConfirmDialog.tsx:49 disent « aucune restauration » (à réécrire) ; SecurityConfig.java:167 couvre /api/users/{userId}/products/** ; aucune contrainte UNIQUE sur products."
  ecart_enonce_code: "« les événements ont déjà un onglet Archivés » FAUX : section dans ProductDetailView.tsx:488-509 (product-detail-unarchive-*) via PATCH archived=false — non transposable (produit archivé illisible par PATCH). Confirmation avant désarchivage événement : non vérifiée."
  memory_signal: "[MEMORY:business-rule] BR-PRO-007 : Archived n'est plus définitif — restaurable via endpoint dédié, ownership natif."

issue_695:
  fichiers_cles:
    - "frontend/src/components/products/CategoriesView.tsx:44-58 (compte client depuis useProductsWithEvents), :158, :205-207, :253, :266 (linkedProductsCount)"
    - "backend/.../application/dtos/CategoryResponse.java"
    - "backend/.../infrastructure/adapters/controllers/CategoryController.java"
    - "backend/.../application/services/CategoryServiceImpl.java:111"
    - "backend/.../domain/ports/repositories/ProductRepository.java:37"
    - "backend/.../infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java:126"
    - "frontend/src/types/category.ts"
    - "frontend/src/services/categoryService.ts"
    - "frontend/public/locales/*/products.json (products.categories)"
    - "frontend/e2e/categories.spec.ts"
  couches_touchees: ["application-dto", "application-service", "infrastructure-jpa-natif", "frontend-types-zod", "frontend-vue", "locales"]
  strategie_test: "integration (compte groupé archivés inclus, un seul SELECT) + Vitest CategoriesView + E2E categories.spec.ts"
  risque_regression: "carte (compte backend) et linkedProductsCount (client :253/:266) divergent ; bascule réassignation #546 change ; archiver/restaurer sans invalider categories.all laisse la carte périmée"
  ordre_ecriture: "arbitrage libellé → native groupée par user (pas de N+1) → DTO → Zod → CategoriesView + linkedProductsCount → locales → invalidation categories.all dans useArchiveProduct ET hook restore #711"
  zod_dto_sync: "OUI"
  possibly_done: false
  etat_reel_du_code: "CategoryResponse sans compteur ; compte client CategoriesView.tsx:50-58 (archivés exclus, vérifié lead) ; countByCategoryId natif archivés inclus (ProductRepository.java:32-37) non exposé."
  ecart_enonce_code: "aucun sur le fond ; lignes « 47-57 » → 50-58"
```
