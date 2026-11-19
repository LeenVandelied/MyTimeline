# Annexe : category

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java` | 27 | test_case 18, role_check 5, convention 2 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.test.tsx` | 26 | test_case 25, suspicious 1 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx` | 24 | business_rule 11, convention 3, other 2 |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx` | 21 | other 8, ui_screen 5, business_rule 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 19 | test_case 11, convention 4, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` | 17 | business_rule 7, service_method 5, validation 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java` | 16 | test_case 14, suspicious 1, validation 1 |
| `mytimeline:frontend/src/types/category.ts` | 11 | validation 4, business_rule 2, other 2 |
| `mytimeline:frontend/src/components/products/CategoriesView.test.tsx` | 10 | test_case 9, convention 1 |
| `mytimeline:frontend/src/services/categoryService.ts` | 10 | external_call 3, business_rule 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` | 9 | endpoint 5, role_check 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 9 | persistence_query 5, suspicious 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 9 | convention 5, entity 2, db_change 1 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 9 | other 3, business_rule 2, db_change 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java` | 4 | validation 2, convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java` | 4 | business_rule 2, convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java` | 4 | convention 3, service_method 1 |
| `mytimeline:frontend/src/hooks/useDeleteCategory.test.tsx` | 4 | test_case 3, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java` | 3 | business_rule 1, suspicious 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Category.java` | 3 | other 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java` | 3 | persistence_query 2, other 1 |
| `mytimeline:frontend/src/hooks/useCreateCategory.ts` | 3 | other 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryReassignTargetInvalidException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java` | 2 | business_rule 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/CategoryService.java` | 2 | other 2 |
| `mytimeline:frontend/src/hooks/useCategories.ts` | 2 | entity 1, suspicious 1 |
| `mytimeline:frontend/src/hooks/useDeleteCategory.ts` | 2 | other 1, service_method 1 |
| `mytimeline:frontend/src/hooks/useUpdateCategory.ts` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryInUseException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNameConflictException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryNotFoundException.java` | 1 | other 1 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx` | 1 | test_case 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:106-115` | CategoryDrawer | Le composant CategoryDrawer unifie la création et l'édition d'une catégorie dans un Dialog Radix, le mode par défaut étant create. | [#e6d055385fc8458c-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:46` | CategoriesView | Le composant CategoriesView affiche la liste des catégories sous forme de cartes, avec un bouton de création et des drawers et dialogues de création, édition et suppression. | [#79ed387050f55f09-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:133-146` | CategoriesView | La vue affiche un squelette de cartes pendant le chargement, un message d'erreur en cas d'échec, puis la liste ou l'état vide. | [#79ed387050f55f09-2] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:150-166` | CategoriesView | L'état vide affiche un bouton d'appel à l'action qui ouvre le drawer de création. | [#79ed387050f55f09-3] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:209` | CategoriesView | Une catégorie système affiche un libellé système sur sa carte. | [#79ed387050f55f09-4] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:238` | CategoriesView | La mention des produits archivés est affichée comme nœud frère hors du badge coloré, uniquement si le nombre d'archivés est supérieur à zéro. | [#79ed387050f55f09-5] |
| `mytimeline:frontend/src/types/category.ts:26-34` | categorySchema | Le schéma Zod categorySchema décrit la réponse CategoryResponse avec id et name en string, system en boolean, et color, description, productCount, archivedProductCount optionnels. | [#f13590c6cb6176a2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:28-30` | CategoryEntity.owner | La relation owner est un ManyToOne LAZY vers UserEntity via la colonne owner_id, nullable, et une valeur null désigne une catégorie système. | [#d1c2b5017da18818-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:40-42` | CategoryEntity.version | Le champ version est annoté @Version et non nullable en base, géré par Hibernate. | [#270e707df5c2b4a7-1] |
| `mytimeline:frontend/src/hooks/useCategories.ts:19-25` | useCategories | Le hook useCategories exécute une requête TanStack Query keyée sur queryKeys.categories.all, qui appelle getCategories, avec enabled à true par défaut. | [#a9586da0f406c26d-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:169-181` | CategoryDrawer.useEffect | À l'ouverture, l'effet appelle form.reset avec les valeurs de la catégorie en édition, ou avec des champs vides en création. | [#f93e327a96d11de1-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - À la mise à jour, le contrôle n'a lieu que si le nom change et exclut la catégorie elle-même. [#9c27cb685f4671a9-1] | deducible |
| rules | - Supprimer une catégorie référencée sans cible de réassignation lève CategoryInUseException, le total comptant actifs et archivés. [#eaffb0c68ca429dd-1] [#012b78abc278c94d-1] | deducible |
| rules | - Les catégories système (sans propriétaire) n'ont pas de bouton de suppression et le drawer est en lecture seule. [#1c4c57b5056c6159-1] [#d5bebd6664179f63-1] [#6d9fef0b58da5670-1] | deducible |
| rules | - L'avertissement de contraste sous WCAG_AA_NORMAL ne bloque pas la soumission. [#e0538a00f2bccd73-1] | deducible |
| surface | - Le GET de liste renvoie les catégories du caller et les catégories système, mais les compteurs de produits ne portent que sur les produits du caller [#5e931bf31739e0ab-1] [#cac15ec8693be1e6-1] [#c9fe1897928afe6b-1]. | deducible |
| surface | - La suppression native par propriétaire n'efface jamais les catégories système, puisqu'elle filtre sur owner_id [#5c52370ef179b6df-1]. | deducible |
| surface | - En édition, le drawer envoie un PATCH dont la description vide devient undefined [#abecc35f1a078445-1]. Le service front n'ajoute reassignToCategoryId à la requête DELETE que s'il est renseigné [#3e28d724e61528a7-1]. | deducible |
| tests | - Les tests fixent que la suppression sans cible lève CategoryInUseException avec le nombre de produits, y compris pour une catégorie ne portant que des produits archivés, et que la catégorie reste en base. [#04e689131fe0479e-1] [#1695d72156758129-1] [#b09de20be3f93adb-1] | deducible |
| tests | - Les tests fixent que la réassignation précède la suppression, déplace les produits actifs et archivés (ceux-ci restent archivés) et qu'une cible inconnue ne réassigne ni ne supprime. [#276f71f5ff833b26-1] [#a203419895f2ef37-1] [#b65930340e1938a2-1] [#4e228ea0af064302-1] | deducible |
| tests | - Les tests fixent que le listing ne renvoie que les catégories de l'appelant et les catégories système, et que countByCategoryForUser ne compte que les produits de l'appelant, contrairement à countByCategoryId. [#38f0d6f3a95aa785-1] [#f0d806bc55ee2674-1] [#e2458ad42993c316-1] | deducible |
| tests | - Les tests fixent que les compteurs actif et archivé retombent à 0 et 0 quand ils sont absents, et que la réponse de création les omet. [#21ac1b1b91fb026e-1] [#3e679e10c0fa2960-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:48-57` | Le champ system vaut vrai lorsque la catégorie n'a pas de propriétaire, et les deux compteurs sont renseignés à null. | [#1c4c57b5056c6159-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:60-70` | La surcharge avec counts remplace un counts nul par CategoryProductCounts.EMPTY, puis convertit actifs et archivés en int avec Math.toIntExact. | [#1c4c57b5056c6159-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:12-14` | Javadoc : Selon la javadoc, color et description écrasent la valeur cible, y compris à null, et le contrôleur exige l'ownership avant application. | [#694e2b75f4dd59e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:39-43` | Commentaire : Un nom déjà porté par une catégorie du même propriétaire lève CategoryNameConflictException. | [#f14cd0b3652037cb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:49-53` | Une DataIntegrityViolationException levée au save est convertie en CategoryNameConflictException. | [#f14cd0b3652037cb-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:65-71` | Le contrôle d'unicité du nom n'a lieu que si le nom change, et exclut la catégorie elle-même de la recherche. | [#9c27cb685f4671a9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:73-83` | Une DataIntegrityViolationException levée au save de la mise à jour est convertie en CategoryNameConflictException. | [#9c27cb685f4671a9-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:128-130` | Une catégorie référencée par des produits sans cible de réassignation lève CategoryInUseException avec le nombre de produits. | [#eaffb0c68ca429dd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:136-138` | Une cible de réassignation égale à la catégorie supprimée lève CategoryReassignTargetInvalidException. | [#eaffb0c68ca429dd-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:145-148` | Les produits sont réassignés vers la cible avant le deleteById de la catégorie, dans la même transaction. | [#eaffb0c68ca429dd-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/CategoryProductCounts.java:20-31` | Le total occupant une catégorie vaut actifs plus archivés, et ce total sert au refus de suppression sans cible. | [#012b78abc278c94d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:97-107` | Pour un id existant en base, save charge l'entité gérée, recopie name, color, description et owner, puis la sauvegarde. | [#412c922e7a954dc5-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:19-22` | Commentaire : Selon le commentaire, une catégorie dont owner_id est NULL est une catégorie système, lisible par tous les utilisateurs authentifiés et non modifiable ni supprimable via PATCH ou DELETE. | [#59d070cfc61058de-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:51-52` | Le nom d'une catégorie doit être unique pour un même propriétaire. | [#b96cb766724289ab-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:183` | Javadoc : Selon la javadoc du test, un produit archivé occupe toujours sa catégorie (option A de la décision #546), car products.category_id est NOT NULL avec FK. | [#48a77c3dbf8c06e5-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:48-53` | Javadoc : Selon la javadoc, BR-CAT-001 rend le champ name obligatoire via Zod min(1) avec message inline sous le champ. | [#07b40fedc9125364-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:132-135` | La couleur locale est un état React nullable, et les états de suppression, de conflit de nom et d'erreur de soumission sont aussi locaux. | [#03985f17e6325e63-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:160-167` | À l'ouverture ou au changement de catégorie, l'état local est réinitialisé pendant le rendu, et la couleur est reprise de category.color en édition ou remise à null en création. | [#1b4f63a62ce65b6d-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:187-195` | L'avertissement de contraste (non bloquant) s'affiche quand le contraste de la couleur choisie avec son encre est inférieur à WCAG_AA_NORMAL. | [#e0538a00f2bccd73-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:189-190` | Le badge d'aperçu prend la couleur choisie ou la variable accent par défaut, et une encre calculée par contraste si la couleur est au format HEX. | [#983c2d53bbb97598-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:204-205` | La fonction onSubmit ne fait rien quand le drawer est en lecture seule (catégorie système). | [#6d9fef0b58da5670-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:226-228` | Un toast de confirmation est affiché après une création réussie uniquement, l'édition n'en déclenche pas. | [#6d9fef0b58da5670-2] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:249-256` | handleDeleteConfirm lève une erreur si category est absent, puis appelle deleteMutation.mutateAsync, ferme le dialog, appelle onDeleted et ferme le drawer. | [#396659e34b1d4ac6-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:341-348` | Le bouton de réinitialisation de couleur s'affiche seulement si une couleur est choisie et que le drawer n'est pas en lecture seule, et il remet color à null et vide le champ color. | [#07b40fedc9125364-2] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:412-416` | Le bouton supprimer n'est affiché qu'en mode édition d'une catégorie non système, sinon un span vide le remplace. | [#07b40fedc9125364-3] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:439-443` | Le bouton de soumission est rendu uniquement quand le drawer n'est pas en lecture seule, et il est désactivé pendant la soumission. | [#07b40fedc9125364-4] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:64-65` | Le total lié à une catégorie est la somme des produits actifs et des produits archivés, ce total arme la réassignation à la suppression. | [#e9ac6b76e2a1a54a-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:176` | Le badge coloré des produits actifs est affiché seulement si la catégorie a au moins un produit actif ou si elle n'a aucun produit archivé. | [#5eebdeb9979d7cc2-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:249` | Le bouton de suppression n'est rendu que pour les catégories non système. | [#d5bebd6664179f63-1] |
| `mytimeline:frontend/src/services/categoryService.ts:15` | Les statuts 403, 404 et 409 sont considérés comme attendus et ne sont pas journalisés. | [#4716c59518fbcf30-1] |
| `mytimeline:frontend/src/services/categoryService.ts:28-30` | Une erreur dont le statut est attendu n'est pas journalisée, les autres sont journalisées avec un message assaini. | [#192397e9713558b6-1] |
| `mytimeline:frontend/src/types/category.ts:9-11` | Javadoc : Selon le commentaire, system vaut true pour une catégorie système (owner NULL côté backend) lisible de tous mais non supprimable, et le DTO n'expose jamais l'ownerId. | [#0d48c83db788e795-1] |
| `mytimeline:frontend/src/types/category.ts:42` | Javadoc : Selon le commentaire, le backend porte name en @NotBlank avec @Size(max=255) (BR-CAT-001), et n'impose pas de format hexadécimal à color. | [#4b07d82e878d150b-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:6-15` | Javadoc : Selon la javadoc, un nom vide produit une erreur 400 via GlobalExceptionHandler avant l'appel au service. | [#2bcbf8e560474ee0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:18-20` | Le champ name est annoté @NotBlank et @Size(max = 255), donc un nom vide ou trop long est rejeté. | [#212db779c23e173f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:18-20` | Le champ name est annoté @NotBlank et @Size(max = 255) pour la mise à jour comme pour la création. | [#4a8db005e22bb8c2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:42` | Un nom en conflit pour le même propriétaire lève CategoryNameConflictException. | [#578f6842481e6f5b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:60-61` | Une catégorie introuvable par son id lève CategoryNotFoundException. | [#62712a2e7883632b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:142-144` | Une cible de réassignation inexistante lève CategoryNotFoundException. | [#45d650166c0d2b18-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:221-232` | Le test vérifie qu'une réassignation dont la cible est la catégorie supprimée lève CategoryReassignTargetInvalidException, avant toute réassignation ou suppression. | [#5ce63048ed5869f1-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:427-441` | Le test vérifie qu'un DELETE dont reassignToCategoryId égale l'id de la catégorie renvoie 409 avec le message dédié de la cible invalide. | [#51f71cc47fd8760e-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:232-237` | Une erreur HTTP 409 pose une erreur inline sur le champ name avec la clé nameConflict, sans toast. | [#3e2d3afaed4325ae-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:107` | La confirmation lève une erreur si aucune catégorie n'est en cours de suppression. | [#218c64a69f39450f-1] |
| `mytimeline:frontend/src/services/categoryService.ts:44` | La réponse de la liste des catégories est validée par le schéma Zod tableau avant d'être retournée. | [#8fbfe1a9bc25d288-1] |
| `mytimeline:frontend/src/types/category.ts:32-33` | productCount et archivedProductCount sont validés comme entiers non négatifs lorsqu'ils sont présents. | [#b3911ffb49abddb9-1] |
| `mytimeline:frontend/src/types/category.ts:52-56` | Le schéma de création exige name entre 1 et 255 caractères, et color et description optionnels bornés à 255 caractères. | [#db60f762273b50d0-1] |
| `mytimeline:frontend/src/types/category.ts:65-69` | Le schéma de mise à jour exige name entre 1 et 255 caractères, et color et description optionnels bornés à 255 caractères. | [#6fda3c6cb3a96c2c-1] |
| `mytimeline:frontend/src/types/category.ts:79-88` | La fabrique createCategoryFormSchema construit le schéma de formulaire où name a un message traduit nameRequired si vide et nameTooLong si au-delà de 255 caractères. | [#846816ce761ec886-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:135-147` | La suppression exige que la catégorie et la catégorie cible de réassignation appartiennent au caller, sinon 403, la cible absente renvoyant 404. | [#ae0776408d72d1fa-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:158-169` | Une catégorie est visible en lecture si son ownerId est null ou égal à l'id du caller. | [#f94398a063d9ab08-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:257-266` | Le test vérifie qu'une catégorie appartenant à un autre utilisateur renvoie 404 au GET, sans révéler son existence. | [#2d0f29d6c718fb07-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:325-338` | Le test vérifie qu'un PATCH sur une catégorie d'un autre utilisateur renvoie 403 sans appeler updateCategory. | [#a3e3c489c79348b6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:341-354` | Le test vérifie qu'un PATCH sur une catégorie système (owner NULL) renvoie 403 sans appeler updateCategory. | [#a327b12c15860f52-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:444-457` | Le test vérifie qu'un DELETE dont la cible de réassignation appartient à un autre utilisateur renvoie 403 sans appeler deleteCategory. | [#31958407337960bf-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:460-471` | Le test vérifie qu'un DELETE sur une catégorie d'un autre utilisateur renvoie 403 sans appeler deleteCategory. | [#d93815e4b660bd09-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:120-122` | Le drawer passe en lecture seule quand il édite une catégorie dont le flag system vaut true. | [#043edf679aec4f96-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryUpdateRequest.java:16` | CategoryUpdateRequest duplique à l'identique les champs, contraintes et accesseurs de CategoryRequest au lieu de les partager. | [#backend-socle/9da0340c3f09d450-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:123-129` | Le 409 expose le total de produits référençant la catégorie, tous utilisateurs confondus, alors que le commentaire de getProductCountsForOwner indique que ce comptage n'est pas scopé au caller. | [#395d09558e025ee3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:85-112` | Le commentaire de getCategoryById annonce une anti-énumération, mais PATCH renvoie 403 pour une catégorie d'autrui alors que GET renvoie 404 pour la même situation. | [#ebdb1fb9d77aec4d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:42` | Le commentaire qualifie la recherche par nom de legacy non scopée par propriétaire, alors que CategoryServiceImpl.getCategoryByName l'expose encore comme service public. | [#4038ee5133ec77d6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:97-113` | Si un id est fourni mais absent de la base, save passe à la branche création qui réutilise cet id via toEntity, sans erreur explicite. | [#493ecdfe3b90fec5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:26-27` | Le commentaire indique que l'ownership se compare via getOwnerId(), méthode absente de CategoryEntity dans le fichier lu. | [#backend-socle/d1ef4e68ef3adda6-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:21-22` | Le commentaire annonce un 403 pour DELETE d'une catégorie système (owner NULL), mais aucun test de CategoryControllerTest ne couvre ce cas, seul PATCH est testé pour une catégorie à owner NULL. | [#d0eb9b6e8490ebb9-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:43` | L'index sur owner_id est nommé avec le préfixe ix_, alors que les autres index du lot utilisent le préfixe idx_. | [#backend-socle/b1451e62a3d7cc4d-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/CategoryServiceImplTest.java:248-252` | Selon le commentaire, le @Transactional du service annule la réassignation en cas d'échec du delete, mais le test ne vérifie pas ce rollback et seulement la propagation de l'exception. | [#1d4a95510dba4342-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:186` | La javadoc indique que le correctif de la règle archivé est côté UI, ce qui n'est pas vérifiable depuis ce fichier de test. | [#da4056a8a53e2fe2-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.test.tsx:56` | Le test mocke le module '@/components/ui/popoverPicker', alors que CategoryDrawer importe PaletteColorPicker depuis '@/components/ui/palette-color-picker'. Le fichier contient un mock dont le chemin n'est pas celui importé directement par le composant lu. | [#2dfe524d581deaff-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:169-181` | L'effet de réinitialision du formulaire omet form de son tableau de dépendances, et une désactivation eslint est posée sur cette ligne. | [#618f831075779054-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:169` | Un TODO signale une virtualisation à prévoir au-delà de 50 éléments, sans implémentation dans le code. | [#81b6ae26ae65fc60-1] |
| `mytimeline:frontend/src/hooks/useCategories.ts:14` | Le commentaire annonce une forme objet v5 avec gcTime, mais le hook ne configure ni gcTime ni cacheTime, il ne passe que queryKey, queryFn et enabled. | [#4ca03ca5eae0a609-1] |
| `mytimeline:frontend/src/types/category.ts:48-50` | Selon le commentaire, le PATCH écrase color et description avec la valeur portée, y compris null ou vide, alors que le schéma categoryUpdateSchema ne déclare pas nullable ces champs et n'accepte donc pas null. | [#408f0c3a37dbb47c-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:23-33` | Convertit un Category en CategoryEntity en copiant id, name, color et description, sans poser le propriétaire. | [#4bd28d018d736f2d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:37-54` | Crée une catégorie possédée par ownerId après un contrôle d'unicité du nom pour cet utilisateur, puis la sauvegarde via le repository. | [#a3835a3af62f1506-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:58-84` | Met à jour name, color et description d'une catégorie existante après contrôle d'unicité du nom pour son propriétaire. | [#d0127fe635a527fd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:88-91` | Retourne les catégories possédées par callerId ou système via findByOwnerIdOrSystem. | [#cac15ec8693be1e6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:95-101` | Délègue au port ProductRepository le comptage groupé des produits du caller par catégorie. | [#c9fe1897928afe6b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:111-113` | Délègue à findDomainCategoryByName, recherche non scopée par propriétaire. | [#208d9331683b9e01-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:209-229` | En édition, onSubmit envoie un PATCH avec name, color et description, et la description vide devient undefined. | [#abecc35f1a078445-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:330` | setSwatch met à jour l'état couleur et la valeur du champ color du formulaire, pour une pastille de palette comme pour le picker libre. | [#56f90f609797c53f-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.tsx:106-112` | La confirmation de suppression appelle la mutation avec l'identifiant de la catégorie et la cible de réassignation, puis réinitialise la catégorie à supprimer. | [#ca79fcf25dd742c7-1] |
| `mytimeline:frontend/src/hooks/useDeleteCategory.ts:29-38` | Le hook useDeleteCategory expose une mutation qui appelle deleteCategory avec l'identifiant, la cible de réassignation et les options. | [#4aebe4d0e8625f69-1] |
| `mytimeline:frontend/src/services/categoryService.ts:41-49` | getCategories appelle GET /categories et valide la réponse avec le schéma Zod en tableau, puis relance l'erreur en cas d'échec. | [#f18cda555fec0e73-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:218-225` | onSubmit appelle updateMutation.mutateAsync en édition et createMutation.mutateAsync en création. | [#6a2649ee1ff8a07f-1] |
| `mytimeline:frontend/src/services/categoryService.ts:65-66` | createCategory envoie un POST sur /categories avec les données et les options, puis valide la réponse avec categorySchema. | [#ff33ecae10b6195b-1] |
| `mytimeline:frontend/src/services/categoryService.ts:86-87` | updateCategory envoie un PATCH sur /categories/{id} avec les données partielles, puis valide la réponse avec categorySchema. | [#234939e6cd98907a-1] |
| `mytimeline:frontend/src/services/categoryService.ts:110-113` | deleteCategory envoie un DELETE sur /categories/{id} et ajoute le paramètre reassignToCategoryId seulement s'il est renseigné. | [#3e28d724e61528a7-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java:19` | Port de recherche d'une catégorie par propriétaire et nom, utilisé pour l'unicité par utilisateur. | [#a1467ed5f792cecd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java:26` | Port de listing renvoyant les catégories du propriétaire et les catégories système. | [#fa6410172618b7e7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:35-37` | Lit la catégorie par id via SimpleJpaRepository.findById puis la convertit en domaine. | [#ee6fbbf8a21b4f8c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:45-49` | Recherche JPQL d'une catégorie par nom sans filtre de propriétaire, limitée à un résultat. | [#affac85659b068b2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:61-73` | Recherche JPQL d'une catégorie par propriétaire et nom, limitée à un résultat. | [#0078509643a7fda1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:79-87` | Requête JPQL renvoyant les catégories du propriétaire et celles dont owner est null. | [#7ca2402a4d31c75b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:117-127` | Suppression native des catégories dont owner_id correspond à l'ownerId, ce qui exclut les catégories système. | [#5c52370ef179b6df-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:12-42` | Entité JPA mappée sur la table categories, avec id UUID généré, name, color, description, owner en ManyToOne LAZY, createdAt, updatedAt et version. | [#18cd2da900c02239-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:31-32` | La migration V8 ajoute à la table categories une colonne owner_id de type uuid, nullable et sans backfill. | [#1ccf85b418dbc236-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:37-39` | La migration ajoute la clé étrangère fk_categories_owner de categories.owner_id vers users(id), sans clause ON DELETE. | [#879a45a1da6d61a3-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java:16` | Un DTO de requête est une classe publique sans héritage, avec getters et setters écrits à la main et sans Lombok. | [#backend-socle/0e0710df4305535f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/CategoryResponse.java:40-45` | Les champs productCount et archivedProductCount portent @JsonInclude(NON_NULL) et sortent du JSON lorsqu'ils valent null. | [#589eacadba673516-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:9` | Un mapper est une classe annotée @Component qui expose toDomain (entité vers domaine) et toEntity (domaine vers entité), sans état. | [#backend-socle/a7c783c06a389c8b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:19` | toDomain lit l'identifiant du propriétaire avec une garde null, ce qui laisse à null un owner absent sans déclencher le chargement d'un proxy. | [#backend-socle/9cbcc0688f237f92-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/CategoryMapper.java:23` | Commentaire : toEntity ne renseigne pas la relation propriétaire, le rattachement étant fait côté repository par entityManager.getReference à partir de l'ownerId. | [#backend-socle/90aa1ac5754d7284-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Category.java:19-29` | Un modèle domaine POJO déclare des constructeurs surchargés de plus en plus complets, et chaque constructeur enrichi délègue au constructeur plus court par this(...). | [#backend-socle/424a5d9278895a13-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:49` | Le contrôleur dérive l'identité de l'appelant via CallerResolver.currentUser() et non d'un paramètre de requête. | [#e8423c293582be48-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:133-139` | Le propriétaire est rattaché via entityManager.getReference(UserEntity.class, ownerId), et null détache le propriétaire. | [#85da6f502cda00ca-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:12-15` | Les entités JPA de infrastructure/entities sont annotées @Entity et @Table avec un nom de table en minuscules, et portent @EntityListeners(AuditingEntityListener.class) pour l'audit. | [#backend-socle/8d705e8aea055bbf-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:17-19` | La clé primaire est un UUID annoté @Id et @GeneratedValue(strategy = GenerationType.AUTO), motif identique dans les cinq entités du lot. | [#backend-socle/25c59843a4ac69a9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:32-38` | Les dates d'audit suivent un même motif dans les cinq entités : createdAt annoté @CreatedDate et non modifiable, updatedAt annoté @LastModifiedDate, les deux en LocalDateTime. | [#backend-socle/95bb2d7a6c03fe6d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:44-46` | Les entités n'utilisent pas Lombok : getters et setters sont écrits à la main, sans setter pour les champs d'audit ni pour la version. | [#backend-socle/6c05270326197a33-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java:96-107` | equals compare l'identifiant UUID uniquement s'il est non nul, et hashCode renvoie getClass().hashCode(), motif répété dans les cinq entités. | [#backend-socle/322992155a7f5945-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:63-66` | Le test de contrôleur monte CategoryController en MockMvc standalone avec GlobalExceptionHandler comme controller advice et un CallerResolver mocké. | [#31d3916d5a6a4f13-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryControllerTest.java:75-77` | La méthode de test stubCaller simule l'utilisateur courant en stubbant CallerResolver.currentUser() pour renvoyer le user de test. | [#25990f80ae142315-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:26-28` | Javadoc : Selon la javadoc, les tests de suppression de catégorie s'exécutent contre un vrai Postgres jetable migré par Flyway V1 à V8. | [#integrations/26670bb3c46594fc-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:35` | Javadoc : Selon la javadoc de la classe, chaque test est annulé par rollback grâce à @Transactional. | [#integrations/26670bb3c46594fc-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:37-39` | La classe de test est annotée @SpringBootTest et @Transactional, hérite de AbstractPostgresIntegrationTest et fonctionne avec rollback après chaque test. | [#32797c8e8dcb31c0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java:253-258` | Javadoc : Selon la javadoc, les tests de comptage en SQL natif s'exécutent contre un vrai Postgres, un mock ne prouvant rien. | [#integrations/9a0f1c7c4ac6b509-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:33` | Le drawer utilise le composant partagé PaletteColorPicker pour la palette et le repli personnalisé. | [#c41ef6f01914537d-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:42-46` | Javadoc : Selon la javadoc, le drawer calque le pattern de ProductDrawer (#61) avec un Dialog Radix et des classes responsive identiques, sans nouvelle primitive drawer. | [#44ecd16ab9291021-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx:124-130` | Les trois mutations reçoivent HANDLES_FORBIDDEN_INLINE, ce qui désactive le toast global d'accès refusé pour ces requêtes. | [#0f83cbf599284516-1] |
| `mytimeline:frontend/src/components/products/CategoriesView.test.tsx:24` | Les tests de CategoriesView mockent les hooks useCategories et useDeleteCategory, next-intl et les dialogues de drawer et de suppression. | [#3a378bf0ca14426c-1] |
| `mytimeline:frontend/src/services/categoryService.ts:29` | Commentaire : Selon le commentaire, l'objet axios brut ne doit jamais être journalisé, seul un message assaini l'est. | [#47eb0675ec477adf-1] |
| `mytimeline:frontend/src/types/category.ts:3-25` | Javadoc : Selon le commentaire, le schéma Zod doit rester synchronisé avec le DTO backend CategoryResponse, et les compteurs productCount et archivedProductCount sont absents (jamais null) hors GET /api/categories. | [#a79ae611e1720afb-1] |
