[BRIEFING ISSUE #463 — Sprint 79, vague 2]

## Issue
**[CHORE] Le compte `PROD` partagé rend les specs E2E dépendantes de l'ordre**

Pour éviter de recréer un compte à chaque test (ce qui déclencherait une limite anti-abus), la suite
E2E réutilise un compte fixe partagé (`PROD`) entre plusieurs fichiers de tests. Le problème :
l'état laissé par un test (un événement créé, une catégorie ajoutée) reste visible pour les tests
suivants qui utilisent le même compte. Un test peut donc **dépendre silencieusement d'un état créé
par un autre test exécuté avant lui dans le même fichier** — et échouer uniquement quand l'ordre
change, ou passer un test à la fois sur deux.

C'est ce mécanisme qui rend le défaut de #451 (frise qui se vide au zoom arrière) intermittent : il
ne se manifeste que si un événement récurrent créé par un test antérieur du même fichier est encore
présent. Un test qui passe **en isolation** mais échoue **en suite complète** est un des pièges de
diagnostic les plus coûteux en temps.

### Critères d'acceptation
- [ ] La liste exhaustive des specs utilisant `PROD` est établie et documentée.
- [ ] Une stratégie d'isolation est choisie et **actée** (compte dédié par fichier, nettoyage
      post-test, ou espace de noms garanti unique) — à trancher avant implémentation.
- [ ] Après correctif, une spec connue pour être sensible à l'ordre (ex. celle liée à #451) passe
      **de façon identique en isolation et en suite complète**, sur plusieurs exécutions.

## INVENTAIRE — déjà MESURÉ par le lead, ne le refais pas
L'énoncé cite 4 specs « et probablement d'autres ». La mesure (`grep -rl PROD frontend/e2e/*.ts`)
en donne **16**, soit 4× l'estimation de l'issue. Voici la liste avec le nombre de blocs `test(`
par fichier — c'est ta charge de migration réelle :

```
timeline.spec.ts                            29 tests   <-- le gros morceau
timeline-mobile.spec.ts                     15 tests
sprint-61-archived-events.spec.ts            6 tests
sprint-62-select-focus-indicator.spec.ts     5 tests
sprint-63-de-overflow-audit.spec.ts          5 tests
categories.spec.ts                           4 tests
sprint-73-model-vs-rendered.spec.ts          4 tests
products.spec.ts                             3 tests
sprint-42-events.spec.ts                     3 tests
sprint-62-control-focus-contrast.spec.ts     3 tests
sprint-66-mobile-create-event.spec.ts        3 tests
sprint-66-mobile-keyboard.spec.ts            3 tests
sprint-70-preview-visual.spec.ts             2 tests
golden-path.spec.ts                          1 test
sprint-70-create-preview-pinned.spec.ts      1 test
sprint-71-edit-preview-pinned.spec.ts        1 test
```
(~88 blocs `test(` au total — compte par grep, heuristique : vérifie les `test.describe` imbriqués.)

## L'ARGUMENT DÉCISIF, et il n'est PAS dans l'énoncé
L'issue propose trois stratégies. **« Un compte dédié par fichier de test » ne corrige pas le défaut
que l'issue décrit.** Relis sa formulation : le test dépend d'un état créé par un autre test
**dans le même fichier**. Des comptes par fichier laissent cette dépendance intacte — 29 tests
continueraient de se marcher dessus dans `timeline.spec.ts`. Ça déplace la frontière du problème
sans le résoudre.

Il te reste donc deux stratégies viables : **espace de noms unique par test** sur les entités créées,
ou **nettoyage systématique post-test**. Tranche entre les deux avec un argument, et écris-le.

## Le garde-fou budget livré ce sprint par #475 — tu vas le heurter si tu multiplies les comptes
#475 (vague 1, déjà mergée dans la branche) a livré :
- `backend/src/main/resources/application-e2e.properties` → `app.rate-limit.register-per-minute=20`
  (le défaut 5 reste inchangé partout ailleurs) ;
- un **test frontend qui recompte le budget depuis les sources** (comptes de `ALL_ACCOUNTS` + specs
  qui s'inscrivent) et **rougit** si le budget ne tient plus sous le plafond `e2e`.

Conséquences pour toi :
1. La contrainte anti-abus que l'énoncé de #463 invoque (« multiplier les comptes se heurte à
   5/min/IP ») **a bougé** : le plafond `e2e` est à 20. Ce n'est donc plus l'argument qui écarte les
   comptes par fichier — c'est l'argument du paragraphe précédent (ça ne corrige pas le défaut).
