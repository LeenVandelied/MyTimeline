[BRIEFING ISSUE #218 — Couverture E2E des parcours Produits & Catégories (Playwright)]

## Contexte worktree (garde-fou HEAD — LIRE EN PREMIER)
- Le repo de travail est `/Users/herrh/VSProjects/MyTimeline` (PAS le cwd par défaut si tu es lancé ailleurs).
- **PREMIÈRE ACTION** : `cd /Users/herrh/VSProjects/MyTimeline` puis `git branch --show-current` → DOIT afficher `sprint/28`. Sinon STOP et signale-le.
- Vague 2 : les Vagues 1 sont déjà mergées sur cette branche. En particulier :
  - #207 corrigé → `./scripts/test-quiet.sh e2e` lance désormais un VRAI run Playwright (`npm run test:e2e`).
  - #41 corrigé → un produit SANS événement est maintenant VISIBLE dans le listing (`events: []`). C'est exactement le cas à couvrir en E2E ci-dessous.

## Issue #218 — À faire
Le Sprint 22 (PR #217) a livré la page Produits (liste, détail, catégories) + le Drawer de gestion des catégories. Aucun test E2E ne couvre ces parcours. 46 `data-testid` ont été posés pour ça mais les specs n'existent pas.

Ajouter des specs Playwright dans `frontend/e2e/` couvrant :
- CRUD catégorie via le CategoryDrawer : création, édition, suppression — Y COMPRIS le cas de réassignation quand la catégorie supprimée a des produits liés.
- Navigation liste des produits ↔ vue détail d'un produit.
- Création et édition d'un produit via le ProductDrawer depuis la page Produits.

Réutiliser les `data-testid` DÉJÀ présents (préfixes `products-*`, `product-detail-*`, `categories-*`, `category-*`) — n'en introduis pas de nouveaux.

## Critères d'acceptation (7 scénarios)
- [ ] Création d'une catégorie via le drawer → apparition dans la liste.
- [ ] Édition d'une catégorie existante via le drawer.
- [ ] Suppression d'une catégorie SANS produits liés.
- [ ] Suppression d'une catégorie AVEC produits liés, incluant le flux de réassignation.
- [ ] Navigation liste → détail produit et retour.
- [ ] Création d'un produit via le ProductDrawer depuis la page Produits.
- [ ] Édition d'un produit existant via le ProductDrawer.
- [ ] (transverse) Les nouveaux tests passent via `./scripts/test-quiet.sh e2e`.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0218:
  fichiers_cles:
    - "frontend/e2e/products.spec.ts (à créer)"
    - "frontend/e2e/categories.spec.ts (à créer)"
    - "frontend/e2e/support/"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (Playwright: CRUD produit, CRUD catégorie, assignation produit->catégorie, produit sans event visible)"
  risque_regression: |
    dépend de auth.setup.ts + seeding catégorie déjà établi (golden-path.spec.ts:99).
    Réutiliser le pattern seed via page.request.post.
  ordre_ecriture: "frontend (specs Playwright APRÈS #207 corrigé — c'est fait)"
  etat_reel_du_code: |
    MISSING. frontend/e2e/ a golden-path + settings-*. golden-path couvre création produit+event
    mais PAS le CRUD produit/catégorie complet. Aucun products.spec.ts / categories.spec.ts.
```

## Points d'appui concrets (À LIRE avant d'écrire les specs)
- `frontend/e2e/golden-path.spec.ts` — pattern de référence : auth via `auth.setup.ts`, seed via `page.request.post`, structure d'un parcours produit+event. Copie le style.
- `frontend/e2e/support/` et `frontend/e2e/auth.setup.ts` — helpers d'authentification et fixtures à réutiliser (NE réinvente pas l'auth).
- `frontend/e2e/global-setup.ts` — setup global.
- `docs/memory/audits/sprint-22-test-coverage.md` §"Suivi E2E" — périmètre non couvert détaillé (référence issue).
- Composants concernés : `frontend/src/components/products/ProductsListView.tsx`, page détail produit, `CategoryDrawer`, `ProductDrawer`. Grep les `data-testid` réels dans ces fichiers AVANT d'écrire les sélecteurs (ne devine pas les noms).

## Triage
Taille: M
Modèle: opus
Effort: high

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
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré mais `frontend/e2e/` = `.gitkeep` VIDE → aucun E2E réel. Storybook 8 présent.

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
- ⚠ `frontend/e2e/` VIDE : `npm run test:e2e` sort 0 sans spec. Aucun parcours E2E couvert — ne pas présumer de garde-fou Playwright.

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

<!-- ===== br-products.md ===== -->
# Context-pack domaine : `products`

> Domaine : `products` — gestion des produits possédés par un utilisateur, chacun rattaché à une catégorie et agrégeant une liste d'événements (création groupée produit + événements).
> Acteurs principaux : Utilisateur authentifié (self-service uniquement, JWT cookie). Système (résolution Category/User, calcul des dates d'événements). Aucun rôle Admin n'existe dans le code.

---

## 1. Lifecycles (machines à états)

**Product** — soft delete depuis Sprint 10 (#50). Champ `archived` (booléen, défaut `false`, ajouté V7/#44) sur `ProductEntity` + `@SQLRestriction("archived = false")` sur l'entité → les produits archivés sont invisibles de TOUTES les lectures Hibernate (listings produits ET join-fetch events).

| Etat | Description | Transitions sortantes |
| --- | --- | --- |
| (Created) | Produit créé via `POST`, événements créés en cascade | modifiable via `PATCH` ; -> (Archived) via `DELETE` |
| (Archived) | Soft delete : `archived = true`, `DELETE` retourne **204**. Invisible partout via `@SQLRestriction` | définitif pour cette wave (pas d'endpoint de restauration) |

✅ Soft delete implémenté S10 (#50). Historique (avant S10) : suppression PHYSIQUE (`deleteById`) — corrigé.

**Event** (entité agrégée) — pas de lifecycle propre côté `products` ; cycle de vie piloté par le produit (`cascade=ALL`, `orphanRemoval=true`).

---

## 2. Actions x Acteurs

| Action | user (authentifié) | admin | system | Notes |
| --- | --- | --- | --- | --- |
| `POST` créer produit + events | ✅ self uniquement | ❌ inexistant | ⚠️ résout Category & User, calcule end dates | userId body ignoré (écrasé par path). Catégorie cible validée par ownership (S10, cf. BR-PRO-010) |
| `GET` lister produits (avec events) | ✅ self uniquement | ❌ | ⚠️ filtre user in-memory (perf) ; archived filtrés en SQL (`@SQLRestriction`) | accepte cookie JWT **OU** header Bearer (incohérent) |
| `GET` produit par id | ✅ self uniquement | ❌ | — | 404 si absent/archivé |
| `PATCH` produit (S10 #50) | ✅ self uniquement | ❌ | — | maj partielle nom/catégorie. 200/400/404/403. Catégorie cible validée (BR-PRO-010) |
| `DELETE` produit | ✅ self uniquement | ❌ | — | soft delete `archived=true`, retourne **204** (S10 #50) |
| `GET` events d'un produit | ✅ self uniquement | ❌ | — | ⚠️ 404 si liste vide (sémantique erronée) |

⚠️ Contrôle d'ownership fait **manuellement** dans le controller (extraction username depuis JWT cookie -> load User -> compare `user.getId()` au path `{userId}`), sans `@PreAuthorize` ni Spring Security method security.

---

## 3. Business Rules atomiques

### BR-PRO-001 — Nom de produit obligatoire et borné
**Règle** : un utilisateur MUST fournir un `name` non vide, longueur 1..100, à la création d'un produit.
**Pourquoi** : intégrité des données, un produit anonyme n'a pas de sens métier.
**Implémentation** : création = `ProductCreationRequest.name` (`@NotBlank` + `@Size(min=1, max=100)`). Update (S10) = `ProductUpdateRequest.name` nullable pour patch partiel : `@Size(min=1,max=100)` + `@Pattern(".*\\S.*")` (le `@Pattern` skip null mais rejette `" "` blanc — un `@NotBlank` casserait le patch partiel). Front : `productCreateSchema.name = z.string().min(3)`.
**Test attendu** : `ProductControllerTest#createProduct_rejectsBlankName`, `#createProduct_rejectsNameOver100`, `#patchProduct_blankName_returns400`.
**⚠️ DESYNC** : Zod impose `min(3)`, backend impose `min(1)` — noms de 1-2 caractères acceptés backend mais refusés front. Voir `.claude/rules-jit/zod-dto-sync.md`.
**⚠️ Entité non protégée** : `ProductEntity.name` sans `@Column(nullable=false)` ni Bean Validation — un nom NULL peut être persisté si le DTO est contourné.

### BR-PRO-002 — Catégorie obligatoire et existante
**Règle** : un utilisateur MUST fournir un `category` (UUID) correspondant à une catégorie existante.
**Pourquoi** : tout produit appartient à une catégorie (FK `category_id NOT NULL`).
**Implémentation** : `ProductCreationRequest.category` — `@NotNull`. `createProduct` résout la catégorie et lève `CategoryNotFoundException` si absente. Entité : `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. Front : `z.string().uuid()`.
**Test attendu** : `ProductServiceImplTest#createProduct_throwsWhenCategoryMissing`, `ProductControllerTest#createProduct_rejectsNullCategory`.

### BR-PRO-003 — Utilisateur cible obligatoire et existant
**Règle** : la création MUST cibler un User existant ; `createProduct` lève `UserNotFoundException` si absent.
**Pourquoi** : un produit appartient à un utilisateur.
**Implémentation** : `ProductCreationRequest.userId` — `@NotNull` ; `createProduct` résout le User.
**Test attendu** : `ProductServiceImplTest#createProduct_throwsWhenUserMissing`.
**⚠️ Contrainte DB manquante** : `ProductEntity.user` -> `@JoinColumn(name='user_id')` SANS `nullable=false` — `user_id` peut être NULL en base, produit orphelin possible.
**⚠️ Front incomplet** : `productSchema` (lecture) n'expose PAS le champ `user` (seulement `id, name, category, events`).

### BR-PRO-004 — Le userId du path fait autorité (anti-IDOR partiel)
**Règle** : l'`userId` du body MUST être ignoré ; le `{userId}` du path écrase le body et MUST correspondre au subject du JWT.
**Pourquoi** : empêcher un utilisateur de créer un produit pour le compte d'un autre via le body.
**Implémentation** : `ProductController.createProduct` écrase `request.userId` avec le path variable, puis compare `user.getId()` (extrait du cookie JWT) au `{userId}`.
**Test attendu** : `ProductControllerTest#createProduct_ignoresBodyUserId`, `#createProduct_rejectsMismatchedPathUser`.
**⚠️ Sécurité manuelle** : pas de `@PreAuthorize` ni Spring Security ; autorisation dispersée dans le controller, fragile et non centralisée.

### BR-PRO-005 — Liste d'événements à la création (NPE non gardé)
**Règle** : un utilisateur PEUT fournir une liste d'`events` ; chaque event sans date reçoit `LocalDate.now()` comme `startDate`, et `endDate` est calculée via `Utils.calculateEndDate()`.
**Pourquoi** : création groupée produit + événements en une transaction.
**Implémentation** : `ProductServiceImpl.createProduct` itère `request.getEvents().forEach(...)`.
**Test attendu** : `ProductServiceImplTest#createProduct_defaultsEventStartDateToToday`, `#createProduct_handlesNullEventsList`.
**⚠️ NON GARDÉ (bug)** : `getEvents()` peut être `null` (`@NotNull`/`@NotEmpty` absents sur le DTO ; Zod `z.array(...)` sans `.min(1)`). Le `forEach` lève un `NullPointerException` si la liste est nulle. -> ajouter null guard ou `@NotNull` sur le DTO.

### BR-PRO-006 — Listing des produits filtré par utilisateur
**Règle** : `GET /products` MUST ne retourner que les produits de l'utilisateur du path possédant au moins un event.
**Pourquoi** : isolation des données par utilisateur.
**Implémentation** : `ProductServiceImpl.getProductsWithEvents` charge `findAllProducts()` puis filtre en mémoire par `userId` et `hasEvents()`.
**Test attendu** : `ProductServiceImplTest#getProductsWithEvents_filtersByUserAndHasEvents`.
**⚠️ PERF (anti-pattern)** : aucun filtre SQL `WHERE user_id = ?` — scan complet de la table puis filtre Java (O(N)). Ne passe pas à l'échelle. -> requête JPQL/Panache avec filtre DB.

### BR-PRO-007 — Soft delete (archive) conditionné à l'existence ✅ (S10 #50)
**Règle** : `DELETE` MUST vérifier l'existence (`orElseThrow(ProductNotFoundException)`) puis positionner `archived = true` (soft delete, PAS de suppression physique) ; retourne **204**.
**Pourquoi** : réversibilité + convention projet soft-delete ; retour d'erreur explicite si absent.
**Implémentation** : `ProductServiceImpl.archiveById` (ex-`deleteById`) + `@SQLRestriction("archived = false")` sur `ProductEntity` (invisibilité globale). Ownership vérifié en amont (BR-PRO-004).
**Test attendu** : `ProductServiceImplTest`, `ProductControllerOwnershipTest`, `ProductArchivedFilterIntegrationTest` (archived invisible partout).
**⚠️ Pitfall JPA (PIT-S10-003)** : l'update-in-place charge l'entité gérée et recopie les champs (le domaine sans `@Version` casse un `save(mapper.toEntity(domain))` détaché).

### BR-PRO-009 — Mise à jour partielle produit (PATCH) ✅ (S10 #50)
**Règle** : `PATCH /users/{userId}/products/{productId}` met à jour nom et/ou catégorie (partiel). 200 / 400 (nom vide/>100, BR-PRO-001) / 404 (absent ou pas au user) / 403 (ownership path≠JWT).
**Implémentation** : `ProductUpdateRequest` (name/categoryId nullable), `ProductServiceImpl.updateProduct` (update-in-place de l'entité gérée). Ownership path==JWT (BR-PRO-004).
**Test attendu** : `ProductControllerOwnershipTest#patchProduct_*`.

### BR-PRO-010 — Catégorie cible d'un produit : ownership validé (anti cross-tenant) ✅ (S10 #50 review)
**Règle** : à la création ET à l'update d'un produit, la catégorie cible (`categoryId`) n'est assignable QUE si elle appartient à l'appelant (`ownerId == caller`) OU est système (`ownerId == null`). Sinon → `CategoryNotFoundException` (**404**, pas 403 : anti-énumération d'UUID d'autrui).
**Pourquoi** : sans ce check, un user rattache son produit à la catégorie d'un autre (linkage cross-tenant) + oracle 404/200 pour énumérer les catégories d'autrui.
**Implémentation** : helper `ProductServiceImpl.resolveAssignableCategory(categoryId, callerId)` (callerId = `user.getId()` en create, `product.getUser().getId()` en update). Voir [[PIT-S10-005]].
**Test attendu** : `ProductServiceImplTest` (create/update vers catégorie d'autrui → 404 ; système/propre → OK).

### BR-PRO-008 — Sémantique 404 sur collection d'events vide (NON CONFORME)
**Règle attendue** : `GET /products/{productId}/events` DEVRAIT retourner `200` avec une liste (éventuellement vide).
**Implémentation actuelle** : retourne `404` quand la liste d'events est vide — confond "ressource introuvable" et "collection vide".
**Pourquoi** : un produit existant sans event est un état valide, pas une absence de ressource.
**Test attendu** : `ProductControllerTest#getEvents_returns200EmptyListWhenNoEvents` (rouge tant que le bug n'est pas corrigé).
**Statut** : ⚠️ NON CONFORME — à corriger.

---

## 4. Dépendances inter-domaines

- **`products` -> `categories`** : `Product` `@ManyToOne Category`, FK `category_id NOT NULL`. Création échoue (`CategoryNotFoundException`) si la catégorie n'existe pas.
- **`products` -> `users`** : `Product` `@ManyToOne User`, FK `user_id` nullable (⚠️ pas de `nullable=false`). Ownership et autorisation reposent sur `User`.
- **`products` -> `events`** : `Product` `@OneToMany Event` (`cascade=ALL`, `orphanRemoval=true`, `mappedBy='product'`). Le domaine `products` crée/supprime les events en cascade ; leur cycle de vie est piloté par le produit.
- **Couplage hexagonal inversé (anti-pattern)** : `domain/ports/services/ProductService` importe le DTO applicatif `ProductCreationRequest` — le domaine dépend de la couche application (cf. §5).

---

## 5. Anti-patterns documentés

1. ~~**Fuite du modèle de domaine**~~ ✅ RÉSOLU (S10, absorb PR #153) : `ProductController` renvoie désormais `ProductResponse`/`EventResponse` (catégorie réduite à `{id,name}`), l'objet `User`/owner n'est plus exposé.
2. **Dépendance hexagonale inversée** : `ProductService` (port domaine) importe `ProductCreationRequest` (DTO application).
3. **Annotation infra dans le domaine** : `ProductRepository` (port domaine) annoté `@Repository` (Spring).
4. **Couplage aux implémentations** : `ProductController` injecte `ProductServiceImpl`, `EventServiceImpl`, `UserServiceImpl` au lieu des interfaces de port.
5. **Full table scan** : `getProductsWithEvents` charge toute la table puis filtre par `userId` en Java (cf. BR-PRO-006).
6. **NPE non gardé** : `createProduct` appelle `request.getEvents().forEach()` sans null check (cf. BR-PRO-005).
7. **UUID hard-codés au front** : le sélecteur de catégorie embarque des UUID en dur (`7446a49c...`, `dbc134fb...`) — casse à tout changement DB. -> charger les catégories via API.
8. **Desync Zod/DTO** : `name` Zod `min(3)` vs backend `@Size(min=1)` (cf. BR-PRO-001).
9. **Codes HTTP** : ~~`DELETE` renvoie 200~~ ✅ RÉSOLU S10 (204 + soft delete) ; RESTE : events vides renvoient 404 (cf. BR-PRO-008, non traité).
10. **Annotation Jackson sur entité de persistance** : `@JsonManagedReference` sur `ProductEntity.events` — concern présentation sur entité infra.
11. **`@Valid` manquant** : pas de `@Valid` visible sur le `@RequestBody` de `ProductController` — la Bean Validation de `ProductCreationRequest` peut ne pas être déclenchée.
12. **Authentification incohérente** : `getProducts` accepte cookie JWT **ou** header Bearer ; les autres endpoints sont cookie-only.
13. **Autorisation manuelle** : extraction/validation JWT et comparaison d'ownership codées à la main dans le controller, sans `@PreAuthorize`.

> **MàJ Sprint 11 (#61, PR #157)** — anti-patterns front RÉSOLUS : #7 (UUID catégories hardcodés → combobox câblée sur `GET /api/categories` via `useCategories`, `AddProducts.tsx` supprimé au profit de `ProductDrawer.tsx`), #8 (desync Zod `name` → `productCreateSchema.name` aligné `min(1).max(100)` sur `@Size` backend). Désync jumelle corrigée : `eventCreationSchema.name` était resté `min(3)` alors que `EventCreationRequest @Size(min=1,max=100)` → aligné `min(1).max(100)` (cf. [[PIT-S11-003]]).

### Couleur produit persistée ✅ (S12 #158 — ex-limitation S11 #61)
Le produit porte désormais un `color` propre persisté : `ProductCreationRequest.color` (hex `#RRGGBB`, nullable = héritage catégorie), `ProductUpdateRequest.color` + `clearColor` (reset explicite car `color=null` = inchangé en PATCH partiel, cf. [[PAT-S12-002]]), `ProductResponse` expose `color` produit + `category.color` (le front calcule l'effective `product.color ?? product.category.color`). Colonne `products.color` préexistante (V7/#44) → AUCUNE migration S12 (cf. [[DEC-S12-002]]). `ProductEntity.color`/`Product.color` déjà présents (S9/S10). Front `ProductDrawer` : surcharge persistée (plus UI-only), schémas Zod read `.nullable()` / create `.optional()` / update `color + clearColor`.

---

## Référence

- Coverage actuelle : `coverage-products.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` — `domain/ports/services/ProductService.java`, `domain/ports/repositories/ProductRepository.java`, `application/.../ProductServiceImpl.java` (`resolveAssignableCategory`, `updateProduct`, `archiveById`), `infrastructure/.../ProductEntity.java` (`@SQLRestriction`), `infrastructure/.../ProductController.java`, DTOs `ProductCreationRequest` / `ProductUpdateRequest` / `ProductResponse` / `EventResponse` (S10)
- Conventions transverses backend : voir `cp-backend.md` §Conventions MyTimeline (DTO en HTTP, ownership cible + 404, update-in-place JPA, DataIntegrity→409 scopé)
- Frontend : `frontend/src/components/products/` — sélecteur de catégorie + schémas Zod `productCreateSchema` / `productSchema` (`eventCreationSchema` réutilisé)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- Vague 1 (#207, #133, #41, #124) déjà livrée sur `sprint/28`. Le scope `e2e` de test-quiet.sh fonctionne (Playwright réel). Un produit sans event est visible → tu peux l'asserter.
- Aucun autre agent ne tourne en parallèle sur `frontend/e2e/`. Tu es seul sur ce périmètre.

## Designer
Non applicable (tests E2E, aucun composant UI nouveau — tu réutilises les `data-testid` existants).

## Contraintes
- Repo : `/Users/herrh/VSProjects/MyTimeline` — Branche cible : `sprint/28` (déjà checkout). Vérifie `git branch --show-current` avant tout commit.
- **Réutilise les `data-testid` EXISTANTS** (préfixes `products-*`, `product-detail-*`, `categories-*`, `category-*`). N'en ajoute pas de nouveaux dans le code source. Si un testid manque pour un scénario, note-le en RECOMMAND_FOLLOWUP plutôt que d'instrumenter à la va-vite (mais vérifie d'abord par grep qu'il n'existe pas déjà).
- **Flux de réassignation (BR sensible)** : la suppression d'une catégorie AVEC produits liés déclenche un flux de réassignation. NE SUPPOSE PAS le comportement de l'API : lis le vrai code (`CategoryDrawer`, service/hook catégories, endpoint backend) et assert le comportement RÉEL. Documente ce que fait l'API si ce n'est pas trivial.
- **Seeding** : réutilise le pattern `page.request.post` de `golden-path.spec.ts` pour créer l'état (user/produits/catégories) plutôt que de tout piloter à la souris. Auth via `auth.setup.ts`.
- **Exécution** : lance `./scripts/test-quiet.sh e2e` pour valider tes specs. Playwright a besoin du backend + du serveur dev frontend up. Si cet environnement full-stack n'est PAS disponible dans ton contexte, NE fabrique PAS un faux vert : vérifie au minimum que les specs sont syntaxiquement valides (`npx playwright test --list` pour lister les tests sans les exécuter) et documente honnêtement dans le done.md quels scénarios ont été réellement exécutés vs seulement écrits/listés.
- Ne PAS toucher : `backend/**`, `scripts/`, `.github/`, ni la logique applicative `frontend/src/**` (hors ajout éventuel — à éviter — d'un testid manquant clairement justifié).

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-28/issue-218-done.md` avec :
- commits: [SHA1, ...]
- resume: <specs créées (products.spec.ts / categories.spec.ts) + scénarios couverts (mapper aux 7 critères) + data-testid réutilisés + comportement réel de l'API de réassignation>
- tests: <ce que tu as réellement lancé (`test-quiet.sh e2e` full run ? `playwright test --list` ?) + résultat honnête : combien de scénarios exécutés vs seulement écrits>
- [MEMORY:*] signaux: <si applicable>
- recommandations suite: <RECOMMAND_* explicites ou "Pas de RECOMMAND_X car ..." ; ex RECOMMAND_FOLLOWUP si un testid manque>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué).
