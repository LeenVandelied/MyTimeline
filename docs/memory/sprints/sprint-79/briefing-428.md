[BRIEFING ISSUE #428 — Sprint 79, vague 1]

## Issue
**[CHORE] `app.cors.allowed-origins` figé à `:3000` en profil dev — E2E local impossible si le port est pris**

Dès que `:3000` est occupé par un autre projet du poste (cas réel au S56 : un `next-server`
standalone d'un autre dépôt), l'E2E local devient **impossible**, et pas seulement gênant :

1. Basculer le front sur `:3100` ne sauve rien : Next **relaie** `Origin: http://localhost:3100`
   au backend, que le profil `dev` refuse.
2. Le refus sort en **403**, que `auth.setup.ts` rapporte comme un « rate-limit probable ».
   Le diagnostic est donc doublement faussé.
3. Un `curl` de contrôle **réussit** et semble disculper le backend — il n'envoie pas d'en-tête
   `Origin` (PIT-S57-003).

Ce piège a coûté des diagnostics faux sur **trois sprints** (47, 56, 57). Le contournement connu
(conteneur backend frère jetable avec `APP_CORS_ALLOWED_ORIGINS` multi-valeurs, port 8090) traite
le symptôme, pas la cause.

### Pistes de l'issue
- Rendre `app.cors.allowed-origins` surchargeable par variable d'environnement en profil `dev`
  (placeholder `${APP_CORS_ALLOWED_ORIGINS:http://localhost:3000}`), **et/ou**
- accepter une liste multi-ports par défaut en `dev` uniquement (`:3000,:3100`).

⚠ Le profil `dev` seulement — ne pas élargir le CORS en `prod`.
⚠ Vérifier l'interaction avec `docker-compose` (cf. #404, même famille : variables non propagées).

### Critères d'acceptation
- [ ] La valeur est surchargeable sans éditer le fichier de properties.
- [ ] Le défaut reste `http://localhost:3000` (aucune régression pour qui ne surcharge rien).
- [ ] Un **test d'intégration** épingle le comportement (résolution du placeholder + liste
      multi-origines effectivement appliquée au `CorsConfigurationSource`).
- [ ] Le profil `prod` n'est PAS touché.

## Plan d'implémentation (architect, /sprint plan — RECOMPTÉ PAR LE LEAD, exact)
```yaml
issue_428:
  fichiers_cles:
    - "backend/src/main/resources/application-dev.properties:35"
    - "backend/src/main/resources/application-prod.properties:47  (modèle à copier)"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (test Spring : résolution du placeholder + liste multi-origines)"
  risque_regression: "Élargir la liste au-delà du profil dev ouvrirait le CORS en prod. Le profil prod lit déjà ${CORS_ALLOWED_ORIGINS:} — NE PAS y toucher."
  ordre_ecriture: "application-dev.properties → test d'intégration → doc (.env.example / playwright.config.ts)"
  zod_dto_sync: "NON"
  possibly_done: false
```

**Vérification faite par le lead avant de te briefer** (ne la refais pas, appuie-toi dessus) :
- `application-dev.properties:35` = `app.cors.allowed-origins=http://localhost:3000` — valeur
  littérale, **aucun placeholder**. Confirmé.
- `application-prod.properties:47` = `app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:}` — la
  forme cible existe **déjà** côté prod. Ton correctif est une **transposition** de ce motif en
  `dev` avec un défaut **non vide**, pas une invention.

## Piège à connaître AVANT d'écrire la ligne (il t'attend précisément ici)
`PIT-S55-001` / mémoire `env-example-placeholder-defeats-noop` : **un défaut non blanc dans un
`.env.example` défait le garde-fou qu'il documente.** Ici l'arbitrage est inverse et subtil :
- Dans `application-dev.properties`, le défaut **DOIT** rester `http://localhost:3000` — sinon tu
  casses tous les postes qui ne surchargent rien.
- Mais si tu ajoutes la ligne à un `.env.example` (ou tout fichier chargé automatiquement), une
  variable **exportée vide** (`APP_CORS_ALLOWED_ORIGINS=`) écrase le défaut Spring et produit une
  liste d'origines VIDE — c.-à-d. un CORS qui refuse tout, avec le même 403 trompeur qu'on
  prétend supprimer. Décide explicitement, et écris ta décision en commentaire.

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

<!-- ===== packs volumineux NON inlinés — à ouvrir toi-même si besoin ===== -->
Les packs suivants font 87 à 296 Ko : ils ne tiennent pas dans un prompt. Ouvre-les AVEC
`Read`/`grep` depuis le worktree si tu en as besoin, et **cite dans ton done.md la ligne
`fichiers de contexte lus : ...`** pour que ce soit auditable :
- `.ai-env/context-packs/pit-backend.md` (87 Ko) — pièges backend. Entrées pertinentes ici :
  grep `PIT-S55-001` (défaut non vide qui défait un garde-fou), `PIT-S56-004`, `PIT-S57-003`
  (le `curl` sans en-tête `Origin` qui disculpe à tort le CORS), `PIT-S35-001` (property
  `${VAR}` sans inner-default → placeholder opaque).
- `.ai-env/context-packs/br-auth.md` (22 Ko) — règles métier auth. Aucune BR n'est modifiée par
  cette issue, mais vérifie qu'aucune ne dépend de la valeur CORS.
- `.claude/rules-jit/backend.md` — référence maître backend.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- **Aucune dépendance de code.** Tu es en vague 1 avec #475 (budget register E2E). Vos fichiers
  sont disjoints : toi `backend/src/main/resources/**` + un test backend ; lui
  `frontend/e2e/**` + `RateLimitingFilter.java`.
- **CONTRAINTE DURE — tu ne joues AUCUN test Playwright.** `playwright.config.ts` pose un verrou
  de run (`e2e/support/run-lock.ts`) : un seul run Playwright par worktree, et l'exclusivité est
  donnée à #475 pendant cette vague. Ta preuve est un **test d'intégration Spring**, pas un run
  E2E. Si tu penses avoir besoin d'un run E2E, tu t'es trompé de stratégie de test — relis les
  critères d'acceptation.
- Ne touche PAS : `frontend/e2e/**`, `frontend/playwright.config.ts`,
  `backend/.../infrastructure/security/RateLimitingFilter.java`.

## Designer
Non applicable (aucune surface visuelle).

## Contraintes
- Répertoire de travail : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`.
  **`cd` explicite en tout premier**, puis vérifie `git rev-parse --abbrev-ref HEAD` →
  doit rendre `claude/sprint-79-start-c6dc55`. Si tu vois autre chose, tu es dans le mauvais
  worktree : ARRÊTE et signale-le (piège récurrent, un faux KO en est toujours sorti).
- Branche cible : `claude/sprint-79-start-c6dc55` (déjà checkout, ne change pas de branche).
- Commit : **1 commit logique**, message gitmoji en français.
  **`git add` en pathspec CIBLÉE, jamais `-A` ni `.`** — trois agents partagent ce working tree.
  ⚠ `git add -- $F` avec une variable est INERTE sous zsh : écris les chemins en clair.
  ⚠ `git diff` est avalé par le hook RTK : utilise `rtk proxy git diff` si tu en as besoin.
- Tests : `./scripts/test-quiet.sh backend` (ou `backend/./mvnw` ciblé). Le scope `unit` est un
  **alias de backend seul**, ne t'y fie pas pour du frontend.
- Écris ton artefact dans `docs/memory/sprints/sprint-79/issue-428-done.md`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)
RETOUR :
- commits: [SHA1, ...]
- resume: <ce qui a changé + fichiers + comment c'est prouvé + chiffres mesurés>
- **prémisse de l'énoncé : CONFIRMÉE ou RÉFUTÉE** (avec la mesure qui tranche — c'est le livrable
  le plus utile du sprint précédent, ne le saute pas)
- [MEMORY:pitfall] / [MEMORY:decision] / [MEMORY:pattern] : **recopie ces signaux TELS QUELS dans
  le done.md**, pas seulement dans ton message de retour (ils sont perdus sinon — défaut constaté
  au S76 sur les 4 agents).
- recommandations suite: RECOMMAND_* ou "Pas de RECOMMAND_X car ..." (la négation explicite est
  exigée, l'absence de section fait échouer la clôture du sprint)
- STATUS: COMPLETED en dernière ligne du done.md (ou STATUS: PARTIAL + BLOQUE_SUR)