2. Mais si tu ajoutes malgré tout des comptes à `ALL_ACCOUNTS`, **ce test de #475 rougira** dès que
   le compte dépassera le plafond. Ne le désarme pas, ne le « mets pas à jour » pour le faire
   passer : s'il rougit, c'est qu'il fait son travail.
3. **Découverte de vague 1, à connaître** : le job CI `e2e` pose `RATE_LIMIT_ENABLED: false`
   (`.github/workflows/ci.yml:294`) qui court-circuite le filtre **entier**. Aucun plafond n'est en
   vigueur pendant un run E2E aujourd'hui. Donc : ne conclus rien d'un 429 absent, et n'invoque pas
   le rate-limit pour justifier un choix de conception — il ne s'applique pas pendant tes runs.

## Plan d'implémentation (architect, /sprint plan — amendé par le lead ci-dessus)
```yaml
issue_463:
  fichiers_cles:
    - "frontend/e2e/support/accounts.ts:308  (PROD)"
    - "16 specs consommatrices — liste mesurée ci-dessus"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — run complet PLUS un run en ordre inversé, sinon la correction n'est pas prouvée"
  risque_regression: "Un compte par fichier multiplierait les register par 16 ET ne corrigerait pas la dépendance intra-fichier. Piste viable = namespacing par test ou nettoyage post-test."
  ordre_ecriture: "inventaire (fait) → stratégie → accounts.ts/support → migration des 16 specs → 2 runs (nominal + inversé)"
  zod_dto_sync: "NON"
  possibly_done: false
```

**NE PAS CONFONDRE AVEC #469 (S65).** Celle-là a résolu la course d'**identité** entre workers
(graine `E2E_RUN_ID` posée par `global-setup.ts`). #463 porte sur l'état **métier** laissé en base
par un test pour le suivant. Problèmes voisins, causes différentes — si tu te retrouves à toucher
la graine, tu as dérivé sur la mauvaise issue.

## Triage
Taille: M
Modèle: opus
Effort: xhigh

## Context-pack domaine (lire EN PRIORITE avant tout code)

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

<!-- ===== packs volumineux NON inlinés — à ouvrir toi-même si besoin ===== -->
Les packs suivants font 87 à 296 Ko : ils ne tiennent pas dans un prompt. Ouvre-les AVEC
`Read`/`grep` depuis le worktree si tu en as besoin, et **cite dans ton done.md la ligne
`fichiers de contexte lus : ...`** pour que ce soit auditable :
- `.ai-env/context-packs/pit-frontend.md` (143 Ko) — pièges frontend/E2E. Entrées pertinentes :
  grep `PIT-S61-007` (turbopack en worktree), `PIT-S73-008`, `PIT-S62-009` (stack E2E partagée),
  `PIT-S47-004` (graine non propagée), `PIT-S57-003` (curl sans `Origin`).
- `.ai-env/context-packs/br-events.md` (28 Ko) — BR events : ce que tes specs assertent réellement
  (récurrences, archivage). Utile pour décider ce qu'un nettoyage post-test doit purger.
