[BRIEFING ISSUE #148]

## Issue
[CHORE] Harmoniser la politique de complexité du mot de passe (form vs backend)

## Contexte
Lors de la revue de la PR #138 (Sprint 8, flux « mot de passe oublié »), une incohérence a été détectée entre les règles de validation du mot de passe appliquées côté formulaire (frontend) et côté serveur (backend). Aujourd'hui, un mot de passe peut être accepté à un endroit de l'application et refusé à un autre, ce qui est source de confusion pour l'utilisateur et affaiblit la confiance dans la robustesse du compte.

## À faire
Incohérence constatée :
- Le **formulaire d'inscription** (`frontend/src/lib/schemas/auth.ts`, `createRegisterFormSchema`) exige **majuscule + chiffre**.
- Le **backend** (`RegisterRequest` et `ResetPasswordRequest`, package `com.matimeline.eventmanager`) n'impose que `@Size(min=6)` — aucune règle de complexité.
- Le formulaire de réinitialisation a été aligné sur `min 6` (PR #147) pour matcher le backend existant — mais du coup le formulaire d'inscription reste plus strict que le backend ET que le formulaire de réinitialisation.

Décision à trancher entre deux options :
1. **Durcir le backend partout** (recommandé) : ajouter la contrainte majuscule + chiffre (voire longueur minimale ≥ 8) sur `RegisterRequest` et `ResetPasswordRequest` (validation serveur), puis aligner tous les schémas Zod (register + reset) sur cette même règle. Le backend devient la source de vérité de la politique de mot de passe.
2. **Assouplir le formulaire d'inscription** : retirer la contrainte majuscule + chiffre du formulaire register pour matcher le backend (`min 6`). Cohérent, mais politique de sécurité plus faible.

Option 1 recommandée pour des raisons de sécurité. Mettre à jour la règle métier BR-AUT-003 en conséquence, quelle que soit l'option retenue.

## BR impactées
BR-AUT-003 (politique de mot de passe) — à clarifier/mettre à jour selon l'option retenue.

## Critères d'acceptation
- [ ] Une politique de mot de passe unique est décidée et documentée (mise à jour de BR-AUT-003).
- [ ] Les contraintes de validation sont identiques entre le backend (`@Valid` sur `RegisterRequest` et `ResetPasswordRequest`) et les schémas Zod frontend (register + reset).
- [ ] Des tests couvrent le rejet d'un mot de passe non conforme, à la fois côté serveur et côté client.

## Piste technique
- `frontend/src/lib/schemas/auth.ts` (`createRegisterFormSchema`, schéma reset)
- Backend `com.matimeline.eventmanager` : `RegisterRequest`, `ResetPasswordRequest`
- Voir PR #138 (sprint 8, flux mot de passe oublié) et PR #147 (alignement form reset sur `min 6`)

## Dépendances
Aucune. À noter : lien thématique avec les issues #134 (anti-énumération username) et #141 (rate-limiting reset password), sans dépendance bloquante.

## Risques techniques
Durcir le backend rétroactivement peut invalider des mots de passe déjà existants en base pour les comptes créés avant le changement — s'assurer que la contrainte ne s'applique qu'à la création/modification, pas à la validation des mots de passe existants au login.

## Estimation
S — modification ciblée de 2 endpoints backend + 2 schémas Zod frontend + mise à jour de la doc BR + tests unitaires associés. Pas de migration de données requise.


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — TRANCHEE, NE PAS LA REOUVRIR :
Option 1 de l'issue, poussee a 8 caracteres. Le BACKEND est la source de verite.

- `RegisterRequest` ET `ResetPasswordRequest` : `@Size(min = 8, ...)` + contrainte
  majuscule + chiffre (via `@Pattern` ou une annotation de validation dediee, au choix,
  mais IDENTIQUE sur les deux DTOs et avec un message d'erreur FR coherent).
- Schemas Zod alignes sur EXACTEMENT la meme regle : `createRegisterFormSchema` ET le
  schema de reset dans `frontend/src/lib/schemas/auth.ts` (aujourd'hui `min(6)` cote reset,
  `min(6)+regex` cote register — les deux doivent devenir min 8 + majuscule + chiffre).
  Verifier aussi les schemas non-i18n du meme fichier (lignes ~28-51) s'ils servent encore.
- Cles i18n : `validation.password.min` doit refleter 8 (et non 6) dans TOUTES les locales
  presentes sous `frontend/` — grep la cle avant de conclure.
- CONTRAINTE DURE : la regle s'applique a la CREATION/MODIFICATION uniquement. Le login
  (`LoginRequest` / verification du hash) NE DOIT PAS etre durci — sinon les comptes
  existants avec un mot de passe a 6 caracteres sont verrouilles. Verifier explicitement
  qu'aucune annotation ajoutee ne retombe sur le chemin d'authentification.
- Mettre a jour BR-AUT-003 dans `docs/memory/business-rules.md` ET dans le pack
  `.ai-env/context-packs/br-auth.md` (les deux, sinon la CI `ai-env-packs` peut rougir).
- Tests : rejet serveur d'un mot de passe non conforme sur les 2 endpoints + test des
  schemas Zod cote frontend. Un test qui prouve que le LOGIN d'un compte a mot de passe
  court fonctionne toujours est demande explicitement.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack backend (inline)

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


## Context-pack domaine — 1 pack inline ci-dessus, le reste par pointeur

Le briefing COMPLET (~230 Ko : `cp-*` + `br-*` + `pit-*` + règles JIT) est présent dans CE
worktree : `docs/memory/sprints/sprint-71/briefing-148.md`. Il n'est pas recopié ici en entier — le recopier ferait
transiter ~57 K tokens DEUX fois par le contexte du lead, et une reproduction verbatim de cette
taille est elle-même une source d'erreur de transcription.

**LECTURE OBLIGATOIRE, dans cet ordre, AVANT d'écrire du code.** Tous ces chemins sont versionnés
et stables dans CE worktree :

1. `.ai-env/context-packs/br-auth.md` (19 Ko) — règles métier `auth`. **BR-AUT-003**
   (politique de mot de passe) est la règle que tu modifies : lis-la AVANT de la réécrire.
2. `.ai-env/context-packs/pit-backend.md` (60 Ko) — archive des pièges backend. Cherche EN
   PRIORITÉ : `validation`, `@Valid`, `Pattern`, `password`, `hash`, `BCrypt`, `login`.
3. `.ai-env/context-packs/pit-frontend.md` (94 Ko) — cherche : `zod`, `schema`, `i18n`,
   `next-intl`, `validation`.
4. `.ai-env/context-packs/coverage-auth.md` (3 Ko) — ce qui est déjà couvert par des tests.
5. `docs/memory/business-rules.md` — section BR-AUT-003, à mettre à jour **en plus** du pack.

⚠ Ce pointeur n'est **pas contraignant techniquement** : c'est TOI qui garantis la lecture.
C'est la faiblesse consignée à la clôture du Sprint 69 (« impossible de prouver que l'agent a
ouvert l'archive pointée »). D'où la ligne **`fichiers de contexte lus`** exigée dans ton
livrable, avec un ancrage vérifiable par fichier (identifiant de pitfall, numéro de ligne, ou
citation courte). Elle SERA auditée à la clôture du sprint. Si tu n'as pas lu un fichier,
écris-le — un aveu est exploitable, une affirmation fausse ne l'est pas.
## Dependances intra-sprint
- Lien thematique avec #134 (meme domaine auth, meme sprint) mais AUCUNE dependance bloquante.
- #134 travaille EN PARALLELE sur `UserController` et le rate-limiting. Toi tu touches les DTOs
  de validation + les schemas Zod. Ne deborde pas sur son perimetre.

## Designer
Non applicable (pas de nouvelle surface visuelle a valider en amont) — sauf mention contraire
dans le plan d'implementation ci-dessus.

## Contraintes d'execution (LIRE — pieges deja payes sur ce projet)

- **Repertoire de travail** : `cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  EN PREMIERE COMMANDE. C'est un **worktree git**, pas le repo principal. Ne JAMAIS `cd` vers
  `/Users/herrh/VSProjects/MyTimeline` tout court : tu travaillerais sur un autre checkout et
  ton verdict serait faux.
- **Garde-fou HEAD** : verifie `git rev-parse --abbrev-ref HEAD` == `claude/sprint-71-start-09aa02`
  avant toute ecriture. Si ce n'est pas le cas : STOP et remonte-le.
- **Working tree PARTAGE** : 3 autres subagents travaillent EN PARALLELE dans ce meme repertoire
  sur d'autres issues. Consequences non negociables :
  - `git add` **CIBLE fichier par fichier**. JAMAIS `git add -A`, JAMAIS `git add .`,
    JAMAIS `git commit -a` — tu commiterais le travail en cours des autres.
  - Ne `git checkout` / `git restore` / `git stash` **rien** que tu n'aies pas ecrit toi-meme.
  - Ne touche pas aux fichiers listes en « Ne PAS toucher » ci-dessous.
  - Le SHA que tu lis via `git rev-parse HEAD` juste apres ton commit peut deja avoir bouge
    (commit concurrent). Reporte le SHA rendu par ta propre commande `git commit`, et dis-le
    si tu as un doute.
- **Piege outillage RTK** : `git diff` peut renvoyer une sortie vide/tronquee sous le hook RTK.
  Utilise `rtk proxy git diff ...` (ou redirige vers un fichier puis lis-le). Une sortie vide
  n'est PAS une preuve qu'il n'y a pas de diff.
- **Commit** : 1 seul commit logique, message gitmoji en francais, se terminant par
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. **Ne PAS `git push`.**
- **Tests** : `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE, inline). Le lancement direct de
  `backend/./mvnw` est le repli si le script echoue. Si volume > 500 tests OU > 3 min :
  ecris `RECOMMAND_TEST_RUNNER` dans ton retour plutot que d'attendre.
- **Migration Flyway** : aucune attendue sur cette issue. Si tu en crees une, ce serait `V16`
  et il faut le signaler (`RECOMMAND_DB_EXPERT`).
- **Ne PAS toucher aux fichiers** : `infrastructure/security/RateLimitingFilter.java`, `RateLimitConfig.java`, `SecurityConfig.java`, `UserController` (perimetre de #134)

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Ecris `docs/memory/sprints/sprint-71/issue-148-done.md` avec :

RETOUR :
- commits: [SHA...]
- resume: objectif + BR touchees + fichiers cles + pitfalls rencontres + tests (chiffres reels)
- [MEMORY:*] signaux: bug / pitfall / pattern / business-rule / decision (si applicable)
- recommandations suite: signaux `RECOMMAND_*` (DB_EXPERT / TEST_RUNNER / SECURITY / UI_DESIGN /
  FOLLOWUP) **OU une negation explicite sur UNE SEULE LIGNE** du type
  `Pas de RECOMMAND_SECURITY car <raison>` — la negation coupee par un retour a la ligne n'est
  pas reconnue par le hook de completude.
- Section `## Recommandations suite` OBLIGATOIRE (meme vide-avec-negation), sinon la cloture
  du sprint est bloquee.
- Derniere ligne du fichier : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
  `BLOQUE_SUR` au-dessus).

Ne declare pas « termine » ce que tu n'as pas execute : enumere ce qui n'a PAS ete verifie.

### Ligne supplémentaire OBLIGATOIRE dans le done.md

- `fichiers de contexte lus:` — un item par fichier listé dans la section pointeur ci-dessus,
  avec un **ancrage vérifiable** (identifiant `PIT-*` / `BR-*` / `PAT-*`, numéro de ligne, ou
  citation courte). Écris explicitement `NON LU` pour ceux que tu n'as pas ouverts. Cette ligne
  est auditée à la clôture du sprint.
