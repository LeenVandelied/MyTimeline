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
> ⚠️ **PÉRIMÉ depuis le Sprint 50 (#323).** `jwt.secret` **n'existe plus** : la signature est passée en RS256 et le profil test laisse `jwt.private-key=` vide, ce qui fait générer une paire RSA **éphémère au boot**. Il n'y a donc plus de secret Base64 à fournir pour émettre un token en test. L'exigence Base64 ≥ 32 octets survit uniquement pour `EXPORT_TOKEN_SECRET` (HMAC dédié des jetons d'export). Voir [[DEC-S50-003]].

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
> ⚠️ **PÉRIMÉ depuis le Sprint 50 (#323).** `JWT_SECRET` a été **supprimé** de la CI et de toute la configuration. La CI génère désormais une **paire RS256 jetable au run** (`ci.yml`, avec `::add-mask::` avant écriture dans `GITHUB_ENV` — dépôt public). La contrainte « Base64 valide ≥ 32 octets » ne s'applique plus qu'à `EXPORT_TOKEN_SECRET`.

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

## PIT-S39-001 — Bordures UI Graphite : les tokens `rule`/`rule-strong` échouent le seuil WCAG AA ≥3:1
En S39 (#56, slice contraste hero), la bordure du bouton secondaire outline (`border-rule`, gray-100 ~1.2:1 vs bg) était invisible → sous le seuil UI WCAG 1.4.11 (≥3:1). `--color-rule-strong` (gray-200 ~1.5:1) échoue aussi des deux côtés (clair+sombre). AUCUN token `rule*` de la charte n'atteint 3:1 sur fond quasi-blanc. Fix : pour une affordance de contrôle (outline button sans remplissage), utiliser `border-ink-muted` (~6:1) ou `border-accent` (~4.6:1). Règle : `rule*` = séparateurs/cadres DÉCORATIFS uniquement (redondants avec un fill+shadow), jamais seul indicateur de frontière d'un contrôle. Follow-up : token dédié `--color-rule-emphasis` (cf. DEC-S39-001). (Sprint 39 #56)

## PIT-S40-001 — `git mv` d'un segment de route Next.js → `.next/types/**` périmé → `tsc` TS2307 fantômes
En S40 (#210), déplacer un dossier de route (`app/[locale]/products/` → `(app)/products/`) via `git mv` laisse `.next/types/**` pointant l'ANCIEN chemin → `tsc --noEmit` crache des `TS2307 Cannot find module` fantômes (types générés stale), alors que le code est correct. Fix : relancer `next build` (régénère `.next/types`) AVANT le typecheck. **Règle : après tout déplacement de route, `next build` avant `tsc`.** (Sprint 40 #210)

## PIT-S40-002 — Shell client-only enveloppant `children` : la garde auth (redirection incluse) DOIT vivre dans le shell
En S40 (#210, review PR#297), `AppShell` (client component, layout ancêtre de `(app)`) rendait la sidebar authentifiée (nav protégée, profil) SANS garde `loading`/`user` → flash de chrome authentifiée pour un anonyme atteignant directement `/dashboard` (viole « pas de flash anonyme », DEC-S9-002 ; `middleware.ts` = next-intl seul, aucune garde serveur). Piège du fix : un `return <spinner/>` anticipé qui NE monte PAS `children` empêche le `useEffect` de redirection d'une page enfant de se déclencher → anonyme bloqué sur spinner. **La garde (spinner + redirection) doit donc vivre DANS le shell**, factorisée en hook partagé `useAuthGuard` consommé par le shell ET les pages (defense-in-depth). Follow-up : garde serveur `middleware.ts` (vérif cookie JWT avant rendu des routes `(app)`). (Sprint 40 #210, review PR#297)

## PIT-S40-003 — Consolider la nav dans un shell casse les E2E desktop qui cliquaient la nav propre d'un écran (devenue `lg:hidden`)
En S40 (#210), une fois le dashboard enveloppé par le shell, son header propre (contenant `dashboard-settings-link`) est passé `lg:hidden` (anti double-chrome desktop). L'E2E `settings-navigation.spec.ts` cliquait ce lien depuis le dashboard en viewport desktop (chromium 1280 ≥ lg) → `locator.click` timeout 30s (élément caché), seul échec de la suite e2e CI (25 passed, 1 failed ; backend/frontend/unit verts). Raté localement (E2E non exécutable sans stack complète), attrapé par le job CI `e2e`. Fix : pointer le testid du shell (`shell-sidebar-settings-link`, visible `≥ lg`). **Règle : quand la nav migre dans un shell, auditer `frontend/e2e/` pour tout `getByTestId` d'un élément de header d'écran devenu `lg:hidden`.** Cf. [[PAT-S40-003]]. (Sprint 40 #210, CI e2e)

## PIT-S41-001 — Hitbox a11y `::before` (PAT-S24-002) clippée par un ancêtre `overflow:hidden` → cible < 44px aux bords
En S41 (#226), l'extension de cible tactile WCAG 2.5.5 via `::before{width:44px;height:44px}` centré sur un bouton de 30px déborde de ±7px. Le groupe parent `.mt-zoom{overflow:hidden}` (pour arrondir la silhouette) **clippe ces 7px** sur le 1er bouton (bord gauche) et le dernier (bord droit) → cible réelle ~37×44px sur les bords extrêmes, WCAG NON atteint (alors que la review CSS naïve croit le contraire). Fix : `overflow:visible` scopé au contexte concerné (`.mt-tlm .mt-zoom`) + réarrondir les coins extérieurs des enfants de bord (`:first-child`/`:last-child` `border-radius`) pour préserver la silhouette. **Règle : avant d'appliquer PAT-S24-002, auditer TOUS les ancêtres pour un `overflow:hidden` qui clipperait le débordement de la hitbox.** Détecté par review, pas par les tests (pseudo-éléments non calculés en jsdom). Cf. [[PAT-S24-002]]. (Sprint 41 #226)

## PIT-S41-002 — Flex item + `text-overflow:ellipsis` sans `min-width:0` → ellipsis muette, hard-clip du parent
En S41 (#195), envelopper un texte tronquable dans un `<span>` enfant d'un conteneur `inline-flex`/`flex` (ici bouton `.mt-tlv__lane-head`) : le span porte `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` MAIS un flex item a `min-width:auto` par défaut → il ne rétrécit PAS sous sa largeur de contenu, l'ellipsis ne se déclenche jamais, le titre long est hard-clippé par le `overflow:hidden` du parent (pas de « … »). Fix : `min-width:0` (+ `flex:1 1 auto`) sur le flex item tronquant. **Règle flexbox récurrente : tout enfant flex qui doit tronquer en ellipsis exige `min-width:0`.** Régression silencieuse (invisible en jsdom, la géométrie n'est pas calculée). (Sprint 41 #195, review PR #303)

## PIT-S41-003 — CSS timeline vit dans le design system (`styles/ds/components/`), pas à côté des `.tsx`
En S41 (#226), le briefing pointait `frontend/src/components/timeline/timeline.css` — fichier INEXISTANT. Le CSS timeline réel est `frontend/src/styles/ds/components/timeline.css` (classes `.mt-tlv__*`/`.mt-tlm__*`/`.mt-zoom*`). **Règle : chercher le CSS d'un composant timeline dans `src/styles/ds/components/`, jamais à côté du composant React.** (Sprint 41 #226)

## PIT-S41-004 — `./scripts/test-quiet.sh frontend` lancé depuis le repo principal (pas le worktree) → faux échec `eslint-plugin-storybook`
En S41, lancer la suite frontend depuis le cwd du repo principal au lieu du worktree sprint échoue faussement (`eslint-plugin-storybook` absent des `node_modules` du repo principal, présent dans ceux du worktree). **Règle : pendant un sprint en worktree, `cd` dans le worktree avant tout `test-quiet.sh` ; briefer les subagents (fullstack-dev, test-runner) avec le chemin absolu du worktree.** Cf. [[sprint-subagent-worktree-cwd]]. (Sprint 41)

## PIT-S41-005 — `next build` (ESLint CI) échoue sur `no-unused-vars` invisible à `vitest`
En S41, une variable inutilisée dans un fichier de test (`const user = userEvent.setup()` dans un test qui n'utilise que `fireEvent.keyDown`) passe `vitest run` (456/456 vert) mais fait ÉCHOUER le job CI `frontend` : `next build` lance ESLint sur les tests et traite `@typescript-eslint/no-unused-vars` en ERREUR (`Failed to compile`). **Règle : un run vitest vert ne garantit PAS le build ; valider `npx eslint <fichiers touchés>` (ou `next build`) avant push, surtout sur les fichiers de test ajoutés.** Extension concrète de la note pack cp-frontend « next build attrape des erreurs invisibles aux tests RTL ». (Sprint 41 #228, CI frontend)

## PIT-S42-001 — Update-in-place de l'entité managée défait l'optimistic-lock (`@Version`)
En S42 (#231/absorb), le PATCH event recharge l'entité MANAGÉE (`EventRepositoryJpaImpl.save` → `super.findById` + `copyMutableFields` qui NE touche jamais `@Version`) puis flush : Hibernate émet toujours `UPDATE ... WHERE version = <courant>` = match. Un PATCH séquentiel avec une version périmée ne lève **JAMAIS** `ObjectOptimisticLockingFailureException` — le lock ne fire que sous un vrai race 2-transactions (que seul le test d'intégration force via `em.detach`/`em.merge`). **Règle : pour un contrôle de concurrence réel via API, threader la `version` cliente ET faire un check explicite `client.version != managed.version` en service (après ownership), en réutilisant l'exception/contrat 409 existant.** (Sprint 42 #231)

## PIT-S42-002 — Réponse d'erreur portant un état serveur : ownership AVANT sérialisation
En S42 (#231), le corps 409 enrichi expose `serverEvent`. Si l'ownership était vérifié APRÈS la sérialisation, le 409 deviendrait un **oracle de fuite cross-owner** (contenu d'un event d'autrui). **Règle : pour toute réponse d'erreur qui embarque un état serveur (409/enrichi), le check d'ownership DOIT s'exécuter avant le catch(OptimisticLock) et avant tout refetch/sérialisation ; ne mettre dans le corps que les champs déjà exposés au propriétaire légitime (projection GET/PATCH), zéro champ interne.** Audité SÛR. (Sprint 42 #231)

## PIT-S44-001 — `EventCreationRequest` : `durationValue`/`durationUnit` requis MÊME pour `type='single'`
Sur `POST /api/events`, `durationValue` (`@NotNull`) et `durationUnit` (`@NotBlank`) sont **inconditionnels** — alors que `Utils.calculateEndDate` les IGNORE quand `type='single'` (branche `if` non prise → `endDate = startDate`). Les omettre = **400**, pour des champs sans effet métier. Asymétrie avec `recurrenceUnit`, lui conditionné proprement (`@AssertTrue isRecurrenceUnitConsistent`). Contournement retenu S44 (#300) : envoyer des valeurs neutres (`durationValue: 0`, `durationUnit: 'days'`) sur le chemin `single`. **Nuance importante — ce piège ne frappe QUE le chemin direct `POST /api/events`** : la création couplée (`POST /api/products` avec events imbriqués) y échappe, cf. [[PIT-S44-002]]. (Sprint 44 #300)

## PIT-S44-002 — `ProductCreationRequest.events` sans `@Valid` : l'absence de cascade est STRUCTURELLE, ne pas la « corriger »
`ProductController.createProduct` porte bien `@Valid @RequestBody`, mais le champ `private List<EventCreationRequest> events;` n'a **PAS** de `@Valid` → Bean Validation **ne cascade pas** dans la liste imbriquée : aucune contrainte d'`EventCreationRequest` n'y est évaluée. C'est ce qui fait FONCTIONNER la création couplée (`ProductDrawer` envoie `{name, type:'single', date}` sans durée, cf. [[PIT-S44-001]]). ⛔ **Ajouter `@Valid` sur cette liste CASSERAIT le parcours** : `EventCreationRequest.productId` est `@NotNull`, or un event imbriqué ne peut pas porter de `productId` — le produit est créé dans la même transaction (`ProductServiceImpl:69`). Signalé comme « bug probable » par un subagent S44, **vérifié et infirmé** : faux positif. Si le besoin de valider les events imbriqués apparaît, il faudra un DTO create dédié sans `productId`, pas un `@Valid` posé là. (Sprint 44, revue #300)

## PIT-S44-003 — `if (!open) return null` ne démonte PAS un composant : l'état interne survit
Un composant monté **inconditionnellement** par son parent (`<Drawer open={x} …/>`) qui se contente de `return null` quand fermé **reste monté** : React garde l'instance et TOUS ses hooks vivants (`useState`, `useMutation`…). Seuls ses ENFANTS sont démontés — d'où l'illusion trompeuse d'un « formulaire vierge » (le form remonte, mais pas l'état du parent). En S44 (#300), `productId`, l'erreur produit et l'état de mutation survivaient : une soumission échouée, fermée, puis rouverte affichait **un bandeau d'erreur d'une session abandonnée sur un formulaire vierge**. **Règle : une surface modale porteuse d'état (form/mutation) doit être montée CONDITIONNELLEMENT par son parent (`{open && <Drawer …/>}`) ; le `return null` interne n'est qu'un filet.** La restauration du focus n'en souffre pas : le cleanup de `useFocusTrap` s'exécute au démontage. ⚠ **Angle mort de test** : un test qui remonte un composant frais à chaque cas ne verra JAMAIS ce bug (suite verte). Le verrou se pose au niveau du parent, avec un mock traçant mount/unmount — un mock qui rend `null` ne distingue pas « démonté » de « monté mais invisible ». Contre-exemple sain : `EventDrawer` est monté en permanence sans dommage car purement présentationnel (aucun état interne). (Sprint 44, revue PR #313)

## PIT-S44-004 — Copier un pattern a11y maison sans reprendre son invariant : `aria-hidden` sur spinner ⇒ état muet
En S44, la revue batch signale une double annonce (label sr-only du `Spinner` + texte visible identique). Le fix copie `ExportDataFlow.tsx` (`<Spinner aria-hidden="true" />`) — mais **seulement la moitié du pattern** : chez `ExportDataFlow`, la live-region est portée par le **div wrapper** (`role=status`/`aria-live="polite"`), son commentaire le dit explicitement. Sans elle, `aria-hidden` supprime la SEULE annonce → **état de chargement totalement silencieux pour les lecteurs d'écran, pire que la double annonce d'origine**. Régression attrapée par `/review-pr`, pas par la suite de tests (aucune assertion sur la live-region). **Règle : `aria-hidden` sur un indicateur décoratif n'est valide QUE si une live-region le remplace sur un ancêtre. Copier un pattern = vérifier ses invariants, pas seulement sa ligne visible.** Cf. [[PAT-S41-002]] (même famille : libellé dupliqué). (Sprint 44, revue PR #313)

## PIT-S44-005 — Schéma Zod jamais `parse()` : un `superRefine` qui ne protège rien
`eventCreationPayloadSchema` (S44 #300) portait un `superRefine` « miroir de l'`@AssertTrue` backend (échec ici = 400 évité) » — mais le schéma n'est JAMAIS parsé : il ne sert qu'à dériver le type (`z.infer`), le payload étant construit à la main par `toEventCreationPayload`. Le refine était donc **du code mort affichant une garde imaginaire**. ⚠ **Le faire vivre par un `.parse()` aurait été PIRE** : l'appel est évalué DANS le `try` de `handleSubmit`, dont le `catch` s'appuie sur `createEvent.isError` pour afficher l'erreur ; une `ZodError` levée AVANT `mutateAsync` laisse `isError` à false → **submit silencieusement sans effet**. Résolution : refine retiré, portée réelle documentée (règle appliquée au niveau du FORMULAIRE, là où elle produit un message par champ). **Règle : un schéma qui n'est que source de type ne doit pas contenir de validation conditionnelle — sinon il ment au lecteur.** (Sprint 44, revue PR #313)

## PIT-S42-003 — Des `data-testid` en source ne prouvent PAS un flux atteignable
En S42, le plan reposait sur des testids présents dans `EventContent`/`EventEditForm`/`ConflictDialog` — mais ces composants n'étaient montés sur AUCUNE route (chaîne orpheline `EventContent→EventBar→Lane`, régression réécriture timeline S17) : la frise routée était en lecture seule. #231 livrait donc du **code mort côté UI**, révélé par la couverture E2E (#232), pas par les tests unitaires. **Règle : avant de planifier une amélioration sur un flux, vérifier qu'un composant est réellement monté dans une route (grep consommateurs route→composant) — un testid unit-testé ≠ atteignable end-to-end.** (Sprint 42 #231/#232)

## PIT-S45-001 — Middleware Next : un `Location` RELATIF renvoie 500 (`ERR_INVALID_URL`), build ET tests unitaires VERTS
En S45 (#302), un durcissement sécurité (éviter un `Location` absolu bâti sur l'en-tête `Host`) a remplacé `NextResponse.redirect(url)` par `new NextResponse(null, {status:307, headers:{Location:'/fr/login'}})`. Next **normalise** les redirections de middleware via `new NextURL(redirect)` → `new URL('/fr/login')` **sans base** → `TypeError: Invalid URL` → **500 sur 100 % des routes protégées**. `next build`, `tsc`, eslint et 33 tests unitaires de middleware étaient VERTS : les tests assertaient sur l'objet `NextResponse` retourné, jamais sur ce que Next en fait ensuite. Seule la CI e2e l'a vu (10/10 échecs). **Règle : toujours construire la cible via `request.nextUrl.clone()` + `NextResponse.redirect(url, status)`. Et ne JAMAIS asserter un `Location` avec `new URL(loc, BASE)` — la base masque exactement ce bug ; asserter `new URL(loc)` SANS base.** Cf. [[BUG-S45-001]], [[PAT-S45-003]]. (Sprint 45 #302, run CI 30269383403)

## PIT-S45-002 — Tester un `config.matcher` Next avec une regex reconstruite à la main : 3 itérations de trou de sécurité
En S45 (#302), le matcher `'/((?!api|_next|.*\..*).*)'` excluait TOUT chemin contenant un point → `/fr/products/foo.bar` n'entrait jamais dans le middleware, garde inactive (`[productId]` accepte un point). Trois passes successives ont raisonné SUR la regex sans l'exécuter : l'audit sécu propose `[^%]*\.(ext)$` (laisse `/fr//products/x.png`), l'implémenteur ajoute une 2e entrée locale (laisse `/%66r/products/x.png`), le reviewer trouve le résiduel. Résolu seulement en **compilant avec le `path-to-regexp` EMBARQUÉ de Next** (`next/dist/compiled/path-to-regexp`, options de `next/dist/lib/try-to-parse-path` : `{delimiter:'/', sensitive:false, strict:false}`) et en exécutant 20 cas. **Règle : un `new RegExp('^'+src+'$')` reconstruit à la main DIVERGE du matcher réel (pas de `[\/]?$`, `sensitive` non modélisé) — il a masqué un trou de sécurité pendant 3 revues.** Cf. [[PAT-S45-004]]. (Sprint 45 #302)

## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)

## PIT-S45-004 — `nextUrl.pathname` n'est PAS percent-décodé : toute garde comparant des segments en clair est contournable
En S45 (#302), `isProtectedPathname` faisait `pathname.split('/')` sur un pathname non décodé : `/fr/%64ashboard` → segment `%64ashboard` → garde contournée, page servie (Next décode ensuite `%64ashboard` → `dashboard`). Fix : décoder **par segment** (locale incluse), et traiter un segment malformé (`decodeURIComponent` qui throw) comme **PROTÉGÉ** (fail-closed), jamais comme public. Corollaire retenu au matcher : tout chemin percent-encodé ou à slash doublé doit **retomber dans** le middleware plutôt que l'éviter. (Sprint 45 #302, audit sécurité)

## PIT-S45-005 — Vagues parallèles : « prendre le prochain numéro libre » produit des collisions (2× ADR-004)
En S45, les deux subagents de la vague 1 (#302 et #283) ont chacun reçu la consigne « prendre le prochain numéro libre dans `docs/adr/` ». Tournant en parallèle dans le MÊME working tree, ils ont tous deux créé un `ADR-004`. Le lead a dû renuméroter après coup (ADR-005) et corriger 6 références entrantes. **Règle : ne jamais confier une allocation d'identifiant séquentiel (ADR, migration Vn, numéro de règle) à des agents concurrents — le lead alloue AVANT le spawn, ou les briefings nomment explicitement le numéro à utiliser.** Même famille que la règle « une seule plage de migration par sprint ». (Sprint 45, vague 1)

## PIT-S45-006 — `npm audit fix` : une 2e passe AGGRAVE, et les « fix available » mentent
En S45, la remédiation des 19 HIGH frontend a montré trois pièges. (1) Une **2e passe** de `npm audit fix` a fait passer 7 vulns → 15 (npm applique des « correctifs » majeurs absurdes : `eslint-config-next@12.0.4` proposé en *downgrade* depuis 15.x) → repartir d'une base propre (`git checkout package*.json`). (2) `fixAvailable: true` ne garantit RIEN : `postcss`/`sharp` étaient imbriqués sous `node_modules/next/` et épinglés par Next — seul un **override npm** les atteint. (3) Un override littéral sur une dépendance DIRECTE lève `EOVERRIDE` → syntaxe `"postcss": "$postcss"`. Enfin `brace-expansion@5.0.8` (seule version corrigée) change sa **forme d'export** : le forcer casse le lint (`expand is not a function`, `minimatch@3` l'appelle comme une fonction). Cf. [[DEC-S45-004]]. (Sprint 45, PR #317)

## PIT-S45-007 — `frontend/.eslintcache` est TRACKÉ par git : tout run eslint pollue le working tree partagé
En S45, **trois agents** distincts ont buté dessus : `npx eslint` supprime/regénère `frontend/.eslintcache`, qui est versionné → il apparaît modifié/supprimé dans `git status` des autres agents d'une vague parallèle, et personne ne le revendique. Le lead a dû le restaurer deux fois. **Contournement : `git checkout -- frontend/.eslintcache` avant tout commit, ne jamais `git add -A`. Correctif de fond : le gitignorer et le détracker (follow-up ouvert).** (Sprint 45, vagues 1 et 2)

## PIT-S45-008 — `node_modules` n'est PAS partagé entre worktrees ; setup vitest et `server.deps.inline`
En S45, trois pièges d'outillage frontend rencontrés en worktree : (1) `node_modules` n'est pas partagé entre worktrees → `npm ci` préalable obligatoire avant tout test dans un worktree fraîchement créé ; (2) un `vitest.setup.ts` partagé doit garder un `typeof window` — sans garde, TOUT fichier `@vitest-environment node` échoue **à la collecte** (et peut être compté « pass » à tort) ; (3) `server.deps.inline` compare le motif à l'**ID COMPLET** du module — une regex ancrée sur le nom de package (`/^next-intl/`) ne matche JAMAIS, il faut `/node_modules[\/]next-intl[\/]/`. (Sprint 45 #302)

## PIT-S45-009 — Choisir un `@Profile` sans vérifier `SPRING_PROFILES_ACTIVE` du job CI : vert en local, rouge en CI
En S45 (#283), un endpoint test-only gardé par `@Profile("e2e")` n'aurait JAMAIS été actif en CI : le job e2e lance le backend avec `SPRING_PROFILES_ACTIVE: dev` (`ci.yml`). Le piège a été vu au plan, pas en cours de route — sinon le symptôme aurait été « passe en local, échoue en CI » sans lien évident. **Règle : lire la variable de profil du job CI AVANT de choisir la garde de profil. Solution retenue : profils ADDITIFS (`dev,e2e`), qui conservent toute la config `dev` dont le job dépend.** Cf. [[DEC-S45-002]]. (Sprint 45 #283)

## PIT-S46-001 — Un `data-testid` en dur dans un composant partagé pollue les compteurs E2E des autres surfaces
En S46 (#315), `EventBar` porte `data-testid="timeline-event"` **en dur**. Le réutiliser dans l'aperçu du drawer de création aurait fait échouer `e2e/sprint-42-events.spec.ts:273` (`toHaveCount(0)`) dès l'ouverture d'un formulaire : la frise « vide » aurait compté la barre de l'aperçu. Contournement retenu : ne PAS réutiliser `EventBar`, composer les classes DS (`.mt-evt`, `.mt-evt--draft`). **Règle : un composant destiné à plusieurs surfaces doit exposer son testid en prop (défaut = valeur historique) — un testid en dur est un couplage invisible avec les compteurs E2E.** Cf. [[PAT-S46-001]]. (Sprint 46 #315)

## PIT-S46-002 — Réutiliser un callback desktop pour un chemin mobile n'hérite PAS de ses protections
En S46 (#309), le câblage mobile de la suppression réutilisait `TimelineEditHost.onDelete` — approche correcte pour éviter la divergence d'invalidation, mais qui a introduit **deux défauts trouvés en revue** : le chemin mobile court-circuitait la confirmation, et l'erreur n'était plus gérée. Cause : la confirmation ET le `try/catch` vivaient dans `DeleteConfirmDialog`, **pas dans le callback**. Le desktop était protégé par son composant appelant, le mobile a hérité du callback nu. **Règle : avant de brancher un 2e chemin sur un callback existant, identifier QUI `await`, QUI `catch` et QUI confirme — la protection est rarement là où on croit.** D'autant plus critique ici : la suppression d'event est un hard-delete **physique** (br-events.md §168), sans corbeille. (Sprint 46 #309, review batch)

## PIT-S46-003 — `DeleteConfirmDialog.onConfirm` transmet un `reassignToCategoryId?: string` à tout callback branché
En S46 (revue), `TimelineEditHost.onDelete` était typé `(target?: PositionedEvent)` mais recevait en réalité une **string** sur le chemin desktop : `DeleteConfirmDialog.onConfirm(reassignToCategoryId)` traverse `EventEditForm.onDelete`. Ça ne « marchait » que parce qu'une string n'a pas de `.id` — un faux négatif silencieux qu'aucun test n'aurait attrapé. **Règle : brancher un callback sur `DeleteConfirmDialog` via un wrapper `() => cb()` explicite, jamais par référence directe si la signature diffère.** (Sprint 46, review)

## PIT-S46-004 — Le gate `[MISSING]` de `/sprint end` grep le littéral : écrire « aucun [MISSING] » bloque la PR
En S46, la Phase 9 de `/sprint start` a avorté sur son propre audit : le fichier contenait la phrase « Aucun `[MISSING]` : les écarts sont couverts », et le gate fait un `grep -q "\[MISSING\]"` littéral. Même famille que les faux positifs du heuristique COVERAGE-E2E du même skill (word-splitting sur la liste de testids, qui remonte des stubs de test comme écarts réels). **Règle : ne jamais employer le jeton `[MISSING]` en prose dans un artefact audité par grep — formuler « aucun écart non couvert ».** (Sprint 46, Phase 9)

## PIT-S47-001 — Un `find` qui renvoie 0 ne prouve PAS une absence : le cwd du shell persiste entre les appels
En S47, le lead a annoncé « le repo contient ZÉRO `.stories.tsx` » et briefé #205 sur « tu établis la convention ». Le repo en contient **23**, dont 6 dans le répertoire cible. Cause : `find frontend/src -name '*.stories.tsx'` lancé alors que le shell avait déjà `cd frontend` → il interrogeait `frontend/frontend/src`, inexistant. Le même piège avait fait annoncer `.storybook/` absent quelques minutes plus tôt. **Règle : un résultat vide prouve seulement que la commande n'a rien trouvé — vérifier d'abord que le chemin interrogé existe (`ls` du répertoire de recherche), et ancrer tout `find`/`ls` de vérification sur un chemin ABSOLU.** Un « le repo ne contient aucun X » dans un briefing est une hypothèse, pas un fait : 5 s de vérification contre des heures de convention réinventée. (Sprint 47 #205)

## PIT-S47-002 — Le profil `dev` fige `app.cors.allowed-origins=:3000` : un front sur un autre port échoue en accusant le rate-limit
En S47, monter le front E2E sur `:3100` (le `:3000` étant squatté par un autre projet) a produit `403 Invalid CORS request` sur `POST /api/auth/register` — le proxy Next relaie l'`Origin` réelle. L'app reste alors sur `/fr/register` et `auth.setup.ts` throw **« rate-limit register 5/min/IP probable »**, alors que le rate-limit était désactivé. Diagnostic envoyé dans le mur. **Règle : `app.cors.allowed-origins` n'a PAS de placeholder d'env en profil `dev` — l'override se fait en argument de lancement (`--app.cors.allowed-origins=...`). Et devant un échec de `auth.setup.ts`, vérifier le code HTTP réel du register avant de croire le message.** (Sprint 47)

## PIT-S47-003 — La base de dev `eventmanager` est inmigrable : V7 casse sur des données que V9 nettoierait
En S47, booter le backend sur la base de dev (figée à V6) échoue : `V7__design_v3_schema.sql` → `events_recurrence_unit_check` violée par des lignes `events` héritées. La migration `V9__neutralize_invalid_recurrence_unit` corrige précisément ces données, mais s'exécute **après** V7 — l'ordre rend la reprise à froid impossible. **Règle : utiliser la base dédiée `eventmanager_e2e` (déjà en V15) pour tout boot local ; ne pas tenter de réparer `eventmanager`.** Corollaire de conception : une migration de nettoyage de données doit précéder la contrainte qui les rejette, sinon elle est inatteignable sur les bases anciennes. (Sprint 47)

## PIT-S47-004 — Playwright en local : `workers > 1` rougit 4 specs `settings-*` pour une raison qui n'a rien à voir avec le code
En S47, la suite complète en parallèle donne 4 échecs `toHaveValue` sur l'username (`Expected sh1763487562199 / Received sh1763287562082`) : deux **pid** distincts ont chacun généré leur identité, `.auth/accounts.json` n'étant pas partagé à temps entre processus (cf. §IDENTITÉS PARTAGÉES de `e2e/support/accounts.ts`). En `--workers=1` : 49/49 vert. La CI est déjà en `workers:1`, d'où l'invisibilité du problème. **Règle : toujours `--workers=1` en local ; un écart Expected/Received sur un username E2E est un symptôme de parallélisme, pas une régression.** (Sprint 47)

## PIT-S47-005 — `npm run build` tue le `next dev` en cours, et Next 15.5.22 peut renvoyer un 500 fantôme après recompilation
En S47, deux causes distinctes ont produit des runs E2E rouges sans rapport avec le code. (1) `npm run build` / `build-storybook` réécrivent `.next` sous les pieds du serveur de dev, qui meurt sur `ENOENT ... _buildManifest.js.tmp` — frappant quand plusieurs agents partagent un working tree. (2) Après plusieurs recompilations à chaud, le serveur renvoie **500 sur `/fr/register`** (`InvariantError: Expected clientReferenceManifest to be defined`), ce qui tue `auth.setup.ts` et donc **tout le run, 0 spec exécutée**. **Règle : suite entièrement rouge dès le `setup` → `curl` le code HTTP de `/fr/register` ; si 500, redémarrer le `next dev` au lieu de chercher le bug dans la spec. Et séquencer builds et runs E2E.** (Sprint 47)

## PIT-S48-001 — Contraste bi-mode : la contrainte serrée change de fond selon le thème
En S48 (#293), aucun token de bordure Graphite n'atteignait le seuil UI de 3:1 (`--color-rule` = **1.24:1**, `--color-rule-strong` = **1.50:1**, mesurés). Piège du choix de valeur : en **clair** la contrainte serrée est `--color-bg` (`#FCFCFD`, plus sombre que `surface`), en **sombre** c'est `--color-surface` (`#131519`, plus clair que `bg`) → **il faut valider les 4 combinaisons, jamais 2**. `gray-400` échoue en clair (2.75), `gray-500` échoue en sombre (**2.99** vs surface). ⚠ **Ne PAS en conclure « une valeur unique clair/sombre est impossible »** — c'est l'erreur qu'a faite le lead dans son briefing : il existe une **fenêtre de luminance commune** (ici L ∈ [0.123, 0.292]) et `--gray-450 #7A7E87` passe les 4 fonds (3.97 / 4.07 / 4.81 / 4.49). (Sprint 48 #293)

## PIT-S48-002 — Tailwind v4 scanne les COMMENTAIRES : citer une classe morte la ressuscite
En S48 (#293), citer `border-ink-muted` dans une docstring ou un test suffit à faire regénérer l'utilitaire par le scanner Tailwind, alors que plus aucun élément ne la porte. Reformuler les commentaires pour citer le **token** (`--color-ink-muted`), pas la classe. Corollaire test : `\bborder-rule\b` **matche** `border-rule-emphasis` (le `-` est une frontière de mot) → assertion faussement verte ; utiliser un lookahead `(?![-\w])`. (Sprint 48 #293)

## PIT-S48-003 — `.section-animation { opacity: 0 }` sans repli = landing INVISIBLE, pas « non animée »
En S48 (#56), le pattern reveal-on-scroll met les sections à `opacity: 0` et un `IntersectionObserver` ajoute `.visible`. Si l'API manque (jsdom, navigateur ancien) ou si l'observer ne tourne pas, **la page entière reste invisible** — panne totale, pas dégradation. Un repli explicite a été ajouté dans `useSectionAnimation` (révèle tout immédiatement si `IntersectionObserver === undefined`). **Règle : toute classe de révélation au scroll doit avoir un repli quand l'API manque.** (Sprint 48 #56)

## PIT-S48-004 — Changer une URL casse des specs E2E que le grep des `href` ne trouve pas
En S48 (#56, ADR-006), la bascule `/[locale]/home` → 308 vers `/[locale]` aurait rougi `e2e/auth-guard.spec.ts`, qui assertait `status === 200` sur `/fr/home` avec `maxRedirects: 0` — via une **constante locale `PUBLIC_PATHS`**, pas un `href`. **Grepper `e2e/` ET `src/lib/` (constantes de chemins) avant tout changement de route, pas seulement les `href`/`push`.** (Sprint 48 #56)

## PIT-S48-005 — `<Button asChild>` remonte sur le `<a>` des propriétés qui ne s'appliquaient qu'à l'élément interne — DEUX régressions invisibles aux tests
En S48, la conversion `<Link passHref><Button>` → `<Button asChild><Link>` (#295, correction a11y légitime) a produit **deux bugs distincts en production**, tous deux invisibles à la suite unitaire, au reviewer et à `next build`. Radix `Slot` fusionne les classes du bouton **sur le `<a>`**, qui devient à la fois flex item ET porteur du CSS du bouton :
1. **Cascade `@layer`** — `ds/tokens/base.css:35` déclare `a { color: var(--color-accent) }` **hors de tout `@layer`**. Le CSS **non-layerisé bat le CSS layerisé quelle que soit la spécificité**, donc il écrasait `text-accent-ink` (dans `@layer utilities` de Tailwind v4) : les 2 CTA primaires de la landing étaient **bleu sur bleu, contraste 1:1, invisibles**. Correctif : encapsuler la règle d'élément dans `@layer base` (`842a46c`). ⚠ Ne pas layeriser tout `base.css` à l'aveugle : `h1..h6 { margin: 0 }` y écrase des `mb-*`, et le bloc `!important` de `prefers-reduced-motion` verrait sa priorité **inversée** (pour les déclarations `!important`, l'ordre des layers s'inverse).
2. **Taille minimale flex** — `.cta-button` (`landing.css:47`) porte `overflow: hidden` (pour la brillance `::before`). Or **un flex item dont l'`overflow` n'est pas `visible` a une taille minimale automatique de 0** → il absorbe toute la compression et se fait écraser : le CTA du hero rendait **125px pour 266px de contenu**, tronqué en plein mot (« cer gratuit »). Correctif : `min-w-min` + rangée `flex-wrap` avec `gap-*` (`903fc3e`).
**Règle : lors d'une conversion `asChild`, auditer `overflow`, `height` et `white-space` sur l'élément fusionné, et vérifier au navigateur.** **jsdom ne résout NI la précédence des `@layer` NI aucune mise en page** — cette famille entière de bugs (« la classe est là mais le rendu est faux ») est indétectable en RTL. (Sprint 48, corrections de clôture)

## PIT-S49-001 — Un couple `hover:bg-*` + `hover:text-*` dans un variant partagé est CASSABLE PAR CONSTRUCTION — 4 CTA invisibles en production
En S49, `Button variant="outline"` (et `ghost`) portait `hover:bg-accent hover:text-accent-foreground`. `tailwind-merge` fusionne bien `hover:bg-accent` ← `hover:bg-surface` posé par un consommateur (même propriété, même variante), **mais `text-ink` (base) et `hover:text-accent-foreground` (variante `hover`) sont des clés DIFFÉRENTES et coexistent**. Résultat : au survol, fond = `surface`, encre = `accent-ink` → **texte de la couleur exacte du fond**. Ratios MESURÉS : **1.00:1** (CTA secondaire du hero, clair), **1.03/1.00:1** (boutons « Retour » de `/privacy` et `/terms`, `ghost`), **3.83:1** (ancres du menu burger, 15 px → seuil 4.5). Défaut pré-existant depuis la migration Tailwind v4, **invisible à jsdom et à `next build`**. Correctif : **supprimer la paire**, pas la réécrire — CSS ne sait pas dériver une encre d'un fond, donc le survol ne doit changer que la **surface** (`hover:bg-accent-soft`, qui préserve l'encre de repos). **Règle : ne jamais poser de `hover:text-*` dans un `cva` partagé.** Garde-fous AST : `button.hover-pairing.test.ts` + `landing.hover-pairing.test.ts` (qui autorise la paire *sanctionnée* `hover:bg-accent`+`hover:text-accent-ink`). ⚠ **5 occurrences identiques subsistent sous `focus:`** dans `ui/dropdown-menu.tsx` (4) et `ui/select.tsx` (1). (Sprint 49 #337 + correctifs de review)

## PIT-S49-002 — L'échelle typo du DS Graphite ÉCRASE celle de Tailwind — tout budget de largeur calculé sur les valeurs Tailwind est faux d'un facteur ~2
En S49 (#334), `--text-3xl` vaut **57 px** (pas 30) et l'échelle DS s'arrête là : **`--text-4xl` et `--text-5xl` N'EXISTENT PAS**, donc `md:text-4xl` retombe sur le défaut Tailwind (36 px) et **RÉTRÉCIT** le titre au desktop. Conséquences mesurées : les 5 `h2` de la landing faisaient 57 px en mobile et 36 px au desktop (taille inversée), le `h1` du hero (`text-4xl` = 36 px) était **plus petit que ses propres `h2`**, et une revue `ui-design` a produit un budget de largeur faux d'un facteur ~2 en raisonnant sur les valeurs Tailwind (« logo ~140 px en `text-lg` » → réel 155 px, marge en allemand 2 px au lieu de 18). **Toujours lire `frontend/src/styles/ds/tokens/typography.css` avant tout calcul de largeur.** `leading-tight` explicite est obligatoire : aucun `--leading-*` n'est exposé au `@theme`, Tailwind garde donc son ratio par défaut. (Sprint 49 #334)

## PIT-S49-003 — Un grep sur `frontend/src` RATE `frontend/app` (App Router hors `src/`) — le lead a « corrigé » une issue dans le mauvais sens
En S49 (#336), le briefing affirmait, en correction du corps de l'issue, que les formulaires auth n'avaient **aucune** occurrence de `border-rule-strong` en TSX. Faux : ils en portaient **10**, sous `frontend/app/[locale]/`. Le grep du lead tournait depuis `frontend/` sur `src` seul. Inventaire réel 35 (21 `src` + 14 `app`) au lieu des 33 annoncés, et **5** tests à mettre à jour au lieu de 1. **Le piège était DÉJÀ en mémoire projet** (« app router = `frontend/app/`, PAS `frontend/src/app/` ») — la rechute a eu lieu quand même. **Règle : `grep -rn <motif> frontend/src frontend/app` ensemble, systématiquement, et depuis la RACINE du dépôt** (un pathspec `git grep -- 'frontend/app'` lancé depuis `frontend/` ne matche rien et renvoie un faux « 0 occurrence »). (Sprint 49 #336)

## PIT-S49-004 — Les panneaux navigateur d'agent mentent : `document.hidden` tue `IntersectionObserver`, et `innerHeight` ≠ `clientHeight`
En S49, un agent a signalé en **P1** que « la landing est invisible au chargement » (7 sections à `opacity: 0`), avec un mécanisme (« un re-render React efface la classe posée par `classList.add` ») **contredit par le code** : les sections portent un `className` littéral statique, et React ne réécrit pas un attribut dont la prop n'a pas changé. Le lead a reproduit le symptôme puis l'a invalidé par un **témoin de contrôle** : une `<div>` 200×200 observée avec les options par défaut obtient **0 callback** — `document.hidden === true` dans ce panneau, et un `IntersectionObserver` ne fire **jamais** dans un onglet masqué. Playwright (onglet réellement visible) a ensuite **formellement infirmé** le bug. Autre artefact de la même famille : `innerHeight` (946) ≠ `clientHeight` (812) fait paraître un `fixed inset-y-0` débordant. **Règle : avant de déclarer un bug de rendu observé dans un panneau d'agent, poser un témoin de contrôle et vérifier `document.hidden`. `scrollWidth`/`clientWidth` reste fiable dans cet état ; tout ce qui dépend de l'observation de viewport, non.** (Sprint 49 #335, enquête lead)

## PIT-S49-005 — Trois façons dont un test de contraste/rendu passe au VERT à tort
En S49 (#337 + review), le harnais même destiné à attraper les régressions visuelles se trompait **du côté permissif** :
1. `ctx.fillStyle = <valeur invalide>` est un **no-op silencieux** → le canvas garde sa valeur par défaut et composite un **noir opaque**, gonflant le ratio. Correctif : deux sentinelles, comparer, **lever**.
2. `expect.poll(...).toBeGreaterThanOrEqual(seuil)` sur un état **animé** s'arrête sur l'état de **départ** encore conforme → le défaut de survol passait vert **1 run sur 2**. Attendre la **stabilité** (2 lectures identiques) avant de juger.
3. `toBeVisible()` de Playwright **passe sur un élément à `opacity: 0`** — inutilisable comme garde avant une mesure.
S'y ajoutent : `transition-all` **interpole** (injecter `transition: none` avant mesure) et le curseur reste où Playwright l'a laissé, donc un `scrollIntoViewIfNeeded` peut placer un bouton **sous la souris** et le faire mesurer en `:hover` (1.00:1 au lieu de 17.32:1) → `page.mouse.move(0, 0)` avant toute mesure de repos. **Tout test de contraste doit être validé par MUTATION.** (Sprint 49 #337)

## PIT-S49-006 — Deux agents ont déclaré la stack E2E morte alors qu'elle tournait ; et `test-quiet.sh e2e` contourne le `--workers=1` du runbook
En S49, les agents de #69 et #334 ont rendu `PARTIAL` sur « E2E non exécutables, backend down » après un `docker compose up` bloqué >20 min sur « load metadata ». **Docker répondait (29.2.1) et les images `mytimeline-backend` / `mytimeline-frontend` / `postgres:16` étaient DÉJÀ en cache** — le blocage venait d'un *build* qui repartait interroger Docker Hub. Un troisième agent a monté la stack via le runbook S47 sans difficulté : **baseline 68/68 verte en 113 s**. **Vérifier `docker images` avant d'accepter un « stack down » d'un subagent.** Piège supplémentaire trouvé au passage : **`./scripts/test-quiet.sh e2e` ne passe PAS `--workers=1`**, contournant le réglage n°2 du runbook → 4 specs `settings-*` rouges sans rapport avec le code. Préfixer **`CI=1`** (la config force alors 1 worker). Autre symptôme trompeur : un clic E2E **avant hydratation** donne un « élément introuvable » erratique → `expect(async () => { click; toBeVisible }).toPass()`. (Sprint 49, #69/#334/#337)

## PIT-S49-007 — Tailwind v4 scanne les fichiers `.test.ts` : un témoin de test peut générer du CSS invalide et mettre l'app en 500
En S49 (correctifs de review), un **témoin négatif** de garde-fou AST contenant la chaîne
`[&_svg:not([class*='size-'])]:size-4` (avec guillemets échappés) a été **scanné par Tailwind v4** depuis
le fichier de test, générant du CSS invalide dans `globals.css` → **500 sur toute l'application**.
Aggravation en boucle auto-entretenue : les `test-results/**/error-context.md` produits par Playwright
**recopient le message d'erreur**, donc la classe fautive, et Tailwind les re-scanne **malgré le
`.gitignore`**. Guérison : jetons inertes (`zz*`) dans les témoins, suppression des `error-context.md`
empoisonnés, mise à l'écart de `.next`. **Symptôme trompeur** : ressemble trait pour trait au bug de
manifeste du serveur de dev décrit au runbook S47 §Instabilités — on cherche donc du côté du serveur au
lieu du CSS généré. **Règle : dans un témoin de test, n'écris jamais une classe utilitaire plausible ;
utilise des jetons inertes.** (Sprint 49, correctifs de review)

## PIT-S49-008 — Un défaut de contraste peut n'exister QUE dans un état mixte souris + clavier
En S49, l'item de locale **active** de `LanguageSelector` porte `bg-accent text-accent-foreground` puis
`hover:bg-surface-2`. Mesuré au **survol souris seul : 4,71:1 — conforme**, car Radix focalise l'item au
`pointermove` et son `focus:bg-accent` (`ui/dropdown-menu.tsx:77`) restaure le fond. Mais dans l'état
**souris posée + flèches clavier** (le focus part, `:hover` reste), le fond redevient `surface-2` avec
l'encre `accent-ink` : **1,10:1 en clair, 1,17:1 en sombre**. État atteignable par un utilisateur réel.
`tailwind-merge` ne fusionne pas `hover:bg-*` avec `focus:bg-*` (clés distinctes) : **les deux
s'appliquent**, et seul l'ordre de cascade tranche — ce qui ne se déduit pas, il faut mesurer.
**Règle : sur un composant Radix à `focus:` concurrent, mesurer le survol souris seul ne prouve rien —
tester aussi l'état `:hover` sans `:focus`.** Voir [[PIT-S49-001]]. (Sprint 49, correctifs de review)

## PIT-S50-001 — L'`alg` d'un JWT est choisi par le PORTEUR du jeton, et une clé publique est publique
Migrer en RS256 (#323) déplace le risque au lieu de le supprimer si la vérification accepte l'algorithme
annoncé dans l'en-tête : **la clé publique étant distribuée à l'Edge, quiconque la connaît peut forger un
jeton `alg: HS256` en s'en servant comme secret HMAC** — c'est-à-dire n'importe qui. Idem `alg: none`.
**Règle : exiger `alg === "RS256"` AVANT de toucher à la signature, des DEUX côtés** (`auth-token-verify.ts`
le fait avant tout appel `crypto.subtle`; côté backend jjwt `verifyWith(PublicKey)` rejette par typage de clé).
Les deux forges sont exercées en unitaire ET en E2E (`e2e/support/rs256.ts`). Corollaire trouvé au 2ᵉ cycle
de review : `Jwts.parser().verifyWith(publicKey)` ne **fige** pas l'algorithme non plus (RS384/RS512/PS256
passeraient) — assertion d'en-tête ajoutée pour aligner les deux côtés. (Sprint 50, #323)

## PIT-S50-002 — Un défaut « dégradé silencieux » n'échoue pas au boot : c'est exactement ce qui le rend dangereux
Une `jwt.private-key` vide ne casse rien — `JwtService` génère une paire RS256 **éphémère** et l'application
démarre normalement. En production, le symptôme est une **déconnexion globale à chaque redéploiement**, sans
la moindre erreur. Même famille côté frontend : `AUTH_JWT_PUBLIC_KEY` absente ⇒ la garde retombe sur la seule
présence du cookie, et `APP_CANONICAL_HOST` absente ⇒ le `Location` redevient dérivé de `Host`.
**Règle : tout défaut dégradé a besoin d'un garde-fou de boot explicite** (`ProfileSafetyGuard` le fait côté
backend) **et d'un signal côté frontend**, où aucun équivalent n'existe. Au 2ᵉ cycle de review, la
signalisation s'est révélée **inversée** : le cas rare (variable typotée) était signalé, le cas le plus
probable (variable oubliée) était muet — corrigé par un `console.warn` one-shot conditionné à
`NODE_ENV === 'production'`. (Sprint 50, #322/#323 + review)

## PIT-S50-003 — Passer une fonction en `async` casse les call sites de test EN SILENCE
`middleware.ts` est devenu `async` au S50. Sans `await`, `response.status` vaut `undefined` et l'assertion
ne lève pas d'erreur de type : **le test passe et ne prouve plus rien**. `tsc` seul ne l'attrape pas.
**Règle : après un passage en async, grepper les appels non préfixés d'`await` dans les fichiers de test.**
(Sprint 50, #323)

## PIT-S50-004 — `url.host = 'h'` ne supprime PAS le port existant (WHATWG)
En réécrivant l'origine d'une redirection (#322), la 307 sortait en `http://app.example.test:3133/fr/login`
— le port interne du conteneur. **Écrire `hostname` PUIS `port`.** Invisible en unitaire tant qu'aucune URL
de départ n'a de port : trouvé en interrogeant un `next start` réel, pas la suite Vitest. (Sprint 50, #322)

## PIT-S50-005 — `openssl … | base64` replie à 76 colonnes sur GNU, pas sur BSD/macOS
Une clé privée générée via la commande documentée sort **sur plusieurs lignes en conteneur Linux** (mesuré :
6 lignes pour 300 octets) mais sur une seule depuis un poste macOS. Un fichier `.env` ne lit qu'une ligne
⇒ **clé tronquée en production, invisible depuis le poste de dev**. Toujours suffixer `| tr -d '\n'`.
Cas d'école d'un reviewer « faux sur la plateforme de test, vrai sur la plateforme cible ». (Sprint 50, review)

## PIT-S50-006 — Un audit documentaire écrit en vague N est périmé par le code de la vague N+1 du MÊME sprint
L'audit d'exposition des secrets (#249, vague 1) décrivait comme « en dur au HEAD » trois valeurs que #323
avait supprimées en vague 2, **sur la même branche**. Auto-contradiction dans un dépôt public, sur la section
la plus sensible du document. Un second résidu (`docker-compose.yml … JWT_SECRET:45`) a survécu au premier
cycle de correction et n'a été vu qu'au second. **Règle : relire les sections « au HEAD » de tout document
de vague N contre le HEAD réel avant clôture.** (Sprint 50, #249 + review)

## PIT-S50-007 — Le hook RTK tronque les SORTIES, pas seulement les diffs : il fausse les MESURES
Déjà connu pour `gh pr diff`, le filtre s'applique aussi à `npx vitest` : la sortie d'un run a été réduite à
`PASS (62) FAIL (0)`, ce qui m'a fait conclure **« 0 bloc stderr »** et contester à tort un reviewer qui avait
raison — il y en avait **2**. `command gh` ne contourne rien (RTK est un hook Claude Code, pas un alias shell).
**Contournements mesurés : `rtk proxy <commande>` pour une sortie brute ; `gh api /repos/<org>/<repo>/pulls/<N>
-H "Accept: application/vnd.github.v3.diff"` pour un diff complet** (9059 lignes rendues contre 512).
Les 3 reviewers du sprint sont tombés dedans. **Briefer ce piège dans tout prompt de reviewer.** (Sprint 50)

## PIT-S50-008 — Retirer un défaut vide d'`application-prod.properties` casse le message du garde-fou
Corriger `${JWT_PRIVATE_KEY:}` en `${JWT_PRIVATE_KEY}` restaure bien la barrière « placeholder non résolu =
boot refusé »… mais `env.getProperty()` **lève alors depuis l'intérieur** de `ProfileSafetyGuard`, remplaçant
le message d'exploitation par un « Could not resolve placeholder » opaque. Solution : dans un
`ApplicationListener` de fail-fast, envelopper la lecture et traiter « irrésoluble » comme « non fournie » —
on garde **2 barrières ET** le message lisible. (Sprint 50, correctifs de review 2ᵉ cycle)

## PIT-S52-001 — Mesurer un débordement de mise en page sur macOS seul ne prouve RIEN
Les métriques de police diffèrent entre macOS et Ubuntu, et `de` est la locale la plus large.
**#334 (S49) puis #347 (S52) ont tous deux conclu « écart 0 partout » depuis macOS ; la CI Ubuntu les a
démentis les deux fois** — au S52, `scrollWidth=321 > clientWidth=320` à 320 px en `de`, un seul pixel.
Solution : mesurer dans `mcr.microsoft.com/playwright:v<version>-jammy` (Docker). Prévention : **viser une
marge à deux chiffres** — un correctif qui laisse 0 à 4 px est un échec CI en attente (`es` était à 4 px).

## PIT-S52-002 — Un port qui répond ne prouve pas que c'est VOTRE process qui répond
En worktree partagé avec des agents concurrents, `curl :8080` renvoyait 401 → « backend prêt ». En réalité le
backend de l'agent avait échoué (port déjà pris) et il mesurait **celui d'un autre agent**. Solution :
`lsof -nP -iTCP:<port>` **et** lecture du log de démarrage du process. Prévention : ne jamais conclure
« mon service tourne » sur la seule réponse du port. (A produit 28 faux échecs E2E au S52.)

## PIT-S52-003 — Un `text-*` posé sur le conteneur d'un composant Radix est hérité, donc cassable
L'encre héritée est perdue dès qu'un consommateur enveloppe l'item dans un `<a>` / `<Link>` : l'élément `<a>`
réimpose sa propre couleur au milieu de la chaîne d'héritage. Solution : poser l'encre en utilitaire sur
**l'élément dont on garantit le ratio**, pas sur son ancêtre. Prévention : mesurer
`getComputedStyle(el).color` sur l'élément lui-même, jamais raisonner sur la classe du conteneur.

## PIT-S52-004 — L'indicateur de focus n'est pas forcément dans le `className` du composant
Conclure « l'item perd son focus visible » parce que sa classe `focus:bg-*` ne change plus la surface est
faux ici : `ds/tokens/base.css` pose un `:focus-visible { outline: 2px solid … }` **hors de tout `@layer`**,
qui bat `outline-hidden` et fournit l'indicateur indépendamment du fond. Solution : lire
`getComputedStyle(el).outlineStyle/Color/Offset` **et** `el.matches(':focus-visible')` avant de proposer un
anneau. **Corollaire pour #339** : cette règle non-layerisée est **porteuse d'accessibilité** — layeriser
`base.css` en bloc lui ferait perdre sa priorité sur `outline-hidden`.

## PIT-S52-005 — Sonde `wget localhost` en image alpine : `unhealthy` à vie sur une app qui répond 200
`/etc/hosts` du conteneur mappe `localhost` sur `127.0.0.1` **et** `::1` ; BusyBox wget tente `::1` d'abord ;
Next standalone n'écoute que sur `0.0.0.0:3000` (IPv4). Le service `frontend` du compose est donc marqué
`unhealthy` en permanence. Solution : cibler `127.0.0.1` explicitement dans le healthcheck.
> **RÉSOLU en #376 (Sprint 55, 2026-07-30)** — `docker-compose.yml` vise `127.0.0.1`, vérifié par un
> `docker compose up` réel (`frontend Up (healthy)`, `FailingStreak: 0`). Le « Piège connu n° 4 » du
> README a été supprimé et l'explication déplacée en commentaire au contact du YAML. **Le pitfall
> reste valable comme règle générale** : `backend` et `postgres` sondent toujours `localhost`
> (`docker-compose.yml:23` et `:59`) et ne sont verts que par repli IPv4 de `pg_isready`/`curl`.

## PIT-S52-006 — Un plan d'architecte peut produire le FAUX négatif de chemin fantôme
5ᵉ sprint consécutif de « chemins fantômes » — mais cette fois **l'architecte a déclaré à tort qu'un fichier
n'existait pas** (`deploiement-profils.md` annoncé introuvable), sur la foi d'un `ls` d'un **seul répertoire**.
Le fichier existe, sous `docs/runbook/`. Le lead a propagé l'erreur dans 3 artefacts avant correction.
Solution : `find docs -name "<fichier>"` avant de déclarer un chemin inexistant. Prévention : **une réfutation
de prémisse doit citer la commande qui balaye tout l'arbre**, jamais un `ls` ciblé.

## PIT-S52-007 — Le hook RTK décale aussi `git log` (amende PIT-S50-007)
`PIT-S50-007` couvrait `gh pr diff` et `vitest`. Au S52 : après un `git checkout -b`, `git log --oneline -3`
affichait le commit **parent** en tête alors que `git rev-parse HEAD` donnait le bon SHA. Symptôme plus
traître que le diff vide : **la sortie a l'air plausible**. Solution : `git rev-parse` fait foi pour savoir
où l'on est ; `rtk proxy git log` pour l'historique. Ne jamais conclure « la branche est au mauvais endroit »
sur un `git log`.

## PIT-S53-001 — En Tailwind 4, `text-*` apparie un `line-height` : layeriser une règle d'élément la lui fait céder
Le correctif de #339 layerisait les 5 propriétés de `h1..h6` en bloc. Or une utilitaire `text-*` ne pose pas
que `font-size` : elle pose **aussi** `line-height: var(--tw-leading, var(--text-lg--line-height))`, défauts
émis dans `@layer theme`. Hors layer, la règle du DS battait cet appariement ; layerisée, elle **cède**.
Mesuré : `h2.text-lg` **29,16 px (1.08) → 42 px (1,5556)**, `h1.text-xl` **37,8 → 49 px**. **28 titres** du
dépôt portent `text-*` sans `leading-*` explicite → dérive **systémique et silencieuse** du rythme typo.
Mapper `--leading-*` dans `@theme` **ne protège pas** : ça gouverne les utilitaires nommées `leading-*`, pas
l'appariement. Solution : sortir `line-height` du layer, seul ; les 4 autres propriétés y restent (elles
doivent céder, c'est l'objet de #339). Contrepartie mesurée nulle (les 6 titres à `leading-*` explicite
valent déjà 1.08).

## PIT-S53-002 — Un `:root` hors layer aux noms du namespace `@theme` rend la lecture de `@theme` trompeuse
`ds/tokens/typography.css` déclare `--leading-*` / `--tracking-*` / `--text-*` dans un `:root` **hors layer**,
avec les mêmes noms que le namespace de thème de Tailwind 4 (qui émet ses défauts dans `@layer theme`).
Hors layer battant tout layer, **les tokens du DS gagnaient déjà**. Le lead a lu l'absence de ces clés dans
`@theme` et en a conclu que le défaut Tailwind s'appliquait (« `leading-tight` rend 1.25 ») : **faux**, il
rendait 1.08. Toute une décision de sprint a été bâtie sur cette inférence. Solution : ne jamais déduire une
valeur effective de la lecture de `@theme` seul — compiler via PostCSS et résoudre la précédence de layers
(helper `winningRootVar`, `base-layer.test.ts`). Corollaire dangereux : layeriser ces `:root` ferait basculer
toute l'échelle typo/chromatique sur les défauts Tailwind.

## PIT-S53-003 — Un audit de cascade par `className` littéral rate les utilitaires passées en prop
Le balayage de #340 concluait « 0 conflit » sur `ds/components/*.css` jusqu'à ce qu'un 2ᵉ passage résolve les
**consommateurs** de chaque composant : `AppShell` rend `<Avatar className="rounded-sm">`, et le
`border-radius` du DS (7 px) annulait l'override (5 px) — l'override était un **NO-OP** depuis toujours.
Solution : tout audit de cascade doit croiser classe-source **et** prop-passthrough. Prévention : sinon il
conclut faussement à l'absence de conflit, ce qui est pire que pas d'audit.

## PIT-S53-004 — Layeriser une règle `:hover` supprime l'état de survol s'il existe une utilitaire sans variante
`.feature-card:hover{box-shadow}` et `.testimonial-card:hover{border-color}` sont en conflit réel avec
`shadow-lg` / `border-rule` posées sur les mêmes éléments — mais ces utilitaires **n'ont pas de variante
`hover:`**. Les layeriser aurait fait gagner l'utilitaire en permanence → **l'élévation au survol
disparaissait**. La « correction » aurait créé la régression. Solution : avant de layeriser, vérifier les
paires (règle `:hover` hors layer / utilitaire non-hover sur le même élément). Cf. `DEC-S53-002`.

## PIT-S53-005 — Un conflit de cascade masqué par un correctif redondant sur une AUTRE propriété
`scrollbar-none` (`@utility` → `@layer utilities`) pose `scrollbar-width: none`, que le
`* { scrollbar-width: thin }` hors layer **annulait**. Invisible en développement : sous Chromium la barre
disparaissait quand même via l'**autre** moitié de l'utilitaire (`::-webkit-scrollbar{display:none}`,
propriété différente donc jamais en conflit). **Cassé sur Firefox seul** (`ProductCarousel:50`,
`DensityRibbon:77`). Anti-pattern : conclure « ça marche » depuis un seul moteur quand une utilitaire agit
par deux propriétés distinctes. ⚠ Le correctif n'a **pas** été observé sous Firefox, seulement déduit.

## PIT-S53-006 — Un rapport `test-runner` peut être faux de façon *plausible* (cwd sur le dépôt principal)
Le `test-runner` du S53 a rapporté `814/821`, « 1 suite en échec : Cannot find package
'eslint-plugin-storybook' » et « `base-layer.test.ts` : 2 tests ». **Les trois chiffres étaient faux** : le
paquet est déclaré ET installé, la suite donne **834/834**, le fichier contient **11** tests. Cause : cwd sur
le **dépôt principal** au lieu du worktree (`node_modules` différents) — cf. `PIT-S8` / `PIT-S38`. Le mode
d'échec est traître : le rapport est **plausible** (nombre proche du vrai + cause d'échec crédible), pas
manifestement cassé. Solution : ne jamais reprendre un chiffre de test d'un subagent dans un audit ou un
corps de PR sans l'avoir relancé soi-même depuis le worktree. Un écart de quelques tests est le **signal**
qu'il faut re-mesurer.

## PIT-S54-001 — Un backoff de retry qui dépasse le budget de timeout du test rend le retry ET son diagnostic inatteignables
Le retry 429 de `auth.setup.ts` était **mort depuis le S47** : le budget Playwright par défaut (30 s) est
inférieur au coût d'UN cycle (8 s d'attente `login-form` + 20 s de backoff bucket4j = 28 s), donc la 2ᵉ
soumission expirait **toujours** — mesuré 4/4 `provision` en `Test timeout of 30000ms exceeded`, sans une
ligne de diagnostic. Le message d'échec censé distinguer les causes n'était jamais atteint. Corrigé par
`PROVISION_TIMEOUT_MS` (150 s puis 180 s après recalcul du pire cas ~127 s en review — le premier calcul
oubliait les deux `ensureRegisterForm(recover)`, qui sont des boucles de retry complètes). Solution : tout
`waitForTimeout` de backoff impose un `test.setTimeout()` explicite couvrant `(tentatives × attente) +
(backoffs) + navigations + marge`, écrit en commentaire à côté de la constante.

## PIT-S54-002 — Un `grep` de testid n'atteste NI un usage réel NI un rendu
Deux faux positifs distincts, même racine, au S54. (1) **Faux OK de couverture** : le check COVERAGE-E2E du
protocole A.4 (`grep -rq "$val" frontend/e2e/`) a rendu OK sur `product-option-<id>` alors que la seule
occurrence était un **commentaire** (`timeline.spec.ts:41`) — le testid livré par #331 n'était consommé par
aucune spec. (2) **Faux « existe » de rendu** : trois specs de #330 échouaient sur un locator jamais résolu
(`timeline-zoom-in`, `timeline-fullscreen`, `timeline-loading`) — le grep prouvait qu'ils étaient *écrits*,
pas *montés* (rendu conditionnel au viewport, ou code mort masqué par un composant parent ajouté plus tard :
`AppShell` #210 court-circuite la branche loading de `timeline/page.tsx:47`). Solution : prouver un usage par
`grep -E "getByTestId|locator\("` (jamais la simple présence de la chaîne), et prouver un rendu au **runtime**
(`toHaveCount(1)` dans le contexte visé), pas au grep. Cf. [[jsdom-scroll-tests-prove-nothing]].

## PIT-S54-003 — `boundingBox()` d'un panneau animé se périme entre deux gestes et rend un oracle vacuous
Une mesure `boundingBox()` prise juste après `toBeVisible()` capture une position **transitoire** : ~24 px de
dérive mesurés sur le bottom-sheet (animation d'entrée puis réajustement de layout quand focus-trap +
scroll-lock se posent). Réutiliser cette box pour un geste `page.mouse` fait viser des coordonnées obsolètes
qui retombent sur l'élément *sous* le panneau → aucun `pointerdown` sur la cible → **aucun geste ne part**, et
un `toBeVisible()` post-geste reste vert « par inaction ». Le premier correctif (`059030d`) n'a rafraîchi que
la 2ᵉ mesure ; la review a rattrapé le 1er swipe resté vacuous. Solution : mesure fraîche **stabilisée** (deux
lectures consécutives égales, sans `waitForTimeout` arbitraire) avant CHAQUE geste, **plus** un oracle positif
que l'élément a bougé (`transform`/`translateY` pendant le drag) avant `mouse.up()`.

## PIT-S54-004 — Sur un worktree partagé, un E2E rouge peut appartenir au diff d'un AUTRE agent
En vague 1, la 1re passe E2E de #331 est sortie entièrement rouge dès le `setup` (`getByTestId('dashboard')`
absent), alors que le diff de #331 n'a rien à voir avec l'auth : #329 éditait `auth.setup.ts` **en direct dans
le même working tree** pendant le run. Solution : sur worktree partagé, isoler par `git stash push -- <mes
fichiers>` puis re-run avant d'accuser son propre diff ; un `POST /api/auth/register` en direct (201) départage
API vs UI en 2 s. Corollaire de méthode observé côté lead : **ne jamais lancer deux suites Playwright
concurrentes** contre un backend/une base uniques — la contention a produit 8 puis 12 rouges sur un code
identique (`event-outside-label` rougissait sous contention, passe au run isolé). La règle `--workers=1` du
runbook S47 vaut aussi AU-DESSUS du process Playwright. Cf. [[mytimeline-e2e-ci-only-gate]].

## PIT-S55-001 — Un placeholder NON VIDE dans `.env.example` défait le no-op qu'il documente
`BrevoEmailService:64` no-ope sur `apiKey.isBlank()`. Livrer `BREVO_API_KEY=xkeysib-REMPLACER-PAR-VOTRE-CLE`
fait donc prendre la branche HTTP : POST réel vers l'API → 401 → `log.error`, soit l'**inverse exact** du
« no-op silencieux » promis par le commentaire deux lignes au-dessus — et le fichier dit au dev de le copier
vers `.env`. Solution : valeur **vide**, format attendu dans le commentaire. Jumeau du même bug : une ligne
`VAR=` **exportée** (`set -a; . .env`, `env_file:`) fait EXISTER la propriété Spring avec la chaîne vide, qui
**écrase** `${var:default}` — commenter la ligne (`#BREVO_SENDER_EMAIL=`) pour que le défaut s'applique.
Prévention : pour chaque variable d'un `.env.example`, vérifier **dans le code** (a) si la branche teste
`isBlank()`, (b) si un défaut applicatif doit s'appliquer. Trouvé en revue, pas à l'écriture.

## PIT-S55-002 — `git commit --amend` en fan-out réécrit le commit d'un AUTRE agent
Sprint 55 : un agent a amendé pour remplacer un SHA placeholder dans son propre rapport. Entre son commit et
son amend, un autre agent avait poussé HEAD — **l'amend a réécrit le commit de l'autre**, qui porte désormais
4 lignes du rapport du premier. Rien perdu (`git log --stat`), historique faux. `--amend` réécrit le HEAD
*courant*, qui en fan-out n'est pas forcément le sien : aussi destructeur que `reset`. **Cause racine** :
demander à l'agent d'écrire son propre SHA dans son rapport crée mécaniquement le besoin d'amender.
Solution : ne pas le demander, ou accepter un 2ᵉ commit. Ajouter `--amend` à la liste des verbes git
interdits des briefings, aux côtés de `reset`/`rebase`/`checkout`/`stash`/`clean`.
Cf. [[sprint-parallel-commits-shared-worktree]].

## PIT-S55-003 — Le triage `/review-pr` compte les lignes de `docs/` et peut produire une review VIDE
PR #402 : 633 lignes → mode TEAM (seuil 300). Mais 355 de ces lignes sont des artefacts `docs/memory/**` que
la consolidation ne review pas, et les 4 spawns de la phase B.3 sont gatés sur `HAS_BACKEND`/`HAS_FRONTEND`/
`HAS_AUTH`/`HAS_DB` — **tous à 0** sur une PR devops/docs. TEAM aurait donc spawné **zéro reviewer**.
Solution : basculer en SOLO et le dire. Prévention : compter les lignes **hors `docs/`** pour le seuil, ou
tester qu'au moins un reviewer est éligible avant d'entrer en TEAM.

## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.

## PIT-S57-002 — Vitest tronque le rapport d'échec passé comme valeur comparée → message décapité en CI
Vitest 3.2.7 tronque à ~40 caractères les valeurs d'un `toBe` dans le message d'`AssertionError`
(`expected 'GARDE SERVEUR DÉSYNC…' to be …`), et le reporter JSON ne transporte **que** ce message. Un
rapport d'échec multi-ligne — précisément ce qui rend un garde-fou actionnable — est donc parfaitement
lisible en local et **inutilisable là où il compte**. Solution : passer le texte en **2ᵉ argument** d'
`expect(value, message)`. Prévention : tout test dont l'échec doit être actionnable doit être vu rouge
**sous reporter non interactif**, pas seulement en local. Symétrique de [[ci-green-is-not-page-correct]] :
ici c'est un rouge vert-en-apparence-utile qui ne survit pas au trajet vers la CI.

## PIT-S57-003 — Un `curl` qui réussit ne disculpe PAS le CORS : il n'envoie pas d'en-tête `Origin`
S57 : suite E2E entièrement rouge dès le projet `setup`, **trois diagnostics faux** avant le bon.
(1) Cause initiale banale — aucun serveur de dev sur `:3000` (arrêté par un agent de la vague précédente) ;
le subagent a pourtant conclu « CORS + backend injoignable ». (2) Relance sur `:3100` : toujours rouge, alors
que `curl -X POST :3100/api/auth/register` renvoyait **201** — ce qui semblait disculper le backend.
(3) Vraie cause : le proxy Next transmet `Origin: http://localhost:3100`, refusé par le profil `dev` figé sur
`allowed-origins=http://localhost:3000`. `curl` passait parce qu'il n'envoie pas d'`Origin`.
Ce qui a tranché : les statuts **instrumentés par le fixture** (`watchRegisterResponses`,
`e2e/auth.setup.ts`) → `[403, 403, 403]`, avec la grille de lecture déjà écrite dans le message d'erreur.
**Réflexe** : lire les statuts instrumentés AVANT toute hypothèse. Écartée en chemin, à tort suspectée :
`e2e/.auth/accounts.json` périmé — `globalSetup` appelle bien `clearPersistedAccounts()`.
Corollaire : un agent qui rend `PARTIAL` sur « E2E non joué » doit être re-vérifié, pas cru — ici le code
était bon, seul l'environnement était cassé. Cf. runbook `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.


## PIT-S58-001 — Le fond sous un `outline` n'est PAS le `background-color` d'un ancêtre
`outline-offset: 2px` peint le trait **sur le parent**, et ce qui s'y trouve réellement peut être un
dégradé, un `color-mix`, un pseudo-élément ou un empilement de surfaces. Remonter le DOM pour trouver le
premier ancêtre non transparent produit donc de **faux ratios** : S58 a mesuré **1,00:1** sur un CTA accent
avant que la lecture de pixel ne donne **5,93:1**. Corollaire symétrique, même sprint : une sonde
« pixel le plus écarté du fond » attrape la **bordure du popover** (1 px au-delà du trait) et annonce
**16,3:1 au lieu de 6,08:1**. Les offsets d'échantillonnage se fixent par **dump brut**, jamais par
heuristique de contraste maximal. Règle : tout ratio annoncé doit dire **comment** il a été obtenu —
`getComputedStyle` ne tranche que la couleur *déclarée*, jamais la couleur *peinte*.

## PIT-S58-002 — Mesurer un contraste au mauvais instant ou dans le mauvais état
Deux façons d'obtenir une valeur fausse sans que rien ne le signale.
(1) **Instant** : Tailwind v4 fait entrer `outline-color` (et les couleurs de bordure) dans
`transition-colors`. Une sonde lancée moins de **~400 ms** après le changement d'état lit une couleur
**interpolée**. Attendre ≥450 ms, et exiger que le pixel ET `getComputedStyle` concordent.
(2) **État** : S58 a lu 1,59:1 sur un bouton qui était `disabled` (`opacity:.4`), et un autre dont l'état
par défaut `aria-pressed=true` écrase la bordure par `accent`. **Asserter l'état avant de mesurer**
(`:focus-visible === true`, non `disabled`, `aria-pressed` connu) fait partie de la mesure.

## PIT-S58-003 — E2E : `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` se posent au `next build`
Les rewrites Next sont **sérialisés dans `routes-manifest.json`** au build : les poser au `next start` n'a
aucun effet. Sans `NEXT_PUBLIC_API_URL=/api`, `apiClient` perd son préfixe et produit des **404 invisibles**
pour le watcher d'`auth.setup.ts`, qui accuse alors le rate-limit, le CORS ou un 409 — trois diagnostics
faux. **Oracle fiable : `curl /api/auth/me` doit renvoyer 401.** S58 : un audit a rapporté 5 échecs E2E de
ce fait ; rejoués sur la même base après correction de l'environnement, **136/0/8 vert, en suite comme en
isolation**. Complète [[PIT-S57-003]] (un `curl` qui réussit ne disculpe pas le CORS) : ici c'est le
symétrique, un environnement cassé qui accuse le code.

## PIT-S58-004 — Un garde-fou cité dans la doc peut n'exister nulle part
`ds/a11y-audit.md` affirmait que toute réintroduction d'anneau local serait rattrapée par
`base-layer.test.ts` — ce fichier ne contenait **aucune** occurrence de `focus` / `outline` / `ring`.
Sur ce dépôt les commentaires servent de mémoire d'arbitrage : une garantie fictive est **pire** que pas de
garantie, parce qu'elle dissuade d'en écrire une vraie. **Vérifier l'existence réelle de chaque garde-fou
cité, pas seulement que le chemin du fichier résolve.** Et quand on écrit l'assertion manquante, écrire
**avec elle ce qu'elle n'attrape pas** (ici : elle verrouille la layerisation du CSS source, elle ne détecte
pas un `ring-2` réintroduit dans un `.tsx`).

## PIT-S58-005 — Trois pièges d'outillage qui déguisent un environnement en défaut applicatif
(1) Sous `next dev`, l'overlay **`nextjs-portal`** capte `elementFromPoint` dans le coin inférieur gauche →
première mesure géométrique faussement à `0×0`. Neutraliser `nextjs-portal{display:none}` avant de mesurer.
(2) `computer{left_click}` du connecteur navigateur **n'ouvre pas** un `DropdownMenu` Radix, même au centre
exact : Radix ouvre sur `pointerdown`. N'en pas déduire un défaut du composant.
(3) Le hook **RTK** tue `npx next dev|start` en ne laissant que « Errors: 1 » — un log serveur de 3 lignes
est un artefact RTK, pas un plantage de l'app. `rtk proxy` obligatoire. Voir [[rtk-git-diff-empty-output]].
