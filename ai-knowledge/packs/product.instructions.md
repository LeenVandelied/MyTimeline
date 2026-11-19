---
pack: product
kind: domain
name: Produit
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 31487009be6dcfa955e321aa5997c978af400bbe9561043fc4e671fc851384fe
facts_in_base: 775
facts_in_pool: 796
facts_cited: 85
sections: product.sections.json
details: [product.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: product.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : product, produit, products
- Routes : `users/user-1/products`, `users/user-1/products/p2`
- Entités : ProductEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Produit archivé | Produit dont archived est vrai, masqué de toutes les lectures générées par Hibernate. | [#c4ef1fa41bcce10a-1] [#20889a4396f284ce-1] |
| Version | Compteur de verrouillage optimiste d'un produit, géré par Hibernate. | [#77a5ca7747268216-1] |
| Événements du produit | Collection en cascade complète avec suppression des orphelins, donc retirer un événement de la liste le supprime. | [#03a123b1e509bf2d-1] |
| Échéance proche | Indicateur du tableau de bord dont le nombre de jours vient de DUE_SOON_DAYS. | [#f00826c49847a41c-1] |
| Couvertures en cours | Indicateur ongoing du bandeau de KPI, rendu avec la classe NUM. | [#5615d8441cb2ba4d-1] |
| Compteur de l'agenda compact | Somme des événements d'aujourd'hui et de demain. | [#3d154a26584ec7b3-1] |
| emptyToday | Message du sous-groupe aujourd'hui vide, distinct de emptyTitle. | [#6dee68787eace008-1] |
| Sous-frise vide | Message archivedEmpty pour le filtre archived, timelineEmpty pour les autres filtres. | [#d5976a5db5d7bc24-1] |

## 3. Règles {#rules}

### Création d'un produit
- Une catégorie d'un autre utilisateur lève CategoryNotFoundException, comme une catégorie absente, et une catégorie sans propriétaire est acceptée. [#5905874ac78b836f-1] [#5905874ac78b836f-2]
- Le nom compte de 1 à 100 caractères, la catégorie et le userId sont obligatoires, la couleur est nulle ou au format #RRGGBB. [#757eb13f1c44ca86-1] [#757eb13f1c44ca86-2] [#f1ff1bcbd432dc1a-1] [#c458a8f11ad15bc3-1] [#b147dbf13fec084b-1]
### Mise à jour d'un produit
- clearColor à true remet la couleur à null et prime sur color, une couleur nulle laisse la couleur inchangée. [#1f81adc7889b6ff7-3]
### Archivage et restauration
- La restauration est un UPDATE natif limité aux lignes archivées du bon utilisateur, et zéro ligne modifiée lève ProductNotFoundException. [#b94a2c6577ba3262-1] [#1633108a3ab71d25-1]
- Un 404 à la restauration invalide la liste des archivés et le dialog affiche notFound. [#0b854fb2b8cfa30b-1] [#c8e4aec3f2c5b021-1]
- Un produit archivé depuis la fiche reste affiché, archivé ailleurs il s'affiche comme introuvable. [#dfec45b7a2f51dde-1]
### Affichage et indicateurs
- Un événement compte dans dueSoon si sa prochaine occurrence est à 14 jours civils au plus, bornes incluses. [#84685175fe11186a-2]
### Vérifié dans le code
- La priorité de clearColor sur color est garantie par l'ordre des tests dans ProductServiceImpl.updateProduct, pas par ProductUpdateRequest [#1f81adc7889b6ff7-3] [#01e0685abee3c880-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:140-144`.
- ProductServiceImpl.createProduct tolère ProductCreationRequest.events null (traité comme liste vide), pas de NPE à la création ; le commentaire Zod de productCreateSchema est périmé [#14ee1b6e889854a1-2] [#787ddafee8cb5825-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:66-69`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductServiceImpl.archiveById | archiveById pose archived à true puis sauvegarde le produit, sans suppression physique. (partiel) | L172-179 | [#7e4b226aac0bc03f-1] |
| ProductServiceImpl.restoreProduct | restoreProduct appelle restoreArchivedByIdAndUserId et lève ProductNotFoundException si aucune ligne n'est modifiée. (partiel) | L193-200 | [#1633108a3ab71d25-1] |
#### frontend:components/products/ProductDetailView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductDetailView.handleFilterChange | Le filtre de vue des événements passe à la valeur reçue du Tabs seulement si elle appartient à active, archived ou all. (partiel) | L197-199 | [#11878e1e275cf8b4-1] |
| ProductDetailView.handleUnarchive | Le désarchivage d'un événement envoie archived à false avec la version détenue au chargement, pour une mutation setEventArchived. (partiel) | L209-217 | [#1803077d1990399c-1] |
#### frontend:components/products/ProductDetailView.test.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| product-detail-filter-archived | Un clic sur l'onglet archivés fait passer la vue de actifs à archivés, ce qui remonte l'event archivé dans l'historique et dans la frise. (partiel) | L545 | [#c3477f2325381af4-1] |
#### frontend:components/products/ArchivedProductsView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ArchivedProductsView.openRestore | Le clic sur Désarchiver enregistre le produit cible puis passe dialogOpen à true, ce qui ouvre RestoreProductDialog. (partiel) | L49-52 | [#baa9657adf1d681a-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductRepositoryJpaImpl.restoreArchivedByIdAndUserId | Passe un produit de archived = true à archived = false par UPDATE natif, incrémente version et met à jour updated_at, uniquement si id et user_id correspondent et que la ligne est archivée, et renvoie le nombre de lignes modifiées. | L250-259 | [#b94a2c6577ba3262-1] |
#### frontend:components/products/ProductsListView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductsListView.handleArchiveConfirm | Après une archivation réussie, le toast de succès s'affiche puis archiveProduct est remis à null, ce qui ferme le dialog. (partiel) | L216-218 | [#c42b48402f361c45-1] |
#### frontend:components/products/RestoreProductDialog.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RestoreProductDialog.handleConfirm | Lors de la confirmation, le dialog passe en attente, puis se ferme seulement si onConfirm réussit, et affiche une erreur inline en cas de rejet. (partiel) | L77-88 | [#a1317be176e233de-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController.createProduct | POST crée un produit à partir de ProductCreationRequest et renvoie 201 avec ProductResponse. | L50-66 | [#08ca27937943ea62-1] |
| ProductController.getProducts | GET renvoie la liste des produits de l'utilisateur sous forme de ProductResponse. | L68-85 | [#38b72c1d6851ad52-1] |
| ProductController.getArchivedProducts | GET renvoie les produits archivés de l'utilisateur sous forme de ArchivedProductResponse. | L92-106 | [#2ba17dfa95093054-1] |
| ProductController.restoreProduct | POST restore appelle restoreProduct du service et renvoie 204 sans lecture préalable du produit. | L118-132 | [#214af15c4a16cfc3-1] |
| ProductController.getProductById | GET renvoie le produit en ProductResponse, 404 si absent et 403 si le produit n'appartient pas à l'utilisateur. | L134-154 | [#a692ab10977b0f60-1] |
| ProductController.updateProduct | PATCH applique ProductUpdateRequest au produit et renvoie ProductResponse, 404 si le produit est absent. | L156-181 | [#b8e07eeec1904e4d-1] |
| ProductController.deleteProduct | DELETE appelle archiveById du service et renvoie 204, soit un archivage logique. | L183-206 | [#895ce336064b5985-1] |
| ProductController.getEventsByProductId | GET renvoie les événements du produit sous forme de EventResponse. | L208-235 | [#eb30330df63ce2cd-1] |
#### frontend:services/productService.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| createProduct | createProduct envoie POST /users/{userId}/products avec le corps enrichi du userId du paramètre. | L32-39 | [#b11cebb63b3990b9-1] |
| updateProduct | updateProduct envoie PATCH /users/{userId}/products/{productId} avec le diff partiel du produit. | L62 | [#6205d255b85075c0-1] |
| deleteProduct | deleteProduct appelle DELETE /users/{userId}/products/{productId} et propage l'erreur après log assaini. | L91-102 | [#8b1d5e6eb2a667bd-1] |
| getArchivedProducts | getArchivedProducts appelle GET /users/{userId}/products/archived. | L110 | [#dc5c91c6d819800b-1] |
| restoreProduct | restoreProduct appelle POST /users/{userId}/products/{productId}/restore sans corps. | L124-126 | [#eab4a87871296c47-1] |
#### frontend:components/products/ProductDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductDrawer | Le composant ProductDrawer est un Dialog en mode create par défaut, et passe en édition quand mode vaut edit et qu'un product est fourni. | L111-119 | [#85efe7359429e40c-1] |
| ProductDrawer.noCategory | Quand noCategory est vrai, la combobox catégorie est remplacée par un paragraphe role note qui affiche le message fields.noCategory. | L336-363 | [#bd8df6d1a4133787-1] |
| ProductDrawer.Select | La combobox catégorie est désactivée pendant le chargement des catégories ou pendant la soumission. | L341-345 | [#dca28831497af0a1-1] |
| ProductDrawer.PaletteColorPicker | Le sélecteur de couleur reçoit colorOverride comme value, donc aucune pastille n'est cochée tant que le produit hérite de la catégorie. | L376-380 | [#f1985c00d84b596a-1] |
| ProductDrawer.resetColor | Le bouton de reset couleur n'apparaît que lorsqu'une surcharge est posée, et remet colorOverride à null. | L387-397 | [#c0eb8faa172018ad-1] |
| ProductDrawer.firstEventDate | Le champ date du premier événement n'est rendu qu'en création, pas en édition. | L402-419 | [#b49b745617cb6ae8-1] |
| ProductDrawer.ProductSparkline | L'aperçu live affiche une ProductSparkline avec la couleur effective et les dates de l'événement saisi et des événements du produit. | L421-443 | [#64a4dd0b3fded846-1] |
| ProductDrawer.archive | En édition, un bouton d'archivage est affiché, désactivé pendant la soumission, et il ouvre la confirmation de suppression en réglant deleteOpen à true. | L453-464 | [#9644dd89f4de0c70-1] |
| ProductDrawer.DeleteConfirmDialog | En édition, DeleteConfirmDialog de variante product est rendu avec handleDeleteConfirm comme onConfirm. | L497-504 | [#9f8cef99d5cb6ead-1] |

## 5. Endpoints et écrans {#surface}

- Chaque route compare le userId du chemin à l'appelant, 401 sans utilisateur courant et 403 si les ids diffèrent [#c53e8add0d832071-1].
- La lecture d'un produit ajoute un second contrôle sur le propriétaire du produit (403), et 404 si le produit est absent [#a692ab10977b0f60-1] [#612b7cd55d571598-1].
- Le DELETE d'un produit n'efface rien, il archive et renvoie 204 [#895ce336064b5985-1].
- Le restore renvoie 204 sans lire le produit avant [#214af15c4a16cfc3-1]. Le repository vérifie appartenance et état archivé dans le même UPDATE et renvoie 0 si le produit est absent ou à un autre utilisateur [#backend-core/f56e4e358ba66393-1].
- La liste des archivés est triée par date de mise à jour décroissante et ne charge pas les événements [#2f24c825d05e665c-1].
- Les hooks de création, mise à jour et désarchivage rejettent la requête sans appeler le service si userId est absent [#ee1884bc9ab6c49c-1] [#e7b7bfe7a61b5a58-1] [#d33a67d4da454f13-1].
- Après archivage, le produit sort du cache de la liste et les clés products.all et categories.all sont invalidées [#7dab0f73d5eb5707-1] [#7dab0f73d5eb5707-2].
- Le drawer produit ne propose la date du premier événement qu'en création, et le bouton d'archivage qu'en édition [#b49b745617cb6ae8-1] [#9644dd89f4de0c70-1].
- Dans le drawer, aucune pastille de couleur n'est cochée tant que le produit hérite de la catégorie, et le bouton de reset n'apparaît que si une surcharge existe [#f1985c00d84b596a-1] [#c0eb8faa172018ad-1].
- Dans la vue des archivés, le toast de restauration n'apparaît que si l'appel réussit, et l'état vide n'a pas de bouton d'action [#1cfd5050ce2a9a8c-1] [#36251c18f79c635f-3].
- Sur la fiche produit, le bouton Nouvel événement dépend de openCreateEvent et Désarchiver ne s'affiche que pour les événements archivés [#f577cf2a8881d306-1] [#777b9c89d4e1f312-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 69), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:components/products/ProductDrawer.tsx` | 36 | business_rule 13, ui_screen 9, other 5 |
| `frontend:components/dashboard/DensityRibbon.tsx` | 33 | business_rule 16, other 8, convention 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` | 20 | business_rule 8, service_method 5, convention 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` | 31 | test_case 18, convention 4, business_rule 3 |
| `frontend:components/products/ProductDetailView.tsx` | 20 | business_rule 6, ui_screen 6, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java` | 17 | endpoint 8, role_check 3, convention 2 |
| `frontend:components/dashboard/kpis.ts` | 15 | business_rule 10, config 1, entity 1 |
| `frontend:types/product.ts` | 16 | convention 7, validation 4, entity 2 |
| `frontend:components/dashboard/CompactAgenda.tsx` | 15 | business_rule 8, i18n_key 3, convention 2 |
| `frontend:components/products/ProductDetailView.test.tsx` | 32 | test_case 23, business_rule 2, convention 2 |
| `frontend:components/dashboard/densityWindow.ts` | 12 | business_rule 10, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` | 22 | test_case 9, convention 4, business_rule 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| frontend-core | 19 | 2 |  |
| integrations | 8 | 9 |  |
| backend-core | 3 | 8 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que la couleur null à la création hérite de la catégorie, que clearColor prime sur color et qu'un PATCH sans couleur la laisse inchangée. [#1ff9190d9f49ffee-1] [#bbfc4f67ad3dc4f3-1] [#ab04586cc2314a7e-1]

## 9. Questions ouvertes {#questions}

- Le ProductDrawer a-t-il un swipe-down en mobile ? Le commentaire dit que non et contredit la javadoc de la ligne 65, sans fait de code qui tranche. [#6c59317b9146e54c-1]

## 10. Alertes {#alerts}

- La méthode save du repository JPA ne retrouve pas un produit archivé (le filtre @SQLRestriction le masque) et bascule en création avec un id déjà existant, donc un save sur un archivé ne le met pas à jour. Ne pas appeler save sur un produit archivé et passer par la requête de restauration. [#ac8911acfe39ec5f-1] [#b94a2c6577ba3262-1]
- La route des événements d'un produit renvoie 404 quand la liste est vide, alors que la création sans événement est autorisée selon la javadoc du test, donc un produit valide sans événement paraît introuvable. Ne pas s'appuyer sur ce 404 et traiter la liste vide comme une réponse normale. [#4593c850244cd3aa-1] [#ff8e130e8e660649-1]
- Malgré son nom, getProductsWithEvents retourne tous les produits de l'utilisateur, avec ou sans événement, ce qui trompe qui filtre sur ce nom. Se fier au code et ne pas supposer de filtre sur les événements. [#df007001f59cff4d-1] [#94c60305c01dfa59-1]
- Dans CompactAgenda, now vaut new Date() par défaut et change à chaque rendu, donc les useMemo qui en dépendent se recalculent toujours si l'appelant ne fournit pas now. Passer un now stable depuis l'appelant. [#1c32bb2f54cef319-1]
- Le port ProductRepository importe et porte @Repository de Spring, et le port ProductService importe des DTO de la couche application, ce qui contredit l'architecture hexagonale. Ne pas reproduire ce schéma dans un nouveau port. [#6f97ab5590d54345-1] [#45102f0968495934-1]
- Plusieurs tests annoncent plus qu'ils ne vérifient, comme le test des événements d'un produit archivé, le test du tri récent d'abord ou le test des singuliers et pluriels. Ne pas les compter comme couverture de ces règles. [#ea7a4b9c5c1b2b40-1] [#c7fc0710c600b8ff-1] [#bf2c6df971ac4250-1]
- Le commentaire de MobileDrawer annonce une fermeture Escape via onEscape alors que le code passe onClose à useFocusTrap, et celui de GreetingHeader décrit une date absente du rendu. Se fier au code. [#025a60152b451b33-1] [#df94e37f5a00ffaa-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 69 ; avec au moins un fait en base : 69 ; sans fait après remise en file : 0.
- Faits en base : 775, repris d'autres packs : +49, hors périmètre : -0, doublons écartés à la déduplication : -28, soit 796 dans le pool.
- Faits du pool venus d'un autre pack : 30 (par pack : section Relations).
- Destination des 796 faits du pool : Lexique 28 ; Règles 147 ; Endpoints et écrans 85 ; Tests attendus 253 ; Alertes / Questions ouvertes 50 ; annexe seule 111 ; écartés (sorte `other` ou inconnue) 122.
- Base : sha256 31487009be6d…, générée le 2026-11-19.
