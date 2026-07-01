[BRIEFING ISSUE #65]

## Issue
[FEATURE] Frontend : Dialogs de confirmation (desktop + mobile)

## Contexte
Actuellement, les boutons "Supprimer" (événement, produit, catégorie) agissent sans demander de confirmation, ce qui expose les utilisateurs à des pertes de données irréversibles. La suppression d'une catégorie avec des produits liés provoque en plus une violation FK côté backend si aucune réassignation n'est effectuée.

## À faire
Créer un composant `DeleteConfirmDialog` (ou `DeleteConfirmSheet` sur mobile) avec 3 variantes :

**Variante événement** :
- Message : "Supprimer cet événement ?"
- Si l'événement appartient à une série récurrente : warning "Cette action supprime uniquement cet événement, pas la série."
- Actions : Annuler / Supprimer

**Variante produit** :
- Message : "Supprimer ce produit ?"
- Actions : Annuler / Supprimer (archive via #50)

**Variante catégorie** :
- Message : "Supprimer cette catégorie ?"
- Si des produits référencent la catégorie : afficher un `<Select>` de réassignation obligatoire ("Déplacer les produits vers…") alimenté par `GET /api/categories` filtré (sans la catégorie à supprimer)
- Le bouton "Supprimer" est désactivé tant que la réassignation n'est pas choisie
- Actions : Annuler / Supprimer (+ réassigner)

**Layout** :
- Desktop : dialog modal centré
- Mobile : bottom sheet ancré en bas, boutons stackés verticalement, swipe-down pour annuler

## BR impactées
- BR-CAT-002 — Suppression d'une catégorie inexistante rejetée (le dialog gère aussi l'erreur 404 retournée par l'API)

## Critères d'acceptation
- [ ] Les 3 variantes (événement / produit / catégorie) sont implémentées
- [ ] La variante catégorie avec produits liés affiche le select de réassignation obligatoire
- [ ] Le bouton "Supprimer" de la variante catégorie est désactivé sans sélection de réassignation
- [ ] La variante événement affiche le warning série si applicable
- [ ] Le layout mobile est un bottom sheet avec boutons stackés et swipe-down
- [ ] Le dialog gère l'état `deleting` (spinner + désactivation des boutons)
- [ ] Une erreur API (404, 409) s'affiche inline dans le dialog

## Piste technique
- Nouveau fichier : `frontend/src/components/shared/DeleteConfirmDialog.tsx`
- Props : `variant: 'event' | 'product' | 'category'`, `onConfirm`, `onCancel`, `isRecurring?: boolean`, `linkedProductsCount?: number`
- Hook TanStack Query : `useCategories()` pour le select de réassignation (le créer s'il n'existe pas — `GET /api/categories`)
- Tokens Graphite (#45) pour les couleurs danger et les états désactivés
- Vérifier dans le registre composants si un `Dialog` ou `AlertDialog` de base existe déjà avant de créer

## Risques techniques
- Le select de réassignation doit filtrer la catégorie en cours de suppression : si l'utilisateur n'a qu'une seule catégorie, la suppression est impossible — afficher un message explicatif plutôt que bloquer silencieusement.

## Plan d'implementation (architect, /sprint plan)
```yaml
issue_0065:
  fichiers_cles:
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx  # nouveau"
  couches_touchees: ["frontend"]
  strategie_test: "unit (3 variantes, bouton desactive sans reassignation, etat deleting, erreur inline 404/409)"
  risque_regression: "Select reassignation vide si user n'a qu'une categorie -> message explicatif requis (pas blocage silencieux)."
  ordre_ecriture: "frontend — verifier registre composants (AlertDialog Radix existant ?) avant creation"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```

## Triage
Taille: S
Modele: opus
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

<!-- ===== br-categories.md ===== -->
# Context-pack domaine : `categories`

> Domaine : `categories` — référentiel de classification des produits (value object `id` + `name`), exposé en CRUD REST sans logique d'état métier.
> Acteurs principaux : `user` (tout utilisateur authentifié ROLE_USER). Aucun `admin` distinct n'existe pour ce domaine.

---

## 1. Lifecycles (machines à états)

### Entité : `Category`

CRUD simple — pas de lifecycle d'état.

`Category` est un value object pur (`id: UUID`, `name: String`, cf. `domain/models/Category.java`). Aucun champ de statut, pas de soft delete : `deleteCategory` appelle `deleteById` (suppression physique, cf. `CategoryServiceImpl:65`). Pas de transition d'état à modéliser.

---

## 2. Actions x Acteurs

| Action | `user` (ROLE_USER) | `admin` | `system` | Notes |
|---|---|---|---|---|
| Créer une catégorie (`POST /api/categories`) | ✅ | n/a | ❌ | Aucun garde admin — fallthrough `.anyRequest().authenticated()` (`SecurityConfig`) |
| Lister les catégories (`GET /api/categories`) | ✅ | n/a | ❌ | Retourne `List<Category>` brut |
| Lire une catégorie (`GET /api/categories/{id}`) | ✅ | n/a | ❌ | 404 si absente |
| Supprimer une catégorie (`DELETE /api/categories/{id}`) | ✅ | n/a | ❌ | Suppression physique, pas de soft delete |
| Modifier une catégorie (`PUT/PATCH`) | ❌ | ❌ | ❌ | ⚠️ Aucun endpoint exposé — `updateCategory` implémenté mais mort (cf. BR-CAT-006) |
| Utilisateur anonyme | ❌ | ❌ | ❌ | Bloqué par `.anyRequest().authenticated()` |

> Aucune distinction `ROLE_ADMIN` dans `SecurityConfig` pour `/api/categories/**` : tout utilisateur authentifié est l'unique acteur. Colonne `admin` = n/a.

---

## 3. Business Rules atomiques

### BR-CAT-001 — Nom de catégorie obligatoire (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le `name` d'une `Category` MUST NOT être null ou vide à la création.
**Pourquoi** : Une catégorie sans nom est inexploitable côté UI et côté classification produit.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Aucune annotation Bean Validation sur `Category.java` ni `CategoryEntity.java` (`name` sans `@NotBlank`, `@Column(nullable=false)`). La colonne `name` est nullable au niveau JPA. Aucun `@Valid` sur le `@RequestBody` du `CategoryController`.
**Test attendu** : `CategoryControllerTest` — `POST /api/categories` avec `name` vide/null doit renvoyer 400 (après ajout de `@NotBlank` + `@Valid`).

### BR-CAT-002 — Suppression d'une catégorie inexistante rejetée
**Règle** : Supprimer une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Éviter une suppression silencieuse no-op et signaler 404 au client.
**Implémentation** : `CategoryServiceImpl.deleteCategory:62` — `if (!existsById(id)) throw new CategoryNotFoundException(id)`. Le contrôleur double-check également (`CategoryController:48`), voir AP-CAT-04.
**Test attendu** : `CategoryServiceImplTest` — `deleteCategory(unknownId)` lève `CategoryNotFoundException` ; `CategoryControllerTest` — `DELETE /{id}` inconnu renvoie 404.

### BR-CAT-003 — Mise à jour d'une catégorie inexistante rejetée
**Règle** : Mettre à jour une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Empêcher un `save` de créer accidentellement une entité via un upsert sur un id fourni.
**Implémentation** : `CategoryServiceImpl.updateCategory:35` — `if (!existsById(category.getId())) throw`. ⚠️ Règle non atteignable via l'API : aucun endpoint n'expose `updateCategory` (cf. BR-CAT-006).
**Test attendu** : `CategoryServiceImplTest` — `updateCategory(categoryWithUnknownId)` lève `CategoryNotFoundException`.

### BR-CAT-004 — Unicité du nom de catégorie (⚠️ NON IMPLÉMENTÉ)
**Règle** : Deux catégories MUST NOT partager le même `name`.
**Pourquoi** : `findDomainCategoryByName` ne renvoie que le premier résultat ; des doublons rendent la résolution par nom non déterministe.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Pas de `@Column(unique=true)` sur `name` (`CategoryEntity:13`), pas de check d'unicité dans `CategoryServiceImpl.createCategory:28-29` avant `save`. `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` fait `getResultList()` et retourne `results.get(0)` silencieusement si plusieurs lignes partagent le nom.
**Test attendu** : `CategoryServiceImplTest` — créer deux catégories de même nom doit lever une exception métier (après ajout du check + contrainte UNIQUE).

### BR-CAT-005 — Catégorie requise et référençable côté produit
**Règle** : Un `Product` MUST référencer une `Category` existante via un `id` UUID valide ; la FK `category_id` est NOT NULL en base.
**Pourquoi** : `ProductEntity.category` est `@ManyToOne @JoinColumn(name='category_id', nullable=false)` — un produit sans catégorie est invalide au niveau DB.
**Implémentation** : Côté écriture, `productCreateSchema` (`frontend/src/types/product.ts:18`) valide `category: z.string().uuid('La catégorie est requise')` (format UUID uniquement, pas d'existence). Côté lecture, `productSchema` (`product.ts:7-10`) attend `category: { id, name }` sans `.uuid()`. ⚠️ Aucune validation backend que l'UUID correspond à une catégorie réelle au moment de la création produit.
**Test attendu** : test d'intégration produit — créer un produit avec `category` UUID inconnu doit échouer proprement (404/400), pas une violation FK brute.

### BR-CAT-006 — Endpoint de mise à jour absent (⚠️ NON IMPLÉMENTÉ)
**Règle** : La modification d'une catégorie via l'API MUST être possible (`PUT`/`PATCH /api/categories/{id}`).
**Pourquoi** : `CategoryServiceImpl.updateCategory:34-39` est entièrement implémenté mais aucun handler du `CategoryController` ne l'expose — méthode de service morte, mise à jour impossible via API.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ côté contrôleur. `CategoryController` n'a que `POST`, `GET`, `GET/{id}`, `DELETE/{id}`.
**Test attendu** : `CategoryControllerTest` — `PUT /api/categories/{id}` met à jour le `name` et renvoie 200 (après exposition de l'endpoint avec request/response DTO).

### BR-CAT-007 — Chargement dynamique des catégories côté UI (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le formulaire de création produit MUST charger les catégories depuis `GET /api/categories`, pas via des valeurs codées en dur.
**Pourquoi** : `AddProducts.tsx:172-184` contient 4 UUID de catégorie littéraux dans le JSX ; le formulaire casse dès que la base est seedée différemment selon l'environnement.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. `AddProducts.tsx` court-circuite `GET /api/categories`.
**Test attendu** : test de composant `AddProducts` — le select de catégorie est peuplé depuis un fetch mocké de `GET /api/categories`, sans UUID en dur.

---

## 4. Dépendances inter-domaines

- **`products` dépend de `categories`** : `CategoryEntity -> ProductEntity` en `OneToMany` (côté inverse), `ProductEntity.category` en `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. FK requise en base, mais **aucun cascade** côté `Category` : supprimer une catégorie référencée par des produits provoque une violation de contrainte FK (suppression physique non protégée — voir AP-CAT-05).
- **`categories` dépend de `auth`** : tout accès passe par le fallthrough `.anyRequest().authenticated()` (JWT ROLE_USER). **Depuis Sprint 10 (#52, ADR-002) : ownership PAR UTILISATEUR** — `Category.ownerId` (FK users, NULLABLE) ; `owner NULL` = catégorie « système » (lisible de tous, non modifiable/supprimable → 403). PATCH/DELETE exigent `owner_id == JWT` (403 sinon). Lecture scopée : `GET` liste ne renvoie que `owner == caller ∪ système`, `GET /{id}` d'autrui → 404 (anti-énumération), DTO `CategoryResponse` n'expose PAS l'`ownerId` (booléen `system`).
- **`Category` (domain model)** : value object pur `id` + `name`, sans champ de relation. Le lien vers les produits n'existe qu'au niveau infrastructure (`CategoryEntity`/`ProductEntity`).

---

## 5. Anti-patterns documentés

- **AP-CAT-01 — Injection de l'implémentation concrète** : `CategoryController:8,20` importe et injecte `CategoryServiceImpl` (couche application) au lieu du port `CategoryService` (domaine). Brise la règle hexagonale ; le contrôleur est couplé à l'implémentation.
- **AP-CAT-02 — Double injection du même champ** : `CategoryController:19-25` déclare `@Autowired` sur le champ ET un constructeur `@Autowired` pour `categoryService`. Comportement indéfini, Spring peut injecter deux fois. Garder une seule injection par constructeur.
- **AP-CAT-03 — Domaine exposé en couche HTTP** : `CategoryController:28` désérialise le `@RequestBody` directement vers `Category` (domain model) et `CategoryController:34` retourne `List<Category>` brut. Aucun request/response DTO — le modèle de domaine fuit vers les consommateurs de l'API. Introduire un `CategoryRequest`/`CategoryResponse`.
- **AP-CAT-04 — Double `existsById` (fenêtre de race + double requête)** : `CategoryController:48` vérifie `existsById` puis `CategoryServiceImpl.deleteCategory:62` re-vérifie. Double requête + fenêtre de race entre les deux checks. Laisser la décision 404 au service / `@ExceptionHandler` sur `CategoryNotFoundException`.
- **AP-CAT-05 — Suppression physique sans soft delete ni protection FK** : `deleteCategory` fait un `deleteById` physique (`CategoryServiceImpl:65`). Aucun soft delete, aucune vérification de produits référents — risque de violation FK ou d'orphelins. Contraire à la règle soft-delete du projet.
- **AP-CAT-06 — Champ `name` sans contrainte** : `CategoryEntity:13` n'a ni `@Column(nullable=false)`, ni `@Column(unique=true)`, ni `@NotBlank`. Colonne nullable et dupliquable malgré une sémantique « requis et unique ».
- **AP-CAT-07 — Création sans check de doublon** : `CategoryServiceImpl.createCategory:28-29` `save` sans vérifier l'existence d'un même nom — doublons silencieux (cf. BR-CAT-004).
- **AP-CAT-08 — Résolution par nom non déterministe** : `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` renvoie `results.get(0)` parmi plusieurs lignes possibles, sans contrainte UNIQUE garantissant l'unicité.
- **AP-CAT-09 — ~~Absence de garde admin~~ SUPERSEDÉ (Sprint 10, ADR-002)** : le référentiel global est remplacé par l'ownership par utilisateur (`owner_id == JWT` sur PATCH/DELETE). Voir la dépendance `auth` en §4.

> **MàJ Sprint 10 (#52 + review PR #153)** — anti-patterns RÉSOLUS : AP-CAT-01/02 (port `CategoryService` injecté), AP-CAT-03 (DTOs `CategoryRequest`/`CategoryResponse`), AP-CAT-04 (double `existsById` retiré), AP-CAT-05 (réassignation atomique `?reassignToCategoryId=` + garde self-target), AP-CAT-06/07 (`@NotBlank` + `UNIQUE(owner_id,name)` + check applicatif → 409), AP-CAT-08 (`findByOwnerAndName` + `setMaxResults(1)`). RESTENT ouverts : AP-CAT-10 (partiel), AP-CAT-11 (front, #61/S11).
- **AP-CAT-10 — Code mort** : `CategoryNotFoundException(String name):10` n'est jamais utilisé ; `CategoryServiceImpl.updateCategory` est implémenté mais non exposé par un endpoint (cf. BR-CAT-006).
- **AP-CAT-11 — UUID de catégories codés en dur dans le JSX** : `AddProducts.tsx:172-184` (4 UUID littéraux) court-circuite `GET /api/categories` (cf. BR-CAT-007).

---

## Référence

- Coverage actuelle : `coverage-categories.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` (`infrastructure/adapters/controllers/CategoryController.java`, `application/services/CategoryServiceImpl.java`, `infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java`, `infrastructure/entities/CategoryEntity.java`, `domain/models/Category.java`, `domain/exceptions/CategoryNotFoundException.java`)
- Frontend : `frontend/src/types/product.ts` (schémas Zod), `frontend/src/components/.../AddProducts.tsx` (formulaire de création produit)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dependances intra-sprint
- AUCUNE dépendance amont : tu es en Vague 1, tu livres le composant `DeleteConfirmDialog` que l'issue #61 (Drawer Produit, Vague 2) consommera ensuite.
- Ton composant DOIT être livré AVANT #61. Expose une API de props propre et stable (cf. Piste technique).
- Dépendance runtime : `GET /api/categories` (livré par S10 #52) pour le select de réassignation. Si le hook `useCategories` n'existe pas encore dans le repo, crée-le (TanStack Query, pattern PAT-S7-001 axios mock pour les tests).

## Designer
Non applicable — composant partagé suivant la charte existante (tokens Graphite danger + états désactivés). Réutilise les primitives Dialog/Sheet déjà présentes dans le repo si elles existent (vérifie `frontend/src/components/ui/`).

## Contraintes
- Branche cible : sprint/11 (déjà checkout — NE PAS changer de branche)
- Garde-fou : tu dois committer sur sprint/11. Vérifie `git branch --show-current` == sprint/11 avant de committer.
- Commit : 1 commit logique, gitmoji français (ex: `:sparkles: #65 DeleteConfirmDialog 3 variantes (event/product/category)`)
- Tests inline via `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE) — unit sur les 3 variantes, bouton désactivé sans réassignation, état deleting, erreur inline 404/409
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER
- Ne PAS toucher aux fichiers du domaine produit (`frontend/src/components/products/**`) — c'est le périmètre de #61 en Vague 2. Ton scope = `frontend/src/components/shared/` + hook `useCategories` si absent.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchees + fichiers cles + pitfalls + tests>
- [MEMORY:*] signaux: <liste si applicables>
- recommandations suite: <RECOMMAND_* ou pitfall subtil ; sinon "Pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
