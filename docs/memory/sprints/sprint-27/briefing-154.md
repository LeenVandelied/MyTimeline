[BRIEFING ISSUE #154]

## Issue
[REFACTO] Extraire un helper resolveCaller dans ProductController (dédup boilerplate JWT)

`ProductController` duplique ~6× le même boilerplate d'extraction d'identité JWT (résolution du
cookie `jwt` → `JwtService` → `UserService` → comparaison d'ownership → 403) dans `createProduct`,
`getProductById`, `getProducts`, `updateProduct`, `deleteProduct`, `getEventsByProductId`.
`CategoryController` a déjà factorisé ce pattern.

### ⚠ MISE À JOUR IMPORTANTE — le helper existe DÉJÀ (livré par #93, commit b95710a)
L'issue #93 (vague 1 de CE sprint, déjà mergée dans `sprint/27`) a créé un helper PARTAGÉ unique :

```java
// infrastructure/security/CallerResolver.java  (@Component)
public Optional<User> currentUser()
```
- PRÉSENT : `User` domaine du principal authentifié (lit `SecurityContextHolder.getAuthentication().getName()`
  = username, peuplé par `JwtFilter` cookie OU Bearer, puis `UserService.findDomainUserByUsername`).
- `Optional.empty()` : aucune auth exploitable OU username inconnu/purgé. Ne lève JAMAIS d'exception.
- L'appelant décide du statut → renvoie **401** sur `empty` (préserve le contrat existant).

**Ta tâche #154 = faire ADOPTER ce `CallerResolver` par ProductController**, PAS recréer un helper
local. Injecte `CallerResolver` (`@Component`, déjà injectable) et remplace les ~6 extractions inline
par `callerResolver.currentUser()`. Supprime :
- les paramètres `@CookieValue`/lecture cookie brut et les appels `jwtService.extractUsername` inline ;
- le bricolage spécifique de `getProducts` qui accepte un header `Authorization` manuel (le
  `CallerResolver` gère déjà cookie ET Bearer de façon uniforme via le SecurityContext).

### CONTRAINTE DE CONTRAT — NE PAS RÉGRESSER
- Le comportement HTTP observable NE CHANGE PAS : là où le code renvoyait 401 sans auth, il renvoie
  toujours 401 (via `currentUser().isEmpty()`) ; l'ownership 403/404 produit reste identique.
- **NE TOUCHE PAS** au bloc `catch (Exception e)` de `getProducts` (~ligne 105) : il est réservé à
  l'issue #92 qui s'exécute juste APRÈS toi (même fichier, séquentiel). Ton diff doit laisser ce bloc
  catch intact pour éviter un conflit / doublon de travail.
- Regarde comment `CategoryController` consomme l'identité (bon exemple de référence) et aligne
  ProductController dessus.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0154:
  fichiers_cles: ["backend/.../infrastructure/adapters/controllers/ProductController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (ProductController résout l'identité via le helper commun de #93)"
  risque_regression: "ProductController est le seul contrôleur SANS resolveCaller (auth inline) -> adopter le CallerResolver de #93 sans changer le contrat 401"
  ordre_ecriture: "infrastructure (après #93, adopter helper)"
  zod_dto_sync: "NON"
  etat_reel_du_code: |
    ProductController gère l'auth inline (pas de resolveCaller). #154 = adopter le CallerResolver
    de #93. Séquentiel après #93. Même fichier que #92 -> #154 puis #92.
```

## Triage
Taille: S
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-hexagonal.md ===== -->
# Context-pack : Architecture hexagonale (MyTimeline)

> Référence maître : `.claude/rules/hexagonal.md`
> À charger pour TOUTE tâche backend touchant `com.matimeline.eventmanager.*`
> Stack RÉELLE : Spring Boot 3.2.2 + Java 21 + Spring Data JPA + Flyway + Spring Security.

## Structure réelle des 3 couches (`backend/src/main/java/com/matimeline/eventmanager/`)

```
domain/                         # PUR Java, ZÉRO framework (hors jakarta.validation)
  models/                       # Product, Category, User, Event... POJO getters/setters écrits À LA MAIN
  ports/services/               # INTERFACES métier : ProductService, CategoryService, EmailService...
  ports/repositories/           # INTERFACES persistance : ProductRepository, CategoryRepository...
  exceptions/                   # CategoryNotFoundException, ProductNotFoundException, CategoryInUseException...
application/                     # orchestration métier
  services/*Impl                # @Service : ProductServiceImpl implements ProductService (port domaine)
  dtos/                         # *Request / *Response (records OU classes Lombok @Getter/@AllArgsConstructor)
  mappers/                      # @Component : ProductMapper, CategoryMapper (entity <-> domain)
infrastructure/                 # TOUT l'adaptateur technique
  adapters/controllers/         # @RestController : ProductController, CategoryController + GlobalExceptionHandler
  adapters/repositories/jpa/    # @Repository : *RepositoryJpaImpl extends SimpleJpaRepository implements <port>
  adapters/email/               # BrevoEmailService implements EmailService (port domaine)
  entities/                     # @Entity JPA : ProductEntity, CategoryEntity (@Version, @SQLRestriction...)
  security/                     # SecurityConfig, JwtService, JwtFilter, RateLimitingFilter
  config/                       # AsyncConfig, ClockConfig, ProfileSafetyGuard
```

⚠ SPÉCIFICITÉ MyTimeline : les PORTS (services ET repositories) sont dans `domain/ports/`, PAS dans
`application/`. Un pack générique qui place les ports dans application/ est FAUX pour ce projet.

## Règle de dépendance (imports interdits par couche)

- `domain/` : AUCUN import Spring / Jakarta Persistence / infrastructure / Lombok sur les models.
  Seul `jakarta.validation` toléré sur les DTOs. Les models sont des POJO (pas de `@Entity`, getters manuels).
  Interdits : `org.springframework.*`, `jakarta.persistence.*`, `com.matimeline.eventmanager.infrastructure.*`.
- `application/` : peut importer `domain/` (models, ports, exceptions) + stéréotypes Spring (`@Service`,
  `@Transactional` de `org.springframework.transaction`, `@Autowired`, `@Component`). NE DOIT PAS importer
  `infrastructure/` (entities, JPA, security).
- `infrastructure/` : peut tout importer. Implémente les ports domaine. Seul endroit avec `@Entity`,
  `EntityManager`, `@RestController`, Spring Security.

## Qui implémente quel port

- Port MÉTIER (`domain/ports/services/*Service`) -> impl dans `application/services/*Impl` (`@Service`).
- Port PERSISTANCE (`domain/ports/repositories/*Repository`) -> impl dans
  `infrastructure/adapters/repositories/jpa/*RepositoryJpaImpl` (`@Repository`, extends `SimpleJpaRepository`).
- Port TECHNIQUE externe (`domain/ports/services/EmailService`) -> impl dans `infrastructure/adapters/email/`.

## Anti-patterns RÉELS observés dans ce code (à ne PAS reproduire / à corriger)

1. **Port domaine qui importe un DTO application** — `ProductService.createProduct(ProductCreationRequest)`
   et `updateProduct(UUID, ProductUpdateRequest)` importent `application.dtos.*` DEPUIS `domain/ports/`.
   Viole la règle de dépendance (domaine -> application). Contre-exemple SAIN : `CategoryService` prend des
   params domaine (`String name, String color, UUID ownerId`). NE PAS étendre le pattern DTO-dans-port.
2. **Controller injectant les `*Impl` au lieu des ports** — `ProductController` déclare
   `UserServiceImpl`, `EventServiceImpl`, `ProductServiceImpl` en champs (couplage à l'impl concrète).
   Le bon exemple est `CategoryController` : il dépend des PORTS `CategoryService`, `UserService`.
   Tout nouveau controller injecte les INTERFACES.
3. **`@Repository` Spring sur un port domaine** — le port `domain/ports/repositories/*` reste une interface
   PURE. L'annotation `@Repository` va sur l'IMPL JPA (`infrastructure`), jamais sur le port.
4. **Entité JPA / domain model renvoyé par un `@RestController`** — toujours mapper vers un `*Response`
   (cf. `CategoryResponse.fromDomain`, `ProductResponse.fromDomain`). Voir cp-backend.md convention 1.

## Checklist avant de valider une tâche backend

- [ ] Nouveau service métier -> interface dans `domain/ports/services/` + impl `@Service` dans `application/services/`.
- [ ] Nouveau repo -> interface dans `domain/ports/repositories/` + impl `@Repository` JPA dans `infrastructure/adapters/repositories/jpa/`.
- [ ] Controller dépend des PORTS (interfaces), pas des `*Impl`.
- [ ] Aucun import `infrastructure.*` dans `application/`, aucun import Spring/JPA dans `domain/`.
- [ ] I/O HTTP = DTOs (`*Request`/`*Response`), jamais l'entité ni le domain model brut.
- [ ] Nouvel `Entity` <-> `domain model` couvert par un mapper `@Component` dans `application/mappers/`.

<!-- ===== cp-backend.md ===== -->
# Context-pack : Backend (MyTimeline — Spring Boot 3 / Java 21)

> Référence maître : `.claude/rules-jit/backend.md`
> À charger pour TOUTE tâche backend. Package racine : `com.matimeline.eventmanager`.

## Stack réelle

Java 21 + Spring Boot 3.2.2 + Spring Web (MVC) + Spring Data JPA (Hibernate) + PostgreSQL 16 +
Flyway 9.22.3 (core, support Postgres inclus) + Spring Security (JWT cookie HttpOnly, jjwt 0.11.5) +
Lombok (DTOs uniquement) + Bucket4j (rate limiting in-memory) + Testcontainers 1.20.6 (tests).
PAS de Quarkus / Panache / CDI. Aucun `io.quarkus.*`, `@ApplicationScoped`, `@QuarkusTest`, `persist()`.

## Conventions MyTimeline (source de vérité projet — issues des reviews S10)

Ces 4 conventions transverses sont revenues comme BUGS en review. Les respecter par défaut. Détail :
`docs/memory/pitfalls.md` (PIT-S10-*) et `docs/memory/patterns.md` (PAT-S10-*).

1. **Jamais de domain model / entité JPA renvoyé par un `@RestController`** — toujours un `*Response` DTO
   (record ou classe Lombok `@Getter`/`@AllArgsConstructor`, méthode `fromDomain(...)`). Réduire la
   catégorie et les sous-objets au strict minimum. NE JAMAIS exposer l'objet `User`/owner ni les champs
   internes (`archived`, `ownerId`, `version`). Ex : `ProductResponse` masque user/archived/color et réduit
   la catégorie à `{id,name}` ; `CategoryResponse` remplace `ownerId` par un booléen dérivé `system`.
   AP récurrent : catégories (#52) ET produits — vu 2×. Réf PAT-S10 / `CategoryResponse`, `ProductResponse`.
2. **Ownership : vérifier la ressource CIBLE, pas seulement la ressource parente ; 404 (pas 403) pour une
   ressource d'autrui** (anti-énumération d'UUID — un 403 confirmerait l'existence de l'id). Ex : à
   l'assignation d'une `categoryId` à un produit, valider `category.ownerId == caller || ownerId == null`,
   sinon `CategoryNotFoundException` -> 404 (cf. `ProductServiceImpl.resolveAssignableCategory`). Résolution
   du caller depuis le cookie JWT : helper `resolveCaller(token)` (cf. `CategoryController`). Réf PIT-S10-005.
3. **`DataIntegrityViolationException` -> 409 mappé au niveau SERVICE, dans un `try/catch` autour du SEUL
   `save()` concerné** — JAMAIS un `@ExceptionHandler(DataIntegrityViolationException)` global : il
   masquerait toute violation FK/contrainte sous un 409 trompeur. Ex : `CategoryServiceImpl.createCategory`
   et `updateCategory` catchent localement -> `CategoryNameConflictException`. Le handler global a été
   SUPPRIMÉ (cf. note dans `GlobalExceptionHandler`). Réf PAT-S10-002 / PIT-S10-002.
4. **Update JPA = charger l'entité gérée (`findById`) + recopier les champs mutables (update-in-place)** —
   ne PAS faire `repository.save(mapper.toEntity(domain))` en UPDATE : les domain models n'ont pas de
   `@Version`, l'entité reconstruite est détachée (version=null) -> `persist()` échoue ("uninitialized
   version") ou `merge()` lève un OptimisticLock. Charger le managed, recopier name/color/etc., laisser
   Hibernate piloter `@Version`/`updated_at`. Cible d'une FK : `entityManager.getReference(...)` (pas une
   entité détachée). Cf. `CategoryRepositoryJpaImpl.save`, `ProductRepositoryJpaImpl.save`. Réf PIT-S10-003.
5. **Soft delete via `@SQLRestriction("archived = false")` sur l'entité** — filtre TOUTES les lectures
   Hibernate (findById/findAll/associations) automatiquement (cf. `ProductEntity`). Pour les opérations
   transverses qui doivent voir les lignes filtrées (réassignation avant delete de catégorie, comptage
   avant purge), utiliser du SQL NATIF bindé pour contourner le `@SQLRestriction` (cf.
   `ProductRepositoryJpaImpl.countByCategoryId` / `updateCategoryForProducts`). Réf PAT-S10-001 / PIT-S10-004.

## Conventions Spring Boot

- Controllers : `@RestController` + `@RequestMapping("/api/...")`, verbes `@GetMapping`/`@PostMapping`/
  `@PatchMapping`/`@DeleteMapping`. Injecter les PORTS (interfaces), pas les `*Impl`.
- Services : `@Service` sur `*Impl` (dans `application/services/`), constructeur `@Autowired`.
- `@Transactional` de `org.springframework.transaction.annotation` ; `@Transactional(readOnly = true)` sur
  les lectures. La réassignation + delete de catégorie doit rester dans UNE transaction atomique.
- Repos JPA : `@Repository` + `extends SimpleJpaRepository<Entity, UUID> implements <PortDomaine>`,
  requêtes JPQL/native via `EntityManager` bindé (`.setParameter`), `.setMaxResults(1)` au lieu d'un `get(0)`.
- DTOs : `application/dtos/` (Lombok `@Getter`/`@AllArgsConstructor` ou records). `@Valid` + Bean Validation
  sur tout `@RequestBody`.
- Erreurs : `GlobalExceptionHandler` (`@RestControllerAdvice`) mappe les exceptions DOMAINE
  (`*NotFoundException` -> 404, `CategoryNameConflictException`/`CategoryInUseException` -> 409...). Corps
  plat `{"error": "..."}` pour les erreurs métier. Les 401/403 de la chaîne Security sont gérés par
  `SecurityConfig` (authenticationEntryPoint / accessDeniedHandler), PAS par le handler — ne pas dupliquer.
- Entités : `@Entity`, `@GeneratedValue(strategy = AUTO)` UUID, `@Version`, audit `@CreatedDate`/
  `@LastModifiedDate` + `@EntityListeners(AuditingEntityListener.class)`, `equals/hashCode` sur l'id.

## Migrations Flyway

- `backend/src/main/resources/db/migration/V{n}__description.sql`. Dernière : `V8__category_ownership.sql`.
  Prochaine = `V{n+1}`. Vérifier : `ls db/migration/V*.sql | sort -V | tail -1`.
- JAMAIS rééditer une migration déjà appliquée (checksum) -> créer `V{n+1}`. Rollback commenté dans le fichier.
- Flyway 9.x : support Postgres DANS `flyway-core`, ne PAS ajouter `flyway-database-postgresql` (Flyway 10+).
- `ddl-auto=validate` (dev, prod, test) : Hibernate ne modifie jamais le schéma, Flyway est la source de
  vérité. Une entité désalignée du schéma -> échec au boot. `baseline-on-migrate=true`.

## Sécurité

- `SecurityConfig` (Spring Security), JWT signé (jjwt) porté par un cookie HttpOnly `jwt`. `JwtService`
  (extractUsername...), `JwtFilter`, `RateLimitingFilter` (Bucket4j, par IP — `trust-forwarded-header=false`).
- Identité dérivée du JWT, JAMAIS d'un param. Ownership vérifié manuellement dans les controllers via
  `resolveCaller(token)` -> compare l'id (403 pour la ressource possédée d'autrui côté catégorie ;
  404 pour la ressource-cible d'autrui, cf. convention 2).
- Secrets via env (`JWT_SECRET`, `DB_PASSWORD`, `BREVO_API_KEY`) — aucun default en profil prod (fail-fast).
  `ProfileSafetyGuard` refuse le boot si profil `dev` actif avec marqueur d'env prod. Aucune concat SQL.

## Null-safety & qualité

- `orElseThrow(() -> new XxxNotFoundException(id))` quand l'entité DOIT exister — jamais `orElse(null)` +
  null-check en aval (NPE caché). `getReference` pour attacher une FK sans charger l'entité.
- Méthodes > 20 lignes -> décomposer ; complexité > 5 -> refactorer ; pas de magic values ; risque N+1 ->
  `fetch join`/`@BatchSize` ; index DB sur colonnes filtrées/triées (cf. `V5__fk_indexes.sql`).

## Tests

- Lancer via le WRAPPER OBLIGATOIRE : `./scripts/test-quiet.sh backend` (ou `backend/./mvnw`). Docker
  REQUIS (Testcontainers). Property `docker.api.version=1.44` dans le pom (pipe `api.version` vers surefire)
  — pièce docker-java : sans elle, "Could not find a valid Docker environment".
- Slices controllers : `@ExtendWith(MockitoExtension.class)` + `MockMvcBuilders.standaloneSetup(...)` +
  mocks Mockito (cf. `CategoryControllerTest`). Services : test unitaire `@ExtendWith(MockitoExtension.class)`.
  ⚠ `standaloneSetup` BYPASSE la chaîne Spring Security → il ne teste que le 403/404 renvoyé par le
  contrôleur lui-même (ownership manuel). Pour tester les **401/403 imposés par Spring Security**
  (auth manquante, rate-limit), utiliser `@SpringBootTest` + `@AutoConfigureMockMvc` (cf.
  `AuthErrorContractIntegrationTest`, `RateLimitingAndHeadersIntegrationTest`) — sinon faux verts.
- Intégration : `@SpringBootTest` + `@Transactional` (rollback) + `extends AbstractPostgresIntegrationTest`
  (singleton container Postgres 16, profil `test`, Flyway rejoue V1..Vn from scratch). PAS de H2.
- Surefire matche `**/*Test.java` (les `*IntegrationTest` inclus). Données de test uniques par test (UUID),
  pas de constantes partagées.

## Référence pour approfondir

`.claude/rules-jit/backend.md` · `docs/memory/pitfalls.md` (PIT-S10-*) · `docs/memory/patterns.md` (PAT-S10-*)

<!-- ===== br-products.md ===== -->
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

> **MàJ Sprint 11 (#61, PR #157)** — anti-patterns front RÉSOLUS : #7 (UUID catégories hardcodés → combobox câblée sur `GET /api/categories` via `useCategories`, `AddProducts.tsx` supprimé au profit de `ProductDrawer.tsx`), #8 (desync Zod `name` → `productCreateSchema.name` aligné `min(1).max(100)` sur `@Size` backend). Désync jumelle corrigée : `eventCreationSchema.name` était resté `min(3)` alors que `EventCreationRequest @Size(min=1,max=100)` → aligné `min(1).max(100)` (cf. [[PIT-S11-003]]).

### Couleur produit persistée ✅ (S12 #158 — ex-limitation S11 #61)
Le produit porte désormais un `color` propre persisté : `ProductCreationRequest.color` (hex `#RRGGBB`, nullable = héritage catégorie), `ProductUpdateRequest.color` + `clearColor` (reset explicite car `color=null` = inchangé en PATCH partiel, cf. [[PAT-S12-002]]), `ProductResponse` expose `color` produit + `category.color` (le front calcule l'effective `product.color ?? product.category.color`). Colonne `products.color` préexistante (V7/#44) → AUCUNE migration S12 (cf. [[DEC-S12-002]]). `ProductEntity.color`/`Product.color` déjà présents (S9/S10). Front `ProductDrawer` : surcharge persistée (plus UI-only), schémas Zod read `.nullable()` / create `.optional()` / update `color + clearColor`.

---

## Référence

- Coverage actuelle : `coverage-products.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` — `domain/ports/services/ProductService.java`, `domain/ports/repositories/ProductRepository.java`, `application/.../ProductServiceImpl.java` (`resolveAssignableCategory`, `updateProduct`, `archiveById`), `infrastructure/.../ProductEntity.java` (`@SQLRestriction`), `infrastructure/.../ProductController.java`, DTOs `ProductCreationRequest` / `ProductUpdateRequest` / `ProductResponse` / `EventResponse` (S10)
- Conventions transverses backend : voir `cp-backend.md` §Conventions MyTimeline (DTO en HTTP, ownership cible + 404, update-in-place JPA, DataIntegrity→409 scopé)
- Frontend : `frontend/src/components/products/` — sélecteur de catégorie + schémas Zod `productCreateSchema` / `productSchema` (`eventCreationSchema` réutilisé)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- APRÈS #93 (commit b95710a, déjà sur `sprint/27`) — le helper `CallerResolver` est disponible et injectable.
- AVANT #92 (même fichier ProductController.java). Tu dois committer AVANT que #92 démarre. Laisse le
  bloc `catch(Exception)` de `getProducts` (~ligne 105) INTACT pour #92.

## Designer
Non applicable (backend pur).

## Contraintes
- Branche cible : `sprint/27` (déjà checkout).
- ⚠ **GARDE-FOU WORKTREE (obligatoire — 2 agents de ce sprint se sont trompés de repo)** :
  Répertoire de travail EXCLUSIF = `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/magical-hypatia-0e9903`.
  Un `cd backend` ou un chemin absolu `/Users/herrh/VSProjects/MyTimeline/backend/...` cible le REPO
  PRINCIPAL (branche dev), PAS ce worktree → tes edits seraient invisibles et perdus.
  AVANT toute écriture ET tout commit : `cd` explicite vers le worktree ci-dessus, puis vérifie
  `git rev-parse --show-toplevel` == le worktree ET `git branch --show-current` == `sprint/27`.
  Préfixe TOUS tes chemins de fichiers par ce répertoire worktree.
- Commit : 1 commit logique, gitmoji français (ex: `:recycle: #154 ...`).
- Architecture hexagonale : injecter le PORT / le `@Component` `CallerResolver` (pas de nouvelle
  extraction JWT inline). ProductController injecte déjà des `*Impl` concrets (dette A8/A2 hexagonal
  connue) — reste dans l'esprit du refactoring mais ne pars pas dans un chantier DIP hors scope.
- Tests OBLIGATOIRES inline via `./scripts/test-quiet.sh backend` (ou `backend/./mvnw test`) :
  les tests d'ownership produit existants doivent rester verts (comportement inchangé).
- Ne PAS toucher : autres contrôleurs (#93 fait), migration V12 (#122 fait), bloc `catch(Exception)`
  de `getProducts` (#92).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées (BR-PRO-004 ownership produit...) + méthodes rebranchées + tests passés/total>
- diff ProductController: <combien d'extractions inline supprimées ; catch(Exception) getProducts laissé intact OUI/NON>
- [MEMORY:*] signaux: <si applicable>
- recommandations suite: <RECOMMAND_* / pitfall / ou "RAS">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
