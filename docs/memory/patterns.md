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
