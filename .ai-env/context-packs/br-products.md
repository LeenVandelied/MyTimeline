# Context-pack domaine : `products`

> Domaine : `products` — gestion des produits possédés par un utilisateur, chacun rattaché à une catégorie et agrégeant une liste d'événements (création groupée produit + événements).
> Acteurs principaux : Utilisateur authentifié (self-service uniquement, JWT cookie). Système (résolution Category/User, calcul des dates d'événements). Aucun rôle Admin n'existe dans le code.

---

## 1. Lifecycles (machines à états)

**Product** — soft delete depuis Sprint 10 (#50). Champ `archived` (booléen, défaut `false`, ajouté V7/#44) sur `ProductEntity` + `@SQLRestriction("archived = false")` sur l'entité → les produits archivés sont invisibles de TOUTES les lectures Hibernate (listings produits ET join-fetch events).

| Etat | Description | Transitions sortantes |
| --- | --- | --- |
| (Created) | Produit créé via `POST`, événements créés en cascade | modifiable via `PATCH` ; -> (Archived) via `DELETE` |
| (Archived) | Soft delete : `archived = true`, `DELETE` retourne **204**. Invisible partout via `@SQLRestriction` | définitif pour cette wave (pas d'endpoint de restauration) |

✅ Soft delete implémenté S10 (#50). Historique (avant S10) : suppression PHYSIQUE (`deleteById`) — corrigé.

**Event** (entité agrégée) — pas de lifecycle propre côté `products` ; cycle de vie piloté par le produit (`cascade=ALL`, `orphanRemoval=true`).

---

## 2. Actions x Acteurs

| Action | user (authentifié) | admin | system | Notes |
| --- | --- | --- | --- | --- |
| `POST` créer produit + events | ✅ self uniquement | ❌ inexistant | ⚠️ résout Category & User, calcule end dates | userId body ignoré (écrasé par path). Catégorie cible validée par ownership (S10, cf. BR-PRO-010) |
| `GET` lister produits (avec events) | ✅ self uniquement | ❌ | ⚠️ filtre user in-memory (perf) ; archived filtrés en SQL (`@SQLRestriction`) | accepte cookie JWT **OU** header Bearer (incohérent) |
| `GET` produit par id | ✅ self uniquement | ❌ | — | 404 si absent/archivé |
| `PATCH` produit (S10 #50) | ✅ self uniquement | ❌ | — | maj partielle nom/catégorie. 200/400/404/403. Catégorie cible validée (BR-PRO-010) |
| `DELETE` produit | ✅ self uniquement | ❌ | — | soft delete `archived=true`, retourne **204** (S10 #50) |
| `GET` events d'un produit | ✅ self uniquement | ❌ | — | ⚠️ 404 si liste vide (sémantique erronée) |

⚠️ Contrôle d'ownership fait **manuellement** dans le controller (extraction username depuis JWT cookie -> load User -> compare `user.getId()` au path `{userId}`), sans `@PreAuthorize` ni Spring Security method security.

---

## 3. Business Rules atomiques

### BR-PRO-001 — Nom de produit obligatoire et borné
**Règle** : un utilisateur MUST fournir un `name` non vide, longueur 1..100, à la création d'un produit.
**Pourquoi** : intégrité des données, un produit anonyme n'a pas de sens métier.
**Implémentation** : création = `ProductCreationRequest.name` (`@NotBlank` + `@Size(min=1, max=100)`). Update (S10) = `ProductUpdateRequest.name` nullable pour patch partiel : `@Size(min=1,max=100)` + `@Pattern(".*\\S.*")` (le `@Pattern` skip null mais rejette `" "` blanc — un `@NotBlank` casserait le patch partiel). Front : `productCreateSchema.name = z.string().min(3)`.
**Test attendu** : `ProductControllerTest#createProduct_rejectsBlankName`, `#createProduct_rejectsNameOver100`, `#patchProduct_blankName_returns400`.
**⚠️ DESYNC** : Zod impose `min(3)`, backend impose `min(1)` — noms de 1-2 caractères acceptés backend mais refusés front. Voir `.claude/rules-jit/zod-dto-sync.md`.
**⚠️ Entité non protégée** : `ProductEntity.name` sans `@Column(nullable=false)` ni Bean Validation — un nom NULL peut être persisté si le DTO est contourné.

### BR-PRO-002 — Catégorie obligatoire et existante
**Règle** : un utilisateur MUST fournir un `category` (UUID) correspondant à une catégorie existante.
**Pourquoi** : tout produit appartient à une catégorie (FK `category_id NOT NULL`).
**Implémentation** : `ProductCreationRequest.category` — `@NotNull`. `createProduct` résout la catégorie et lève `CategoryNotFoundException` si absente. Entité : `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. Front : `z.string().uuid()`.
**Test attendu** : `ProductServiceImplTest#createProduct_throwsWhenCategoryMissing`, `ProductControllerTest#createProduct_rejectsNullCategory`.

### BR-PRO-003 — Utilisateur cible obligatoire et existant
**Règle** : la création MUST cibler un User existant ; `createProduct` lève `UserNotFoundException` si absent.
**Pourquoi** : un produit appartient à un utilisateur.
**Implémentation** : `ProductCreationRequest.userId` — `@NotNull` ; `createProduct` résout le User.
**Test attendu** : `ProductServiceImplTest#createProduct_throwsWhenUserMissing`.
**⚠️ Contrainte DB manquante** : `ProductEntity.user` -> `@JoinColumn(name='user_id')` SANS `nullable=false` — `user_id` peut être NULL en base, produit orphelin possible.
**⚠️ Front incomplet** : `productSchema` (lecture) n'expose PAS le champ `user` (seulement `id, name, category, events`).

### BR-PRO-004 — Le userId du path fait autorité (anti-IDOR partiel)
**Règle** : l'`userId` du body MUST être ignoré ; le `{userId}` du path écrase le body et MUST correspondre au subject du JWT.
**Pourquoi** : empêcher un utilisateur de créer un produit pour le compte d'un autre via le body.
**Implémentation** : `ProductController.createProduct` écrase `request.userId` avec le path variable, puis compare `user.getId()` (extrait du cookie JWT) au `{userId}`.
**Test attendu** : `ProductControllerTest#createProduct_ignoresBodyUserId`, `#createProduct_rejectsMismatchedPathUser`.
**⚠️ Sécurité manuelle** : pas de `@PreAuthorize` ni Spring Security ; autorisation dispersée dans le controller, fragile et non centralisée.

### BR-PRO-005 — Liste d'événements à la création (NPE non gardé)
**Règle** : un utilisateur PEUT fournir une liste d'`events` ; chaque event sans date reçoit `LocalDate.now()` comme `startDate`, et `endDate` est calculée via `Utils.calculateEndDate()`.
**Pourquoi** : création groupée produit + événements en une transaction.
**Implémentation** : `ProductServiceImpl.createProduct` itère `request.getEvents().forEach(...)`.
**Test attendu** : `ProductServiceImplTest#createProduct_defaultsEventStartDateToToday`, `#createProduct_handlesNullEventsList`.
**⚠️ NON GARDÉ (bug)** : `getEvents()` peut être `null` (`@NotNull`/`@NotEmpty` absents sur le DTO ; Zod `z.array(...)` sans `.min(1)`). Le `forEach` lève un `NullPointerException` si la liste est nulle. -> ajouter null guard ou `@NotNull` sur le DTO.

### BR-PRO-006 — Listing des produits filtré par utilisateur
**Règle** : `GET /products` MUST ne retourner que les produits de l'utilisateur du path possédant au moins un event.
**Pourquoi** : isolation des données par utilisateur.
**Implémentation** : `ProductServiceImpl.getProductsWithEvents` charge `findAllProducts()` puis filtre en mémoire par `userId` et `hasEvents()`.
**Test attendu** : `ProductServiceImplTest#getProductsWithEvents_filtersByUserAndHasEvents`.
**⚠️ PERF (anti-pattern)** : aucun filtre SQL `WHERE user_id = ?` — scan complet de la table puis filtre Java (O(N)). Ne passe pas à l'échelle. -> requête JPQL/Panache avec filtre DB.

### BR-PRO-007 — Soft delete (archive) conditionné à l'existence ✅ (S10 #50)
**Règle** : `DELETE` MUST vérifier l'existence (`orElseThrow(ProductNotFoundException)`) puis positionner `archived = true` (soft delete, PAS de suppression physique) ; retourne **204**.
**Pourquoi** : réversibilité + convention projet soft-delete ; retour d'erreur explicite si absent.
**Implémentation** : `ProductServiceImpl.archiveById` (ex-`deleteById`) + `@SQLRestriction("archived = false")` sur `ProductEntity` (invisibilité globale). Ownership vérifié en amont (BR-PRO-004).
**Test attendu** : `ProductServiceImplTest`, `ProductControllerOwnershipTest`, `ProductArchivedFilterIntegrationTest` (archived invisible partout).
**⚠️ Pitfall JPA (PIT-S10-003)** : l'update-in-place charge l'entité gérée et recopie les champs (le domaine sans `@Version` casse un `save(mapper.toEntity(domain))` détaché).

### BR-PRO-009 — Mise à jour partielle produit (PATCH) ✅ (S10 #50)
**Règle** : `PATCH /users/{userId}/products/{productId}` met à jour nom et/ou catégorie (partiel). 200 / 400 (nom vide/>100, BR-PRO-001) / 404 (absent ou pas au user) / 403 (ownership path≠JWT).
**Implémentation** : `ProductUpdateRequest` (name/categoryId nullable), `ProductServiceImpl.updateProduct` (update-in-place de l'entité gérée). Ownership path==JWT (BR-PRO-004).
**Test attendu** : `ProductControllerOwnershipTest#patchProduct_*`.

### BR-PRO-010 — Catégorie cible d'un produit : ownership validé (anti cross-tenant) ✅ (S10 #50 review)
**Règle** : à la création ET à l'update d'un produit, la catégorie cible (`categoryId`) n'est assignable QUE si elle appartient à l'appelant (`ownerId == caller`) OU est système (`ownerId == null`). Sinon → `CategoryNotFoundException` (**404**, pas 403 : anti-énumération d'UUID d'autrui).
**Pourquoi** : sans ce check, un user rattache son produit à la catégorie d'un autre (linkage cross-tenant) + oracle 404/200 pour énumérer les catégories d'autrui.
**Implémentation** : helper `ProductServiceImpl.resolveAssignableCategory(categoryId, callerId)` (callerId = `user.getId()` en create, `product.getUser().getId()` en update). Voir [[PIT-S10-005]].
**Test attendu** : `ProductServiceImplTest` (create/update vers catégorie d'autrui → 404 ; système/propre → OK).

### BR-PRO-008 — Sémantique 404 sur collection d'events vide (NON CONFORME)
**Règle attendue** : `GET /products/{productId}/events` DEVRAIT retourner `200` avec une liste (éventuellement vide).
**Implémentation actuelle** : retourne `404` quand la liste d'events est vide — confond "ressource introuvable" et "collection vide".
**Pourquoi** : un produit existant sans event est un état valide, pas une absence de ressource.
**Test attendu** : `ProductControllerTest#getEvents_returns200EmptyListWhenNoEvents` (rouge tant que le bug n'est pas corrigé).
**Statut** : ⚠️ NON CONFORME — à corriger.

---

## 4. Dépendances inter-domaines

- **`products` -> `categories`** : `Product` `@ManyToOne Category`, FK `category_id NOT NULL`. Création échoue (`CategoryNotFoundException`) si la catégorie n'existe pas.
- **`products` -> `users`** : `Product` `@ManyToOne User`, FK `user_id` nullable (⚠️ pas de `nullable=false`). Ownership et autorisation reposent sur `User`.
- **`products` -> `events`** : `Product` `@OneToMany Event` (`cascade=ALL`, `orphanRemoval=true`, `mappedBy='product'`). Le domaine `products` crée/supprime les events en cascade ; leur cycle de vie est piloté par le produit.
- **Couplage hexagonal inversé (anti-pattern)** : `domain/ports/services/ProductService` importe le DTO applicatif `ProductCreationRequest` — le domaine dépend de la couche application (cf. §5).

---

## 5. Anti-patterns documentés

1. ~~**Fuite du modèle de domaine**~~ ✅ RÉSOLU (S10, absorb PR #153) : `ProductController` renvoie désormais `ProductResponse`/`EventResponse` (catégorie réduite à `{id,name}`), l'objet `User`/owner n'est plus exposé.
2. **Dépendance hexagonale inversée** : `ProductService` (port domaine) importe `ProductCreationRequest` (DTO application).
3. **Annotation infra dans le domaine** : `ProductRepository` (port domaine) annoté `@Repository` (Spring).
4. **Couplage aux implémentations** : `ProductController` injecte `ProductServiceImpl`, `EventServiceImpl`, `UserServiceImpl` au lieu des interfaces de port.
5. **Full table scan** : `getProductsWithEvents` charge toute la table puis filtre par `userId` en Java (cf. BR-PRO-006).
6. **NPE non gardé** : `createProduct` appelle `request.getEvents().forEach()` sans null check (cf. BR-PRO-005).
7. **UUID hard-codés au front** : le sélecteur de catégorie embarque des UUID en dur (`7446a49c...`, `dbc134fb...`) — casse à tout changement DB. -> charger les catégories via API.
8. **Desync Zod/DTO** : `name` Zod `min(3)` vs backend `@Size(min=1)` (cf. BR-PRO-001).
9. **Codes HTTP** : ~~`DELETE` renvoie 200~~ ✅ RÉSOLU S10 (204 + soft delete) ; RESTE : events vides renvoient 404 (cf. BR-PRO-008, non traité).
10. **Annotation Jackson sur entité de persistance** : `@JsonManagedReference` sur `ProductEntity.events` — concern présentation sur entité infra.
11. **`@Valid` manquant** : pas de `@Valid` visible sur le `@RequestBody` de `ProductController` — la Bean Validation de `ProductCreationRequest` peut ne pas être déclenchée.
12. **Authentification incohérente** : `getProducts` accepte cookie JWT **ou** header Bearer ; les autres endpoints sont cookie-only.
13. **Autorisation manuelle** : extraction/validation JWT et comparaison d'ownership codées à la main dans le controller, sans `@PreAuthorize`.

---

## Référence

- Coverage actuelle : `coverage-products.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` — `domain/ports/services/ProductService.java`, `domain/ports/repositories/ProductRepository.java`, `application/.../ProductServiceImpl.java` (`resolveAssignableCategory`, `updateProduct`, `archiveById`), `infrastructure/.../ProductEntity.java` (`@SQLRestriction`), `infrastructure/.../ProductController.java`, DTOs `ProductCreationRequest` / `ProductUpdateRequest` / `ProductResponse` / `EventResponse` (S10)
- Conventions transverses backend : voir `cp-backend.md` §Conventions MyTimeline (DTO en HTTP, ownership cible + 404, update-in-place JPA, DataIntegrity→409 scopé)
- Frontend : `frontend/src/components/products/` — sélecteur de catégorie + schémas Zod `productCreateSchema` / `productSchema` (`eventCreationSchema` réutilisé)
