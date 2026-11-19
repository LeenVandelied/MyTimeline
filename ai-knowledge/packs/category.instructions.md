---
pack: category
kind: domain
name: Catégorie
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: ad00133c955601e6903bc81c4e0bf77d56a8a406a54e91bbd9475f427c49d8d8
facts_in_base: 324
facts_in_pool: 340
facts_cited: 61
sections: category.sections.json
details: [category.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: category.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : category, catégorie, categorie, categories
- Routes : `/api/categories`, `api/categories`
- Entités : CategoryEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Catégorie système | Catégorie sans propriétaire (ownerId nul), exposée par le champ system de la réponse. La relation owner est nullable en base. | [#aed0f568191a3034-1] [#9f17359f6dd43cea-1] |
| Produits actifs et archivés | Deux compteurs séparés par catégorie et par utilisateur, portés par un record du domaine. | [#250c395d00e0eb99-1] |
| productCount | Côté interface, nombre de produits actifs de la catégorie, affiché dans le badge des actifs. | [#60de531a4a370f5d-1] [#3a19573584cd6a98-1] |
| archivedProductCount | Côté interface, nombre de produits archivés, montré à part dans la mention des archivés (clé archivedCount). | [#b853098add97b9dc-1] [#3a19573584cd6a98-1] |
| categories.drawer.errors.forbidden | Message affiché dans le drawer quand la création de catégorie reçoit un 403. | [#bd229e49e5c3e1fd-1] |

## 3. Règles {#rules}

### Suppression
- Une cible identique à la catégorie supprimée lève CategoryReassignTargetInvalidException et une cible absente lève CategoryNotFoundException, avant toute réassignation. [#3e67bbffd9fd5f2d-3] [#3e67bbffd9fd5f2d-4]
- Les produits sont réassignés avant la suppression de la catégorie source, et une catégorie sans produit est supprimée directement. [#ec943046dcf5e0f7-4] [#ec943046dcf5e0f7-2]
- La chaîne de contrôles de suppression est dans `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:117-144`, et un id inconnu lève CategoryNotFoundException. [#3e67bbffd9fd5f2d-1]
### Unicité du nom
- La mise à jour ne contrôle l'unicité que si le nom change, donc renommer vers son nom actuel passe sans contrôle. [#cdf300d7c27817be-1] [#1bdbbb2b2b4b24fe-2]
### Catégories système et compteurs
- Des compteurs absents valent CategoryProductCounts.EMPTY, et le front somme produits actifs et archivés avec 0 par défaut pour armer la réassignation. [#ebeca9da61b1c1c7-1] [#fb9e95c8707c0778-1] [#58c1d9dbc63e7e0d-1] [#ce4ae0f3a712d1d2-1]
### Vérifié dans le code
- Les catégories système (owner NULL) échappent à uq_categories_owner_name. L'API ne les crée ni ne les modifie (CategoryController.createCategory passe caller.getId(), updateCategory renvoie 403 si isOwnedBy est faux) [#5d4de9737b8d7fe4-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:54-55`.

## 4. Structure {#structure}

#### frontend:components/categories/CategoryDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryDrawer | Le composant CategoryDrawer unifie la création et l'édition d'une catégorie, en mode create par défaut, dans un Dialog Radix. | L106-115 | [#4d8af8582ea0f9dc-1] |
| CategoryDrawer.syncedFor | À chaque changement de open, isEdit ou category, l'état local est réinitialisé pendant le rendu et, si le drawer est ouvert, l'erreur de soumission et le conflit de nom sont remis à zéro. (partiel) | L162-167 | [#0a7e281ecbe1a8f9-1] |
| CategoryDrawer.DialogContent | Le contenu du dialogue est une feuille du bas sur mobile et un panneau latéral de pleine hauteur de 452px à partir du breakpoint sm, avec onCloseAutoFocus relayé. | L264-269 | [#08e6b1a424efe5e5-1] |
| CategoryDrawer.previewBadge | Le badge d'aperçu prend la couleur choisie ou la variable accent en repli, et affiche le nom saisi ou le libellé de remplacement. | L399-401 | [#bc7e5bfd07b218b0-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryController | Contrôleur REST monté sur le chemin /api/categories. | L35 | [#0792e9dce033da93-1] |
| CategoryController.createCategory | POST crée une catégorie pour le caller, répond 201 avec un CategoryResponse, et 401 si aucun caller n'est résolu. | L48-56 | [#5d4de9737b8d7fe4-1] |
| CategoryController.getAllCategories | GET renvoie la liste des catégories visibles du caller avec leurs compteurs de produits. | L60-79 | [#0170a42b57affd2f-1] |
| CategoryController.getCategoryById | GET par id renvoie la catégorie si elle est visible du caller, sinon 404. | L83-95 | [#586df9e0c912a891-1] |
| CategoryController.updateCategory | PATCH met à jour une catégorie du caller et renvoie 200 avec le CategoryResponse, 404 si absente, 403 si non possédée. | L99-119 | [#83c53fe617a152b8-1] |
| CategoryController.updateCategory | Après mise à jour, la réponse 200 porte le CategoryResponse de la catégorie modifiée, sans compteurs. | L118 | [#83c53fe617a152b8-2] |
| CategoryController.deleteCategory | DELETE supprime une catégorie du caller, avec un paramètre optionnel reassignToCategoryId en query string. | L122-124 | [#29cd1e0ef93cd890-1] |
| CategoryController.deleteCategory | La suppression délègue au service puis renvoie 204 No Content. | L153-154 | [#29cd1e0ef93cd890-2] |

## 5. Endpoints et écrans {#surface}

- Le contrôleur REST est monté sur /api/categories dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:35` [#0792e9dce033da93-1], et le front principal est le dossier `frontend:components/categories/CategoryDrawer.tsx:106-115` qui unifie création et édition [#4d8af8582ea0f9dc-1].
- Chaque endpoint résout le caller via CallerResolver et renvoie 401 s'il est absent, la création répondant 201 sinon, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:48-56` [#6fc50f0b113733e6-1] [#5d4de9737b8d7fe4-1].
- Le PATCH renvoie 404 si la catégorie est absente, puis 403 si elle n'est pas possédée par le caller, owner nul compris, ce qui ferme les catégories système à la modification [#integrations/8e9c429e14d99314-1] [#033671903ea98914-2].
- Le GET par id renvoie 404 pour une catégorie non visible, sans distinguer l'absence d'une catégorie appartenant à autrui [#integrations/cb5a886f19e941ef-1].
- Le service réassigne en bulk les produits vers la cible avant de supprimer la catégorie, dans la même transaction, voir `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:145-148` [#fbc822d2b906665b-1] [#fbc822d2b906665b-2].
- Le PATCH répond avec un CategoryResponse sans compteurs de produits, alors que le GET de liste les inclut [#83c53fe617a152b8-2] [#0170a42b57affd2f-1] [#136f7f3310c23455-1].
- Dans CategoryDrawer, la soumission ne fait rien en lecture seule (catégorie système), et le bouton de suppression comme sa boîte de confirmation ne sont rendus qu'en édition d'une catégorie non système [#422838874afef32e-1] [#485059f4b33844b1-1] [#c8e8e272adfbc402-1].
- Le bouton de suppression d'une card de CategoriesView est masqué pour les catégories système, selon ADR-002 [#ca1b5ab973389156-1].
- Le drawer est une feuille du bas sur mobile et un panneau latéral de 452px à partir du breakpoint sm, voir `frontend:components/categories/CategoryDrawer.tsx:264-269` [#08e6b1a424efe5e5-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 32), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:components/categories/CategoryDrawer.tsx` | 38 | business_rule 11, other 7, convention 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 19 | endpoint 8, role_check 8, convention 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 31 | test_case 11, business_rule 6, convention 5 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 19 | service_method 7, validation 5, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java` | 18 | business_rule 10, test_case 5, service_method 2 |
| `frontend:types/category.ts` | 15 | business_rule 5, convention 3, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 27 | test_case 20, role_check 5, other 1 |
| `frontend:components/products/CategoriesView.tsx` | 17 | business_rule 4, other 4, convention 2 |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql` | 13 | business_rule 3, convention 3, db_change 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 10 | convention 4, persistence_query 4, suspicious 2 |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx` | 20 | convention 9, other 5, test_case 5 |
| `frontend:components/categories/CategoryDrawer.test.tsx` | 25 | test_case 21, convention 3, other 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 13 | 4 |  |
| backend-core | 15 | 1 |  |
| frontend-core | 1 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un nom déjà pris par le même utilisateur donne 409 en POST et PATCH, et qu'une DataIntegrityViolationException au save est mappée en CategoryNameConflictException [#2c1f8c2b2134e263-3] [#8ecde30c288f4e1a-4] [#df2360bc5cabb493-2] [#b146abd285894957-1].
- Les tests fixent que linkedProductsCount transmis au dialog de suppression cumule actifs et archivés [#a4b371da0d2ebb47-1] [#eebc92117100004c-1].
- Les tests du drawer fixent qu'une couleur stockée hors palette est renvoyée à l'identique tant qu'aucune pastille n'est choisie [#14ef819107f2910c-18] [#14ef819107f2910c-19].
- Un test de contrôleur arrange l'appelant par le helper stubCaller sur CallerResolver.currentUser [#defe86b54eb25053-1].

## 9. Questions ouvertes {#questions}

- Une cible de réassignation qui est une catégorie système est-elle voulue ? Le contrôleur exige que la cible appartienne au caller [#c3f8c255fa64dbd4-2] et aucun test ne couvre le cas owner null [#ad88eb77ba10ec8d-1].
- Faut-il retirer le désactivage de la règle exhaustive-deps dans l'effet du drawer ? La liste de dépendances omet form [#95af34937502ece0-1].

## 10. Alertes {#alerts}

- Le catch de création et celui de mise à jour convertissent toute violation d'intégrité du save en conflit de nom , donc une autre violation (clé étrangère, nullité) remonte comme un conflit de nom. Avant d'ajouter une contrainte ⇒ contrôler la cause avant le mapping (`backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:49-53`) [#c421fce519d4d6c6-1] [#3e1952ab25b225d1-1]
- Le service lit une catégorie par id sans filtre de propriétaire [#914b869025f3ea34-1], le filtre de visibilité (404) est dans le contrôleur [#integrations/cb5a886f19e941ef-1]. Tout nouvel appelant du service doit refaire ce filtre, sinon l'existence d'une catégorie d'autrui fuit.
- Si l'id du domaine n'existe pas en base, save crée l'entité avec cet id et sans version ⇒ Ne pas supposer qu'un save avec id échoue sur un id inconnu (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:109-114`) [#16a7922f922f3c0a-1]
- Selon le commentaire, la recherche par nom est legacy, sans filtre de propriétaire, et renvoie la première trouvée [#25c0b5b76c901770-1]. Utiliser la recherche par propriétaire et nom, que le test borne au propriétaire [#fb0e606547f2957f-1].
- La javadoc du test de suppression dit que le @Transactional annule la réassignation si la suppression échoue [#a3777ad3456f3068-1], mais le test ne vérifie que la propagation de l'exception [#8b47d0a54f642844-1]. Le rollback n'est pas prouvé par les tests.

## 11. Couverture {#coverage}

- Fichiers du pack : 32 ; avec au moins un fait en base : 32 ; sans fait après remise en file : 0.
- Faits en base : 324, repris d'autres packs : +34, hors périmètre : -0, doublons écartés à la déduplication : -18, soit 340 dans le pool.
- Faits du pool venus d'un autre pack : 29 (par pack : section Relations).
- Destination des 340 faits du pool : Lexique 11 ; Règles 41 ; Endpoints et écrans 60 ; Tests attendus 83 ; Alertes / Questions ouvertes 27 ; annexe seule 74 ; écartés (sorte `other` ou inconnue) 44.
- Base : sha256 ad00133c9556…, générée le 2026-11-19.
