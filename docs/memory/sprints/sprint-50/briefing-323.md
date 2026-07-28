[BRIEFING ISSUE #323 — Sprint 50, vague 2]

## ⚠ AVANT TOUT — ancrage worktree (garde-fou obligatoire)

Tu travailles dans le worktree suivant, PAS dans le dépôt principal :

```
/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
```

Première action, sans exception :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
git branch --show-current    # DOIT afficher claude/sprint-50-start-9b7161
rtk proxy git log --oneline -3   # DOIT montrer bf9dec0 (#322) et 3f0f1b2 (#249) au sommet
```

Si la branche diffère → STOP, retourne `STATUS: PARTIAL` + `BLOQUE_SUR: mauvais worktree`.

Piège connu (mémoire projet) : `git diff` renvoie ~vide sous le hook RTK de ce poste. Utilise
`rtk proxy git diff` / `rtk proxy git log`.

## ⛔ RÈGLE ABSOLUE — MATÉRIEL CRYPTOGRAPHIQUE

- **Tu ne génères ni ne committes AUCUNE clé de production.** Pas de paire RSA « réelle » dans le
  dépôt, pas dans `.env.example`, pas dans `docker-compose.yml`, pas dans un commentaire.
- **Tu ne dois JAMAIS afficher une valeur de secret** dans ton retour. Noms de variables uniquement.
- Des clés **de test éphémères** générées à l'exécution de la suite (dans un `@BeforeAll`, un helper
  de test, ou un fixture) sont **autorisées et attendues** — ce ne sont pas des secrets.
  Une clé de test **committée en dur** ne l'est pas : si tu en as besoin pour la CI, génère-la au
  démarrage de la suite plutôt que de la figer.
- Les valeurs de dev/CI doivent être **manifestement des placeholders** (nom explicite du type
  `dev-only-...`), à l'image de ce que fait déjà `application-dev.properties`.

## Issue #323 — [FEATURE] Passer le JWT en signature asymétrique RS256 pour vérification en Edge

Labels : `enhancement`, `epic:auth`, `priority:P1`, `size:M`, `fullstack`, `sprint-50`

### Contexte (corps de l'issue)

La garde serveur mise en place au Sprint 45 (#302) vérifie seulement qu'un « badge » de connexion
(cookie) est présent, sans pouvoir vérifier s'il est authentique. Cela vient d'une limitation
technique : la clé qui sert à fabriquer ce badge est la même que celle qui vérifie sa validité.
Si on plaçait cette clé partout où la vérification doit avoir lieu — y compris dans les parties les
plus exposées du site — n'importe qui pourrait potentiellement fabriquer de faux badges. En clair :
aujourd'hui, un visiteur avec un cookie présent mais périmé ou falsifié passe quand même la garde ;
c'est seulement une étape suivante du serveur qui le rejette réellement (401). La garde n'est donc
pas encore une vraie barrière de sécurité, seulement une aide à la navigation.

### Description

La garde serveur (#302) ne vérifie que la présence du cookie `jwt`, jamais sa signature. Motif :
`JwtService` signe en HMAC symétrique — le secret qui vérifie est aussi celui qui émet ; le placer
dans le runtime Edge/frontend y mettrait un secret de frappe de jetons. Avec une signature
asymétrique (RS256), seule la clé publique serait exposée à l'Edge, permettant une vérification de
signature dans le middleware sans risque d'émission de faux jetons.

### Critères d'acceptation (corps de l'issue)

- [ ] `JwtService` (émission et validation) migré de HMAC (HS256) vers RS256 (paire de clés
      publique/privée)
- [ ] Stratégie de rotation et de distribution des clés définie et documentée
- [ ] Middleware Next.js mis à jour pour vérifier la signature du token via la clé publique
      (pas seulement sa présence)
- [ ] Stratégie de transition définie pour les jetons existants (tous invalidés à la bascule) :
      communication, expiration progressive ou déconnexion forcée
- [ ] Tests couvrant l'émission RS256, la validation backend, et la vérification middleware

### Risques techniques (corps de l'issue)

Impact fort : tous les jetons existants sont invalidés à la bascule — nécessite une stratégie de
transition pour éviter de déconnecter tous les utilisateurs sans préavis.

### Origine

Sprint 45 — DEC-S45-001, ADR-004 §Limites.

---

## ⚠ DÉCISIONS DEV ACTÉES AU DÉMARRAGE DU SPRINT (2026-07-28) — LIT CECI AVANT LE MINI-PLAN

### 1. `ExportTokenService` est un SECOND consommateur de `${jwt.secret}` — le plan ne le voyait pas

`backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java`
lignes 41-42 (`@Value("${jwt.secret}")`), 51-52 (`Keys.hmacShaKeyFor`) et 66 (`signWith(…, Jwts.SIG.HS256)`)
signe les **tokens de téléchargement d'export RGPD** (#58, ADR-003) avec **le même secret que l'auth**.

Le mini-plan architecte ne cite que `JwtService.java` + `middleware.ts` + ADR-004. Migrer `JwtService`
seul laisserait `jwt.secret` vivant, et l'étape « retirer `JWT_SECRET` de la config » du plan serait
**inexécutable**.

**DÉCISION DEV : `ExportTokenService` reste en HS256, mais sur une clé DÉDIÉE `EXPORT_TOKEN_SECRET`.**
Motif : ces tokens sont vérifiés **côté serveur uniquement** (endpoint interne
`/api/export/download/{jobId}?token=…`) — l'asymétrique n'y apporte rien, et séparer les usages est
une amélioration en soi. À l'arrivée, `jwt.secret` / `JWT_SECRET` doit avoir **disparu** de la
configuration, remplacé par la paire RS256 + `EXPORT_TOKEN_SECRET`.

### 2. La vague 1 a déjà livré — greffe-toi dessus, ne réécris pas

**#322 (`bf9dec0`) a modifié `frontend/middleware.ts`.** État actuel :
- nouveau module **`frontend/src/lib/canonical-host.ts`** (pur, sans dépendance à `auth-guard-paths`),
  exports : `CANONICAL_HOST_ENV_VAR`, `parseCanonicalOrigins`, `canonicalOrigins`,
  `resolveCanonicalOrigin`, `applyCanonicalOrigin`, `canonicalizeLocation` ;
- `middleware.ts` a une fonction `withCanonicalOrigin(response)` appliquée **en AVAL**, qui réécrit
  l'origine de toute redirection. **Ta vérification de signature va dans le `if` de la garde**, en
  amont — tu n'as pas besoin de toucher à `withCanonicalOrigin` ni à `canonical-host.ts`.
- **Message explicite de l'agent #322 pour toi** : *« la clé publique se lira comme
  `APP_CANONICAL_HOST` (runtime, non `NEXT_PUBLIC_*`), mais un rejet de token doit produire une
  REDIRECTION, jamais un throw — toute exception non catchée dans `middleware.ts` = 500 sur toutes
  les routes protégées (BUG-S45-001). ADR-004 §Limites est sectionnée : ajoute une sous-section,
  ne réécris pas celle de #322. »*
- **Lecture d'une variable d'env dans le middleware** : elle doit être écrite en accès **littéral**
  (`process.env.MA_VARIABLE`, PAS `process.env[CONST]`) — c'est la forme que l'analyse statique de
  Next reconnaît. Une variable non `NEXT_PUBLIC_*` est lue au **runtime**, pas inlinée au build.
  Ce point a été mesuré par #322, réutilise-le.

**#249 (`3f0f1b2`) a livré** `docs/memory/audits/secret-exposure-audit.md`,
`docs/memory/devops/external-services-inventory.md` (nouveau, avec §3quater) et une mise à jour de
`docs/memory/devops/secret-rotation-runbook.md` dont la **section `JWT_SECRET` renvoie explicitement
à toi** : elle annonce la suppression de `JWT_SECRET` au profit de RS256 + `EXPORT_TOKEN_SECRET`.
**Lis ces trois fichiers** et mets-les en cohérence avec ce que tu livres réellement (c'est toi qui
as le dernier mot sur la forme finale de la configuration).

### 3. Aucun environnement déployé — la « fenêtre de déconnexion » est théorique

Mesuré au démarrage du sprint : `gh secret list` **vide**, `gh api .../environments` **vide**, aucun
workflow de déploiement, projet non déployé (cf. `secret-rotation-runbook.md`).
⇒ Le critère « stratégie de transition / communication de la déconnexion globale » se **documente**
(ADR + runbook), il ne s'exécute pas. **N'invente pas une double émission HS256/RS256 transitoire**
pour un parc d'utilisateurs qui n'existe pas : ce serait de la complexité gratuite, et un double
chemin de signature est une surface d'attaque. Documente la bascule sèche et dis pourquoi.

### 4. Vérification RS256 côté Edge : aucune librairie JWT n'est installée

`frontend/package.json` ne déclare **ni `jose`, ni `jsonwebtoken`, ni `jwt-decode`** ; `jose` n'est
pas non plus présent en transitif dans `node_modules`. Deux voies :
- **WebCrypto natif** (`crypto.subtle.importKey` + `crypto.subtle.verify`, RSASSA-PKCS1-v1_5 /
  SHA-256) — disponible dans le runtime Edge, **aucune nouvelle dépendance**. C'est la voie
  **recommandée par le lead**.
- **`jose`** — plus court à écrire, mais c'est un **ajout de dépendance de production**. Si tu la
  choisis, justifie-le explicitement dans ton retour et dans l'ADR (piège projet connu : un bump de
  dépendance dans un runtime frontend partagé se séquence, il ne s'improvise pas).

Dans les deux cas : **échec de vérification ⇒ redirection 307 vers `/login`**, jamais une exception,
jamais un 500. Et **absence de clé publique configurée ⇒ dégradé explicite** (comportement actuel,
présence du cookie seule) plutôt qu'un blocage — même logique de dégradé que `APP_CANONICAL_HOST`.
Documente ce dégradé comme une limite assumée dans l'ADR.

---

## Plan d'implementation (architect, /sprint plan — périmètre élargi, cf. §1 ci-dessus)

```yaml
issue_0323:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java"
    - "frontend/middleware.ts"
    - "docs/adr/ADR-004-garde-serveur-middleware.md"
  couches_touchees: ["infrastructure", "frontend"]
  strategie_test: "unit+integration+E2E"
  risque_regression: "Bascule RS256 invalide 100% des jetons en circulation — toute session active est déconnectée sans préavis si la fenêtre n'est pas planifiée."
  ordre_ecriture: "1) génération + distribution de la paire de clés (config secrets, JAMAIS en dur). 2) JwtService : émission RS256. 3) validation backend RS256. 4) vérification de signature via clé publique dans middleware.ts (APRÈS #322). 5) plan de transition + communication déconnexion globale. 6) retirer JWT_SECRET de la config (= volet JWT de #249)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. JwtService.java lignes 60 et 78 : `.signWith(getSigningKey(), Jwts.SIG.HS256)`
    figé explicitement, clé via `Keys.hmacShaKeyFor(keyBytes)` ligne 49. Commentaire lignes 57-59
    justifie le figeage HS256 pour ne pas invalider les jetons legacy. middleware.ts ne vérifie
    aucune signature (seule la présence du cookie est testée).
```

⚠ `fichiers_cles` est **incomplet** : il manque `ExportTokenService.java` et toute la configuration.
L'étape 6 de `ordre_ecriture` n'est atteignable qu'après avoir traité `ExportTokenService` (§1).

## Ancrage code vérifié par le lead (chemins et lignes RÉELS)

**Backend — `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/`**
- `JwtService.java` : `@Value("${jwt.secret}")` l. 24-25 · `@PostConstruct validateSecret()` l. 34-44
  (garde-fou de boot fail-fast, message qui n'expose jamais la valeur — **conserve ce principe**)
  · `getSigningKey()` l. 46-49 · `generateToken(String)` l. 51-62 · `generateToken(Authentication)`
  l. 71-80 (claim `jti` = UUID, #73) · `extractJti` l. 88-97 · `extractUsername` l. 99-105 ·
  `validateToken` l. 107+. `Jwts.SIG.HS256` figé **à 2 endroits** (l. 60 et 78), avec un commentaire
  qui explique le figeage — **mets ce commentaire à jour, il devient faux**.
- `ExportTokenService.java` : `@Value` l. 41-42 · `getSigningKey()` l. 51-52 · `sign()` l. 66 ·
  `verify()` **ne lève JAMAIS** (retourne `Optional.empty()`) — **préserve ce contrat**.
- `JwtFilter.java`, `CallerResolver.java` — consommateurs.

**Consommateurs de `JwtService` (15 fichiers, main + test)** — à vérifier un par un :
`AuthController`, `SessionController`, `SessionServiceImpl`, `CallerResolver`, `JwtFilter`,
`JwtServiceSecretValidationTest`, `AuthControllerDevProfileCookieTest`,
`AuthControllerProdProfileCookieTest`, `AuthControllerErrorContractTest`,
`AuthControllerSecurityTest`, `AuthControllerValidationTest`, `SessionControllerTest`,
`SessionRevocationIntegrationTest`, `EventControllerOwnershipTest`.
Si tu gardes la **signature publique** de `JwtService` inchangée, la plupart ne bougent pas — c'est
l'objectif à viser.

**Configuration portant `jwt.secret` / `JWT_SECRET`** (à traiter intégralement, sinon le boot casse) :
- `backend/src/main/resources/application.properties:31`
- `backend/src/main/resources/application-prod.properties:13`
- `backend/src/main/resources/application-dev.properties:22` (défaut placeholder documenté)
- `backend/src/test/resources/application-test.properties:28`
- `docker-compose.yml:45`
- `.github/workflows/ci.yml:169` (commentée « CI-only, non secret »)
- `.env.example:26`
- ⚠ `backend/.../infrastructure/config/ProfileSafetyGuard.java` — garde-fou de boot prod qui exige
  déjà `app.cookie.secure`, `COOKIE_DOMAIN`, `CORS_ALLOWED_ORIGINS`, profil `prod`. **Regarde s'il
  doit exiger la clé RS256** : c'est l'endroit naturel, et #322 a explicitement signalé qu'il
  n'existe **pas** d'équivalent frontend (risque résiduel connu).

**Bibliothèque** : `jjwt 0.13.0` (version fixée dans `backend/pom.xml`, hors BOM Spring Boot).
API 0.12+ : `Jwts.parser()`, `verifyWith(...)`, `parseSignedClaims(...)`. Pour RS256, `verifyWith`
prend une `PublicKey` et `signWith` une `PrivateKey` — vérifie la signature exacte des surcharges
dans la version installée avant d'écrire, **ne devine pas l'API**.

**Frontend**
- `frontend/middleware.ts` — la garde est dans le `if (isProtectedPathname(...) && !request.cookies.has(...))`.
- `frontend/middleware.test.ts` (racine de `frontend/`, PAS sous `src/`).
- `frontend/src/lib/canonical-host.ts` + `canonical-host.test.ts` (livrés par #322 — **ne pas modifier**).
- `frontend/e2e/auth-guard.spec.ts`.
- ⚠ App Router = `frontend/app/`, PAS `frontend/src/app/` (piège mémoire, rechute au S49).

## Triage

Taille: M annoncé — **surface réelle plus proche d'un L** (2 services backend, ~15 consommateurs,
7 fichiers de configuration, middleware Edge, ADR). Si tu constates que tu ne peux pas tout tenir
proprement, **livre un périmètre cohérent et retourne `STATUS: PARTIAL`** avec ce qui manque —
c'est préférable à une migration cryptographique à moitié faite.
Modele: opus
Effort: xhigh

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

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend MyTimeline (Next.js 15 App Router / React 18)

> À charger pour TOUTE tâche frontend. Décrit la stack RÉELLE (scan code, sprint 9).
> Versions = source de vérité `frontend/package.json`. Ce pack ne réplique pas les
> valeurs mineures : en cas de doute, relire le `package.json`.

## Stack réelle (versions du package.json)

- **Next.js `^15.2.4`** — App Router, dev `next dev --turbopack`, build `next build`.
- **React `^18.3.1`** + React DOM 18.3.1. ⚠ **PAS React 19** malgré `@types/react@^19`.
- **TypeScript `^5`** strict (`strict: true`, `noEmit`), alias `@/* → src/*`, `@/app/* → app/*`.
- **TanStack Query `^5.101.2`** (+ devtools) — état serveur. API v5 STRICT (forme objet, `gcTime`).
- **Zod `^3.24.2`** — validation + inférence de types.
- **React Hook Form `^7.54.2`** + `@hookform/resolvers@^4` (zodResolver).
- **next-intl `^4.0.2`** — i18n, 4 locales `['fr','en','es','de']`, `localePrefix: 'always'`.
- **Tailwind `^4.0.12`** (`@tailwindcss/postcss`) + `tailwind.config.ts` minimal + `postcss.config.mjs`.
- **shadcn/ui** style `new-york`, `rsc: true`, icônes **lucide-react**, Radix (dialog, select, popover, dropdown, checkbox, label, slot).
- **axios `^1.8.1`** (client HTTP), **react-hot-toast** (toasts globaux), **next-themes** (clair/sombre), **framer-motion**, **dayjs**, **react-colorful**.
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré ET peuplé (`frontend/e2e/` contient ≥9 specs : `golden-path`, `categories`, `products`, `settings-*` — MAJ S33, l'ancienne note « e2e vide » était périmée S9). Storybook 8 présent.

## Structure `frontend/`

- **`app/`** (App Router, PAS `src/app/`) : `layout.tsx` (root, Server Component), `app/[locale]/` avec `dashboard/ login/ register/ forgot-password/ reset-password/ home/ privacy/ terms/`.
- **`i18n.ts`** (racine) : `getRequestConfig`, charge les messages depuis **`public/locales/<locale>/<namespace>.json`** (fichiers par namespace : `auth common dashboard errors legal products register validation`).
- **`middleware.ts`** : `next-intl/middleware`, `localePrefix: 'always'`, matcher exclut `api|_next|*.*`.
- **`src/components/`** : `ui/` (shadcn : button, card, dialog, select, form, input, spinner, dropdown-menu, popover, language-selector…), `calendar/`, `pages/`, `products/`, + composants métier (`EventContent`, `EventEditForm`, `Testimonial*`, `theme-provider`).
- **`src/contexts/`** : `AuthContext.tsx` (source unique du user), `QueryProvider.tsx`.
- **`src/services/`** : `apiClient.ts` (axios + intercepteurs), `authService.ts`, `eventService.ts`, `productService.ts`.
- **`src/hooks/`** : `useAuth.ts`, `useCurrentUser.ts`, `useProductsWithEvents.ts`.
- **`src/lib/`** : `schemas/auth.ts` (Zod), `query-keys.ts`, `utils.ts`.
- **`src/types/`** : `auth.ts` `user.ts` `event.ts` `product.ts` (schémas Zod + types, ré-exports).
- **`src/styles/`** : `globals.css` `landing.css` `animations.css` + **`ds/`** (design tokens Graphite).

## Conventions

- **Server Components par défaut** ; `'use client'` UNIQUEMENT si hooks/état/handlers (ex. `AuthContext`, `QueryProvider`, `useCurrentUser`). Le root `layout.tsx` reste serveur ; `QueryProvider` isole `QueryClientProvider` côté client.
- **TypeScript strict** : zéro `any`, zéro `as` non justifié.
- **État serveur = TanStack Query v5** (forme objet `useQuery({ queryKey, queryFn })`, `gcTime` pas `cacheTime`). Query keys centralisées : `src/lib/query-keys.ts` (factory hiérarchique par domaine, `as const`). NE PAS éparpiller les clés en littéraux → invalidations qui ratent leur cible. `QueryClient` créé via `useState` (une instance/durée de vie, jamais au niveau module en App Router).
- **Auth = `AuthContext` source UNIQUE du user** (`useAuth()`). **#135 / DEC-S9-002** : PII (email, name) N'EST PLUS en `localStorage`. Session = cookie **JWT HttpOnly** (invisible JS). Restauration au montage par **re-fetch `GET /api/auth/me`** (`withCredentials`), `loading:true` le temps du re-fetch (pas de flash anonyme). `logout` ne purge aucun storage. `useCurrentUser` NE refait PAS d'appel `/me` : sa `queryFn` relit le user d'`AuthContext` (anti double-fetch). **Ne jamais réintroduire de PII persistée** → renvoyer vers DEC-S9-002.
- **Sécurité logs** : ne JAMAIS logger l'objet axios brut (`error.config.data` = body → password en clair ; `error.config.headers` = Authorization/cookies). Utiliser un extracteur assaini (`safeErrorMessage`) — cf. `AuthContext`, `apiClient`.
- **Formulaires = RHF + Zod** via `zodResolver`. Deux familles de schémas : « bruts » `*Schema` (service, parse payload, sans message) et factories i18n `create*Schema(t)` (form, messages traduits). Le token/param hors formulaire n'entre pas dans le schéma form (cf. reset-password).
- **Redirections auth localisées** : construire l'URL avec la locale courante (`/${locale}/login`) — `localePrefix: 'always'` casse tout chemin non préfixé.

## Sync Zod ↔ DTO backend (piège récurrent)

Les schémas Zod front doivent rester alignés sur les DTO backend (Spring Boot). Désalignement = strip silencieux ou ZodError runtime.
- `.nullable()` pour un champ nullable backend ; `.optional()` pour un champ absent. JAMAIS `.nullish()` en code manuel.
- Endpoint paginé : `paginatedSchema(itemSchema)`, jamais `schema.array()` (le body est `{items,total,page,size}`).
- Contraintes alignées BR-AUT-003 : username 3..20, email valide, password ≥ 6. Le client ne doit PAS surcontraindre le contrat backend (ex. reset ≠ register).
- DTO connus : login `{username,password}`, register `{name,username,email,password}`, forgot `{email}`, reset `{token,newPassword}`, `/auth/me` → `UserSchema {id(uuid),name,username,email,role}`.
- ⚠ Il n'existe PAS de règle `.claude/rules-jit/zod-dto-sync.md` à ce jour — appliquer cette checklist directement.

## i18n (next-intl 4)

- `useTranslations("namespace")` — JAMAIS de strings FR hardcodées. Pas de `t("key",{ns})` : un `useTranslations` par namespace.
- Messages = `public/locales/<locale>/<namespace>.json` (mock/validation data en JSON, pas de FR inline).
- Zod i18n : factory `create*Schema(t)` (option `useMemo` côté form pour stabilité).

## Design system « Graphite » (`src/styles/ds/`)

- Direction B validée (S6, source projet Claude Design) : quasi-monochrome, accent bleu électrique unique pour *today/active*, type mono (Archivo display/ui + IBM Plex Mono) via `next/font` self-hosté (variables `--font-display/--font-mono`). Clair + sombre complets.
- Tokens : `ds/tokens/` (`colors base spacing typography fonts`) + `ds/components/`, `ds/timeline.css`, `ds/i18n.css`, `ds/a11y-audit.md`, `ds/readme.md`.
- **Theme-aware** : chaque composant doit fonctionner clair ET sombre (`next-themes`). Consulter `ds/readme.md` avant de créer un composant.
- Éviter les hex inline → passer par les tokens CSS du DS.

## Accessibilité

- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`.
- Tables : `aria-label`, `scope="col"`. Interactifs custom : `role` + `tabIndex` + `onKeyDown` (Enter/Space) + `focus:ring-2`.
- Cf. `src/styles/ds/a11y-audit.md`.

## Tests (Vitest + RTL) — pièges

- **`React.use()` N'EXISTE PAS en React 18.3.1** (PIT-S8-005) — ne pas s'appuyer dessus dans code ou tests.
- **`useSearchParams` exige un `<Suspense>`** englobant (PAT-S8-004).
- **`next build` en CI attrape des erreurs invisibles aux tests RTL** (types/build strict, `ignoreBuildErrors:false`) — un run vitest vert ne garantit pas le build.
- Setup `vitest.setup.ts` : jest-dom, cleanup RTL, mocks `next/font/google`, `next/navigation`, `matchMedia`. `useAuth` hors `<AuthProvider>` lève.
- Objectif : run vitest sans ligne stderr. `act()` warning → test `async` + `await waitFor(...)`. Logs d'erreur intentionnels → `vi.spyOn(console,'error').mockImplementation(()=>{})` + `mockRestore()`.
- ✅ `frontend/e2e/` PEUPLÉ (≥9 specs Playwright : golden-path, categories, products, settings-{account,mobile,navigation,preferences,profile,security}). Vérifier la couverture réelle d'un parcours avant d'ajouter — les nouveaux `data-testid` doivent être référencés dans une spec (sinon coverage-e2e MAJEUR).

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

<!-- ===== br-auth.md ===== -->
# Context-pack domaine : `auth`

> Domaine : `auth` — inscription, authentification JWT (cookie HttpOnly + Bearer), session courante et refresh de token pour les utilisateurs MyTimeline.
> Acteurs principaux : `anonymous` (visiteur non authentifié), `ROLE_USER` (utilisateur authentifié), `ROLE_ADMIN` (déclaré mais inutilisé), `system` (filtre JWT, refresh périodique frontend).

---

## 1. Lifecycles (machines à états)

### Entité `User`

CRUD simple côté persistance — **pas de lifecycle d'état métier** sur `User` (aucun champ `status`/`state`, pas de soft-delete, pas d'activation/désactivation). Le seul cycle réel est celui de la **session JWT**, porté par le cookie `jwt`, non par l'entité.

### Session JWT (état dérivé du token, non persisté)

| Etat | Description | Transitions sortantes |
|------|-------------|-----------------------|
| `ANONYME` | Aucun cookie `jwt` / pas de Bearer | → `AUTHENTIFIÉ` via `POST /login` (succès) ou `POST /register` puis login |
| `AUTHENTIFIÉ` | Token valide présent (cookie ou header), `validateToken` OK | → `EXPIRÉ` après MaxAge (2 jours) ; → `ANONYME` via `POST /logout` ; → `AUTHENTIFIÉ` (renouvelé) via `POST /refresh` |
| `EXPIRÉ` | `ExpiredJwtException` levée à l'extraction | → `ANONYME` ; ✅ depuis S4 #105 `POST /refresh` bloque le token expiré/invalide (401, voir BR-AUT-009) |

> ⚠️ `CustomUserDetails.isAccountNonExpired / isAccountNonLocked / isCredentialsNonExpired / isEnabled` renvoient tous `true` en dur (commentaire `need to implement logic`). Aucun verrouillage / désactivation de compte n'existe.

---

## 2. Actions x Acteurs

| Action | anonymous | ROLE_USER | ROLE_ADMIN | system | Notes |
|--------|:--------:|:---------:|:----------:|:------:|-------|
| `POST /api/auth/register` | ✅ | ✅ | ✅ | — | `permitAll`, rôle forcé `ROLE_USER` (BR-AUT-006) |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | — | `permitAll`, pose cookie HttpOnly ; body = `{"message":...}` sans JWT depuis S4 #104 (BR-AUT-007) |
| `POST /api/auth/logout` | ✅ | ✅ | ✅ | — | `permitAll`, efface cookie (MaxAge=0) |
| `POST /api/auth/refresh` | ⚠️ | ✅ | ✅ | ✅ (toutes les 6h frontend) | `permitAll` ; valide expiration+signature avant ré-émission depuis S4 #105 (BR-AUT-009) |
| `GET /api/auth/me` | ❌ | ✅ | ✅ | — | `permitAll` mais exige cookie `jwt` ; renvoie `UserResponse` (DTO sans password, ✅ RÉSOLU S9, BR-AUT-008) |
| Accès `/api/users/**`, `/api/products/**`, `/api/events/**` | ❌ | ✅ | ✅ | — | exige token valide (JwtFilter) |
| Endpoints `hasAuthority('ROLE_ADMIN')` | ❌ | ❌ | ❌ | — | ⚠️ rôle ADMIN mort, aucun endpoint ne l'utilise |

---

## 3. Business Rules atomiques

### BR-AUT-001 — Unicité du username à l'inscription
**Règle** : Le `system` MUST refuser un `register` quand un `User` avec le même `username` existe déjà (réponse `409 CONFLICT`).
**Pourquoi** : Le username est l'identifiant de connexion ; un doublon rendrait l'authentification ambiguë.
**Implémentation** : `AuthController.register` (l.106-110) via `userService.findDomainUserByUsername`.
**Test attendu** : `AuthControllerTest#register_shouldReturn409_whenUsernameAlreadyExists`.
> ⚠️ **PARTIEL au niveau DB** : `UserEntity` n'a pas de `@Column(unique=true)` sur `username` → doublon possible en cas de course concurrente (check applicatif seul, non atomique). En revanche `email` a une contrainte DB `uq_users_email` (migration V2 #32) → lookup email NON ambigu (corrigé S8 : l'ancienne note « email sans unicité » était périmée).

### BR-AUT-002 — Hachage du mot de passe avant persistance
**Règle** : Le `system` MUST hacher le mot de passe (BCrypt) avant de construire et persister le `User`.
**Pourquoi** : Aucun mot de passe en clair ne doit être stocké.
**Implémentation** : `AuthController.register` (l.112) `passwordEncoder.encode(...)`.
**Test attendu** : `AuthControllerTest#register_shouldStoreBcryptHash_notPlaintext`.

### BR-AUT-003 — Validation des champs d'inscription
**Règle** : Le `system` MUST rejeter un `register` dont `name`/`username` ne font pas 3..20 caractères, `email` non valide, ou `password` < 6 caractères.
**Pourquoi** : Garantir des credentials exploitables et un email correct.
**Implémentation** : annotations Bean Validation sur `RegisterRequest` (`@NotBlank`, `@Size(min=3,max=20)`, `@Email`, `@Size(min=6)`) + `@Valid` sur `@RequestBody` (`AuthController.java:151`).
**Test attendu** : `AuthControllerTest#register_shouldReturn400_whenPasswordTooShort`.
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `register` (`AuthController.java:151`) → les Bean Validations de `RegisterRequest` sont déclenchées (validation serveur active). Côté frontend, `RegisterSchema` Zod existe (`frontend/src/lib/schemas/auth.ts:47`, cf. A12).

### BR-AUT-004 — Validation des credentials de login
**Règle** : Le `system` MUST rejeter un `login` dont `username` < 3 ou `password` < 6 caractères.
**Pourquoi** : Cohérence avec les contraintes d'inscription, éviter des requêtes d'auth triviales.
**Implémentation** : `AuthRequest` côté backend + `@Valid` sur `login` (`AuthController.java:97`) ; `LoginSchema` Zod côté frontend (`username z.string().min(3)`, `password z.string().min(6)`).
**Test attendu** : `AuthControllerTest#login_shouldReject_whenUsernameTooShort`.
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `login` (`AuthController.java:97`) — également sur forgot/reset password. La validation backend est active (plus uniquement Zod frontend).

### BR-AUT-005 — Échec d'authentification → 401, jamais de fuite interne
**Règle** : Le `system` MUST renvoyer `401 UNAUTHORIZED` (`"Invalid username or password"`) sur mauvais credentials et NE MUST PAS exposer de détail interne d'exception.
**Pourquoi** : Ne pas divulguer si l'utilisateur existe ; éviter la fuite de stack trace.
**Implémentation** : `AuthController.login` (l.68-72), délégation à `AuthenticationManager`, catch `BadCredentialsException`.
**Test attendu** : `AuthControllerTest#login_shouldReturn401_onBadCredentials`.
> ⚠️ **VIOLATION** : le `catch (Exception e)` (l.71) renvoie `ResponseEntity.status(500).body(e)` — l'objet exception est sérialisé dans le body → fuite potentielle d'informations internes. **À corriger.**

### BR-AUT-006 — Rôle forcé à `ROLE_USER` à l'inscription
**Règle** : Le `system` MUST assigner `ROLE_USER` à tout nouvel utilisateur ; un `anonymous` NE MUST PAS pouvoir choisir son rôle.
**Pourquoi** : Empêcher l'auto-élévation de privilèges (ex. s'inscrire en ADMIN).
**Implémentation** : `AuthController.register` (l.119) — littéral String `"ROLE_USER"`.
**Test attendu** : `AuthControllerTest#register_shouldAlwaysAssignRoleUser`.
> ⚠️ Le rôle est un `String` brut (pas l'enum `Role`). L'enum `Role(USER, ADMIN)` existe mais n'est jamais utilisée pour la persistance ni le typage → pas de type safety, pas de contrainte DB.

### BR-AUT-007 — Émission du token et cookie HttpOnly au login
**Règle** : Au login réussi, le `system` MUST poser un cookie `jwt` HttpOnly, `Path=/`, `SameSite=Lax`, MaxAge 2 jours, contenant les authorities en claim `role`.
**Pourquoi** : Session navigateur protégée contre l'accès JS (XSS).
**Implémentation** : `AuthController.login` (l.56-66) ; `JwtService.generateToken(Authentication)` embarque les authorities.
**Test attendu** : `AuthControllerTest#login_shouldSetHttpOnlyJwtCookie`.
> ✅ **RÉSOLU Sprint 4** : (a) #104 — le login renvoie `{"message":"Authentification réussie"}`, plus de JWT en body (token en cookie HttpOnly seul) ; (b)+(c) #99 — `Secure`/`Domain` externalisés en `@Value("${app.cookie.*}")`, defaults base fail-safe (`secure=${COOKIE_SECURE:true}`, `domain=${COOKIE_DOMAIN:}` host-only), profils dev (false/localhost) / prod (true). Helper unique `buildJwtCookie` → attributs cohérents login/refresh/logout (cf. BR-AUT-010). (Sprint 4 #104/#99)

### BR-AUT-008 — `/me` retourne l'utilisateur courant sans secret
**Règle** : `GET /me` MUST renvoyer les données de l'utilisateur identifié par le token et NE MUST PAS exposer le mot de passe (même hashé).
**Pourquoi** : Un hash ne doit jamais transiter par l'API (risque de cassage offline, surface inutile).
**Implémentation** : `AuthController.getUserDetails` — extrait username, `validateToken`, renvoie `UserResponse.fromDomain(...)` (`AuthController.java:140`).
**Test attendu** : `AuthControllerTest#me_shouldNotExposePasswordHash`.
> ✅ RÉSOLU (Sprint 9) : `/me` renvoie `UserResponse.fromDomain(...)` (`AuthController.java:140`), DTO sans champ `password` (`UserResponse.java`). Le hash n'est plus sérialisé dans la réponse HTTP (cf. A1).
> ✅ **Étendu Sprint 43 (#289) — anti-énumération** : la branche `user.isEmpty()` sur token signé valide renvoie **401 générique** `{"error":"token expiré ou invalide"}` (aligné `/refresh` #113), plus jamais 404 « User not found ». Analyse d'exploitabilité : distinction 404/401 non atteignable sans le secret JWT (`parseSignedClaims` échoue AVANT la branche) — correctif défensif par cohérence. Tests : `AuthControllerSecurityTest#me_withUnknownUserInValidToken_returns401Generic_notFound`, `AuthControllerErrorContractTest` (404→401). Reste ouvert (follow-up S43) : `SignatureException` sur `/me` tombe dans le catch générique → 500 (vs 401 sur `/refresh`).

### BR-AUT-009 — Refresh exige un token encore valide
**Règle** : `POST /refresh` MUST vérifier que le token courant est valide (non expiré) avant d'émettre un nouveau token, sinon `401`.
**Pourquoi** : Un token expiré ne doit pas pouvoir prolonger indéfiniment une session.
**Implémentation** : `AuthController.refreshToken` (l.147-185).
**Test attendu** : `AuthControllerTest#refresh_shouldReturn401_whenTokenExpired`.
> ✅ **RÉSOLU Sprint 4 (#105)** : `refreshToken` appelle `jwtService.validateToken(token, userDetails)` AVANT `generateToken` (→ 401 si false) ; catch élargi à `JwtException` (couvre Expired/Signature/Malformed) → 401 `{"error":"token expiré ou invalide"}`, plus de 500. Le cas `user.isEmpty()` renvoie le MÊME 401 générique (anti-énumération, fix review #113) au lieu d'un 404. Tests : `AuthControllerSecurityTest` (valide/expiré/signature/user-inconnu).

### BR-AUT-010 — Logout invalide la session navigateur
**Règle** : `POST /logout` MUST effacer le cookie `jwt` (MaxAge=0) pour terminer la session côté navigateur.
**Pourquoi** : Permettre la déconnexion explicite.
**Implémentation** : `AuthController.logout` (l.131-145).
**Test attendu** : `AuthControllerTest#logout_shouldExpireJwtCookie`.
> ⚠️ Incohérence de config : le cookie de logout est `Secure=true` (l.136) alors que login/refresh posent `Secure=false` (l.60/172) → attributs asymétriques, l'effacement peut ne pas matcher le cookie posé selon le navigateur. JWT non révoqué côté serveur (stateless) : le token reste valide jusqu'à expiration si déjà capturé.

### BR-AUT-011 — JwtFilter accepte cookie OU Bearer et bypass /api/auth/**
**Règle** : Le `system` (JwtFilter) MUST authentifier les requêtes via le cookie `jwt` OU l'en-tête `Authorization: Bearer`, et NE MUST PAS filtrer les routes `/api/auth/**`.
**Pourquoi** : Permettre login/register sans token tout en protégeant le reste de l'API.
**Implémentation** : `JwtFilter.shouldNotFilter` (bypass `/api/auth/**`) + lecture cookie/Bearer.
**Test attendu** : `JwtFilterTest#shouldAuthenticate_fromCookieOrBearer` / `shouldSkip_authPaths`.

### BR-AUT-012 — Mot de passe oublié : token à usage unique, expiration courte, anti-énumération (Sprint 8 #49)
**Règle** : `POST /api/auth/forgot-password {email}` MUST répondre **200 systématiquement** (email connu ou non) et sans side-channel de timing (traitement `@Async` — lookup/INSERT/envoi email déportés). `POST /api/auth/reset-password {token,newPassword}` MUST vérifier token existant + non expiré (**15 min**) + non consommé (`used_at`), re-hasher le mot de passe (BCrypt, BR-AUT-002), marquer `used_at` ; token invalide/expiré/consommé/non-UUID → **400 générique unique** (pas de distinction = anti-énumération).
**Pourquoi** : ne pas divulguer l'existence d'un compte (ni par code retour, ni par timing) ; token éphémère et non rejouable.
**Implémentation** : `PasswordResetService` (port domaine) + `PasswordResetServiceImpl` (`@Async requestReset`, `Clock` injectable), `BrevoEmailService` (port `EmailService`, RestClient), table `password_reset_tokens` (migration V6, FK CASCADE, `token` UUID unique). `RateLimitingFilter` : forgot 5/min/IP. Config `brevo.api.key=${BREVO_API_KEY}` (jamais en dur). Durée configurable `app.password-reset.token-validity-minutes`.
**Test attendu** : `PasswordResetServiceImplTest` (inexistant/expiré/consommé), `ForgotPasswordAsyncTest` (retour immédiat), `PasswordResetEndpointsIntegrationTest`.
> Follow-ups ouverts : fail-fast prod si `BREVO_API_KEY` absente, lockout par token, TTL/purge des tokens, i18n template email. Cf. DEC-S8-001/002.

---

## 4. Dépendances inter-domaines

- **Aucune relation JPA** : `UserEntity` est une table `users` autonome (pas de `@OneToMany`/`@ManyToOne`).
- **Dépendances logiques sortantes** : `users`, `products`, `events` exigent un `User` authentifié (`ROLE_USER`) via JwtFilter — le domaine `auth` est producteur de l'identité consommée par ces domaines (notamment `userId` dans `/api/users/{userId}/products/**`).
- **Couplage infrastructure (à surveiller)** : `AuthController` importe et injecte des classes infra (`UserServiceImpl` concret, `JwtService`, `CustomUserDetailsService`, `CustomUserDetails`) — voir anti-patterns.
- **Frontend** : `AuthContext` (state d'auth via re-fetch `GET /api/auth/me` au montage, cookie HttpOnly seul, plus de localStorage depuis #135/S9 ; `useAuth` = ré-export) et `apiClient` (intercepteur axios 401/403 → redirect `/login`, refresh périodique) dépendent des contrats de ce domaine.

---

## 5. Anti-patterns documentés

| # | Anti-pattern | Localisation | Gravité |
|---|--------------|--------------|:-------:|
| A1 | ✅ RÉSOLU (S9) : `/me` renvoie `UserResponse.fromDomain(...)` (DTO sans password) — hash plus exposé | `AuthController.java:140` | ~~CRITIQUE~~ |
| A2 | ✅ RÉSOLU (S9, #BR-AUT-003) : `@Valid` présent sur `register` → Bean Validations actives | `AuthController.java:151` | ~~CRITIQUE~~ |
| A3 | ~~JWT brut renvoyé dans le body du login~~ → ✅ RÉSOLU S4 #104 (body `{"message":...}`) | `AuthController` | ~~HAUTE~~ |
| A4 | `catch (Exception)` renvoie l'objet exception dans le body (500) → fuite d'internes ⚠️ partiel : login/refresh renvoient désormais `{"error":...}` générique (#113) mais `catch` toujours présent | `AuthController` | MOYENNE |
| A5 | ~~`refresh` n'invalide pas un token expiré avant ré-émission~~ → ✅ RÉSOLU S4 #105 (`validateToken` avant `generateToken`) | `AuthController` | ~~HAUTE~~ |
| A6 | ~~`Secure=false` en dur, config asymétrique~~ → ✅ RÉSOLU S4 #99 (`@Value` externalisé, defaults fail-safe, helper unique) | `AuthController` | ~~HAUTE~~ |
| A7 | ~~`domain="localhost"` en dur~~ → ✅ RÉSOLU S4 #99 (`@Value("${app.cookie.domain}")`, prod host-only) | `AuthController` | ~~HAUTE~~ |
| A8 | `AuthController` injecte `UserServiceImpl` concret + importe classes infra → viole hexagonal/DIP | l.24-28, 38 | MOYENNE |
| A9 | `role` stocké en `String` (domaine + entité) ; enum `Role` inutilisée → pas de type safety ni contrainte DB | `UserEntity`, `User` | MOYENNE |
| A10 | ✅ RÉSOLU (S9) : `@Column(unique = true)` présent sur `username` (`UserEntity.java:23`) — doublon bloqué au niveau DB. `email` : `uq_users_email` (V2 #32). | `UserEntity.java:23` | ~~MOYENNE~~ |
| A11 | ✅ RÉSOLU (S9) : `authService.registerUser(name, username, email, password)` mappe correctement `name` et `username` séparément (`authService.ts:24-31`) | `authService.ts:24-31` | ~~MOYENNE~~ |
| A12 | ✅ RÉSOLU (S9) : `RegisterSchema` Zod existe (`frontend/src/lib/schemas/auth.ts:47`) → validation client à l'inscription | `frontend/src/lib/schemas/auth.ts:47` | ~~MOYENNE~~ |
| A13 | Refresh périodique via `setInterval` (6h) au chargement du module, sans cleanup ni vérif d'auth réelle | `apiClient.ts:31` | BASSE |
| A14 | `CustomUserDetails` : `isAccountNonExpired/NonLocked/CredentialsNonExpired/isEnabled` renvoient `true` en dur (`need to implement logic`) | `CustomUserDetails.java:40-59` | BASSE |
| A15 | ✅ RÉSOLU (S9) : `@Transactional` présent sur `updateUser` (`UserServiceImpl.java:37`) | `UserServiceImpl.java:37` | ~~BASSE~~ |
| A16 | Enum `Role.ADMIN` jamais référencée par un `hasAuthority` → rôle ADMIN mort | sécurité globale | BASSE |
| A17 | ✅ RÉSOLU (#135, S9) : plus aucun localStorage — `AuthContext.tsx:34-39,60-64,108-111` re-fetch `GET /api/auth/me` au montage (cookie HttpOnly seul). `useAuth.ts` = simple ré-export. Réf DEC-S9-002. | `AuthContext.tsx`, `useAuth.ts` | ~~BASSE~~ |
| A18 | Champ `avatar` sur `User`/`UserEntity` (V7, #44, S9) présent backend (`UserEntity.java:32`, `User.java:12`) mais ABSENT du contrat frontend (`UserResponse` ne l'expose pas, `UserSchema` `frontend/src/types/user.ts` ne l'a pas) → avatar backend non exposé au front, dette **issue #151 (Sprint 13)** | `UserEntity.java:32`, `frontend/src/types/user.ts` | MOYENNE |

---

## Référence

- Coverage actuelle : `coverage-auth.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` (+ `application/dtos/RegisterRequest.java`, `AuthRequest.java`, `infrastructure/entities/UserEntity.java`, `infrastructure/security/{JwtService,JwtFilter,CustomUserDetails,CustomUserDetailsService}.java`, `domain/models/User.java`, `domain/models/Role.java`)
- Frontend : `frontend/src/hooks/useAuth.ts`, `frontend/src/services/apiClient.ts` (+ schémas Zod `LoginSchema`, `UserSchema`)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dependances intra-sprint

- **Vague 2 — tu es SEUL sur le working tree.** #322 (`bf9dec0`) et #249 (`3f0f1b2`) sont livrés et
  committés. Aucun agent ne tourne en parallèle : tu peux toucher aux fichiers frontend et docs
  qui leur appartenaient, à condition de **greffer** et non de réécrire (cf. §2 du briefing).
- Tu portes le **volet `JWT_SECRET` de l'issue #249**, fusionné ici par décision du plan : à
  l'arrivée, `JWT_SECRET` ne doit plus exister dans la configuration. Mets à jour
  `docs/memory/devops/secret-rotation-runbook.md` (section `JWT_SECRET`) pour refléter ce qui est
  réellement livré — elle a été écrite au conditionnel en t'attendant.

## Fichiers que tu NE DOIS PAS toucher

- `frontend/src/lib/canonical-host.ts` et `frontend/src/lib/canonical-host.test.ts` (#322) —
  module pur, disjoint de ton sujet.
- La sous-section §Limites d'`ADR-004` écrite par #322 — **ajoute la tienne**, ne la réécris pas.
- `docs/memory/sprint-history.md` — le lead seul y écrit.
- `docs/memory/audits/secret-exposure-audit.md` (#249) — constat figé, ne le réécris pas ; si ta
  livraison le périme sur un point, dis-le dans ton retour, le lead tranchera.

## Designer

Non applicable — aucun rendu visuel.

## Contraintes

- **Branche cible** : `claude/sprint-50-start-9b7161` (déjà checkout). Pas de branche `sprint/50`.
- **Commit** : 1 commit logique, message gitmoji en français. `git add` ciblé (jamais `-A` / `.`).
- **Vérifie ton commit** : `rtk proxy git show --stat HEAD`.
- **Tests OBLIGATOIRES, exécutés par toi** — les 3 volets du critère d'acceptation 5 :
  1. **émission RS256** (unitaire backend) ;
  2. **validation backend RS256** (les tests d'intégration existants doivent rester verts —
     `RegisterLoginIntegrationTest`, `SessionRevocationIntegrationTest`, `AccountDeletionIntegrationTest`,
     `ExportEndpointsIntegrationTest`, `ExportPurgeSchedulerIntegrationTest` portent tous
     `jwt.secret` dans leur configuration de test) ;
  3. **vérification middleware** (unitaire dans `frontend/middleware.test.ts` : token bien signé
     accepté, token à signature invalide rejeté par une **redirection**, token expiré rejeté,
     clé publique absente ⇒ dégradé sans erreur).
- Ajoute un cas couvrant `ExportTokenService` sur sa nouvelle clé, et un cas prouvant qu'un token
  d'auth ne peut pas servir de token de download (le claim `typ` isole déjà les deux — ne casse pas
  cette propriété).
- **Volume attendu au-dessus des seuils** (backend ~700 tests, frontend 747 après #322) : signale
  `RECOMMAND_TEST_RUNNER` plutôt que de tout relancer en boucle. Lance au minimum les scopes que tu
  touches et dis lesquels tu n'as pas lancés.
- Commandes : `./scripts/test-quiet.sh <scope>` ou `backend/./mvnw` (mémoire projet : les deux
  fonctionnent, `mvn` nu non).
- **Le boot doit rester fail-fast** : aujourd'hui `@PostConstruct validateSecret()` refuse de démarrer
  sur un secret invalide, avec un message qui **n'expose jamais la valeur**. Conserve cette propriété
  pour la clé RS256 (clé mal formée / absente en prod ⇒ refus de boot avec message clair et muet sur
  la valeur).

## Honnêteté attendue

- Si tu ne peux pas satisfaire un critère d'acceptation, **dis-le** au lieu de le contourner.
- Si tu livres un périmètre partiel, `STATUS: PARTIAL` + `BLOQUE_SUR` — une migration cryptographique
  à moitié faite est pire qu'un périmètre assumé.
- Si tu ajoutes une dépendance frontend, dis-le en toutes lettres avec la justification.
- Ne qualifie pas ton travail de « parfait » ou « complet » — énumère ce qui reste ouvert.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris ton bilan dans `docs/memory/sprints/sprint-50/issue-323-done.md` ET renvoie-le :

```
RETOUR :
- pack_lu: OUI — br-auth §<titre exact d'une section réelle>
- commits: [SHA1, ...]
- config finale: <variables d'env à l'arrivée — NOMS uniquement ; confirme que JWT_SECRET a disparu>
- edge verif: <WebCrypto ou jose + justification si dépendance ajoutée>
- resume: <fichiers clés + ce qui est testé + ce qui ne l'est pas>
- criteres acceptation: <chacun des 5 → SATISFAIT / PARTIEL / NON, avec raison si non>
- export tokens: <état d'ExportTokenService + EXPORT_TOKEN_SECRET>
- risque residuel: <ce qui reste ouvert>
- [MEMORY:*] signaux: <pitfall / decision / pattern / business-rule>
- recommandations suite: <RECOMMAND_* ou RECOMMAND_FOLLOWUP>
```

Dernière ligne du `done.md` : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + une section `BLOQUE_SUR`).
