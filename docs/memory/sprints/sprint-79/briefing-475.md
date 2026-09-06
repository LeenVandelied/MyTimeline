[BRIEFING ISSUE #475 — Sprint 79, vague 1]

## Issue
**[CHORE] Le budget `register` de la suite E2E est au plafond du rate-limit (5/run vs 5/min/IP)**

La suite E2E effectue **5** `POST /api/auth/register` par run : 4 dans `frontend/e2e/auth.setup.ts`
(comptes partagés) + 1 auto-inscription dans le golden-path. Le `RateLimitingFilter` du backend
autorise **5** requêtes par minute et par IP sur `/api/auth/register`. Le job CI `e2e` tourne sur
une seule IP : le budget est donc consommé à **100 %, sans marge**. Le moindre test supplémentaire
qui s'inscrit fera échouer toute la CI, avec un symptôme (timeout sur la page de connexion) qui ne
pointe pas du tout vers la vraie cause.

Le défaut est **masqué en local** (`RATE_LIMIT_ENABLED=false`) : il ne se manifeste qu'en CI.

### Pistes de l'issue (non tranchées)
- mutualiser davantage les comptes du projet `setup` (`auth.setup.ts`) ;
- relever le seuil de `RateLimitingFilter` pour le profil `e2e` uniquement ;
- exempter l'IP du runner CI.

### Critères d'acceptation
- [ ] Le nombre de `register` par run E2E dispose d'une **marge documentée** par rapport au seuil
      de `RateLimitingFilter` (plus de « 100 % sans marge »).
- [ ] La solution retenue est implémentée **et justifiée dans le code ou sa documentation**.
- [ ] Une vérification confirme qu'ajouter un `register` supplémentaire à la suite ne fait plus
      dépasser le budget.

## Plan d'implémentation (architect, /sprint plan — RECOMPTÉ PAR LE LEAD, exact)
```yaml
issue_475:
  fichiers_cles:
    - "frontend/e2e/support/accounts.ts:294-311  (SHARED, PWD, DEL, PROD → ALL_ACCOUNTS)"
    - "frontend/e2e/auth.setup.ts"
    - "frontend/e2e/golden-path.spec.ts:69  (self-register, le 5e)"
    - "backend/.../infrastructure/security/RateLimitingFilter.java:108"
  couches_touchees: ["frontend", "infrastructure"]
  strategie_test: "E2E (run complet) + integration backend si la piste retenue est un seuil dédié au profil e2e"
  risque_regression: "Mutualiser SHARED et PROD réintroduirait exactement l'entrelacement que le commentaire d'accounts.ts:306 dit avoir voulu éviter — et casserait #463 avant même de l'avoir traitée."
  ordre_ecriture: "décider la piste → backend (si seuil e2e) → accounts.ts/auth.setup.ts → run E2E complet"
  zod_dto_sync: "NON"
  possibly_done: false
```

**Vérifications faites par le lead avant de te briefer** (ne les refais pas, appuie-toi dessus) :
- `RateLimitingFilter` : `Map.entry("POST /api/auth/register", 5)` — confirmé, ligne présente dans
  une `Map.ofEntries` (et le commentaire du fichier explique pourquoi `Map.of` a été abandonné :
  plafond de 10 paires).
- `accounts.ts` : `export const ALL_ACCOUNTS: readonly E2eAccount[] = [SHARED, PWD, DEL, PROD]`
  → **4**, plus l'auto-inscription de `golden-path.spec.ts` (`page.goto('/fr/register')` puis
  submit) → **5 pour un plafond de 5**. Marge nulle, exactement comme l'annonce l'issue.

## Deux pistes à écarter d'office, et pourquoi
1. **« Exempter l'IP du runner CI » — NON.** Le job `e2e` tourne déjà sur une IP unique :
   l'exemption désarme purement et simplement le filtre qu'on prétend exercer. On supprimerait le
   symptôme en supprimant le test.
2. **« Mutualiser SHARED et PROD » — NON.** Le commentaire de `accounts.ts` documente que `PROD` a
   été séparé de `SHARED` *pour ne pas entrelacer* avec les mutations de profil/settings. Les
   fusionner réintroduirait l'entrelacement — et casserait **#463**, traitée en vague 2 du même
   sprint, avant même qu'elle commence.

Ce qui reste : **un seuil dédié au profil `e2e`** (piste la plus directe) ou une réduction réelle
du nombre de `register`. Tranche, et **écris la justification dans le code**, pas seulement dans
ton retour.

## Triage
Taille: S
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

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

