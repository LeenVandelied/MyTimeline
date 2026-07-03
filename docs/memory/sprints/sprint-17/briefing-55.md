[BRIEFING ISSUE #55]

## Issue
[FEATURE] Frontend : Vue Timeline desktop

## Contexte

`TimelineCalendar.tsx` (256 lignes) affiche aujourd'hui une fenêtre de 30 jours figée, sans zoom, sans navigation fluide et sans vue synthétique de l'ensemble d'une timeline. L'utilisateur ne peut pas voir ses événements sur des horizons pluriannuels ni naviguer rapidement entre des périodes éloignées — c'est la fonctionnalité centrale du produit.

## À faire

- Implémenter la frise horizontale continue (scroll infini ou virtualisé) sur desktop.
- Zoom continu via `Cmd + molette` (niveaux : jour / semaine / mois / trimestre / année) avec transitions fluides.
- Règle temporelle sticky en haut, adaptative au niveau de zoom courant (graduations dynamiques).
- Minimap waveform en bas de l'écran : vue d'ensemble compressée de toute la timeline, avec fenêtre de sélection draggable.
- Accordéons de groupement par catégorie et par produit (expand/collapse).
- Drawer latéral de détail événement (ouvert au clic sur un bloc).
- Raccourcis clavier : `T` (aller à aujourd'hui), `[` / `]` (période précédente/suivante), `+` / `-` (zoom in/out), `F` (plein écran), `Échap` (fermer drawer/reset).
- Overlay visuel week-ends (fond légèrement distinct).
- Indicateur `TODAY` sur la règle (ligne verticale + badge date).

## BR impactées

- BR-EVE-001 (event↔user) — la vue n'affiche que les événements de l'utilisateur authentifié

## Critères d'acceptation

- [ ] La frise affiche tous les événements de l'utilisateur sans fenêtre 30 jours codée en dur
- [ ] `Cmd + molette` change le niveau de zoom sans rechargement réseau
- [ ] La règle affiche des graduations cohérentes avec le zoom (ex. : jours en vue semaine, semaines en vue mois)
- [ ] La minimap permet de naviguer par drag sans perdre le contexte global
- [ ] Les accordéons catégorie/produit s'ouvrent et se ferment en conservant la position de scroll
- [ ] Le drawer détail s'ouvre au clic et se ferme avec `Échap`
- [ ] Tous les raccourcis clavier listés fonctionnent et sont documentés dans un tooltip `?`
- [ ] L'indicateur TODAY reste visible quel que soit le niveau de zoom
- [ ] Les week-ends sont visuellement distingués sans surcharger l'interface
- [ ] Aucune régression sur les tests Storybook des composants extraits (#47)

## Piste technique

- `frontend/src/components/TimelineCalendar.tsx` — réécriture ou extraction progressive
- Composants extraits par #47 (TimelineBlock, TimelineRuler, etc.) — à étendre ici
- Données serveur via TanStack Query (#48) — hooks `useEvents`, `useProducts`
- Virtualisation horizontale : évaluer `react-virtual` ou `@tanstack/react-virtual` pour les frises longues
- Zoom state : `useReducer` local ou store Zustand (à décider en cohérence avec l'archi Wave 1)
- Minimap : canvas 2D ou SVG compressé — attention aux performances sur >500 événements

## Dépendances

- Bloqué par **#47** ([FEATURE] Extraire les composants Timeline du monolithe) — les composants atomiques doivent exister avant l'assemblage
- Bloqué par **#48** ([CHORE] Introduire TanStack Query) — la couche data doit être en place

## Risques techniques

- **Virtualisation vs accessibilité** : les nœuds DOM virtualisés ne sont pas dans le DOM → les éléments focusables (blocs événement, boutons) peuvent casser la navigation clavier ; prévoir une stratégie de focus cohérente (anticipation Issue perf Wave 7).
- **Performance minimap** : recalculer la minimap à chaque scroll est coûteux sur des timelines avec >1 000 événements — debounce ou worker requis.
- **Interaction zoom + dates de récurrence** : les occurrences récurrentes (issue 4.1) multiplient le nombre de blocs à rendre — à ne pas bloquer la Vue mais à anticiper.

## Estimation

L (4–6 jours) — frise virtualisée + zoom + minimap + drawer + raccourcis + tests.

## Plan d'implementation (architect, /sprint plan)
```yaml
issue_0055:
  fichiers_cles:
    - "frontend/src/components/calendar/TimelineCalendar.tsx (114 lignes — orchestrateur actuel #47, à faire évoluer)"
    - "frontend/src/components/timeline/* (briques #47 : EventBar, Ruler, Cursor, Lane, DateStamp, lib.ts, index.ts)"
    - "frontend/src/styles/ds/components/timeline.css (styles DS existants)"
    - "hooks TanStack #48 : frontend/src/hooks/useProductsWithEvents.ts (data events/products)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest) + stories Storybook ; ne PAS régresser les tests des sous-composants #47 ni le golden path E2E (#163)"
  risque_regression: "BR-EVE-001 (event↔user) : frise n'affiche QUE les events de l'utilisateur authentifié. Virtualisation horizontale sur >500 events. Zoom state (useReducer local recommandé — Zustand ABSENT du package.json, ne l'ajouter que si justifié). Consomme le contrat couleur #150."
  ordre_ecriture: "frontend (frise virtualisée → règle sticky adaptative zoom → minimap → drawer → raccourcis clavier → overlays week-end/TODAY)"
  zod_dto_sync: "NON (pas de DTO backend, consomme #150)"
  possibly_done: false
```

## État réel du code (vérifié par le lead, 2026-07-03)
- #47 CLOSED : sous-composants extraits présents dans `frontend/src/components/timeline/` — EventBar.tsx, Ruler.tsx, Cursor.tsx, Lane.tsx, DateStamp.tsx, lib.ts (getDaysRange, buildEventsByResource, groupResourcesByCategory), index.ts (barrel). Stories .stories.tsx à NE PAS régresser.
- `components/calendar/TimelineCalendar.tsx` (114 l) = orchestrateur actuel, fenêtre 30j figée via getDaysRange(currentDate). C'est le point de départ de la réécriture.
- #48 CLOSED : hooks TanStack Query présents (`frontend/src/hooks/useProductsWithEvents.ts`, useCreateProduct, useUpdateProduct...). Utiliser la couche data existante, NE PAS refetch au zoom.
- Dépendances npm : `@tanstack/react-virtual` ABSENT et `zustand` ABSENT du package.json. Si virtualisation nécessaire, ajouter react-virtual (justifier). Préférer useReducer local pour le zoom state plutôt qu'introduire Zustand.

## Triage
Taille: L
Modele: opus
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

<!-- ===== br-events.md ===== -->
# Context-pack domaine : `events`

> Domaine : `events` — gestion des événements d'une timeline (création, mise à jour partielle, suppression, listing par produit), chaque événement étant rattaché à un `Product` et porteur de dates calculées (durée ou date unique).
> Acteurs principaux : `ROLE_USER` (utilisateur authentifié via cookie JWT), `Anonymous` (bloqué), `system` (mappers / `Utils.calculateEndDate` qui calculent dates et valeurs par défaut).

---

## 1. Lifecycles (machines à états)

**EventEntity** — CRUD simple, pas de machine à états `status`/`state`. `#44` (S9) a introduit un champ **`archived`** (`EventEntity.java:57-58`, `Event.java`) — flag de type soft-delete existant, mais `DELETE` reste une suppression physique via `deleteById` (le flag `archived` ne remplace pas encore le hard-delete). Nuance : soft-delete partiellement amorcé, pas complet.

Le seul "état" implicite est le `type`, qui n'est PAS une transition mais une nature figée à la création :

| `type`     | Description                                              | Conséquence métier                                                                 |
|------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
| `duration` | Événement avec durée → `endDate` = `startDate` + `durationValue` × `durationUnit` | `Utils.calculateEndDate` applique `plusDays/Weeks/Months/Years`                     |
| `single`   | Événement ponctuel → `endDate` = `startDate`             | `calculateEndDate` retourne `startDate` inchangée (branche `if` non prise)          |

⚠️ Aucune contrainte d'enum sur `type` côté backend : toute chaîne hors `duration`/`single` est acceptée et traitée comme `single` (branche `if` non prise → `endDate = startDate`).

**CHECK constraint `ck_events_recurrence_unit`** (V7, #44) : limite `recurrence_unit` à WEEK/MONTH/YEAR au niveau DB (lié à PIT-S9-001). Une valeur legacy invalide en base fait échouer l'insertion/maj → V10 (prévue S12) neutralisera les valeurs invalides existantes.

---

## 2. Actions x Acteurs

| Action                                                        | ROLE_USER | Anonymous | system | Notes                                                                                  |
|--------------------------------------------------------------|:---------:|:---------:|:------:|----------------------------------------------------------------------------------------|
| `POST /api/events` (créer)                                    | ✅        | ❌        | —      | Bloqué anonyme via `SecurityConfig`. ✅ `@Valid` + ownership productId (Sprint 1 #31/#91). |
| `PATCH /api/events/{id}` (maj partielle)                      | ✅        | ❌        | —      | ✅ Ownership event→product→user (403) + DTO typé `@Valid` (Sprint 1 #28/#30).           |
| `DELETE /api/events/{id}` (supprimer)                         | ✅        | ❌        | —      | ✅ Ownership (403 si event d'autrui) implémenté Sprint 1 #30. Suppression physique.     |
| `GET /api/users/{userId}/products/{productId}/events` (lister)| ✅        | ❌        | —      | Endpoint porté par `ProductController`. `userId` vérifié vs JWT via `JwtService`.      |
| Calcul `endDate`                                             | —         | —         | ✅     | `Utils.calculateEndDate` à la création uniquement (pas recalculé au PATCH).            |
| Défaut `startDate = LocalDate.now()`                          | —         | —         | ✅     | Appliqué dans `EventServiceImpl.createEvent` si `date` null.                            |

---

## 3. Business Rules atomiques

### BR-EVE-001 — Nom d'événement requis et borné
**Règle** : un `ROLE_USER` MUST fournir un `name` non vide (1–100 caractères) à la création.
**Pourquoi** : intégrité des données, le `name` est mappé vers `Event.title` (champ d'affichage).
**Implémentation** : `EventCreationRequest.name` (`@NotBlank` + `@Size(min=1, max=100)`).
**✅ IMPLÉMENTÉ Sprint 1 (#31/#91)** : `@Valid` ajouté sur `EventController.createEvent(@RequestBody ...)` → la contrainte `@Size(min=1,max=100)` est désormais déclenchée (titre vide → 400). Reste un seuil divergent avec le frontend (`eventCreationSchema.name.min(3)` vs back min=1) à harmoniser.
**Test attendu** : `EventControllerTest.shouldReject400WhenNameBlankOrTooLong` (à créer — échouera tant que `@Valid` absent).

### BR-EVE-002 — Produit cible obligatoire et existant
**Règle** : un `ROLE_USER` MUST fournir un `productId` non null référençant un `Product` existant, sinon la création échoue.
**Pourquoi** : `EventEntity.product` est `@JoinColumn(nullable=false)` ; un event orphelin est interdit.
**Implémentation** : `EventCreationRequest.productId` (`@NotNull`) + `EventServiceImpl.createEvent` → `productRepository.findDomainProductById(...).orElseThrow(ProductNotFoundException)`.
**Test attendu** : `EventServiceImplTest.shouldThrowProductNotFoundWhenProductIdUnknown`.

### BR-EVE-003 — endDate calculée selon le type
**Règle** : le `system` MUST calculer `endDate` = `startDate` + (`durationValue` × `durationUnit`) quand `type='duration'`, et `endDate = startDate` quand `type='single'`.
**Pourquoi** : cohérence temporelle de l'affichage timeline ; un event `single` ne dure qu'un jour.
**Implémentation** : `Utils.calculateEndDate(EventCreationRequest, startDate)` (switch sur `durationUnit` : `days/weeks/months/years`).
**Test attendu** : `UtilsTest.shouldComputeEndDatePerDurationUnit` + `shouldReturnStartDateForSingleType`.

### BR-EVE-004 — durationUnit valide quand type=duration
**Règle** : quand `type='duration'`, `durationUnit` MUST être l'une de `days/weeks/months/years`, sinon `IllegalArgumentException`.
**Pourquoi** : éviter un calcul de date silencieusement faux.
**Implémentation** : `Utils.calculateEndDate` branche `default` → `throw new IllegalArgumentException`.
**⚠️ FAILLE NPE** : si `type='duration'`, `durationValue != null` et `durationUnit == null`, `switch(null)` lève une `NullPointerException` (aucun null-guard avant le switch). `durationUnit` n'est pas garanti non-null à la création (`@NotBlank` jamais déclenché faute de `@Valid`).
**Test attendu** : `UtilsTest.shouldThrowOnUnknownDurationUnit` + `shouldNotNpeWhenDurationUnitNull` (à créer).

### BR-EVE-005 — startDate par défaut = aujourd'hui
**Règle** : si `date` est null à la création, le `system` MUST utiliser `LocalDate.now()` comme `startDate`.
**Pourquoi** : un event sans date de début n'a pas de sens sur la timeline.
**Implémentation** : `EventServiceImpl.createEvent` → `startDate = (date != null) ? date : LocalDate.now()`.
**Test attendu** : `EventServiceImplTest.shouldDefaultStartDateToTodayWhenDateNull`.

### BR-EVE-006 — recurrenceUnit requis quand isRecurring=true
**Règle** : quand `isRecurring=true`, `recurrenceUnit` DEVRAIT être obligatoire (`weeks/months/years`).
**Pourquoi** : une récurrence sans unité est inexploitable.
**✅ RÉSOLU BACKEND (Sprint 9 #44 + Sprint 12 #54)** : enum `RecurrenceUnit` (WEEK/MONTH/YEAR) livré S9 (`RecurrenceUnit.java`, parsing tolérant `fromString`). S12 #54 ajoute la contrainte « requis si `isRecurring=true` » sur les DEUX chemins d'écriture : CREATE via `EventCreationRequest.isRecurrenceUnitConsistent()` (`@AssertTrue @JsonIgnore` → 400) ; PATCH via garde service dans `EventServiceImpl.updateEvent` sur l'état fusionné (`isRecurring=true && recurrenceUnit==null` → `RecurrenceUnitRequiredException` → 400, review S12). Cf. [[PAT-S12-001]]. ⚠ FRONT : refine conditionnel Zod encore à répercuter au sprint frontend events.
**Test** : `EventControllerValidationTest` (create 400) + `EventServiceImplTest`/`EventPatchAndRecurrenceIntegrationTest` (PATCH 400 + non-régression « recurrenceUnit préexistant → 200 »).

### BR-EVE-007 — isRecurring obligatoire à la création
**Règle** : un `ROLE_USER` MUST fournir `isRecurring` (non null) à la création.
**Pourquoi** : le flag pilote la logique de récurrence côté affichage.
**Implémentation** : `EventCreationRequest.isRecurring` (`@NotNull`).
**✅ IMPLÉMENTÉ Sprint 1 (#31)** : `@Valid` présent → `@NotNull` sur `isRecurring` désormais déclenché (voir BR-EVE-001).
**Test attendu** : `EventControllerTest.shouldReject400WhenIsRecurringNull`.

### BR-EVE-008 — Ownership requis sur PATCH / DELETE
**Règle** : un `ROLE_USER` MUST NOT modifier ou supprimer un event qui n'appartient pas à l'un de ses produits.
**Pourquoi** : isolation des données entre utilisateurs (confidentialité, intégrité).
**✅ IMPLÉMENTÉ Sprint 1 (#30/#91)** : `EventController` vérifie l'ownership sur `createEvent` (productId du caller), `updateEvent` et `deleteEvent` via le helper `checkEventOwnership` (`event → productId → product.getUser().getId() == caller.getId()`, sinon 403). Identité dérivée du JWT (`resolveCaller`), jamais d'un path param. `JwtException` → 401 (pas 500).
**Test attendu** : `EventControllerSecurityTest.shouldReturn403WhenPatchingForeignEvent` + `shouldReturn403WhenDeletingForeignEvent`.

### BR-EVE-009 — Modèle couleur event (migration design v3 #44)
**Règle** : l'event porte UNE couleur unique cohérente entre backend et frontend.
**Pourquoi** : éviter des erreurs de validation/runtime divergentes ; le modèle 3-couleurs était redondant.
**✅ BACKEND RÉSOLU (Sprint 9, #44)** : colonne UNIQUE `color` (`EventEntity.java:59`, `V7__design_v3_schema.sql:67-79`) ; `border_color`/`text_color` **DROP définitif** (migration irréversible).
**⚠️ FRONTEND NON migré** : `frontend/src/types/event.ts:13-15` + `EventEditForm.tsx:262-264` conservent le modèle 3-couleurs (`backgroundColor`/`borderColor`/`textColor`) → désync front/back, dette **issue #150 (sync Zod, non livrée)**. Aucune validation format hex côté backend (`color` String libre).
**Test attendu** : `eventEditSchema.test.ts.shouldValidateColorsConsistently` (après migration front sur `color` unique).

### BR-EVE-010 — Champ allDay : nom de sérialisation
**Règle** : le frontend MUST lire le champ booléen "journée entière" sous la clé sérialisée par le backend.
**Pourquoi** : éviter un `undefined` silencieux à la désérialisation.
**⚠️ INCOHÉRENCE** : backend sérialise `isAllDay` (getter `getIsAllDay` → préfixe Jackson `isAllDay`), tandis que `eventSchema` (`types/event.ts`) attend `allDay`. Le mapping `mapToFullCalendarEvent` lit `event.allDay` → risque de `undefined`.
**Test attendu** : `eventSerialization.test.ts.shouldDeserializeIsAllDayField` (après alignement des noms).

### BR-EVE-011 — Quota d'événements actifs selon le tier (anticipation monétisation)
**Règle** : le nombre d'événements **actifs (non archivés)** d'un utilisateur DOIT être plafonné selon son `tier` (`FREE`=20, `PLUS`=200, `PRO`=illimité). Un événement **récurrent compte pour 1** (la récurrence est une propriété, pas un multiplicateur). Les produits et catégories restent **gratuits et illimités** — l'unité facturable est l'événement.
**Pourquoi** : modèle de monétisation par abonnement pas cher débloquant plus d'événements. Compter par lane/produit serait contournable (1 catégorie = 300 events).
**⚠️ NON IMPLÉMENTÉ / ANTICIPATION (issue #88)** : couture `PlanPolicy.canCreateEvent(user)` posée mais **no-op** (renvoie toujours `true`, plafonds en mode illimité) tant que la monétisation n'est pas lancée. Champ `User.tier` (défaut `FREE`). Le paiement réel (Stripe, paywall, webhooks) = epic « Monétisation » **post-MVP, hors périmètre**.
**Lien** : « actif » = non archivé (dépend du soft-delete événement, cf. modèle v3 #44) ; comptage à garder atomique en cas de création concurrente / offline (#76).
**Test attendu** : `PlanPolicyTest.shouldCountActiveNonArchivedEvents` + `shouldCountRecurringAsOne` + `EventControllerQuotaTest.shouldReturn402WhenTierLimitReached` (quand l'enforcement sera activé).

### BR-EVE-012 — recurrenceEndDate (champ #44, non couvert par une règle antérieure)
**Règle** : `recurrenceEndDate` borne la fin d'une récurrence.
**Implémentation** : champ réel `EventEntity.java:47-48`, `Event.java` ; exposé en PATCH `EventUpdateRequest.java:37`.
**✅ RÉSOLU BACKEND (Sprint 14 #168)** : garde au niveau service sur l'état fusionné du PATCH (`recurrenceEndDate < startDate` → `RecurrenceEndDateBeforeStartException` → **422**, cohérent [[DEC-S12-001]]/[[DEC-S14-001]]). `isBefore` stricte (`end == start` toléré). Portée update uniquement (`recurrenceEndDate` absent du DTO create). ⚠ FRONT : refine Zod `recurrenceEndDate >= startDate` encore dû (#150, S15).
**Test** : `EventServiceImplTest` (bornes </==/> startDate). Filet DB complémentaire : contrainte de présence #128/V11 (pas la comparaison de dates).

### BR-EVE-013 — archived en PATCH uniquement (asymétrie create/update)
**Règle** : `archived` (flag soft-delete amorcé) est modifiable via PATCH mais pas fixable à la création.
**Implémentation** : présent en PATCH `EventUpdateRequest.java:40`, mappé `EventServiceImpl.java:90-92` ; ABSENT de `EventCreationRequest` (pas de création d'event déjà archivé).
**Test attendu** : `EventServiceImplTest.shouldToggleArchivedOnPatch`.

### BR-EVE-014 — Asymétrie DTO create vs update (bug produit potentiel)
**Règle (constat historique)** : `EventCreationRequest` n'exposait PAS `color`/`archived`/`recurrenceEndDate` — seul `EventUpdateRequest` les supportait.
**✅ RÉSOLU PARTIEL (Sprint 14 #168)** : `color` (String nullable, additif non-cassant) désormais fournissable à `POST /api/events` et threadé dans `EventServiceImpl.createEvent`. `archived`/`recurrenceEndDate` restent PATCH-only par choix (BR-EVE-013 : pas de création déjà archivée ; recurrenceEndDate hors scope create). ⚠ FRONT : répercuter `color` au create côté Zod/eventService (#150, S15). Aucune validation format hex backend (color String libre, assumé — le backend reste source tolérante).
**Test** : `EventCreationRequestContractTest` (color exposé au create / absent non-cassant).

---

## 4. Dépendances inter-domaines

- **events → products (fort)** : `EventEntity` `@ManyToOne ProductEntity` (`@JoinColumn product_id, nullable=false`, `@JsonBackReference`). Côté `Product`, `@OneToMany(mappedBy="product", cascade=ALL, orphanRemoval=true, @JsonManagedReference)` → la suppression d'un produit **cascade** sur ses events.
- **Modèle domaine** : `Event` porte `productId: UUID` (pas l'entité) → isolation hexagonale correcte au niveau domaine.
- ⚠️ **`events` n'a PAS de colonne `user_id`** (schéma réel V1) : l'appartenance d'un event à un utilisateur est **transitive** via `product_id → products.user_id`. Toute opération « par utilisateur » sur events (purge suppression de compte #78, futurs filtres) doit joindre `products` (sous-select `product_id in (select id from products where user_id=:uid)`). (validé Sprint 13 #78)
- **Listing des events** : porté par `ProductController` (`GET /api/users/{userId}/products/{productId}/events`), pas par `EventController` → le domaine `events` dépend de l'auth produit/user.
- ⚠️ **Couplage infra-infra** : `EventRepositoryJpaImpl` injecte `ProductRepositoryJpaImpl` (classe concrète) au lieu du port `ProductRepository` → viole l'inversion de dépendance hexagonale.
- ⚠️ **Fuite DTO dans le port domaine** : `EventService` (port domaine) référence `EventCreationRequest` (couche application) dans `createEvent(...)` → le DTO applicatif pollue la définition du port.
- ⚠️ **Impact `@SQLRestriction("archived=false")` de `ProductEntity`** : les events d'un produit archivé deviennent inaccessibles via `GET events` — le produit est résolu par `findById` d'abord, qui renvoie 404 (produit filtré par la restriction), donc le listing des events échoue en amont. Dépendance events↔products à connaître lors du debug « events introuvables ».

---

## 5. Anti-patterns documentés

- ~~**IDOR (PATCH & DELETE)**~~ : ✅ RÉSOLU Sprint 1 #30/#91 — ownership sur create/update/delete (cf. BR-EVE-008).
- ~~**`@Valid` manquant** sur `POST /api/events`~~ : ✅ RÉSOLU Sprint 1 #31 — `@Valid` posé sur tous les `@RequestBody` + `@EnableMethodSecurity` + session STATELESS (cf. BR-EVE-001/007).
- **Fuite du modèle domaine en réponse REST** : `Event` (domaine) renvoyé directement par POST/PATCH et par le GET liste — aucun response DTO.
- **Logique métier dans le controller** : `EventController.updateEvent` contient la boucle de mise à jour champ-par-champ avec `instanceof` (parsing `durationValue`/`isRecurring`) — devrait être en couche service.
- **Mismatch sémantique name↔title** : `EventCreationRequest.name` mappé vers `Event.title`.
- ~~**Exception avalée** : `findEventById` fait `printStackTrace` + `Optional.empty()`~~ ✅ RÉSOLU S12 #95 : corps réduit à `return eventRepository.findEventById(id);` (1 hit, plus de swallow, MEMO-007).
- **Double round-trip DB** : ~~`findEventById`~~ ✅ RÉSOLU S12 #95 ; RESTE `deleteById` (`existsById` puis `deleteById`) — cf. RECOMMAND_FOLLOWUP #95 (nuance : `existsById` sert le 404, fix ≠ simple suppression). [triage XS]
- **Check vide dupliqué** : `EventServiceImpl.findDomainEventByProductId` lève `EventNotFoundException` sur liste vide, puis `ProductController` re-teste `isEmpty()` après coup.
- ~~**NPE potentielle** : `Utils.calculateEndDate` `switch(durationUnit)` sans null-guard~~ ✅ RÉSOLU S12 #54 : null-guard + `InvalidDurationUnitException` → 422 (cf. BR-EVE-004, [[DEC-S12-001]]).
- **Suppression physique** : `deleteById` supprime réellement la ligne. Nuance (S9 #44) : un champ `archived` (`EventEntity.java:57-58`, `Event.java`) existe désormais (soft-delete amorcé) mais `DELETE` reste un hard-delete — le flag n'est pas encore branché sur la suppression.
- ~~**`@CrossOrigin(origins="*")`** sur `EventController`~~ : ✅ RETIRÉ Sprint 1 #30 — CORS gérée uniquement par `SecurityConfig` (`allowCredentials=true` + `allowedOrigins localhost:3000`).
- **Schémas Zod dupliqués/divergents** : `eventEditSchema` défini deux fois (cf. BR-EVE-009) ; champ `allDay` vs `isAllDay` (cf. BR-EVE-010) ; `name.min(3)` front vs `@Size(min=1)` back ; `type` enum strict front vs `@NotBlank` libre back.

---

## Référence

- Coverage actuelle : `coverage-events.md`
- Backend :
  - Controller : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java`
  - Service : `backend/src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java`
  - DTO : `backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java`
  - Calcul dates : `backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java`
  - Entité : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java`
  - Port service : `backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EventService.java`
  - Listing : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java`
- Frontend :
  - Schémas/types : `frontend/src/types/event.ts`
  - Formulaire édition : `frontend/src/components/EventEditForm.tsx`
  - Service API : `frontend/src/services/eventService.ts`

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dependances intra-sprint
- Aucune dépendance intra-sprint (issue seule de la vague). Dépendances #47 (composants) et #48 (TanStack) déjà mergées dans dev.
- Contrat couleur #150 : chaque event/produit a UNE couleur unique — consommer, ne pas recréer de mapping.

## Designer — ui-design APPROUVE_AVEC_RESERVES (Sprint 17)
DS = mono-track "Graphite" (pas de Tracks nommés). Réutiliser les primitives existantes ; NE PAS inventer de nouveaux tokens.

DÉCISION STRUCTURELLE OBLIGATOIRE (trancher AVANT de coder, ne pas mélanger) :
- L'orchestrateur actuel `TimelineCalendar.tsx` utilise des classes Tailwind arbitrary (`border-rule`, `bg-surface-2`, `bg-[var(--color-expired)]`) au lieu des classes DS `.mt-*` définies dans `timeline.css`.
- Pour #55 : MIGRER vers les classes `.mt-*` de `frontend/src/styles/ds/components/timeline.css` (recommandé — le DS a été conçu pour). Ne PAS mélanger les deux approches dans le même composant.

Classes/tokens DS PRÊTS à réutiliser tels quels (aucun gap) :
- Ruler/Lane/EventBar/Cursor/Minimap/ZoomControls/DateStamp : `frontend/src/styles/ds/components/timeline.css:1-79`
- z-index : `tokens/spacing.css:52-56` → `--z-sticky:10` (règle sticky), `--z-cursor:20` (curseur/TODAY), `--z-popover:50`, `--z-modal:70` (drawer AU-DESSUS de tout)
- Focus : `tokens/base.css:40-42` → `2px solid var(--color-focus)` (jamais le ring navigateur par défaut)
- Motion : `readme.md:76-79` → `cubic-bezier(.32,.72,0,1)`, 120-280ms, no bounce (transitions zoom/accordéon). Respecter `prefers-reduced-motion` (guard DS déjà présent) sur zoom Cmd+molette + minimap.
- Tooltip aide (`?`) : composant `Tooltip` DS existant (`readme.md:119`, focus-within accessible) — réutiliser, ne pas recréer.

GAPS à composer depuis primitives existantes (pas de nouveau token, mais pas de classe prête) :
- Minimap "waveform" : `.mt-minimap`/`.mt-minimap__vp` existent (`timeline.css:50-54`) sans barres variables ni focus. Réutiliser `.mt-minimap__bar` (background `var(--color-rule-strong)`) pour les barres ; ajouter `:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}` sur `.mt-minimap__vp` (fenêtre draggable au clavier).
- Drawer détail événement : AUCUN `.mt-drawer`. Dériver de `.mt-dialog` (`core.css:209-216`, modal centré) une variante slide-in `position:fixed;right:0;top:0;bottom:0` en réutilisant `--z-modal`, `--shadow-lg`, `--radius-xl`, `border:1px solid var(--color-rule-strong)`, `background:var(--color-surface)` + structure `__overlay/__header/__body/__footer`. Trap-focus + fermeture Échap.
- Accordéons catégorie/produit : composer avec `.mt-lane__head` (`timeline.css:17-19`, déjà utilisé) + chevron Lucide stroke `1.5` + rotation motion ~160ms. Conserver la position de scroll à l'expand/collapse.
- Overlay week-end : `.mt-tl-ruler__maj--weekend` (`timeline.css:8`) n'est QUE sur la règle. Appliquer le même `color-mix(in srgb, var(--color-ink) 3.5%, transparent)` en fond de colonne sur `.mt-lane__track` pour la continuité verticale.
- Indicateur TODAY : vérifier `Cursor.tsx` vs `.mt-cursor`/`.mt-cursor__label` (`timeline.css:47-48`). Badge date : `--color-accent-ink` sur fond `--color-accent` ; vérifier contraste AA (accent `#1170E4`/`#4D9BFF`).

RÉSERVE a11y non vérifiée par ui-design : `.claude/rules-jit/ux-patterns.md` absent → les patterns d'interaction (raccourcis clavier, drawer focus-trap, navigation clavier sur blocs virtualisés) ne sont PAS validés par le designer. À toi de garantir : focus visible sur blocs virtualisés (les nœuds hors DOM cassent le tab — stratégie roving tabindex ou rendu focus-aware), Échap ferme drawer, tous les raccourcis (T/[/]/+/-/F/Échap/?) documentés dans le tooltip `?`.

## Contraintes
- Branche cible : sprint/17 (déjà checkout). cwd = /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/magical-hypatia-0e9903
- GARDE-FOU : `git rev-parse --abbrev-ref HEAD` DOIT retourner `sprint/17`. Sinon STOP immédiat (ne pas coder sur la mauvaise branche).
- Commit : 1 commit logique gitmoji français (peut être décomposé si étapes distinctes : frise→zoom→minimap→drawer→raccourcis).
- Tests OBLIGATOIRES inline via `./scripts/test-quiet.sh <scope>` (frontend). NE PAS régresser les stories/tests des sous-composants #47 ni le golden path E2E #163.
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER (le lead spawnera test-runner).
- BR-EVE-001 : la frise n'affiche QUE les events de l'utilisateur authentifié (déjà garanti par la couche data #48 — ne pas contourner).
- Data : consommer les hooks TanStack existants (`useProductsWithEvents`). Le zoom NE DOIT PAS déclencher de refetch réseau (filtrage/rendu client uniquement).
- Deps npm : préférer `useReducer` local pour le zoom state (Zustand ABSENT, ne pas l'ajouter sans justification forte). Si virtualisation horizontale nécessaire sur >500 events, ajouter `@tanstack/react-virtual` (ABSENT) et le justifier dans le done.md.
- NE PAS toucher : backend/**, autres domaines frontend hors timeline/calendar/events.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées + fichiers clés + décision .mt-* vs Tailwind + pitfalls + tests (chiffres passed/failed)>
- deps ajoutées: <react-virtual ? justification / ou "aucune">
- [MEMORY:*] signaux: <pitfall/pattern/decision si applicable>
- recommandations suite: <RECOMMAND_TEST_RUNNER / RECOMMAND_FOLLOWUP / pitfall subtil ; ou "Pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
