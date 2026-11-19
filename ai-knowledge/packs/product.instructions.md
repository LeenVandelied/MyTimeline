---
pack: product
kind: domain
name: Produits
generated_at: 2026-11-19T10:32:37Z
generator: synth/1
base_sha256: 4e28a63f6e6c575773f3d4ece8dce1187c39eaac0063106dbf5bec5af1749028
facts_in_base: 906
facts_in_pool: 897
facts_cited: 95
sections: product.sections.json
details: [product.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: product.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : product, produit
- Entités : ProductEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Produit | Regroupe une catégorie et une liste d'événements, avec une couleur facultative côté frontend. Côté base, les événements sont supprimés avec lui (cascade et orphelins). | [#cb9cd539bc6aefc5-1] [#f9764289451941b1-1] |
| Archivé | Indicateur booléen non nul, faux par défaut. Archiver un produit affiche un toast de succès dédié. | [#3cf28ed77eb574bb-1] [#9cc65799cbc6def7-1] |
| Frise | Nom français de la vue chronologique, ouverte depuis le lien de la densité du tableau de bord (clé openTimeline). | [#4e9437e462e8c665-1] [#676746658e0bc721-1] |
| Densité (ruban) | Repère temporel du tableau de bord dont le jour 0 affiche Aujourd'hui, les autres jours une date courte. | [#8201be6af3b41edb-1] |
| KPI du tableau de bord | Cinq métriques agrégées du tableau de bord, dont une partie récurrente de la semaine et la catégorie la plus chargée. | [#c730773888727d2d-1] [#99b2ca01d45a7db5-1] |
| Version | Champ de verrouillage optimiste du produit, non nul. | [#529d47becb68ce40-1] |

## 3. Règles {#rules}

### Archivage et restauration
- Toute lecture Hibernate de ProductEntity ajoute archived = false, donc un produit archivé disparaît de tous les chargements, y compris findById. [#ed1e9d0b02832172-1]
- La restauration est un UPDATE natif filtré sur id, utilisateur et état archivé, et lève ProductNotFoundException si aucune ligne n'est touchée. [#b3cdac12863fa666-1] [#886190a156eb7d0d-1]
- Côté front, archiver sans userId ou sans produit lève une erreur avant tout appel. [#489818ded7d0ce9d-1] [#2a25f62a0b7cc915-1]
- Après un archivage réussi, le produit sort du cache withEvents et les préfixes products.all et categories.all sont invalidés. [#4bd10885e9cd21a4-1] [#4bd10885e9cd21a4-2]
- Une fiche archivée depuis sa propre vue reste affichée avec la dernière valeur vue. [#36a9604e04113a4f-1]
- Une restauration en échec 404 invalide la liste des archivés, et le dialog affiche notFound pour ce statut, generic sinon. [#9d28ca967e35fb4c-2] [#3fc3ae8dc472fb2e-1]
### Création
- Le userId du chemin remplace celui du corps, et un utilisateur inconnu lève UserNotFoundException. [#cf90f9c9f863d556-1] [#d037acd2b97aa575-1]
- Une couleur fournie doit respecter le format #RRGGBB, côté API comme côté schéma front. [#543d5111ef963789-1] [#cc79bb18430a4b6d-1] [#485f8b3b418aef7b-1]
- Le drawer ajoute un événement single au nom du produit seulement si une date de premier événement est saisie, et n'envoie color que si une surcharge existe. [#551bcc200cf8e8da-5] [#551bcc200cf8e8da-4]
### Mise à jour
- Pour la couleur, clearColor prime sur color, et un color null laisse la valeur inchangée. [#f60876188a14193e-3]
### Affichage
- Un échec de soumission affiche un message distinct pour 409, 404 et 403, et generic sinon. [#551bcc200cf8e8da-7]
### Vérifié dans le code
- Dans ProductServiceImpl.createProduct, product.getId() est null au moment de construire les Event ; le lien passe par ProductMapper.toEntity [#b9e90088400e813c-1] [#fc5fea0dc91f12cf-1] [#b9e90088400e813c-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:62-87`.
- ProductRepositoryJpaImpl.save ne doit être appelé qu'après un findDomainProductById réussi (404 sinon) pour un id existant, car un id d'archivé tombe dans la branche de création [#522d191440441932-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:123-124`.
- ProductServiceImpl.createProduct accepte ProductCreationRequest.events null ou absent (traité comme liste vide), donc la javadoc de productCreateSchema qui prétend le contraire est périmée [#b9e90088400e813c-1] [#fc5fea0dc91f12cf-1] [#404568a8227181ab-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:66-69`.
- Construire Product avec une liste d'événements non null (new ArrayList<>()), car ProductMapper.toEntity et Product.addEvent ne la gardent pas [#404568a8227181ab-1] [#b1423a6b9a69c37d-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:62`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/components/products/ProductDetailView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductDetailView | Le composant ProductDetailView affiche la fiche d'un produit identifié par productId, avec les libellés issus du namespace products.detail. | L99-104 | [#39baf5adb23b61d1-1] |
| ProductDetailView.filter | Le filtre de vue démarre sur 'active' à l'arrivée sur la page et change via handleFilterChange si la valeur est un EventViewFilter valide. (partiel) | L132 | [#07ded6af0e4471bb-1] |
| ProductDetailView.handleUnarchive | Un événement archivé repasse actif par un PATCH archived à false qui transmet sa version, en passant par setEventArchived.mutateAsync. (partiel) | L209-226 | [#c5ca807409be8f5a-1] |
| ProductDetailView.handleArchiveConfirm | Un produit actif passe à l'état archivé via archiveMutation, après confirmation dans DeleteConfirmDialog, à la suite de l'appel handleArchiveConfirm. (partiel) | L252-258 | [#060947a947592355-1] |
| ProductDetailView | Pendant le chargement de la liste, la vue affiche un squelette de frise avec le bouton retour. | L273 | [#39baf5adb23b61d1-2] |
| ProductDetailView | Si le produit n'est pas trouvé dans la liste ni archivé localement, la vue affiche le message alerte notFound avec le bouton retour. | L291-300 | [#39baf5adb23b61d1-3] |
| ProductDetailView | Le bouton de création d'événement n'est affiché que si useOpenCreateEvent fournit une fonction, pré-remplie avec le productId. | L326-340 | [#39baf5adb23b61d1-4] |
| ProductDetailView.setEditOpen | Le bouton Modifier ouvre le ProductDrawer en mode edit. | L345-346 | [#66ed0706faa56239-1] |
| ProductDetailView.setArchiveOpen | Le bouton Archiver ouvre le DeleteConfirmDialog en variante product. | L355-356 | [#862027f833615d38-1] |
| ProductDetailView.handleArchiveConfirm | Le DeleteConfirmDialog de variante product est branché sur handleArchiveConfirm pour confirmer l'archivage. | L596-601 | [#7c347389013c85d2-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductServiceImpl.archiveById | Passe le produit à archived true puis le sauvegarde, sans suppression physique. (partiel) | L173-179 | [#6a2517a951787033-1] |
| ProductServiceImpl.restoreProduct | Restaure un produit archivé de l'utilisateur via un UPDATE natif qui filtre sur id, user_id et archivé. | L195-200 | [#b3cdac12863fa666-1] |
#### mytimeline:frontend/src/hooks/useThemeChoice.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useThemeChoice.mounted | La valeur mounted passe de false, l'instantané serveur, à true, l'instantané client, via useSyncExternalStore pendant l'hydratation puis au rendu client. | L120-127 | [#91d045dc7470918f-1] |
#### mytimeline:frontend/src/hooks/useMobileKeyboard.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useMobileKeyboard | Lorsque le hook est désactivé, l'état mesuré repasse à IDLE pendant le rendu. (partiel) | L105 | [#87238997a119b8eb-1] |
| useMobileKeyboard.measure | Le hook appelle onKeyboardShow lors du passage à clavier ouvert et onKeyboardHide lors du passage à clavier fermé, uniquement aux transitions. | L140-143 | [#ec0234e74e13d9d1-1] |
#### mytimeline:frontend/src/hooks/useReturnFocus.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useReturnFocus.handleCloseAutoFocus | À la fermeture, la cible capturée est remise à null dans la ref, qu'elle serve ensuite ou non. (partiel) | L57-58 | [#f2fd003d7223feea-1] |
#### mytimeline:frontend/src/hooks/useSectionAnimation.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useSectionAnimation | Une section passe de non visible à visible par ajout de la classe visible lorsqu'elle intersecte, puis n'est plus observée. (partiel) | L37-39 | [#49a15a9e5c3fb823-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController.createProduct | POST /api/users/{userId}/products crée un produit à partir de ProductCreationRequest et répond 201 avec ProductResponse, 401 sans caller, 403 si userId diffère du caller. | L50-66 | [#a45ab87714125d89-1] |
| ProductController.getProducts | GET /api/users/{userId}/products renvoie la liste des ProductResponse de l'utilisateur, 401 sans caller et 403 si userId diffère. | L68-85 | [#50b0c706658bca1e-1] |
| ProductController.getArchivedProducts | GET /api/users/{userId}/products/archived renvoie la liste des ArchivedProductResponse du caller, 401 sans caller et 403 si userId diffère. | L92-106 | [#14e94e9251725880-1] |
| ProductController.restoreProduct | POST /api/users/{userId}/products/{productId}/restore appelle restoreProduct et répond 204, 401 sans caller et 403 si userId diffère. | L118-132 | [#872cfe4d1c32510e-1] |
| ProductController.getProductById | GET /api/users/{userId}/products/{productId} renvoie 200 avec ProductResponse, 404 si le produit est absent et 403 s'il n'appartient pas à l'utilisateur. | L134-154 | [#2d4b45fa3cccfbe6-1] |
| ProductController.updateProduct | PATCH /api/users/{userId}/products/{productId} valide l'ownership puis délègue à updateProduct, et répond 200 avec ProductResponse. | L156-181 | [#2bd6b224df409668-1] |
| ProductController.deleteProduct | DELETE /api/users/{userId}/products/{productId} archive le produit via archiveById et répond 204, sans suppression physique. | L183-206 | [#d1e3766cca0d7a1c-1] |
| ProductController.getEventsByProductId | GET /api/users/{userId}/products/{productId}/events renvoie la liste des EventResponse du produit, 404 si le produit est absent ou si sa liste d'événements est vide. | L208-236 | [#7a84fcea242d16a5-1] |
#### mytimeline:frontend/src/services/productService.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| getProducts | getProducts appelle GET /users/{userId}/products et journalise un message assaini en cas d'erreur avant de relancer l'erreur. | L6-16 | [#5b601ed88b8fe133-1] |
| createProduct | createProduct envoie POST /users/{userId}/products avec le corps productData complété par userId. | L18-45 | [#3706ca6809b9334e-1] |
| updateProduct | updateProduct envoie PATCH /users/{userId}/products/{productId} avec le patch et propage l'erreur axios. | L55-72 | [#a5e2354c0e69e639-1] |
| deleteProduct | deleteProduct envoie DELETE /users/{userId}/products/{productId} avec les options transmises et relance toute erreur. | L91-102 | [#79b7bb9a286d258b-1] |
| getArchivedProducts | getArchivedProducts appelle GET /users/{userId}/products/archived et renvoie la liste des produits archivés. | L108-116 | [#ed8681176eefd28a-1] |
| restoreProduct | restoreProduct envoie POST /users/{userId}/products/{productId}/restore et propage l'erreur axios telle quelle. | L124-131 | [#97a35bcd3968a9a2-1] |
#### mytimeline:frontend/src/components/products/ProductDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductDrawer | Le drawer produit est un Dialog Radix qui s'ouvre en création ou en édition selon la prop mode, avec un titre et une description qui changent selon le mode. | L275-276 | [#202851a80eab2017-1] |
| ProductDrawer | Le contenu du dialogue est une bottom sheet sur mobile et un panneau latéral droit de 452 px de large sur desktop (sm et plus). | L282-284 | [#202851a80eab2017-2] |

## 5. Endpoints et écrans {#surface}

- Les routes produit sont dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java:50-236` [#a45ab87714125d89-1], l'écran principal côté front est `mytimeline:frontend/src/components/products/ProductsListView.tsx:84-92` [#d44fc22f2b25162b-1].
- Les routes avec productId répondent aussi 403 quand le produit n'appartient pas au userId, et un produit sans utilisateur est refusé [#2d4b45fa3cccfbe6-1] [#08ae0ae3e5becd01-1] [#ba3896e449e1946e-1].
- DELETE archive le produit sans suppression physique, donc un produit supprimé reste en base et se retrouve par la route archived [#d1e3766cca0d7a1c-1] [#14e94e9251725880-1].
- Une catégorie d'un autre utilisateur lève la même CategoryNotFoundException qu'une catégorie inexistante, seules les catégories système ou propres à l'appelant sont assignables [#a712e9e45d53dc59-1] [#ec4e3fd3227d38b3-1].
- La liste archivée est triée par updated_at décroissant et ses produits sont mappés sans événements, alors que la liste normale charge les événements en jointure [#ac65747e16965f1e-1] [#317d1ef1ca19b818-1].
- Les requêtes par catégorie et la purge par utilisateur comptent ou suppriment les produits archivés inclus, contrairement à findAllProducts qui les masque [#326ff59e03dce0b8-1] [#7f9be5fdb738e55f-1] [#cbf7e3080a18d38f-1].
- L'archivage depuis la liste passe HANDLES_FORBIDDEN_INLINE, donc un 403 n'y déclenche pas le toast global [#fcc6e5d8ad133351-1].
- Sur la fiche produit, le bouton de création d'événement n'apparaît que dans le shell, et un produit introuvable après chargement affiche le message notFound [#39baf5adb23b61d1-4] [#39baf5adb23b61d1-3].
- RestoreProductDialog traite overlay et Échap comme une annulation via handleCancel [#e23fbeab5c44091f-2].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 84), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/components/products/ProductDrawer.tsx` | 24 | business_rule 14, validation 4, ui_screen 2 |
| `mytimeline:frontend/src/components/products/ProductDetailView.tsx` | 24 | business_rule 10, ui_screen 7, state_transition 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` | 22 | service_method 6, business_rule 5, suspicious 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java` | 18 | endpoint 8, convention 3, role_check 3 |
| `mytimeline:frontend/src/components/products/ProductDetailView.test.tsx` | 43 | test_case 35, business_rule 3, other 2 |
| `mytimeline:frontend/src/components/dashboard/kpis.ts` | 15 | business_rule 8, service_method 4, config 1 |
| `mytimeline:frontend/src/components/products/ProductsListView.test.tsx` | 44 | test_case 39, business_rule 3, other 1 |
| `mytimeline:frontend/src/types/product.ts` | 15 | business_rule 5, validation 4, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java` | 20 | persistence_query 7, convention 5, other 3 |
| `mytimeline:frontend/src/components/products/ProductsListView.tsx` | 23 | other 9, business_rule 4, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ProductServiceImplTest.java` | 25 | test_case 18, business_rule 6, validation 1 |
| `mytimeline:frontend/src/hooks/useThemeChoice.ts` | 14 | business_rule 5, convention 3, service_method 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| backend-socle | 7 | 7 |  |
| integrations | 2 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un produit d'autrui donne 403 en GET, PATCH et DELETE sans écriture, et qu'un caller absent donne 401 [#11290ed1e7cdc863-1] [#3867990124be7804-1] [#e0b8ccf1c62e4f80-1] [#1f47760feddb9444-1].
- Les tests fixent qu'une catégorie d'un autre utilisateur lève CategoryNotFoundException à la création et au PATCH sans save, et qu'une catégorie système ou celle de l'appelant passe [#16b8dd187d80edb9-1] [#fffd1d9642eaa076-1] [#aa5109733cf7f78a-1] [#5e6820bd0759ed38-1].
- Les tests fixent qu'un désarchivage en 404 invalide les archivés seuls, et qu'un 500 n'invalide rien [#25b83a2183e60a2b-3] [#25b83a2183e60a2b-4].

## 9. Questions ouvertes {#questions}

- Le libellé de plage de DensityRibbon en mode scrollable couvre-t-il rangeDays plus un jours à dessein ? Les barres couvrent rangeDays jours et buildDensityBuckets n'a pas été lu. [#fe8823be27d22b73-1]

## 10. Alertes {#alerts}

- Le endpoint des événements d'un produit répond 404 quand la liste est vide, alors que le service autorise un produit sans événement, donc un produit valide neuf donne une erreur côté client. Ne pas traiter une liste vide comme un produit absent. [#d2ac56499c27c2b2-1] [#b9e90088400e813c-1]
- Le commentaire de ProductEntity dit que la liste passe par findAll, alors que le test et findByUserId indiquent un filtre par utilisateur. Lire findByUserId comme référence et ne pas s'appuyer sur ce commentaire. [#273e1cf63cf5b461-1]
- ProductSparkline fige l'instant de référence au montage, donc la fenêtre de 90 jours ne glisse pas tant que le composant reste monté. Passer l'instant en prop si un affichage long doit se mettre à jour. [#71bf1dbf78fedd0b-2]
- Le port ProductRepository importe Spring et ProductService dépend des DTOs de la couche application, ce qui contredit la règle hexagonale du projet. Ne pas copier ce schéma dans un nouveau port. [#af393afe6d8cdb5e-1] [#320ca0e55e5d619b-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 85 ; avec au moins un fait en base : 84 ; sans fait après remise en file : 0.
- Faits en base : 906, repris d'autres packs : +16, hors périmètre : -0, doublons écartés à la déduplication : -25, soit 897 dans le pool.
- Faits du pool venus d'un autre pack : 9 (par pack : section Relations).
- Destination des 897 faits du pool : Lexique 27 ; Règles 150 ; Endpoints et écrans 101 ; Tests attendus 323 ; Alertes / Questions ouvertes 55 ; annexe seule 93 ; écartés (sorte `other` ou inconnue) 148.
- Base : sha256 4e28a63f6e6c…, générée le 2026-11-19.