<!-- ===== packs volumineux NON inlinés — à ouvrir toi-même si besoin ===== -->
Les packs suivants font 87 à 296 Ko : ils ne tiennent pas dans un prompt. Ouvre-les AVEC
`Read`/`grep` depuis le worktree si tu en as besoin, et **cite dans ton done.md la ligne
`fichiers de contexte lus : ...`** pour que ce soit auditable :
- `.ai-env/context-packs/pit-frontend.md` (143 Ko) — pièges frontend/E2E. Entrées pertinentes :
  grep `PIT-S61-007` (turbopack en worktree), `PIT-S73-008`, `PIT-S62-009` (stack E2E partagée),
  `PIT-S47-004` (graine non propagée — et la note du config qui explique quand ce n'en est PAS un),
  `PIT-S57-003` (curl sans `Origin`).
- `.ai-env/context-packs/pit-backend.md` (87 Ko) — pièges backend (profils, properties).
- `.ai-env/context-packs/br-auth.md` (22 Ko) — BR auth (BR-AUT-002 = rate-limit + en-têtes).
  Vérifie si ta piste modifie une BR : si oui, dis-le explicitement dans le done.md.
- `frontend/playwright.config.ts` — commentaires #427/#469/#470, la source la plus fiable du dépôt
  sur le harnais E2E.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- **Tu détiens l'EXCLUSIVITÉ Playwright pour cette vague.** `playwright.config.ts` pose un verrou
  de run (`e2e/support/run-lock.ts`) : un seul run par worktree, `e2e/.auth/` étant partagé. Ton
  co-équipier de vague (#428) est backend-config et ne joue aucun E2E. Personne ne te disputera la
  stack — mais ne lance pas deux runs en parallèle toi-même (deux runs simultanés se
  réauthentifient mutuellement et produisent une signature d'échec qui imite `PIT-S47-004` sans en
  être).
- **#463 arrive en vague 2 sur `accounts.ts` et `auth.setup.ts`** — les mêmes fichiers que toi.
  Laisse-les dans un état que la vague suivante peut reprendre : pas de refactor opportuniste,
  périmètre strict.
- Ne touche PAS : `backend/src/main/resources/application-dev.properties` (c'est #428).

## Recette E2E locale (elle est PRÉCISE, ne l'improvise pas)
Quatre agents de sprints antérieurs ont conclu « E2E impossible en local ». C'est faux, et la
recette est écrite dans `frontend/playwright.config.ts` :
```
# 1. serveur Next lancé À LA MAIN — webpack, PAS `npm run dev` (qui force --turbopack :
#    en worktree, turbopack infère un mauvais workspace root et TOUTES les pages rendent 500,
#    aucune spec ne tourne — PIT-S61-007)
cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npx next dev -p 3000

# 2. ORACLE AVANT TOUTE AUTRE HYPOTHÈSE — 401 = proxy OK, 404 = proxy absent :
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/me

# 3. la suite, en visant le serveur déjà lancé :
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```
⚠ **Le rate-limit est DÉSARMÉ en local** (`RATE_LIMIT_ENABLED=false`) : un run local vert ne prouve
**rien** sur le budget `register`. C'est tout l'objet de l'issue. Ta preuve doit être un **compte
explicite** (nombre de `register` par run, mesuré, vs seuil du filtre) et/ou un **test
d'intégration backend** sur le seuil du profil `e2e` — pas « la suite est verte ».
⚠ Un `curl` qui réussit ne disculpe PAS le CORS : il n'envoie pas d'en-tête `Origin`
(`PIT-S57-003`). Lis les statuts instrumentés par `auth.setup.ts` avant toute hypothèse — un 403
CORS y est rapporté comme « rate-limit probable », et ce faux diagnostic a coûté trois sprints.

## Designer
Non applicable.

## Contraintes
- Répertoire de travail : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`.
  **`cd` explicite en tout premier**, puis vérifie `git rev-parse --abbrev-ref HEAD` →
  doit rendre `claude/sprint-79-start-c6dc55`. Si tu vois autre chose, ARRÊTE et signale-le.
- Branche cible : `claude/sprint-79-start-c6dc55` (déjà checkout, ne change pas de branche).
- Commit : **1 commit logique**, message gitmoji en français.
  **`git add` en pathspec CIBLÉE, jamais `-A` ni `.`** — deux agents partagent ce working tree.
  ⚠ `git add -- $F` avec une variable est INERTE sous zsh : écris les chemins en clair.
  ⚠ `git diff` est avalé par le hook RTK : utilise `rtk proxy git diff`.
- Tests : `./scripts/test-quiet.sh backend` pour le backend. Le scope `unit` est un **alias de
  backend seul** — il ne couvre PAS le frontend, malgré ce que disent certaines docs.
- Écris ton artefact dans `docs/memory/sprints/sprint-79/issue-475-done.md`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)
RETOUR :
- commits: [SHA1, ...]
- resume: <piste retenue + pourquoi les autres sont écartées + fichiers + chiffres>
- **le compte final, en chiffres** : N `register` par run vs seuil M → marge = M-N. Sans ces
  nombres, le critère d'acceptation n'est pas rempli.
- **prémisse de l'énoncé : CONFIRMÉE ou RÉFUTÉE**, avec la mesure qui tranche.
- [MEMORY:pitfall] / [MEMORY:decision] / [MEMORY:pattern] : **recopie ces signaux TELS QUELS dans
  le done.md**, pas seulement dans ton message de retour (ils sont perdus sinon — défaut constaté
  au S76 sur les 4 agents).
- recommandations suite: RECOMMAND_* ou "Pas de RECOMMAND_X car ..." (négation explicite exigée).
- STATUS: COMPLETED en dernière ligne du done.md (ou STATUS: PARTIAL + BLOQUE_SUR)
