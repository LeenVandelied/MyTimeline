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
> ⚠️ **MIS À JOUR Sprint 50 (#323/#249).** `JWT_SECRET` n'existe plus — remplacé par `JWT_PRIVATE_KEY` (RSA PKCS#8) et `EXPORT_TOKEN_SECRET`, plus `AUTH_JWT_PUBLIC_KEY` (**non secrète**) côté frontend. La convention #34 « aucun default en prod » avait été **enfreinte** par `application-prod.properties` (`${JWT_PRIVATE_KEY:}`), ce qui ramenait le chemin profil-`prod` de 2 barrières à 1 ; rétablie au 2ᵉ cycle de review, cf. [[DEC-S50-005]] et [[PIT-S50-008]].

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

## PAT-S10-001 — Soft delete + invisibilité globale via `@SQLRestriction`
Pour un soft delete (champ `archived`/`deleted`) : poser `@SQLRestriction("archived = false")` sur l'entité JPA → Hibernate filtre TOUTES les lectures (findAll/findById/associations join-fetch) sans toucher aux queries. Anti-pattern : filtrer en mémoire ou répéter `WHERE archived=false` dans chaque query (oubli garanti sur une query nommée). ⚠ Corollaire : les opérations transverses qui DOIVENT voir les lignes filtrées (réassignation, comptage avant purge) doivent passer en SQL natif pour contourner le `@SQLRestriction` (cf. [[PIT-S10-004]]). (Sprint 10 #50)

## PAT-S10-002 — Unicité applicative + contrainte DB : mapper la violation en 409, au niveau service
Unicité métier (ex : nom par owner) = check applicatif (`findByOwnerAndName` → 409 explicite) DOUBLÉ d'une contrainte DB `UNIQUE` (filet anti-race). Pour que la race DB ne fuite pas en 500 : `try/catch DataIntegrityViolationException → <MetierConflictException>` (409) AUTOUR du seul `save()` concerné, DANS le service — PAS un `@ExceptionHandler(DataIntegrityViolationException)` global (qui masquerait toutes les autres violations FK/contrainte, cf. [[PIT-S10-002]]). (Sprint 10 #52, review PR #153)

## PAT-S11-001 — Mock next-intl dans les tests de composant : asserter sur les CLÉS, pas les libellés
`vi.mock('next-intl', () => ({ useTranslations: (ns) => (k) => \`${ns}.${k}\` }))` → le composant rend `ns.key` au lieu du libellé traduit ; les assertions portent sur la clé i18n, indépendantes de la locale. Anti-pattern : asserter sur un libellé FR (`getByText('Supprimer')`) → couple le test à la locale, casse au moindre changement de wording. (Sprint 11 #65)

## PAT-S11-002 — Schémas Zod distincts pour create vs update quand le contrat DTO diverge
Le contrat backend peut nommer/structurer différemment création et mise à jour (produit : `POST` attend `category` (UUID), `PATCH` attend `categoryId` (UUID) ; update partiel = champs `.optional()`). Définir DEUX schémas (`productCreateSchema` / `productUpdateSchema`), pas un seul réutilisé. Anti-pattern : `productCreateSchema.partial()` pour le PATCH → mauvais nom de champ envoyé (`category` au lieu de `categoryId`) + validations create indésirables. (Sprint 11 #61)

## PAT-S12-001 — Validation conditionnelle d'un invariant : `@AssertTrue` au CREATE + garde service au PATCH
Un invariant inter-champs (BR-EVE-006 : `recurrenceUnit` requis si `isRecurring=true`) doit être gardé sur les DEUX chemins d'écriture. CREATE : getter dérivé `@AssertTrue @JsonIgnore isXxxConsistent()` sur le `*CreationRequest` → 400 via `MethodArgumentNotValidException` (le DTO voit l'objet complet). PATCH : un `@AssertTrue` DTO serait FAUX (le payload partiel ignore l'état déjà en base) → garde au niveau SERVICE sur l'**état fusionné de l'entité gérée** (après application des champs partiels, avant save) → exception domaine dédiée → 400. Anti-pattern : n'enforcer l'invariant qu'au CREATE → contournable via PATCH. (Sprint 12 #54 + review)

## PAT-S12-002 — Reset d'un champ nullable en PATCH partiel : flag booléen `clearXxx` explicite
En PATCH partiel, `champ=null` signifie « inchangé » et ne peut donc PAS exprimer un reset → null en base. Introduire un flag booléen dédié (`clearColor`) mutuellement exclusif avec le champ (`clearColor` prime > `color!=null` surcharge > sinon inchangé). Généralisable à tout champ nullable surchargeable en PATCH partiel (couleur produit héritée de la catégorie, etc.). (Sprint 12 #158)

## PAT-S14-001 — Contrainte CHECK de présence conditionnelle sur discriminant NULLABLE : `IS NOT TRUE` + neutralisation avant ADD
Exiger la présence d'une colonne selon un discriminant : `CHECK (discriminant <> 'x' OR col IS NOT NULL)`. Si le discriminant est un booléen NULLABLE, utiliser `discriminant IS NOT TRUE OR col IS NOT NULL` — JAMAIS `= false` (`NULL = false` vaut NULL, la contrainte laisse passer les NULL non voulus). Toujours précéder l'`ADD CONSTRAINT` d'une neutralisation défensive idempotente des lignes legacy non conformes (pattern V9), sinon la migration avorte sur base prod peuplée. Filet DB complémentaire à la validation applicative (Bean), pas substitut. (Sprint 14 #128, V11)

## PAT-S15-001 — Port domaine pur : records commande, pas de DTO applicatif dans `domain/ports`
Un port domaine (`EventService`) ne doit PAS référencer des DTOs `application.dtos.*` (inversion de dépendance). Introduire des records commande purs dans `domain/models` (`EventCreateCommand`/`EventUpdateCommand`) ; le controller mappe le DTO HTTP → commande domaine. Contre-exemple sain préexistant : `CategoryService` (params domaine). (Sprint 15 #165)

## PAT-S15-002 — Harness E2E full-stack en CI GitHub Actions (Playwright)
Job `e2e` : Postgres 16 service container (healthcheck pg_isready) → `mvnw -DskipTests package` + `java -jar` en fond (profil dev, `DB_*`/`JWT_SECRET` explicites) → readiness poll sur `GET /api/auth/me` (401 = up) avant Playwright → frontend via `webServer` Playwright (`npm run dev`) → `npx playwright install --with-deps chromium`. `NEXT_PUBLIC_*` lu au runtime en `next dev`. (Sprint 15 #163)

## PAT-S16-001 — Verrou d'architecture hexagonale : ArchUnit + FreezingArchRule baseline gelée
Verrouiller les règles hexagonales sans casser sur l'historique : `noClasses().that().resideInAPackage(...).should().dependOnClassesThat(...)` enveloppé dans `FreezingArchRule.freeze(rule)`, baseline versionnée sous `backend/src/test/resources/archunit_store/`, `allowStoreCreation=false` en CI (seule une NOUVELLE violation casse le build), régénération volontaire via `-Darchunit.freeze.store.default.allowStoreCreation=true`. Corriger une violation la retire automatiquement du store (dégel progressif). Anti-pattern : exclusions manuelles silencieuses. (Sprint 16 #166)

## PAT-S16-002 — Décomposer un monolithe de rendu réutilisable sans casser runtime ni Storybook
Structure `components/timeline/` = `lib.ts` (fonctions pures mémoïsables) + sous-composants purs présentationnels (props explicites, i18n résolu par l'orchestrateur via prop `label`) + orchestrateur qui garde les hooks (`useMemo`/`useTranslations`) et le contrat de props externe INCHANGÉ. Point d'injection `renderContent` sur un sous-composant lourd (défaut = composant runtime réel → runtime identique ; stories injectent un stub évitant les providers next-intl/auth). `fixtures.tsx` colocalisé pour données de story déterministes. data-testid préservés. Anti-pattern : rendre le composant lourd réel en story (throw sans provider) ; réécrire les classes DS (régression visuelle). (Sprint 16 #47)

## PAT-S18-001 — Encre de texte sur fond coloré : helper WCAG mutualisé qui maximise le ratio
Choisir la couleur de texte sur un fond arbitraire (barre event, badge, chip) : NE PAS utiliser un seuil de luminance brut (`luminance>0.5` → texte blanc/noir). Ce seuil échoue AA sur les couleurs moyennes/claires (mesuré : 10/12 couleurs `--evt-*` sous 4.5:1 en blanc, ex citron 2.20:1). Bon calcul : luminance relative sRGB (linéarisation gamma `c<=0.03928?c/12.92:((c+0.055)/1.055)^2.4`, pondération `0.2126R+0.7152G+0.0722B`) → ratio `(Lclair+0.05)/(Lsombre+0.05)` → choisir l'encre (noir `#0B0C0E` vs blanc `#FFFFFF`) qui MAXIMISE le ratio. Helper unique `frontend/src/lib/color.ts` (`contrastInk`/`textOn`, `relativeLuminance`, `contrastRatio`), importé partout (form + vue lecture), pas de duplication locale. Fallback `var(--color-ink)` sur hex invalide. (Sprint 18 #66)

## PAT-S18-002 — Stub global `ResizeObserver` pour tester les composants Radix Select/Popover en jsdom
Radix Select/Popover lèvent `ResizeObserver is not defined` en jsdom → tout test RTL d'un composant qui en contient échoue. Fix durable : stub global dans `frontend/vitest.setup.ts` (`globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }`), bénéficie à tous les futurs tests. Anti-pattern : le stubber par test (répétition, oublis). (Sprint 18 #66)

## PAT-S19-001 — Tester une rotation d'orientation (`matchMedia`) sans démonter l'arbre React
Pour tester une transition portrait↔paysage sans perte d'état, il faut faire varier `matchMedia` SANS `rerender` d'un nouveau mock global (qui démonte l'état et invalide le test). Solution : un mock `matchMedia` qui stocke les listeners par query, + un helper `rotate()` qui ré-évalue les matches et émet un event `'change'` dans `act()`. `useMediaQuery` ne relit qu'au changement du string de query → l'émission `change` propage sans remount. (Sprint 19 #64)

## PAT-S19-002 — Encre event lisible : `contrastInk`/`textOn` (lib/color.ts) propagé sur toutes les surfaces de rendu
Le pattern BR-EVE-009 (encre calculée par contraste WCAG, [[PAT-S18-001]]) est désormais appliqué de façon cohérente sur les 3 composants qui rendent un event coloré : `EventPill` (frise desktop, via `--mt-evt-ink`), `TimelineMobilePortrait` et `TimelineMobileLandscape` (via `textOn`). Règle : tout nouveau composant qui peint un fond couleur d'event DOIT pousser l'encre via `lib/color.ts`, jamais de `text-white`/`#fff` hardcodé. (Sprint 19 #192/#63/#64)

## PAT-S20-001 — Ruban de densité dashboard : helper de bucketing par jour DISTINCT du waveform Minimap
Pour un ruban de densité 30j (hauteur de barre ∝ nombre d'events/jour, couleur = catégorie), NE PAS réutiliser `buildMinimapBuckets` (`timeline/zoom.ts` — waveform normalisé 60 tranches pour le viewport de zoom, sans couleur). Créer un helper pur DISTINCT `buildDensityBuckets` (`dashboard/lib.ts` ou `timeline/lib.ts`) : 1 bucket = 1 jour, conserve `count` + couleur dominante. Anti-pattern : réutiliser le waveform (sémantique/granularité différentes) ou dupliquer la logique de bucketing. (Sprint 20 #80)

## PAT-S20-002 — Variante responsive d'une page sans casser le desktop : switch d'affichage via `useMediaQuery` SSR-safe
Décliner une page en desktop/portrait/paysage : hook `useMediaQuery` SSR-safe (défaut = desktop, pas de hydration mismatch) qui pilote un switch (ternaire) entre plusieurs `<main>`. Composants de base réutilisés via props/variants (`variant`, `rangeDays`) + composants mobiles dédiés (drawer, carousel, rail). **Source data UNIQUE partagée** (`useDashboardData`) → aucun remount au changement d'orientation, état préservé. Anti-pattern : dupliquer la page entière, coupler l'orientation dans les composants, ou une largeur `px` fixe dans le composant (les contraintes de largeur restent dans le parent). (Sprint 20 #83/#85)

## PAT-S20-003 — Fermeture Escape d'un dialog : mutualiser dans `useFocusTrap(onEscape?)` plutôt qu'un listener parallèle
Un dialog/drawer qui ajoute son propre `document.addEventListener('keydown', escapeHandler)` À CÔTÉ de `useFocusTrap` (qui gère déjà Tab sur `document`) duplique un listener pour le même overlay → smell de coordination. Fix : paramètre OPTIONNEL `onEscape?: () => void` dans `useFocusTrap` (branché sur son listener `keydown` existant, défaut no-op → non-cassant pour les consommateurs en 2 args). Un seul point de vérité clavier pour le dialog. (Sprint 20 #208 review, `useFocusTrap.ts`)

## PAT-S21-001 — Factories Zod i18n `create*Schema(t)` : passer le traducteur RACINE, jamais scopé
Les factories de schémas Zod i18n (`create*Schema(t)`) doivent recevoir le traducteur RACINE `useTranslations()` (clés préfixées en dur `validation.*`, `settings.*`), JAMAIS un traducteur scopé `useTranslations('validation')` → sinon double préfixe `validation.validation.*` et clés introuvables. Aligné convention existante `schemas/auth.ts`. (Sprint 21 #86)

## PAT-S21-002 — Bottom sheet mobile réutilisant un flux dialog desktop sans duplication
Pour qu'un flux (ex. suppression compte 2 étapes) marche à la fois en Dialog (desktop) et en BottomSheet (mobile) sans dupliquer form+mutation : extraire état+form+mutation dans un hook (`useDeleteAccountFlow`) + un composant présentationnel wrapper-agnostic (`DeleteAccountSteps`) ; le composant parent choisit le conteneur via une prop (`deleteContainer='dialog'|'sheet'`, défaut = desktop rétro-compatible). Anti-pattern : dupliquer le formulaire/flux dans un composant mobile séparé. (Sprint 21 #87)

## PAT-S21-003 — Upload de fichier authentifié = modèle de référence (security-expert GO S21)
Modèle validé pour tout upload utilisateur : validation type par MAGIC BYTES uniquement (jamais Content-Type client ni extension) ; nom stocké = UUID généré (jamais le filename client) ; résolution de chemin bornée `resolveWithinBase` (rejette `/`,`\`,`..` + `startsWith(baseDir)` post-normalize) ; limite taille serveur (config multipart + contrôle applicatif, defense in depth) ; ownership dérivé du JWT (jamais un id param) ; cleanup de l'ancien objet au remplacement/DELETE ; aucune fuite d'exception dans le body. Réutilisable pour futurs uploads (export, pièces jointes). (Sprint 21 #75, `AvatarServiceImpl`/`LocalStorageAdapter`)

## PAT-S22-001 — Contrat couleur catégorie = String libre (≠ produit hex `@Pattern`)
`CategoryRequest`/`CategoryUpdateRequest.color` = `@Size(max=255)` SANS `@Pattern` hex (contrairement aux produits #158). Côté front : `categoryCreate/UpdateSchema.color = z.string().max(255).optional()` — NE PAS réutiliser un `hexColorSchema` produit ni sur-contraindre en `#RRGGBB` (le backend accepte toute string ≤255 ; sur-contraindre rejette des valeurs valides serveur). Le picker émet du hex mais le contrat reste libre. (Sprint 22 #62)

## PAT-S22-002 — Sous-frise filtrée par entité = filtrage EN AMONT, jamais forker le composant central
Pour une vue « timeline d'un seul produit » : filtrer `events`/`resources` au niveau de la PAGE (map de l'entité unique → `FullCalendarEvent`) et passer le sous-ensemble à `TimelineResponsive`/`TimelineView` tel quel. Anti-pattern : ajouter un prop `productId`/`filterBy` à `TimelineView` (composant central du dashboard → risque de régression sur tous les appelants). (Sprint 22 #68)

## PAT-S22-003 — PATCH « clear-via-clé-omise » : repose sur DTO `String` simple + setter inconditionnel
Le PATCH catégorie efface `color`/`description` quand le front OMET la clé JSON : `CategoryUpdateRequest` a des champs `String` simples → Jackson null-binde une clé absente → `CategoryServiceImpl.updateCategory` fait `setColor(color)`/`setDescription(...)` INCONDITIONNEL → null persiste (efface). Donc `effectiveColor = color ?? undefined` côté front (reset couleur) FONCTIONNE. ⚠ Fragile : refactorer le DTO en `Optional<String>` ou passer le service en « update si non-null » casserait SILENCIEUSEMENT le reset. Documenté dans br-categories. (Sprint 22, review PR#217 — faux positif écarté après vérif backend)

## PAT-S23-001 — DIP contrôleur : injecter le PORT domaine, jamais le `*ServiceImpl`
Un `@RestController` injecte l'INTERFACE de service (`domain/ports/services/XxxService`), jamais la classe concrète `application/services/XxxServiceImpl`. Anti-pattern = champ/constructeur typé sur l'impl (couplage). Avec 1 seule impl `@Service` par port, l'injection par interface se résout sans `@Primary`/`@Qualifier`. Bon exemple pré-existant : `CategoryController`. Corrigés en S23 : `ProductController`, `AuthController`. Ne pas inventer un port (`AuthService`) si la logique tient sur des ports existants (`UserService`/`SessionService`). (Sprint 23 #123)

## PAT-S23-002 — `FreezingArchRule` qui atteint baseline 0 = candidate systématique à la bascule stricte
Une `FreezingArchRule.freeze(rule)` sert à geler une dette existante et à interdire toute NOUVELLE violation. Quand un sprint résout la dernière violation (freeze store purgé à 0, ex. règle DIP contrôleur en S23 #123), la règle gelée re-gèle SILENCIEUSEMENT une régression future au lieu d'échouer. Règle : à chaque sprint touchant `archunit_store`, vérifier si une règle gelée est à baseline 0 → la passer en `rule.check(...)` strict pour figer l'acquis (échec immédiat). (Sprint 23 #123 + review PR#220)

## PAT-S24-001 — Roving tabindex keyé par ID stable (index dérivé), pas par index brut
Un roving tabindex sur une liste dont les items apparaissent/disparaissent (collapse de catégorie, filtre) : si l'état actif est stocké en index bruts (`{lane,evt}`), le curseur `tabIndex=0` glisse sur le mauvais item après mutation. Solution : keyer l'état actif par ID stable (`{resourceId,evt}`), dériver l'index de coordonnée à la volée via une `Map<id,index>` ; garder les handlers en coordonnées index pour ne pas les réécrire. Formalisé dans `.claude/rules-jit/ux-patterns.md §2`. Anti-pattern : `{lane,evt}` en state (régression MAJEUR-2 corrigée). (Sprint 24 #81/#197)

## PAT-S24-002 — Cible tactile a11y ≥44px sans agrandir l'icône : pseudo `::before` hors flux
Étendre la hitbox d'un bouton à ≥44×44px (WCAG 2.5.5) sans dénaturer le visuel compact imposé par la charte : `position:relative` sur le bouton + `::before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;}`. Hors flux, zéro impact layout (header flex intact), theme-agnostic. Réutilisé de `.mt-tlm__evt::before` sur `.mt-drawer__close`. Anti-pattern : forcer `width/height:44px` sur le bouton (casse le visuel + le flex). Non testable en jsdom/RTL (pas de calcul de pseudo-éléments) → vérif par inspection CSS. (Sprint 24 #82)

## PAT-S25-001 — Flag booléen en form d'édition : composant DS `Switch` via FormField RHF
Exposer un flag booléen (ex: `archived` soft-delete) dans un form d'édition : réutiliser le composant DS `Switch` (`role="switch"` natif, `.mt-switch`) branché en `FormField`/`FormItem` react-hook-form, `checked={field.value ?? false}` + `onChange={(e)=>field.onChange(e.target.checked)}`. Pré-remplir depuis l'état réel : le flag DOIT être propagé jusqu'aux `defaultValues` (sinon toujours décoché à l'ouverture — bug review S25 : `archived` absent de `FullCalendarEvent`/mapping → toggle inerte). Anti-pattern : réutiliser `Checkbox` (réservé à un autre usage), ou prendre un label i18n d'ACTION comme label d'ÉTAT. (Sprint 25 #188)

## PAT-S25-002 — Optimistic-lock (@Version) → 409 : `@ExceptionHandler` scopé au type PRÉCIS
Mapper un conflit optimistic-lock JPA vers HTTP 409 : `@ExceptionHandler(ObjectOptimisticLockingFailureException.class)` (le type SPRING wrappé, pas la `StaleObjectStateException` Hibernate brute) dans `GlobalExceptionHandler`, corps plat `{"error":"..."}`. Anti-pattern : handler sur un supertype fourre-tout (`DataIntegrityViolation`) qui masquerait des violations FK/contrainte sous un 409 trompeur (cf. convention backend #3, handler global retiré #153). Test d'intégration : simuler une version STALE de façon déterministe (charger vue v0 → commit update v0→v1 → merge la vue v0 + flush → `UPDATE WHERE version=0` → 0 ligne → conflit systématique), JAMAIS une course 2-threads (timing-sensible → flaky, cf. PIT-S25-002). (Sprint 25 #200)

## PAT-S25-003 — 409 réutilisable+accessible : dialog présentationnel piloté par l'appelant, interception scopée au flux
Gérer un 409 (optimistic-lock) de façon réutilisable sans requalifier les autres 409 : composant `ConflictDialog` PRÉSENTATIONNEL (Dialog DS partagé, `role=dialog` + focus-trap + Échap natifs, `testId` paramétrable) piloté par l'appelant qui intercepte le 409 sur SON flux (`submitState`), PAS dans l'interceptor axios global (sinon requalifie les 409 name-conflict Category/Product). Reload = invalidation ciblée TanStack (`invalidateQueries(clé)`), jamais `window.location.reload()` (perte d'état). Préserver les `data-testid` existants via prop `testId`. (Sprint 25 #77)

## PAT-S26-001 — Bus d'état réseau : pont axios(module)↔React via store observable + `useSyncExternalStore`
Relier l'instance axios (singleton module, hors React) à l'état React sans couplage : store observable framework-agnostique (`subscribe`/`getSnapshot`, `getServerSnapshot` défini pour SSR) que l'intercepteur axios ALIMENTE (`reportTimeout`/`reportServerError`/`clear`) et qu'un contexte React CONSOMME via `useSyncExternalStore`. L'offline « pur » reste dérivé de `navigator.onLine` + events `online`/`offline` dans un `useEffect` (jamais au render → SSR-safe, pas de mismatch hydratation). Retry = `queryClient.refetchQueries()`. Anti-pattern : écrire l'état réseau dans un contexte DEPUIS l'intercepteur axios (impossible hors arbre React). (Sprint 26 #76)

## PAT-S26-002 — Écrans d'état App Router (404/500) locale-aware sous NextIntlClientProvider
Pages d'état Next App Router conformes i18n : `app/[locale]/not-found.tsx` + `app/[locale]/error.tsx` en `'use client'` (error.tsx OBLIGATOIRE, props `{error,reset}`) utilisent `useLocale()`/`useTranslations()` car rendus DANS le `NextIntlClientProvider` du `[locale]/layout`. Le filet global `app/error.tsx` (hors provider i18n) inline ses messages 4 locales + résout la locale via `window.location.pathname.split('/')[1]`. 403 sans `forbidden.tsx` natif : branche dans `error.tsx` via un helper `isForbiddenError` (403 = pas de retry ; 500 = retry via `reset()`). Anti-pattern : `useTranslations` hors provider (throw, cf. [[PIT-S26-001]]). (Sprint 26 #57)

## PAT-S27-001 — Résolution d'identité centralisée : helper `CallerResolver` via SecurityContextHolder, renvoie `Optional<User>`
Factoriser les `resolveCaller` dupliqués des contrôleurs en UN `@Component` `CallerResolver` (dans `infrastructure/security/`) dépendant du PORT `UserService` : `currentUser()` lit `SecurityContextHolder.getAuthentication().getName()` (peuplé par `JwtFilter`, cohérent cookie ET Bearer — corrige le rejet 401 des requêtes Bearer valides), résout le `User` domaine, renvoie `Optional<User>` — ne lève JAMAIS. L'appelant décide du statut (contrôleur → 401 sur `empty`, préserve BR-AUT-005). Garde explicite `AnonymousAuthenticationToken` → `empty` AVANT lookup DB (ne pas reposer sur l'absence fortuite d'un user "anonymousUser"). Anti-pattern : ré-extraire le JWT du cookie brut en aval de `JwtFilter` (double extraction, incohérence cookie/Bearer). (Sprint 27 #93/#154, review PR#238)

## PAT-S27-002 — Après externalisation de l'auth, retirer les `catch(Exception)->401` résiduels des contrôleurs
Une fois l'auth résolue en amont (`CallerResolver`/`JwtFilter`, hors du `try`), un `catch(Exception e) -> 401` autour d'un simple appel service ne peut plus attraper de `JwtException` → il devient du bruit qui MASQUE les vraies erreurs (NPE, DB) en 401 trompeur (viole BR-AUT-005, fausse le diagnostic). Solution : SUPPRIMER le try/catch, laisser propager au `GlobalExceptionHandler` (500 neutre, `server.error.include-*`=never → pas de fuite). Ne pas narrow en `catch(JwtException)` si c'est du code mort. Test : mocker le service pour lever une `RuntimeException` et prouver que la réponse n'est PAS 401. (Sprint 27 #92)

## PAT-S28-001 — Filtrer une association `@ManyToOne` par id sans la charger : JPQL `WHERE p.user.id = :id`
En S28 (#124/#41), remplacer `findAllProducts()` + `.filter(userId)` en Java (scan complet table + filtre mémoire) par JPQL `SELECT DISTINCT p ... LEFT JOIN FETCH p.events WHERE p.user.id = :userId` : Hibernate cible directement la colonne FK `user_id` (aucune jointure vers `users`), donc l'index `idx_products_user` est exploité. `LEFT JOIN FETCH p.events` précharge la collection (évite N+1) et `DISTINCT` supprime les doublons de lignes du fetch. Anti-pattern : `findAll` + stream filter (l'index posé ne sert à rien). Note : une 2e association `@ManyToOne` mappée (ex. `category`) reste lazy → ajouter `LEFT JOIN FETCH p.category` si N+1 sur le mapping. (Sprint 28 #124/#41)

## PAT-S28-002 — Seed E2E Playwright via `storageState` (compte fixe) + `page.request.post` same-origin
En S28 (#218), pattern de seed des specs Produits/Catégories : réutiliser un compte fixe provisionné une fois (`auth.setup.ts` → `storageState`) au lieu de `register`+`login` par test (déclenche le rate-limit 429 register 5/min/IP). Poser l'état via `page.request.post` same-origin (cookie `Lax` porté par le proxy Next `:3000`→backend), pas via clics souris. Anti-pattern : `registerAndLogin` par test. Cf. `frontend/e2e/support/accounts.ts`, `products.ts`, config `playwright.config.ts` (projet `setup` → dependencies). (Sprint 28 #218)

## PAT-S29-001 — Healthcheck Docker Spring Boot via Actuator (health seul, public)
En S29 (#37), pour un `HEALTHCHECK` Docker/orchestrateur sur un backend Spring Boot sans endpoint santé : ajouter `spring-boot-starter-actuator` et whitelister UNIQUEMENT `/actuator/health` en `permitAll` dans `SecurityConfig` (l'exposition web par défaut = health seul ; `show-details=never` → corps `{"status":"UP"}` sans fuite env/heapdump/mappings ; le health inclut le check DB). Installer `curl` dans l'image `eclipse-temurin:*-jre` (absent par défaut, base Ubuntu). Anti-pattern : `HealthController` maison redondant. (Sprint 29 #37)

## PAT-S30-001 — HealthIndicator `@Profile("prod")` pour dépendance externe non-fatale (fini le NO-OP muet)
En S30 (#140), pour signaler qu'une dépendance externe optionnelle est mal configurée en prod SANS casser le boot ni les tests : bean `@Component @Profile("prod") implements HealthIndicator` renvoyant `Health.down().withDetail("reason", …)` si la clé/config est absente, sinon `Health.up()`. Le composant apparaît dans `/actuator/health` (nom du bean = clé JSON). Hors prod le bean est absent → aucun DOWN injustifié. Ne JAMAIS logger/exposer la valeur du secret. Anti-pattern : fail-fast qui bloque le boot (casse les tests bootant un contexte) ou log de la valeur. Cf. `BrevoHealthIndicator`. (Sprint 30 #140)

## PAT-S30-002 — Couvrir un fichier `application-<profil>.properties` sans booter le contexte complet
En S30 (#129), pour un filet de régression sur un fichier de config par-profil dont le boot complet exigerait Testcontainers + secrets sans default : `@SpringJUnitWebConfig(MinimalConfig)` (n'enregistre que le bean consommant les `@Value` visés) + `@TestPropertySource("classpath:application-<profil>.properties")`, assertion via MockMvc `standaloneSetup` sur la valeur RÉSOLUE depuis le fichier. Casse si la propriété est retirée du fichier. Anti-pattern : `@SpringBootTest`+`@ActiveProfiles(prod)` (boot complet + secrets/Testcontainers) ou valeurs en dur (ne teste pas le fichier). Miroir du sibling `AuthControllerDevProfileCookieTest`. (Sprint 30 #129)

## PAT-S30-003 — Multi-invariant fail-fast : 1 seul `ApplicationListener`, N checks disjoints
En S30 (#216), pour ajouter un nouveau garde-fou fail-fast au boot sans multiplier les listeners : étendre l'unique `ApplicationListener<ApplicationEnvironmentPreparedEvent>` (`ProfileSafetyGuard`) avec un N-ième check privé indépendant, aux prédicats DISJOINTS des checks existants (ici : #111 marqueur prod + profil dev ; #216 prod effectif + rate-limit off). Property absente → défaut fail-safe (ne pas bloquer). Anti-pattern : créer un 2e listener concurrent (perte du point unique fail-fast, ordre d'exécution flou). Cf. `ProfileSafetyGuard.onApplicationEvent`. (Sprint 30 #216)

## PAT-S31-001 — Résoudre une CVE d'une dépendance managée par le BOM Spring Boot sans bumper le parent
En S31 (#223), pour lever une CVE sur une sous-dépendance versionnée par le parent `spring-boot-starter-parent` : override la property BOM correspondante (`<jackson-bom.version>`, `<postgresql.version>`) au niveau patch, SANS monter le parent (préserve les verrous existants — ici Boot 3.4.13 du bump #180). Vérifier la résolution EFFECTIVE via `mvn dependency:tree` (pas juste la déclaration). Anti-pattern : bumper le parent mineur (3.4→3.5) pour un correctif de sous-dépendance = blast radius plateforme + re-test intégration complet. (Sprint 31 #223)

## PAT-S31-002 — Rendre une acceptation de CVE auto-invalidante par un test garde-fou
En S31 (#258), quand on accepte une CVE parce qu'un vecteur est « non applicable » sur une hypothèse d'architecture (ex: app STATELESS → CVE session hijacking N/A), ajouter un test qui ÉCHOUE si l'hypothèse tombe : règle ArchUnit `noClasses().should().useHttpSession()` + `@SpringBootTest` asserant l'absence de session/JSESSIONID matérialisée. L'acceptation documentée dans `docs/security/cve-acceptance.md` pointe vers le test. Sinon l'acceptation devient silencieusement fausse si un dev réintroduit `HttpSession`. (Sprint 31 #258)

## PAT-S32-001 — Mapper entity↔domain d'une NOUVELLE feature → le placer en `infrastructure`, pas `application/mappers`
En S32 (#58), une règle ArchUnit (règle 2) gèle les mappers historiques de `application/mappers` comme violations tolérées (freeze). Ajouter un NOUVEAU mapper dans `application/mappers` casse ce freeze (le compteur de violations gelées ne matche plus). Pour une nouvelle feature : placer le mapper entity↔domain en couche `infrastructure` (ex: `infrastructure/adapters/repositories/jpa/ExportJobMapper`), conforme au sens hexagonal (le mapping JPA est un détail d'infra) et hors périmètre du freeze. (Sprint 32 #58)

## PAT-S32-002 — Déclencher un job @Async APRÈS commit de la ligne PENDING (pas de race findById côté worker)
En S32 (#58), pour un job async persisté puis exécuté : la méthode `submit` NE doit PAS être `@Transactional` ; c'est le `repo.save` (PENDING) qui l'est (`REQUIRED`), de sorte que la ligne est committée AVANT l'appel `@Async`. Sinon le worker (autre thread/connexion) fait un `findById` sur une ligne encore non committée → `Optional.empty` → job fantôme. Pattern : save transactionnel de la ligne PENDING → retour au contrôleur → déclenchement async qui relit la ligne durable. (Sprint 32 #58)

## PAT-S33-001 — Récupérer un diff PR complet sous RTK / `gh pr diff` multi-pathspec
En S33 (review PR #269), deux pièges pour obtenir un diff : (a) `gh pr diff <N> -- '*.ts' '*.tsx'` avec PLUSIEURS pathspecs est rejeté par le CLI gh (« accepts at most 1 arg ») ; (b) le hook RTK tronque/vide aussi `gh pr diff` comme il le fait pour `git diff` (cf. mémoire `rtk-git-diff-empty-output`). Pattern fiable : `rtk proxy gh pr diff <N>` (diff complet, non tronqué) PUIS filtrer côté client (grep/awk), plutôt que de passer des pathspecs multiples à gh. (Sprint 33 #269)

## PAT-S34-001 — Garde CI anti-drift : asserter la version EFFECTIVE d'une lib au runtime test, sans Spring
En S34 (#224), pour figer un plancher CVE-safe vérifié en CI sans démarrer Spring/Docker : test JUnit PUR (`BomDriftTest`, aucune annotation `@SpringBootTest`, ~0.065s) qui lit la version effective de chaque lib via accesseur statique (`SpringSecurityCoreVersion.getVersion()`, `SpringVersion.getVersion()`, `ServerInfo.getServerNumber()`, `VersionPrinter.getVersion()`) et, pour les constantes `static final` (jackson `PackageVersion.VERSION`, postgresql `DriverInfo.DRIVER_VERSION`), **par réflexion** — car une constante `static final` référencée directement est inlinée à la compilation → refléterait le jar de compile, pas le runtime. Comparateur **sémantique par composants numériques** (`6.2.19` > `6.2.9`, pas lexicographique). Plancher `>=` (jamais `equals` : casserait à chaque bump légitime). Chaque plancher documenté avec la CVE qu'il protège. Ramassé par le job CI existant (`**/*Test.java`), aucune modif ci.yml. (Sprint 34 #224)

## PAT-S35-001 — Étendre `ProfileSafetyGuard` d'un garde-fou fail-fast, avec défaut fail-safe dépendant de la sémantique de la property
En S35 (#254), ajout d'un 3e garde-fou boot (`checkCookieInsecureInProduction`) à `ProfileSafetyGuard` (event `ApplicationEnvironmentPreparedEvent`, avant beans, testable sans Docker/contexte), sur le patron des checks #111/#216 : `return` si `!isProductionEffective(env)`, sinon lève `IllegalStateException`. **Point clé : le défaut fail-safe ne se copie PAS aveuglément du check source.** `app.rate-limit.enabled` absent = sûr (`true`), mais `app.cookie.secure` absent = dangereux → le garde traite `absent OU false` comme non-sécurisé et BLOQUE (exige `true` explicite en prod effective). Le message d'exception nomme la property ET la variable d'env (`app.cookie.secure (COOKIE_SECURE)`) pour que l'opérateur sache quoi poser. (Sprint 35 #254)

## PAT-S35-002 — Durcir un WARN de démarrage en fail-fast : déplacer dans le garde pré-beans, ordonner après les checks existants
En S35 (#253), transformation d'un WARN de `ProdConfigStartupLogger` (bean `@Profile("prod")`, `ApplicationReadyEvent` — contexte déjà démarré) en fail-fast. Pattern : (a) déplacer la logique dans `ProfileSafetyGuard` (event pré-beans → blocage le plus tôt, tous les garde-fous boot au même endroit) ; (b) ordonner le NOUVEAU check APRÈS les existants dans `onApplicationEvent` pour préserver la priorité des messages et ne pas casser les tests des checks antérieurs ; (c) retirer le WARN devenu mort + ses tests (le log INFO de config effective reste utile). Anti-pattern : bloquer tardivement dans un bean `@Profile("prod")`/`ApplicationReadyEvent`. (Sprint 35 #253)

## PAT-S37-001 — Verrou optimiste anti-TOCTOU quand le modèle DOMAINE ne porte pas de version
En S37 (#143), pour empêcher la double consommation concurrente d'un token de reset (TOCTOU entre `findByToken` et `consume`) sans polluer le modèle domaine : ajouter `@Version Integer version` sur l'ENTITÉ JPA seule (migration V15 `add column version integer not null default 0`, type aligné sur les 4 autres @Version users/categories/products/events), et garder l'entité MANAGÉE de bout en bout dans la transaction — `findByToken` charge l'entité dans le contexte de persistance, `save`→`findById` renvoie LA MÊME instance L1 (version lue au CHECK), `saveAndFlush` émet `UPDATE ... WHERE version=<lue>` de façon SYNCHRONE dans le try/catch → 2 consommations concurrentes = 1 succès, l'autre lève `ObjectOptimisticLockingFailureException` convertie en 400 générique (anti-énumération), rollback `@Transactional` du perdant. **Anti-pattern : reconstruire l'entité via mapper (détachée, version=null) → perte du verrou / merge fragile.** `saveAndFlush` (pas `save`) est le SEUL point de flush synchrone garanti — sinon le conflit surgirait au commit, hors du catch. (Sprint 37 #143)

## PAT-S37-002 — Capturer un token en E2E sans canal exposé (email no-op, token non loggé)
En S37 (#145), capturer le token de reset dans un E2E Playwright alors qu'aucun canal ne l'expose (`BrevoEmailService` NO-OP sans `BREVO_API_KEY` en test, token jamais loggé, pas d'endpoint test-only ni MailHog) : lecture DB directe — poll de `password_reset_tokens` via un helper `frontend/e2e/support/db.ts` (dép `pg`, requête paramétrée `$1`, `E2E_DB_PASSWORD` requis sans fallback en dur, fermeture du pool via `beforeExit`). **Anti-pattern : parser les logs backend (token jamais loggé) ou bricoler un hack endpoint.** Trade-off assumé : couplage `db.ts`↔schéma V6 → follow-up = endpoint test-only `@Profile("e2e")` ou mock `EmailService` en mémoire pour découpler. (Sprint 37 #145)

## PAT-S37-003 — Rate-limit sur une valeur du body dans un servlet filter (body re-servable + map bornée LRU)
En S37 (#141), pour throttler par une valeur présente dans le body (le `token`) AVANT le controller, dans un `OncePerRequestFilter` : lire le body en `byte[]` borné puis le re-servir au controller via un `HttpServletRequestWrapper` (`CachedBodyHttpServletRequest`) exposant un `getInputStream()`/`getReader()` sur les bytes cachés (sinon le controller lit un stream déjà consommé). La map de tracking par-token est bornée (100k) et évince en LRU ; message 429 générique identique quel que soit le cas (anti-énumération). Voir garde-fous de sécurité associés [[PIT-S37-001]]. (Sprint 37 #141)

## PAT-S38-001 — Codes d'erreur stables (enum) au lieu de `HttpStatus.getReasonPhrase()` dans un contrat JSON
En S38 (#127), le champ `error` d'un corps d'erreur structuré ne doit JAMAIS porter `status.getReasonPhrase()` (« Not Found », « Bad Request ») : dépend de la locale/impl du statut HTTP, non fait pour être parsé, non stable comme contrat client. Pattern : enum PUBLIC `ErrorCode` (valeurs snake_case `not_found`/`validation_failed`/`unprocessable_entity`) dans `infrastructure/adapters/controllers`, et `buildBody(HttpStatus, ErrorCode, String)` qui écrit `code.getCode()` — tous les call sites du `buildBody` 2-args (5 handlers ici, pas seulement ceux nommés dans l'issue) migrés d'un coup pour cohérence. **Portée assumée du sprint :** seul le `GlobalExceptionHandler` route via `ErrorCode` ; `AuthController` (#125) garde volontairement des messages humains dans `error` (AC de l'issue), et 7 autres handlers du GEH construisent encore leur corps à la main → deux follow-ups ouverts pour unifier le vocabulaire (documenté dans la javadoc `ErrorCode`). Anti-pattern : `getReasonPhrase()` dans `error` OU un futur champ `code`. (Sprint 38 #127)

## PAT-S40-001 — Invalidation TanStack par PRÉFIXE de clé quand le contexte n'a pas le paramètre fin
En S40 (#245), la suppression de catégorie (avec réassignation) impacte la liste produits, dont la clé est `queryKeys.products.withEvents(userId)`. Certains call sites (`CategoryDrawer`) n'ont PAS le `userId` sous la main. Pattern : invalider le **préfixe** `queryKeys.products.all` (`['products']`) plutôt que la sous-clé exacte — le matching de préfixe TanStack v5 couvre TOUTES les sous-clés produits, y compris `withEvents(userId)`. Même convention que `useUpdateCategory`. Le fix passe par un hook `useDeleteCategory` (`useMutation`, `onSuccess: invalidate categories.all + products.all`) câblé sur les 2 call sites, `mutateAsync` propageant le rejet au dialog. **Anti-pattern : threader `userId` juste pour l'invalidation, ou éparpiller des littéraux de query key hors `query-keys.ts`.** (Sprint 40 #245)

## PAT-S40-002 — Nouvelle largeur de layout fixe → token dédié `spacing.css` + mapping `@theme inline`, jamais `w-[Npx]`
En S40 (#210), la sidebar shell 248px n'a aucun token (l'échelle `spacing.css` est odd-4 : 3/5/7/9…, 248 hors grille). Pattern (précédent `--lane-header-w: 168px`) : déclarer `--sidebar-width: 248px;` dans `ds/tokens/spacing.css` (section layout-specific) PUIS le mapper dans `globals.css` `@theme inline` (`--spacing-sidebar: var(--sidebar-width);`) pour obtenir l'utilitaire Tailwind `w-sidebar`. **Anti-pattern : `w-[248px]` arbitraire sans backing token (viole la charte tokens-only).** (Sprint 40 #210)

## PAT-S40-003 — Envelopper un écran connecté existant dans un shell sans le réécrire : route group `(app)` + `git mv` + `lg:hidden` anti double-chrome
En S40 (#210), pour insérer un shell applicatif (AppShell) autour d'écrans déjà livrés (dashboard #80, produits #68) sans réécrire leurs composants : (a) créer un layout de **route group** Next `app/[locale]/(app)/layout.tsx` qui monte `<AppShell>` — les parenthèses rendent le groupe transparent pour l'URL ; (b) `git mv` les segments (`dashboard/`, `products/`) sous `(app)/` → URLs publiques INCHANGÉES (vérifié via `app-path-routes-manifest.json`) ; (c) gate `lg:hidden` sur le chrome PROPRE de l'écran (header/nav) pour éviter le double-chrome en desktop, la nav mobile de l'écran restant active `< lg` (délégation). **Anti-pattern : shell qui re-rend `CompactRail`/`MobileDrawer` → duplication de la nav mobile.** Conséquence à surveiller : un `data-testid` du header d'écran devenu `lg:hidden` casse tout E2E desktop qui le cliquait (cf. [[PIT-S40-003]]). (Sprint 40 #210)

## PAT-S41-001 — 2e niveau d'accordéon imbriqué (produit dans catégorie) : réutiliser STRICTEMENT le pattern parent, état keyé par id stable
En S41 (#195), ajouter un collapse par produit imbriqué dans le collapse catégorie existant (`TimelineView.tsx`) : nouvel état `collapsedResources: Record<string, boolean>` **keyé par `resource.id`** (id stable, pas l'index de lane qui glisse au collapse — cf. MAJEUR-2 #81) ; contrôle = `<button aria-expanded>` + chevron DS mirror EXACT du parent (`.mt-tlv__group-head`/`.mt-tlv__chev`), clavier natif du bouton ; pastilles non rendues si replié ; **étendre la liste de nav focusable (`navLanes`/`flatVisibleLanes`) pour exclure les ressources repliées** (sinon la nav clavier ←→↑↓ cible des lanes masquées). Scroll préservé sans hook custom : le re-rendu React conserve `scrollLeft`/`Top` du conteneur (parité collapse catégorie). Roving nav resource-keyé retombe sur `firstNav` si la lane active se replie. **Anti-pattern : état keyé par index de lane ; hook scroll custom (inutile).** Cf. [[PIT-S41-002]]. (Sprint 41 #195)

## PAT-S41-002 — `aria-hidden` conditionnel sur un libellé de bouton à `aria-label` agrégé (Label-in-Name)
En S41 (#228), un bouton (EventPill) porte un `aria-label` agrégé qui contient déjà le titre, et un `<span>` visible du titre. Rendre le `aria-hidden` du span **conditionnel** : le retirer quand le texte visible est le SEUL rendu du libellé (`readableInside`), le conserver quand le titre est dupliqué ailleurs (span décoratif redondant). Pas de double annonce lecteur d'écran : l'`aria-label` du bouton prime sur le sous-arbre (nom accessible), et comme il CONTIENT le texte visible, Label-in-Name (WCAG 2.5.3) est respecté dans les deux branches. **Anti-pattern : `aria-hidden` permanent sur l'unique rendu visible d'un libellé.** (Sprint 41 #228)

## PAT-S42-001 — Conflit optimiste : catch au controller → refetch état gagnant (tx fraîche) → exception applicative dédiée
En S42 (#231), pour enrichir le 409 optimistic-lock avec l'état serveur : intercepter `ObjectOptimisticLockingFailureException` (ou faire un check explicite de version) **au niveau controller APRÈS `checkEventOwnership`**, re-charger l'entité serveur gagnante dans une **transaction fraîche** (la tx du PATCH a rollback), et lever une exception applicative dédiée (`EventConflictException` portant `serverEvent` + `serverVersion`) que le `GlobalExceptionHandler` sérialise. Évite le « session poison » d'un catch intra-`@Transactional`. Le filet `ObjectOptimisticLockingFailureException` reste pour les vrais races concurrents. (Sprint 42 #231)

## PAT-S42-002 — Monter un form d'édition sur une frise présentationnelle : host wrapper + hook partagé
En S42 (absorb gap A), pour rendre `EventEditForm`/`ConflictDialog` atteignables depuis une frise routée sans polluer les composants présentationnels testés : introduire un **host wrapper** (`TimelineEditHost`) qui enveloppe `TimelineResponsive` et câble `onEditEvent` (desktop `EventDrawer` bouton éditer + mobile `TimelineActionSheet`), et extraire la logique de conflit dans un **hook partagé** (`useEventEditConflict`, source unique consommée par le host ET `EventContent`). **Anti-pattern : injecter `useAuth`/`useQueryClient` directement dans `TimelineResponsive` (casse les tests sans providers).** Invariant : le host DOIT être monté sous `AuthProvider` (couvert par un test de montage). (Sprint 42 absorb)

## PAT-S43-001 — Prouver l'absence d'un SELECT superflu sur un chemin JPA via les Statistics Hibernate
En S43 (#286), pour prouver qu'un chemin d'écriture (create du token reset) ne fait plus de `findById` superflu : `@SpringBootTest` + `entityManagerFactory.unwrap(SessionFactory.class).getStatistics()` — `clear()` après le seed, exécuter le chemin, asserter `getEntityLoadCount()==0` (aucune entité chargée) ET `getEntityInsertCount()==1` (INSERT pur). Un simple `verify` Mockito de routage ne prouve PAS le comportement JPA réel (le SELECT peut venir du merge-or-persist de `save()` Spring Data). Test : `PasswordResetTokenCreateStatisticsIntegrationTest`. (Sprint 43 #286)

## PAT-S44-001 — Formulaire partagé create/edit : prop `mode` explicite, défaut = mode historique
En S44 (#300), `EventEditForm` (édition) devait aussi servir la création. Le composant était déjà **mode-agnostique** (piloté par `defaultValues` + `onSubmit`) — le « refactor edit-only » redouté par le body de l'issue était un faux problème. Pattern retenu : un prop **`mode: 'edit' | 'create'`** qui gouverne UNIQUEMENT les champs dont l'existence dépend de l'asymétrie DTO create/update (ici `archived`/`endDate`/`recurrenceEndDate`, PATCH-only : masqués ET jetés du payload — BR-EVE-013/014). **Défaut = `'edit'` (mode historique) → migration non-cassante, zéro call site à toucher** (vérifié en revue sur `EventContent`/`TimelineEditHost`/`EventDrawer`/`ConflictDialog`). Corollaire : ce qui n'existe QUE sur un chemin (ici `productId`, create-only) vit **hors** du formulaire, chez l'appelant — l'ajouter aux valeurs du form polluerait le contrat d'édition où le champ n'est pas modifiable. **Anti-pattern : dupliquer le formulaire, ou faire du `mode` un god-switch qui pilote la validation ET le layout ET la soumission.** (Sprint 44 #300)

## PAT-S43-002 — Homogénéiser des handlers d'erreur plats : tout router via `buildBody`, `error`=code stable, texte→`message`
En S43 (#290), 11 handlers plats de `GlobalExceptionHandler` construisaient leur corps à la main (`{error:texte}`) → migration en bloc via `buildBody(HttpStatus, ErrorCode, String)` : `error`=code snake_case stable au niveau statut (`conflict`/`bad_request`), texte humain déplacé dans `message`. Pré-requis avant migration : vérifier qu'AUCUN consommateur frontend ne lit la VALEUR texte de `error` (ici : front mappe par statut HTTP seul, ou toasts i18n locaux). **Exception assumée : un corps ENRICHI verrouillé par le front (EventConflict 409 #231, `error`=texte mot-pour-mot + `serverVersion`/`serverEvent`) reste HORS migration, protégé par un test de non-régression (`GlobalExceptionHandlerContractTest`).** Complète [[PAT-S38-001]]. (Sprint 43 #290)

## PAT-S45-001 — Canal test-only backend : package 100 % `@Profile` + chaîne Security SÉPARÉE + garde ArchUnit
En S45 (#283), pour exposer un lecteur de token de reset aux E2E sans toucher la prod : **un package dédié** (`infrastructure/adapters/testsupport/`) dont TOUTES les classes portent `@Profile("e2e")`, avec sa **propre** `SecurityFilterChain @Order(1)` `securityMatcher("/api/test-support/**")` — **jamais de `permitAll` ajouté au `SecurityConfig` de production** (non modifiée). Verrouillé par trois tests : matrice de profils (`doesNotHaveBean` en `prod`/`dev`/`test`/`dev,prod`/sans profil + contre-épreuve en `e2e` et `dev,e2e`), garde ArchUnit « toute classe du package est gatée » **avec borne basse** (`checked>=3`, anti-test-vacu), et fail-fast au boot si `e2e` est actif en production (cf. [[PIT-S45-009]]). Hors profil, le chemin retombe sur la chaîne principale → 401. (Sprint 45 #283, ADR-005)

## PAT-S45-002 — Prouver un comportement SERVEUR en E2E : asserter le statut HTTP, pas l'UI
En S45, deux specs ont eu besoin du même réflexe. (1) Prouver une redirection **serveur** (et non un redirect JS) : `page.request.get(path, {maxRedirects:0})` + assert `307` et `location` — un `goto` + `expect(url)` passe AUSSI avec une redirection client, donc ne prouve rien. (2) Prouver un **rejet métier** et pas un lockout : l'UI rend le MÊME `data-testid` d'erreur pour un 400 métier et pour un 429 de rate-limit → poser `page.waitForResponse(...)` **AVANT** le click et asserter le statut exact ; sinon la spec passe au vert **sous lockout**, c'est-à-dire réussit pour la mauvaise raison. **Anti-pattern : se contenter de `expect(getByTestId('x-error')).toBeVisible()`.** (Sprint 45 #302/#284)

## PAT-S45-003 — Un durcissement validé par tests unitaires peut casser le runtime : tester contre le module RÉEL du framework
En S45, deux régressions de la même famille : un `Location` relatif accepté par les tests mais refusé par la normalisation de Next ([[PIT-S45-001]]), et un matcher validé par une regex maison mais divergent du matcher réel ([[PIT-S45-002]]). **Règle : quand un correctif touche un contrat CONSOMMÉ par le framework, tester contre le module réel du framework** — ici `NextURL` de l'adapter et `next/dist/compiled/path-to-regexp` — **pas contre une imitation**. Anti-pattern : une assertion d'égalité de chaîne sur une valeur que le framework va re-parser. Corollaire vérifié en S45 : un test anti-régression doit être **prouvé par revert** (revenir au code bogué et constater l'échec) — sinon on ne sait pas s'il attrape quoi que ce soit. (Sprint 45 #302)

## PAT-S45-004 — Exclure les assets d'un matcher Next sans rouvrir de trou : exiger des segments canoniques
En S45 (#302), remplacer l'exclusion `.*\.(?:ico|png|…)$` par **`(?:[^%/]+/)*[^%/]+\.(?:ico|png|…)$`** : segments non vides ET sans `%`. Effet : tout chemin percent-encodé (`/%66r/products/x.png`) ou à slash doublé (`/fr//products/x.png`) ne matche PLUS l'exclusion → **retombe fail-closed dans le middleware**, tandis que `/favicon.ico`, `/images/logo.svg`, `/_next/static/c.js` restent exclus. Vérifié sur 20 cas avec le compilateur réel. **Corollaire : durcir l'entrée d'exclusion, PAS l'entrée « locale » — une alternation littérale de locales (`fr|en|es|de`, imposée par l'analyse statique du matcher) ne rattrapera jamais une locale encodée.** (Sprint 45 #302)

## PAT-S46-001 — Réutiliser une primitive de frise hors frise : prop additive dont le défaut = valeur historique
En S46 (#315), l'aperçu du drawer devait réutiliser `Ruler` et `Cursor`, conçus pour la frise principale avec une gouttière de libellés produits de 15 %. Pattern retenu : une prop **`gutterPercent`, défaut `15`** — reproduisant exactement `w-[15%]` et `calc(15% + p*0.85%)` — et `0` pour l'aperçu pleine largeur. **Zéro call site existant à toucher, zéro risque de régression sur la frise.** Corollaire : la même valeur doit être passée aux deux composants, sinon règle et curseur se désalignent. **Anti-pattern : dupliquer une 2e règle/curseur « pour ne pas risquer de casser la frise » — c'est précisément ce que #316 passait le sprint à dédupliquer.** Cf. [[PIT-S46-001]] pour la limite de l'approche (`EventBar`, non réutilisable en l'état). (Sprint 46 #315)

## PAT-S46-002 — Action destructive : le callback métier LAISSE REJETER, le dialog appelant `await` + `catch` + affiche
En S46 (correctif de revue), `runDelete(id)` est devenu le point d'appel **unique** de `deleteEvent` pour desktop ET mobile, et il ne contient volontairement **aucun `try/catch`** : l'erreur remonte au `catch` de `DeleteConfirmDialog.handleConfirm`, qui possède la surface d'affichage (message inline 404/409/générique, dialog maintenu ouvert). Le nettoyage d'état (conflit, éditeur, cible) n'a lieu **qu'après** le `await` réussi. **Anti-pattern explicite : un `try/catch` local dans le host qui logge et poursuit — le dialog se referme alors comme si c'était un succès, exactement le défaut M2 trouvé en revue.** Corollaire : un point d'appel unique est aussi le bon endroit où accrocher l'invalidation de cache manquante. Cf. [[PIT-S46-002]]. (Sprint 46, review batch)

## PAT-S47-001 — Asserter un accordéon en E2E : l'attribut `aria-expanded`, jamais `not.toBeVisible()`
**Problème** : le masquage peut passer par une hauteur CSS animée → `expect(pill).not.toBeVisible()` est vert aussi bien sur un élément hors-écran que sur une animation en cours, donc intermittent.
**Solution** : assertion primaire sur l'ATTRIBUT `aria-expanded` du bouton toggle, et contenu vérifié par `toHaveCount(0)` (démontage réel, pas invisibilité).
**Anti-pattern** : `not.toBeVisible()` sur un contenu collapsible.
(Sprint 47 #304 — `frontend/e2e/timeline.spec.ts`)

## PAT-S47-002 — Asserter un état de chargement E2E : stub de route SUSPENDU, jamais de temporisation
**Problème** : un `isLoading` dure quelques ms contre un backend local — inassertable ; et un `setTimeout(N)` dans le handler `page.route` casse dès que l'hydratation dépasse N en CI.
**Solution** : le handler `await` une promesse que **le test** résout après avoir asserté l'état (`const release = await stubGated(page); … release()`). L'état reste stable tant que le test ne libère pas — déterministe par construction.
**Anti-pattern** : temporisation fixe dans le handler, ou `waitForTimeout` côté test.
(Sprint 47 #314)

## PAT-S47-003 — Compte E2E jamais vierge : seeder avec des noms `unique()` et scoper les locators
**Problème** : les comptes fixes de `accounts.ts` sont alimentés par les autres specs du run, dont l'ordre n'est pas un contrat. Les états « liste vide » sont donc inatteignables, et purger est destructif et racé.
**Solution** : deux voies selon la nature de l'état. État **client** (`useState` non persisté) → seeder par API une catégorie dédiée + produits aux noms `unique()`, et scoper tous les locators (`filter({hasText})`/`filter({has})`). État **serveur** (liste vide, chargement) → `page.route` sur le seul GET de listing, `route.continue()` pour les écritures, le reste restant full-stack.
**Anti-pattern** : stubber le listing pour un état que le vrai backend atteint déjà de façon déterministe ; supposer un compte vierge en début de fichier.
(Sprint 47 #314 + #304)

## PAT-S47-004 — Glob Playwright : préférer la RegExp dès qu'un segment frère plus profond existe
**Problème** : `page.route('**/api/users/*/products')` — le `*` de Playwright ne garantit pas de ne pas franchir les `/`, donc risque de capter `/api/users/{id}/products/{pid}/events`.
**Solution** : RegExp explicite, ancrée — `/\/api\/users\/[^/]+\/products(\?.*)?$/`.
(Sprint 47 #314)

## PAT-S47-005 — Story d'un composant `useTranslations` : le vrai provider i18n, jamais un stub
**Problème** : un composant consommant `useTranslations()` de next-intl crashe au montage sans provider.
**Solution** : décorateur partagé (`withTimelineIntl` dans `fixtures.tsx`) alimenté par les **vrais** fichiers `public/locales/fr/<namespace>.json` importés en JSON (namespace = nom de fichier, exactement l'indexation de `i18n.ts`), avec `timeZone` figé pour un rendu déterministe.
**Anti-pattern** : stubber `useTranslations` — la story n'attraperait plus le renommage d'une clé i18n, alors que c'est précisément la régression que Storybook doit rendre visible.
(Sprint 47 #205)

## PAT-S47-006 — « La story build » ≠ « la story s'affiche » : servir `storybook-static` et asserter
**Problème** : le critère d'acceptation « la story s'affiche correctement » est couramment validé par un `build-storybook` vert — qui ne prouve QUE la compilation, pas le montage runtime.
**Solution** : servir `storybook-static`, charger `iframe.html?id=<storyId>` pour chaque story, et asserter la présence d'un testid + l'absence de `pageerror`. En S47 : 78 stories montées, ce qui a prouvé au passage la non-régression des 6 stories préexistantes partageant `fixtures.tsx`.
(Sprint 47 #205)

## PAT-S47-007 — Valider une horloge simulée par contrôle négatif
**Problème** : remplacer un `waitForTimeout(800)` par `page.clock.fastForward(600)` peut donner un test vert **sans que l'horloge pilote quoi que ce soit** (le seuil étant franchi par le temps réel écoulé pendant les autres opérations).
**Solution** : contrôle négatif systématique — `fastForward(300)` (sous le seuil) DOIT rendre le test rouge. Sans cette vérification, on ne sait pas si l'on a supprimé le flake ou seulement déplacé.
(Sprint 47, corrections review)

## PAT-S48-001 — Tester une propriété de CASCADE ou de LAYOUT sans navigateur
**Problème** : jsdom ne résout ni la précédence des `@layer` ni aucune mise en page. Les deux régressions du S48 (CTA invisibles, CTA tronqué) laissaient les `className` **inchangées** — un `expect(el).toHaveClass('text-accent-ink')` passait au vert alors que le bouton était illisible. L'assertion RTL sur les classes ne prouve donc **rien** sur ce type de défaut.
**Solution** : compiler le VRAI CSS avec PostCSS + `@tailwindcss/postcss` sur `globals.css`, puis asserter sur l'**AST** :
- cascade → la règle `a` est bien dans `@layer base`, `.text-accent-ink` dans `@layer utilities`, et `@layer …;` déclare `base` avant `utilities` (~450 ms) ;
- layout → extraire du CSS réel les classes déclarant `overflow` non-`visible`, puis vérifier que tout élément du markup rendu qui en porte une porte aussi un plancher (`min-w-*` / `shrink-0`). Invariant **générique** : une future classe `overflow:hidden` posée sur un `Button` fera rougir le test sans réécriture.
**Indispensable** : (a) un **cas témoin négatif** (même déclaration hors layer sur un `from` distinct — le plugin mémoïse par chemin) pour prouver que le détecteur n'est pas vide ; (b) un **test de mutation** manuel (retirer le correctif → le test DOIT rougir). Les deux ont été faits en S48.
**Anti-pattern rencontré** : un faux vert causé par `[&_svg]:shrink-0` (posé par le variant `Button`) qui satisfaisait une regex `shrink-0` — les variantes à **sélecteur arbitraire ciblent un DESCENDANT**, il faut les exclure de ce genre de détection.
(Sprint 48, corrections de clôture)

## PAT-S49-001 — Virtualiser sans casser un pattern clavier/a11y existant : fenêtrer le MONTAGE seulement
**Problème** : la virtualisation démonte des nœuds focusables ; renuméroter les index sur la fenêtre visible fait sauter des éléments à la navigation clavier et fausse `aria-setsize`.
**Solution** (S49 #69) : `windowEvents` **conserve l'index du modèle complet**, les modèles de navigation restent construits sur la **liste entière**, et `ensureVisible` + focus différé relaient la cible jusqu'à son montage. `aria-setsize` porte sur la longueur réelle, pas sur la fenêtre. Des cales (`spacer`) préservent la hauteur totale de page — vérifiée **identique avant/après** (5995 px), ce qui rend la virtualisation géométriquement transparente et permet de la valider par simple comparaison.
**Anti-pattern** : renuméroter les index sur la fenêtre.
**Piège associé** : dans une zone en `scroll-behavior: smooth`, **ne jamais rétrécir la fenêtre de rendu à la frame suivant un `scrollIntoView`** — le nœud focalisé est démonté en plein défilement animé et le focus retombe sur `<body>` (299 déplacements sur 300 perdus, **invisible à jsdom**). Débouncer le recalage (400 ms) ; la bande reste alors **trop large**, jamais trop étroite — surcoût de rendu, pas de perte. (Sprint 49 #69)

## PAT-S49-002 — Mesurer un contraste RÉELLEMENT RENDU (et non déclaré)
**Problème** : un `expect(el).toHaveClass('text-accent-ink')` ne prouve rien sur la lisibilité (cf. `PAT-S48-001`), et parser `rgb()` à la regex échoue dès que le DS utilise `color-mix()` ou `oklch()`.
**Solution** (S49 #337) : normaliser toute couleur via un **canvas 1×1** (`fillStyle` + `getImageData`) — le navigateur résout la syntaxe pour vous — puis **compositer le fond effectif** en remontant les ancêtres **et** les pseudo-éléments `::before`/`::after` couvrants (les voiles de brillance changent le fond réel). Luminance relative WCAG 2.x : linéarisation sRGB, pondération 709, `+0.05`. Appliquer l'`opacity` effective à l'alpha de l'encre — **erreur du côté sévère**.
**Indispensable** : attendre `document.fonts.ready` (la métrique de troncature `scrollWidth`/`clientWidth` en dépend), couvrir **clair ET sombre** (un CTA peut passer dans un mode et échouer dans l'autre), et **valider par mutation**.
**Anti-patterns** : parser `rgb()` à la regex ; ignorer les voiles ; comparer le `fillStyle` au noir pour détecter une syntaxe invalide (cela accuse à tort le noir légitime — utiliser **deux sentinelles**). (Sprint 49 #337)

## PAT-S49-003 — Verrouiller un invariant de TOKEN (et non de cascade) par parcours AST
**Problème** : une migration de token (`rule-strong` → `rule-emphasis`) est réversible par inadvertance, et rien dans les tests unitaires ne distingue une bordure **fonctionnelle** d'une bordure **décorative**.
**Solution** (S49 #336, réemploi de `PAT-S48-001` sur un autre axe) : liste blanche de sélecteurs de contrôle + parcours AST du CSS compilé + **témoin négatif** + **test de mutation**. Le test rougit si un contrôle retombe sur le tier décoratif **ou** si le pont `--color-input` change de tier.
**Généralisation** (correctifs de review S49) : l'invariant le plus robuste n'est pas une interdiction absolue mais une **paire sanctionnée** — `landing.hover-pairing.test.ts` n'interdit pas tout `hover:text-*`, il exige que *si* surface et encre changent ensemble, ce soit la paire validée. Deux occurrences légitimes sont ainsi conservées au lieu d'être faussement signalées. **Le détecteur lui-même doit être testé** (3 tests). (Sprint 49 #336 + review)

## PAT-S50-001 — Vérifier un JWT RS256 dans le runtime Edge sans ajouter de dépendance
`crypto.subtle.importKey('spki', …)` + `crypto.subtle.verify('RSASSA-PKCS1-v1_5', …)` suffisent : ~60 lignes,
disponibles nativement dans le runtime Edge, **zéro dépendance de production ajoutée**.
**Anti-pattern : ajouter `jose`** — c'est une dépendance de PROD dans un runtime frontend partagé, qui se
séquence et ne s'improvise pas au milieu d'un sprint. La lecture de la clé se fait en accès **littéral**
(`process.env.AUTH_JWT_PUBLIC_KEY`, forme reconnue par l'analyse statique de Next) et **non** `NEXT_PUBLIC_*`,
donc au runtime et non inlinée au build. (Sprint 50, #323)

## PAT-S50-002 — Dégradé volontaire vs panne de configuration : deux cas, deux traitements
Sur une variable d'environnement qui active une protection, distinguer :
- **absente** → dégradé assumé, mais `console.warn` **one-shot** si `NODE_ENV === 'production'` ;
- **présente mais inexploitable** → anomalie de configuration, `console.warn` one-shot toujours ;
- jamais de `throw` — dans un middleware Next, une exception = 500 sur toutes les routes protégées (BUG-S45-001).
**Anti-pattern : ne signaler que le cas rare.** Signaler uniquement « présente mais invalide » laisse l'oubli
pur — de loin le plus probable en production — totalement invisible, et le test E2E qui *documente* le dégradé
reste vert pendant que la protection est morte. Piège de comptage rencontré à l'implémentation : une condition
`rawValue.trim() !== ''` crie sur `',,,'` (non vide, zéro entrée réelle) — compter les entrées **tentées**.
(Sprint 50, #322/#323 + review)

## PAT-S50-003 — Prouver qu'un test E2E de garde prouve réellement quelque chose
Un E2E de garde d'authentification peut être **vert en mode dégradé** et ne rien démontrer. Trois preuves
exigées avant d'accepter la couverture :
1. la clé publique journalisée au boot du backend est **octet à octet** celle injectée au frontend, et le log
   « paire éphémère » est absent ;
2. une sonde `curl` avec un cookie bidon sur une route protégée renvoie **307** (un 200 signerait le dégradé) ;
3. **fail-closed exécuté** : la même spec relancée contre une instance sans clé publique doit **rougir**
   (mesuré : 5 échecs sur 7).
Placer la garde anti-dégradé en **premier cas** du fichier. **Anti-pattern : une sonde qui auto-skippe** —
elle skippe précisément dans le mode de panne qu'on veut détecter. (Sprint 50, #323)

## PAT-S50-004 — Dériver la clé publique de la privée plutôt que de configurer les deux
Une paire configurée en **deux** variables serveur est indétectablement dépareillable ; en dériver une supprime
la moitié du mode de panne. Une seule variable serveur (`JWT_PRIVATE_KEY`), la publique est calculée au boot
et **journalisée** (ce n'est pas un secret) pour être copiée vers le frontend sans re-dérivation manuelle.
Reste ouvert : une clé publique **bien formée mais dépareillée** côté frontend fait boucler 100 % des sessions
vers `/login` sans aucun signal — consigné en ADR-004 et au runbook, non détecté automatiquement. (Sprint 50, #323)

## PAT-S52-001 — Arbitrer entre plusieurs correctifs CSS sans en coder aucun
Problème : 3 options de correction proposées par une issue, sans critère pour trancher. Solution : simuler
chaque option par `addStyleTag` dans Playwright et comparer la **marge résiduelle**, pas seulement
« ça déborde ou non ». Au S52 sur #347 : deux options étaient « vertes », mais l'une laissait **0 px** de
marge dans les 4 locales et l'autre **223–258 px**. Anti-pattern : choisir sur la seule absence de
débordement — elle masque les correctifs qui tiennent à un pixel près, donc au rendu d'un autre OS
(cf. [[PIT-S52-001]]).

## PAT-S53-001 — Prouver qu'une règle CSS est layerisée : AST post-compilation + témoin + mutation
Problème : `jsdom` ne résout ni `@layer` ni le layout, et un test RTL sur `className` ne prouve **rien** ici
(les classes sont déjà présentes avant le correctif — c'est précisément le piège). Solution : compiler la
**vraie** chaîne (`globals.css` + `@import 'tailwindcss'`) via PostCSS + le plugin Tailwind 4, puis asserter
**sur l'AST de sortie** l'appartenance au layer et la valeur gagnante des custom properties (`winningRootVar`).
Trois garde-fous indispensables : (1) **fixture témoin anti-vacuité** par assertion ; (2) **`from` unique par
fixture** — le plugin mémoïse par chemin d'entrée, un `from` partagé fait compiler le CSS réel et le test
**passe à vide** ; (3) **regex de discrimination** sur une déclaration propre au DS (`--font-display`,
`--radius-md`) — Tailwind émet son preflight sous les **mêmes sélecteurs**. Valider par **mutation** :
dé-layeriser la règle de production et exiger le rouge. Un test AST vert ne dit pas qu'il détecte quoi que
ce soit. (Sprint 53, #339/#340 — `frontend/src/styles/__tests__/base-layer.test.ts`, 5 → 13 tests)

## PAT-S53-002 — Sonder des éléments synthétiques pour mesurer une règle CSS indépendamment de la page
Problème : vérifier une règle transverse en ouvrant une page ne teste que l'échantillon de cette page — et au
S53 la landing était le **pire** échantillon (ses titres portent un `leading-tight` explicite, les 6 seuls du
dépôt immunisés). Solution : `document.createElement(tag)` + `className` + `getComputedStyle`, élément jeté
aussitôt. Ça teste **la règle**, pas la page, et se compare trivialement entre deux branches
(`git checkout <base> -- frontend/src/styles` → reload → sonder → restaurer). Au S53 : dérive de line-height
quantifiée sur 2 branches en ~2 minutes après un E2E rouge. Complément obligatoire de [[PAT-S48-001]].

## PAT-S54-001 — Message d'échec E2E qui RAPPORTE les statuts mesurés au lieu de SUPPOSER la cause
Problème : un message d'échec qui affirme une cause HTTP en dur (« 429 rate-limit probable ») a confondu
**trois causes distinctes** pendant deux sprints — 429 (rate-limit register), 403 (CORS refusé, le profil dev
fige `allowed-origins=:3000`), 500 (rendu du serveur de dev Next). Solution (#329) : un listener
`page.on('response')` collecte les statuts **réellement observés** sur `POST /api/auth/register` ; le message
les restitue avec une grille de lecture 429/403/409, et distingue explicitement « échec de rendu » (le
formulaire ne s'est jamais affiché, aucun POST tenté) d'« échec de soumission ». Raffinement review : brancher
la piste sur `lastStatus` (`null` ⇒ serveur injoignable / `200` ⇒ régression de rendu applicatif / `5xx` ⇒ dev
server) pour ne pas mal catégoriser un 4ᵉ mode. Validé en conditions réelles : un run a produit le bon
diagnostic sur un `ERR_CONNECTION_REFUSED`. Ne colle jamais une cause en dur dans un message d'échec de test.

## PAT-S54-002 — Contourner un bug produit dans une spec SANS effacer son assertion
Quand un défaut réel empêche le **mode d'interaction** mais pas le **comportement** visé, changer de mode
d'activation en conservant l'assertion — et signaler le défaut en follow-up. Au S54, une pastille proche de
`rangeStart` est inatteignable à la souris (en-tête de lane sticky `--lane-header-w=168px` recouvrant un event
posé à 150 px) : la spec `live-region` active la pastille au **clavier** (`Enter`, même `onSelect` que le
clic) tout en gardant l'assertion sur le contenu annoncé. La spec reste vraie ET le bug reste visible.
Anti-pattern : affaiblir l'assertion en `toBeVisible()`, ce qui rendrait la spec verte **et muette**. Corollaire
S54 : tout oracle négatif (`toHaveCount(0)`) doit être **ancré** par une assertion de présence de l'élément
porteur, sinon il est vacuously vert quand le seed ne s'affiche pas. Cf. [[ci-green-is-not-page-correct]].

## PAT-S55-001 — Un serveur lancé en fond en CI perd son code de sortie : poll à échec-par-défaut
`java -jar … &` (job `e2e`, `ci.yml:210`) rend le verdict du process **inaccessible** au step. Le job
`flyway-smoke` (#356) corrige le motif : boucle 45×2 s qui (a) `kill -0 "$PID"` → process mort ⇒ dump du log
+ `exit 1`, (b) **preuve POSITIVE** de démarrage (`curl -sf /actuator/health | grep '"status":"UP"'`) ⇒
`exit 0`, (c) sortie de boucle ⇒ timeout ⇒ `exit 1`. Le vert n'est **jamais** l'absence d'erreur.
Anti-pattern : `sleep N` puis continuer, ou un poll qui `break` sans verdict — le job devient invérifiable.
Corollaire : un job de garde-fou doit être testé **négativement** (ici : base injoignable ⇒ `RC=1`) ; sinon
rien ne prouve qu'il peut rougir.

## PAT-S55-002 — Rendre vérifiable la « virginité » d'une base plutôt que la supposer
Un smoke Flyway sur base non vierge passerait au vert en validant un schéma qu'il n'a pas construit
(`spring.flyway.baseline-on-migrate=true` suffit à le masquer). Le job relit donc
`flyway_schema_history` et exige `count(success) == nb de V*.sql` **ET** `première version == 1` — le second
prédicat est ce qui attrape le cas baseline. Filtrer `version is not null` pour ne pas compter les
répétables `R__*.sql` (type `SQL` elles aussi). Effet de bord utile : une future `V16` mal nommée ou mal
placée, donc ignorée par Flyway, fait rougir le step.

## PAT-S56-001 — État UI d'une API navigateur à sorties multiples : dériver de l'événement, jamais du handler
Le plein écran se quitte par le bouton, par Échap natif, par F11 et par le menu du navigateur. Un `useState`
basculé dans `toggleFullscreen` ne voit que la première : l'attribut ARIA **ment** sur les trois autres.
Pattern retenu (S56 #395) : `useEffect` sur `document.addEventListener('fullscreenchange')` lisant
`Boolean(document.fullscreenElement)`, **+ sync initial au montage, + cleanup**, et **aucun `setState` dans le
handler**. Généralisable à toute API à sorties multiples (visibilité, orientation, réseau). Le test qui
discrimine les deux implémentations est celui qui **sort sans toucher l'UI** — sans lui, la variante naïve
passe (mesuré : sensibilité B = 1 seul échec, le test « nominal » restant vert). Cf. [[PIT-S56-002]].

## PAT-S56-002 — Un E2E d'état transitoire reste vert sans son mécanisme : asserter la STABILITÉ
S56 #391 : le test du spinner de session restait vert **même gate retirée** — il constatait un écran déjà
chargé, `toBeVisible()` attrapant le spinner au vol. Seule assertion qui rougit quand la gate saute :
**assert visible → pause bornée → re-assert visible**. Mesuré : sans le `waitForTimeout` + re-assert, le test
était vert sans la gate ; avec, sensibilité = 1 échec ciblé. Anti-pattern : `toBeVisible()` + `toHaveCount(0)`
seuls, tous deux trivialement verts au premier poll réussi.

## PAT-S56-003 — Un garde-fou de valeur s'asserte sur la constante IMPORTÉE, puis se prouve par sensibilité
S56 #393 : un test écrit avec un littéral recopié (`expect(mapped.color).toBe('#3B62D4')`) reste vert quand la
constante dérive — il ne prouve rien. Pattern : importer la constante et asserter la **propriété** voulue
(`eventLabelReadableInside(DEFAULT_COLOR) === true`), puis **remettre temporairement la mauvaise valeur** et
vérifier que le compte d'échecs est celui attendu (ici exactement 2, les 2 nouveaux garde-fous). Corollaire :
distinguer les littéraux qui sont des **entrées explicites** d'un cas de test (à laisser tels quels, avec un
commentaire qui interdit de les resynchroniser) de ceux qui **prétendaient valoir le défaut** (à convertir).

## PAT-S57-001 — Tester une logique filesystem sans polluer l'arborescence de production
Un garde-fou qui lit le disque (S57 #318 : `readdirSync` sur `frontend/app/[locale]/(app)/` comparé à
`PROTECTED_APP_SEGMENTS`) doit prouver qu'il **rougit**, sinon il ne garantit rien. La tentation — et ce que
suggérait le plan architect — est d'ajouter une route bidon pour voir le rouge : **elle partirait en
production**. Pattern retenu : extraire la logique en fonctions pures (`scanRouteDirectories` /
`diffProtectedSegments` / `formatGuardReport`) typées sur la **forme structurelle** de `fs.Dirent`
(`{name, isDirectory()}`) → les mêmes fonctions tournent sur le disque réel et sur des entrées fabriquées.
Les deux directions d'échec (route non déclarée / constante orpheline) se testent alors sans toucher à `app/`.
Corollaires appris dans le même sprint : (a) résoudre le chemin via `import.meta.url`, jamais le `cwd` ;
(b) ce qu'on ne sait pas interpréter (`(groupe)/`, `[param]/`) doit **faire échouer** le test, pas être
ignoré — un route group remonte ses enfants d'un niveau, un segment dynamique matche tout : ignorer rouvre
le trou que le garde-fou ferme ; (c) normaliser la casse des deux côtés, sinon `(app)/Billing/` déclaré
`'Billing'` passe au vert alors qu'`isProtectedPathname` compare `segment.toLowerCase()` — fausse assurance
dans le scénario exact que le garde-fou vise (corrigé en cours de sprint, cf. [[PIT-S57-002]] pour le
message d'échec).


## PAT-S58-001 — Prouver « pré-existant » au lieu de l'affirmer
Face à un défaut découvert pendant un sprint, « c'était déjà là » et « c'est nous » sont deux conclusions
qui exigent chacune une preuve. Méthode employée trois fois en S58, coût ~5 minutes à chaque fois :
restaurer le ou les fichiers depuis le commit de base (`git show <sha>:<chemin> > <chemin>`), re-mesurer,
restaurer son état. A tranché le rognage de contour dans `.mt-zoom`, le défaut `Select`/Firefox, et surtout
**5 échecs E2E** qui pointaient vers le fichier le plus modifié du sprint — verts sur la base **et** sur
`HEAD`, donc ni régression ni défaut latent. Sans ce réflexe, l'arbitrage par défaut aurait été de revenir
sur une migration correcte et mesurée. Symétrique de [[ci-green-is-not-page-correct]].

## PAT-S58-002 — Lecture de pixel fiable en Playwright
`page.screenshot({clip})` → base64 → `createImageBitmap` + canvas `getImageData` **dans la page**.
Pour un filet fin ou pointillé, échantillonner **N lignes** et garder l'extrême (une sonde unique tombe dans
un vide). Sur un bord courbe, l'anti-crénelage dilue le pixel : mesurer sur un côté droit, jamais sur un arc
— S58 a lu 3,19:1 sur un bouton circulaire dont la couleur déclarée valait 3,70:1. C'est la seule méthode
qui tranche un contraste en situation (cf. [[PIT-S58-001]]).

## PAT-S58-003 — Découper un correctif de cascade en étapes dont aucune ne retire d'indicateur
Layeriser une règle globale de focus **retire** l'indicateur partout où le code applicatif posait un
`outline-none` — c'est pourquoi le S53 avait renoncé. S58 a montré que le défaut se **décompose** : retirer
le `border-radius` parasite ne touche aucun site (le contour reste gagnant), nettoyer les 32 sites ne change
rien au rendu (le contour les battait déjà), et seule la **layerisation** porte le risque — donc elle vient
en dernier, quand plus aucun site ne la combat. Chaque étape est vérifiable seule, et à aucun instant
l'application n'est sans indicateur de focus. Généralisable : devant un correctif de cascade jugé risqué,
chercher d'abord **quelle part du défaut est séparable du risque**.
Corollaire outillé : `PAT-S24-002` (hitbox 44×44 sans agrandir le visuel) se transpose en utilitaires
Tailwind — `relative before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11
before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']`. Anti-pattern : agrandir `h-9 w-9`,
qui déplace le layout et rouvre le débordement horizontal.

## PAT-S59-001 — Prouver qu'un test de mise en page n'est pas vacuous : le faire rougir
Réintroduire la classe fautive, relancer, **exiger des rouges nommés**. Ce n'est pas un rituel : au S59,
`scrollWidth <= clientWidth` de #347 restait **VERT** sur le défaut réel de #381 (un logo qui se coupe en
deux lignes satisfait l'assertion), et l'auto-contrôle de la sonde de débordement restait **VERT** sur une
sonde renommée (il assertait `tag === 'div'`, pas l'identité de la sonde). Corollaire : asserter `font-size`
**sans** `line-height` laisse passer la moitié du défaut — `base.css` n'apparie un interligne serré qu'aux
`h1..h6`, tout `text-*` sur `<p>`/`<span>` hérite sinon 1,5556.

## PAT-S59-002 — Une dérogation de spec est une dette datée, à lever avec l'AC qu'elle contourne
Une spec qui fige `<=` au lieu de `<`, ou qui **exclut une zone du balayage**, encode le défaut et le rend
permanent — tout en affichant du vert. Au S59, le `<footer>` avait été exclu du balayage « plus grand
élément de la page » pour faire verdir la hiérarchie typographique, avec un commentaire chiffré qui
*justifiait* l'exclusion. Les deux dérogations ont été levées en même temps que les AC correspondants.
Anti-pattern : documenter proprement une dérogation et la laisser vivre — la documenter ne l'annule pas.

## PAT-S59-003 — Alléger une suite sans perdre son filet : le contrôle ponctuel
Une boucle clair/sombre doublait 32 tests en 64 pour des métriques invariantes au thème, sur un check CI
requis. Le reviewer recommandait le **retrait total** ; retenu à la place : cas général mono-thème **+ un
contrôle ponctuel** (1 palier, 1 locale) qui asserte l'égalité des métriques entre thèmes. **Justifié par la
mesure, pas par l'opinion** : injection d'une règle `.dark h1{font-size:33px}` → 10 passed / 1 failed, seul
le contrôle ponctuel la voit. Le contrôle doit asserter la présence de `.dark` avant de re-mesurer, sinon il
compare clair à clair et devient lui-même vacuous.

## Baseliner un historique compromis sans créer d'angle mort futur (Sprint 60, #362)

Problème : sur un dépôt **public**, l'historique contient des secrets définitivement compromis
(audit #249). Un scan qui rougit à chaque run sur ces constats connus sera ignoré puis désactivé —
exactement le mode d'échec que le garde-fou veut éviter. Mais tout mécanisme d'exclusion risque de
blanchir aussi l'avenir.

Solution retenue, **deux étages qu'il ne faut pas confondre** :
- `.gitleaksignore` — empreintes `commit:fichier:règle:ligne`. Le SHA rend l'exclusion **inerte pour
  tout commit futur** : une réintroduction produit une empreinte différente et rougit. Réservé aux
  occurrences **absentes du HEAD** — le vérifier une par une, cf. [[PIT-S60-002]].
- `.gitleaks.toml` — exclusions **durables** pour les valeurs jetables encore au HEAD, scopées
  chemin **+** marqueur de la valeur, `condition = "AND"` obligatoire, cf. [[PIT-S60-001]].

Anti-pattern écarté : `--baseline-path` avec un rapport JSON committé — le rapport **contient les
valeurs en clair**, donc committer la baseline reviendrait à recommitter les secrets.

Règle de maintenance qui fait tenir l'ensemble : **une exclusion se justifie par un § d'audit,
jamais par « la CI est rouge »**. Et chaque exclusion se teste **dans les deux sens** avant
livraison.

## PAT-S61-001 — Remplacer un filtre codé en dur par un état de vue, pour que la vague suivante puisse s'y brancher

`ProductDetailView` filtrait `!event.archived` en dur (#307). Plutôt qu'inverser la condition, la vague 1 a
introduit `EventViewFilter = 'active' | 'archived' | 'all'` + `matchesEventFilter(archived, filter)`, avec
`'active'` par défaut — donc **comportement d'arrivée inchangé**. La vague 2 (#230, grisage au lieu de masquage)
a pu se brancher dessus sans réécrire la logique, et la spec E2E préexistante qui assertait « l'archivé disparaît
de la frise » est restée vraie (le défaut n'a pas bougé), seule sa *raison* ayant changé.

Le briefing de la vague 1 demandait explicitement cette forme, en anticipant le besoin de la vague 2. C'est ce
qui a permis de séquencer deux issues sur les mêmes fichiers sans conflit de merge ni retouche croisée.

## PAT-S62-001 — La sonde de pixel `PAT-S58-002` existe enfin : `frontend/e2e/support/pixel.ts`
Citée par la mémoire depuis le S58 **sans avoir jamais été implémentée** — et `e2e/support/contrast.ts` ressemblait assez à une sonde pour tromper (son `getImageData` l.138 ne fait que normaliser une couleur sur un canvas 1×1 ; le reste est du `getComputedStyle`). API : `measureIndicatorContrast(page, locator, {side, indicatorOffsetPx, adjacentOffsetPx, samples?, edgeGuard?, edgeGuardPx?, minUnanimity?})`, `dumpOutwardProfile`, `readStrip`, `contrastRatio`, `assertFocusVisible`, `settleForMeasurement`. Agrège par **mode**, jamais par extremum ([[PIT-S58-001]]), et expose `unanimity` comme détecteur d'arc ou de mauvais offset — sur un radio circulaire de 18 px, l'unanimité est tombée à **48 %** et la sonde a **refusé de publier le ratio**. Toujours lancer `dumpOutwardProfile` et **relire le profil brut** avant de figer un offset. (Sprint 62 #415)

## PAT-S62-002 — Layout racine transparent ⇒ `experimental.globalNotFound`
Quand `<html>` descend sous `[locale]` (pattern next-intl), `app/global-not-found.tsx` + `experimental: { globalNotFound: true }` est la **seule** forme servie au runtime (`next-app-loader` : « remove root layout for /_not-found »). Vérifié en prod standalone, dev webpack ET dev turbopack, Next 15.5.22. Anti-patterns mesurés en [[PIT-S62-005]]. ⚠ Le drapeau est **expérimental et ne rougit pas s'il disparaît** à un bump de Next : la 404 redeviendrait blanche en silence. Le filet doit être une spec E2E sur le **HTML servi** (statut 404 + `<html lang>` + testid + `<title>` non vide). (Sprint 62 #413)

## PAT-S62-003 — `global-not-found` est monté en `page:`, donc il peut être un Server Component
`next-app-loader/index.js:298` le monte en **`page:`** de `/_not-found`, pas en layout, et le builtin `client/components/builtin/global-not-found.js` n'a pas de `'use client'`. Forme retenue : **parent serveur** exportant `metadata` seule, **enfant client** rendant `<html>`/`<body>` et résolvant la locale en `useEffect`. C'est ce qui permet de garder un `<title>` sans sacrifier le prérendu statique. (Sprint 62 #413)

## PAT-S62-004 — Armer une sonde de pixel sans navigateur
Un **double de `Page`** dont `evaluate()` rend directement `{width, height, dpr, data}` (aucun PNG encodé) fait tourner **pour de vrai** le clamp viewport, l'assertion d'échelle et l'accès pixel, en vitest. Géométrie choisie pour que les positions tombent sur des entiers (côté 40 px, `edgeGuardPx: 10`, 21 échantillons → pas de 1 px) : une ligne rayée par parité donne 11/21 = 52 %, sous le seuil de 60 %, **de façon déterministe**. Anti-pattern écarté : extraire la garde dans une fonction pure testée à part — sa suppression du **site d'appel** resterait invisible. (Sprint 62, review cycle 2)

## PAT-S62-005 — Un garde-fou de mesure vit dans la fonction qui rend le chiffre, pas dans les appelants
S62 : `minUnanimity` était documenté en JSDoc et asserté **à la main** dans les deux specs. #415 y a survécu grâce à cette assertion manuelle — qu'aucun appelant suivant n'aurait eue. Le seuil est devenu une option **levante par défaut**, sur les deux bandes, avec opt-out explicite (`minUnanimity: 0`) et documentation du danger. Documenter un seuil en JSDoc et compter sur la recopie est un anti-pattern. Cf. [[PIT-S62-003]]. (Sprint 62, review cycle 2)
