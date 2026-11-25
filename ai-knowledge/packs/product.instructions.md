---
pack: product
kind: domain
name: Produit
generated_at: 2026-11-25T15:00:00
generator: synth/1
base_sha256: f617040c5848ea7419279b0ebbd6470e39225471b2270772fbfec5f565af4b71
facts_in_base: 240
facts_in_pool: 301
facts_cited: 51
sections: product.sections.json
details: [product.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: product.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : product, produit, products
- Entités : ProductEntity

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles {#rules}

### Création
- Le quota ne s'applique pas quand la monétisation est désactivée ou l'utilisateur est null, FREE et PLUS sont bornés par leur limite et PRO est illimité. [#11e0f21a84422e3d-1] [#11e0f21a84422e3d-2]
### Mise à jour
- Dans un PATCH, clearColor prioritaire remet la couleur à null même si une couleur est fournie, et une couleur null seule la laisse inchangée. [#1f81adc7889b6ff7-4] [#abe44a2a3ad1bbde-1]
- Un nom de PATCH fait 1 à 100 caractères sans être blanc, null est ignoré et le rejet en 400 précède le service. [#e6032e4c6921b184-2] [#f78d9c0de8326bdd-2]

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductServiceImpl.archiveById | Passe le produit à archived true par setArchived(true) puis le sauvegarde, et lève ProductNotFoundException si le produit est absent. (partiel) | L190-195 | [#7e4b226aac0bc03f-1] |
| ProductServiceImpl.restoreProduct | La restauration échoue avec ProductNotFoundException quand le nombre de lignes modifiées est zéro, soit produit inconnu, non archivé ou appartenant à un autre utilisateur. (partiel) | L213-215 | [#ee944d529b683e6d-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductService.archiveById | archiveById fait passer le produit de archived à false vers archived à true, sans suppression physique de la ligne. (partiel) | L209 | [#integrations/c8ad55e4fb12fd53-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductRepositoryJpaImpl.restoreArchivedByIdAndUserId | Un produit archivé passe à archived égal à false par UPDATE natif, seulement si id et user_id correspondent et que archived vaut true dans le même WHERE, avec incrément de version et mise à jour de updated_at. (partiel) | L257-267 | [#integrations/e72f9182ccf38928-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController | Contrôleur REST dont les routes sont préfixées par /api. | L37-38 | [#3c60f5d05550c6f7-1] |
| ProductController.createProduct | POST /api/users/{userId}/products, reçoit un ProductCreationRequest validé, répond 201 avec ProductResponse, ou le statut de refus de requireOwner. | L54-66 | [#08ca27937943ea62-1] |
| ProductController.getProducts | GET /api/users/{userId}/products, renvoie la liste des ProductResponse de l'utilisateur après contrôle requireOwner. | L68-82 | [#38b72c1d6851ad52-1] |

## 5. Endpoints et écrans {#surface}

- Les routes produit vivent dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java:37-38` sous le préfixe /api [#3c60f5d05550c6f7-1], et le front les appelle via `frontend:services/productService.ts:18-45` [#b11cebb63b3990b9-1].
- Sur les routes par productId, un chemin qui correspond à l'appelant ne suffit pas : un produit d'un autre propriétaire reçoit 403 et un produit absent 404 [#a692ab10977b0f60-1] [#612b7cd55d571598-1] [#integrations/b5e740085931eb05-1]. Ce contrôle est répété dans update, delete et events [#integrations/19fecc33e428b2ad-2], et un produit sans propriétaire renseigné est refusé [#fa80e328df0f56b0-2].
- DELETE ne supprime pas : il archive le produit et répond 204 [#895ce336064b5985-1]. Un DELETE sur un produit d'autrui répond 403 sans archiver [#integrations/c8091f7bc266881b-1].
- La liste GET /products n'inclut pas les archivés (exclus par @SQLRestriction selon la javadoc) [#2cf44af0f6907afa-1] et charge les événements [#a404ffbc862a833b-1]. La liste /products/archived vient d'une requête native distincte, sans événements, triée par mise à jour décroissante [#2f24c825d05e665c-1] [#2ba17dfa95093054-1].
- Le PATCH valide la catégorie cible contre le propriétaire du produit et non contre l'appelant [#04bf5d072340f230-1]. Une catégorie d'un autre utilisateur est traitée comme inexistante, une catégorie sans propriétaire reste assignable [#e6c8d4fc25ec6d20-1] [#5905874ac78b836f-2].
- Le PATCH est partiel : name et category ne changent que si fournis, et color suit clearColor puis color [#1f81adc7889b6ff7-3].
- La création contrôle le quota de l'utilisateur avant d'enregistrer le produit et ses événements [#787ddafee8cb5825-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 29), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` | 38 | role_check 10, test_case 10, validation 6 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` | 34 | convention 11, service_method 7, business_rule 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java` | 23 | endpoint 9, role_check 5, convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java` | 26 | test_case 10, convention 7, business_rule 4 |
| `frontend:services/productService.ts` | 20 | convention 7, other 7, suspicious 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` | 13 | entity 5, convention 3, business_rule 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ProductServiceImplTest.java` | 15 | test_case 9, business_rule 6 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` | 20 | test_case 11, business_rule 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 10 | persistence_query 7, convention 2, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductPathOwnershipIntegrationTest.java` | 10 | convention 4, role_check 2, test_case 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java` | 16 | persistence_query 7, other 6, convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 40 | 15 |  |
| backend-core | 36 | 13 |  |
| frontend-core | 6 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent le quota d'un lot pour un compte gratuit : 18 événements possédés plus 3 sont refusés sans aucun save, 17 plus 3 sont acceptés. [#4de9547380354437-1] [#backend-core/8ccee0097639357c-2] [#d87e112a6ce3fdf3-1]
- Les tests fixent la restauration : 204 avec version relue à 1 en SQL natif, 404 pour un produit d'autrui, inconnu ou actif, 403 si le chemin diffère. [#0ec6802f2a932147-1] [#db988d4f7835ee90-1] [#888010a00ad834aa-1] [#441bfc843eb29e7f-1] [#d62c687ed28b897c-1]
- Les tests fixent qu'un PATCH sur le nom seul laisse categoryId et color à null et clearColor à false, et qu'une catégorie d'un autre utilisateur lève CategoryNotFoundException. [#dfdb4b2ae7bedef6-1] [#ce53344659d7f357-1]

## 9. Questions ouvertes {#questions}

- Les écarts de productService.ts avec categoryService sont-ils voulus ? getProducts ne valide pas la réponse avec Zod et createProduct journalise toute erreur, y compris 403, 404 et 409 [#integrations/bdb861ee54c6c577-1] [#integrations/dda27156f28e13ec-1].

## 10. Alertes {#alerts}

- La route des événements d'un produit répond 404 quand la liste est vide, alors que la création accepte une liste null ou vide et qu'un test le vérifie [#4593c850244cd3aa-1] [#14ee1b6e889854a1-2] [#09543570e51aec71-1]. Un produit sans événement est donc créé puis traité comme introuvable par cette route, alors ne pas lire ce 404 comme un produit inconnu et trancher la règle avant de modifier l'un des deux côtés.
- Le quota est lu par un décompte sans verrou avant la boucle de construction des événements, ce qui correspond au risque de dépassement décrit dans la javadoc de PlanPolicy [#5fdd4ac6b14115d8-2]. Deux créations simultanées peuvent dépasser le quota, donc ne pas supposer la limite stricte et ajouter un verrou ou une contrainte si elle doit l'être.
- ProductMapper.toDomain appelle getEvents().stream() sans test de null, et Product.addEvent ajoute sans test alors que hasEvents gère le null [#cd959b5c2a578081-1] [#backend-core/7609dab35d65be14-1]. Une liste d'événements null lève une exception à ces endroits malgré ce qu'affirme la javadoc de ProductServiceImpl, donc garder la liste initialisée et ne pas s'y fier.
- ProductCreationRequest déclare la liste events sans @Valid dans ce fichier, donc les contraintes de EventCreationRequest ne sont pas déclenchées par cette classe seule [#backend-core/d58358f7f920e99c-1]. Une valeur invalide dans un événement peut passer la validation du corps, alors vérifier où la validation est faite avant de s'en remettre à elle.
- Le port de domaine ProductRepository importe une annotation Spring, alors que la règle du projet interdit tout import Spring dans le domaine et que UserRepository n'en a pas [#backend-core/f5728797d94e6d35-1]. Le modèle sert de contre-exemple, donc ne pas le copier pour un nouveau port et retirer l'import.
- Le test getProducts_serviceThrows_propagates_notMaskedAs401 attrape la classe Exception, si bien qu'il passe pour n'importe quelle exception [#80aacdf81dad7441-2]. Il ne prouve pas la propagation voulue, donc resserrer le type attendu avant de s'appuyer sur lui.

## 11. Couverture {#coverage}

- Fichiers du pack : 28 ; avec au moins un fait en base : 28 ; sans fait après remise en file : 0.
- Faits en base : 240, repris d'autres packs : +110, hors périmètre : -0, doublons écartés à la déduplication : -49, soit 301 dans le pool.
- Faits du pool venus d'un autre pack : 82 (par pack : section Relations).
- Destination des 301 faits du pool : Lexique 6 ; Règles 36 ; Endpoints et écrans 60 ; Tests attendus 55 ; Alertes / Questions ouvertes 29 ; annexe seule 74 ; écartés (sorte `other` ou inconnue) 41.
- Base : sha256 f617040c5848…, générée le 2026-11-24.
