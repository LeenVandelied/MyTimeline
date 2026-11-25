# Annexe : category

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 35 | test_case 17, role_check 8, convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 23 | test_case 12, convention 5, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java` | 19 | test_case 12, business_rule 4, other 2 |
| `frontend:services/categoryService.ts` | 12 | convention 3, endpoint 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 10 | business_rule 7, service_method 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 9 | role_check 7, convention 1, endpoint 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 9 | persistence_query 5, convention 2, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 7 | convention 4, entity 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java` | 5 | business_rule 2, convention 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java` | 3 | convention 2, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java` | 3 | convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java` | 3 | convention 1, entity 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java` | 2 | business_rule 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java` | 2 | business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/CategoryService.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryInUseException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNameConflictException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNotFoundException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryReassignTargetInvalidException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java` | 1 | other 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:30-45` | CategoryResponse | La projection HTTP expose id, name, color, description, un booléen system et deux compteurs optionnels, sans exposer ownerId. | [#c900077dbf944eb3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java:5-12` | Category | Le modèle de domaine Category porte id, name, color, description et ownerId, sans annotations JPA ni Spring. | [#054a3aaf703706f1-1] |

## Lignes hors budget {#t-cut_lines}

| Section | Ligne |
|---|---|
| rules | - Le client n'envoie reassignToCategoryId que s'il est renseigné, sinon la requête part sans paramètre. `frontend:services/categoryService.ts:110-113` [#3a3600a3832a6249-1] |
| rules | - Les statuts 403, 404 et 409 sont attendus et non journalisés, les autres le sont en console.error. `frontend:services/categoryService.ts:15` [#4b3c68c8626b6d1c-1] |
| rules | - La réponse de GET /categories est validée par un schéma Zod et une dérive de contrat lève une erreur. `frontend:services/categoryService.ts:41-49` [#integrations/0dcf2e695ec0d8c8-1] |
| tests | - Pour reproduire les tests d'intégration de suppression, l'état archivé est vérifié par SQL natif sur la table products. [#c8aa8d37f01818e5-2] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Supprimer une catégorie inexistante lève CategoryNotFoundException. [#3e67bbffd9fd5f2d-1] | deducible |
| rules | - Une cible de réassignation égale à la catégorie supprimée lève CategoryReassignTargetInvalidException avant toute réassignation. [#3e67bbffd9fd5f2d-3] [#ec943046dcf5e0f7-6] | deducible |
| surface | - Une catégorie système (ownerId nul) ne peut donc pas être modifiée, la réponse est 403, ce que le test PATCH fixe [#integrations/8575936ac40164fc-1] [#integrations/7e1dd26487b95a33-1]. | deducible |
| surface | - La suppression avec réassignation contrôle aussi la catégorie de destination, qui doit appartenir à l'appelant, sinon 403 ou 404 et aucun appel à deleteCategory [#integrations/c7bb5008d3494cfa-1] [#1bcba06ae8e16148-1]. | deducible |
| tests | - Les tests fixent qu'une suppression sans cible lève CategoryInUseException dès qu'un produit référence la catégorie, y compris un seul produit archivé, et que la catégorie reste en base. [#3840d7f06f853e2d-1] [#3840d7f06f853e2d-3] | deducible |
| tests | - Les tests fixent qu'une catégorie sans produit est supprimée directement, et qu'une catégorie ou une cible inconnue lève CategoryNotFoundException sans réassignation ni suppression. [#a6a65602e20c2d2b-1] [#b48ebdf09428120e-1] [#ec943046dcf5e0f7-7] | deducible |
| tests | - Les tests fixent qu'un nom déjà pris par le owner ou par une autre catégorie lève CategoryNameConflictException sans sauvegarde, et qu'une DataIntegrityViolationException au save (création ou renommage) est convertie en conflit. [#12d114f406d44998-1] [#211f471289f276c9-1] [#6514cb4f443c9f5a-1] [#a287475958e00035-1] | deducible |
| tests | - Un POST ou un PATCH en doublon renvoie 409 avec error à conflict, un nom vide renvoie 400 sans appel au service. [#2c1f8c2b2134e263-3] [#61d291963ad8f848-1] [#f176de32cdeed4d9-1] [#67d7538d6cd2b940-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:47-57` | Le booléen system vaut vrai lorsque ownerId de la catégorie est null, et les compteurs restent null dans la projection sans comptage. | [#aed0f568191a3034-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:60-69` | Avec compteurs, une valeur counts absente est remplacée par CategoryProductCounts.EMPTY, puis active et archived sont convertis en int. | [#ebeca9da61b1c1c7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:12-14` | Javadoc : Selon la javadoc, color et description écrasent la valeur cible, y compris à null pour effacer, en sémantique PATCH. | [#15df09d4cb068776-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:41-43` | Si ownerId possède déjà une catégorie du même nom, la création lève CategoryNameConflictException. | [#342e2f7788a4475a-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:58-61` | updateCategory lève CategoryNotFoundException si la catégorie d'id donné est introuvable. | [#583475e7062a5eb3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:63-71` | Lors d'un renommage, le service cherche une autre catégorie du même owner portant le nouveau nom et lève CategoryNameConflictException si elle existe. | [#cdf300d7c27817be-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:115-123` | deleteCategory lève CategoryNotFoundException si la catégorie à supprimer n'existe pas. | [#3e67bbffd9fd5f2d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:125-130` | Si des produits référencent la catégorie et qu'aucune cible de réassignation n'est fournie, deleteCategory lève CategoryInUseException avec le nombre de produits. | [#00f0d055b04edef3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:136-138` | Si la cible de réassignation est identique à la catégorie supprimée, deleteCategory lève CategoryReassignTargetInvalidException. | [#3e67bbffd9fd5f2d-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:142-148` | Avant suppression, la cible doit exister, sinon CategoryNotFoundException ; les produits sont ensuite réassignés en bulk puis la catégorie est supprimée, dans la même transaction. | [#fbc822d2b906665b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java:20-31` | total renvoie la somme de active et archived. | [#b5c50c99e560704c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:58` | La création consulte le repository par couple owner et nom avant d'enregistrer la catégorie. | [#ac68e69d979093aa-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:147-158` | Lorsque le nom n'est pas modifié, le contrôle de conflit de nom est ignoré et la catégorie est sauvegardée avec la nouvelle couleur. | [#1bdbbb2b2b4b24fe-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:185-197` | Une catégorie référencée par des produits sans cible de réassignation lève CategoryInUseException portant le nombre de produits, sans suppression ni réassignation. | [#ec943046dcf5e0f7-3] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:221-232` | Une cible de réassignation identique à la catégorie supprimée lève CategoryReassignTargetInvalidException avant toute réassignation ou suppression. | [#ec943046dcf5e0f7-6] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:85` | Javadoc : Selon la javadoc du test, l'unicité du nom de catégorie s'applique par utilisateur, deux owners distincts pouvant avoir le même nom. | [#a1737e6c6e07a1f7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:100-104` | Javadoc : Selon la javadoc, findByOwnerIdOrSystem ne renvoie que les catégories du caller et les catégories système, jamais celles d'un autre utilisateur. | [#3c5b1df7c3fe2fd9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:182-188` | Javadoc : Selon la javadoc, un produit archivé occupe toujours sa catégorie (option A de l'issue #546), ce qui protège la contrainte de clé étrangère. | [#b9dc6ac3070fdcae-3] |
| `frontend:services/categoryService.ts:15` | Les statuts 403, 404 et 409 sont définis comme attendus, donc non journalisés côté console. | [#4b3c68c8626b6d1c-1] |
| `frontend:services/categoryService.ts:110-113` | Le paramètre de requête reassignToCategoryId n'est envoyé que si la valeur est renseignée, sinon params vaut undefined. | [#3a3600a3832a6249-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:9` | Javadoc : Le champ name est validé par @NotBlank et @Size(max = 255), et la javadoc indique qu'une violation produit un 400. | [#8e80ca46486e491b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:9-12` | Javadoc : Le nom reste obligatoire à la mise à jour, contrôlé par @NotBlank, et la javadoc indique un 400 en cas de vide. | [#561baceb460ae705-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:86-96` | Commentaire : Un nom vide déclenche la validation @Valid @NotBlank, renvoie 400 et n'appelle pas createCategory du service. | [#integrations/e1c41515b338f17d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:297-307` | Un PATCH avec un nom vide renvoie 400 et n'appelle pas updateCategory. | [#integrations/e87412abb703d86b-1] |
| `frontend:services/categoryService.ts:41-49` | La réponse de GET /categories est validée par le schéma Zod categorySchema.array() et une dérive de contrat lève une erreur. | [#integrations/0dcf2e695ec0d8c8-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:26-33` | Javadoc : Selon la javadoc, l'identité de l'appelant est dérivée du JWT via CallerResolver et jamais reçue en paramètre. | [#integrations/b079d9ae09a196bb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:47-51` | Chaque route de CategoryController commence par résoudre l'appelant via callerResolver.currentUser et répond 401 si l'appelant est absent. | [#integrations/3cbc6ad692a65eaa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:49-52` | Si aucun utilisateur n'est résolu depuis le JWT, la création répond 401. | [#6fc50f0b113733e6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:92-95` | La lecture d'une catégorie est filtrée par isVisibleTo, une catégorie absente ou appartenant à un autre utilisateur répondant 404 sans distinction. | [#integrations/cb5a886f19e941ef-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:111-114` | La modification d'une catégorie exige que son ownerId soit égal à l'appelant, sinon la réponse est 403, les catégories système (ownerId nul) étant refusées. | [#integrations/8e9c429e14d99314-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:135-148` | La suppression exige que la catégorie cible appartienne à l'appelant, et lorsqu'une réassignation est demandée la catégorie de réassignation doit aussi appartenir à l'appelant, sinon 403 ou 404. | [#integrations/c7bb5008d3494cfa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:167-169` | isVisibleTo renvoie vrai si la catégorie est système (ownerId null) ou appartient au caller. | [#45903f846bdb1978-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:134-140` | Le test affirme que GET /api/categories sans cookie jwt renvoie 401 et n'appelle pas getCategoriesForOwner. | [#integrations/6fc689174ba67f7f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:142-166` | Le test fixe que le listing délègue le filtrage à getCategoriesForOwner et ne renvoie que les catégories de l'appelant et les catégories système, sans ownerId. | [#419bb430c6dff34f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:256-266` | Commentaire : Le test fixe qu'un GET d'une catégorie appartenant à un autre utilisateur renvoie 404. | [#4709057d35de99a0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:324-338` | Le test affirme que PATCH sur une catégorie appartenant à un autre utilisateur renvoie 403 et n'appelle pas updateCategory. | [#integrations/7e1dd26487b95a33-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:340-354` | Le test affirme que PATCH sur une catégorie système (propriétaire null) renvoie 403 et n'appelle pas updateCategory. | [#integrations/8575936ac40164fc-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:443-457` | Le test fixe qu'un DELETE dont la cible de réassignation appartient à un autre utilisateur renvoie 403 sans appel à deleteCategory. | [#1bcba06ae8e16148-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:443-457` | Le test affirme que DELETE avec une cible de réassignation appartenant à un autre utilisateur renvoie 403 et n'appelle pas deleteCategory. | [#integrations/97b30aeb35911223-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:459-471` | Le test fixe qu'un DELETE sur une catégorie d'un autre utilisateur renvoie 403 sans appel à deleteCategory. | [#9234b7695ca211b0-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:41-44` | Le commentaire signale une recherche legacy non scopée par owner, alors que le port getCategoryByName est exposé au service ; le code renvoie une catégorie de n'importe quel utilisateur. | [#25c0b5b76c901770-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:97-113` | Si un id non null n'est pas trouvé en base, save ne lève rien et passe au chemin de création qui reprend le même id via toEntity, sans garde explicite. | [#16a7922f922f3c0a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:127-129` | Le commentaire annonce le code stable CONFLICT en majuscules, alors que les assertions attendent la valeur conflict en minuscules. | [#integrations/69bbc30a37ed3350-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:265-335` | Pour une catégorie d'un autre utilisateur, le test GET attend 404 alors que les tests PATCH et DELETE attendent 403, ce qui fait deux codes de refus différents pour le même cas. | [#8ecde30c288f4e1a-2] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:36-54` | createCategory crée une catégorie pour ownerId après vérification d'unicité du nom par propriétaire, et convertit une DataIntegrityViolationException au save en CategoryNameConflictException. | [#342e2f7788a4475a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:86-91` | getCategoriesForOwner renvoie les catégories du caller et les catégories système via findByOwnerIdOrSystem. | [#e058eec72b9dbdf2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:93-101` | getProductCountsForOwner délègue au port productRepository.countByCategoryForUser, scopé au caller, sans reconstruire le compteur à partir de countByCategoryId. | [#0f363444e8ef529b-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:40-54` | findDomainCategoryByName cherche une catégorie par nom sans filtre d'owner et retourne la première trouvée, limitée à un résultat. | [#8385e9b5dcab4425-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:57-73` | findByOwnerAndName cherche par JPQL une catégorie dont owner.id et name correspondent, limitée à un résultat. | [#ff43554225b43360-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:76-88` | findByOwnerIdOrSystem charge en JPQL les catégories dont owner.id vaut ownerId ou dont owner est null. | [#1dd00a56a635f954-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:97-107` | Pour un id existant, save charge l'entité gérée et recopie name, color, description et owner avant un save de l'entité gérée. | [#7b6ce2f6cec0ab25-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:121-127` | deleteAllByOwnerId exécute une requête native DELETE sur categories filtrée par owner_id et renvoie le nombre de lignes supprimées. | [#a01bd544d0491d97-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:167-168` | Le test utilise une requête SQL native comptant les produits par id et category_id, ce qui contourne @SQLRestriction selon le commentaire voisin. | [#c8aa8d37f01818e5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:167-171` | Le test relit l'état de la base avec une requête SQL native (count sur products) pour vérifier la catégorie cible de chaque produit. | [#integrations/fd09bf5780389ca4-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:8-10` | Javadoc : Les erreurs de validation des DTO de requête sont converties en 400 par GlobalExceptionHandler, avant l'appel au service. | [#backend-core/573a55d2f0e0cdad-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:16-20` | Un DTO de requête est une classe publique à champs privés annotés Jakarta Validation, sans Lombok, avec getters et setters écrits à la main. | [#backend-core/573a55d2f0e0cdad-4] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:39-45` | Les compteurs productCount et archivedProductCount sont annotés @JsonInclude(NON_NULL) et sont absents du JSON lorsqu'ils valent null. | [#9f4a8b97996679e0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:8-9` | Un mapper de cette couche est une classe annotée @Component qui expose toDomain(entité) et toEntity(domaine). | [#backend-core/512989a1395a5fe4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:19` | toDomain lit l'identifiant du propriétaire par getId() après un contrôle de nullité, ce qui évite de charger un proxy LAZY. | [#backend-core/4a1a214e2e2d8711-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:23-26` | Commentaire : toEntity ne renseigne pas la relation de propriétaire, qui est rattachée par le repository via une référence gérée, selon le commentaire du mapper. | [#backend-core/4c0af118243a6b48-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java:26-29` | Les modèles domaine POJO conservent les constructeurs antérieurs et ajoutent un constructeur étendu qui délègue au précédent via this(...) puis renseigne le champ supplémentaire. | [#backend-core/c05bf43c9552c3c8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java:20-23` | Une constante EMPTY représente une catégorie sans produit, avec active et archived à zéro. | [#75fcddad7327a358-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:72-77` | Une catégorie absente de la map de compteurs reçoit CategoryProductCounts.EMPTY lors du listing. | [#fb9e95c8707c0778-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:20-22` | L'adaptateur JPA étend SimpleJpaRepository et implémente le port domaine CategoryRepository. | [#integrations/b3ead7f936bb721c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:133-139` | applyOwner rattache le propriétaire via entityManager.getReference, ou met owner à null si ownerId est null. | [#e93a533ed192fb19-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:12-14` | Les entités JPA sont annotées @Entity et @Table avec un nom de table en minuscules, et portent @EntityListeners(AuditingEntityListener.class). | [#backend-core/794793eb090afaf8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:17-19` | L'identifiant des entités est un UUID généré avec GenerationType.AUTO. | [#backend-core/cbc477c31e33275c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:32-42` | Chaque entité déclare createdAt annoté @CreatedDate, updatedAt annoté @LastModifiedDate et un champ version annoté @Version, avec des colonnes created_at et updated_at non nulles. | [#backend-core/be53be0d97652fd1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:96-107` | equals compare la classe exacte puis l'identifiant lorsqu'il est non nul, et hashCode renvoie getClass().hashCode(). | [#backend-core/cfbab8fee77f3517-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:38-52` | Le test est un test unitaire Mockito via MockitoExtension, avec des mocks CategoryRepository et ProductRepository et un service instancié à la main dans setUp. | [#e545aa5d220c1376-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:42-48` | Javadoc : Selon la javadoc, les tests de contrôleur catégorie montent MockMvc en standalone avec GlobalExceptionHandler pour que @Valid donne 400 et les exceptions métier donnent 409. | [#integrations/65250c8ad6e075f5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:64-65` | Le test de contrôleur monte un MockMvc standalone sur CategoryController avec GlobalExceptionHandler comme controller advice. | [#80d24cafb94faa01-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:72-74` | Commentaire : L'identité de l'appelant est résolue via CallerResolver à partir du SecurityContext, et non plus depuis le cookie brut, selon le commentaire de la ligne 72. | [#integrations/dde4c0d9b8af559f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:89` | Les requêtes de test transportent le JWT dans un cookie nommé jwt. | [#integrations/172d880471b070f1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:26-27` | Javadoc : Selon la javadoc, les tests de suppression de catégorie tournent contre un Postgres jetable avec Flyway V1..V8. | [#integrations/c4738550f975df33-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:35` | Javadoc : Selon la javadoc, chaque test est annulé par rollback en fin d'exécution grâce à @Transactional. | [#integrations/c4738550f975df33-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:37-39` | La classe de test étend AbstractPostgresIntegrationTest et est annotée @SpringBootTest et @Transactional, avec rollback après chaque test. | [#a7a0757d68519bab-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:46-56` | Le helper persistUser crée un UserEntity au nom, username et email suffixés par un UUID, avec le rôle ROLE_USER, puis le persiste via em.persist. | [#8029b80d4c774e2f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:66-73` | Javadoc : Selon la javadoc, une catégorie système a un owner NULL et est visible de tous en lecture. | [#df75fc72747f643e-1] |
| `frontend:services/categoryService.ts:1-9` | Le module passe par apiClient pour les appels HTTP et valide les réponses avec les schémas Zod importés de @/types/category. | [#0de35c57042fde63-1] |
| `frontend:services/categoryService.ts:18-24` | La fonction httpStatusOf lit défensivement error.response.status et renvoie undefined si la forme de l'erreur ne correspond pas. | [#11bf417038ace5f4-1] |
| `frontend:services/categoryService.ts:27-31` | La fonction logUnexpected ne journalise rien pour les statuts attendus, sinon appelle console.error avec le message et safeErrorMessage(error). | [#d5ed9227cd2f0937-1] |
