[BRIEFING ISSUE #175 — Sprint 76]

## Issue

**[REFACTOR] EventServiceImpl.deleteById — supprimer le double-hit DB (existsById + deleteById)**
Labels : `refactor`, `epic:events`, `priority:P3`, `size:XS`, `backend`.

Follow-up détecté pendant le Sprint 12 (issue #95, nettoyage de `findEventById`).
Source : `docs/memory/sprints/sprint-12/issue-95-done.md`.

`EventServiceImpl.deleteById` présente le même anti-pattern que `findEventById` (corrigé par #95) :
`existsById(id)` puis `deleteById(id)`.

**Nuance de l'énoncé, à ne PAS traiter comme une simple suppression de ligne :** ici l'`existsById`
sert à lever `EventNotFoundException` → **404** quand l'événement n'existe pas. Le correctif ne peut
donc pas être la suppression pure du check. Deux options proposées par l'énoncé :
- `findEventById(id).orElseThrow(() -> new EventNotFoundException(id))` puis suppression, OU
- s'appuyer sur le retour de `deleteById` (si le repo peut signaler l'absence) pour lever le 404.

**Préserver le contrat 404 existant** (couvert par les tests d'ownership/suppression).

## État réel du code — VÉRIFIÉ par le lead le 2026-09-05

⚠ **L'énoncé donne « ≈ l.133-138 » : c'est PÉRIMÉ.** Le vrai emplacement est
`backend/src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java`
**lignes 235-242**. Sur ce dépôt les pistes techniques d'énoncés sont fausses plus souvent qu'à leur
tour ([[PIT-S74-003]], [[PIT-S71-001]]) — relis toi-même avant de t'appuyer sur quoi que ce soit
d'écrit ici.

```java
    @Override
    @Transactional
    public void deleteById(UUID id) {
        if (!eventRepository.existsById(id)) {
            throw new EventNotFoundException(id);
        }
        eventRepository.deleteById(id);
    }
```

Port `EventRepository` (`domain/ports/repositories/EventRepository.java`) — surface actuelle :
`findDomainEventByProductId`, `save`, `deleteById(UUID)` (retour **`void`**), `existsById(UUID)`,
`findEventById(UUID)`, `findVersionById(UUID)`, `deleteAllByUserId(UUID)`.
Adaptateur : `infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java`.

Motif de référence livré par #95, à imiter (l.84-85 du même fichier) :
```java
        Event event = findEventById(id)
            .orElseThrow(() -> new EventNotFoundException(id));
```

## ⚠ Ce que l'énoncé appelle « double-hit » mérite d'être MESURÉ avant d'être corrigé

Compte réel des requêtes SQL, à **vérifier et non à croire sur parole** :
- `existsById` → un `SELECT count(*)`.
- `deleteById(UUID)` de Spring Data → charge l'entité (`SELECT`) **puis** émet le `DELETE`. Ce
  n'est donc pas 2 requêtes aujourd'hui mais **probablement 3**.

Conséquence : **l'option 1 de l'énoncé (`findEventById` + `deleteById(id)`) n'économise peut-être
rien du tout** — tu remplacerais un `count` par un `SELECT`, en laissant `deleteById` refaire son
propre `SELECT`. Pour qu'elle gagne, il faut supprimer l'**entité déjà chargée**, ce que le port
n'expose pas aujourd'hui (`deleteById(UUID)` seulement).

**Ta première tâche est donc une mesure, pas une édition.** Active la trace SQL Hibernate
(`spring.jpa.show-sql` / `org.hibernate.SQL` en `DEBUG`, ou les `Statistics` Hibernate) dans un test
d'intégration et **compte les instructions émises AVANT et APRÈS**. Reporte les deux chiffres dans
le done.md. Une affirmation « double-hit supprimé » sans compte mesuré est exactement le genre de
conclusion déduite que ce dépôt s'est déjà fait réfuter par la mesure.

## Plan d'implémentation

Aucun mini-plan architect (issue XS). Trois voies possibles — **choisis d'après ta mesure**, et
écris dans le done.md pourquoi tu as écarté les autres :

- **(a)** Ajouter au port une suppression qui rend le nombre de lignes touchées
  (ex. `int deleteByIdIfExists(UUID)` ou un `boolean`), implémentée en JPQL/natif dans
  `EventRepositoryJpaImpl` → **1 seule instruction**, 404 levé si 0 ligne. C'est la seule voie qui
  garantit un vrai gain. Coût : elle **modifie le port du domaine**, donc l'interface partagée.
- **(b)** Charger l'entité une fois puis la supprimer (`delete(entity)`) → 2 instructions. Exige
  aussi une nouvelle méthode de port.
- **(c)** Conclure, mesure à l'appui, que le gain ne justifie pas d'élargir le port, et **fermer
  l'issue en no-op documenté**. **C'est une issue de perf P3 sur un chemin de suppression unitaire :
  cette conclusion est parfaitement recevable si tes chiffres la portent.** Ne force pas un
  refactor pour avoir quelque chose à commiter — mais alors le done.md doit contenir les compteurs
  qui la justifient, et un `STATUS: COMPLETED` expliquant qu'aucun code n'a changé.

Contraintes d'architecture (hexagonale stricte, non négociables) :
- `domain/` : **aucun** import Spring/JPA. Le port reste une interface pure.
- Le comportement transactionnel (`@Transactional`) et le contrat 404 ne changent pas.
- Si tu touches au port, mets à jour **tous** les implémenteurs (dont d'éventuels doubles de test).

## Tests attendus

- Les tests existants doivent rester verts, en particulier
  `backend/src/test/java/.../infrastructure/adapters/controllers/EventControllerOwnershipTest.java`
  (contrat 404/403 sur la suppression). **Relis-les avant de modifier quoi que ce soit** : ils sont
  ton oracle du contrat 404.
- Ajoute (ou étends) un test qui prouve les DEUX branches : suppression d'un événement existant, et
  `EventNotFoundException` → 404 sur un id inconnu.
- Si tu retiens (a) ou (b) : le test de **compte de requêtes** décrit plus haut est le seul qui
  prouve que l'issue est résolue. Sans lui, tu as refactoré sans démontrer le gain.

Pièges de test backend sur ce dépôt :
- `mvnw surefire:test` **ne recompile pas** les tests : un verdict peut provenir d'une classe
  périmée ([[PIT-S71-004]]). Passe par `./scripts/test-quiet.sh backend`.
- Ne compte jamais les tests d'un pack par `grep -c '@Test'` — les `@ParameterizedTest` échappent
  au compte ([[PIT-S71-006]]).
- Une référence `BR-XX` écrite dans un commentaire n'est pas une preuve ([[PIT-S72-001]]) ; et un
  briefing peut attribuer un `BR-*` à la mauvaise règle — grep le pack avant de t'y appuyer
  ([[PIT-S70-001]]).
- **Aucune migration Flyway n'est attendue** pour cette issue. Si tu penses en avoir besoin,
  arrête-toi et signale-le : ce serait le signe que le périmètre a dérivé. (Pour mémoire : la
  prochaine serait V16, et on ne modifie jamais le texte d'une migration déjà appliquée, même un
  commentaire — [[PIT-S72-003]].)

## Triage
Taille : XS · Modèle : opus · Effort : medium · Domaine : events (backend)

## ⚠ GARDE-FOU WORKTREE — À LIRE AVANT TOUT AUTRE CHOSE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal :

    /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59

- **Tous** tes `Read`, `Edit`, `Write`, `Glob`, `Grep` doivent viser des chemins **ABSOLUS** sous ce
  répertoire. Un chemin relatif, et même un `cd` en commande composée, résout sur le dépôt PRINCIPAL
  `/Users/herrh/VSProjects/MyTimeline/` — tes écritures partent alors ailleurs et tes lectures voient
  un autre code ([[PIT-S24-002]], [[PIT-S27-003]], [[PIT-S19-001]]).
- Premier réflexe : `cd "/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59" && git rev-parse --abbrev-ref HEAD` → doit rendre `sprint/76`.
  Si ce n'est pas le cas : **ARRÊTE** et remonte-le dans ton retour.

## ⚠ WORKING TREE PARTAGÉ — 4 AGENTS ÉCRIVENT EN MÊME TEMPS

Trois autres agents travaillent **dans ce même répertoire de travail au même instant**. Conséquences
non négociables :

1. **JAMAIS `git add -A`, `git add .`, `git commit -a`** — tu commiterais le travail en cours des
   autres ([[PIT-S12-003]]).
2. **`git commit` SANS pathspec commite tout l'index**, y compris ce que les autres y ont mis. Le
   seul motif sûr est :
   `git add <tes fichiers exacts> && git commit -m "…" -- <tes fichiers exacts>`
   ([[PIT-S57-001]], [[PIT-S71-010]]).
3. **JAMAIS `git commit --amend`, `git stash`, `git checkout -- .`, `git reset`** — tu réécrirais ou
   détruirais le commit d'un autre ([[PIT-S55-002]]).
4. Un `git status` « sale » de fichiers que tu n'as pas touchés est **NORMAL** : ce sont les autres.
   Ne les nettoie pas, ne les commite pas, n'en tire aucune conclusion sur ton propre travail.
5. Un test rouge dans un fichier hors de ton périmètre peut appartenir au diff d'un autre agent
   ([[PIT-S54-004]], [[PIT-S72-006]]). Avant d'accuser ton code : vérifie que le fichier rouge est
   bien dans TON périmètre, sinon dis-le et n'y touche pas.

## ⚠ RTK MENT SUR LES SORTIES — vérifier le code de sortie, jamais le texte

Un hook réécrit tes commandes shell en `rtk <cmd>`. RTK **ne tronque pas seulement l'affichage : il
falsifie des sorties qui servent de données** ([[PIT-S71-002]], [[PIT-S45-003]]). Cas mesurés sur ce
dépôt : un `prettier --check` ROUGE affiché « All files formatted correctly » ([[PIT-S74-008]]), un
`next build` en échec rendu vert ([[PIT-S75-002]]), un `git diff` rendu vide ([[PIT-S20-003]]).

Règles :
- Pour toute commande dont tu **lis la sortie comme une donnée** (diff, build, tests, `--list`) :
  préfixe par `rtk proxy` → `rtk proxy git diff …`, `rtk proxy npm run build`.
- Ne conclus JAMAIS « vert » sur du texte : lis `echo "EXIT=$?"` juste après la commande.

## Commandes de test

    cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59
    ./scripts/test-quiet.sh backend      # suite Spring Boot (Testcontainers, Docker requis)
    ./scripts/test-quiet.sh frontend     # Vitest UNIQUEMENT (pas Playwright — [[PIT-S60-009]])
    ./scripts/test-quiet.sh e2e          # Playwright

⚠ `warn-test-delegation.sh` peut tuer la commande ENTIÈRE, y compris un heredoc qui l'enveloppe, et
l'échec se déguise en lancement réussi ([[PIT-S74-007]], [[PIT-S63-007]]). Si une commande de test
semble n'avoir rien produit, c'est la première hypothèse.

<!-- ===== cp-backend ===== -->
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
- Secrets via env (`JWT_PRIVATE_KEY` — clé privée RS256 PKCS#8 Base64 depuis #323, `EXPORT_TOKEN_SECRET`,
  `DB_PASSWORD`, `BREVO_API_KEY`) — aucun default en profil prod (fail-fast). ⚠ `JWT_SECRET` (HS256) a été
  SUPPRIMÉ par #323 : ne pas le réintroduire. La clé publique de vérification est DÉRIVÉE de la privée et
  publiée côté frontend via `AUTH_JWT_PUBLIC_KEY` (non secrète).
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

<!-- ===== cp-hexagonal ===== -->
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

<!-- ===== coverage-events ===== -->
# Coverage — events (màj post-S10)

> Énumération réelle des tests. Remplace la version 2026-06-25 (« zéro test backend events » — faux positif).

## Tests backend présents
- `EventServiceImplTest` (5 tests, unit Mockito) — CRUD service, règles métier événement.
- `EventControllerOwnershipTest` (3 tests, intégration @SpringBootTest + Testcontainers Postgres + standaloneSetup) — contrôle d'ownership sur GET/PUT/DELETE, 403 cross-user.
- `EventControllerValidationTest` (1 test, slice Mockito + standaloneSetup) — validation Bean sur payload événement.

## Tests frontend / E2E
- `src/hooks/useProductsWithEvents.test.tsx` (2) — hook front produits+événements (transverse products/events).
- Aucun autre test frontend dédié events (intégration FullCalendar non testée).
- E2E : aucun (`frontend/e2e/` = `.gitkeep` seul).

## Gaps restants (non couverts)
- Aucun E2E « créer un événement → voir sur calendrier » ni édition depuis calendrier.
- Intégration FullCalendar (rendu, drag) non couverte.
- Couverture controller events plus légère que categories/products (1 seul test validation, ownership à 3 cas).

## Total : 9 tests backend

<!-- ===== pit-backend (extrait ciblé) ===== -->
## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)

## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)

## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)

## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.

## PIT-S55-002 — `git commit --amend` en fan-out réécrit le commit d'un AUTRE agent
Sprint 55 : un agent a amendé pour remplacer un SHA placeholder dans son propre rapport. Entre son commit et
son amend, un autre agent avait poussé HEAD — **l'amend a réécrit le commit de l'autre**, qui porte désormais
4 lignes du rapport du premier. Rien perdu (`git log --stat`), historique faux. `--amend` réécrit le HEAD
*courant*, qui en fan-out n'est pas forcément le sien : aussi destructeur que `reset`. **Cause racine** :
demander à l'agent d'écrire son propre SHA dans son rapport crée mécaniquement le besoin d'amender.
Solution : ne pas le demander, ou accepter un 2ᵉ commit. Ajouter `--amend` à la liste des verbes git
interdits des briefings, aux côtés de `reset`/`rebase`/`checkout`/`stash`/`clean`.
Cf. [[sprint-parallel-commits-shared-worktree]].

## PIT-S71-010 — Indexer ses seuls hunks dans un working tree partagé : plumbing git, jamais le working tree
`UserControllerTest.java` était édité en parallèle par #134 et #148. `git add -p` est indisponible (mode non interactif) et le diff redirigé est corrompu ([[PIT-S71-002]]). Recette : `git cat-file -p HEAD:<path>` → reconstruction du contenu voulu → `git hash-object -w` → `git update-index --cacheinfo` : l'index reçoit la version voulue et **le working tree n'est jamais touché**, donc le WIP du voisin reste intact. Complément de [[sprint-parallel-commits-shared-worktree]]. (Sprint 71 #134)

## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)

## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)

## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)

## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)

## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)

## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.

## PIT-S60-009 — `test-quiet.sh frontend` ne lance QUE Vitest, contrairement à ce que disent le README et les briefings
`run_frontend` exécute un seul `npm test --silent` : ni `build`, ni `typecheck`, ni `lint`. La description
« vitest + build + typecheck + lint » circulait dans les briefings de sprint et le README. **Anti-pattern :
conclure « frontend vert » sur ce seul scope.** Corrigé au S60 (README §Tests + piège 4). Voisin de
[[PIT-S58-004]] : une garantie décrite mais inexistante dissuade d'en écrire une vraie.

## PIT-S72-006 — Un run de tests dans un working tree partagé n'est valable que si `git status` est stable de bout en bout
La suite frontend est sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 éditait `authService.ts` dans le même arbre ; verte au re-run isolé. Prévention : en fan-out, re-jouer avant d'imputer un échec à son propre diff. Corollaire direct de l'étiquette « pré-existant » et complément de [[PIT-S71-010]]. (Sprint 72 #72)

## PIT-S74-007 — `warn-test-delegation.sh` bloque aussi le heredoc qui CONTIENT la commande, et l'échec se déguise en lancement réussi
Le hook scanne le texte de l'appel `Bash` : écrire un script avec un heredoc contenant `npx playwright test` est bloqué comme si on la lançait. Conséquence vécue au S74 : le heredoc bloqué n'a pas créé le `.sh`, l'appel suivant a lancé `nohup` dessus et a rendu un `pid=` rassurant — **10 minutes d'attente sur un run qui n'existait pas**. Prévention : préfixer de `SKIP_DELEGATION=1` **l'appel qui écrit le script**, pas seulement celui qui l'exécute, et vérifier `ls -l` du script avant tout `nohup`. (Sprint 74)

## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)

## PIT-S73-008 — Deux subagents en fan-out qui partagent la stack E2E se corrompent mutuellement
Deux absorptions lancées en parallèle dans le même worktree ont chacune démarré `next dev` + Playwright : `.next` corrompu en cours de run (`Cannot find module './vendor-chunks/…'`, 500 sur `/fr/dashboard`) → tests rouges dont le diagnostic accuse FAUSSEMENT le code de la page ; puis 3 runs perdus sur le verrou `e2e/.auth/run.lock`. Prévention : sérialiser les agents qui ont besoin de la stack E2E, ou ne paralléliser que ceux qui n'en ont pas besoin. (Sprint 73)

## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)

## PIT-S70-002 — « Pré-existant, non lié au sprint » : l'étiquette d'un audit se réfute avec la CI de la base
Au S70, le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts faux, tous deux étiquetés « pré-existant ». (1) « `npm run build` FAIL, page `/terms` manquante » — la page existe, et surtout **la CI de `dev` était verte sur `fd954b2`, la base exacte du sprint**, alors que la CI lance le build. (2) « E2E 4 failed / 247 skipped, serveur `next dev` défaillant » — l'agent avait lancé un build **contre un `next dev` en cours**, piège nommé dans le runbook E2E S47, provoquant le 500 `InvariantError: clientReferenceManifest` qui tue `auth.setup.ts` ; il a donc créé la panne puis l'a imputée au code. Prévention, deux réflexes gratuits : **comparer tout échec dit « pré-existant » à la CI du SHA de base** (`gh run list --branch dev`), et **distinguer « rouge » de « non mesuré »** — une suite dont le `setup` échoue et qui passe 247 specs en `skipped` n'a rien mesuré, ne jamais l'écrire comme un résultat.

## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)

## PIT-S74-003 — Un énoncé d'issue peut nommer le mauvais composant, et la recon du lead peut relayer l'erreur
« Le tablist des réglages » de #417 ne passe PAS par `.mt-tab` du DS : `SettingsShell.tsx` utilise des utilitaires Tailwind bruts, `.mt-tab` sert aux onglets **produits**. Appliquer le CSS nommé par l'issue aurait corrigé un composant voisin en laissant le vrai défaut. Le briefing du lead relayait l'erreur — une recon de lead ne l'immunise pas, elle déplace l'erreur d'un cran. Au S74, **3 énoncés sur 4** portaient une piste technique fausse ou périmée (chemin vidé par un sprint antérieur, lignes inexistantes, pattern non transposable). Prévention : `grep` du sélecteur **dans le `.tsx`** avant d'éditer le CSS nommé, et dire explicitement au subagent que le briefing peut se tromper. (Sprint 74 #417 / #342 / #343)

## PIT-S75-003 — Un énoncé qui se déclare « non-impactant au runtime » est une hypothèse à réfuter, pas un fait
#279 affirmait noir sur blanc « Non-impactant au runtime actuel […] indépendant de `getRequestConfig` ». Faux : `next.config.mjs` fait `createNextIntlPlugin('./i18n.ts')`, ce qui en fait le request-config ACTIF, et les pages légales y résolvent leurs messages via `getTranslations`. La conséquence n'est pas académique — elle change la preuve exigible : un `vitest` vert ne prouvait rien, seul un `next build` le pouvait. Troisième sprint consécutif où l'énoncé se trompe ([[PIT-S74-003]], [[DEC-S72-004]]). Prévention : traiter toute clause d'innocuité d'une issue comme une affirmation à vérifier — ici, deux `grep` (le plugin, les appelants) suffisaient. (Sprint 75 #279)


---

## §2 — Index historique (titre = règle ; détail dans docs/memory/pitfalls.md)

- PIT-S1-001 — @NotBlank sur un DTO de PATCH casse les updates partiels
- PIT-S1-002 — @Valid inerte si le DTO ne porte aucune contrainte
- PIT-S1-003 — jwtService.extractUsername non catché dans un controller → 500
- PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
- PIT-S2-001 — Build backend = `cd backend && mvn` (wrapper + helper réparés Sprint 4)
- PIT-S2-002 — Tester un contrat 401/403 Spring Security exige le full filter chain
- PIT-S2-003 — `@Bean` injecté par un filtre lui-même injecté dans la `@Configuration` qui le déclare → cycle
- PIT-S2-004 — `getServletPath()` vide en MockHttpServletRequest → matcher de Filter cassé
- PIT-S2-005 — Ne jamais faire confiance à `X-Forwarded-For` par défaut pour une clé de sécurité
- PIT-S3-001 — `ddl-auto=update` ne fiabilise PAS les contraintes UNIQUE
- PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
- PIT-S3-003 — `validate` actif : toute colonne entité doit matcher EXACTEMENT la colonne SQL
- PIT-S3-004 — Baseline Flyway depuis métadonnées Hibernate omet les contraintes legacy hors-Hibernate
- PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
- PIT-S4-001 — MockMvc `standaloneSetup` n'enregistre PAS le `@RestControllerAdvice`
- PIT-S4-002 — MockMvc `standaloneSetup` ne résout pas les champs `@Value`
- PIT-S4-003 — Le header CSP backend ne régit QUE les réponses de l'origine backend
- PIT-S4-004 — Matcher Mockito ambigu sur méthode surchargée
- PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
- PIT-S5-001 — Baseline Flyway générée depuis Hibernate metadata = drift silencieux
- PIT-S5-002 — Migration durcissante + `baseline-on-migrate=true` s'applique aux bases PEUPLÉES
- PIT-S5-003 — Exception Security jamais routée vers le `@RestControllerAdvice` (corollaire 401)
- PIT-S5-004 — Worktree partagé multi-agents (fan-out /sprint, même working tree)
- PIT-S8-002 — Anti-énumération : vérifier le TIMING, pas que le code retour
- PIT-S8-003 — Tester `@Async` : mocker les ports + latch, pas de DB réelle
- PIT-S9-001 — CHECK constraint legacy bloque la conversion d'une colonne vers un enum
- PIT-S10-001 — Ajout d'un `owner_id` : scoper la MUTATION mais pas la LECTURE laisse une fuite cross-tenant
- PIT-S10-002 — `@ExceptionHandler(DataIntegrityViolationException)` global masque toutes les violations en 409
- PIT-S10-003 — `repository.save(mapper.toEntity(domain))` d'un update, domaine sans `@Version`
- PIT-S10-004 — `@SQLRestriction` masque les lignes lors des opérations transverses (réassignation/comptage) → orphelins FK
- PIT-S10-005 — Valider l'ownership de la ressource CIBLE, pas seulement de la ressource parente
- PIT-S12-001 — `*RepositoryJpaImpl.save` reconstruisant une entité détachée (version=null) au PATCH
- PIT-S12-002 — Retirer un appel repo casse les stubs Mockito strict des AUTRES tests
- PIT-S13-001 — Purge multi-tables d'un user : `@SQLRestriction` masque les lignes archivées → FK résiduelle bloque le DELETE
- PIT-S13-002 — Nouvel appel de port dans un handler → stub Mockito manquant = 401 faux négatif
- PIT-S13-003 — `jwt.secret` de profil test non-Base64 → `generateToken` DecodingException
- PIT-S13-004 — `SecurityContext` thread-local fuité d'un test slice pollue les tests full-chain suivants
- PIT-S14-001 — jjwt 0.12+ : `signWith(key)` seul déduit l'algo selon la taille de clé → figer l'algo
- PIT-S14-002 — Architect Phase 0.5 « aucune evidence » faux négatif : lire le fichier cible réel, pas grep du nom d'exception
- PIT-S15-002 — E2E full-stack cross-port : cookie JWT SameSite=Lax non envoyé sur POST
- PIT-S15-003 — `JWT_SECRET` CI doit être Base64 valide ≥32 octets
- PIT-S16-001 — ArchUnit : exception croisée = UN prédicat combiné, pas deux `dependOnClassesThat` chaînés
- PIT-S23-001 — CVE spring-security-web non backportée sur la ligne 6.4.x (rester sur Boot 3.4.x impose override 6.5.x)
- PIT-S23-002 — `@MockBean`/`@Mock` sur `*ServiceImpl` concret masque une violation DIP (fonctionne mais ment)
- PIT-S25-001 — Élargir un record domaine casse tous les constructeurs positionnels des tests
- PIT-S25-002 — Test optimistic-lock à 2 threads concurrents = flaky (timing-sensible), pas « stabilisable »
- PIT-S27-001 — Extraire un claim JWT (jti/custom) HORS du SecurityContext doit lire le token à la MÊME source que JwtFilter (cookie + Bearer)
- PIT-S28-001 — Un `case`-arm de test partagé entre scopes de nature différente = faux vert silencieux
- PIT-S29-001 — RTK tronque/mélange la sortie de `docker compose build/ps`
- PIT-S32-001 — Port repository custom : éviter le nom `findById` (collision covariante SimpleJpaRepository)
- PIT-S32-002 — Ajouter une entrée `PATH_LIMITS` casse les tests d'intégration POSTant sur ce path
- PIT-S35-001 — Property `${VAR}` sans inner-default lue à `ApplicationEnvironmentPreparedEvent` → placeholder opaque avant le message métier
- PIT-S37-001 — Filtre lisant le body avant le controller sur endpoint public non authentifié → vecteur OOM/DoS
- PIT-S37-002 — `@SpringBootTest(properties={...})` unique crée un contexte caché (+1 pool Hikari) → "too many clients" Postgres
- PIT-S37-003 — E2E : DB dev locale bloquée à une vieille version Flyway → boot backend échoue sur données stale
- PIT-S37-004 — Seed dans un test d'intégration non-`@Transactional` + id pré-assigné sur entité `@GeneratedValue`
- PIT-S41-004 — `./scripts/test-quiet.sh frontend` lancé depuis le repo principal (pas le worktree) → faux échec `eslint-plugin-storybook`
- PIT-S42-001 — Update-in-place de l'entité managée défait l'optimistic-lock (`@Version`)
- PIT-S42-002 — Réponse d'erreur portant un état serveur : ownership AVANT sérialisation
- PIT-S44-001 — `EventCreationRequest` : `durationValue`/`durationUnit` requis MÊME pour `type='single'`
- PIT-S44-002 — `ProductCreationRequest.events` sans `@Valid` : l'absence de cascade est STRUCTURELLE, ne pas la « corriger »
- PIT-S45-005 — Vagues parallèles : « prendre le prochain numéro libre » produit des collisions (2× ADR-004)
- PIT-S45-009 — Choisir un `@Profile` sans vérifier `SPRING_PROFILES_ACTIVE` du job CI : vert en local, rouge en CI
- PIT-S46-004 — Le gate `[MISSING]` de `/sprint end` grep le littéral : écrire « aucun [MISSING] » bloque la PR
- PIT-S47-001 — Un `find` qui renvoie 0 ne prouve PAS une absence : le cwd du shell persiste entre les appels
- PIT-S47-002 — Le profil `dev` fige `app.cors.allowed-origins=:3000` : un front sur un autre port échoue en accusant le rate-limit
- PIT-S47-003 — La base de dev `eventmanager` est inmigrable : V7 casse sur des données que V9 nettoierait
- PIT-S47-004 — `workers > 1` rougit 4 specs `settings-*` : DEUX causes distinctes, même signature
- PIT-S49-006 — Deux agents ont déclaré la stack E2E morte alors qu'elle tournait ; et `test-quiet.sh e2e` contourne le `--workers=1` du runbook
- PIT-S50-001 — L'`alg` d'un JWT est choisi par le PORTEUR du jeton, et une clé publique est publique
- PIT-S50-002 — Un défaut « dégradé silencieux » n'échoue pas au boot : c'est exactement ce qui le rend dangereux
- PIT-S50-005 — `openssl … | base64` replie à 76 colonnes sur GNU, pas sur BSD/macOS
- PIT-S50-006 — Un audit documentaire écrit en vague N est périmé par le code de la vague N+1 du MÊME sprint
- PIT-S50-007 — Le hook RTK tronque les SORTIES, pas seulement les diffs : il fausse les MESURES
- PIT-S50-008 — Retirer un défaut vide d'`application-prod.properties` casse le message du garde-fou
- PIT-S52-002 — Un port qui répond ne prouve pas que c'est VOTRE process qui répond
- PIT-S52-005 — Sonde `wget localhost` en image alpine : `unhealthy` à vie sur une app qui répond 200
- PIT-S52-006 — Un plan d'architecte peut produire le FAUX négatif de chemin fantôme
- PIT-S52-007 — Le hook RTK décale aussi `git log` (amende PIT-S50-007)

## PIT-S71-004 — `mvnw surefire:test` ne recompile PAS les tests : le verdict peut venir d'une classe périmée
`./mvnw -o surefire:test -Dtest=X` n'invoque pas la phase `test-compile` du cycle de vie ; après édition d'un test, c'est le `.class` de la compilation précédente qui tourne. Le rouge (ou le vert) obtenu ne décrit alors pas le code qu'on vient d'écrire. Prévention : `./mvnw -o test-compile` avant tout `surefire:test` ciblé, ou lancer `test` tout court. (Sprint 71 #148)

## PIT-S65-001 — Restaurer un fichier source par `mv` d'une copie `cp` NE PRÉSERVE PAS la mtime → Maven rejoue du bytecode périmé
Contrôle négatif backend : on neutralise une constante, on lance les tests (rouge attendu), on restaure, on relance (vert attendu). Si la restauration se fait par `cp` puis `mv`, la source restaurée est **plus ancienne que le `.class`** : Maven saute la recompilation et le run suivant s'exécute sur du bytecode périmé — **4 faux échecs mesurés au S65**, avec `javap -constants` annonçant `400` là où la source disait `5`. Aggravé par l'inlining des `static final int` (la valeur est copiée dans chaque appelant). Parade : `touch` la source restaurée, ou `mvn clean`, et **confirmer par `javap`** plutôt que par la lecture du fichier. (Sprint 65 #452)

## PIT-S71-006 — Compter les tests d'un pack coverage par `grep -c '@Test'` est faux dès qu'il existe un `@ParameterizedTest`
Une méthode `@ParameterizedTest` compte pour 1 déclaration et N exécutions (`PasswordPolicyTest` : 4 déclarées / **29 exécutées**). Au S71, la reprise des compteurs de `coverage-auth.md` depuis surefire a corrigé **7 écarts** (total 155 → 172) et exhumé une **classe fantôme inexistante à HEAD** (`JwtServiceSecretValidationTest`, renommée depuis N sprints) : un compteur faux survit indéfiniment parce que rien ne le confronte au réel. Prévention : compter depuis `target/surefire-reports/*.txt` (`Tests run:`), jamais depuis les annotations, et consigner la méthode en tête de pack. (Sprint 71, cycle de correction)

## PIT-S72-001 — Une référence « BR-XX » écrite dans un commentaire n'est pas une preuve
`BrevoEmailService` et 12 autres emplacements attribuaient l'anti-énumération de forgot-password à **BR-AUT-005**, qui est en réalité « échec d'authentification → 401 ». La bonne règle est **BR-AUT-012**. L'erreur datait de #49 et s'est propagée par recopie — le lead lui-même l'a reprise dans son premier briefing avant de la corriger. Prévention : vérifier l'énoncé dans `br-<domaine>.md` avant de reprendre une référence lue dans du code ou une issue. Généralise [[PIT-S70-001]]. (Sprint 72 #142)

## PIT-S70-001 — Un briefing peut attribuer un identifiant `BR-*` à la mauvaise règle : grepper le pack AVANT de s'y appuyer
Au S70, le briefing du lead affirmait « BR-EVE-009 = perf de l'aperçu live, débounce 150 ms ». **Faux** : `br-events.md:92` définit BR-EVE-009 comme le **modèle couleur event** (design v3 #44), et `grep -ci debounc` sur le pack rend **0**. Origine : les commentaires PRÉ-EXISTANTS `EventEditForm.tsx:174` et `:289` propagent déjà cette mauvaise attribution, et le lead les a recopiés sans vérifier la source. Le fullstack-dev a détecté l'écart et l'a **signalé sans corriger silencieusement** les deux commentaires — bon arbitrage : renommer ou réattribuer une BR est une décision, pas un nettoyage de passage. Prévention : tout identifiant `BR-*`/`PIT-*` cité dans un briefing se vérifie par un `grep` dans le pack correspondant, **y compris ceux que le lead fournit**. Même famille que [[PIT-S68-002]] et `upstream-blocker-verdict-expires` : l'énoncé n'est pas la source.

## PIT-S71-009 — `Map.of` plafonne à 10 paires clé/valeur
`RateLimitingFilter.LIMITS` en comptait 8 ; deux ajouts la portaient **pile** à 10 — la prochaine entrée n'aurait plus compilé, pour une raison sans rapport avec le sujet du commit. Bascule préventive sur `Map.ofEntries`. Prévention : toute map de configuration statique qui approche 8 entrées passe en `ofEntries`. (Sprint 71 #134)

## PIT-S72-003 — Ne jamais modifier le texte d'une migration Flyway déjà appliquée, même un commentaire
La review batch recommandait de corriger l'étiquette BR fausse dans `V6__create_password_reset_tokens.sql`. Appliqué tel quel, ce changement de **commentaire** modifie le checksum de la migration et fait échouer la validation Flyway au démarrage sur toute base existante. Le reviewer n'avait pas vu ce piège. Prévention : les fichiers `db/migration/V*.sql` sont immuables une fois appliqués ; une correction documentaire les concernant se met ailleurs (javadoc de l'adapter, pack domaine). (Sprint 72, review batch)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

Aucune. Vague 1 avec #310, #237 et #527 — **tous trois exclusivement frontend**. Tu es le seul
agent backend : `backend/**` est à toi seul, aucun risque de collision sur tes fichiers.

## ⚠ Contrainte de vague

- Ne lance **aucun** outil frontend (Playwright, `npm run dev`, `next build`) : la stack frontend
  est partagée et un autre agent en détient l'exclusivité ([[PIT-S73-008]], [[PIT-S62-009]]).
- `./scripts/test-quiet.sh backend` exige **Docker** (Testcontainers Postgres). S'il n'est pas
  disponible, dis-le franchement dans ton retour plutôt que de conclure sur un build partiel.

## Designer
Non applicable.

## Contraintes

- Branche cible : `sprint/76` — **déjà checkout**.
- **1 commit logique**, gitmoji français (ex. `:recycle: refactor(events): …`).
  Si tu conclus en no-op documenté (voie (c)), le commit ne porte que le done.md — c'est légitime.
- Commit strictement ciblé : `git add <chemins exacts> && git commit -m "…" -- <chemins exacts>`.
- Ne touche à **aucun** fichier sous `frontend/`, ni à `docs/memory/sprint-history.md`.
- Code en anglais, commentaires et docs en français.

## Livrable attendu

Écris `docs/memory/sprints/sprint-76/issue-175-done.md` (chemin ABSOLU sous le worktree), puis
rends un retour de **500 tokens maximum**, télégraphique :

```
RETOUR :
- commits: [SHA]
- resume: <compte SQL AVANT / APRÈS mesuré + voie retenue (a|b|c) + voies écartées et pourquoi + contrat 404 préservé + tests>
- [MEMORY:pitfall|pattern|decision] <si applicable>
- recommandations suite: <RECOMMAND_* ou « pas de RECOMMAND_X car … » sur UNE SEULE LIGNE>
- STATUS: COMPLETED
```

`STATUS: COMPLETED` (ou `PARTIAL` + `BLOQUE_SUR`) en **dernière ligne** du done.md. Section
« Recommandations suite » obligatoire, négation sur une seule ligne ([[PIT-S70-005]],
[[PIT-S67-004]]).

⚠ Si tu as touché au port `EventRepository`, ajoute `RECOMMAND_DB_EXPERT` : le lead spawnera un
relecteur schéma/requêtes.
