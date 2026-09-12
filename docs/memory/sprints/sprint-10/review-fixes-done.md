# Corrections review batch — Sprint 10

**Commit :** 28a8a74
**Origine :** reviewer batch (Phase 7) — 1 MAJEUR bloquant + 2 MINEUR.

## Fixes
1. **Self-reassign catégorie (BLOQUANT)** — `CategoryServiceImpl.deleteCategory` : `id.equals(reassignToCategoryId)` rejeté AVANT réassignation → `CategoryInUseException` (409). Sans le garde : `updateCategoryForProducts(id,id)` no-op puis `deleteById(id)` → violation FK / orphelins.
2. **Nom blanc sur PATCH (BR-PRO-001)** — `ProductUpdateRequest.name` : ajout `@Pattern(".*\\S.*")` (skip null → compatible patch partiel, rejette `" "` → 400). `@NotBlank` impossible car name nullable.
3. **500-leak sur race d'unicité** — `GlobalExceptionHandler` : `@ExceptionHandler(DataIntegrityViolationException)` → 409 message générique, zéro fuite SQL.

## Tests
+5 : `CategoryServiceImplTest` (reassign-to-self), `CategoryControllerTest` (409 non supprimée), `ProductControllerOwnershipTest` (blank 400 + name absent 200), `GlobalExceptionHandlerValidationTest` (409 no-SQL-leak). **Suite backend 136/136 verte.**

## Signaux mémoire
- `[MEMORY:pitfall]` Opération « réassigner-puis-supprimer » : rejeter cible==source AVANT réassignation (sinon no-op + delete → FK/orphelins).
- `[MEMORY:pattern]` Check applicatif d'unicité + contrainte DB UNIQUE → mapper `DataIntegrityViolationException` → 409 générique (ne pas laisser fuiter en 500 sur race).

## Déférés en follow-ups (dette préexistante, hors scope S10)
- Dup boilerplate JWT-extract dans `ProductController` (~6×) → extraire `resolveCaller` [S | products].
- `Product`/`Event` domain model exposé en HTTP (AP-CAT-03 non rétrofit produit) → `ProductResponse` DTO [M | products].

STATUS: COMPLETED
