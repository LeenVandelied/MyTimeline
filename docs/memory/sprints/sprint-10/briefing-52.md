[BRIEFING ISSUE #52]

## Issue
[FEATURE] Backend : CRUD catégorie complet + suppression avec réassignation

### Contexte
Le `CategoryController` est très limité : pas d'endpoint de modification (la méthode `updateCategory` du service est morte — BR-CAT-006), pas de DTO, pas de `@Valid`, et la couleur/description ajoutées par le #44 ne sont pas exposées. Supprimer une catégorie utilisée par des produits provoque une violation de contrainte FK sans message métier (AP-CAT-05). Il manque un contrôle d'unicité du nom par utilisateur (BR-CAT-004).

### ⚠ DÉCISION D'ARCHITECTURE TRANCHÉE PAR LE DEV (obligatoire, ADR à écrire)
**Modèle de propriété des catégories = PAR UTILISATEUR (`ownerId`).**
- Ajouter une colonne `owner_id` (UUID, FK users) sur `CategoryEntity` via migration **V8** + backfill des catégories existantes.
- PATCH et DELETE catégorie DOIVENT vérifier l'ownership : `owner_id == subject JWT`, sinon **403**.
- L'unicité du nom (BR-CAT-004) est **par utilisateur** : `UNIQUE(owner_id, name)`, pas globale.
- Backfill migration V9 : les catégories existantes (dont les 4 UUID hardcodés référencés par `AddProducts.tsx`) n'ont pas d'owner. Décider d'une stratégie explicite (ex : rattacher au premier user, ou owner NULL toléré transitoirement = catégories "système" partagées visibles de tous mais non modifiables). **Documenter le choix dans l'ADR** et le commenter dans la migration. NE PAS laisser un comportement implicite.
- Écrire `docs/adr/ADR-xxx-ownership-categorie.md` (ou l'emplacement ADR du projet — vérifier `docs/`) résumant : contexte (4 UUID hardcodés front), décision (ownerId par user), conséquences (casse les UUID hardcodés jusqu'à la Wave 3 front #61, backfill).
- Émettre `[MEMORY:business-rule]` (nouvelle BR-CAT ownership) et `[MEMORY:decision]` (ADR) dans ton retour.

### À faire
- Exposer `PATCH /api/categories/{id}` : mise à jour `name`, `color`, `description` (DTO `CategoryUpdateRequest` + `@Valid`) + check ownership (403).
- Check d'unicité du nom PAR UTILISATEUR avant création et modification (BR-CAT-001, BR-CAT-004) → 409 si doublon.
- `DELETE /api/categories/{id}` avec réassignation atomique : si la catégorie est référencée par des produits, un paramètre `?reassignToCategoryId={uuid}` obligatoire déplace les produits vers une catégorie cible AVANT suppression (une seule `@Transactional`). Vérifier aussi l'ownership sur la catégorie cible.
- 409 Conflict avec message métier lisible (`"La catégorie est utilisée par N produits. Fournissez reassignToCategoryId."`) si suppression tentée sans réassignation.
- Introduire les DTOs `CategoryRequest` / `CategoryResponse` (fin de l'exposition du domain model — AP-CAT-03).
- Supprimer le double `existsById` dans le contrôleur (AP-CAT-04).
- Injecter l'interface `CategoryService` (port) au lieu de `CategoryServiceImpl` (AP-CAT-01/02).

### BR impactées
- BR-CAT-001 — Nom de catégorie obligatoire (non implémenté → corriger).
- BR-CAT-002 — Suppression d'une catégorie inexistante rejetée (404).
- BR-CAT-003 — Mise à jour d'une catégorie inexistante rejetée (404).
- BR-CAT-004 — Unicité du nom PAR UTILISATEUR (nouvelle sémantique ownerId → corriger).
- BR-CAT-006 — Endpoint de mise à jour absent (non implémenté → corriger).
- BR-CAT (nouvelle) — Ownership catégorie : owner_id == JWT subject sur PATCH/DELETE.

### Critères d'acceptation
- [ ] `PATCH /api/categories/{id}` met à jour name/color/description → 200.
- [ ] `PATCH` → 400 si nom vide ; → 409 si nom déjà pris par CET utilisateur ; → 404 si absente ; → 403 si owner ≠ JWT.
- [ ] `DELETE` → 204 si aucun produit ne référence ; → 409 (message explicite) si produits référencent et `reassignToCategoryId` absent.
- [ ] `DELETE` avec `reassignToCategoryId` valide → réassigne tous les produits liés et supprime dans une transaction atomique (tester le rollback).
- [ ] `POST /api/categories` → 400 si name vide (BR-CAT-001) ; → 409 si nom déjà pris par l'utilisateur (BR-CAT-004).
- [ ] DTOs `CategoryRequest`/`CategoryResponse` utilisés (plus de domain model exposé).
- [ ] Ownership 403 sur PATCH/DELETE.

### Fichiers réels (package com.matimeline.eventmanager — STACK SPRING BOOT)
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java` (2.0K, très minimal — inject interface, PATCH, DELETE?reassignToCategoryId, retirer double existsById)
- `backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java` (2.2K — unicité par owner, réassignation transactionnelle, ownership)
- `backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/CategoryService.java`
- `backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/CategoryRepository.java`
- `backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` (⚠ FICHIER PARTAGÉ — #50 Vague 1 l'a déjà édité ; REBASE mental : lis l'état courant avant d'ajouter `findByCategoryId(UUID)` + réassignation `updateCategoryForProducts(fromId,toId)`)
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` (name non-null, owner_id, color, description — champs color/description ajoutés par V7/#44, vérifier)
- Nouveaux DTOs : `application/dtos/CategoryRequest.java`, `CategoryResponse.java`, `CategoryUpdateRequest.java`
- Migration `backend/src/main/resources/db/migration/V8__*.sql` (owner_id + backfill + contrainte UNIQUE(owner_id,name)). ⚠ #50 n'a PAS eu besoin de migration → la dernière migration présente est **V7**, donc TA migration est **V8** (pas V9, pour éviter un trou Flyway). Vérifie avec `ls db/migration/V*.sql | sort -V | tail -1`.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0052:
  fichiers_cles:
    - "infrastructure/adapters/controllers/CategoryController.java  # inject interface, PATCH, DELETE?reassignToCategoryId"
    - "application/services/CategoryServiceImpl.java"
    - "domain/ports/services/CategoryService.java"
    - "application/dtos/CategoryRequest.java, CategoryResponse.java, CategoryUpdateRequest.java  # nouveaux"
    - "domain/ports/repositories/ProductRepository.java  # findByCategoryId + reassignation (APRÈS #50)"
    - "db/migration/V8__category_constraints.sql  # owner_id + backfill + UNIQUE(owner_id,name)"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (PATCH 200/400/409-unicite/404/403, DELETE 204/409-sans-reassign/403, reassignation atomique + rollback) + unit"
  risque_regression: "Reassignation+suppression non atomiques -> produits orphelins ; backfill owner_id des categories existantes (4 UUID hardcodes front)."
  ordre_ecriture: "migration V8 (owner_id) -> DTOs -> port repo (findByCategoryId) -> impl transactionnelle + ownership -> controller"
  zod_dto_sync: "NON (frontend categorie livre en S11)"
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

<!-- ===== br-categories.md ===== -->
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
| Lister les catégories (`GET /api/categories`) | ✅ | n/a | ❌ | Retourne `List<Category>` brut |
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

---

## 4. Dépendances inter-domaines

- **`products` dépend de `categories`** : `CategoryEntity -> ProductEntity` en `OneToMany` (côté inverse), `ProductEntity.category` en `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. FK requise en base, mais **aucun cascade** côté `Category` : supprimer une catégorie référencée par des produits provoque une violation de contrainte FK (suppression physique non protégée — voir AP-CAT-05).
- **`categories` dépend de `auth`** : tout accès passe par le fallthrough `.anyRequest().authenticated()` (JWT ROLE_USER). Pas de notion de propriétaire (`ownerId`) sur `Category` — c'est un référentiel partagé.
- **`Category` (domain model)** : value object pur `id` + `name`, sans champ de relation. Le lien vers les produits n'existe qu'au niveau infrastructure (`CategoryEntity`/`ProductEntity`).

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
- **AP-CAT-09 — Absence de garde admin** : `SecurityConfig` ne liste pas `/api/categories/**` explicitement ; tout ROLE_USER peut créer/supprimer des catégories (référentiel global) via le fallthrough `.anyRequest().authenticated()`.
- **AP-CAT-10 — Code mort** : `CategoryNotFoundException(String name):10` n'est jamais utilisé ; `CategoryServiceImpl.updateCategory` est implémenté mais non exposé par un endpoint (cf. BR-CAT-006).
- **AP-CAT-11 — UUID de catégories codés en dur dans le JSX** : `AddProducts.tsx:172-184` (4 UUID littéraux) court-circuite `GET /api/categories` (cf. BR-CAT-007).

---

## Référence

- Coverage actuelle : `coverage-categories.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` (`infrastructure/adapters/controllers/CategoryController.java`, `application/services/CategoryServiceImpl.java`, `infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java`, `infrastructure/entities/CategoryEntity.java`, `domain/models/Category.java`, `domain/exceptions/CategoryNotFoundException.java`)
- Frontend : `frontend/src/types/product.ts` (schémas Zod), `frontend/src/components/.../AddProducts.tsx` (formulaire de création produit)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- Tu es la **Vague 2**. L'issue #50 (Vague 1) a DÉJÀ été mergée sur `sprint/10` : elle a ajouté le soft delete `archived` + `@SQLRestriction` sur `ProductEntity` et potentiellement des méthodes sur `ProductRepository.java`. **Lis l'état COURANT de `ProductRepository.java` avant d'y ajouter tes méthodes** (`findByCategoryId`, réassignation) — ne réécris pas ce que #50 a posé.
- Migration : **V8** (#50 n'a pas eu besoin de migration, dernière présente = V7). Vérifie : `ls backend/src/main/resources/db/migration/V*.sql | sort -V | tail -1` → doit renvoyer V7, donc tu crées V8.

## Designer
Non applicable (issue backend pure, aucun rendu).

## Contraintes
- Branche cible : `sprint/10` (déjà checkout). Vérifie `git branch --show-current` == `sprint/10` avant de committer.
- Commit : 1 seul commit logique, gitmoji français (ex: `:sparkles: CRUD catégorie + réassignation + ownership (#52)`).
- Tests inline OBLIGATOIRES via `./scripts/test-quiet.sh <scope>` (backend). Couvrir : PATCH 200/400/409/404/403, DELETE 204/409/403, réassignation atomique + **rollback** (réassignation OK mais suppression échoue → produits ne doivent pas rester déplacés OU état cohérent testé).
- Migration V8 = changement de schéma (ajout colonne owner_id + contrainte UNIQUE(owner_id,name) + backfill) → signaler `RECOMMAND_DB_EXPERT` OBLIGATOIRE.
- ⚠ Le pack `br-categories` ci-dessus décrit l'état ACTUEL (« référentiel global partagé, pas d'ownerId » — AP-CAT-09, §4). Cet état est SUPERSEDÉ par la décision d'archi du HEAD : tu AJOUTES `owner_id` + ownership. Le pack sert à comprendre l'existant, pas à figer l'absence d'ownership.
- Ownership + PII (owner_id, JWT) → signaler `RECOMMAND_SECURITY`.
- Si volume tests > 500 OU temps > 3min : signaler `RECOMMAND_TEST_RUNNER`.
- Ne PAS toucher aux fichiers produits de #50 autres que `ProductRepository.java` (auquel tu ajoutes tes méthodes) : ne modifie pas `ProductController.java`, `ProductServiceImpl.java`, `ProductEntity.java`.
- ADR : écrire le fichier ADR ownership catégorie (cf. section décision dans le HEAD).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées (BR-CAT-001/002/003/004/006 + ownership) + fichiers clés + réassignation atomique + tests passés>
- [MEMORY:*] signaux: [MEMORY:business-rule] ownership catégorie + [MEMORY:decision] ADR ownerId (OBLIGATOIRES) + autres
- recommandations suite: RECOMMAND_DB_EXPERT + RECOMMAND_SECURITY (obligatoires) + RECOMMAND_FOLLOWUP éventuels
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
