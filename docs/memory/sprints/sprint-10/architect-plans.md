# Mini-plans architect — Sprint 10

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

```yaml
issue_0050:
  fichiers_cles:
    - "backend/src/main/java/.../infrastructure/adapters/controllers/ProductController.java"
    - "backend/src/main/java/.../application/services/ProductServiceImpl.java"
    - "backend/src/main/java/.../domain/ports/services/ProductService.java"
    - "backend/src/main/java/.../application/dtos/ProductUpdateRequest.java  # nouveau"
    - "backend/src/main/java/.../infrastructure/entities/ProductEntity.java  # @SQLRestriction('archived = false')"
    - "backend/src/main/resources/db/migration/V8__product_archived_filter.sql  # si residuel apres V7"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (PATCH 200/400/404/403, DELETE->204 soft, archived invisible partout) + unit service"
  risque_regression: "@SQLRestriction oublie sur une query nommee ou le join-fetch events -> produits archives fuient dans les listings."
  ordre_ecriture: "domain (port) -> application (impl) -> infra (controller + entity SQLRestriction) -> migration"
  zod_dto_sync: "NON (frontend produit livre en S11)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — ProductController.java present 8.2K, pas de PATCH ni archived confirme)"

issue_0052:
  fichiers_cles:
    - "backend/src/main/java/.../infrastructure/adapters/controllers/CategoryController.java  # inject interface, PATCH, DELETE?reassignToCategoryId"
    - "backend/src/main/java/.../application/services/CategoryServiceImpl.java"
    - "backend/src/main/java/.../domain/ports/services/CategoryService.java"
    - "backend/src/main/java/.../application/dtos/CategoryRequest.java, CategoryResponse.java, CategoryUpdateRequest.java  # nouveaux"
    - "backend/src/main/java/.../domain/ports/repositories/ProductRepository.java  # findByCategoryId + reassignation"
    - "backend/src/main/resources/db/migration/V9__category_constraints.sql  # nouveau"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (PATCH 200/400/409-unicite/404, DELETE 204/409-sans-reassign, reassignation atomique + rollback) + unit"
  risque_regression: "Reassignation+suppression non atomiques -> produits orphelins ; categorie referentiel global sans ownership (a trancher, cf. body #52)."
  ordre_ecriture: "trancher ownership categorie (ADR) -> DTOs -> port repo -> impl transactionnelle -> controller -> migration V9"
  zod_dto_sync: "NON (frontend categorie livre en S11)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — CategoryController.java 2.0K = tres minimal, coherent avec 'pas de PATCH/DTO' du body)"
```

## Blocker conception (a trancher AVANT implementation)
- **Ownership categorie #52** : referentiel global vs `ownerId`. Les 4 UUID hardcodes dans `AddProducts.tsx` suggerent un referentiel global. ADR `ADR-XXX-ownership-categorie.md` + `[MEMORY:business-rule]` au lead.

## Sequencement intra-sprint
- Migrations SEPAREES : #50 = V8, #52 = V9 (jamais rediter un meme fichier SQL).
- `ProductRepository.java` edite par les deux -> sequencer (#50 filtrage archived, #52 findByCategoryId).
