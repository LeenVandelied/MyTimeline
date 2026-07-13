# Pitfalls — MyTimeline

> Pièges récurrents consolidés en fin de sprint. 4 lignes max par entrée.

## PIT-S1-001 — @NotBlank sur un DTO de PATCH casse les updates partiels
Un PATCH partiel légitime peut omettre un champ (ex: endpoint « couleurs seules »). `@NotBlank` rejette null ET "" → casse l'omission. Utiliser `@Size(min=1)` (rejette "" mais tolère null) + application conditionnelle `if(!=null)` côté service. Vérifier TOUS les call-sites front avant de poser une contrainte de présence. (Sprint 1 #28)

## PIT-S1-002 — @Valid inerte si le DTO ne porte aucune contrainte
`@Valid` sur un `@RequestBody` ne fait rien si le DTO n'a aucune annotation Bean Validation (`AuthRequest` sans `@NotBlank` → login acceptait un payload vide). Toujours vérifier que le DTO porte des contraintes, sinon `@Valid` est cosmétique. (Sprint 1 #31)

## PIT-S1-003 — jwtService.extractUsername non catché dans un controller → 500
`extractUsername` lève `JwtException` (token malformé/expiré/signature) ; sans try/catch dans le controller → 500 + fuite stacktrace. Centraliser dans un helper `resolveCaller(token)` avec `try/catch (JwtException) → null` mappé en 401. (Sprint 1 #30/#91)

## PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
Le worktree sprint contient des fichiers untracked d'orchestration (`docs/memory/sprints/sprint-N/*` briefings/done.md). `git add -A` les capture par erreur. Stager explicitement les fichiers source/test (`git add <paths>` ciblés). (Sprint 1 correction post-review)

## PIT-S2-001 — Build backend = `cd backend && mvn` (wrapper + helper réparés Sprint 4)
~~Le `mvnw` racine est cassé (`.mvn/wrapper` manquant)~~ **RÉSOLU (Sprint 4, PR #113)** : le wrapper vit désormais dans `backend/` (`backend/mvnw` + `backend/.mvn/wrapper/maven-wrapper.properties`, type `only-script`, Maven 3.9.9, tracké). Le `mvnw`/`mvnw.cmd` racine orphelins (pas de `pom.xml` racine) ont été supprimés. Lancer les tests de l'une de ces façons :
- `./scripts/test-quiet.sh unit` (depuis la racine) — sortie condensée, agrège `Tests run:` + verdict, log complet en `/tmp` ; scopes : `unit|backend|coverage|e2e|frontend|all`.
- `cd backend && ./mvnw test` (wrapper) ou `cd backend && SKIP_DELEGATION=1 mvn -q test` (mvn système).

Un hook PreToolUse bloque `mvn test` nu → préfixer `SKIP_DELEGATION=1` (le helper le fait déjà). Les tests d'intégration tapent une **Postgres jetable Testcontainers** (`@DynamicPropertySource`, port aléatoire) — pas la base dev, et **aucun `DB_PASSWORD` requis** sur le profil `test`. Docker doit tourner. (Sprint 2 #32/#33, réparé Sprint 4)

## PIT-S2-002 — Tester un contrat 401/403 Spring Security exige le full filter chain
`MockMvcBuilders.standaloneSetup` (utilisé par des tests existants) bypasse Spring Security → 401/403 jamais déclenchés = faux verts. Pour valider entryPoint/accessDeniedHandler et l'ownership, utiliser `@SpringBootTest` + `@AutoConfigureMockMvc`. Corollaire : les exceptions levées DANS un filtre ne traversent pas le `@RestControllerAdvice` (hors DispatcherServlet). (Sprint 2 #51)

## PIT-S2-003 — `@Bean` injecté par un filtre lui-même injecté dans la `@Configuration` qui le déclare → cycle
`TimeMeter @Bean` dans `SecurityConfig` → `SecurityConfig` dépend de `RateLimitingFilter` qui dépend du `TimeMeter` produit par `SecurityConfig` en cours de création → `UnsatisfiedDependency "currently in creation"`. Fix : extraire le `@Bean` dans une `@Configuration` dédiée (`RateLimitConfig`). (Sprint 2 #33)

## PIT-S2-004 — `getServletPath()` vide en MockHttpServletRequest → matcher de Filter cassé
Dans un `Filter` testé via MockMvc, `request.getServletPath()` retourne `""` → le path-matching échoue silencieusement. Utiliser `getRequestURI()` (rempli en test ET prod, context path vide ici). (Sprint 2 #33)

## PIT-S2-005 — Ne jamais faire confiance à `X-Forwarded-For` par défaut pour une clé de sécurité
Rate-limit keyé sur `X-Forwarded-For` sur endpoint `permitAll` non authentifié → l'attaquant fait tourner le header à chaque requête → bucket neuf à chaque appel → contournement trivial. Keyer sur `getRemoteAddr()`, confiance XFF opt-in par config (`app.rate-limit.trust-forwarded-header`, défaut false, n'honorer que derrière reverse proxy de confiance). Vaut pour toute IP-allowlist/rate-limit. (Sprint 2 #33 fix review)

## PIT-S3-001 — `ddl-auto=update` ne fiabilise PAS les contraintes UNIQUE
Malgré `@Column(unique=true)` (posé #32), le dump live de la base dev générée en `update` ne contenait AUCUNE contrainte unique. `update` est best-effort et silencieux. Toujours poser les contraintes (unique, check, FK nommées) explicitement en migration, jamais compter sur `update`. (Sprint 3 #42)

## PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
Un secret committé dans un fichier déjà tracké (`application.properties`) reste suivi même après ajout d'une règle `.gitignore` correcte. Soit neutraliser le fichier (secrets → `${VAR}`, le garder tracké mais sûr — approche Spring retenue), soit `git rm --cached`. La simple correction du chemin dans `.gitignore` est cosmétique. (Sprint 3 #34)

## PIT-S3-003 — `validate` actif : toute colonne entité doit matcher EXACTEMENT la colonne SQL
Avec `ddl-auto=validate` (Flyway source de vérité), un `@Column(nullable=false)` qui ne matche pas un `NOT NULL` côté migration (type/nullability) fait échouer le boot → TOUS les `@SpringBootTest` cassent. Croiser type + nullability entité↔migration avant run. Colonne ajoutée à une table peuplée = `DEFAULT` obligatoire (backfill). (Sprint 3 #43)

## PIT-S3-004 — Baseline Flyway depuis métadonnées Hibernate omet les contraintes legacy hors-Hibernate
V1 baseline généré via export `schema-generation` Hibernate reflète ce qu'Hibernate CROIT, pas la base dev réelle. Les contraintes ajoutées hors Hibernate (CHECK `events_type_check`, NOT NULL, types serrés) sont absentes de V1 → un déploiement frais (CI/prod) diverge de dev. `validate` ne détecte ni CHECK ni NOT NULL → drift invisible. Préférer `pg_dump --schema-only` pour la baseline, ou auditer pg_dump vs V1. (Sprint 3 #42, suivi #108)

## PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
Le subagent travaille par défaut dans `/Users/herrh/VSProjects/MyTimeline` (branche `dev`), PAS dans le worktree sprint → le commit atterrit sur `dev`. Épingler le chemin absolu du worktree dans CHAQUE briefing + « vérifie `git branch --show-current`==sprint/N avant commit ». Après chaque spawn : vérifier `git log -1` sprint/N ET que `dev` n'a pas bougé. Recovery : cherry-pick sur sprint/N + reset dev (stash le WIP du checkout principal d'abord). (Sprint 3 #34)

## PIT-S4-001 — MockMvc `standaloneSetup` n'enregistre PAS le `@RestControllerAdvice`
Un test `standaloneSetup(controller)` sur un endpoint qui `throw` une exception interceptée par un `@RestControllerAdvice` (ex `AccessDeniedException` → `GlobalExceptionHandler`) laisse l'exception se propager → le test casse. Ajouter `.setControllerAdvice(new GlobalExceptionHandler())` au builder. `@WebMvcTest` chargerait l'advice automatiquement. ⚠️ corollaire : ce test valide alors le chemin advice, PAS le chemin réel prod où le filtre Security intercepte `AccessDeniedException` AVANT le DispatcherServlet (voir PAT-S2-002). (Sprint 4 #100)

## PIT-S4-002 — MockMvc `standaloneSetup` ne résout pas les champs `@Value`
Les `@Value("${...}")` d'un controller ne sont jamais injectés hors contexte Spring complet → restent à `null`/`false` en `standaloneSetup`. Les fixer via `ReflectionTestUtils.setField(controller, "champ", valeur)` dans `@BeforeEach`. (Sprint 4 #99)

## PIT-S4-003 — Le header CSP backend ne régit QUE les réponses de l'origine backend
Avant de relâcher `'unsafe-inline'` sur `style-src`/`script-src` « à cause de Tailwind/Next.js » : le CSP émis par l'API backend ne s'applique qu'aux réponses servies par le backend (JSON). Le front Next.js tourne sur sa propre origine sous sa propre CSP → le CSS inline Tailwind n'est jamais concerné par ce header. `style-src 'self'` strict est donc possible côté backend. Toujours identifier QUI émet le header avant d'assouplir. (Sprint 4 #101)

## PIT-S4-004 — Matcher Mockito ambigu sur méthode surchargée
`JwtService.generateToken(String)` ET `generateToken(Authentication)` : un `when(...generateToken(any()))` est ambigu et peut câbler le mauvais overload. Typer le matcher : `any(Authentication.class)`. Vaut pour toute méthode surchargée mockée. (Sprint 4 #104)

## PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
Un subagent qui fait `git add -A`/`git add .` capture les fichiers scratch non suivis du lead (`docs/memory/sprints/sprint-N/*`, `sprint-history.md` modifié) → commit pollué. Staging explicite par chemin OBLIGATOIRE (`git add <paths>`). Récurrent S4 (#105, #99, fix review). Corollaire rtk : `git add file1 \<newline> file2` casse (pathspec) → commande mono-ligne. (Sprint 4)

## PIT-S5-001 — Baseline Flyway générée depuis Hibernate metadata = drift silencieux
`ddl-auto=validate` ne valide ni CHECK, ni NOT NULL, ni longueur varchar → une baseline V1 générée depuis les métadonnées Hibernate (pas `pg_dump`) omet ces garde-fous présents sur la base dev legacy. Sur déploiement frais (CI/prod 1er run) la table est créée sans eux → divergence inter-environnements. Fix : réconcilier via migration séparée (DROP CONSTRAINT IF EXISTS + ADD ; CHECK nullable `col is null or col in (...)` pour colonnes conditionnellement requises). Idéal : générer toute baseline depuis `pg_dump --schema-only` de la base réelle. (Sprint 5 #108)

## PIT-S5-002 — Migration durcissante + `baseline-on-migrate=true` s'applique aux bases PEUPLÉES
`SET NOT NULL` / `varchar(255)→varchar(20)` / `ADD CHECK` posés par une migration s'exécutent aussi sur la base dev réelle (et prod), pas seulement sur les bases fraîches CI/Testcontainers vides. Données non conformes (NULL, >20 chars, hors enum) → échec ALTER cryptique → boot KO. Fix : bloc PL/pgSQL pré-vol en tête de migration qui `RAISE EXCEPTION` avec compteurs actionnables (NULL/oversize/hors-enum) si données sales — SANS coercition silencieuse (une ligne non conforme est un bug de données, le dev tranche). Base vide → compteurs 0 → continue. (Sprint 5 #108, review #121)

## PIT-S5-003 — Exception Security jamais routée vers le `@RestControllerAdvice` (corollaire 401)
Étend PIT-S4-001/PAT-S2-002 à `AuthenticationException` : en prod l'`ExceptionTranslationFilter` intercepte AVANT le `DispatcherServlet` → un `@ExceptionHandler(AuthenticationException|AccessDeniedException)` dans l'advice est du dead code, même pour une exception métier levée en contrôleur. Uniques points de vérité : `SecurityConfig.authenticationEntryPoint` (401) et `accessDeniedHandler` (403). Tester en `@SpringBootTest` (filtre actif), jamais `standaloneSetup`. Risque additionnel : l'advice produit un corps de forme différente → divergence de contrat. (Sprint 5 #119, review #121)

## PIT-S5-004 — Worktree partagé multi-agents (fan-out /sprint, même working tree)
`git stash` global aspire les fichiers des issues sœurs en vol + `./mvnw test` régénère `application.properties` (conflit au `stash pop`). Récupérer ses fichiers par chemin (`git checkout stash@{0} -- <f>`), commit TOUJOURS par chemins explicites, jamais `git add -A` ni stash global. Corollaire : le linter du repo revert les commentaires ajoutés à `application.properties` après Edit → re-Read + ré-Edit. (Étend PIT-S4-005.) (Sprint 5)

## PIT-S7-001 — jsdom n'exécute pas `window.location.href=` (no-op silencieux)
En test jsdom, assigner `window.location.href` ne déclenche aucune navigation ni erreur → asserter `window.location.pathname` après coup échoue silencieusement. Fix : stub `window.location` via `Object.defineProperty(configurable)` + setter `href` capturant la cible, restaurer le descriptor en `finally`. (Sprint 7 #40)

## PIT-S7-002 — TanStack Query v5 : `staleTime:Infinity` + `initialData` fige la valeur du premier render
Avec `initialData` valant `null` (AuthContext pas encore réhydraté) + `staleTime:Infinity`, la query fige `null` et ne re-run jamais `queryFn` → data reste null. Fix : `placeholderData` + `enabled:!loading`, `queryFn` relit l'état courant. (Sprint 7 #48)

## PIT-S7-003 — Logger l'objet axios `error` brut expose le password en clair
`console.error(msg, error)` sérialise `error.config.data` = body de la requête → sur login/register, le password plaintext finit dans la console navigateur (et breadcrumbs Sentry), même après avoir nettoyé `error.config.headers`. Fix : logger un message assaini (`error.message` / `{status}`), jamais `error` ni `error.config`. (Sprint 7 review PR #132)
> **Récurrent (Sprint 11 review PR #157)** : le pattern réapparaît à chaque nouveau `catch(error)`. Instances : `productService`/`categoryService`, `dashboard/page.tsx:98` (logout), `authService.ts:61` (refreshToken, hors scope PR → follow-up). Solution durcie : helper partagé exporté `safeErrorMessage(error)` dans `frontend/src/lib/safe-error.ts` (retourne `[status] message`, jamais l'objet). **Réflexe review : grep `console\.(error|warn|log)\(.*,\s*error` sur tout diff touchant un `catch` frontend.**

## PIT-S8-001 — `next build` CSR bailout : `useSearchParams()` sans `<Suspense>`
Un composant client lisant `useSearchParams()`/`usePathname()` sans frontière `<Suspense>` fait échouer `next build` (prerender, "missing-suspense-with-csr-bailout") ALORS QUE les tests RTL passent (mock synchrone) → détecté seulement en CI. Fix : extraire la lecture query-params dans un sous-composant enveloppé `<Suspense fallback={<Spinner/>}>`, garder le default export comme wrapper (préserve le montage des tests). Préférer à `force-dynamic` (garde le SSG). (Sprint 8 #53 CI)

## PIT-S8-002 — Anti-énumération : vérifier le TIMING, pas que le code retour
Un endpoint « toujours 200 » (forgot-password) fuite quand même l'existence d'un compte si la branche « trouvé » fait un travail synchrone lourd (lookup + INSERT + HTTP externe) vs « inconnu » qui retourne vite → délai mesurable = side-channel. Fix : déporter le travail branche-dépendant en `@Async` (retour immédiat, temps quasi constant). Chercher ce pattern dans tout flux similaire (invite, magic-link). (Sprint 8 #49 security)

## PIT-S8-003 — Tester `@Async` : mocker les ports + latch, pas de DB réelle
Vérifier un `@Async` en seedant une DB réelle échoue (`@Version` null sur entité détachée, 409 register sur données partagées entre classes — conteneur Postgres singleton sans cleanup). Fix : tester le proxy `@Async` via contexte Spring avec ports `@MockBean` + latch sur l'effet asynchrone, asserter le retour-avant-latch. (Sprint 8 #49fix)

## PIT-S8-004 — (orchestration) L'audit tests ne lance PAS `next build`
Le test-runner/audit Phase 6 lance les tests unitaires/RTL mais pas le build de production → un build cassé (ex PIT-S8-001) passe tous les tests et n'est détecté qu'en CI (merge bloqué tardivement). Ajouter `npm run build` (frontend) à l'audit quand des pages App Router / query-params sont touchées. (Sprint 8 méta)

## PIT-S8-005 — `React.use(params)` (Next async params) incassable en vitest
React 18.3.1 n'expose pas `use` → un test de page App Router avec `params`/`searchParams` async plante. Fix : `vi.mock('react', ...{ use: () => ({locale:'fr'}) })` + mocker aussi `useLocale` de next-intl (utilisé par les composants layout type `LanguageSelector`). (Sprint 8 #53)

## PIT-S9-001 — CHECK constraint legacy bloque la conversion d'une colonne vers un enum
Migrer une colonne texte-libre vers un `@Enumerated(STRING)` : si une `CHECK (col IN ('weeks','months','years'))` existe (posée par une migration antérieure, ici V4), tout `UPDATE` de conversion vers les nouvelles valeurs (`WEEK/MONTH/YEAR`) est rejeté. Fix : `DROP CONSTRAINT IF EXISTS` AVANT l'UPDATE, convertir, puis reposer un CHECK aligné sur `name()` de l'enum. Prévention : `grep -rn "ck_\|CHECK" db/migration/` avant de migrer une colonne enum-isée. (Sprint 9 #44)

## PIT-S9-002 — br-auth pack pointe `useAuth.ts` mais la vraie source PII est `AuthContext.tsx`
Le pack `br-auth.md` cite `useAuth.ts` / `localStorage` pour l'anti-pattern A17, mais `useAuth.ts` n'est qu'un ré-export du contexte : la persistance réelle vit dans `frontend/src/contexts/AuthContext.tsx`. Toujours `grep -rn "localStorage" frontend/src/` pour localiser la vraie source avant de traiter — ne pas se fier au chemin cité par le pack. (Sprint 9 #135)

## PIT-S9-003 — Audit PII : `grep localStorage` seul insuffisant avec TanStack Query
Un cache TanStack Query peut ré-introduire silencieusement de la PII sur disque via `persistQueryClient`/`createSyncStoragePersister`. Un audit « aucune PII persistée » doit vérifier `localStorage`/`sessionStorage` ET l'absence de persister TanStack (ici : `QueryClient` in-memory pur → OK). Étendre à tout store persistant (redux-persist, zustand persist). (Sprint 9 #135 security)

## PIT-S10-001 — Ajout d'un `owner_id` : scoper la MUTATION mais pas la LECTURE laisse une fuite cross-tenant
En introduisant l'ownership catégorie (#52), le PATCH/DELETE ont été scopés (403 si `owner_id != caller`), mais `GET /api/categories` renvoyait encore `findAllCategories()` (toutes les catégories de tous les users) ET le DTO de sortie `CategoryResponse` exposait l'`ownerId` (UUID user) → fuite cross-tenant + oracle d'énumération d'UUID, détectée seulement au `/review-pr`. Fix : scoper AUSSI les GET (`owner = caller OR owner IS NULL` pour la liste, 404 anti-énumération sur le GET by-id d'une ressource d'autrui) et ne JAMAIS exposer l'UUID owner en sortie (booléen `system` dérivé). Prévention : quand on ajoute un `owner_id`/champ d'ownership à une ressource, auditer TOUS les verbes (GET list + GET by-id + writes) ET le DTO de réponse, pas seulement les writes. (Sprint 10 #52, review PR #153)

## PIT-S10-002 — `@ExceptionHandler(DataIntegrityViolationException)` global masque toutes les violations en 409
Ajouter un handler global `DataIntegrityViolationException → 409` pour rattraper une race d'unicité mappe AUSSI toutes les autres violations de contrainte (FK RESTRICT, NOT NULL, futures contraintes) sous le même 409 trompeur, cachant de vrais bugs (500 légitimes). Fix : scoper le catch au plus près — `try/catch DataIntegrityViolationException → CategoryNameConflictException` autour du seul `save()` concerné, dans le service ; pas de handler global fourre-tout. (Sprint 10, review PR #153)

## PIT-S10-003 — `repository.save(mapper.toEntity(domain))` d'un update, domaine sans `@Version`
Update read-modify-persist où le domaine n'a pas de champ `@Version` : reconstruire une entité JPA détachée via mapper donne `version=null` → `SimpleJpaRepository.save` route vers `persist()` (échec « uninitialized version ») puis `merge()` → `OptimisticLockException` (null vs v0). Fix : dans l'adapter JPA, CHARGER l'entité gérée (`findById`) et recopier les champs mutables (update-in-place), au lieu de persister un graphe détaché reconstruit. (Sprint 10 #50)

## PIT-S10-004 — `@SQLRestriction` masque les lignes lors des opérations transverses (réassignation/comptage) → orphelins FK
Une entité portant `@SQLRestriction("archived=false")` : tout `count`/`update` via HQL/JPQL ou dérivé Spring Data IGNORE les lignes archivées. Lors d'une réassignation de FK (déplacer les produits d'une catégorie vers une autre avant suppression), les produits archivés ne sont PAS déplacés → violation FK / orphelins à la suppression. Fix : SQL natif (`@Query(nativeQuery=true)`, params bindés) pour ces opérations transverses. Corollaire : réassigner AVANT de supprimer, dans la même `@Transactional` (rollback atomique) ; ET rejeter `cible == source` avant la réassignation (sinon no-op + delete → même FK/orphelins). (Sprint 10 #52, review PR #153)

## PIT-S10-005 — Valider l'ownership de la ressource CIBLE, pas seulement de la ressource parente
Un endpoint qui prend un `<X>Id` en entrée (ex : `categoryId` à l'assignation/création d'un produit) doit valider l'ownership de la CIBLE (`X.ownerId == caller || X.ownerId == null`), pas seulement l'ownership de la ressource parente. Sinon : linkage cross-tenant (rattacher son produit à la catégorie d'autrui) + oracle 404/200 pour énumérer les UUID d'autrui. Fix : helper `resolveAssignableCategory` centralisant le check ; lever une 404 (`NotFoundException`) et non 403 pour toute ressource d'autrui (ferme l'oracle d'énumération). (Sprint 10 #50 review, PR #153)

## PIT-S11-001 — Radix Select/Dialog en test Vitest+jsdom : Pointer Capture / scrollIntoView manquants
jsdom n'implémente pas `HTMLElement.prototype.{hasPointerCapture,setPointerCapture,releasePointerCapture,scrollIntoView}` → un Radix Select/Dialog plante dès l'ouverture en test RTL. Fix : stubber ces 4 méthodes une fois dans `frontend/vitest.setup.ts` (bénéficie à tout composant Radix). Corollaire : ne PAS fixer manuellement `id`+`aria-describedby` sur `DialogContent` — laisser `DialogDescription` auto-câbler, sinon warning Radix « Missing Description ». (Sprint 11 #65)

## PIT-S11-002 — Tester le rejet d'une mutation TanStack v5 en isolation → unhandled rejection au runner
`renderHook` + `mutateAsync`/`mutate` d'une mutation qui rejette (test isolé du hook) fait remonter une unhandled rejection au runner Vitest MALGRÉ `MutationCache.onError` → suite polluée (stderr) même si l'assertion passe. Fix : ne pas tester le chemin d'erreur au niveau hook ; couvrir la propagation d'erreur end-to-end au niveau composant (ex : ProductDrawer affiche 409 inline). Tests de hook = happy-path + garde d'input uniquement. (Sprint 11 #61)

## PIT-S11-003 — Assouplir un schéma Zod (désync DTO) sans auditer les schémas DÉRIVÉS qui l'héritent
Corriger une désync Zod↔DTO sur un champ (ex `productCreateSchema.name` min(3)→min(1) pour BR-PRO-001) sans vérifier les schémas COMPOSÉS qui réutilisent une contrainte plus stricte laisse un bug latent : `productCreateSchema.events = z.array(eventCreationSchema)` et `eventCreationSchema.name` était resté à `min(3)` → un produit 1-2 car. + premier événement couplé (dont le nom dérive du nom produit) faisait throw `parse` côté client → erreur générique, produit non créé. Détecté seulement au `/review-pr`. Fix : aligner `eventCreationSchema.name` sur le DTO backend `EventCreationRequest @Size(min=1,max=100)`. Prévention : à chaque fix de désync Zod↔DTO, `grep` les schémas qui composent/dérivent le schéma corrigé. (Sprint 11 #157 review)

## PIT-S12-001 — `*RepositoryJpaImpl.save` reconstruisant une entité détachée (version=null) au PATCH
Récurrence de [[PIT-S10-003]] côté events : `EventRepositoryJpaImpl.save` faisait `save(mapper.toEntity(domain))` → entité détachée `@Version=null` → au PATCH (id existant) `SimpleJpaRepository.save` route vers `persist()` → « uninitialized version value » (500). Non détecté avant #54 faute de test PATCH d'intégration. Fix : update-in-place (`super.findById` → recopie des champs mutables → save). Prévention : tout `*RepositoryJpaImpl.save` DOIT charger l'entité gérée en UPDATE ; domain models sans `@Version` = piège systémique. (Sprint 12 #54)

## PIT-S12-002 — Retirer un appel repo casse les stubs Mockito strict des AUTRES tests
Supprimer un `existsById` d'une méthode service (#95 findEventById) a fait échouer des tests SANS rapport logique : `updateEvent` stubbait encore `existsById=true` → `UnnecessaryStubbingException` (strict stubbing) au run, pas via l'assertion. Fix : purger les stubs devenus inutiles dans TOUS les tests appelant la méthode refactorée. Prévention : après suppression d'un appel repo, `grep` les `when(repo.<méthode>(...))` dans le fichier de test. (Sprint 12 #95)

## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)

## PIT-S13-001 — Purge multi-tables d'un user : `@SQLRestriction` masque les lignes archivées → FK résiduelle bloque le DELETE
`DELETE /api/me` (#78) : `ProductEntity` porte `@SQLRestriction("archived = false")` → toute lecture JPA (findAll/findByUserId) IGNORE les produits archivés. Supprimer via une lecture JPA puis `delete` laisse les produits archivés en base → leur FK `user_id` fait échouer le `DELETE users`. Fix : **SQL NATIF bindé** (`entityManager.createNativeQuery("delete from products where user_id=:uid")`) pour products ET events (events via sous-select `product_id` car pas de `user_id`). Prévention : toute purge transverse d'une entité soft-delete → natif, jamais HQL/JPA. (Sprint 13 #78)

## PIT-S13-002 — Nouvel appel de port dans un handler → stub Mockito manquant = 401 faux négatif
Le fix révocation `/me` (#73/review) ajoute `sessionService.isSessionActive(jti)` dans `AuthController.getUserDetails`. Les tests slice `standaloneSetup`/Mockito de `/me` et `/refresh` nominaux ne stubbaient pas ce mock → `isSessionActive(any())` renvoie `false` par défaut → 401 faux négatif. Fix : `when(sessionService.isSessionActive(any())).thenReturn(true)` dans les tests nominaux. Prévention : à chaque nouvel appel de port ajouté dans un handler, auditer les tests slice/unit qui le couvrent. (Sprint 13 #73)

## PIT-S13-003 — `jwt.secret` de profil test non-Base64 → `generateToken` DecodingException
Aucun test n'exerçait le login RÉEL avant #73 ; le premier test qui émet un token a révélé que le `jwt.secret` du profil test (`'-'`) n'est pas Base64 valide → `generateToken` lève `DecodingException`. Fix : override d'un secret Base64 valide via `@SpringBootTest(properties="jwt.secret=...")`. Prévention : tout test exerçant l'ÉMISSION d'un token doit fournir un secret Base64 valide. (Sprint 13 #73)

## PIT-S13-004 — `SecurityContext` thread-local fuité d'un test slice pollue les tests full-chain suivants
Un test `standaloneSetup` qui pose une `Authentication` laisse le `SecurityContextHolder` thread-local rempli → un test `@AutoConfigureMockMvc` suivant hérite du contexte et le `JwtFilter` saute la vérif de révocation (faux vert). Fix/Prévention : `SecurityContextHolder.clearContext()` en `@BeforeEach`/`@AfterEach` des tests full-chain qui suivent des slices posant une Authentication. (Sprint 13 #73)

## PIT-S14-001 — jjwt 0.12+ : `signWith(key)` seul déduit l'algo selon la taille de clé → figer l'algo
Depuis jjwt 0.12, `signWith(key)` sans algo explicite déduit HS256/384/512 de la taille de la clé HMAC → un changement de secret peut faire dériver l'algo et casser la vérification des tokens déjà émis. Fix/Prévention : toujours figer explicitement `signWith(key, Jwts.SIG.HS256)` à l'upgrade jjwt. API 0.13 breaking : `parserBuilder()`→`parser()`, `setSigningKey`→`verifyWith`, `parseClaimsJws`→`parseSignedClaims`, `getBody`→`getPayload`, `Key`→`SecretKey`. (Sprint 14 #162)

## PIT-S14-002 — Architect Phase 0.5 « aucune evidence » faux négatif : lire le fichier cible réel, pas grep du nom d'exception
Sur S14, l'architect a marqué #164 (et partiellement #168) `possibly_done: false` / « aucune evidence » alors que le fix existait déjà en `dev` (commit #54). Le pack `br-events.md` (annoté « ✅ RÉSOLU ») avait raison ; l'architect avait tort (grep du nom d'exception ≠ lecture du code). Coût évité grâce aux garde-fous fullstack-dev qui vérifient `git log`/le fichier réel avant de coder → aucun faux respawn, mais l'annotation reste trompeuse. Prévention : Phase 0.5 doit lire le fichier cible réel + `git log -- <fichier>` avant de conclure « aucune evidence ». (Sprint 14 #164/#168)

## PIT-S15-001 — `next dev`/`next build` réécrit `next-env.d.ts` → casse `npm run lint`
Next régénère `next-env.d.ts` en ajoutant `/// <reference path="./.next/types/routes.d.ts" />` → `@typescript-eslint/triple-slash-reference` fait échouer `npm run lint`. Revert le fichier (`git checkout frontend/next-env.d.ts`) APRÈS tout build/dev, AVANT commit. (Sprint 15 #163)

## PIT-S15-002 — E2E full-stack cross-port : cookie JWT SameSite=Lax non envoyé sur POST
Front :3000 → API :8080 = cross-site pour les cookies. `SameSite=Lax` envoie le cookie `jwt` sur les GET mais PAS sur POST/PATCH/DELETE XHR → 401 sur toute création. Fix E2E : proxy Next `rewrites` same-origin gaté par `E2E_API_PROXY_TARGET` (absent en prod/build → comportement inchangé). En prod, front+API même domaine = pas de souci. (Sprint 15 #163)

## PIT-S15-003 — `JWT_SECRET` CI doit être Base64 valide ≥32 octets
`JwtService` fait `Decoders.BASE64.decode(secret)` puis exige ≥32 octets (HS256). Un secret non-Base64 (`-`/`_` ou hors alphabet) fait lever `generateToken` → `/auth/login` renvoie 500 générique. Le secret CI doit être une chaîne Base64 valide. (Sprint 15 #163)

## PIT-S15-004 — `next build` (ESLint strict) échoue là où vitest+tsc passent ; commitlint header ≤100
Un run vitest + `tsc --noEmit` verts ne garantissent PAS `next build` (ESLint strict, ex. `no-unused-vars` sur destructure `{k: _k, ...rest}` → préférer `delete obj.k`). Vérifier `next build` avant de conclure. Aussi : commitlint `header-max-length:100` (gitmoji) → header de commit ≤100 caractères. (Sprint 15 #150)

## PIT-S16-001 — ArchUnit : exception croisée = UN prédicat combiné, pas deux `dependOnClassesThat` chaînés
`noClasses().should(A).andShould(B)` signale une classe qui satisfait A ET B. Pour "interdire spring/jakarta SAUF jakarta.validation", chaîner `resideInAnyPackage(...).andShould().dependOnClassesThat().resideOutsideOfPackage("jakarta.validation..")` NE marche PAS : la 2e condition ("dépend d'≥1 classe hors jakarta.validation") est trivialement vraie (java.lang.*) → exception neutralisée, et `FreezingArchRule` gèle le faux positif silencieusement. Utiliser un `DescribedPredicate` unique : `resideInAnyPackage(X).and(DescribedPredicate.not(resideInAPackage(Y)))`. Toujours valider une exception ArchUnit par un probe qui la FAIT échouer avant de geler. (Sprint 16 #166)

## PIT-S16-002 — Subagent en worktree : `cd` Bash résout sur le repo principal
Un subagent lancé depuis un worktree peut voir son `Bash cd <chemin relatif>` résoudre sur le repo principal (`dev`) au lieu du worktree → fichiers écrits au mauvais endroit, faux KO. Solution : chemins ABSOLUS du worktree + `git -C <worktree>`, vérifier `git branch --show-current` AVANT chaque écriture (pas seulement avant commit). (Sprint 16 #166)

## PIT-S16-003 — Codemod `storybook upgrade` laisse des packages périmés dans package.json
`npx storybook@latest upgrade` renomme le framework dans main.ts et réduit les addons, MAIS laisse les anciens packages (`@storybook/experimental-nextjs-vite`, `@storybook/test`) dans package.json (`storybook doctor` "Incompatible Packages"). Solution : retirer à la main + ajouter `@storybook/nextjs-vite`/`@storybook/react-vite`, `npm install`. Prévention : `git diff package.json` post-codemod, grep global `@storybook/react`/`@storybook/test` pour les imports stories. (Sprint 16 #46)

## PIT-S16-004 — id généré via compteur module-level → mismatch d'hydratation SSR
Un id (ex. `aria-describedby`) construit via `let seq = 0` + `++seq` au render diverge entre serveur et client (Next SSR) → mismatch d'hydratation. `useMemo` ne garantit pas la stabilité et un `++` en effet de bord y est un anti-pattern. Utiliser `React.useId()` (dispo React 18.3.1). (Sprint 16 #46, review PR#189)

## PIT-S17-001 — Migration vers classes DS `.mt-*` : vérifier que `globals.css` importe la feuille DS
Migrer un composant vers les classes `.mt-*` (`ds/components/*.css`) ne suffit pas si `globals.css` n'`@import`e pas ces feuilles : les classes existent mais ne sont PAS stylées au runtime (le composant paraît nu, aucune erreur). La feuille DS `styles.css` n'est pas linkée par l'app (décision #45 : chargée côté Storybook seulement). Fix : ajouter les `@import` `ds/components/core.css`+`timeline.css` dans `globals.css`. Prévention : avant migration `.mt-*`, confirmer que la feuille correspondante est chargée par `globals.css`. (Sprint 17 #55)

## PIT-S17-002 — Concat de classes CSS en template string : l'espace séparateur saute silencieusement
`` `base${cond ? ' mod' : ''}` `` peut produire `basemod` (espace perdu) → classe invalide `mt-xmt-y` non appliquée, sans erreur. Préférer un ternaire renvoyant la classe complète ou `[...].filter(Boolean).join(' ')`. (Sprint 17 #55)

## PIT-S17-003 — Réécriture de composant : un `data-testid`/contenu couvert par E2E mais pas par l'unit se perd silencieusement
La réécriture `TimelineCalendar`→`TimelineView` (#55) a droppé le rendu de `resource.title` + son `data-testid="timeline-resource-title"`, couvert par le golden-path E2E mais PAS par l'unit test (qui n'assertait que le NOMBRE de lanes). Vitest+tsc verts, mais CI e2e rouge post-push. Prévention : lors d'une réécriture/extraction, grep les `data-testid` de l'ancien composant et vérifier qu'ils survivent OU que l'e2e/unit est mis à jour dans le même commit ; un unit test qui COMPTE des éléments sans asserter leur CONTENU ne protège pas contre une perte de contenu. (Sprint 17 #55, review PR#194)

## PIT-S18-001 — Migration modèle 1-couleur (BR-EVE-009) : appliquer AUSSI à la vue lecture, pas que le formulaire
Le refactor #66 a migré `EventEditForm` (preview) au modèle 1-couleur + encre de contraste, mais a laissé `EventContent.tsx` (barre calendrier + bloc vue lecture) avec `borderColor` résiduel (modèle 3-couleurs) et `text-white`/`#ffffff` hardcodé illisible. Vitest vert, mais rendu réel de l'event divergent/illisible sur couleurs claires — attrapé seulement par la review. Prévention : quand une BR de couleur/contraste change côté formulaire, grep `borderColor|borderWidth|text-white|#ffffff|#FFFFFF` sur TOUTE la feature (form ET vues de rendu) avant merge ; le preview d'édition n'est pas la seule surface. (Sprint 18 #66, review)

## PIT-S19-001 — Subagent lancé depuis un worktree : les écritures dérapent vers le repo principal (raffinement worktree-cwd)
Un fullstack-dev spawné dans un worktree lit bien le worktree (Read initial OK) MAIS ses `Write`/`Edit` + `cd` bash peuvent écrire dans le REPO PRINCIPAL : le cwd bash se reset au repo principal entre appels. En Sprint 19, #63 a codé dans `/Users/herrh/VSProjects/MyTimeline/frontend` (repo principal, SANS le commit #192), puis recopié main→worktree en écrasant l'intégration `<EventPill>` de #192 (regression détectée par le lead à la vérification post-vague, corrigée en `a0a94f1`). Le garde-fou HEAD **au début** NE SUFFIT PAS — c'est l'écriture qui dérape. Prévention : chemins ABSOLUS sous le worktree, `git -C <worktree>` pour tout git, et vérifier `git status` du worktree APRÈS chaque batch d'écriture. Aggravation si le repo principal n'a pas les commits des vagues précédentes → clobber silencieux. (Sprint 19 #63, incident merge)

## PIT-S19-002 — Imports inutilisés dans un test : vitest vert mais `next build` (eslint strict) rouge en CI
`import { ..., beforeEach, afterEach } from 'vitest'` non utilisés passent `vitest run` ET `tsc --noEmit` sans broncher, mais `next build` (qui lance `next lint`, `ignoreDuringBuilds:false`) échoue sur `@typescript-eslint/no-unused-vars` → "Failed to compile", CI rouge. En Sprint 19 le test-runner rapportait "eslint 0 issue" (scope/config différents de `next lint`). Prévention : avant push, lancer `npx next lint --max-warnings=0` (= le lint du build) OU `next build` complet ; `tsc --noEmit` + vitest verts ne garantissent PAS le build. Cf. cp-frontend. (Sprint 19, CI build)

## PIT-S20-001 — Convertir une clé i18n string→objet casse les autres consommateurs (next-intl)
Passer une clé `dashboard.products` de string à objet (`dashboard.products.list`, ...) fait échouer next-intl si un autre composant consomme encore la clé comme string (interdit string+objet sur la même clé). En Sprint 20, `dashboard.products` était encore lu par `TimelineCalendar.tsx` → collision. Fix : namespace séparé (`dashboard.productList`). Prévention : `grep -rn "dashboard.products"` (tous les consommateurs) AVANT de convertir la forme d'une clé i18n. (Sprint 20 #80)

## PIT-S20-002 — Masquer une scrollbar scroll-x : `scrollbar-width:none` seul ne suffit pas sous Chromium
`base.css` impose une scrollbar webkit globale (`*::-webkit-scrollbar` 10px) → `scrollbar-width:none` (ou `scrollbarWidth:none` inline) est ignoré côté Chromium, la scrollbar reste visible sur les carousels/rubans scroll-x. Fix durable : utility dédiée `@utility scrollbar-none { scrollbar-width:none; &::-webkit-scrollbar { display:none } }` (globals.css). Prévention : pour tout conteneur `overflow-x:auto` sans scrollbar, utiliser l'utility, pas la propriété seule. (Sprint 20 #83)

## PIT-S20-003 — Wrapper `rtk git diff` en 3-dots renvoie vide silencieusement (outillage review)
Sur ce repo/env, `git diff a...b` passé via le wrapper `rtk` retourne une sortie VIDE sans erreur → un reviewer/agent croit à tort qu'il n'y a aucun changement. Prévention : pour les diffs de review (surtout 3-dots `origin/dev...HEAD`), utiliser `/usr/bin/git` directement (bypass wrapper), ou `gh pr diff <PR>`. (Sprint 20, review PR #208)

## PIT-S21-001 — Sprint depuis worktree : le garde-fou EFFICACE est un bloc en tête de briefing (pas « vérifie avant commit »)
Rappel du piège (cf. auto-memory `sprint-subagent-worktree-cwd`) : un subagent lancé depuis `.claude/worktrees/*` défaut-cwd sur le repo principal (`dev`) et écrit au mauvais endroit. En S21, les briefings à garde-fou faible (« vérifie la branche avant de commit ») ont ENCORE laissé #75 et #86 détourer (~10 min/agent + résidus untracked à nettoyer sur `dev`). Ce qui a marché pour #87 + correction : un bloc `⚠️ GARDE-FOU WORKTREE` en TOUT PREMIER avec (a) chemin absolu du worktree, (b) 1re action `cd <worktree> && /usr/bin/git rev-parse --show-toplevel`, (c) tous chemins Write ABSOLUS sous le worktree, (d) `/usr/bin/git -C <worktree>` (bypass RTK qui masque l'écart). Lead : `git -C <repo-principal> status` après chaque retour + `clean -fd` SCOPÉ (jamais global : emporte `.mcp.json`/`CLAUDE.md`/`.ai-env/`). (Sprint 21 #75/#86/#87)

## PIT-S21-002 — Test swipe/pointer sous jsdom : `clientY` des synthetic pointer events = null
React synthetic pointer events ne propagent PAS `clientY` sous jsdom/RTL (retourne null), contrairement aux handlers `addEventListener` natifs. Un test Vitest d'un geste swipe-down échoue silencieusement (seuil jamais atteint). Prévention : extraire la décision en fonction pure testable (`shouldDismissOnSwipe(deltaY, threshold)`) couverte en unitaire, et couvrir le geste réel en Playwright (pas Vitest). (Sprint 21 #87, `BottomSheet`)

## PIT-S21-003 — AuthContext détient son user en useState : `invalidateQueries` ne le rafraîchit PAS
Après une mutation qui modifie le user courant (PATCH profil, upload avatar), invalider `queryKeys.auth.me` ne rafraîchit PAS l'UI : `AuthContext` détient son propre `useState` et ne relit pas la query key (le pont `useCurrentUser` ne refait pas de fetch réseau). Fix : exposer `refreshUser` (re-fetch `/me`) depuis `AuthContext` et l'appeler dans `onSuccess` des mutations. Prévention : toute mutation modifiant le user courant appelle `refreshUser`, pas seulement `invalidateQueries`. (Sprint 21 #75 correction)

## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)

## PIT-S22-002 — Tester le threading d'une prop vers un enfant MOCKÉ : exposer la prop en data-attr
Quand un composant enfant load-bearing est mocké dans un test (ex. `DeleteConfirmDialog` mocké dans `CategoryDrawer.test.tsx`), le mock masque les régressions de câblage de props. Le bug S22 (review PR#217) = `linkedProductsCount` jamais passé → réassignation cassée, non couvert car le mock ignorait la prop. Prévention : dans le mock, réémettre les props critiques en `data-<attr>` (ex. `data-linked-count`) et asserter l'attribut → couvre le threading sans dé-mocker. (Sprint 22 review PR#217)

## PIT-S22-003 — Garde-fou cwd worktree : le bloc EN TÊTE reste indispensable (récurrence S22)
Confirme PIT-S21-001 : en S22, #62 (garde cwd reléguée dans « Contraintes », pas en tête) a ENCORE écrit dans le repo principal avant rapatriement manuel. À l'inverse #68 et le fix review217 (bloc `⚠️ GARDE CWD WORKTREE` en TOUT PREMIER + chemins absolus + `git -C <worktree>`) n'ont eu AUCUNE fuite. Règle : le bloc worktree va en première ligne du briefing, jamais dans une section basse. (Sprint 22 #62 vs #68)

## PIT-S23-001 — CVE spring-security-web non backportée sur la ligne 6.4.x (rester sur Boot 3.4.x impose override 6.5.x)
En S23 #180, l'issue supposait « spring-security 6.4.6+ résout CVE-2025-41232 ET CVE-2026-22732 » → FAUX : CVE-2026-22732 n'est PAS backportée sur 6.4.x (6.4.13 encore vulnérable, vérifié trivy). Fix réel = spring-security 6.5.9+/7.0.4. Rester sur la ligne Boot 3.4.x (pas de montée minor) impose un override `spring-security.version=6.5.x` + aligner `spring-framework.version` sur le floor requis (6.2.19, sinon skew avec le pin BOM Boot 6.2.15). Règle : ne JAMAIS croire un « X.Y.Z+ résout la CVE » sur parole — vérifier la version corrigée réelle (advisory + re-scan trivy après bump). (Sprint 23 #180)

## PIT-S23-002 — `@MockBean`/`@Mock` sur `*ServiceImpl` concret masque une violation DIP (fonctionne mais ment)
En S23 #123, des tests de contrôleurs mockaient le `*ServiceImpl` concret : ça « fonctionne » (l'impl IS-A le port) mais viole le critère DIP et laisse un commentaire trompeur justifiant l'ancien câblage concret. Après un refactor DIP repo-wide : basculer les mocks sur l'INTERFACE (port) ET purger les commentaires justifiant l'impl concrète. Vérif offenders : `grep -rln "import .*application.services\..*ServiceImpl" backend/src/main/java`. (Sprint 23 #123)

## PIT-S24-001 — `.focus()` seul ne défile pas des conteneurs scrollables imbriqués → `scrollIntoView` explicite
Sur la frise (lanes vertical + rail horizontal), `element.focus()` seul ne fait pas défiler fiablement la pastille dans le viewport → focus clavier sur un item hors écran. Solution : `element.scrollIntoView({block:'nearest',inline:'nearest'})` explicite APRÈS `.focus()`. Prévention tests : jsdom n'implémente pas `scrollIntoView` → stub dans `vitest.setup.ts` (déjà présent) sinon les tests clavier throw. (Sprint 24 #81)

## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)

## PIT-S25-001 — Élargir un record domaine casse tous les constructeurs positionnels des tests
Ajouter des champs à un `record` domaine (ex: `EventUpdateCommand` 9→11 args en S25 #201) casse SILENCIEUSEMENT tous les `new EventUpdateCommand(...)` positionnels (prod + tests). Solution : `grep -rn "new EventUpdateCommand"` avant/après pour recenser les call-sites, adapter builder de test + inline. Prévention : dès qu'un record dépasse ~6-8 args, préférer un builder de test unique (un seul point à faire évoluer). (Sprint 25 #201)

## PIT-S25-002 — Test optimistic-lock à 2 threads concurrents = flaky (timing-sensible), pas « stabilisable »
Un test d'intégration validant l'optimistic-lock via une VRAIE course 2-threads + barrière est intrinsèquement timing-sensible : selon l'ordonnancement, les threads n'entrent pas toujours en conflit de version, OU l'exception surface à une couche différente (Hibernate `StaleObjectStateException` brute vs Spring `ObjectOptimisticLockingFailureException` wrappée). En S25 #200 il échouait ~2 runs/4 en suite complète. Un premier « fix » assouplissant l'assertion (accepter les 2 types) N'A PAS suffi — le test-runner a re-détecté la flakiness. Fix RÉEL = supprimer la course : simuler une version STALE de façon déterministe (charger vue v0 → commit v0→v1 → merge vue v0 + flush → `UPDATE WHERE version=0` → 0 ligne → conflit systématique à CHAQUE run). Prévention : 1 test flaky qui passe « souvent » = rouge intermittent en CI (dev protégée). Ne jamais valider sur « stable sur N re-runs » ; rendre déterministe. (Sprint 25 #200)

## PIT-S26-001 — Composant `useTranslations` (next-intl) monté au layout RACINE App Router → crash prerender SSG de TOUTES les pages
En S26 #76, `OfflineBanner` (`useTranslations('network')`) a été monté dans `app/layout.tsx` (root), au-DESSUS du seul `NextIntlClientProvider` du projet (dans `app/[locale]/layout.tsx`). Résultat : `next build` throw au prerender statique dès la 1re page (0/26 générées) — l'erreur surface sur une page arbitraire (`/en/terms`), pas sur le composant fautif, d'où misdiagnostic « pré-existant / pages auth » par 2 subagents. Preuve du diagnostic : la base `origin/dev` build proprement dans le MÊME env → régression bien introduite par la branche. Règle : tout composant i18n-dépendant vit SOUS `NextIntlClientProvider` (= layout `[locale]`), JAMAIS au root layout. Vérif obligatoire d'une régression build : rejouer `npm run build` sur `origin/dev` (contrôle) avant de conclure « pré-existant ». (Sprint 26 #76)

## PIT-S26-002 — Timeout axios global requalifie les uploads multipart longs en erreur réseau
Ajouter un `timeout` global sur l'instance axios (#76, 15s) requalifie tout upload multipart lent (avatar, cf #215) en `ECONNABORTED` → fausse bannière timeout. Solution : exempter les requêtes `FormData` dans l'intercepteur requête (`config.data instanceof FormData` → `config.timeout = 0`). Prévention : tout timeout transport global DOIT exclure les uploads. Classer le timeout sur `error.code === 'ECONNABORTED'` uniquement, jamais sur un regex `/timeout/i` du message (trop large, capture des erreurs métier). (Sprint 26 #76)

## PIT-S27-001 — Extraire un claim JWT (jti/custom) HORS du SecurityContext doit lire le token à la MÊME source que JwtFilter (cookie + Bearer)
En S27, unifier la résolution d'IDENTITÉ via `SecurityContextHolder` (`CallerResolver` #93, cookie OU Bearer) tout en laissant une logique annexe extraire le `jti` COURANT du cookie SEUL (`@CookieValue("jwt")`) crée une incohérence par mode d'auth. Un client **Bearer-only** → `token=null` → `currentJti=null` → `SessionController.revokeOtherSessions` appelle `revokeAllByUserIdExcept(userId, null)` = code path IDENTIQUE à `revokeAllSessions` → révoque TOUTES les sessions y compris celle de l'appel (**self-DoS**, cf. [[BUG-S27-001]]). Règle : après toute migration cookie→SecurityContext, auditer chaque usage de `jti`/claim custom ; ils ne suivent PAS automatiquement. Résoudre le token comme `JwtFilter` (cookie prioritaire, sinon `Authorization: Bearer` substring(7)). Raté au batch `/sprint start`, capté par `/review-pr` (security-expert indépendant). (Sprint 27 #93, review PR#238)

## PIT-S27-002 — `git diff > patch.diff` via le hook RTK produit une sortie compactée non-parsable par `git apply`
En S27, un subagent voulant relocaliser des edits (mauvais worktree, cf [[PIT-S24-002]]) via `git diff > patch.diff` puis `git apply` a échoué : le hook RTK réécrit `git diff` et compacte la sortie → « No valid patches in input ». Prévention : pour un patch brut valide, `rtk proxy git diff` (bypass filtre) ou ré-appliquer les edits directement via Write/Edit. (Sprint 27 #122)

## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)

## PIT-S28-001 — Un `case`-arm de test partagé entre scopes de nature différente = faux vert silencieux
En S28 (#207), `scripts/test-quiet.sh` faisait retomber les scopes `e2e` ET `frontend` sur le même bras `npm test` (Vitest) → `npm run test:e2e` (Playwright) n'a JAMAIS tourné depuis la création du script. Les sprints croyaient couvrir les parcours E2E (`golden-path.spec.ts`) alors que rien ne s'exécutait. Règle : une fonction/bras par runner de nature distincte (unit vs e2e), jamais mutualiser un `case`-arm entre eux. Prévention : valider l'aiguillage RÉEL (shim `npm` en PATH + dry-run / `bash -x`) et pas seulement la lecture du code — un scope qui « passe » sans rien lancer est indétectable à l'œil. (Sprint 28 #207/#133)

## PIT-S29-001 — RTK tronque/mélange la sortie de `docker compose build/ps`
En S29 (#37), le proxy RTK altère le stdout de `docker compose build`/`ps` (lignes tronquées ou mélangées) — même symptôme que [[rtk-git-diff-empty-output]] pour `git diff`. L'exit code reste fiable, pas le stdout. Prévention : rediriger vers un fichier log puis `Read`/`tail`, ou `rtk proxy docker compose ...`. Ne jamais parser le stdout brut de docker sous RTK pour décider d'un vert/rouge. (Sprint 29 #37)

## PIT-S31-001 — `npm audit fix` tire des majeurs transitifs non voulus
En S31 (#222), `npm audit fix` (même sans `--force`) sur ce repo remonte storybook 10.4→10.5 (~242 pkgs), next-intl PROD 4.0→4.13 et eslint 9.23→9.39 — bien au-delà de la CVE ciblée. Pour un bump sécurité chirurgical : éditer la SEULE dep visée dans `package.json` (ex: vitest) + `npm update <leaves>` in-range pour les transitives (flatted/minimatch/picomatch), jamais `npm audit fix`. Vérifier via `npm audit --audit-level=high`. (Sprint 31 #222)

## PIT-S31-002 — Garde ESLint anti-fuite `console.error` : couvrir le mono-arg
En S31 (#160/#258), la 1re version de la règle `no-restricted-syntax` anti-`console.error(msg, errBrut)` ne matchait que le 2-arg (`arguments.length=2`) et RATAIT `console.error(error)` mono-arg — le vecteur de fuite le plus fréquent (dev oublie le message). Corrigé par un 2e sélecteur `arguments.length=1`. Effet de bord : flague les error-boundaries React légitimes (`app/error.tsx`, `app/[locale]/error.tsx`) qui logguent l'erreur React entière → `// eslint-disable-next-line no-restricted-syntax` inline justifié. Non couvrable par AST seul : template `${error}`, console.log/warn, wrap objet. Figer la règle par un test RuleTester/API-ESLint. (Sprint 31 #160/#258)

## PIT-S32-001 — Port repository custom : éviter le nom `findById` (collision covariante SimpleJpaRepository)
En S32 (#58), déclarer `findById(...)` sur un port repository domaine dont l'impl `extends SimpleJpaRepository` provoque une collision de signature covariante avec le `findById(ID)` hérité (retour `Optional<Entity>` vs `Optional<DomainModel>`). Nommer la méthode métier différemment : `findDomainById(...)` (ou `findByIdAndOwnerId` pour l'ownership). Évite l'ambiguïté de résolution et garde le port explicite côté domaine. (Sprint 32 #58)

## PIT-S32-002 — Ajouter une entrée `PATH_LIMITS` casse les tests d'intégration POSTant sur ce path
En S32 (#58 secfix), ajouter une entrée dans `RateLimitingFilter.PATH_LIMITS` (ex: throttle `POST /api/export` 5/min) casse les tests d'intégration existants qui POSTent plusieurs fois sur ce path : `MockMvc` utilise l'IP par défaut `127.0.0.1`, les buckets Bucket4j sont keyés `(IP|URI)` en singleton → le 6e POST du test tombe en 429 inattendu. Solutions : `app.rate-limit.enabled=false` sur le test de flow (switch documenté CI/e2e), OU varier l'IP par requête (`nextIp()`). Prévention : tout ajout dans `PATH_LIMITS` → auditer les tests qui POSTent sur ce path. (Sprint 32 #58)

## PIT-S33-001 — URL absolue renvoyée par le backend + `apiClient.baseURL` finissant par `/api` → double `/api/api`
En S33 (#59), `ExportJobResponse.downloadUrl` porte un chemin absolu `/api/export/download/<jobId>?token=…` alors que `apiClient` (axios) a déjà `baseURL` se terminant par `/api`. Passer `downloadUrl` tel quel à `apiClient.get` produit `/api/api/export/...` → 404. Solution : dé-préfixer avant l'appel — `downloadUrl.replace(/^\/api(?=\/)/,'')`. Prévention : tout champ URL absolu renvoyé par le backend et consommé via `apiClient` doit être dé-préfixé de `/api` côté service (ne jamais concaténer une URL backend-absolue à une baseURL déjà préfixée). (Sprint 33 #59)

## PIT-S33-002 — Liste de locales dupliquée dans N fichiers → 404 silencieux sur les langues non déclarées partout
En S33 (#235), la liste des locales supportées était dupliquée dans 5 fichiers (`app/[locale]/layout.tsx`, `middleware.ts`, `app/error.tsx`, `services/apiClient.ts`, `types/settings.ts`). `middleware.ts` routait `['fr','en','es','de']` mais `layout.tsx` ne connaissait que `['fr','en']` → `/es` et `/de` passaient le middleware puis `notFound()` (404). Prévention : source de vérité unique `frontend/src/i18n/locales.ts` (`SUPPORTED_LOCALES` tuple `as const` + type `Locale` dérivé + `isSupportedLocale`), importée partout ; JAMAIS de tableau de locales inline. ⚠ Le module DOIT rester PUR (aucun import `fs`/`path`) car importé par `middleware.ts` qui tourne dans le runtime Edge de Next.js. (Sprint 33 #235)

## PIT-S34-001 — `getRequestConfig({locale})` déprécié en next-intl (utiliser `requestLocale`)
En S34 (#261, bump next-intl 4.0.2→4.13.2), `frontend/i18n.ts` utilise l'ancienne signature `getRequestConfig(({locale}) => …)` — le param `locale` est déprécié depuis next-intl 3.22 au profit de `requestLocale` (+ `hasLocale`). Non-impactant au runtime ICI car le flux principal fournit les messages via `app/[locale]/layout.tsx` + `loadMessages(params.locale)` au `NextIntlClientProvider` (indépendant de `getRequestConfig`). Reste latent : si l'usage serveur `getTranslations`/`getRequestConfig` s'étend, migrer vers `requestLocale`/`hasLocale`. Follow-up S34 non bloquant. (Sprint 34 #261)

## PIT-S35-001 — Property `${VAR}` sans inner-default lue à `ApplicationEnvironmentPreparedEvent` → placeholder opaque avant le message métier
En S35 (#253), un garde-fou fail-fast (`ProfileSafetyGuard`, event pré-beans) qui lit `app.cors.allowed-origins` (CSV) via `env.getProperty` levait « Could not resolve placeholder 'CORS_ALLOWED_ORIGINS' » OPAQUE — AVANT que le check puisse produire son message `#253` clair (« CORS_ALLOWED_ORIGINS vide, boot refusé »). Cause : la property n'avait pas d'inner-default dans `application-prod.properties`. Fix : `app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:}` (le `:` = default vide, comme déjà fait pour `COOKIE_DOMAIN`). **Règle** : toute property lue par `ProfileSafetyGuard` DOIT avoir la forme `${VAR:}` sinon le placeholder non résolu masque le message métier. Pitfall test connexe : un cas « marker prod seul » doit poser `spring.profiles.active=prod`, sinon le check #111 (fallback dev) se déclenche AVANT le check ciblé. (Sprint 35 #253/#254)

## PIT-S37-001 — Filtre lisant le body avant le controller sur endpoint public non authentifié → vecteur OOM/DoS
En S37 (#141), l'extension de `RateLimitingFilter` au throttle par-token sur `POST /api/auth/reset-password` (public) lisait le body ENTIER via `StreamUtils.copyToByteArray(getInputStream())` SANS borne, et utilisait le champ JSON `token` BRUT (longueur non validée) comme clé de `tokenBuckets` → une clé de plusieurs Mo neutralisait le cap 100k en volume mémoire réel (double vecteur OOM). Détecté par convergence security-expert + reviewer (batch `/sprint start` PUIS `/review-pr 282`), raté à l'implémentation initiale. Fix (`f7210e1`) : gate `getContentLengthLong() > 8 KiB` → passthrough sans buffer ; sinon `readBounded(max+1)` (null si dépassement → 400) ; clé token acceptée seulement si plausible (≤128 chars, UUID=36) sinon repli throttle IP ; `tokenBuckets` = LRU (`LinkedHashMap` accessOrder + `removeEldestEntry`) qui évince le plus ancien au lieu de refuser l'ajout (le refus laissait passer tout token neuf, victime incluse). **Règle : tout filtre lisant `getInputStream()` sur endpoint public borne la taille (Content-Length + readBounded), et toute map dont la clé dérive d'un input attaquant borne la longueur de clé + évince en LRU.** (Sprint 37 #141, review PR#282)

## PIT-S37-002 — `@SpringBootTest(properties={...})` unique crée un contexte caché (+1 pool Hikari) → "too many clients" Postgres
En S37 (#139), ajouter un `@SpringBootTest(properties={...})` avec des overrides uniques crée un contexte Spring supplémentaire non partagé (=1 pool Hikari de plus) ; la suite MyTimeline (Testcontainers) frôle `max_connections` Postgres → `FATAL: sorry, too many clients already` (11 erreurs `ExportEndpointsIntegrationTest`, sans lien avec le code testé). Solution : un test de scheduler qui invoque la méthode de purge DIRECTEMENT puis asserte n'a PAS besoin de neutraliser le tick `@Scheduled` (initialDelay 5min par défaut ne se déclenche pas dans le corps du test) → retirer les overrides (tous = défauts) pour réutiliser le `@SpringBootTest` nu partagé. Fix systémique possible : capper `spring.datasource.hikari.maximum-pool-size` dans `application-test.properties` (RECOMMAND_DB_EXPERT en attente). (Sprint 37 #139)

## PIT-S37-003 — E2E : DB dev locale bloquée à une vieille version Flyway → boot backend échoue sur données stale
En S37 (#145, premier E2E métier), la DB locale `eventmanager` était bloquée à V3 : le boot backend échouait à V7 (`events_recurrence_unit_check` sur données stale) — sans lien avec le code du sprint. Solution non destructive : `CREATE DATABASE eventmanager_e2e` + `DB_URL` dessus → Flyway rebuild propre depuis zéro. **Règle : les E2E tournent sur une DB jetable fraîche, JAMAIS la DB dev polluée.** En CI le Postgres est déjà frais (service jetable). Follow-up : découpler la capture du token E2E du schéma DB (voir [[PAT-S37-002]]). (Sprint 37 #145)

## PIT-S37-004 — Seed dans un test d'intégration non-`@Transactional` + id pré-assigné sur entité `@GeneratedValue`
En S37 (#143), deux pièges de seeding en test d'intégration : (1) appeler directement `repo.save()` dont l'impl fait des `super.save` internes court-circuite le proxy `@Transactional` → sans tx englobante l'INSERT n'est jamais committé (donnée invisible des threads concurrents) → envelopper le seed dans un `TransactionTemplate` ; (2) créer un `User` via `UserRepository.save` avec un id pré-assigné : `UserEntity` porte `@GeneratedValue` → `save` force `id=null` en création, l'id fourni est ignoré (un token pointant vers cet id serait orphelin) → passer `id=null` et relire l'id du User renvoyé. Cf. convention projet create id=null. (Sprint 37 #143)