- `frontend/playwright.config.ts` — commentaires #427/#465/#469/#470, la source la plus fiable du
  dépôt sur le harnais E2E (dont l'épisode des deux runs concurrents).
- `frontend/e2e/support/accounts.ts` — en-tête L11-19 : l'avertissement « ne pas ajouter de compte
  sans recompter » est là, et #475 vient d'y adosser un test.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- **Tu es SEUL sur cette vague et tu détiens l'exclusivité Playwright.** `playwright.config.ts` pose
  un verrou de run (`e2e/support/run-lock.ts`) : un seul run par worktree, `e2e/.auth/` étant
  partagé. Ne lance jamais deux runs simultanés toi-même — deux runs concurrents se
  réauthentifient mutuellement et produisent une signature d'échec qui **imite** `PIT-S47-004`
  (`Expected sh710... / Received sh723...`) sans en être un ; le commentaire de
  `playwright.config.ts` raconte cet épisode en détail, lis-le avant de diagnostiquer quoi que ce
  soit de ce genre.
- La vague 1 est livrée et **présente sur ta branche** : #428 (`3a4d442`, CORS dev) et #475
  (`e9c71d8`, plafond `e2e` + garde budget). Ne les défais pas.

## Ce que ta preuve doit être (le critère d'acceptation est explicite là-dessus)
**Deux runs, pas un.** Un run nominal vert ne prouve rien sur une dépendance à l'ordre — c'est
exactement la configuration dans laquelle le défaut se cache. Il te faut :
1. un **run complet nominal** ;
2. un **run complet en ordre inversé** (ou tout autre permutation qui casse l'ordre actuel) ;
3. et la démonstration que la spec sensible à l'ordre (celle liée à #451) se comporte **de façon
   identique** en isolation et en suite.

⚠ **Attention au piège de méthode du S73** : rejouer une spec « en isolation » retire souvent la
spec **polluante**, pas la charge — un vert en isolation ne prouve donc pas que le test était flaky.
Formule ce que ton run isolé retire réellement avant d'en tirer une conclusion.
⚠ **Vérifie l'arithmétique de ta fixture avant d'accuser le code** sur un E2E rouge (S51) : plus
d'une fois le défaut était dans les données du test.

## Recette E2E locale (elle est PRÉCISE, ne l'improvise pas)
Quatre agents de sprints antérieurs ont conclu « E2E impossible en local ». C'est faux, et la
recette est dans `frontend/playwright.config.ts` :
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
Repères de durée mesurés au S65 sur cette machine : **~3-4 min** par run complet à `workers: 2`
(232 tests). Si tu pars sur 9 min, quelque chose ne va pas.
⚠ Un `curl` qui réussit ne disculpe PAS le CORS : il n'envoie pas d'en-tête `Origin`
(`PIT-S57-003`). Un 403 CORS est rapporté par `auth.setup.ts` comme « rate-limit probable » — ce
faux diagnostic a coûté trois sprints. Lis les statuts instrumentés par le fixture avant toute
hypothèse.

## Designer
Non applicable.

## Contraintes
- Répertoire de travail : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`.
  **`cd` explicite en tout premier**, puis vérifie `git rev-parse --abbrev-ref HEAD` →
  doit rendre `claude/sprint-79-start-c6dc55`. Si tu vois autre chose, ARRÊTE et signale-le.
- Branche cible : `claude/sprint-79-start-c6dc55` (déjà checkout, ne change pas de branche).
- Commit : **1 commit logique**, message gitmoji en français.
  **`git add` en pathspec CIBLÉE, jamais `-A` ni `.`**.
  ⚠ `git add -- $F` avec une variable est INERTE sous zsh : écris les chemins en clair.
  ⚠ `git diff` est avalé par le hook RTK : utilise `rtk proxy git diff`.
- Le dépôt applique un **`format:check` bloquant en CI** depuis le S78 (prettier). Une migration de
  16 specs est exactement le genre de diff qui le fait rougir : passe le formateur avant de commiter.
- Tests unitaires frontend : `./scripts/test-quiet.sh` (le scope `unit` est un **alias de backend
  seul**, il ne couvre PAS le frontend malgré ce que disent certaines docs).
- Écris ton artefact dans `docs/memory/sprints/sprint-79/issue-463-done.md`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)
RETOUR :
- commits: [SHA1, ...]
- **stratégie retenue + pourquoi les deux autres sont écartées** (une phrase chacune)
- **les deux runs, en chiffres** : run nominal `N passed / M failed`, run inversé
  `N passed / M failed`, durées. Sans les deux, le critère d'acceptation n'est pas rempli — dis-le
  plutôt que de le maquiller.
- **prémisse de l'énoncé : CONFIRMÉE ou RÉFUTÉE**, avec la mesure qui tranche. (Les deux issues de
  la vague 1 ont vu leur prémisse RÉFUTÉE par la mesure — ne présume pas que la tienne tient.)
- [MEMORY:pitfall] / [MEMORY:decision] / [MEMORY:pattern] : **recopie ces signaux TELS QUELS dans
  le done.md**, pas seulement dans ton message de retour.
- **ce que tu n'as PAS vérifié**, explicitement.
- recommandations suite: RECOMMAND_* ou "Pas de RECOMMAND_X car ..." (négation explicite exigée).
- STATUS: COMPLETED en dernière ligne du done.md (ou STATUS: PARTIAL + BLOQUE_SUR)
