# Patterns — MyTimeline

> Patterns réutilisables consolidés en fin de sprint.

## PAT-S1-001 — Ownership IDOR via helper d'identité
Contrôle d'accès sur les endpoints de mutation : helper privé (`resolveCaller(token)` → User|null ; `checkEventOwnership` → ResponseEntity d'erreur non-null ou null si OK) factorisant 401/404/403. L'identité est dérivée du JWT authentifié, JAMAIS d'un path param contrôlable par le client. Pour un event : `event → productId → product.getUser().getId() == caller.getId()`. (Sprint 1 #30/#91)

## PAT-S1-002 — resolveCaller centralise l'extraction JWT + le mapping d'erreur
`resolveCaller(token)` enveloppe `jwtService.extractUsername` dans `try/catch (JwtException) → null`, réutilisé par tous les checks d'ownership (createEvent, PATCH, DELETE). Évite la duplication d'`extractUsername` nu et le risque 500. (Sprint 1 #91)

## PAT-S2-001 — Helper unique de construction de cookie (source de vérité des attributs)
Poser et supprimer un cookie avec des attributs divergents (`Secure`/`Domain`/`SameSite`/`Path`) → le navigateur ne matche pas, cookie résiduel après logout. Factoriser un helper privé `buildJwtCookie(value, maxAge)` partagé login/refresh/logout ; `maxAge=0` pour supprimer. Anti-pattern : dupliquer `setSecure/setDomain/setSameSite` par endpoint. (Sprint 2 #32)

## PAT-S2-002 — 401 vs 403 propre sous Spring Security
Deux étages complémentaires : (1) `http.exceptionHandling(authenticationEntryPoint → 401, accessDeniedHandler → 403)` écrivant un JSON minimal directement dans `HttpServletResponse` (couvre les exceptions du filtre, hors DispatcherServlet) ; (2) handlers `AccessDeniedException`→403 / `AuthenticationException`→401 dans le `@RestControllerAdvice` (couvrent le chemin method-security `@PreAuthorize`). Champ `error` littéral (`unauthorized`/`forbidden`). Anti-pattern : compter sur le ControllerAdvice seul, ou sérialiser l'objet exception (fuite + 500). (Sprint 2 #51)

## PAT-S2-003 — Tester un rate-limit à fenêtre temporelle sans `Thread.sleep`
Bucket4j `.withCustomTimePrecision(TimeMeter)` + bean `TimeMeter` overridable en test (`@TestConfiguration` + `advance(Duration)`) → avancer le temps de façon déterministe. Anti-pattern : `Thread.sleep(60s)` pour attendre le reset de fenêtre. (Sprint 2 #33)

## PAT-S3-001 — Secrets : profil prod fail-fast (aucun default), profil dev avec default jetable
`application.properties` commun lit `${JWT_SECRET}` / `${DB_PASSWORD}` sans default ; `application-prod.properties` n'ajoute AUCUN default → le boot prod échoue (`Could not resolve placeholder`) si la variable manque. `application-dev.properties` fournit un default local non-secret explicitement marqué dev-only. Le fichier reste tracké mais secret-free. Anti-pattern : default secret partagé tous profils. (Sprint 3 #34)

## PAT-S3-002 — equals/hashCode d'entité JPA à PK `@GeneratedValue` (id transient avant flush)
Id assigné au flush → un equals/hashCode sur id direct casse en collection avant persist. Pattern Vlad Mihalcea : `hashCode()` = constante (`getClass().hashCode()`, stable avant/après persist) ; `equals()` = même `getClass()` + `id != null && Objects.equals(id, that.id)`. Deux entités neuves ne sont jamais égales par accident. Anti-pattern : `Objects.hash(id)` ou equals sur id nu. (Sprint 3 #43)

## PAT-S4-001 — 403 d'ownership : lever l'exception, ne pas construire le ResponseEntity
Un controller qui retourne `ResponseEntity.status(FORBIDDEN).build()` (body vide) court-circuite le contrat d'erreur centralisé. Lever `throw new AccessDeniedException("forbidden")` → le handler (advice ControllerAdvice OU `accessDeniedHandler` Security selon le chemin, cf. PAT-S2-002) produit le body uniforme `{"error":"forbidden"}`. Vaut pour 401/404 aussi : préférer l'exception au `ResponseEntity` ad hoc pour garder un contrat JSON cohérent. (Sprint 4 #100)

## PAT-S4-002 — Contrat d'erreur d'un controller : toujours JSON `{"error":...}`, jamais String brut
Mélanger `ResponseEntity.body("message texte")` et `body(Map.of("error",...))` sur les chemins d'erreur d'un même controller casse le contrat côté client. Tous les bodies d'échec en `Map.of("error", "<code>")`. Corollaire sécurité : pour ne pas créer d'oracle d'énumération, deux échecs sémantiquement distincts mais non divulgables (token invalide vs compte inexistant) doivent renvoyer un body **byte-identique** + même status. (Sprint 4 #105, fix review #113)

## PAT-S5-001 — Garde-fou démarrage fail-fast testable sans Docker
`ApplicationListener<ApplicationEnvironmentPreparedEvent>` enregistré via `META-INF/spring.factories` (clé `org.springframework.context.ApplicationListener`) s'exécute AVANT la création du contexte → peut refuser le boot tôt. Test unitaire avec `org.springframework.mock.env.MockEnvironment` + event mocké (0 Docker, 0 contexte). Anti-pattern `@PostConstruct` (trop tard, beans déjà créés). (Sprint 5 #111)

## PAT-S5-002 — Externalisation CORS par profil, default fail-safe
Origines via `@Value("${app.cors.allowed-origins:http://localhost:3000}") List<String>` au constructeur → `setAllowedOrigins`. Default fail-safe = localhost dev (JAMAIS `*`, incompatible `allowCredentials=true`). Prod SANS default → `${CORS_ALLOWED_ORIGINS}` ⇒ boot fail-fast si env var absente. Même esprit que PAT-S3-001/DEC-S4-001 (secrets/cookies). (Sprint 5 #120)

## PAT-S5-003 — Tester des valeurs de profil chargées d'un vrai fichier sans booter la DB
Pour vérifier qu'un `@Value` (ex `app.cookie.secure`) prend bien la valeur du fichier de profil : `@SpringJUnitWebConfig(config)` + `@TestPropertySource("classpath:application-dev.properties")` + bean controller réel + collaborateurs mockés → `@Value` résolus, `MockMvc` standalone sur le bean, aucune auto-config Boot (pas de datasource/Flyway). Anti-pattern `@SpringBootTest @ActiveProfiles("dev")` : exige Postgres `localhost:5432` hors Testcontainers → non déterministe. (Sprint 5 #117)

## PAT-S5-004 — Index sur colonnes FK : à créer explicitement
PostgreSQL ne crée PAS d'index sur les colonnes FK (≠ PK/UNIQUE) → migration dédiée `CREATE INDEX IF NOT EXISTS` sur chaque colonne FK, sinon scans séquentiels sur jointures et `DELETE` en cascade. (Sprint 5 #110)

## PAT-S5-005 — Valeurs CHECK SQL alignées sur l'enum applicatif, jamais devinées
Avant de figer un `CHECK (col IN (...))`, croiser ≥2 sources de vérité applicatives (logique backend + schéma Zod frontend) pour la liste autorisée. Anti-pattern : deviner les valeurs ou ne lire qu'une source. (Sprint 5 #108)

## PAT-S5-006 — @MockBean sur le type concret quand le contrôleur injecte le concret (A8)
Sous `@SpringBootTest`, si les contrôleurs injectent les `*ServiceImpl` concrets (anti-pattern A8 repo-wide) : `@MockBean` sur le type CONCRET (`*ServiceImpl`), pas l'interface, sinon `UnsatisfiedDependency` au boot. Boot 3.2 = `@MockBean` (pas `@MockitoBean`). (Sprint 5 #119)

## PAT-S7-001 — Tester un intercepteur axios sans réseau
`vi.mock('axios')` expose `create()` → l'instance dont `interceptors.response.use` capture le `rejectionHandler` dans une var module-scope ; on l'appelle directement avec un faux `error {response:{status}}`. Anti-pattern : monter un vrai apiClient et déclencher de vraies requêtes HTTP. (Sprint 7 #40)

## PAT-S7-002 — Conventions query-keys TanStack : factory par domaine
Factory par domaine, clé liste = préfixe de la clé détail, `as const` → `invalidateQueries` ciblé. Anti-pattern : littéraux de clés éparpillés dans les hooks. (Sprint 7 #48)

## PAT-S7-003 — Erreur métier en contrôleur → exception domain mappée par le handler global
Lever une exception domain (ex `InvalidCredentialsException`, `SamePasswordException`) mappée par `GlobalExceptionHandler` en corps plat `{error}`, distinct du `buildBody` détaillé des 404/validation. Garde la logique métier hors du contrôleur (hexagonal). (Sprint 7 #70)

## PAT-S7-004 — Migration progressive vers TanStack sans dupliquer le flux auth
AuthContext = source unique de l'utilisateur courant ; `useCurrentUser` = pont read-only sur le contexte (`queryFn` sans HTTP) → pas de double-fetch `/me`. NE PAS coupler ce hook aux écrans déjà sur `useAuth()`. Pattern réutilisable pour migrer progressivement vers Query. (Sprint 7 #48)

## PAT-S8-001 — Anti-énumération par déport `@Async` sur endpoint « toujours 200 »
Pour neutraliser le side-channel de timing (PIT-S8-002) : rendre la méthode de service `@Async` (`@EnableAsync` + `ThreadPoolTaskExecutor` en `infrastructure/config/`), le contrôleur répond 200 immédiatement, tout le travail branche-dépendant (lookup/INSERT/HTTP externe) part sur un worker. L'exception async est catchée EN INTERNE (log sans PII/token), jamais propagée au thread requête. (Sprint 8 #49fix)

## PAT-S8-002 — Port domaine pur pour service externe (email/secret)
`PasswordResetService` + `EmailService` = ports en `domain/ports/services`, impls en `application`/`infrastructure` (`BrevoEmailService` RestClient). Le domaine ignore Brevo/Spring. Référence pour futurs flux à effet de bord externe (SMS/2FA/webhook). (Sprint 8 #49)

## PAT-S8-003 — Erreurs serveur auth inline via whitelist d'endpoints exclus du 401 global
L'intercepteur axios global (toast + redirect `/login` sur 401) empêche le mapping inline des erreurs de formulaire auth. Fix : liste blanche d'endpoints auth (login/register/forgot/reset) exclus du handler global (match **ancré** sur le pathname, `=== || endsWith` — pas `includes`), le contexte relance l'erreur (après log assaini) pour affichage inline. (Sprint 8 #53)

## PAT-S8-004 — `<Suspense>` wrapper pour page lisant `useSearchParams`
Page App Router lisant le query-param (ex token reset) : sous-composant client `XxxForm` qui appelle `useSearchParams()`, enveloppé `<Suspense fallback={<Spinner/>}>` dans le default export (qui reste le point de montage des tests). Garde le SSG (`next build` OK) et l'accessibilité du fallback. (Sprint 8 #53 CI)

## PAT-S9-001 — Propager un nouveau champ dans TOUTES les reconstructions d'un domain model immuable
Ajouter un champ à un domain model immuable reconstruit par `new X(...)` (read-modify-persist) : auditer TOUS les sites `new X(` (`grep -rn "new User("`) et propager le champ, sinon data-loss silencieuse au save (ex : `avatar` remis à null par `changePassword`/`resetPassword`/`updateProfile`). Anti-pattern : n'ajouter que getter/setter en supposant que les reconstructions passent le champ. Garder l'ancien constructeur + surcharge délégante pour limiter la casse d'appelants. (Sprint 9 #44)
