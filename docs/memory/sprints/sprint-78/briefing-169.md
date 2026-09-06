[BRIEFING ISSUE #169 — Sprint 78, vague 2]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

⚠ **La branche locale de ce worktree s'appelle `claude/sprint-78-start-5c9db2`, PAS `sprint/78`**
(la branche `sprint/78` est attachée à un autre worktree ; celle-ci en est un fast-forward exact
et sera poussée vers `sprint/78` à l'ouverture de la PR). **C'est normal, ne le « corrige » pas**,
ne fais aucun `git checkout` / `git switch` / `git branch -m`.
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## Contexte de vague — tu es SEUL sur l'arbre

Vague 2. Les deux issues de la vague 1 (**#528** et **#434**) sont **livrées et commitées**.
Aucun autre agent ne code en même temps que toi. Les règles de working tree partagé restent
néanmoins de mise pour le commit :
- `git add <chemins explicites>`, jamais `git add -A` / `git add .` / `git add -u`.
- `git commit -m "msg" -- <mêmes chemins>` (⚠ `-m` AVANT le `--`, sinon le message est pris
  pour un pathspec — PIT-S57-001).
- JAMAIS `git commit --amend`, `git stash`, `git reset`, `git checkout -- .`.

## Issue #169 — [CHORE] Rendre la couverture de tests mesurable : JaCoCo + vitest --coverage en CI

### Corps de l'issue

**Contexte.** Personne ne peut dire aujourd'hui, chiffres à l'appui, quelle proportion du code
est réellement testée. Cette information est utile pour prioriser les efforts de test d'un
sprint à l'autre.

**Description.** Aucun rapport de couverture n'est généré, ni backend ni frontend : le plugin
`jacoco` est absent de `backend/pom.xml`, et aucun dossier `frontend/coverage/` n'existe. La
couverture réelle n'est donc ni mesurable ni suivable dans le temps — les documents de suivi
(`coverage-*.md`) comptent les tests manuellement.

**Description technique.**
- Ajouter le plugin JaCoCo au build Maven (rapport généré à l'étape `verify`)
- Ajouter `vitest run --coverage` côté frontend (reporter au format `lcov`)
- Publier les deux rapports comme artefacts téléchargeables depuis chaque run de CI
- **Pas de seuil bloquant dans un premier temps** — l'objectif est de mesurer avant d'imposer
  un seuil

**Critères d'acceptation.**
- [ ] Rapport JaCoCo généré et exporté en artefact CI
- [ ] Rapport vitest coverage (lcov) généré et exporté en artefact CI
- [ ] Les deux artefacts sont téléchargeables depuis un run CI GitHub Actions

**Origine.** Audit qualité 2026-07-02 — `docs/audit/audit-2026-07-02.md`, axe 3.

### Ce que l'issue NE demande PAS — et que tu ne dois pas ajouter

- **Aucun seuil bloquant** (`<limit>`, `check` goal JaCoCo, `thresholds` vitest). Mesurer, pas
  gater. En ajouter un transformerait un sprint « rendre mesurable » en gate surprise.
- Aucun service externe (Codecov, SonarQube, badge). Artefacts GitHub Actions, point.
- Aucun changement de tests existants.

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_169:
  fichiers_cles:
    - "backend/pom.xml"
    - "frontend/vitest.config.mts"      # ⚠ .mts, PAS .ts (l'architect a écrit .ts — faux)
    - ".github/workflows/ci.yml  (jobs backend + frontend)"
  couches_touchees: ["ci", "backend", "frontend"]
  strategie_test: "manuel (artefacts téléchargeables depuis un run CI)"
  risque_regression: "L'agent JaCoCo s'attache à argLine ; le backend utilise Testcontainers —
    un argLine surchargé sans concaténer l'existant casse TOUTE la suite backend."
  ordre_ecriture: "pom.xml → vitest.config → ci.yml (upload artefacts)"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — MESURÉ par le lead le 2026-09-06 (post-vague 1)

Vérifie ce qui suit, mais pars de là. **Un point du mini-plan architect est faux, deux points
utiles n'y figurent pas** (PIT-S71-001 : un énoncé recopié n'acquiert pas de vérité par
répétition).

1. `grep -c jacoco backend/pom.xml` → **0**. CONFIRMÉ absent.

2. **Le fichier de config Vitest est `frontend/vitest.config.mts`** — extension `.mts`, pas
   `.ts`. Le mini-plan architect ET la piste technique de l'issue disent `.ts`. Il n'existe
   aucun `vitest.config.ts`. Il ne contient aujourd'hui **aucune** clé `coverage`.
   `test.exclude` y vaut `['node_modules/**', '.next/**', 'e2e/**', '**/*.stories.{ts,tsx}']`
   et `test.include` cible `src/**`, `app/**`, `middleware.{test,spec}.ts`.

3. **`maven-surefire-plugin` est déjà déclaré dans `backend/pom.xml`** (section `<build>`), avec
   un `<configuration><systemPropertyVariables><api.version>` pour Testcontainers — **mais SANS
   aucun `<argLine>`**. C'est la bonne nouvelle : `jacoco:prepare-agent` pose la propriété
   `argLine` et surefire la consomme automatiquement tant que personne ne la surcharge.
   **Règle absolue** : si tu ajoutes un `<argLine>` littéral à surefire, tu détaches l'agent
   JaCoCo et/ou tu casses Testcontainers. Si un `<argLine>` devient nécessaire, il DOIT
   contenir `@{argLine}` pour concaténer celui de JaCoCo. Le mode d'échec est brutal : toute
   la suite backend tombe.

4. La CI lance `./mvnw --batch-mode --no-transfer-progress verify` (job `backend`,
   `working-directory: backend`, JDK 21 temurin). Un `report` lié à la phase `verify` (ou
   `test`) est donc exécuté par la CI telle quelle.

5. **Le job CI `frontend` a changé pendant la vague 1** : #528 y a ajouté un step final
   `Format (Prettier)` → `npm run format:check`, après `Lint`. La séquence est désormais
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint` → `Format (Prettier)`.
   Lis le fichier, ne te fie pas à une description antérieure (PIT-S68-002).

6. **`actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02  # v4` est déjà utilisée**
   dans ce workflow (job `e2e`). **Réutilise exactement ce SHA épinglé** — le dépôt épingle
   toutes ses actions par SHA, une référence `@v4` flottante serait une régression de posture.

7. Les sorties sont déjà ignorées par git : `backend/target/` (`.gitignore` racine) et
   `coverage/` (`frontend/.gitignore`). `frontend/.prettierignore` ignore déjà `coverage`, donc
   le nouveau gate `format:check` de #528 ne mordra pas sur les rapports générés.

8. **Le scope `coverage` de `scripts/test-quiet.sh` t'attend déjà** : il contient un branchement
   `grep -q jacoco backend/pom.xml` → si présent, `test jacoco:report`, sinon un message ℹ.
   Ton travail va donc **activer** ce chemin, qui n'a jamais tourné. ⚠ #434 a modifié
   `scripts/test-quiet.sh` pendant la vague 1 : **relis le script tel qu'il est maintenant**
   avant de supposer quoi que ce soit de son contenu ou de ses scopes. Vérifie que le chemin
   `coverage` fonctionne réellement une fois JaCoCo présent — et **si tu dois le retoucher,
   fais-le au minimum et dis-le explicitement** (le fichier vient d'être arbitré par #434).

9. **Ce que #434 a livré en vague 1, et qui te concerne directement** : le scope `frontend` de
   `scripts/test-quiet.sh` a été ÉTENDU — il enchaîne désormais `build → vitest → typecheck →
   lint`, arrêt au premier échec, ~53 s à cache `.next` chaud (contre ~27 s avant). Un nouveau
   scope `frontend-unit` (Vitest seul) a été ajouté pour la boucle rapide. Conséquence pour
   toi : `./scripts/test-quiet.sh frontend` est maintenant un vrai gate mais il **lance un
   `next build`** — utilise `frontend-unit` pour tes itérations rapides, et le scope complet
   une fois seulement, à la fin.

### Piège de mesure — protocole imposé

Le hook RTK falsifie des sorties : `next build` rendu « 2 routes » au lieu de 52 pages
(PIT-S75-002), `prettier --check` rouge affiché vert (PIT-S74-008), `vitest` « PASS/FAIL »
inventé (PIT-S45-003), `git log -1` rendant le parent (PIT-S77-008). **La redirection vers un
fichier ne désamorce rien** : le fichier capture la sortie DÉJÀ résumée.

Toute affirmation de ta part sur un vert/rouge ou un chiffre doit venir de cette forme, sans
pipe, avec l'exit code lu immédiatement :

```bash
rtk proxy <commande> > /tmp/out-169.txt 2>&1; echo "EXIT=$?"; tail -20 /tmp/out-169.txt
```

Et **la preuve qu'un rapport existe est le fichier**, pas la sortie du build :
`ls -la backend/target/site/jacoco/index.html` et `ls -la frontend/coverage/lcov.info`.

⚠ La suite backend utilise **Testcontainers** : elle exige un Docker vivant et prend plusieurs
minutes. Si Docker est absent sur ce poste, **dis-le au lieu de conclure**, et rabats-toi sur
`./mvnw help:effective-pom` / `./mvnw validate` pour prouver que le plugin est bien lié aux
phases attendues. Ne conclus jamais « la suite est rouge » sur un défaut d'environnement
(PIT-S69-002, PIT-S70-002).

## Triage
Taille: XS→S
Modèle: opus
Effort: high

## Context-pack (lire EN PRIORITÉ avant tout code)

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

<!-- ===== pit-backend.md (extrait ciblé issue #169) ===== -->
## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)


## PIT-S16-002 — Subagent en worktree : `cd` Bash résout sur le repo principal
Un subagent lancé depuis un worktree peut voir son `Bash cd <chemin relatif>` résoudre sur le repo principal (`dev`) au lieu du worktree → fichiers écrits au mauvais endroit, faux KO. Solution : chemins ABSOLUS du worktree + `git -C <worktree>`, vérifier `git branch --show-current` AVANT chaque écriture (pas seulement avant commit). (Sprint 16 #166)


## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)


## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)


## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)


## PIT-S53-006 — Un rapport `test-runner` peut être faux de façon *plausible* (cwd sur le dépôt principal)
Le `test-runner` du S53 a rapporté `814/821`, « 1 suite en échec : Cannot find package
'eslint-plugin-storybook' » et « `base-layer.test.ts` : 2 tests ». **Les trois chiffres étaient faux** : le
paquet est déclaré ET installé, la suite donne **834/834**, le fichier contient **11** tests. Cause : cwd sur
le **dépôt principal** au lieu du worktree (`node_modules` différents) — cf. `PIT-S8` / `PIT-S38`. Le mode
d'échec est traître : le rapport est **plausible** (nombre proche du vrai + cause d'échec crédible), pas
manifestement cassé. Solution : ne jamais reprendre un chiffre de test d'un subagent dans un audit ou un
corps de PR sans l'avoir relancé soi-même depuis le worktree. Un écart de quelques tests est le **signal**
qu'il faut re-mesurer.


## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.


## PIT-S58-004 — Un garde-fou cité dans la doc peut n'exister nulle part
`ds/a11y-audit.md` affirmait que toute réintroduction d'anneau local serait rattrapée par
`base-layer.test.ts` — ce fichier ne contenait **aucune** occurrence de `focus` / `outline` / `ring`.
Sur ce dépôt les commentaires servent de mémoire d'arbitrage : une garantie fictive est **pire** que pas de
garantie, parce qu'elle dissuade d'en écrire une vraie. **Vérifier l'existence réelle de chaque garde-fou
cité, pas seulement que le chemin du fichier résolve.** Et quand on écrit l'assertion manquante, écrire
**avec elle ce qu'elle n'attrape pas** (ici : elle verrouille la layerisation du CSS source, elle ne détecte
pas un `ring-2` réintroduit dans un `.tsx`).


## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)


## PIT-S65-001 — Restaurer un fichier source par `mv` d'une copie `cp` NE PRÉSERVE PAS la mtime → Maven rejoue du bytecode périmé
Contrôle négatif backend : on neutralise une constante, on lance les tests (rouge attendu), on restaure, on relance (vert attendu). Si la restauration se fait par `cp` puis `mv`, la source restaurée est **plus ancienne que le `.class`** : Maven saute la recompilation et le run suivant s'exécute sur du bytecode périmé — **4 faux échecs mesurés au S65**, avec `javap -constants` annonçant `400` là où la source disait `5`. Aggravé par l'inlining des `static final int` (la valeur est copiée dans chaque appelant). Parade : `touch` la source restaurée, ou `mvn clean`, et **confirmer par `javap`** plutôt que par la lecture du fichier. (Sprint 65 #452)


## PIT-S65-004 — Une boucle de poll CI dont la condition de sortie cherche un MOT dans la sortie texte se termine à tort
Une boucle `if ! echo "$OUT" | grep -qE 'pending|queued'` est sortie **dès la 1re itération** sur la réponse `no checks reported on the branch` : juste après un push, les checks n'existent pas encore, la chaîne ne contient donc aucun de ces mots, et l'absence de checks se lit comme « CI stabilisée ». Variante de [[PIT-S55-*]] (watcher muet), mais ici le watcher ment au lieu de se taire. **Ne jamais faire porter la condition sur la présence d'un mot dans une sortie texte** : interroger le STATUT du run pour le SHA exact (`gh run list --json headSha,status --jq 'select(.headSha=="<sha>")'`) et n'accepter que `completed`. (Sprint 65)


## PIT-S67-001 — Un « blocage amont non corrigeable » se périme EN SILENCE, et survit dans un commentaire de CI puis dans les énoncés d'issues qui le citent
Au S45, `.github/workflows/ci.yml` a consigné que l'advisory `brace-expansion` était incorrigible en aval : « le seul corrigé est 5.0.8, qui change sa forme d'export ; le forcer casse le lint (`expand is not a function`) ». Vrai à l'époque. Faux ~20 sprints plus tard : une `1.1.18` est sortie sur la branche 1.x, or `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` → elle y entre, la branche 5.x n'est jamais sollicitée, `npm run lint` sort exit 0 avec 0 occurrence de l'erreur. Le verdict avait été recopié tel quel dans l'énoncé de #438, ce qui orientait l'issue vers un arbitrage documentaire (« masquer le signal rouge ? ») au lieu d'une correction : les 8 entrées d'audit étaient TOUTES des patchs in-range, `npm audit` est passé de 8 à 0. Prévention : un blocage amont n'est pas un acquis — il se périme le jour où l'amont publie un patch dans la plage semver DÉJÀ déclarée, et rien ne le signale. Lire les plages dans le lockfile (`packages[].dependencies`) avant de croire un « non corrigeable », et re-tester à chaque sprint plutôt que recopier.


## PIT-S67-004 — `check-sprint-completeness.sh` lit LIGNE À LIGNE : une négation « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal NON traité
Le hook extrait chaque ligne contenant `RECOMMAND_<SPEC>` et teste la négation (`pas de.{0,5}recommand`, `non applicable`, `aucun`…) sur **cette seule ligne**. Au S67, `issue-438-done.md` portait « …, pas de\n  `RECOMMAND_UI_DESIGN` (aucune surface visuelle). » : le « pas de » étant sur la ligne précédente, le signal a été compté comme actionnable et non traité, bloquant `/sprint end`. Second piège du même hook : il cherche un fichier dont le NOM contient `test-runner` / `db-expert` / `ui-design` **dans `docs/memory/sprints/sprint-N/`** — un test-runner réellement spawné dont le rapport n'est rangé que dans `docs/memory/audits/` reste invisible. Prévention : une négation `RECOMMAND_*` tient sur UNE ligne (un tiret par spécialiste), et le rapport d'un spécialiste spawné se dépose dans le dossier du sprint (convention S61 : `sprints/sprint-61/test-runner-report.md`).


## PIT-S68-002 — La section « RETOMBÉE CI » d'un briefing peut être elle-même périmée : lire le job, pas l'énoncé de la spec
Au S68, le lead a averti l'agent contre la lecture d'énoncés périmés, PUIS a écrit dans le même briefing une section « retombée CI » fausse : elle affirmait qu'`auth-signature.spec.ts` skippe en CI et que le mode dégradé virerait au rouge. Source de l'erreur : le lead a lu l'en-tête § « Conditionnement » de la spec (écrit au S50) au lieu de lire `ci.yml`. Depuis #462/S64, le job `e2e` lance DEUX serveurs Next (`:3000` dégradé, `:3001` vérifiant) encadrés par un oracle `probe_mode` — la spec ne skippe pas, elle tourne contre `:3001`. Le commentaire de spec était périmé de quatre sprints. Prévention : toute affirmation sur le comportement CI se vérifie dans `.github/workflows/ci.yml` à l'instant T, jamais dans un commentaire de code qui le décrit. Même famille que [[upstream-blocker-verdict-expires]] — la « retombée CI » d'un briefing n'est pas une source, c'est une hypothèse à valider.


## PIT-S70-002 — « Pré-existant, non lié au sprint » : l'étiquette d'un audit se réfute avec la CI de la base
Au S70, le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts faux, tous deux étiquetés « pré-existant ». (1) « `npm run build` FAIL, page `/terms` manquante » — la page existe, et surtout **la CI de `dev` était verte sur `fd954b2`, la base exacte du sprint**, alors que la CI lance le build. (2) « E2E 4 failed / 247 skipped, serveur `next dev` défaillant » — l'agent avait lancé un build **contre un `next dev` en cours**, piège nommé dans le runbook E2E S47, provoquant le 500 `InvariantError: clientReferenceManifest` qui tue `auth.setup.ts` ; il a donc créé la panne puis l'a imputée au code. Prévention, deux réflexes gratuits : **comparer tout échec dit « pré-existant » à la CI du SHA de base** (`gh run list --branch dev`), et **distinguer « rouge » de « non mesuré »** — une suite dont le `setup` échoue et qui passe 247 specs en `skipped` n'a rien mesuré, ne jamais l'écrire comme un résultat.


## PIT-S70-005 — `check-sprint-completeness.sh` teste LIGNE PAR LIGNE : une négation coupée par un retour à la ligne n'est pas reconnue
Le hook cherche `RECOMMAND_<SPEC>` puis teste, **sur la même ligne**, un motif de négation (`pas de.{0,5}recommand`, `^\s*-?\s*(pas de|aucun)`, `non applicable`, `n/a`…). Au S70, trois négations parfaitement explicites ont été comptées comme signaux non traités uniquement parce que le retour à la ligne d'un paragraphe markdown séparait le « Pas de » du `RECOMMAND_DB_EXPERT`. Symptôme trompeur : `/sprint end` bloque en Phase 1 alors que les `done.md` sont conformes sur le fond. Prévention : dans un `done.md`, écrire **une négation par ligne**, commençant par la négation et portant l'identifiant du signal sur cette même ligne (`- Pas de \`RECOMMAND_X\` : <raison>`). Ne jamais réécrire pour « faire passer » un signal réellement pendant — ici seule la mise en forme était en cause, le fond était déjà correct.


## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)


## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)


## PIT-S71-004 — `mvnw surefire:test` ne recompile PAS les tests : le verdict peut venir d'une classe périmée
`./mvnw -o surefire:test -Dtest=X` n'invoque pas la phase `test-compile` du cycle de vie ; après édition d'un test, c'est le `.class` de la compilation précédente qui tourne. Le rouge (ou le vert) obtenu ne décrit alors pas le code qu'on vient d'écrire. Prévention : `./mvnw -o test-compile` avant tout `surefire:test` ciblé, ou lancer `test` tout court. (Sprint 71 #148)


## PIT-S71-006 — Compter les tests d'un pack coverage par `grep -c '@Test'` est faux dès qu'il existe un `@ParameterizedTest`
Une méthode `@ParameterizedTest` compte pour 1 déclaration et N exécutions (`PasswordPolicyTest` : 4 déclarées / **29 exécutées**). Au S71, la reprise des compteurs de `coverage-auth.md` depuis surefire a corrigé **7 écarts** (total 155 → 172) et exhumé une **classe fantôme inexistante à HEAD** (`JwtServiceSecretValidationTest`, renommée depuis N sprints) : un compteur faux survit indéfiniment parce que rien ne le confronte au réel. Prévention : compter depuis `target/surefire-reports/*.txt` (`Tests run:`), jamais depuis les annotations, et consigner la méthode en tête de pack. (Sprint 71, cycle de correction)


## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)


## PIT-S76-005 — zsh ne fait pas de word-splitting : `git add -- $F` avec une liste de chemins en variable ne stage RIEN
Sous zsh (shell de ce poste), `$F` contenant plusieurs chemins arrive comme **UN SEUL** pathspec : `git add` sort en 128, rien n'est indexé. L'échec est bruyant donc bénin, mais il coûte un aller-retour à chaque agent d'une vague de fan-out — et le même piège produit des FAUX POSITIFS silencieux dans les boucles d'audit (`for tid in $NEW_TESTIDS` du check coverage-E2E a rendu un MAJEUR fantôme au S76). Écrire les chemins littéralement, ou `${=F}`, ou un tableau. À corriger dans les gabarits de briefing qui recommandent « `git add <fichiers exacts>` ». (Sprint 76 #310)


<!-- ===== pit-frontend.md (extrait ciblé issue #169) ===== -->
## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)


## PIT-S60-007 — `npm run typecheck` rouge sur une route FANTÔME : `.next/types` d'un build antérieur
`tsconfig.json:26` inclut `.next/types/**/*.ts`, donc `tsc` type-checke les artefacts d'un build précédent —
au S60, une erreur citant `app/[locale]/settings/page.js`, route disparue au passage en route group. Solution :
rebuild puis re-typecheck. **Prévention : une erreur `tsc` qui ne cite QUE `.next/**` n'est pas imputable à son
propre diff.**


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S64-007 — Un step GitHub Actions dont la dernière commande est `echo >> "$GITHUB_ENV"` NE PEUT JAMAIS ÉCHOUER
Le `echo` rend 0, donc le step sort en succès même si le service lancé juste avant est mort à la seconde 0. Le diagnostic est repoussé au step suivant, qui accuse alors l'attente plutôt que le démarrage (jusqu'à 180 s perdues). Terminer un tel step par un contrôle de vie explicite qui `exit 1`. (Sprint 64, revue)


## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.


## PIT-S72-002 — « `tsc --noEmit` : 0 erreur » dans un rapport d'agent peut être faux — vitest ne typecheck pas
L'agent de #72 a rapporté un typecheck propre ; `i18n-intl-classes.test.ts:65` levait pourtant TS2322 à HEAD. La suite vitest était verte parce qu'elle **ne typecheck pas** : seul le job frontend en CI l'aurait attrapé. L'écart a été trouvé par l'agent de l'autre issue, puis vérifié par le lead. Prévention : rejouer soi-même `tsc --noEmit` avant de reprendre un chiffre de typage dans un audit ; deux rapports d'agent qui se contredisent se tranchent par la mesure, jamais par l'ancienneté du rapport. Voir [[PIT-S71-...]] sur l'étiquette « pré-existant ». (Sprint 72)


## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)


## PIT-S76-007 — Le vérificateur de complétude de sprint lit LIGNE À LIGNE : une négation `RECOMMAND_*` repliée par le formatage compte comme signal NON TRAITÉ
Récurrence mesurée de [[PIT-S70-005]] / [[PIT-S67-004]] au S76 : le done.md de #310 portait « … ; pas\nde `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY_EXPERT` car … ». Le « pas » étant sur la ligne précédente, `check-sprint-completeness.sh` a compté **deux** signaux actionnables non traités et bloqué la clôture. Le piège n'est pas la rédaction mais **le repli à 100 colonnes** appliqué après coup. Écrire chaque négation sur UNE ligne, et le dire dans le done.md pour qu'un reformatage ultérieur ne la casse pas. Même famille : le garde-fou de Phase 9 grep `[MISSING]` littéralement et se déclenche sur la PHRASE QUI LE DOCUMENTE dans l'audit. (Sprint 76, clôture)



## PIT-S77-008 — RTK corrompt `git log -1` ET avale le code de sortie : vérifier HEAD par `git rev-parse`
Au S77, `git log --oneline -1` rendait le **parent** (`1271253`) là où `git rev-parse HEAD` rendait le vrai HEAD (`82d66b9`) — de quoi conclure à tort que le briefing du lead se trompait de base. Et `npx vitest … ; echo $?` rend une chaîne **vide** sous le hook. Le hook réécrit aussi les **arguments** : `npx storybook dev -p 6006` est devenu `storybook dev -p 6006 dev 6006`. Toute vérification de HEAD passe par `git rev-parse`, tout code de sortie et toute commande longue par `rtk proxy`. Élargit [[PIT-S45-003]] et [[PIT-S71-002]]. (Sprint 77)



<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

- **Vague 2, dernière issue du sprint.** #528 et #434 sont livrées et commitées :
  `5650264` (câblage `format:check` + reformatage de 119 fichiers), `fb8c21a` (scope
  `frontend` étendu). Tu travailles sur leur état, pas sur celui du plan.
- `.github/workflows/ci.yml` et `frontend/package.json` étaient réservés à #528 pendant la
  vague 1 : **ils sont à toi maintenant**. Idem `frontend/vitest.config.mts`.
- **Ne modifie PAS** `docs/memory/pitfalls.md` ni les packs `.ai-env/context-packs/pit-*.md` :
  ils sont consolidés par le lead en Phase 2 de `/sprint end`.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-169-done.md`.
- Si tu ajoutes une devDependency frontend (`@vitest/coverage-v8` ou équivalent) :
  `package-lock.json` change, c'est attendu et il est déjà dans `.prettierignore`.
  **Vérifie que la version du provider est compatible avec Vitest `^2.1.9`** — un provider
  majeur en avance casse le run avec un message qui n'a rien à voir.

## Contraintes

- Branche : celle du worktree (`claude/sprint-78-start-5c9db2`, fast-forward de `sprint/78`).
  **Aucune CI ne tourne sur les branches de sprint** (PIT-S64-008) : le premier run réel est
  l'ouverture de la PR. Tu ne peux donc PAS prouver « l'artefact est téléchargeable » par un
  run CI. **Ce que tu dois prouver à la place** :
  1. les deux rapports sont réellement PRODUITS localement (chemins listés par `ls -la`) ;
  2. les chemins déclarés dans les steps `upload-artifact` correspondent EXACTEMENT à ces
     chemins, en tenant compte du `working-directory` du job (le `path:` d'`upload-artifact`
     est relatif à la RACINE du dépôt, **pas** au `working-directory` — c'est le mode d'échec
     classique de cette action, et il produit un artefact vide sans faire rougir le job) ;
  3. le YAML parse et la structure des 7 jobs est intacte.
  Dis explicitement, dans ton done.md, que le téléchargement effectif reste à constater sur le
  premier run de la PR. Ne l'annonce pas comme vérifié.
- Un step `upload-artifact` qui ne trouve rien **warne** au lieu d'échouer. Si tu veux qu'un
  rapport manquant se voie, ajoute `if-no-files-found: error`. Tranche et documente.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant les
  choix (provider de coverage, phase Maven du `report`, périmètre d'exclusion éventuel).
- `git add <chemins explicites>` puis `git commit -m "msg" -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement.
- **Le nouveau gate `format:check` s'applique à toi** : si tu touches `frontend/vitest.config.mts`
  ou tout fichier sous `frontend/` hors `.prettierignore`, lance `npm run format:check` avant de
  committer, sinon tu rends la CI rouge pour un espace.
- Tests attendus avant de conclure, chacun avec son exit code lu sans pipe :
  `npm run test`, `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`
  côté frontend ; côté backend `./mvnw --batch-mode verify` si Docker est disponible, sinon
  `./mvnw help:effective-pom` (et dis que Docker manquait).
- **Ne lance PAS Playwright / E2E.** Le lead s'en charge en Phase 6.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-169-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #169 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<ce qui est câblé, où, avec quelle phase Maven / quel provider vitest ; ce qui a été
délibérément NON fait (seuils) ; chemins d'artefacts et pourquoi ils sont corrects vis-à-vis
du working-directory ; pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>
<preuve d'existence des rapports : ls -la des deux chemins>

## Non vérifié / assumé
<ce que tu n'as PAS pu prouver — en particulier le téléchargement réel de l'artefact,
qui n'existera qu'au premier run de la PR>

## Signaux mémoire
[MEMORY:decision] <une ligne>
[MEMORY:pitfall] <une ligne>   (autant que nécessaire ; écris-les ICI, pas seulement dans ta
                                réponse — c'est ce fichier que le lead consolide)

## Recommandations suite
RECOMMAND_<X> : <raison>
ou une NÉGATION EXPLICITE tenant sur UNE SEULE LIGNE, ex :
"Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête SQL touchée."
(le vérificateur de complétude lit LIGNE À LIGNE — une négation repliée sur deux lignes n'est
pas reconnue : PIT-S67-004 / PIT-S70-005 / PIT-S76-007)
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L|XL | domaine <x>]   (si applicable)

STATUS: COMPLETED
```

Dernière ligne du fichier = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
`BLOQUE_SUR` détaillée juste avant). Rien après.
