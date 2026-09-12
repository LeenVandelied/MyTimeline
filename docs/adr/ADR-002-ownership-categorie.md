# ADR-002 — Propriété des catégories par utilisateur (`ownerId`)

- Statut : Accepté
- Date : 2026-07-01
- Contexte : Sprint 10, issue #52 (CRUD catégorie complet + suppression avec réassignation)
- Migration Flyway associée : `V8__category_ownership.sql`
- Supersede : l'état « référentiel global partagé » décrit dans `br-categories` (AP-CAT-09)

## Contexte

Avant #52, les catégories étaient un **référentiel global partagé** (`Category`
= value object `id + name`, aucune notion de propriétaire). Conséquences :

- Aucune garde d'accès par catégorie : n'importe quel utilisateur authentifié
  pouvait (en théorie, l'endpoint update étant mort — BR-CAT-006) modifier ou
  supprimer une catégorie d'un autre.
- L'unicité du nom (BR-CAT-004, non implémentée) ne pouvait être que **globale**,
  ce qui interdit à deux utilisateurs d'avoir chacun une catégorie « Voiture ».
- Le front (`AddProducts.tsx`, BR-CAT-007) référence **4 UUID de catégorie
  hardcodés** (`7446a49c…`, `dbc134fb…`, `9817e487…`, `ec088b7c…`) qui ne
  correspondent à **aucune ligne en base** — références fantômes cassées.

Le design cible (multi-utilisateurs) exige que chaque utilisateur gère **ses**
catégories, isolées de celles des autres.

## Décision

1. **Propriété par utilisateur (`owner_id`).** Ajout d'une colonne `owner_id`
   (`uuid`, FK `users`, **NULLABLE**) sur `categories` via `V8`. Mapping JPA :
   `CategoryEntity.owner` `@ManyToOne(LAZY) @JoinColumn(name = "owner_id")`.

2. **Ownership sur PATCH et DELETE = 403 si mismatch.** Le contrôleur dérive le
   caller du JWT (cookie `jwt`) et exige `category.ownerId == caller.id`. Une
   catégorie appartenant à un autre utilisateur **ou** sans propriétaire (owner
   NULL) renvoie **403** (`{"error":"forbidden"}`).

3. **Unicité du nom PAR UTILISATEUR (BR-CAT-004).** Contrainte
   `UNIQUE(owner_id, name)` (nommée `uq_categories_owner_name`) + check applicatif
   409 (`CategoryNameConflictException`) avant création/modification. Deux
   utilisateurs distincts peuvent porter le même nom de catégorie.

4. **Backfill EXPLICITE : owner NULL = catégorie « système ».** Les catégories
   existantes au moment de la migration **ne sont rattachées à aucun user**
   (`owner_id` reste NULL). Sémantique retenue :
   - **Lisible de tous** : `GET /api/categories` les liste (référentiel résiduel).
   - **Modifiable/supprimable par personne** : PATCH/DELETE sur owner NULL -> 403
     (NULL ≠ callerId).

   Justification du choix (vs « rattacher au premier user seedé ») : la table
   `categories` ne contient **aucune ligne seedée** au moment de la migration (les
   4 UUID hardcodés front sont des références fantômes sans ligne en base).
   Approprier arbitrairement des catégories existantes à un utilisateur serait
   **incorrect** (aucun user n'en est réellement propriétaire) et introduirait un
   comportement implicite. On préfère la sémantique explicite « système / non
   modifiable ». **Aucun comportement implicite n'est laissé.**

5. **Suppression avec réassignation atomique.** `DELETE /api/categories/{id}` :
   si des produits référencent la catégorie, `?reassignToCategoryId={uuid}` est
   **obligatoire** ; les produits (archivés inclus) sont déplacés vers la cible
   **AVANT** la suppression, en **UNE `@Transactional`**. Sans cible : **409** avec
   message métier (`"La catégorie est utilisée par N produits. Fournissez
   reassignToCategoryId."`). L'ownership de la cible est aussi vérifié (403).

## Garde-fous

- `ddl-auto=validate` (#42) : `owner_id` NULLABLE matche exactement le mapping
  `@ManyToOne` (sans `nullable=false`).
- `NULL` distinct en Postgres : `UNIQUE(owner_id, name)` ne contraint pas les
  catégories système (owner NULL) entre elles — acceptable, elles ne sont ni
  créées ni modifiables via l'API après V8.
- Réassignation en SQL **natif** (`countByCategoryId` / `updateCategoryForProducts`)
  pour contourner le `@SQLRestriction("archived = false")` de `ProductEntity` :
  sinon un produit archivé référençant la source resterait orphelin (violation FK).
- Réassignation AVANT delete dans la même transaction : si le delete échoue, le
  bulk update est rollback -> aucun produit orphelin.

## Conséquences

- **Casse les 4 UUID hardcodés front** (`AddProducts.tsx`) jusqu'à la **Wave 3
  front (#61)** : le front devra faire `GET /api/categories` et créer/sélectionner
  des catégories possédées, au lieu des UUID en dur. Contrat inchangé côté lecture
  (les catégories système restent listées).
- Nouvelle BR ownership catégorie : `owner_id == JWT` requis sur PATCH/DELETE.
- `Category` (domaine) porte désormais `ownerId` ; DTOs `CategoryRequest` /
  `CategoryUpdateRequest` / `CategoryResponse` remplacent l'exposition du domain
  model (AP-CAT-03). La synchronisation Zod frontend est **reportée à S11**
  (issue #52 = backend only).
- Deux nouvelles exceptions métier : `CategoryNameConflictException` (409),
  `CategoryInUseException` (409).
