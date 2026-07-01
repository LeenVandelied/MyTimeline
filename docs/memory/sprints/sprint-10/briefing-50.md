[BRIEFING ISSUE #50]

## Issue
[FEATURE] Backend : Product PATCH + suppression logique (archive)

### Contexte
Actuellement, un produit ne peut être ni modifié ni supprimé de manière réversible. La seule suppression disponible est physique (`deleteById`), contraire à la convention du projet qui impose un soft delete. Aucun endpoint `PATCH` n'existe pour modifier le nom ou la catégorie d'un produit existant.

### À faire
- Implémenter `PATCH /users/{userId}/products/{productId}` : mise à jour partielle du nom et/ou de la catégorie (DTO `ProductUpdateRequest` + `@Valid` + BR-PRO-001).
- Le champ `archived` (booléen, défaut `false`) sur `ProductEntity` a été ajouté par le #44 (migration V7, sprint 9 déjà mergé). VÉRIFIER sa présence avant de créer une colonne — ne PAS dupliquer. Si absent, l'ajouter via migration V8.
- Soft delete : `DELETE /users/{userId}/products/{productId}` positionne `archived = true` (plus de suppression physique), retourne **204**.
- Filtre automatique des produits archivés dans TOUTES les requêtes de listing (`@SQLRestriction("archived = false")` sur `ProductEntity`). Vérifier aussi les join-fetch côté events.
- Ownership (`{userId}` == sujet JWT) sur PATCH et DELETE, via le `GlobalExceptionHandler`/ControllerAdvice existant (#30).
- Corriger le code HTTP du DELETE existant (200 → 204).

### BR impactées
- BR-PRO-001 — Nom de produit obligatoire et borné (validation sur PATCH).
- BR-PRO-004 — Le userId du path fait autorité (ownership check).
- BR-PRO-007 — Suppression conditionnée à l'existence (soft delete).

### Critères d'acceptation
- [ ] `PATCH` met à jour nom et/ou catégorie et retourne 200 avec le produit à jour.
- [ ] `PATCH` retourne 400 si nom vide ou > 100 caractères (BR-PRO-001).
- [ ] `PATCH` retourne 404 si le produit n'existe pas ou n'appartient pas à l'utilisateur.
- [ ] `DELETE` positionne `archived = true` et retourne 204 (plus de delete physique).
- [ ] Les produits archivés n'apparaissent plus dans `GET /users/{userId}/products` NI dans les autres listings (events, etc.).
- [ ] Ownership check sur PATCH et DELETE (403 si mismatch).

### Fichiers réels (package com.matimeline.eventmanager)
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java` (8.2K existant)
- `backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` (4.4K)
- `backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ProductService.java`
- `backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` (⚠ FICHIER PARTAGÉ avec #52 — tu es la Vague 1, tu passes en premier)
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` (ajouter `@SQLRestriction("archived = false")` — vérifier que `archived` existe déjà via V7)
- Nouveau : `application/dtos/ProductUpdateRequest.java` (`@Size(max=100)` name nullable pour patch partiel, `UUID categoryId`)
- Migration `backend/src/main/resources/db/migration/V8__*.sql` UNIQUEMENT si `archived` absent après V7 (sinon pas de migration côté #50). La plage V8 t'est réservée.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0050:
  fichiers_cles:
    - "infrastructure/adapters/controllers/ProductController.java"
    - "application/services/ProductServiceImpl.java"
    - "domain/ports/services/ProductService.java"
    - "application/dtos/ProductUpdateRequest.java  # nouveau"
    - "infrastructure/entities/ProductEntity.java  # @SQLRestriction('archived = false')"
    - "db/migration/V8__product_archived_filter.sql  # SEULEMENT si residuel apres V7"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (PATCH 200/400/404/403, DELETE->204 soft, archived invisible partout) + unit service"
  risque_regression: "@SQLRestriction oublie sur une query nommee ou le join-fetch events -> produits archives fuient dans les listings."
  ordre_ecriture: "domain (port) -> application (impl) -> infra (controller + entity SQLRestriction) -> migration si besoin"
  zod_dto_sync: "NON (frontend produit livre en S11)"
```

## Triage
Taille: M
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-hexagonal.md ===== -->
# Context-pack : Architecture hexagonale

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules/hexagonal.md`
> A charger pour TOUTE tache backend touchant `{{JAVA_PACKAGE}}.*`

## Structure obligatoire

```
{{JAVA_PACKAGE}}/
├── domain/            # Couche metier pure (Java pur, 0 framework)
├── application/       # Ports (interfaces) et use cases
└── infrastructure/    # Adapters techniques (JPA, REST, Quarkus)
```

## Imports interdits — AUDIT AUTOMATIQUE par hook `check-hexagonal.sh`

### `domain/` NE DOIT JAMAIS importer :
- `jakarta.*` (sauf annotations validation : `@NotNull`, `@Valid`, `@Size`)
- `io.quarkus.*`
- `javax.*`
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `{{JAVA_PACKAGE}}.application.*` (sauf interfaces de ports)

### `application/` NE DOIT JAMAIS importer :
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `io.quarkus.*` (sauf annotations CDI basiques : `@ApplicationScoped`, `@Inject`)

### `infrastructure/` peut importer tout :
- `{{JAVA_PACKAGE}}.domain.*`
- `{{JAVA_PACKAGE}}.application.*`
- Tous les frameworks necessaires

## DEC-009 — Ports obligatoires

- `application/` ne touche JAMAIS `infrastructure/` directement
- Les ports (interfaces) sont definis dans `application/`
- Les implementations (adapters) sont dans `infrastructure/`

## Anti-patterns a proscrire

- Entite JPA dans `domain/` → deplacer vers `infrastructure/persistence/`
- `@Path`, `@GET`, `@POST` dans `domain/` ou `application/`
- `l'ORMRepository` dans `application/` → port + adapter infra
- Static method call vers `application` depuis `domain`

## Checklist implementation

- [ ] La logique metier est dans `domain/` (pure)
- [ ] Les use cases sont dans `application/` via ports
- [ ] Les adapters (REST, JPA, HTTP client) sont dans `infrastructure/`
- [ ] Le hook `check-hexagonal.sh` passe sans erreur

## Reference pour approfondir

`.claude/rules/hexagonal.md` (rule versionnee)
`docs/memory/decisions.md#DEC-009`

<!-- ===== cp-backend.md ===== -->
# Context-pack : Backend le langage backend / Quarkus

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/backend.md`
> A charger pour TOUTE tache backend

## Stack

le langage backend + le framework backend + l'ORM + l'outil de migration + le provider d'identité + la base de données

## Conventions le langage backend

- **Records** pour DTOs (request/response immuables)
- **Sealed Classes** pour etats metier
- **Pattern Matching**, Streams
- **Validation** : `@Valid` + Bean Validation sur tous les `@RequestBody`
- **Reponses** : `Response.ok(dto).build()` ou `Response.created(uri).build()`
- **Erreurs** : le format d'erreur
- **Logging** : le logger injecte — jamais `System.out`
- **Config** : `@ConfigProperty` pour valeurs externalisees
- **JPA constructeurs** : `public Entity() {}` (pas protected)

## Regles transversales entites

- **Soft delete** (règle métier suppression) : champ `deleted_at` obligatoire, JAMAIS de DELETE physique
- **UUID v7** (règle métier clés primaires) sur toutes les cles primaires
- **Ownership** (règle métier ownership) : verifier l'identifiant propriétaire sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via `isAdmin`

## Securite

- `@RolesAllowed` sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- `l'identité de sécurité` (pas `JsonWebToken`) avec le provider d'identite

## Migrations l'outil de migration

- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- JAMAIS modifier une migration deja appliquee
- Derniere migration : `ls {{MIGRATIONS_DIR}}/V*.sql | sort -V | tail -1` (hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM

- `persist()` = INSERT only. Pour upsert → `getEntityManager().merge()`
- `TranslationRepository` implemente directement par `l'ORMRepository`

## Null safety

- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests `@QuarkusTest`

- **`@TestTransaction`** (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants. **PIT recurrent**.
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code

- Methodes > 20 lignes → decomposer
- Complexite cyclomatique > 5 → refactorer
- Pas de magic numbers/strings
- Nommage explicite
- **Risque N+1** : `fetch join` ou `@BatchSize`
- Toute liste paginee
- Index DB prevus pour colonnes filtrees/triees

## Pitfalls backend frequents

- `@Transactional` dans tests → pollue tests suivants. Toujours `@TestTransaction`.
- `orElse(null)` + null check downstream → NPE cache. `orElseThrow()`.
- `persist()` pour update → INSERT duplique. `getEntityManager().merge()`.
- Concatenation SQL → injection. Query params obligatoires.
- Migration modifiee apres deploiement → cluster inconsistant. Creer V{n+1}.

## Reference pour approfondir

`.claude/rules-jit/backend.md` (rule versionnee)
`docs/memory/pitfalls.md` (filtre par PIT-XX backend)

<!-- ===== br-products.md ===== -->
# Context-pack domaine : `products`

> Domaine : `products` — gestion des produits possédés par un utilisateur, chacun rattaché à une catégorie et agrégeant une liste d'événements (création groupée produit + événements).
> Acteurs principaux : Utilisateur authentifié (self-service uniquement, JWT cookie). Système (résolution Category/User, calcul des dates d'événements). Aucun rôle Admin n'existe dans le code.

---

## 1. Lifecycles (machines à états)

**Product** — CRUD simple, pas de lifecycle d'état métier (aucun champ `status`/`active`/`ARCHIVED` sur `ProductEntity`).

| Etat | Description | Transitions sortantes |
| --- | --- | --- |
| (Created) | Produit créé via `POST`, événements créés en cascade | -> (Deleted) via `DELETE` |
| (Deleted) | Suppression PHYSIQUE (`existsById` puis delete) | aucune |

⚠️ Suppression PHYSIQUE observée (`deleteById` après `existsById`) — **pas de soft delete**, contraire à la convention projet. Aucun champ `deletedAt`/`active` sur `ProductEntity`.

**Event** (entité agrégée) — pas de lifecycle propre côté `products` ; cycle de vie piloté par le produit (`cascade=ALL`, `orphanRemoval=true`).

---

## 2. Actions x Acteurs

| Action | user (authentifié) | admin | system | Notes |
| --- | --- | --- | --- | --- |
| `POST` créer produit + events | ✅ self uniquement | ❌ inexistant | ⚠️ résout Category & User, calcule end dates | userId du body ignoré, écrasé par path `{userId}` |
| `GET` lister produits (avec events) | ✅ self uniquement | ❌ | ⚠️ full table scan + filtre in-memory | accepte cookie JWT **OU** header Bearer (incohérent) |
| `GET` produit par id | ✅ self uniquement | ❌ | — | 404 si absent |
| `DELETE` produit | ✅ self uniquement | ❌ | — | retourne 200 (devrait être 204) |
| `GET` events d'un produit | ✅ self uniquement | ❌ | — | ⚠️ 404 si liste vide (sémantique erronée) |

⚠️ Contrôle d'ownership fait **manuellement** dans le controller (extraction username depuis JWT cookie -> load User -> compare `user.getId()` au path `{userId}`), sans `@PreAuthorize` ni Spring Security method security.

---

## 3. Business Rules atomiques

### BR-PRO-001 — Nom de produit obligatoire et borné
**Règle** : un utilisateur MUST fournir un `name` non vide, longueur 1..100, à la création d'un produit.
**Pourquoi** : intégrité des données, un produit anonyme n'a pas de sens métier.
**Implémentation** : `ProductCreationRequest.name` — `@NotBlank` + `@Size(min=1, max=100)`. Front : `productCreateSchema.name = z.string().min(3)`.
**Test attendu** : `ProductControllerTest#createProduct_rejectsBlankName`, `#createProduct_rejectsNameOver100`.
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

### BR-PRO-007 — Suppression conditionnée à l'existence
**Règle** : `DELETE` MUST vérifier l'existence (`existsById`) avant suppression ; lève `ProductNotFoundException` sinon.
**Pourquoi** : retour d'erreur explicite plutôt que delete silencieux.
**Implémentation** : `ProductServiceImpl.deleteById`.
**Test attendu** : `ProductServiceImplTest#deleteById_throwsWhenMissing`.
**⚠️ Soft delete NON IMPLÉMENTÉ** : suppression physique alors que la convention impose le soft delete. **⚠️ Code HTTP** : retourne 200 au lieu de 204.

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

1. **Fuite du modèle de domaine** : `ResponseEntity<Product>`, `ResponseEntity<List<Product>>`, `ResponseEntity<List<Event>>` renvoyés directement — aucun DTO de réponse, expose la structure interne y compris l'objet `User`. -> introduire des response DTO.
2. **Dépendance hexagonale inversée** : `ProductService` (port domaine) importe `ProductCreationRequest` (DTO application).
3. **Annotation infra dans le domaine** : `ProductRepository` (port domaine) annoté `@Repository` (Spring).
4. **Couplage aux implémentations** : `ProductController` injecte `ProductServiceImpl`, `EventServiceImpl`, `UserServiceImpl` au lieu des interfaces de port.
5. **Full table scan** : `getProductsWithEvents` charge toute la table puis filtre par `userId` en Java (cf. BR-PRO-006).
6. **NPE non gardé** : `createProduct` appelle `request.getEvents().forEach()` sans null check (cf. BR-PRO-005).
7. **UUID hard-codés au front** : le sélecteur de catégorie embarque des UUID en dur (`7446a49c...`, `dbc134fb...`) — casse à tout changement DB. -> charger les catégories via API.
8. **Desync Zod/DTO** : `name` Zod `min(3)` vs backend `@Size(min=1)` (cf. BR-PRO-001).
9. **Codes HTTP incorrects** : `DELETE` renvoie 200 au lieu de 204 ; events vides renvoient 404 (cf. BR-PRO-008).
10. **Annotation Jackson sur entité de persistance** : `@JsonManagedReference` sur `ProductEntity.events` — concern présentation sur entité infra.
11. **`@Valid` manquant** : pas de `@Valid` visible sur le `@RequestBody` de `ProductController` — la Bean Validation de `ProductCreationRequest` peut ne pas être déclenchée.
12. **Authentification incohérente** : `getProducts` accepte cookie JWT **ou** header Bearer ; les autres endpoints sont cookie-only.
13. **Autorisation manuelle** : extraction/validation JWT et comparaison d'ownership codées à la main dans le controller, sans `@PreAuthorize`.

---

## Référence

- Coverage actuelle : `coverage-products.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` — `domain/ports/services/ProductService.java`, `domain/ports/repositories/ProductRepository.java`, `application/.../ProductServiceImpl.java`, `infrastructure/.../ProductEntity.java`, `infrastructure/.../ProductController.java`, DTO `ProductCreationRequest`
- Frontend : `frontend/src/components/products/` — sélecteur de catégorie + schémas Zod `productCreateSchema` / `productSchema` (`eventCreationSchema` réutilisé)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- Tu es la **Vague 1**. L'issue #52 (Vague 2) éditera `ProductRepository.java` APRÈS toi (ajout `findByCategoryId` + réassignation). Fais tes modifs sur `ProductRepository.java` proprement (ajout de méthodes de listing filtrées si besoin) — pas de refactor cosmétique qui compliquerait le merge de #52.
- Migration : la plage **V8** t'est réservée (n'utilise JAMAIS V9, réservée à #52).

## Designer
Non applicable (issue backend pure, aucun rendu).

## Contraintes
- Branche cible : `sprint/10` (déjà checkout, ne pas changer de branche).
- Commit : 1 seul commit logique, gitmoji français (ex: `:sparkles: Product PATCH + soft delete archive (#50)`).
- Tests inline OBLIGATOIRES via `./scripts/test-quiet.sh <scope>` (backend). Couvrir : PATCH 200/400/404/403, DELETE→204 soft, archived invisible dans listings produits ET events.
- Si volume tests > 500 OU temps > 3min : signaler `RECOMMAND_TEST_RUNNER` (ne PAS spawner toi-même — profondeur 1).
- Si tu touches une migration `*.sql` : signaler `RECOMMAND_DB_EXPERT`.
- Ne PAS toucher aux fichiers réservés à #52 : `CategoryController.java`, `CategoryServiceImpl.java`, `CategoryService.java`, DTOs Category, `V9__*.sql`.
- Ownership : t'appuyer sur le `GlobalExceptionHandler` existant (`infrastructure/adapters/controllers/GlobalExceptionHandler.java`), ne PAS réinventer.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées (BR-PRO-001/004/007) + fichiers clés + pitfalls + tests passés>
- [MEMORY:*] signaux: <si applicables>
- recommandations suite: <RECOMMAND_DB_EXPERT si migration / RECOMMAND_TEST_RUNNER / RECOMMAND_FOLLOWUP / ou "aucune">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
