# Context-pack domaine : `categories`

> Domaine : `categories` — référentiel de classification des produits (value object `id` + `name`), exposé en CRUD REST sans logique d'état métier.
> Acteurs principaux : `user` (tout utilisateur authentifié ROLE_USER). Aucun `admin` distinct n'existe pour ce domaine.

---

## 1. Lifecycles (machines à états)

### Entité : `Category`

CRUD simple — pas de lifecycle d'état.

`Category` est un value object pur (`id: UUID`, `name: String`, cf. `domain/models/Category.java`). Aucun champ de statut, pas de soft delete : `deleteCategory` appelle `deleteById` (suppression physique, cf. `CategoryServiceImpl:65`). Pas de transition d'état à modéliser.

---

## 2. Actions x Acteurs

| Action | `user` (ROLE_USER) | `admin` | `system` | Notes |
|---|---|---|---|---|
| Créer une catégorie (`POST /api/categories`) | ✅ | n/a | ❌ | Aucun garde admin — fallthrough `.anyRequest().authenticated()` (`SecurityConfig`) |
| Lister les catégories (`GET /api/categories`) | ✅ | n/a | ❌ | `List<CategoryResponse>` scopé caller ∪ système. SEULE route qui porte les compteurs `productCount` / `archivedProductCount` (#695, BR-CAT-008) |
| Lire une catégorie (`GET /api/categories/{id}`) | ✅ | n/a | ❌ | 404 si absente |
| Supprimer une catégorie (`DELETE /api/categories/{id}`) | ✅ | n/a | ❌ | Suppression physique, pas de soft delete |
| Modifier une catégorie (`PUT/PATCH`) | ❌ | ❌ | ❌ | ⚠️ Aucun endpoint exposé — `updateCategory` implémenté mais mort (cf. BR-CAT-006) |
| Utilisateur anonyme | ❌ | ❌ | ❌ | Bloqué par `.anyRequest().authenticated()` |

> Aucune distinction `ROLE_ADMIN` dans `SecurityConfig` pour `/api/categories/**` : tout utilisateur authentifié est l'unique acteur. Colonne `admin` = n/a.

---

## 3. Business Rules atomiques

### BR-CAT-001 — Nom de catégorie obligatoire (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le `name` d'une `Category` MUST NOT être null ou vide à la création.
**Pourquoi** : Une catégorie sans nom est inexploitable côté UI et côté classification produit.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Aucune annotation Bean Validation sur `Category.java` ni `CategoryEntity.java` (`name` sans `@NotBlank`, `@Column(nullable=false)`). La colonne `name` est nullable au niveau JPA. Aucun `@Valid` sur le `@RequestBody` du `CategoryController`.
**Test attendu** : `CategoryControllerTest` — `POST /api/categories` avec `name` vide/null doit renvoyer 400 (après ajout de `@NotBlank` + `@Valid`).

### BR-CAT-002 — Suppression d'une catégorie inexistante rejetée
**Règle** : Supprimer une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Éviter une suppression silencieuse no-op et signaler 404 au client.
**Implémentation** : `CategoryServiceImpl.deleteCategory:62` — `if (!existsById(id)) throw new CategoryNotFoundException(id)`. Le contrôleur double-check également (`CategoryController:48`), voir AP-CAT-04.
**Test attendu** : `CategoryServiceImplTest` — `deleteCategory(unknownId)` lève `CategoryNotFoundException` ; `CategoryControllerTest` — `DELETE /{id}` inconnu renvoie 404.

### BR-CAT-003 — Mise à jour d'une catégorie inexistante rejetée
**Règle** : Mettre à jour une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Empêcher un `save` de créer accidentellement une entité via un upsert sur un id fourni.
**Implémentation** : `CategoryServiceImpl.updateCategory:35` — `if (!existsById(category.getId())) throw`. ⚠️ Règle non atteignable via l'API : aucun endpoint n'expose `updateCategory` (cf. BR-CAT-006).
**Test attendu** : `CategoryServiceImplTest` — `updateCategory(categoryWithUnknownId)` lève `CategoryNotFoundException`.

### BR-CAT-004 — Unicité du nom de catégorie (⚠️ NON IMPLÉMENTÉ)
**Règle** : Deux catégories MUST NOT partager le même `name`.
**Pourquoi** : `findDomainCategoryByName` ne renvoie que le premier résultat ; des doublons rendent la résolution par nom non déterministe.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Pas de `@Column(unique=true)` sur `name` (`CategoryEntity:13`), pas de check d'unicité dans `CategoryServiceImpl.createCategory:28-29` avant `save`. `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` fait `getResultList()` et retourne `results.get(0)` silencieusement si plusieurs lignes partagent le nom.
**Test attendu** : `CategoryServiceImplTest` — créer deux catégories de même nom doit lever une exception métier (après ajout du check + contrainte UNIQUE).

### BR-CAT-005 — Catégorie requise et référençable côté produit
**Règle** : Un `Product` MUST référencer une `Category` existante via un `id` UUID valide ; la FK `category_id` est NOT NULL en base.
**Pourquoi** : `ProductEntity.category` est `@ManyToOne @JoinColumn(name='category_id', nullable=false)` — un produit sans catégorie est invalide au niveau DB.
**Implémentation** : Côté écriture, `productCreateSchema` (`frontend/src/types/product.ts:18`) valide `category: z.string().uuid('La catégorie est requise')` (format UUID uniquement, pas d'existence). Côté lecture, `productSchema` (`product.ts:7-10`) attend `category: { id, name }` sans `.uuid()`. ⚠️ Aucune validation backend que l'UUID correspond à une catégorie réelle au moment de la création produit.
**Test attendu** : test d'intégration produit — créer un produit avec `category` UUID inconnu doit échouer proprement (404/400), pas une violation FK brute.

### BR-CAT-006 — Endpoint de mise à jour absent (⚠️ NON IMPLÉMENTÉ)
**Règle** : La modification d'une catégorie via l'API MUST être possible (`PUT`/`PATCH /api/categories/{id}`).
**Pourquoi** : `CategoryServiceImpl.updateCategory:34-39` est entièrement implémenté mais aucun handler du `CategoryController` ne l'expose — méthode de service morte, mise à jour impossible via API.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ côté contrôleur. `CategoryController` n'a que `POST`, `GET`, `GET/{id}`, `DELETE/{id}`.
**Test attendu** : `CategoryControllerTest` — `PUT /api/categories/{id}` met à jour le `name` et renvoie 200 (après exposition de l'endpoint avec request/response DTO).

### BR-CAT-007 — Chargement dynamique des catégories côté UI (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le formulaire de création produit MUST charger les catégories depuis `GET /api/categories`, pas via des valeurs codées en dur.
**Pourquoi** : `AddProducts.tsx:172-184` contient 4 UUID de catégorie littéraux dans le JSX ; le formulaire casse dès que la base est seedée différemment selon l'environnement.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. `AddProducts.tsx` court-circuite `GET /api/categories`.
**Test attendu** : test de composant `AddProducts` — le select de catégorie est peuplé depuis un fetch mocké de `GET /api/categories`, sans UUID en dur.

### BR-CAT-008 — Compteurs de produits d'une catégorie : source BACKEND, actifs et archivés séparés ✅ (S93 #695)
**Règle** : la carte d'une catégorie MUST afficher un nombre de produits cohérent avec le refus de suppression. `GET /api/categories` porte donc deux compteurs SCOPÉS AU CALLER : `productCount` (produits non archivés) et `archivedProductCount` (produits archivés). « aucun produit » n'est affichable QUE si les deux sont à 0.
**Pourquoi** : un produit archivé occupe toujours sa catégorie (DEC-S89-001, FK `category_id` NOT NULL), mais il est invisible du listing produits (`@SQLRestriction`). Un compteur dérivé côté client de ce listing affichait donc « aucun produit » sur une catégorie que l'API refusait ensuite de supprimer sans réassignation (BUG-S89-001). Deux compteurs et non un total : un total unique ferait croire à des produits présents dans les listes.
**Implémentation** : `ProductRepository.countByCategoryForUser(userId)` → `Map<UUID, CategoryProductCounts>` (record domaine `active`/`archived`), UNE requête native groupée (`count(*) FILTER (WHERE archived = …) … GROUP BY category_id`), jamais un comptage par catégorie (N+1). SQL natif obligatoire : `@SQLRestriction` masquerait les archivés d'un comptage JPQL (PIT-S79-006) ; contrepartie, le natif ne filtre rien seul, `user_id` est lié À LA MAIN. `CategoryServiceImpl.getProductCountsForOwner` → `CategoryController.getAllCategories` zippe via `CategoryResponse.fromDomain(category, counts)`. Front : `categorySchema.productCount/.archivedProductCount` en `.optional()`, `CategoriesView` (badge coloré = actifs, masqué si 0 actif et ≥1 archivé ; mention `categories-archived-count-{id}` = archivés ; clé ICU `products.categories.archivedCount`).
**⚠ SCOPE UTILISATEUR, PAS UNE OPTIMISATION** : les catégories SYSTÈME (owner NULL) sont partagées entre tous les comptes. Sans `WHERE user_id = :caller`, la carte publierait le nombre de produits d'AUTRES utilisateurs — fuite inter-utilisateurs sur une lecture banale.
**⚠ NE PAS CONFONDRE avec `countByCategoryId`** : celui-ci compte TOUS utilisateurs confondus et arme le 409 / protège la FK (AP-CAT-05). Les deux coexistent volontairement ; remplacer l'un par l'autre casse soit l'intégrité FK, soit l'isolation des comptes.
**Compteur ≠ garde** : `linkedProductsCount` (actifs + archivés) arme le select de réassignation D'EMBLÉE, mais le repli `reassignRequiredByServer` sur 409 est CONSERVÉ — une carte peut être périmée, le refus serveur fait foi (PAT-S89-001).
**Test attendu** : `CategoryDeleteReassignIntegrationTest` (séparation actifs/archivés, scope utilisateur sur catégorie système, opposition à `countByCategoryId`) ; `CategoryControllerTest` (compteurs exposés au listing, ABSENTS du POST) ; `CategoriesView.test.tsx` (badge masqué à 0 actif / N archivés) ; `e2e/categories.spec.ts`.

---

## 4. Dépendances inter-domaines

- **`products` dépend de `categories`** : `CategoryEntity -> ProductEntity` en `OneToMany` (côté inverse), `ProductEntity.category` en `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. FK requise en base, mais **aucun cascade** côté `Category` : supprimer une catégorie référencée par des produits provoque une violation de contrainte FK (suppression physique non protégée — voir AP-CAT-05).
- **`categories` dépend de `auth`** : tout accès passe par le fallthrough `.anyRequest().authenticated()` (JWT ROLE_USER). **Depuis Sprint 10 (#52, ADR-002) : ownership PAR UTILISATEUR** — `Category.ownerId` (FK users, NULLABLE) ; `owner NULL` = catégorie « système » (lisible de tous, non modifiable/supprimable → 403). PATCH/DELETE exigent `owner_id == JWT` (403 sinon). Lecture scopée : `GET` liste ne renvoie que `owner == caller ∪ système`, `GET /{id}` d'autrui → 404 (anti-énumération), DTO `CategoryResponse` n'expose PAS l'`ownerId` (booléen `system`).
- **`Category` (domain model)** : value object pur `id` + `name`, sans champ de relation. Le lien vers les produits n'existe qu'au niveau infrastructure (`CategoryEntity`/`ProductEntity`). Les compteurs de #695 ne sont donc PAS des champs de `Category` : ils voyagent à part (`CategoryProductCounts`, record domaine) et sont zippés dans le DTO au niveau du contrôleur.
- **DÉPENDANCE DE LECTURE `categories` → `products` (S93 #695)** : le service catégories interroge désormais `ProductRepository` non seulement pour l'intégrité FK (`countByCategoryId`, `updateCategoryForProducts`) mais aussi pour AFFICHER (`countByCategoryForUser`). Conséquence côté front : toute mutation du cycle de vie d'un produit doit invalider `queryKeys.categories.all` — `useArchiveProduct` (#695) et `useRestoreProduct` (#711) le font. L'oublier laisse une carte qui ment jusqu'au refetch suivant (PIT-S92-004).

---

## 5. Anti-patterns documentés

- **AP-CAT-01 — Injection de l'implémentation concrète** : `CategoryController:8,20` importe et injecte `CategoryServiceImpl` (couche application) au lieu du port `CategoryService` (domaine). Brise la règle hexagonale ; le contrôleur est couplé à l'implémentation.
- **AP-CAT-02 — Double injection du même champ** : `CategoryController:19-25` déclare `@Autowired` sur le champ ET un constructeur `@Autowired` pour `categoryService`. Comportement indéfini, Spring peut injecter deux fois. Garder une seule injection par constructeur.
- **AP-CAT-03 — Domaine exposé en couche HTTP** : `CategoryController:28` désérialise le `@RequestBody` directement vers `Category` (domain model) et `CategoryController:34` retourne `List<Category>` brut. Aucun request/response DTO — le modèle de domaine fuit vers les consommateurs de l'API. Introduire un `CategoryRequest`/`CategoryResponse`.
- **AP-CAT-04 — Double `existsById` (fenêtre de race + double requête)** : `CategoryController:48` vérifie `existsById` puis `CategoryServiceImpl.deleteCategory:62` re-vérifie. Double requête + fenêtre de race entre les deux checks. Laisser la décision 404 au service / `@ExceptionHandler` sur `CategoryNotFoundException`.
- **AP-CAT-05 — Suppression physique sans soft delete ni protection FK** : `deleteCategory` fait un `deleteById` physique (`CategoryServiceImpl:65`). Aucun soft delete, aucune vérification de produits référents — risque de violation FK ou d'orphelins. Contraire à la règle soft-delete du projet.
- **AP-CAT-06 — Champ `name` sans contrainte** : `CategoryEntity:13` n'a ni `@Column(nullable=false)`, ni `@Column(unique=true)`, ni `@NotBlank`. Colonne nullable et dupliquable malgré une sémantique « requis et unique ».
- **AP-CAT-07 — Création sans check de doublon** : `CategoryServiceImpl.createCategory:28-29` `save` sans vérifier l'existence d'un même nom — doublons silencieux (cf. BR-CAT-004).
- **AP-CAT-08 — Résolution par nom non déterministe** : `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` renvoie `results.get(0)` parmi plusieurs lignes possibles, sans contrainte UNIQUE garantissant l'unicité.
- **AP-CAT-09 — ~~Absence de garde admin~~ SUPERSEDÉ (Sprint 10, ADR-002)** : le référentiel global est remplacé par l'ownership par utilisateur (`owner_id == JWT` sur PATCH/DELETE). Voir la dépendance `auth` en §4.

> **MàJ Sprint 10 (#52 + review PR #153)** — anti-patterns RÉSOLUS : AP-CAT-01/02 (port `CategoryService` injecté), AP-CAT-03 (DTOs `CategoryRequest`/`CategoryResponse`), AP-CAT-04 (double `existsById` retiré), AP-CAT-05 (réassignation atomique `?reassignToCategoryId=` + garde self-target), AP-CAT-06/07 (`@NotBlank` + `UNIQUE(owner_id,name)` + check applicatif → 409), AP-CAT-08 (`findByOwnerAndName` + `setMaxResults(1)`). RESTENT ouverts : AP-CAT-10 (partiel), AP-CAT-11 (front, #61/S11).
- **AP-CAT-10 — Code mort** : `CategoryNotFoundException(String name):10` n'est jamais utilisé ; `CategoryServiceImpl.updateCategory` est implémenté mais non exposé par un endpoint (cf. BR-CAT-006).
- **AP-CAT-11 — UUID de catégories codés en dur dans le JSX** : `AddProducts.tsx:172-184` (4 UUID littéraux) court-circuite `GET /api/categories` (cf. BR-CAT-007).

---

## Référence

- Coverage actuelle : `coverage-categories.md`
- #695 : `domain/models/CategoryProductCounts.java` (record), `ProductRepository.countByCategoryForUser`, `ProductRepositoryJpaImpl` (natif groupé), `CategoryService.getProductCountsForOwner`, `CategoryResponse.fromDomain(category, counts)` ; front `CategoriesView.tsx`, `types/category.ts`, `hooks/useArchiveProduct.ts`, `public/locales/*/products.json` (`categories.archivedCount`).
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` (`infrastructure/adapters/controllers/CategoryController.java`, `application/services/CategoryServiceImpl.java`, `infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java`, `infrastructure/entities/CategoryEntity.java`, `domain/models/Category.java`, `domain/exceptions/CategoryNotFoundException.java`)
- Frontend : `frontend/src/types/product.ts` (schémas Zod), `frontend/src/components/.../AddProducts.tsx` (formulaire de création produit)

---

## MàJ Sprint 22 (#62/#68) — UI catégories + sémantique PATCH-clear

- **Front livré** : `CategoryDrawer` (create/edit desktop+mobile, réassignation via `DeleteConfirmDialog variant="category"`), page catégories (`CategoriesView`), hooks `useCreateCategory`/`useUpdateCategory` + `categoryService` (create/update/delete). Color = **String libre** côté Zod (`.max(255).optional()`, PAS de `@Pattern` hex — cf. PAT-S22-001).
- **PATCH clear-via-clé-omise (⚠ contrat implicite, cf. PAT-S22-003)** : `CategoryServiceImpl.updateCategory` fait `existing.setColor(color)` / `setDescription(...)` **INCONDITIONNEL** ; `CategoryUpdateRequest` a des champs `String` simples → une clé JSON absente arrive `null` (Jackson) → le champ est **effacé**. Conséquence : le front DOIT toujours porter `name` + toute valeur à conserver ; omettre `color` = l'effacer (c'est ainsi que le bouton « reset couleur » du drawer fonctionne). **NE PAS** refactorer le DTO en `Optional<String>` ni passer le service en « update-si-non-null » sans casser silencieusement le reset.
- **Suppression catégorie liée** : exige `reassignToCategoryId` (sinon `CategoryInUseException` → 409). Tout appelant de `DeleteConfirmDialog variant="category"` DOIT passer `linkedProductsCount` pour armer le select de réassignation (cf. BUG-S22-002).


## MàJ Sprint 93 (#695) — compteur de carte servi par l'API

- La carte catégorie ne dérive PLUS son compteur de `useProductsWithEvents` : `CategoriesView` ne consomme plus ce hook du tout. Voir BR-CAT-008 pour le contrat complet (deux compteurs, scope caller, natif groupé, non-confusion avec `countByCategoryId`).
- Contrat DTO : `productCount` / `archivedProductCount` sont `Integer` + `@JsonInclude(NON_NULL)` — ABSENTS du JSON sur POST / GET `{id}` / PATCH, qui n'ont pas de quoi les calculer. Un `0` y serait indistinguable d'une catégorie vide et rouvrirait le bug. Côté Zod : `.optional()`, **jamais** `.nullable()`.
