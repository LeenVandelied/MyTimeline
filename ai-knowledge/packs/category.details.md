# Annexe : category

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend:components/categories/CategoryDrawer.tsx` | 38 | business_rule 11, other 7, convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 31 | test_case 11, business_rule 6, convention 5 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 27 | test_case 20, role_check 5, other 1 |
| `frontend:components/categories/CategoryDrawer.test.tsx` | 25 | test_case 21, convention 3, other 1 |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx` | 20 | convention 9, other 5, test_case 5 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 19 | service_method 7, validation 5, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 19 | endpoint 8, role_check 8, convention 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java` | 18 | business_rule 10, test_case 5, service_method 2 |
| `frontend:components/products/CategoriesView.test.tsx` | 18 | test_case 18 |
| `frontend:components/products/CategoriesView.tsx` | 17 | business_rule 4, other 4, convention 2 |
| `frontend:types/category.ts` | 15 | business_rule 5, convention 3, other 3 |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql` | 13 | business_rule 3, convention 3, db_change 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 10 | convention 4, persistence_query 4, suspicious 2 |
| `frontend:services/categoryService.ts` | 9 | convention 6, other 2, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 8 | convention 4, entity 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java` | 7 | convention 4, service_method 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java` | 6 | convention 5, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java` | 5 | business_rule 1, convention 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java` | 5 | persistence_query 3, other 2 |
| `frontend:hooks/useDeleteCategory.test.tsx` | 4 | test_case 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java` | 3 | other 1, suspicious 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java` | 3 | convention 2, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java` | 3 | business_rule 1, entity 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/CategoryService.java` | 3 | other 2, business_rule 1 |
| `frontend:hooks/useDeleteCategory.ts` | 3 | convention 1, other 1, persistence_query 1 |
| `frontend:hooks/useUpdateCategory.ts` | 3 | convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNameConflictException.java` | 2 | business_rule 1, other 1 |
| `frontend:hooks/useCategories.ts` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryInUseException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNotFoundException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryReassignTargetInvalidException.java` | 1 | other 1 |
| `frontend:hooks/useCreateCategory.ts` | 1 | convention 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `frontend:components/categories/CategoryDrawer.tsx:407-411` | CategoryDrawer.submitError | Une erreur de soumission générale est affichée dans un paragraphe role alert sous le formulaire. | [#21683dab1594f365-1] |
| `frontend:components/products/CategoriesView.tsx:114-131` | CategoriesView | L'écran affiche un titre, un sous-titre et un bouton Nouvelle catégorie qui ouvre le CategoryDrawer en création. | [#c3c26ca76d8fe64d-1] |
| `frontend:components/products/CategoriesView.tsx:133-166` | CategoriesView.états de chargement, erreur et vide | L'écran affiche un squelette pendant le chargement, un message d'erreur en cas d'échec, puis un état vide avec un CTA qui ouvre le drawer de création. | [#4a039b66bf4164a2-1] |
| `frontend:types/category.ts:26-34` | categorySchema | Le schéma categorySchema décrit une catégorie avec id, name et system obligatoires, et color, description, productCount et archivedProductCount optionnels. | [#3a19573584cd6a98-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:13-14` | CategoryEntity | Entité JPA mappée sur la table categories, avec AuditingEntityListener. | [#70949eb0610b171b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:28-30` | CategoryEntity.owner | La relation owner est un ManyToOne LAZY vers UserEntity, via la colonne owner_id, nullable. | [#9f17359f6dd43cea-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:33-38` | CategoryEntity.createdAt | Les colonnes created_at et updated_at sont non nullables, created_at n'est pas modifiable, et les dates sont posées par l'auditing. | [#0da2ea4cb7546332-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:40-42` | CategoryEntity.version | Le champ version est annoté @Version et stocké dans une colonne non nullable. | [#2e4940d72431828b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:54` | CategoryResponse.fromDomain | Le champ system vaut vrai quand la catégorie n'a pas de propriétaire (ownerId null). | [#aed0f568191a3034-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java:5-12` | Category | Modèle de domaine Category, sans annotation JPA, portant id, name, color, description et ownerId. | [#054a3aaf703706f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java:20` | CategoryProductCounts | Record qui sépare les produits actifs et les produits archivés d'une catégorie pour un utilisateur. | [#250c395d00e0eb99-1] |
| `frontend:components/categories/CategoryDrawer.tsx:199-202` | CategoryDrawer.setSwatch | Le choix d'une pastille de palette ou la valeur du picker libre met à jour la couleur locale et la valeur du champ color du formulaire. | [#e3fa2ff30dbe6881-1] |

## Lignes hors budget {#t-cut_lines}

| Section | Ligne |
|---|---|
| tests | - Les contrastes des 12 couleurs se testent par calcul pur, car jsdom ne peint rien selon le commentaire du test [#14ef819107f2910c-11] [#14ef819107f2910c-10]. |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - La création lève CategoryNameConflictException si le même propriétaire a déjà ce nom. [#342e2f7788a4475a-1] | deducible |
| rules | - Côté formulaire, une réponse 409 affiche l'erreur nameConflict sous le champ name. [#3d592f36a8637bbe-1] | deducible |
| rules | - Un ownerId null marque une catégorie système, que le drawer ouvre en lecture seule. [#a5d661be02c5f3ed-1] [#9e5750edb3d9a7e3-1] | deducible |
| surface | - La règle de propriété `isOwnedBy` exige un ownerId non nul égal au caller, alors que `isVisibleTo` accepte un ownerId nul pour la lecture, d'où des droits asymétriques entre lecture et écriture, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:158-169` [#integrations/ff3b6604c76a6ca4-1] [#integrations/453d1e3a55ce6e00-1]. | deducible |
| surface | - Le DELETE accepte un paramètre optionnel reassignToCategoryId, qui doit exister (404) et appartenir au caller (403), et la cible supprimée doit aussi appartenir au caller (403, système compris), voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:122-154` [#29cd1e0ef93cd890-1] [#c3f8c255fa64dbd4-1] [#c3f8c255fa64dbd4-2]. | deducible |
| tests | - Les tests fixent qu'une suppression sans cible lève CategoryInUseException dès qu'un produit référence la catégorie, même archivé, et que la catégorie reste en base [#3840d7f06f853e2d-1] [#3840d7f06f853e2d-3]. | deducible |
| tests | - Les tests fixent qu'avec une cible, produits actifs et archivés sont déplacés puis la source supprimée, le produit archivé restant archivé [#3840d7f06f853e2d-2] [#3840d7f06f853e2d-5]. | deducible |
| tests | - Les tests fixent que DELETE renvoie 204 sans produit, et 409 si la catégorie est utilisée sans cible ou si la cible est la catégorie elle-même [#a24d15a2d893c519-1] [#a24d15a2d893c519-2] [#a24d15a2d893c519-4]. | deducible |
| tests | - Les tests fixent que countByCategoryForUser sépare actifs et archivés, ignore les catégories vides et ne compte que les produits de l'appelant sur une catégorie système partagée [#86bfe780f7eba19f-2] [#86bfe780f7eba19f-3] [#e90c8521a757ba43-1]. | deducible |
| tests | - Les tests du drawer fixent qu'un 403 à la création ou à l'édition affiche errors.forbidden inline sans toast, et qu'un 409 affiche nameConflict sous le champ [#effa247160f3fb1c-1] [#effa247160f3fb1c-2] [#14ef819107f2910c-5]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:60-70` | Construit la projection avec compteurs, en remplaçant des compteurs null par CategoryProductCounts.EMPTY puis en convertissant active et archived en int. | [#ebeca9da61b1c1c7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:19` | L'ownerId du domaine vaut null si l'entité n'a pas de propriétaire, ce qui marque une catégorie système. | [#a5d661be02c5f3ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:41-43` | La création lève CategoryNameConflictException si le même propriétaire possède déjà une catégorie du même nom, sans exception. | [#342e2f7788a4475a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:65-71` | Le contrôle d'unicité du nom n'est fait que si le nom change, et il lève CategoryNameConflictException si une autre catégorie du même propriétaire porte ce nom. | [#cdf300d7c27817be-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:123-125` | Le nombre de produits référençant la catégorie est compté via countByCategoryId, et la réassignation n'est requise que si ce nombre est supérieur à zéro. | [#00f0d055b04edef3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNameConflictException.java:4-6` | Javadoc : Selon la javadoc, le nom doit être unique par utilisateur, et le conflit est mappé en 409 CONFLICT par GlobalExceptionHandler. | [#67c1fbcea0ef58c7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java:29-31` | Le total additionne produits actifs et archivés, et la javadoc indique que ce total décide du 409 de suppression. | [#b5c50c99e560704c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/CategoryService.java:43-44` | Javadoc : Selon la javadoc, une catégorie sans aucun produit du caller est absente de la map, et l'appelant substitue EMPTY. | [#7c2ff5f1fc9a0527-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:72-77` | Les compteurs sont chargés en une requête groupée, et une catégorie absente de la map reçoit CategoryProductCounts.EMPTY. | [#fb9e95c8707c0778-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:19-22` | Commentaire : Selon le commentaire, une catégorie dont owner_id est NULL est une catégorie système, lisible par tous les utilisateurs authentifiés et non modifiable ni supprimable via PATCH ou DELETE. | [#3f8752bda6a6b967-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:34-36` | Commentaire : Selon le commentaire, la suppression d'un utilisateur ne doit pas effacer ses catégories, la clé étrangère restant en RESTRICT par défaut. | [#fb0417171673d225-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:45-50` | Commentaire : Selon le commentaire, l'unicité du nom de catégorie est par utilisateur (BR-CAT-004), et les lignes à owner_id NULL ne sont pas contraintes entre elles en PostgreSQL. | [#5917dc81a6db1bad-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:68-77` | Le test fixe que la création lève CategoryNameConflictException si le nom est déjà pris par le même owner, sans appeler save. | [#62df59dadb08ab74-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:133-145` | Le test fixe que renommer une catégorie vers un nom déjà pris par un autre élément du même owner lève CategoryNameConflictException et n'appelle pas save. | [#1bdbbb2b2b4b24fe-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:147-158` | Le test fixe que, lorsque le nom est inchangé, la vérification d'unicité est ignorée et la catégorie est sauvegardée avec la nouvelle couleur. | [#1bdbbb2b2b4b24fe-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:162-171` | Le test fixe que supprimer une catégorie inconnue lève CategoryNotFoundException sans réassignation ni suppression. | [#ec943046dcf5e0f7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:173-183` | Le test fixe qu'une catégorie sans produit est supprimée directement, sans réassignation. | [#ec943046dcf5e0f7-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:185-197` | Le test fixe que supprimer une catégorie référencée par des produits sans cible de réassignation lève CategoryInUseException avec le nombre de produits, sans supprimer ni réassigner. | [#ec943046dcf5e0f7-3] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:199-213` | Le test fixe que la réassignation des produits vers la cible est appelée avant la suppression de la catégorie source. | [#ec943046dcf5e0f7-4] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:215-232` | Javadoc : Selon la javadoc, réassigner vers la catégorie supprimée est rejeté par CategoryReassignTargetInvalidException avant toute réassignation ou suppression, et le test le vérifie. | [#ec943046dcf5e0f7-5] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:227-231` | Le test fixe que deleteCategory(id, id) lève CategoryReassignTargetInvalidException sans appeler updateCategoryForProducts ni deleteById. | [#ec943046dcf5e0f7-6] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:234-246` | Le test fixe qu'une cible de réassignation inconnue lève CategoryNotFoundException sans réassignation ni suppression. | [#ec943046dcf5e0f7-7] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:85` | Javadoc : Selon la javadoc, deux propriétaires distincts peuvent porter une catégorie de même nom (BR-CAT-004). | [#a1737e6c6e07a1f7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:101-102` | Javadoc : Selon la javadoc, findByOwnerIdOrSystem ne renvoie que les catégories de l'appelant et les catégories système (owner NULL). | [#3c5b1df7c3fe2fd9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:126` | Javadoc : Selon la javadoc, supprimer une catégorie référencée sans cible renvoie un 409 et ne supprime rien. | [#b9dc6ac3070fdcae-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:143-145` | Javadoc : Selon la javadoc, la réassignation déplace produits actifs et archivés vers la cible avant de supprimer la source, en une transaction. | [#b9dc6ac3070fdcae-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:182-188` | Javadoc : Selon la javadoc, un produit archivé occupe toujours sa catégorie, décision #546 option A. | [#b9dc6ac3070fdcae-3] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:283-287` | Javadoc : Selon la javadoc, les catégories système sont partagées et le comptage doit être restreint à l'utilisateur appelant. | [#719f4099ea964a36-1] |
| `frontend:components/categories/CategoryDrawer.tsx:49` | Javadoc : Selon la javadoc, BR-CAT-001 impose un name obligatoire via Zod min(1) avec message inline sous le champ. | [#7fc93544a0022b53-1] |
| `frontend:components/categories/CategoryDrawer.tsx:120-122` | Le drawer est en édition quand mode vaut edit et qu'une catégorie est fournie, et il passe en lecture seule si la catégorie est système. | [#9e5750edb3d9a7e3-1] |
| `frontend:components/categories/CategoryDrawer.tsx:166` | À l'ouverture en édition, la couleur locale reprend la couleur stockée de la catégorie, ou null si elle est absente. | [#e7c12fa07ba5d72d-1] |
| `frontend:components/categories/CategoryDrawer.tsx:189-195` | Un avertissement de contraste est affiché quand la couleur est un hex valide et que son contraste avec l'encre choisie est inférieur à WCAG_AA_NORMAL. | [#d3277785875ed445-1] |
| `frontend:components/categories/CategoryDrawer.tsx:212-218` | En édition, la mise à jour envoie name, color et description à updateMutation avec l'identifiant de la catégorie, et une description vide part comme undefined. | [#68a43a6bdaa614d0-1] |
| `frontend:components/categories/CategoryDrawer.tsx:237-242` | Les réponses 403, 404 et les autres erreurs affichent respectivement errors.forbidden, errors.notFound et errors.generic dans une alerte générale. | [#68a43a6bdaa614d0-2] |
| `frontend:components/categories/CategoryDrawer.tsx:249-256` | La suppression lève une erreur si la catégorie manque, appelle deleteMutation avec l'identifiant et une éventuelle réassignation, puis ferme le drawer et appelle onDeleted. | [#fa59fa163499925b-1] |
| `frontend:components/categories/CategoryDrawer.tsx:328-334` | Le sélecteur de couleur utilise PaletteColorPicker avec le préfixe de test-id category, désactivé en lecture seule ou pendant la soumission. | [#2a73bcfc07a6368f-1] |
| `frontend:components/categories/CategoryDrawer.tsx:335-348` | Le bouton de réinitialisation de couleur n'apparaît que lorsqu'une couleur est définie et que le drawer n'est pas en lecture seule, et il remet la couleur à null et le champ color à chaîne vide. | [#8188340a187f827f-1] |
| `frontend:components/categories/CategoryDrawer.tsx:351-354` | L'avertissement de contraste non bloquant est rendu sous le sélecteur avec l'identifiant category-contrast-warning quand lowContrast est vrai. | [#64d9b65168ebbee0-1] |
| `frontend:components/categories/CategoryDrawer.tsx:367-387` | Le champ description est un Textarea de trois lignes, désactivé en lecture seule ou pendant la soumission. | [#b50bb13a16338b0f-1] |
| `frontend:components/products/CategoriesView.tsx:64-65` | Le total lié à une catégorie est la somme de productCount et archivedProductCount, valeurs absentes traitées comme 0. | [#58c1d9dbc63e7e0d-1] |
| `frontend:components/products/CategoriesView.tsx:176` | Le badge des produits actifs est affiché si la catégorie a au moins un produit actif ou si elle n'a aucun produit archivé. | [#de91a618d62b2823-1] |
| `frontend:components/products/CategoriesView.tsx:238-245` | La mention des produits archivés n'est rendue que si le nombre d'archivés est strictement positif, dans un nœud distinct du badge des actifs. | [#55054a5c89e2be0d-1] |
| `frontend:components/products/CategoriesView.tsx:304` | Le dialog de suppression reçoit comme linkedProductsCount le total actifs plus archivés, ce qui arme le select de réassignation. | [#ce4ae0f3a712d1d2-1] |
| `frontend:types/category.ts:9-11` | Javadoc : Selon le commentaire, le booléen system vaut true pour une catégorie système, qui est lisible par tous mais non supprimable, et le DTO n'expose jamais l'ownerId. | [#dd8bf465a86b28f2-1] |
| `frontend:types/category.ts:43-45` | Javadoc : Selon le commentaire, le backend n'impose pas de format hexadécimal à color, la contrainte côté frontend se limite à une chaîne bornée. | [#f0768b99791d3d6a-1] |
| `frontend:types/category.ts:52-56` | Le schéma de création exige un name de 1 à 255 caractères, et accepte color et description optionnels de 255 caractères maximum. | [#eb972af2bc3f31a2-1] |
| `frontend:types/category.ts:60-64` | Javadoc : Selon le commentaire, le PATCH exige name au niveau backend, et color et description sont optionnels côté transport, le drawer n'envoyant que le diff. | [#5ae28fd2f359c51b-1] |
| `frontend:types/category.ts:65-69` | Le schéma de mise à jour exige un name de 1 à 255 caractères, et accepte color et description optionnels de 255 caractères maximum. | [#5ae28fd2f359c51b-2] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:9` | Javadoc : Le nom de la catégorie à la création doit être non null et non vide, avec une taille maximale de 255 caractères, contrôlé par @NotBlank et @Size. | [#8e80ca46486e491b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:9-10` | Javadoc : Le nom reste obligatoire à la mise à jour, avec @NotBlank et @Size(max = 255) sur name, color et description. | [#561baceb460ae705-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:60-61` | La mise à jour lève CategoryNotFoundException si l'id n'existe pas. | [#583475e7062a5eb3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:117-120` | La suppression lève CategoryNotFoundException si la catégorie à supprimer n'existe pas. | [#3e67bbffd9fd5f2d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:128-130` | La suppression d'une catégorie référencée sans cible de réassignation lève CategoryInUseException. | [#3e67bbffd9fd5f2d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:136-138` | Une cible de réassignation identique à la catégorie supprimée lève CategoryReassignTargetInvalidException, avant toute réassignation. | [#3e67bbffd9fd5f2d-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:142-144` | Une cible de réassignation absente lève CategoryNotFoundException. | [#3e67bbffd9fd5f2d-4] |
| `frontend:components/categories/CategoryDrawer.tsx:233-236` | Une réponse HTTP 409 pose un conflit de nom et affiche l'erreur nameConflict inline sous le champ name. | [#3d592f36a8637bbe-1] |
| `frontend:components/categories/CategoryDrawer.tsx:305-316` | Le champ name est désactivé en lecture seule ou pendant la soumission, et son erreur Zod ou serveur est affichée par FormMessage avec l'identifiant category-name-error. | [#f531c9791b51a548-1] |
| `frontend:types/category.ts:81-84` | Le formulaire bloque le nom vide avec la clé nameRequired et le nom au-delà de 255 caractères avec la clé nameTooLong. | [#21e896398a77ead2-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:49-52` | Chaque endpoint résout l'identité du caller via CallerResolver et renvoie 401 si elle est absente. | [#6fc50f0b113733e6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:93-95` | La lecture d'une catégorie non visible par le caller renvoie 404, sans distinguer l'absence d'une catégorie appartenant à autrui. | [#integrations/cb5a886f19e941ef-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:107-114` | PATCH renvoie 404 si la catégorie est absente, puis 403 si elle n'est pas possédée par le caller (owner nul ou différent). | [#integrations/8e9c429e14d99314-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:135-137` | La suppression renvoie 403 si la catégorie n'appartient pas au caller, système compris. | [#c3f8c255fa64dbd4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:139` | Commentaire : Lorsqu'un reassignToCategoryId est fourni, la catégorie cible doit exister (404) et appartenir au caller (403). | [#integrations/c7bb5008d3494cfa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:140-148` | Si une cible de réassignation est fournie, elle doit exister (404) et appartenir au caller (403). | [#c3f8c255fa64dbd4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:158-160` | isOwnedBy exige un ownerId non nul égal à l'identifiant du caller, ce qui exclut les catégories système. | [#integrations/ff3b6604c76a6ca4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:167-169` | isVisibleTo autorise la lecture si l'ownerId est nul (catégorie système) ou égal à l'identifiant du caller. | [#integrations/453d1e3a55ce6e00-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:256-266` | Commentaire : Le test fixe qu'une catégorie appartenant à un autre utilisateur renvoie 404 pour éviter la fuite d'existence. | [#4709057d35de99a0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:324-338` | Le test fixe qu'un PATCH sur une catégorie appartenant à un autre utilisateur renvoie 403 sans appeler updateCategory. | [#033671903ea98914-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:340-354` | Le test fixe qu'un PATCH sur une catégorie système (owner null) renvoie 403 sans appeler updateCategory. | [#033671903ea98914-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:443-457` | Le test fixe qu'un DELETE dont la cible de réassignation appartient à un autre utilisateur renvoie 403 sans appeler le service de suppression. | [#1bcba06ae8e16148-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:459-471` | Le test fixe qu'un DELETE sur une catégorie appartenant à un autre utilisateur renvoie 403 sans appeler deleteCategory. | [#1bcba06ae8e16148-2] |
| `frontend:components/categories/CategoryDrawer.tsx:204-205` | La soumission ne fait rien quand le drawer est en lecture seule, c'est-à-dire pour une catégorie système. | [#422838874afef32e-1] |
| `frontend:components/categories/CategoryDrawer.tsx:414-425` | Le bouton de suppression n'est rendu qu'en édition d'une catégorie non système. | [#485059f4b33844b1-1] |
| `frontend:components/categories/CategoryDrawer.tsx:439-450` | Le bouton de soumission category-submit n'est rendu que lorsque le drawer n'est pas en lecture seule. | [#8f8554d4dd50dbf1-1] |
| `frontend:components/categories/CategoryDrawer.tsx:460-469` | Le DeleteConfirmDialog de suppression n'est monté qu'en édition d'une catégorie non système, avec la variante category et le compteur de produits liés. | [#c8e8e272adfbc402-1] |
| `frontend:components/products/CategoriesView.tsx:249-264` | Le bouton de suppression d'une card n'est rendu que si la catégorie n'est pas système (ADR-002). | [#ca1b5ab973389156-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:16-26` | CategoryUpdateRequest duplique à l'identique les champs et accesseurs de CategoryRequest, sans classe commune. | [#backend-core/2ecaa931218bacf9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:49-53` | Le catch convertit toute DataIntegrityViolationException du save en CategoryNameConflictException, alors que le commentaire voisin dit que les autres violations ne doivent pas être masquées. | [#c421fce519d4d6c6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:79-83` | Le catch de updateCategory convertit toute DataIntegrityViolationException du save en CategoryNameConflictException, comme dans createCategory. | [#3e1952ab25b225d1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:40-46` | La méthode cherche une catégorie par nom sans filtre de propriétaire et renvoie la première trouvée, ce que le commentaire qualifie de legacy. | [#25c0b5b76c901770-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:109-114` | Si l'id du domaine n'existe pas en base, save retombe sur le chemin création avec ce même id, sur une entité construite sans version. | [#16a7922f922f3c0a-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:43` | Écart de nommage : cet index utilise le préfixe ix_, alors que les autres migrations du lot utilisent idx_ pour les index. | [#backend-core/4ea63855f51395ec-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:46-50` | Le commentaire indique que les catégories système (owner NULL) ne sont pas contraintes en unicité, ce que la contrainte UNIQUE(owner_id, name) produit, sans filet en base pour les doublons de noms système. | [#37f94fd842608920-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:248-252` | La javadoc indique que le @Transactional du service annule la réassignation en cas d'échec, mais le test ne mocke aucune transaction et n'affirme que la propagation de l'exception. | [#a3777ad3456f3068-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:443-457` | Aucun test de ce fichier ne couvre un DELETE dont la cible de réassignation est une catégorie système (owner null), cas non testé. | [#ad88eb77ba10ec8d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:28` | Le commentaire de classe cite le schéma Flyway V1..V8, version que ce fichier ne vérifie pas. | [#b36a28a437645e18-1] |
| `frontend:components/categories/CategoryDrawer.tsx:180-181` | Le code désactive la règle exhaustive-deps de eslint pour cet effet, dont la liste de dépendances ne contient pas form. | [#95af34937502ece0-1] |
| `frontend:components/categories/CategoryDrawer.tsx:209` | Une couleur remise à null est transmise comme undefined, donc absente du payload de création ou de mise à jour. | [#713bdb15a62d3f71-1] |
| `frontend:components/categories/CategoryDrawer.tsx:216` | Une description vidée en édition est envoyée comme undefined, ce qui la retire du PATCH sans valeur explicite de suppression. | [#713bdb15a62d3f71-2] |
| `frontend:components/products/CategoriesView.tsx:169` | Un TODO signale que la liste n'est pas virtualisée et qu'une virtualisation est à prévoir au-delà de 50 éléments, sans que le code le fasse. | [#fd8996e63e912536-1] |
| `frontend:types/category.ts:48-50` | Le commentaire indique que PATCH peut effacer color et description avec null ou une valeur vide, alors que le schéma categoryUpdateSchema ne déclare pas color ni description comme nullable. | [#3b80d9fed9ccb5bd-1] |
| `frontend:types/category.ts:67-68` | Le champ color du schéma de mise à jour est une chaîne optionnelle de 255 caractères maximum, sans nullable, ce qui ne permet pas d'envoyer null. | [#3b80d9fed9ccb5bd-2] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:48-57` | Construit la projection d'une catégorie sans compteurs, avec productCount et archivedProductCount à null. | [#136f7f3310c23455-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:10-21` | Convertit une CategoryEntity en Category de domaine, avec ownerId à partir de l'id du propriétaire, ou null si owner est absent. | [#2c7202da2d2f6a5f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:26-33` | Construit une CategoryEntity neuve en copiant id, name, color et description, sans owner. | [#7aaa06bf924b9549-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:30-31` | Le service reçoit CategoryRepository et ProductRepository par injection par constructeur. | [#0423b811b9d1710d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:58-61` | Met à jour name, color et description d'une catégorie existante, après chargement par id. | [#c03bac8874a48d50-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:88-91` | Renvoie les catégories possédées par le caller ou système, via une requête filtrée côté repository. | [#e058eec72b9dbdf2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:95-101` | Délègue au port ProductRepository le comptage groupé des produits actifs et archivés pour le caller. | [#0f363444e8ef529b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:105-107` | Renvoie la catégorie par id sans filtre de propriétaire. | [#914b869025f3ea34-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:111-113` | Renvoie la catégorie par nom via le repository non scopé au propriétaire. | [#c6a53da66386d428-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:153-155` | Indique si une catégorie existe pour l'id donné, en lecture seule. | [#88300243e86fa7e8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:56-66` | Le test createCategory_nameFreeForOwner_persists vérifie qu'un nom libre pour l'owner est persisté avec l'ownerId fourni. | [#df7d1083393d3efb-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:110-120` | Le test vérifie que getCategoriesForOwner délègue au repository la requête scopée findByOwnerIdOrSystem. | [#1711fb484d23a5f9-1] |
| `frontend:components/products/CategoriesView.tsx:106-112` | La fonction lève une erreur si aucune catégorie n'est sélectionnée, appelle la mutation de suppression avec l'id et la cible de réassignation, puis vide la sélection si elle réussit. | [#a51b5549ffc16998-1] |
| `frontend:services/categoryService.ts:80-92` | updateCategory envoie PATCH /categories/{id} avec les données et options, valide la réponse avec categorySchema et propage l'erreur. | [#5324d5474548a79d-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:145` | Réassigne en bulk les produits de la catégorie vers la cible avant la suppression, dans la même transaction. | [#fbc822d2b906665b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:148` | Supprime la catégorie par id en fin de méthode. | [#fbc822d2b906665b-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java:19` | Recherche la catégorie possédée par un propriétaire portant un nom donné. | [#cb232ff0b37fe9d0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java:26` | Liste les catégories possédées par le propriétaire ou système. | [#09ae864a26096e17-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java:39` | Supprime les catégories possédées par un propriétaire, sans toucher aux catégories système, et renvoie le nombre de lignes supprimées. | [#48f281c2135642a2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:45-49` | Exécute une JPQL sur le nom seul, bornée à un résultat. | [#8385e9b5dcab4425-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:61-68` | Exécute une JPQL filtrant sur owner.id et le nom, bornée à un résultat. | [#ff43554225b43360-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:76-88` | Exécute une JPQL renvoyant les catégories du propriétaire ou sans propriétaire, mappées en domaine. | [#1dd00a56a635f954-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:122-127` | Exécute un DELETE natif sur categories filtré par owner_id, ce qui exclut naturellement les lignes système. | [#a01bd544d0491d97-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:95-97` | Le test appelle findByOwnerAndName avec un identifiant d'utilisateur et un nom, et attend une catégorie présente ou vide. | [#86e64639017e7df6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:115` | Le test appelle findByOwnerIdOrSystem avec l'identifiant de l'appelant pour obtenir sa liste de catégories. | [#3a33bd6f290630dd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:167-168` | Le test vérifie la catégorie de chaque produit par une requête SQL native. | [#c8aa8d37f01818e5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:228-232` | Le test vérifie le produit archivé par une requête SQL native filtrée sur archived = true. | [#c8aa8d37f01818e5-2] |
| `frontend:components/categories/CategoryDrawer.tsx:169-181` | À l'ouverture, le formulaire est rempli avec name, color et description de la catégorie en édition, ou réinitialisé à vide en création. | [#15c630f25d9daebc-1] |
| `frontend:hooks/useDeleteCategory.ts:35-36` | Au succès, la suppression invalide les requêtes de préfixe categories.all puis products.all. | [#c5d991c21927344f-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:31-32` | La migration V8 ajoute la colonne owner_id de type uuid à la table categories, sans contrainte NOT NULL et sans backfill. | [#b00b7b335410ce91-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:37-39` | La migration V8 crée la clé étrangère fk_categories_owner de owner_id vers users(id), sans clause ON DELETE CASCADE. | [#ce1072a3079b6a5f-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:51-52` | La migration V8 ajoute la contrainte d'unicité uq_categories_owner_name sur le couple (owner_id, name). | [#b9d12ddac436a4f3-1] |

## Clés de traduction {#t-i18n_key}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:108` | La clé categories.drawer.errors.forbidden est affichée dans le drawer lors d'un 403 en création. | [#bd229e49e5c3e1fd-1] |
| `frontend:components/products/CategoriesView.tsx:230` | Le badge des actifs affiche la clé productCount avec le nombre de produits actifs. | [#60de531a4a370f5d-1] |
| `frontend:components/products/CategoriesView.tsx:243` | La mention des archivés affiche la clé archivedCount avec le nombre de produits archivés. | [#b853098add97b9dc-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:6-7` | Javadoc : La javadoc d'un DTO de cette couche cite l'endpoint HTTP, le numéro d'issue et les identifiants de règles (BR-...) qui motivent les contraintes. | [#backend-core/573a55d2f0e0cdad-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:9-11` | Javadoc : La javadoc indique qu'une contrainte @NotBlank produit une erreur 400 gérée par GlobalExceptionHandler avant l'appel au service. | [#backend-core/573a55d2f0e0cdad-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:13-14` | Javadoc : Le contrôleur accepte un DTO de requête et non le modèle de domaine en entrée HTTP, selon la javadoc de ce DTO. | [#backend-core/573a55d2f0e0cdad-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:16-34` | Un DTO de requête de cette couche est une classe simple sans Lombok, avec des champs privés et des getters et setters écrits à la main. | [#backend-core/573a55d2f0e0cdad-4] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:18-26` | Les champs texte d'un DTO de requête portent les annotations Jakarta Validation sur le champ, avec @NotBlank pour un champ obligatoire et @Size(max = 255) pour une longueur maximale. | [#backend-core/a0761ae2fe7cc62c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:40-44` | Les champs productCount et archivedProductCount sont des Integer annotés NON_NULL, donc absents du JSON quand ils valent null. | [#9f4a8b97996679e0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:8-9` | Un mapper de cette couche est un composant Spring annoté @Component, qui expose toDomain(entity) et toEntity(domain) et ne fait pas d'accès base. | [#backend-core/512989a1395a5fe4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:13` | Commentaire : Le mapper lit l'identifiant du propriétaire via getOwner().getId() sur un proxy LAZY, sans déclencher de SELECT. | [#backend-core/4a1a214e2e2d8711-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:23-25` | Commentaire : toEntity ne pose pas la relation propriétaire, le rattachement se fait dans le repository via entityManager.getReference à partir de l'ownerId. | [#backend-core/4c0af118243a6b48-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:23-26` | Commentaire : Selon le commentaire, toEntity ne pose pas l'owner, le rattachement se faisant côté repository. | [#2ef32b785f357d85-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java:10-11` | Commentaire : Selon le commentaire, un ownerId NULL désigne une catégorie système lisible de tous et non modifiable. | [#5b12422d6f93daf5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Category.java:26-29` | Un modèle du domaine est une classe POJO sans annotation, avec plusieurs constructeurs qui se délèguent les uns aux autres via this(...), et des getters et setters écrits à la main. | [#backend-core/c05bf43c9552c3c8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:18-19` | Le contrôleur dépend du port CategoryService et du CallerResolver pour dériver l'identité depuis le contexte de sécurité, sans paramètre d'identité. | [#integrations/d3ee3de599c80832-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:24` | Javadoc : Selon la javadoc, PATCH et DELETE exigent que le caller soit propriétaire de la catégorie. | [#96c9a73b7747ae35-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:19-22` | La classe étend SimpleJpaRepository et implémente le port CategoryRepository. | [#234a5cea30098176-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:92` | Commentaire : Selon le commentaire, le domaine Category ne porte pas @Version, ce qui impose de charger l'entité gérée lors d'une mise à jour. | [#7b6ce2f6cec0ab25-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:97-106` | Pour un id existant en base, save charge l'entité gérée, recopie name, color, description et owner, puis la sauvegarde. | [#7b6ce2f6cec0ab25-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:133-139` | Rattache le propriétaire via entityManager.getReference à partir de son id, ou met owner à null si ownerId est null. | [#e93a533ed192fb19-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:12-14` | Une entité JPA est annotée @Entity et @Table avec un nom de table en minuscules, et porte @EntityListeners(AuditingEntityListener.class) pour l'audit des dates. | [#backend-core/794793eb090afaf8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:17-42` | Les identifiants sont des UUID générés avec GenerationType.AUTO, les dates createdAt et updatedAt sont annotées @CreatedDate et @LastModifiedDate, et un champ version porte @Version. | [#backend-core/cbc477c31e33275c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:96-107` | equals compare uniquement l'identifiant et renvoie false si l'identifiant est nul, et hashCode renvoie getClass().hashCode(). Les autres entités suivent le même motif. | [#backend-core/cfbab8fee77f3517-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:104-107` | hashCode renvoie un hash constant propre à la classe, tandis que equals compare les id non null. | [#2c012004a7971ed8-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:9-10` | Commentaire : Selon le commentaire, owner_id doit correspondre exactement au mapping JPA CategoryEntity.owner (@ManyToOne, @JoinColumn name owner_id, nullable) à cause de ddl-auto=validate. | [#0245ac5192bbc769-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:12` | Commentaire : Selon le commentaire, les migrations V1 à V7 ne doivent pas être éditées et V8 est la seule à modifier le schéma pour ce changement. | [#3369d095a38e174d-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:37-39` | Une clé étrangère sans cascade est déclarée sans clause on delete, ce qui laisse le comportement par défaut de PostgreSQL. | [#backend-core/1241196cfbd2badf-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:37-39` | La classe est annotée @SpringBootTest et @Transactional et étend AbstractPostgresIntegrationTest, chaque test étant annulé par rollback. | [#a7a0757d68519bab-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:46-56` | Le helper persistUser crée un UserEntity au nom, identifiant et e-mail suffixés par un UUID, puis le persiste via EntityManager. | [#8029b80d4c774e2f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:58-64` | Le helper persistCategory crée une CategoryEntity rattachée à un propriétaire puis la persiste via EntityManager. | [#ec6999a71027dbce-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:70` | Le helper persistSystemCategory crée une catégorie sans propriétaire, dite système. | [#df75fc72747f643e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:75-83` | Le helper persistProduct crée un ProductEntity avec nom unique, catégorie, utilisateur et indicateur archived, puis le persiste. | [#03900b14165a2464-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:26` | Commentaire : Selon le commentaire, CategoryDrawer et apiClient reçoivent le même espion, par export par défaut et export nommé. | [#ba87b3f229a09fac-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:27-30` | Le fichier remplace react-hot-toast par des espions success et error, à la fois en export par défaut et en export nommé. | [#ba87b3f229a09fac-2] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:27-30` | Le test mocke react-hot-toast en exposant les mêmes espions success et error à la fois à l'export par défaut et à l'export nommé. | [#integrations/4cc2fde25f0f7652-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:31-33` | next-intl est simulé pour que useTranslations renvoie la chaîne namespace.key. | [#0e05264ac2fef2aa-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:34-36` | authService.refreshToken est simulé pour résoudre à true. | [#0b9f72ce58b47b89-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:37-42` | DeleteConfirmDialog est remplacé par un composant qui ne rend rien, et PopoverPicker par un simple rendu des enfants. | [#42ac255fae0f08cc-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:47-64` | forbiddenAdapter rejette chaque requête par une AxiosError dont la réponse a le statut 403. | [#bc72c6400a0c9ef4-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:74-83` | renderDrawer monte CategoryDrawer ouvert dans un QueryClient dont les requêtes et mutations ne font aucun retry. | [#bc7231eae247ba4b-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:89-97` | beforeEach remplace l'adaptateur apiClient par forbiddenAdapter et espionne console.error, afterEach restaure l'adaptateur d'origine. | [#07e13231d0bcab08-1] |
| `frontend:components/categories/CategoryDrawer.test.tsx:47-49` | Dans les tests, next-intl est mocké pour renvoyer la clé sous la forme namespace.key. | [#d251599f7fe9e083-1] |
| `frontend:components/categories/CategoryDrawer.test.tsx:56-71` | Le mock de PopoverPicker rend ses children et un bouton pick-color qui appelle onChange avec la couleur #ff8800. | [#2f86dbcfc581ce8b-1] |
| `frontend:components/categories/CategoryDrawer.test.tsx:76-96` | Le mock de DeleteConfirmDialog rend un bouton confirm-delete seulement quand open est vrai, et expose linkedProductsCount en attribut data. | [#7d4642a306a7ae3d-1] |
| `frontend:components/categories/CategoryDrawer.tsx:33` | Le drawer réutilise le composant partagé PaletteColorPicker pour la palette et le repli personnalisé. | [#9f1c26ab0a2a14c2-1] |
| `frontend:components/categories/CategoryDrawer.tsx:126-130` | Les mutations de création, mise à jour et suppression sont appelées avec HANDLES_FORBIDDEN_INLINE, ce qui retire le toast global 403 pour ces requêtes. | [#cda5c34e64b5781a-1] |
| `frontend:components/categories/CategoryDrawer.tsx:137-145` | Le schéma de formulaire est créé avec createCategoryFormSchema, branché sur le traducteur de categories.validation via zodResolver, avec des valeurs par défaut vides pour name, color et description. | [#e1784af712e2f970-1] |
| `frontend:components/categories/CategoryDrawer.tsx:466-467` | Le compteur linkedProductsCount est transmis au DeleteConfirmDialog, et onConfirm pointe vers handleDeleteConfirm. | [#85f957247d9e6b7c-1] |
| `frontend:components/products/CategoriesView.tsx:49` | La vue charge les catégories via le hook useCategories appelé avec enabled à true. | [#5de00bd80ba2be12-1] |
| `frontend:components/products/CategoriesView.tsx:52` | La suppression est appelée avec l'option HANDLES_FORBIDDEN_INLINE afin que le dialog affiche l'erreur 403 inline. | [#0c75b2cd45b930a5-1] |
| `frontend:hooks/useCategories.ts:19-24` | Le hook useCategories appelle useQuery avec la clé queryKeys.categories.all et getCategories, et un drapeau enabled qui vaut true par défaut. | [#acfb423e211cd763-1] |
| `frontend:hooks/useCreateCategory.ts:20-28` | Le hook de création est une mutation qui appelle createCategory avec les options transmises et qui invalide la clé queryKeys.categories.all au succès. | [#113745d00c8af8b4-1] |
| `frontend:hooks/useDeleteCategory.ts:33-37` | Un hook de suppression transmet les paramètres d'identifiant et l'options au service, puis invalide par préfixe les clés categories.all et products.all dans onSuccess. | [#frontend-core/9edab7cbd002bcdc-1] |
| `frontend:hooks/useUpdateCategory.ts:21-31` | Le hook de mise à jour est une mutation qui appelle updateCategory avec id, data et options, sans avaler l'erreur. | [#c9ae135c583feaab-1] |
| `frontend:hooks/useUpdateCategory.ts:26-30` | Au succès, la mise à jour invalide categories.all, le détail de la catégorie et products.all. | [#d746f29789811b87-1] |
| `frontend:services/categoryService.ts:15` | Les statuts 403, 404 et 409 sont déclarés comme erreurs attendues. | [#4b3c68c8626b6d1c-1] |
| `frontend:services/categoryService.ts:27-31` | La fonction ne journalise via console.error que les erreurs dont le statut n'est pas attendu, avec un message assaini par safeErrorMessage. | [#d5ed9227cd2f0937-1] |
| `frontend:services/categoryService.ts:27-31` | Les erreurs inattendues sont journalisées via safeErrorMessage et jamais avec l'objet axios brut. | [#integrations/0d952a09524edf62-1] |
| `frontend:services/categoryService.ts:41-44` | La réponse de GET /categories est validée par categorySchema.array().parse avant d'être renvoyée. | [#integrations/0dcf2e695ec0d8c8-1] |
| `frontend:services/categoryService.ts:59-66` | createCategory transmet un paramètre options optionnel à apiClient.post, puis valide la réponse avec categorySchema.parse. | [#integrations/cd5e05d5c5026de5-1] |
| `frontend:services/categoryService.ts:104-113` | deleteCategory étale les options dans la configuration axios de apiClient.delete et ajoute le paramètre reassignToCategoryId seulement s'il est fourni. | [#integrations/af898f016c5f4e41-1] |
| `frontend:types/category.ts:6` | Javadoc : Le fichier déclare que les schémas Zod doivent rester synchronisés avec les DTO du backend, en référence à la convention cp-frontend. | [#4c19bf9727130e10-1] |
| `frontend:types/category.ts:73-79` | Javadoc : La fonction createCategoryFormSchema reçoit une fonction de traduction t et construit le schéma formulaire traduit, selon le commentaire. | [#3adcd0eeadf50580-1] |
| `frontend:types/category.ts:76-77` | Javadoc : Selon le commentaire, createCategoryFormSchema est utilisé par le zodResolver du CategoryDrawer. | [#3adcd0eeadf50580-2] |
