---
pack: product
kind: domain
name: Produit
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 48603b17eec1692561b8c8848c9a1c4ecb2a0d40d8cc4dbbaa436654b0a99b3b
facts_in_base: 216
facts_in_pool: 238
facts_cited: 54
sections: product.sections.json
details: [product.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: product.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : product, produit, products
- Entités : ProductEntity

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles {#rules}

### Archivage et restauration
- Un produit inconnu, non archivé ou d'un autre utilisateur donne la même ProductNotFoundException (réponse uniforme). [#ee944d529b683e6d-1]
### Création
- La catégorie est obligatoire et doit appartenir à l'appelant ou être système, sinon CategoryNotFoundException est levée. [#f1ff1bcbd432dc1a-1] [#5905874ac78b836f-1]
### Mise à jour partielle
- clearColor, prioritaire, remet la couleur à null, sinon elle n'est remplacée que si la valeur fournie est non null. [#1f81adc7889b6ff7-3]
- Le nom (1 à 100 caractères, pas uniquement des espaces) et la couleur (#RRGGBB) sont validés, null étant ignoré. [#e6032e4c6921b184-2] [#85cfb8bf280a8bdd-1]
### Vérifié dans le code
- Ne pas utiliser ProductRepositoryJpaImpl.save pour détecter l'absence d'un produit : charger d'abord avec findDomainProductById et lever ProductNotFoundException, comme le font updateProduct et archiveById [#01e0685abee3c880-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:123-124`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductServiceImpl.archiveById | Passe le produit à archived true par soft delete puis le sauvegarde, en levant ProductNotFoundException si le produit est introuvable. (partiel) | L174-179 | [#7e4b226aac0bc03f-1] |
| ProductServiceImpl.restoreProduct | Restaure un produit archivé via un UPDATE natif filtré sur id, user_id et archived, et lève ProductNotFoundException si aucune ligne n'est modifiée. (partiel) | L195-200 | [#1633108a3ab71d25-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductRepositoryJpaImpl.restoreArchivedByIdAndUserId | Le produit passe de archived = true à archived = false par restoreArchivedByIdAndUserId, si l'id, le user_id et archived = true correspondent, et la méthode renvoie le nombre de lignes modifiées. | L249-259 | [#b94a2c6577ba3262-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController.createProduct | POST /api/users/{userId}/products crée un produit, renvoie 201 avec ProductResponse, 401 sans caller et 403 si userId du path diffère du caller. | L50-66 | [#08ca27937943ea62-1] |
| ProductController.getProducts | GET /api/users/{userId}/products renvoie la liste des ProductResponse du caller, avec 401 sans caller et 403 si userId diffère du caller. | L68-85 | [#38b72c1d6851ad52-1] |
| ProductController.getArchivedProducts | GET /api/users/{userId}/products/archived renvoie la liste des ArchivedProductResponse du caller, avec les mêmes contrôles 401 et 403. | L92-106 | [#2ba17dfa95093054-1] |
| ProductController.restoreProduct | POST /api/users/{userId}/products/{productId}/restore restaure le produit et renvoie 204, sans lecture préalable de la cible, 401 sans caller et 403 si userId diffère du caller. | L118-132 | [#214af15c4a16cfc3-1] |

## 5. Endpoints et écrans {#surface}

- La restauration ne lit pas la cible dans le contrôleur et laisse le service vérifier l'ownership via userId, donc le 404 ne vient que de ProductNotFoundException [#214af15c4a16cfc3-1] [#1b85008a2de7f5c1-1].
- Les autres routes sur un produit lisent d'abord le produit puis contrôlent la propriété, 404 si absent et 403 si c'est un produit d'autrui [#integrations/19fecc33e428b2ad-1] [#a692ab10977b0f60-1].
- Un produit sans utilisateur est considéré comme n'appartenant à personne, la vérification de propriété renvoie faux [#integrations/ee9ecada784b2990-1].
- DELETE archive le produit (soft delete) et renvoie 204, il ne le supprime pas [#895ce336064b5985-1].
- Les archivés ont leur propre route et leur propre requête native, triée par date de mise à jour décroissante puis par id [#2ba17dfa95093054-1] [#2f24c825d05e665c-1].
- La restauration ne modifie que les produits archivés du userId donné et retourne le nombre de lignes modifiées [#3e052d935a2dbdca-1].
- Une RuntimeException levée par le service pendant la liste se propage et n'est pas convertie en 401, comportement fixé par un test [#integrations/38fae44ada312d48-2].
- Un PATCH sur le produit d'un autre utilisateur renvoie 403 sans appeler updateProduct [#integrations/25068b338c5f8b14-1] [#b8e07eeec1904e4d-1].
- La création lève UserNotFoundException si l'utilisateur n'existe pas, et le front injecte le userId dans le corps en plus du chemin [#8236045f458a8db1-1] [#b11cebb63b3990b9-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 19), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` | 36 | test_case 15, role_check 9, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` | 20 | business_rule 7, service_method 5, suspicious 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java` | 26 | persistence_query 9, convention 7, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java` | 17 | endpoint 8, role_check 4, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java` | 22 | convention 8, test_case 8, business_rule 2 |
| `frontend:services/productService.ts` | 20 | convention 7, other 7, suspicious 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` | 21 | test_case 11, convention 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` | 16 | entity 8, other 4, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 10 | persistence_query 7, convention 2, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ProductServiceImplTest.java` | 21 | test_case 18, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ProductCreationRequest.java` | 4 | validation 3, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 20 | 13 |  |
| backend-core | 8 | 5 |  |
| frontend-core | 6 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que clearColor remet la couleur à null et l'emporte sur color, que l'absence de color laisse la valeur et qu'une création sans couleur persiste null. [#bbfc4f67ad3dc4f3-1] [#ab04586cc2314a7e-1] [#1ff9190d9f49ffee-1]
- Les tests fixent que PATCH avec name vide ou blanc donne 400 sans appel au service, et qu'un PATCH avec seulement categoryId donne 200. [#1cfd6e24b15be414-1] [#56ee0eef1027811f-1] [#fb61a40c3eff3e71-1]
- Les tests fixent que les réponses ne contiennent ni user ni owner, et que les archivés n'ont ni events ni archived. [#3d1c8f1b7951785a-1] [#230d3c1e55d17b27-1] [#94942f07db2a5e6b-1]
- Un test de contrôleur doit brancher GlobalExceptionHandler via setControllerAdvice, sinon le 404 sur ProductNotFoundException n'est pas obtenu. [#0e76e9555a6756f0-1]

## 9. Questions ouvertes {#questions}

- Le 403 de restauration est-il voulu côté client ? restoreProduct du service frontend n'accepte pas de paramètre options, contrairement aux autres mutations produit. [#integrations/145742ba350d6f89-1]
- Les produits sans catégorie doivent-ils rester hors du comptage ? Les lignes dont category_id est null sont ignorées sans erreur dans countByCategoryForUser. [#7e554cf0d1309bdb-1]
- getProducts et createProduct du frontend divergent-ils volontairement de categoryService ? Le premier n'a pas de validation Zod, le second journalise toute erreur. [#integrations/bdb861ee54c6c577-1] [#integrations/dda27156f28e13ec-1]

## 10. Alertes {#alerts}

- Un produit existant sans événement renvoie 404 sur la route des événements au lieu d'une liste vide, ce qui contredit la règle des produits sans événement. Traiter ce 404 comme une liste vide côté client ou corriger le contrôleur. [#4593c850244cd3aa-1]
- ProductMapper.toDomain appelle getEvents().stream() sans test de null, et Product.addEvent ajoute sans test alors que hasEvents gère le null. Une liste nulle fait échouer ces appels, l'initialiser avant. [#cd959b5c2a578081-1] [#backend-core/7609dab35d65be14-1]
- Le commentaire du contrôleur de mise à jour attribue au service la validation des bornes du nom, mais le service pose le nom sans contrôle et seul le DTO valide. Tout appel au service hors DTO validé contourne les bornes, garder les annotations du DTO. [#b4d705cd3e628fe2-1] [#1f81adc7889b6ff7-1]
- createProduct construit chaque Event avec product.getId() alors que le produit vient d'être créé avec un id null. La valeur transmise est null à ce stade, ne pas supposer l'id renseigné dans ce flux. [#5fdd4ac6b14115d8-1]
- La liste events de ProductCreationRequest n'a pas @Valid dans ce fichier, donc les contraintes des événements imbriqués ne sont pas déclenchées par cette classe seule. Vérifier où elles sont appliquées avant d'y compter. [#backend-core/d58358f7f920e99c-1]
- ProductEntity.hashCode renvoie le hash de la classe, identique pour toutes les instances, alors que equals se fonde sur id. Éviter de mettre ces entités dans des ensembles hachés volumineux. [#0d1a3b72ab180c62-1]
- Selon la javadoc, getProductsWithEvents liste tous les produits, avec ou sans événements, et le code retourne bien tous ceux de l'utilisateur. Le nom trompe, ne pas supposer un filtre. [#94c60305c01dfa59-1] [#df007001f59cff4d-1]
- Le port ProductRepository importe une annotation Spring et le port ProductService utilise des DTO de la couche application, contre la règle hexagonale du projet. Ne pas copier ce modèle, préférer les commandes du domaine comme EventService. [#backend-core/f5728797d94e6d35-1] [#backend-core/54c376e6a3ecbd60-1]
- Un test affirme que les événements d'un produit archivé sont inaccessibles mais n'asserte que findDomainProductById, et un autre accepte toute Exception. Ils prouvent moins que leur nom, ne pas s'y fier comme garantie. [#ea7a4b9c5c1b2b40-1] [#80aacdf81dad7441-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 18 ; avec au moins un fait en base : 18 ; sans fait après remise en file : 0.
- Faits en base : 216, repris d'autres packs : +52, hors périmètre : -0, doublons écartés à la déduplication : -30, soit 238 dans le pool.
- Faits du pool venus d'un autre pack : 34 (par pack : section Relations).
- Destination des 238 faits du pool : Lexique 9 ; Règles 19 ; Endpoints et écrans 50 ; Tests attendus 52 ; Alertes / Questions ouvertes 37 ; annexe seule 46 ; écartés (sorte `other` ou inconnue) 25.
- Base : sha256 48603b17eec1…, générée le 2026-11-20.
