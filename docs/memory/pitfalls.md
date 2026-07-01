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
