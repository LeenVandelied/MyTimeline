---
pack: category
kind: domain
name: Catégories
generated_at: 2026-11-19T10:19:38Z
generator: synth/1
base_sha256: 23a4a3a7747c5ed0f2aedfaebd229947cd9bad68a4e50d131353d53a1ea0ceb7
facts_in_base: 250
facts_in_pool: 261
facts_cited: 52
sections: category.sections.json
details: [category.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: category.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : category, catégorie, categorie
- Routes : `/api/categories`
- Entités : CategoryEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Catégorie système | Catégorie dont le propriétaire (owner) est null en base, la relation vers l'utilisateur étant nullable. Le front la reçoit sous un booléen system dans la réponse. | [#d1c2b5017da18818-1] [#f13590c6cb6176a2-1] |
| productCount et archivedProductCount | Deux compteurs optionnels distincts dans la réponse de catégorie côté front, définis dans `mytimeline:frontend/src/types/category.ts:26-34`. | [#f13590c6cb6176a2-1] |

## 3. Règles {#rules}

### Unicité du nom
- Le nom est unique par propriétaire, contrôlé par le service puis par la contrainte en base dont la violation devient un conflit de nom. [#b96cb766724289ab-1] [#578f6842481e6f5b-1] [#f14cd0b3652037cb-2]
### Suppression
- Une cible égale à la catégorie supprimée lève CategoryReassignTargetInvalidException (409 côté API), une cible inexistante lève CategoryNotFoundException. [#eaffb0c68ca429dd-2] [#51f71cc47fd8760e-1] [#45d650166c0d2b18-1]
- Les produits sont réassignés avant la suppression, dans la même transaction, et la cible est ignorée si aucun produit ne référence la catégorie. [#eaffb0c68ca429dd-3]
### Formulaire
- Le nom est obligatoire et limité à 255 caractères, côté API comme côté formulaire. [#212db779c23e173f-1] [#db60f762273b50d0-1]
- Un 409 pose une erreur inline sur le nom sans toast, et seule la création affiche un toast de succès. [#3e2d3afaed4325ae-1] [#6d9fef0b58da5670-2]
### Vérifié dans le code
- L'ownership d'une catégorie se compare sur le modèle domaine Category.getOwnerId() (CategoryController.isOwnedBy), pas sur CategoryEntity, et owner nul désigne une catégorie système [#f94398a063d9ab08-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:158-160`.
- CategoryController.deleteCategory n'appelle CategoryServiceImpl.deleteCategory qu'après isOwnedBy, et ProductServiceImpl.resolveAssignableCategory interdit d'affecter la catégorie d'autrui, donc le compte du 409 ne porte que sur les produits du propriétaire [#ae0776408d72d1fa-1] [#d1e473d0cfa17bc9-1] [#product/85b672acfc5e877a-1] [#product/a712e9e45d53dc59-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:135-137`.
- Le port CategoryRepository.save crée en silence si l'id est inconnu. Seul CategoryServiceImpl l'appelle, et updateCategory vérifie l'existence avant [#62712a2e7883632b-1] [#d0127fe635a527fd-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:60-61`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/components/products/CategoriesView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoriesView.handleDeleteConfirm | La catégorie à supprimer repasse à null après une suppression réussie, la mutation ayant résolu sans erreur. | L111 | [#7d554e4ca972c09a-1] |
| CategoriesView.editCategory | Le drawer d'édition ferme la catégorie en cours d'édition quand onOpenChange reçoit false. | L287 | [#0c81ffa00431f616-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryController.createCategory | POST /api/categories reçoit un CategoryRequest validé, renvoie 401 sans caller, sinon 201 avec un CategoryResponse. | L47-57 | [#64dfa7c41d4df423-1] |
| CategoryController.getAllCategories | GET /api/categories renvoie 401 sans caller, sinon la liste des catégories du caller et système, avec les compteurs de produits du caller. | L59-80 | [#5e931bf31739e0ab-1] |
| CategoryController.getCategoryById | GET /api/categories/{id} renvoie 401 sans caller, 200 si la catégorie est visible du caller, sinon 404. | L82-96 | [#6224b4fd9d99bac3-1] |
| CategoryController.updateCategory | PATCH /api/categories/{id} renvoie 401 sans caller, 404 si la catégorie est absente, 403 si elle n'est pas possédée par le caller, sinon 200 avec la catégorie mise à jour. | L98-119 | [#9af2c136426cac7c-1] |
| CategoryController.deleteCategory | DELETE /api/categories/{id} accepte le paramètre optionnel reassignToCategoryId, renvoie 204 après suppression, et contrôle l'ownership de la catégorie et de la cible. | L121-155 | [#d1e473d0cfa17bc9-1] |

## 5. Endpoints et écrans {#surface}

- Le contrôle d'appartenance se fait dans le controller. Un PATCH renvoie 404 si la catégorie est absente et 403 si elle n'est pas au caller, y compris pour une catégorie système sans propriétaire [#9af2c136426cac7c-1] [#a327b12c15860f52-1].
- Un GET par id sur la catégorie d'un autre utilisateur renvoie 404 et non 403, pour ne pas révéler son existence. Une catégorie est visible si son ownerId est null ou égal au caller [#6224b4fd9d99bac3-1] [#f94398a063d9ab08-1] [#2d0f29d6c718fb07-1].
- Le DELETE accepte reassignToCategoryId et exige que la catégorie et la cible appartiennent au caller (403 sinon, 404 si la cible est absente). Le fait source est partiel, il ne dit pas ce que devient le contenu sans cible [#d1e473d0cfa17bc9-1] [#ae0776408d72d1fa-1] [#31958407337960bf-1].
- Alerte. La recherche par nom `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:111-113` n'est pas scopée par propriétaire, alors que l'unicité du nom est par utilisateur [#208d9331683b9e01-1] [#affac85659b068b2-1] [#a3835a3af62f1506-1]. Pour un contrôle de doublon, utiliser la recherche par propriétaire et nom [#0078509643a7fda1-1].
- Le drawer passe en lecture seule pour une catégorie système en édition, et la carte affiche un libellé système [#043edf679aec4f96-1] [#79ed387050f55f09-4].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 32), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx` | 24 | business_rule 11, convention 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 17 | business_rule 7, service_method 5, validation 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 27 | test_case 18, role_check 5, convention 2 |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx` | 21 | other 8, ui_screen 5, business_rule 3 |
| `mytimeline:frontend/src/types/category.ts` | 11 | validation 4, business_rule 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 9 | endpoint 5, role_check 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 9 | persistence_query 5, suspicious 2, business_rule 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 19 | test_case 11, convention 4, other 2 |
| `mytimeline:frontend/src/services/categoryService.ts` | 10 | external_call 3, business_rule 2, other 2 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.test.tsx` | 26 | test_case 25, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 9 | convention 5, entity 2, db_change 1 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 9 | other 3, business_rule 2, db_change 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| backend-socle | 13 | 4 |  |
| integrations | 6 | 1 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que le doublon de nom d'un même owner lève CategoryNameConflictException (409 côté API) et qu'une violation d'unicité au save est convertie de même. [#480a65f9ec54062a-1] [#7e303b7ea07041e4-1] [#7cfa4d792ce7d36a-1] [#4b14ed68cd115b4d-1]
- Les tests fixent qu'une mise à jour sans changement de nom ne contrôle pas l'unicité. [#dc92c76befe8c0ab-1]
- Les tests du drawer fixent qu'une catégorie système n'a ni submit ni suppression, et que 12 couleurs de palette atteignent le contraste WCAG attendu. [#b331f731aaafbaa3-1] [#297ae7fe6cbd1f5c-1]
- Un test du drawer pour le 403 remplace l'adaptateur axios au lieu de mocker les hooks ou l'intercepteur, et un test fixe que useDeleteCategory transmet l'option HANDLES_FORBIDDEN_INLINE. [#b618abe1858cb165-1] [#d12e19332fde78b4-2]

## 9. Questions ouvertes {#questions}

- Le correctif de la règle des produits archivés est-il vraiment côté UI ? Le test fixe seulement qu'une catégorie avec un produit archivé lève CategoryInUseException sans cible [#da4056a8a53e2fe2-1] [#1695d72156758129-1].
- L'effet de réinitialisation du formulaire du drawer omet form de ses dépendances, est-ce voulu ? Une désactivation eslint est posée sans autre explication [#618f831075779054-1].

## 10. Alertes {#alerts}

- Le PATCH renvoie 403 pour la catégorie d'autrui alors que le GET renvoie 404, malgré le commentaire d'anti-énumération [#ebdb1fb9d77aec4d-1]. Un client peut deviner l'existence d'un id, donc aligner le PATCH sur le 404.
- Le commentaire du test de suppression promet un rollback de la réassignation, mais le test vérifie seulement la propagation de l'exception [#1d4a95510dba4342-1] [#1d42451de438738f-1]. Le rollback n'est pas couvert, donc ajouter un test d'intégration avant de toucher à la transaction.
- Le commentaire de useCategories annonce gcTime, mais le hook ne configure que la clé, la fonction et enabled [#4ca03ca5eae0a609-1] [#a9586da0f406c26d-1]. La durée de cache est celle par défaut, donc se fier au code.

## 11. Couverture {#coverage}

- Fichiers du pack : 32 ; avec au moins un fait en base : 32 ; sans fait après remise en file : 0.
- Faits en base : 250, repris d'autres packs : +24, hors périmètre : -0, doublons écartés à la déduplication : -13, soit 261 dans le pool.
- Faits du pool venus d'un autre pack : 19 (par pack : section Relations).
- Destination des 261 faits du pool : Lexique 4 ; Règles 42 ; Endpoints et écrans 42 ; Tests attendus 81 ; Alertes / Questions ouvertes 17 ; annexe seule 34 ; écartés (sorte `other` ou inconnue) 41.
- Base : sha256 23a4a3a7747c…, générée le 2026-11-19.
