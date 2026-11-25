---
pack: category
kind: domain
name: Catégorie
generated_at: 2026-11-24T17:40:00
generator: synth/1
base_sha256: 1c3ba2b2ab8afb147eeb50d3153249366347f1d356cbb29094938375a527098e
facts_in_base: 142
facts_in_pool: 170
facts_cited: 37
sections: category.sections.json
details: [category.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: category.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : category, catégorie, categorie, categories
- Routes : `/api/categories`
- Entités : CategoryEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| system | Booléen exposé par la projection HTTP de la catégorie, que le modèle de domaine ne porte pas parmi ses champs (id, name, color, description, ownerId). Voir `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:30-45`. | [#c900077dbf944eb3-1] [#054a3aaf703706f1-1] |
| ownerId | Propriétaire de la catégorie, présent dans le modèle de domaine mais jamais exposé dans la réponse HTTP. | [#054a3aaf703706f1-1] [#c900077dbf944eb3-1] |
| owner | Relation LAZY vers l'utilisateur, jointe sur owner_id, et nullable en base. Voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:28-30`. | [#9f17359f6dd43cea-1] |

## 3. Règles {#rules}

### Création et renommage
- La création d'une catégorie est refusée avec CategoryNameConflictException si le propriétaire en possède déjà une du même nom exact, le contrôle portant sur le couple propriétaire et nom. `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:41-43` [#342e2f7788a4475a-2] [#ac68e69d979093aa-1]
- Lors d'un renommage, le contrôle de conflit n'a lieu que si le nouveau nom diffère de l'actuel, sinon la catégorie est sauvegardée sans recherche. `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:63-71` [#cdf300d7c27817be-1] [#1bdbbb2b2b4b24fe-2]
- La mise à jour d'une catégorie inconnue lève CategoryNotFoundException. [#583475e7062a5eb3-1]
- Un PATCH avec un nom vide renvoie 400 sans appeler updateCategory. [#integrations/e87412abb703d86b-1]
### Suppression et réassignation
- Si des produits référencent la catégorie et qu'aucune cible n'est fournie, la suppression est refusée par CategoryInUseException qui porte le nombre de produits, sans rien réassigner ni supprimer. `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:125-130` [#00f0d055b04edef3-1] [#ec943046dcf5e0f7-3]
- La cible doit exister (sinon CategoryNotFoundException), puis les produits sont réassignés en bulk et la catégorie supprimée dans la même transaction. `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:142-148` [#fbc822d2b906665b-1]
### Projection et compteurs
- Une catégorie est dite système quand son ownerId est null, et les compteurs restent null dans la projection sans comptage. `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:47-57` [#aed0f568191a3034-1]
- Avec compteurs, une valeur absente est remplacée par CategoryProductCounts.EMPTY, et le total est la somme des actifs et des archivés. `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:60-69` [#ebeca9da61b1c1c7-1] [#b5c50c99e560704c-1]
### Vérifié dans le code
- Un update d'id inconnu lève CategoryNotFoundException dans CategoryServiceImpl.updateCategory avant CategoryRepositoryJpaImpl.save, donc aucune création implicite [#583475e7062a5eb3-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:58-61`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryController.createCategory | Expose POST /api/categories avec un CategoryRequest validé, crée la catégorie pour l'appelant et répond 201 avec un CategoryResponse. | L47-57 | [#5d4de9737b8d7fe4-1] |
| CategoryController.getAllCategories | Expose GET /api/categories, qui liste les catégories de l'appelant et les catégories système, avec leurs compteurs de produits, et répond 401 sans appelant. | L59-80 | [#0170a42b57affd2f-1] |
| CategoryController.getCategoryById | Expose GET /api/categories/{id}, qui répond 404 si la catégorie n'est ni possédée par l'appelant ni système. | L82-96 | [#d1b77c1fd8b164d0-1] |
| CategoryController.deleteCategory | Expose DELETE /api/categories/{id} avec reassignToCategoryId optionnel, et répond 204 après suppression. | L121-155 | [#c3f8c255fa64dbd4-2] |
#### frontend:services/categoryService.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| createCategory | createCategory envoie POST /categories avec les données et les options, valide la réponse avec categorySchema.parse, et propage l'erreur axios pour l'affichage inline. | L59-71 | [#d4a7bea8ee8ef950-1] |
| updateCategory | updateCategory envoie PATCH sur /categories/{id} avec les données partielles et les options, puis valide la réponse avec categorySchema.parse. | L80-92 | [#5324d5474548a79d-1] |
| deleteCategory | deleteCategory envoie DELETE sur /categories/{id} via apiClient, en fusionnant les options reçues, et propage l'erreur après journalisation éventuelle. | L104-118 | [#4e18165a1bd821ee-1] |

## 5. Endpoints et écrans {#surface}

- Le point d'entrée HTTP est `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:47-51`, chaque route résolvant l'appelant et répondant 401 s'il est absent [#integrations/3cbc6ad692a65eaa-1] [#6fc50f0b113733e6-1], et le client front est `frontend:services/categoryService.ts:59-71` [#d4a7bea8ee8ef950-1].
- La lecture et la modification n'appliquent pas la même règle d'appartenance, car la lecture accepte les catégories système via `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:167-169` [#45903f846bdb1978-1], alors que la modification exige que l'owner soit l'appelant [#integrations/8e9c429e14d99314-1].
- Les compteurs de produits viennent d'une requête dédiée scopée au caller, qui n'est pas reconstruite à partir d'un comptage par catégorie [#0f363444e8ef529b-1].
- Côté front, la création propage l'erreur axios pour un affichage inline et valide la réponse par schéma, comme la mise à jour PATCH partielle [#d4a7bea8ee8ef950-1] [#5324d5474548a79d-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 20), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 19 | role_check 9, endpoint 4, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 38 | test_case 23, role_check 6, convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 28 | test_case 14, business_rule 5, convention 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 12 | convention 4, persistence_query 4, suspicious 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 10 | business_rule 7, service_method 3 |
| `frontend:services/categoryService.ts` | 12 | convention 3, endpoint 3, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java` | 19 | test_case 12, business_rule 4, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 7 | convention 4, entity 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java` | 5 | business_rule 2, convention 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java` | 3 | convention 2, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java` | 2 | business_rule 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java` | 3 | convention 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 25 | 14 |  |
| backend-core | 10 | 2 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'avec une cible, les produits actifs et archivés migrent avant la suppression, qu'un produit archivé reste archivé, et qu'une erreur de deleteById après réassignation remonte. [#3840d7f06f853e2d-2] [#c8aa8d37f01818e5-2] [#6e7fcbb795f82f39-1] [#8b47d0a54f642844-1]
- Côté API, un DELETE utilisé sans cible renvoie 409 avec le nombre de produits, et une cible égale à la catégorie renvoie 409 avec un message dédié. [#a24d15a2d893c519-2] [#a24d15a2d893c519-4]
- Les compteurs séparent produits actifs et archivés, valent 0 si la catégorie est absente de la map, et ne comptent que les produits de l'appelant sur une catégorie système partagée, contrairement à countByCategoryId. [#86005ad7688e238a-4] [integrations/fe41b39f745c9020-1] [integrations/d290b87af4c36960-1] [#e90c8521a757ba43-1]

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Pour la catégorie d'un autre utilisateur, les tests attendent 404 sur le GET et 403 sur PATCH et DELETE. Unifier les codes d'un côté casse les tests de l'autre, donc conserver cet écart ou modifier les deux ensemble [#8ecde30c288f4e1a-2] [#4709057d35de99a0-1] `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:265-335`.

## 11. Couverture {#coverage}

- Fichiers du pack : 20 ; avec au moins un fait en base : 20 ; sans fait après remise en file : 0.
- Faits en base : 142, repris d'autres packs : +51, hors périmètre : -0, doublons écartés à la déduplication : -23, soit 170 dans le pool.
- Faits du pool venus d'un autre pack : 35 (par pack : section Relations).
- Destination des 170 faits du pool : Lexique 5 ; Règles 19 ; Endpoints et écrans 30 ; Tests attendus 49 ; Alertes / Questions ouvertes 14 ; annexe seule 35 ; écartés (sorte `other` ou inconnue) 18.
- Base : sha256 1c3ba2b2ab8a…, générée le 2026-11-24.
