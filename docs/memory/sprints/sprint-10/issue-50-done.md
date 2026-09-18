# Issue #50 — Product PATCH + suppression logique (archive)

**Commit :** a52ddb5
**Vague :** 1 | **Taille :** M | **Modèle :** opus/high

## Résumé
PATCH partiel + soft delete produit.
- BR-PRO-001 : nom 1..100 via `@Size` sur `ProductUpdateRequest` (400 si vide/>100).
- BR-PRO-004 : ownership path==JWT, 403 sur PATCH + DELETE.
- BR-PRO-007 : soft delete `archived=true`, DELETE retourne 204 (corrigé de 200).

## Fichiers clés
- `application/dtos/ProductUpdateRequest.java` (nouveau) — name `@Size(min=1,max=100)` nullable, `categoryId` UUID nullable.
- `domain/ports/services/ProductService.java` — `deleteById` → `archiveById` + `updateProduct`.
- `application/services/ProductServiceImpl.java` — `updateProduct` (résout catégorie, `CategoryNotFoundException`), `archiveById` (`orElseThrow` + `setArchived(true)`).
- `infrastructure/entities/ProductEntity.java` — `@SQLRestriction("archived = false")`. `archived` déjà en base via V7/#44 → **pas de migration**.
- `infrastructure/adapters/controllers/ProductController.java` — `@PatchMapping` (200/400/404/403), DELETE 200→204 + soft delete.
- `infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java` — `save()` = update-in-place de l'entité gérée.
- `ProductRepository.java` **non modifié** (laissé propre pour #52).

## Pitfall rencontré
`save(mapper.toEntity(domain))` avec domaine sans `@Version` → entité détachée version=null → `persist()` échoue ("uninitialized version") puis `merge()` lève `OptimisticLock`. **Solution** : dans l'adapter JPA, charger l'entité gérée (findById) et recopier les champs mutables au lieu de persister un graphe détaché reconstruit.

## Tests
15 tests ciblés verts + **suite backend complète 96 verts / 0 échec**. `ProductControllerOwnershipTest` mis à jour (`archiveById`).

## Signaux mémoire
- `[MEMORY:pitfall]` update JPA via `repository.save(mapper.toEntity(domain))` sans `@Version` → détaché version=null → persist/merge échoue. Fix : update-in-place de l'entité managée.
- `[MEMORY:pattern]` soft delete + invisibilité globale via `@SQLRestriction("archived = false")` sur l'entité JPA (filtre toutes les lectures Hibernate) plutôt que filtre mémoire/WHERE répété.

## Recommandations suite
Aucune (pas de migration → pas de DB_EXPERT ; suite < 500 tests / < 3 min → pas de TEST_RUNNER). zod_dto_sync produit = NON (front S11).

STATUS: COMPLETED
