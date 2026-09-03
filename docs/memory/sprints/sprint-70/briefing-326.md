[BRIEFING ISSUE #326]

## Issue
[DESIGN] Aperçu sticky en haut du drawer de création (handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 46 (issue #315, PR #324).
Source : `docs/memory/sprints/sprint-46/issue-315-done.md`

## Description

Le handoff `docs/design/graphite-handoff.md` §6 spécifie que l'aperçu de l'événement reste **collé en haut
du drawer** (sticky) pendant que l'utilisateur fait défiler le formulaire.

L'issue #315 a livré le **contenu** de l'aperçu (mini-frise conforme au handoff) mais **pas son positionnement
sticky** : l'aperçu reste à sa place actuelle dans le flux du formulaire.

## Pourquoi ce n'est pas fait au Sprint 46

Écart assumé et documenté. Hisser l'aperçu en haut du drawer impliquerait `NewEventDrawer.tsx` et modifierait
les **surfaces d'édition partagées** — `EventEditForm` sert à la fois la création (drawer) et l'édition
(`EventDrawer`, `TimelineEditHost`, `ConflictDialog`). Le scope dépassait celui de #315.

## À faire

- Rendre l'aperçu sticky en haut du drawer de création, conformément au handoff §6
- **Sans régresser** les surfaces d'édition qui partagent `EventEditForm` (cf. `PAT-S44-001` : le mode
  historique doit rester le défaut)

## Triage estimé

S | Domaine : events / design

## Origine

`RECOMMAND_FOLLOWUP` remonté par le fullstack-dev pendant le Sprint 46, arbitré en Phase 4 de `/sprint end`.
Classé backlog libre : écart design assumé, sans urgence.


## Plan d'implementation
(Aucun mini-plan architect : le Sprint 70 n'a PAS été planifié par `/sprint plan`
— le milestone #71 et les labels `sprint-70` viennent du triage de clôture du
Sprint 46. Pas d'`architect-plans.md`. Tu décides de l'approche d'après l'état
vérifié ci-dessous + le pack domaine + le body de l'issue.)

### État vérifié par le lead au démarrage (mesuré sur `fd954b2`, pas supposé)

| Vérification | Résultat |
|---|---|
| `grep -rn sticky frontend/src/components/events/` | **0 hit** — aucun sticky sur l'aperçu. #326 est intégralement à faire, aucun NO-OP. |
| Où vit l'aperçu aujourd'hui | `frontend/src/components/EventEditForm.tsx` ~ligne 750, **dans le flux du formulaire, APRÈS le champ Couleur**, dans le bloc `{...}` non-`isCreate`-agnostique. Wrapper : `<div>` + libellé `tDetails('preview')` + `<EventPreviewTimeline .../>`. |
| Composant rendu | `frontend/src/components/events/EventPreviewTimeline.tsx` (livré #315, S46) |
| Drawer de création | `frontend/src/components/events/NewEventDrawer.tsx`. Le corps scrollable est `.mt-drawer__body` (desktop) / `.mt-sheet__body` (compact `<1024px`). `EventEditForm` est monté DEDANS, précédé du sélecteur de produit (`mt-drawer__field`) qui vit hors du formulaire. |
| Précédent de sticky déjà en place dans ce drawer | `.mt-sheet__footer` (#79) — pied sticky obtenu en **sortant** le nœud de `.mt-sheet__body` et en y **portalisant** le contenu depuis `EventEditForm` via la prop `footerPortalNode`. C'est le pattern maison pour « épingler un morceau du formulaire à une extrémité du drawer » ; il existe déjà, il est testé, et il ne duplique aucun markup. |
| Surfaces partagées à ne PAS régresser | `EventEditForm` sert AUSSI l'édition : `EventDrawer`, `TimelineEditHost`, `ConflictDialog`. Cf. `PAT-S44-001` — le mode historique doit rester le défaut. |
| Tokens `z-index` disponibles | `--z-sticky: 10` (`frontend/src/styles/ds/tokens/spacing.css:82`). ⚠ `PIT` connu : `.mt-sheet` / `.mt-actionsheet` partagent `--z-modal` (cf. issue #446) — vérifie l'empilement, ne pose pas un z-index littéral. |
| CSS de l'aperçu | `frontend/src/styles/ds/components/timeline.css:68-73` (`.mt-evt--preview`) |
| Spéc de référence | `docs/design/graphite-handoff.md` §6 (ligne 197) : « **Aperçu live sticky en haut** : mini-frise (ruler, TODAY) … + légende prochaine occurrence » |

### Contrainte de périmètre (tranchée par le lead)

L'issue dit « en haut du **drawer de création** ». Le handoff §6 couvre « création /
édition ». **Périmètre retenu : le chemin CRÉATION uniquement** (`mode="create"`,
donc `NewEventDrawer`). Motif : c'est le texte littéral de l'issue, et étendre le
sticky aux 3 surfaces d'édition partagées (`EventDrawer`, `TimelineEditHost`,
`ConflictDialog`) élargit le risque de régression sans mandat. Si ton implémentation
rend l'extension triviale et sans risque, **ne la fais pas quand même** : signale-la en
`RECOMMAND_FOLLOWUP`.

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
> ⚠️ **PIÈGE `type='single'` — la durée est OBLIGATOIRE malgré tout** ([[PIT-S44-001]], vérifié à la source S44 #300) : `EventCreationRequest.durationValue` (`@NotNull`) et `durationUnit` (`@NotBlank`) sont **INCONDITIONNELS** — `POST /api/events` renvoie **400** si on les omet, y compris pour un event ponctuel où `calculateEndDate` les IGNORE (branche `if` non prise → `endDate = startDate`). Asymétrie avec `recurrenceUnit`, lui conditionné proprement (`@AssertTrue isRecurrenceUnitConsistent`). **Côté client : envoyer des valeurs neutres (`durationValue: 0`, `durationUnit: 'days'`) sur le chemin `single`** — sans effet métier (cf. `toEventCreationPayload`, `frontend/src/types/event.ts`). ⚠ Ne frappe QUE le chemin direct `POST /api/events` : la création couplée (`POST /api/products` avec events imbriqués) y échappe car `ProductCreationRequest.events` n'a PAS de `@Valid` → pas de cascade ; **ne pas « corriger » cette absence**, elle est structurelle (`productId` `@NotNull` est insatisfiable sur un event imbriqué, le produit n'existant pas encore) — cf. [[PIT-S44-002]].

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
**✅ RÉSOLU BACKEND (Sprint 9 #44 + Sprint 12 #54)** : enum `RecurrenceUnit` (WEEK/MONTH/YEAR) livré S9 (`RecurrenceUnit.java`, parsing tolérant `fromString`). S12 #54 ajoute la contrainte « requis si `isRecurring=true` » sur les DEUX chemins d'écriture : CREATE via `EventCreationRequest.isRecurrenceUnitConsistent()` (`@AssertTrue @JsonIgnore` → 400) ; PATCH via garde service dans `EventServiceImpl.updateEvent` sur l'état fusionné (`isRecurring=true && recurrenceUnit==null` → `RecurrenceUnitRequiredException` → 400, review S12). Cf. [[PAT-S12-001]]. **✅ FRONT RÉSOLU (Sprint 18 #66)** : refine conditionnel Zod `seriesErr` (`recurrenceUnit` requis si `isRecurring=true`) dans `EventEditForm`/`types/event.ts`.
**Test** : `EventControllerValidationTest` (create 400) + `EventServiceImplTest`/`EventPatchAndRecurrenceIntegrationTest` (PATCH 400 + non-régression « recurrenceUnit préexistant → 200 »). Front : `EventEditForm.test.tsx` (`seriesErr`).

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
**✅ FRONTEND RÉSOLU (Sprint 18 #66)** : migration modèle **1-couleur** (`backgroundColor`/`color` seul, fin de `borderColor`/`textColor`) sur `types/event.ts` (schéma Zod unifié + `HEX_COLOR_REGEX`, validation hex `colorErr`), `EventEditForm.tsx` (preview) ET `EventContent.tsx` (barre calendrier / vue lecture — migration complète, PIT-S18-001). Encre de texte calculée par contraste WCAG via helper mutualisé `frontend/src/lib/color.ts` (`contrastInk`/`textOn`, cf. [[PAT-S18-001]]) — remplace `text-white` hardcodé illisible. Aucune validation format hex côté backend (`color` String libre → validation front uniquement).
**Test** : `frontend/src/lib/color.test.ts` (contraste AA), `types/event.test.ts` (hex), `EventEditForm.test.tsx` (`colorErr`).

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
**✅ RÉSOLU BACKEND (Sprint 14 #168)** : garde au niveau service sur l'état fusionné du PATCH (`recurrenceEndDate < startDate` → `RecurrenceEndDateBeforeStartException` → **422**, cohérent [[DEC-S12-001]]/[[DEC-S14-001]]). `isBefore` stricte (`end == start` toléré). Portée update uniquement (`recurrenceEndDate` absent du DTO create). **✅ COMPLÉTÉ BACKEND (Sprint 65 #452)** : une récurrence **sans** `recurrenceEndDate` n'est plus développée jusqu'au seul plafond d'occurrences (`MAX_OCCURRENCES = 4000`, soit ~333 ans en mensuel) mais jusqu'à un **horizon temporel** `RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS = 5` — mensuel 61 occurrences, hebdomadaire 261, annuel 6. L'horizon ne s'applique **qu'aux séries sans borne explicite** : une `recurrenceEndDate` fournie est honorée telle quelle et n'est jamais rognée (cf. [[DEC-S65-001]]). `capped = true` dans les deux cas de troncature. **La règle elle-même est INCHANGÉE** : `recurrenceEndDate` reste hors du DTO de création (décision produit du 2026-09-02). ⚠ Le service portant ce calcul n'a **aucun appelant** dans `src/main` — durcissement préventif en attente du câblage prévu par #439/#67. ⚠ FRONT : refine Zod `recurrenceEndDate >= startDate` encore dû (#150, S15).
**Test** : `EventServiceImplTest` (bornes </==/> startDate). Filet DB complémentaire : contrainte de présence #128/V11 (pas la comparaison de dates).

### BR-EVE-013 — archived en PATCH uniquement (asymétrie create/update)
**Règle** : `archived` (flag soft-delete amorcé) est modifiable via PATCH mais pas fixable à la création.
**Implémentation** : présent en PATCH `EventUpdateRequest.java:40`, mappé `EventServiceImpl.java:90-92` ; ABSENT de `EventCreationRequest` (pas de création d'event déjà archivé).
**Test attendu** : `EventServiceImplTest.shouldToggleArchivedOnPatch`.

### BR-EVE-014 — Asymétrie DTO create vs update (bug produit potentiel)
**Règle (constat historique)** : `EventCreationRequest` n'exposait PAS `color`/`archived`/`recurrenceEndDate` — seul `EventUpdateRequest` les supportait.
**✅ RÉSOLU PARTIEL (Sprint 14 #168)** : `color` (String nullable, additif non-cassant) désormais fournissable à `POST /api/events` et threadé dans `EventServiceImpl.createEvent`. `archived`/`recurrenceEndDate` restent PATCH-only par choix (BR-EVE-013 : pas de création déjà archivée ; recurrenceEndDate hors scope create). ⚠ FRONT : répercuter `color` au create côté Zod/eventService (#150, S15). Aucune validation format hex backend (color String libre, assumé — le backend reste source tolérante).
**Test** : `EventCreationRequestContractTest` (color exposé au create / absent non-cassant).

### BR-EVE-015 — Édition concurrente d'un event → 409 (optimistic locking)
**Règle** : deux modifications concurrentes du même event (via `@Version` sur `EventEntity`) → la seconde MUST échouer avec **HTTP 409** (pas 500), corps plat `{"error":"resource was modified concurrently, please retry"}`.
**Pourquoi** : sans mapping, `ObjectOptimisticLockingFailureException` remontait en 500 → le frontend (qui gère déjà l'état `conflict`) ne pouvait pas se déclencher.
**✅ RÉSOLU BACKEND (Sprint 25 #200)** : `@ExceptionHandler(ObjectOptimisticLockingFailureException.class)` dans `GlobalExceptionHandler`, scopé au TYPE PRÉCIS (jamais un supertype `DataIntegrityViolation` fourre-tout — cf. convention backend #3). Aucun mapping local Category/Product en doublon. **✅ FRONT (Sprint 25 #77)** : 409 intercepté sur le flux event (EventContent.onSubmit, PAS l'interceptor axios global → n'affecte pas les 409 name-conflict), ouvre `ConflictDialog` partagé, action « recharger » = invalidation ciblée TanStack (`queryKeys.products.withEvents`), remplace `window.location.reload()`.
**Test** : slice déterministe `GlobalExceptionHandlerOptimisticLockTest` (mock→409) + intégration `EventOptimisticLockConflictIntegrationTest` (version stale simulée sans threads, déterministe). Front : `ConflictDialog.test.tsx`, `EventContent.test.tsx` (409→dialog, 400/404→pas de dialog).
**⚠ Follow-up** : modale COMPARATIVE (force-save vs version-serveur + diff champs) NON faite — le corps 409 est plat (pas de serverVersion/yourVersion). Nécessite d'enrichir le contrat 409 backend d'abord.

### BR-EVE-016 — endDate ≥ startDate appliqué BACKEND (PATCH), plus seulement frontend
**Règle** : sur `PATCH /api/events/{id}`, `endDate` MUST être ≥ `startDate` (comparaison stricte, `==` toléré) sur l'ÉTAT FUSIONNÉ (payload + valeurs persistées), pas seulement sur la paire fournie.
**Pourquoi** : la validation ne vivait qu'au frontend (refine Zod) — un client hors navigateur ou un PATCH `endDate` seul contournait le contrôle.
**✅ RÉSOLU BACKEND (Sprint 25 #201)** : garde à DEUX niveaux — (1) `@AssertTrue isEndDateConsistent` sur `EventUpdateRequest` (fail-fast quand les 2 dates sont dans le payload → 400) ; (2) garde SERVICE sur l'état fusionné dans `EventServiceImpl.updateEvent` (`EndDateBeforeStartException` → **422**, aligné sur `RecurrenceEndDateBeforeStartException`/BR-EVE-012) qui couvre le cas `endDate` seul < `startDate` persisté. Lié à BR-EVE-003 : pour `type=duration` la durée reste source de `endDate` (endDate explicite écrasée si startDate/durée changent) ; pour `type=single` l'`endDate` explicite est persistée telle quelle. Voir [[DEC-S25-001]].
**Test** : `EventServiceImplTest` (endDate-seul < startDate → rejet, borne == tolérée, flip type duration→single) + `EventPatchAndRecurrenceIntegrationTest` (422, rien persisté).

> ⚠ Note numérotation : l'issue #201 parlait de « BR-EVE-002 » pour endDate≥startDate, mais BR-EVE-002 (ci-dessus) = « Produit cible obligatoire ». La règle endDate≥startDate est formalisée ici en **BR-EVE-016** (éviter la collision). BR-EVE-003 (dérivation endDate) est étendue au PATCH par le même sprint.

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
- **Schémas Zod dupliqués/divergents** : ~~`eventEditSchema` défini deux fois~~ ✅ RÉSOLU (doublon supprimé #150, source unique `types/event.ts` — confirmé S18 #66) ; ~~`name.min(3)` front vs `@Size(min=1)` back~~ ✅ harmonisé 1–100 front (S18 #66) ; RESTE : champ `allDay` vs `isAllDay` (cf. BR-EVE-010, non traité) ; `type` enum strict front vs `@NotBlank` libre back.

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

<!-- ===== pit-frontend.md ===== -->
# Pitfalls — stack `frontend` (MyTimeline)

> **GÉNÉRÉ — ne pas éditer à la main.**
> Source : `docs/memory/pitfalls.md` · Table : `.ai-env/tools/pit-classification.tsv`
> Régénérer : `bash .ai-env/tools/gen-pit-packs.sh` (fin de sprint, après consolidation).
>
> Entrées classées `frontend`, `both` ou `tooling`. Les `tooling` (worktree, RTK,
> CI, environnement) figurent dans les DEUX packs : elles piègent les sous-agents
> quelle que soit leur stack.
>
> **§1 = texte intégral** (sprints ≥ S53 + récurrents). **§2 = index de titres** ;
> le titre énonce la règle — si une entrée de §2 touche ton issue, lire le détail
> dans `docs/memory/pitfalls.md` AVANT de coder.

---

## §1 — Actifs (texte intégral)

## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)


## PIT-S16-002 — Subagent en worktree : `cd` Bash résout sur le repo principal
Un subagent lancé depuis un worktree peut voir son `Bash cd <chemin relatif>` résoudre sur le repo principal (`dev`) au lieu du worktree → fichiers écrits au mauvais endroit, faux KO. Solution : chemins ABSOLUS du worktree + `git -C <worktree>`, vérifier `git branch --show-current` AVANT chaque écriture (pas seulement avant commit). (Sprint 16 #166)


## PIT-S19-001 — Subagent lancé depuis un worktree : les écritures dérapent vers le repo principal (raffinement worktree-cwd)
Un fullstack-dev spawné dans un worktree lit bien le worktree (Read initial OK) MAIS ses `Write`/`Edit` + `cd` bash peuvent écrire dans le REPO PRINCIPAL : le cwd bash se reset au repo principal entre appels. En Sprint 19, #63 a codé dans `/Users/herrh/VSProjects/MyTimeline/frontend` (repo principal, SANS le commit #192), puis recopié main→worktree en écrasant l'intégration `<EventPill>` de #192 (regression détectée par le lead à la vérification post-vague, corrigée en `a0a94f1`). Le garde-fou HEAD **au début** NE SUFFIT PAS — c'est l'écriture qui dérape. Prévention : chemins ABSOLUS sous le worktree, `git -C <worktree>` pour tout git, et vérifier `git status` du worktree APRÈS chaque batch d'écriture. Aggravation si le repo principal n'a pas les commits des vagues précédentes → clobber silencieux. (Sprint 19 #63, incident merge)


## PIT-S20-003 — Wrapper `rtk git diff` en 3-dots renvoie vide silencieusement (outillage review)
Sur ce repo/env, `git diff a...b` passé via le wrapper `rtk` retourne une sortie VIDE sans erreur → un reviewer/agent croit à tort qu'il n'y a aucun changement. Prévention : pour les diffs de review (surtout 3-dots `origin/dev...HEAD`), utiliser `/usr/bin/git` directement (bypass wrapper), ou `gh pr diff <PR>`. (Sprint 20, review PR #208)


## PIT-S21-001 — Sprint depuis worktree : le garde-fou EFFICACE est un bloc en tête de briefing (pas « vérifie avant commit »)
Rappel du piège (cf. auto-memory `sprint-subagent-worktree-cwd`) : un subagent lancé depuis `.claude/worktrees/*` défaut-cwd sur le repo principal (`dev`) et écrit au mauvais endroit. En S21, les briefings à garde-fou faible (« vérifie la branche avant de commit ») ont ENCORE laissé #75 et #86 détourer (~10 min/agent + résidus untracked à nettoyer sur `dev`). Ce qui a marché pour #87 + correction : un bloc `⚠️ GARDE-FOU WORKTREE` en TOUT PREMIER avec (a) chemin absolu du worktree, (b) 1re action `cd <worktree> && /usr/bin/git rev-parse --show-toplevel`, (c) tous chemins Write ABSOLUS sous le worktree, (d) `/usr/bin/git -C <worktree>` (bypass RTK qui masque l'écart). Lead : `git -C <repo-principal> status` après chaque retour + `clean -fd` SCOPÉ (jamais global : emporte `.mcp.json`/`CLAUDE.md`/`.ai-env/`). (Sprint 21 #75/#86/#87)


## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)


## PIT-S22-003 — Garde-fou cwd worktree : le bloc EN TÊTE reste indispensable (récurrence S22)
Confirme PIT-S21-001 : en S22, #62 (garde cwd reléguée dans « Contraintes », pas en tête) a ENCORE écrit dans le repo principal avant rapatriement manuel. À l'inverse #68 et le fix review217 (bloc `⚠️ GARDE CWD WORKTREE` en TOUT PREMIER + chemins absolus + `git -C <worktree>`) n'ont eu AUCUNE fuite. Règle : le bloc worktree va en première ligne du briefing, jamais dans une section basse. (Sprint 22 #62 vs #68)


## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)


## PIT-S27-002 — `git diff > patch.diff` via le hook RTK produit une sortie compactée non-parsable par `git apply`
En S27, un subagent voulant relocaliser des edits (mauvais worktree, cf [[PIT-S24-002]]) via `git diff > patch.diff` puis `git apply` a échoué : le hook RTK réécrit `git diff` et compacte la sortie → « No valid patches in input ». Prévention : pour un patch brut valide, `rtk proxy git diff` (bypass filtre) ou ré-appliquer les edits directement via Write/Edit. (Sprint 27 #122)


## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)


## PIT-S41-005 — `next build` (ESLint CI) échoue sur `no-unused-vars` invisible à `vitest`
En S41, une variable inutilisée dans un fichier de test (`const user = userEvent.setup()` dans un test qui n'utilise que `fireEvent.keyDown`) passe `vitest run` (456/456 vert) mais fait ÉCHOUER le job CI `frontend` : `next build` lance ESLint sur les tests et traite `@typescript-eslint/no-unused-vars` en ERREUR (`Failed to compile`). **Règle : un run vitest vert ne garantit PAS le build ; valider `npx eslint <fichiers touchés>` (ou `next build`) avant push, surtout sur les fichiers de test ajoutés.** Extension concrète de la note pack cp-frontend « next build attrape des erreurs invisibles aux tests RTL ». (Sprint 41 #228, CI frontend)


## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)


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


## PIT-S56-001 — Un test unitaire hors shell couvre une branche structurellement inatteignable
S56 #391 : `timeline/page.tsx` portait un `if (loading) return <div data-testid="timeline-loading">`. Le test
RTL rendait la page **en isolation**, hors du shell qui intercepte déjà le chargement de session — la branche
était donc verte en test et **inatteignable en production**. Elle a survécu **3 sprints** sous cette couverture.
Prévention : pour toute branche de garde (auth/loading), vérifier que l'ancêtre qui monte le composant ne
l'intercepte pas déjà. **Un test RTL de branche de garde sur une page sous shell est suspect par défaut.**
Correctif : supprimer test et branche **ensemble**, et poser le contrat au niveau où l'état est atteignable.


## PIT-S56-002 — Un stub d'API navigateur qui mute l'état sans émettre son événement inverse le verdict
S56 #395 : le stub E2E de `requestFullscreen`/`exitFullscreen` mutait `document.fullscreenElement` **sans
dispatcher `fullscreenchange`**. Effet : il fait **rougir une implémentation correcte** (celle qui dérive son
état de l'événement) et **passer une fausse** (celle qui bascule un `useState` dans le handler). Le verdict du
test est donc exactement inversé. Prévention : tout stub d'une API à événement doit dispatcher l'événement ;
et l'oracle d'une issue « exposer un état observable » doit inclure un cas qui **contourne le déclencheur UI**
(ici `page.evaluate(() => document.exitFullscreen())`). Cf. [[PAT-S56-001]].


## PIT-S56-003 — Une constante « par défaut » peut être redéclarée en local sous un commentaire qui jure le contraire
S56 #393 : `DEFAULT_COLOR` était exportée par `types/event.ts` **et** redéclarée en local dans
`EventContent.tsx` — ironiquement sous un commentaire « #150 modèle couleur unique ». Un fix de valeur qui
suit le nom cité par l'issue n'aurait touché qu'une des deux → **deux « défauts » divergents selon le
composant**. Prévention : sur toute issue « changer une valeur par défaut », **grep la VALEUR littérale en
plus du nom de la constante** — la copie ne porte pas toujours le même nom, ni un commentaire honnête.


## PIT-S56-004 — `:3000` peut appartenir à un AUTRE projet du poste, et changer de port ne sauve pas
S56 #395 : `:3000` était tenu par un `next-server` standalone d'EdelWheels → 404 sur `/fr/register`, alors que
le briefing affirmait qu'un `next dev` du worktree y tournait. Basculer sur `:3100` ne suffit pas : Next relaie
`Origin: localhost:3100` au backend, que `application-dev.properties:35` fige à `localhost:3000` → **403
déguisé en « rate-limit »**. Variante par le **port du serveur dev** du piège déjà connu par le proxy
([[PIT-S57-003]] et l'entrée S47 plus haut). Recette retenue : **conteneur backend frère jetable** (même
réseau/DB, `APP_CORS_ALLOWED_ORIGINS=...:3000,...:3100`, port 8090). Corollaire : vérifier **à qui appartient**
le `:3000` avant de conclure quoi que ce soit sur l'application.


## PIT-S56-005 — Le `webServer` de `playwright.config.ts` lance `npm run dev` NU : `npx playwright test` est rouge par construction
S56 #391 : `playwright.config.ts:45-50` démarre le front sans `E2E_API_PROXY_TARGET` ni `NEXT_PUBLIC_API_URL`
→ `/api/*` non réécrit par Next, `POST register` en **404**, et `auth.setup.ts` échoue avec un message qui
oriente à tort vers le rate-limit ou le CORS. **Règle : ne jamais laisser Playwright démarrer son propre
`webServer` sur ce dépôt.** Recette : lancer le dev à part avec
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3000` +
`PLAYWRIGHT_BASE_URL=http://localhost:3000` — **port 3000 impérativement**, le CORS backend le fige
([[PIT-S56-004]]). [[PIT-S58-003]] complète : ces variables se posent au **build**, pas au start.


## PIT-S56-006 — `sprint-history.md` n'est pas une source d'état : 7 sprints sur 24 le démentaient
Audit du 2026-08-16 (déclenché par le S56 mergé depuis 16 jours sans clôture) : les sprints **36, 46, 48,
49, 51, 55, 58** portaient un statut `En cours`/`PLANIFIÉ`/`PR ouverte` alors que **leur code était sur
`dev` dans les 7 cas**. Le fichier décrit l'intention au moment de l'écriture, pas l'état — **toujours
trancher sur GitHub** (`gh api …/milestones?state=all`, `gh pr view`, `git merge-base --is-ancestor`).
**Trois pièges de balayage, tous rencontrés :** (1) grep sur les titres `## Sprint` seuls **rate** les
entrées dont le titre dit « Terminé » et dont la ligne `**Status :**` dit encore « En cours » (cas 51 et
55) — balayer les deux marqueurs séparément ; (2) un **milestone fermé avec `open=0 closed=0`** n'est pas
un sprint sans travail, c'est un sprint dont personne n'a rattaché les issues (cas 36 : code livré,
2 issues restées ouvertes 35 jours) ; (3) **rectifier un statut n'est pas clôturer** — le S56 avait été
passé à `Terminé` pendant `/sprint end 57`, ce qui a **masqué** que ni les issues, ni le milestone, ni la
consolidation mémoire n'avaient suivi. Symétriquement, **5 issues ouvertes étaient parquées dans des
milestones fermés** (#151, #185, #230, #279, #338), donc invisibles au backlog et réputées livrées.
Cf. [[PIT-S46-004]] pour l'autre famille de faux positifs de clôture.


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


## PIT-S59-001 — Un désalignement de paliers ne prédit PAS où le défaut sort
#381 localisait un défaut de logo « entre 768 et 1023 px » par lecture du code seul (seul élément resté en
`md:` quand #347 avait tout basculé en `lg:`). **Mesure jammy : aucun défaut dans cette plage** — le
`container` Tailwind plafonne la largeur utile à 736 px et la nav est masquée, les deux annulent le défaut
attendu. **Le vrai défaut était à 1024 px**, un pixel hors périmètre : 2 lignes et 0 px de marge en
`fr`/`de`/`es`. Prévention : mesurer les DEUX côtés du seuil suivant, jamais le seul palier incriminé.


## PIT-S59-002 — Un élément « débordant » relevé sur `npm run dev` peut être de l'outillage de dev
Un audit par `getBoundingClientRect().right > clientWidth` remonte le bouton flottant des **TanStack Query
Devtools** (`.tsqd-parent-container`) et l'overlay `nextjs-portal`, avec un `right` qui **suit la largeur du
viewport** (329@320, 384@375, 399@390) — indiscernable d'un vrai défaut, alors que
`scrollWidth == clientWidth`. **A produit #341 : trois sprints de suspicion sur un SVG de landing qui
n'existe pas.** Exclusion portée par `frontend/e2e/support/dev-tooling.ts`. Cf. [[PIT-S58-005]].


## PIT-S59-003 — `text-4xl`/`text-5xl` absents de `@theme inline` ne sont PAS inertes
Sans `--text-*: initial`, ces classes retombent sur les **défauts Tailwind** (36/48 px) — donc **plus petit**
que `text-3xl` (57 px) de l'échelle DS. Le `h1` du hero rendait ainsi plus petit que le logo du header :
hiérarchie inversée, invisible à la lecture du nom de classe. Garde-fou source livré
(`frontend/src/__tests__/ds-type-scale.test.ts`). Prévention : toute taille se **mesure au navigateur**.


## PIT-S59-004 — Turbopack sert un chunk CSS périmé et produit un FAUX VERT
Après édition de `globals.css`, la première passe du test d'injection `.dark` est sortie **22 passed** — la
règle injectée n'était simplement pas dans le CSS servi. `touch` et rechargement n'ont rien changé ; **seul
un redémarrage du serveur dev** a compilé la règle. Prévention : avant de conclure « le défaut injecté n'est
pas vu », `curl` le chunk CSS servi et vérifier que l'injection y figure. (Corollaire de [[PIT-S52-002]].)


## PIT-S60-001 — Une allowlist de scanner combine ses critères en OU : elle blanchit plus large qu'elle n'en a l'air
Un bloc `[[allowlists]]` gitleaks avec `paths` **et** `regexes` mais **sans `condition = "AND"`** blanchit la
valeur **partout dans le dépôt**, pas seulement dans le chemin visé. La lecture du bloc suggère l'inverse : les
deux critères juxtaposés se lisent comme un ET. Trouvé à l'écriture de `.gitleaks.toml` (#362), la première
version blanchissait `EXPORT_TOKEN_SECRET` y compris dans un fichier de prod. **Prévention : toute allowlist de
scanner se teste dans les DEUX sens** — le cas attendu est tu, ET un cas voisin (même valeur hors chemin, autre
secret dans le chemin) reste détecté. Rejouer la variante buggée pour voir le trou est ce qui l'a prouvé.


## PIT-S60-002 — Une empreinte de baseline épinglée sur une ligne encore au HEAD masque à VIE, sans jamais rougir
`.gitleaksignore` (format `commit:fichier:règle:ligne`) épinglait le fixture `SECRET` d'`ExportTokenServiceTest`,
**toujours présent au HEAD**. La règle écrite en tête du fichier l'interdit — au motif que l'empreinte
changerait au prochain commit touchant le fichier. Le mode d'échec réel est **l'inverse et bien plus discret** :
la ligne n'ayant jamais été retouchée depuis son commit d'introduction, l'empreinte reste valide indéfiniment,
donc le masquage devient **permanent** au lieu de rougir. Trouvé par l'audit sécurité de fin de sprint, pas à
l'écriture. Remède : exclusion **durable** ancrée sur un marqueur de la VALEUR (`test-only-insecure`) + le
chemin, `condition = "AND"` ; `.gitleaksignore` réservé aux occurrences **absentes du HEAD**, à vérifier une
par une. Cf. [[PIT-S60-001]].


## PIT-S60-003 — `gitleaks dir` ignore `.gitignore` : un gate CI doit être en mode `git`
Mesuré : `gitleaks dir` scanne 214 Mo et remonte 25 détections, dont **20 dans `frontend/.next/`,
`backend/target/`, `frontend/e2e/.auth/`** — des artefacts de build non versionnés. `gitleaks git` ne voit que
le contenu suivi (21 détections). Un job bâti sur `dir` rougit donc pour des fichiers qui ne sont pas dans le
dépôt, et sera désactivé après deux faux positifs. **Mode `git` pour tout gate CI.**


## PIT-S60-004 — Un scan vert AVANT le commit ne prouve rien sur l'état APRÈS (le scanner peut se détecter lui-même)
Un fichier de baseline listant des empreintes `commit:fichier:generic-api-key:ligne` aligne un SHA 40-hex à
forte entropie et le mot « api-key » sur la même ligne : le scanner peut se déclencher **sur sa propre
configuration**. Vérifié négatif ici, mais le piège général demeure — un scan pré-commit ne voit pas les
fichiers non encore committés. **Rejouer le scan dans un dépôt jetable contenant les fichiers committés** avant
de conclure. Corollaire : `--baseline-path` avec rapport JSON committé est un anti-pattern sur dépôt public —
le rapport **contient les valeurs en clair**.


## PIT-S60-005 — Un sous-agent qui casse l'environnement pour reproduire un cas dégradé peut caler avant de le restaurer
Sprint 60 #308 : l'agent a renommé `frontend/node_modules/eslint-plugin-storybook` en
`.eslint-plugin-storybook.S60-308-bak` pour prouver son garde-fou, puis a calé (watchdog 600 s) **avant la
restauration**. Le worktree est resté dans l'état dégradé — et **`git status` était propre**, `node_modules`
n'étant pas suivi. Un lead qui vérifie l'état d'un sprint sur le seul `git status` ne le voit pas ; l'échec
suivant accuserait le code. **Après tout arrêt anormal d'un sous-agent, vérifier l'ENVIRONNEMENT** (résolution
des paquets, processus laissés, ports tenus), pas seulement l'arbre git. Ici :
`node -e "require.resolve('eslint-plugin-storybook')"`. Le répertoire de sauvegarde se retrouve par
`find node_modules -maxdepth 2 -iname '*<paquet>*'` — le préfixe `.` le cache d'un `ls` ordinaire.


## PIT-S60-006 — `npm audit fix` échoue tant qu'un `overrides` auto-référentiel existe
`frontend/package.json` déclare `overrides: { "postcss": "$postcss" }` ; l'arbre virtuel d'`audit fix` ne résout
pas la référence → `npm error Unable to resolve reference $postcss`, sur **toute** invocation. L'issue #422
affirmait pourtant que `npm audit fix` était « confirmé suffisant ». Solution retenue : `npm update <transitif>`
quand la version corrigée tient dans la plage semver du parent (lire la plage **dans le lock** avant). **Ne pas
glisser vers `--force`** : il accepte les bumps majeurs. Prévention : ne jamais écrire dans une issue qu'une
commande est confirmée sans l'avoir lancée.


## PIT-S60-007 — `npm run typecheck` rouge sur une route FANTÔME : `.next/types` d'un build antérieur
`tsconfig.json:26` inclut `.next/types/**/*.ts`, donc `tsc` type-checke les artefacts d'un build précédent —
au S60, une erreur citant `app/[locale]/settings/page.js`, route disparue au passage en route group. Solution :
rebuild puis re-typecheck. **Prévention : une erreur `tsc` qui ne cite QUE `.next/**` n'est pas imputable à son
propre diff.**


## PIT-S60-008 — Le squatteur de port peut être un AUTRE worktree DU MÊME projet
Variante de [[PIT-S56-004]] : `:3100` était tenu par un `next-server` de
`worktrees/new-feature-2347-14cb9a/frontend` (up 21 h), rendant **500 sur `/fr/register`**. Le réflexe « c'est
un autre projet du poste » ne suffit donc pas — même nom de projet, même app, mais **code d'une autre branche**.
`lsof -a -p <pid> -d cwd` identifie le propriétaire réel. Prendre un port libre plutôt que tuer le process d'une
autre session.


## PIT-S60-009 — `test-quiet.sh frontend` ne lance QUE Vitest, contrairement à ce que disent le README et les briefings
`run_frontend` exécute un seul `npm test --silent` : ni `build`, ni `typecheck`, ni `lint`. La description
« vitest + build + typecheck + lint » circulait dans les briefings de sprint et le README. **Anti-pattern :
conclure « frontend vert » sur ce seul scope.** Corrigé au S60 (README §Tests + piège 4). Voisin de
[[PIT-S58-004]] : une garantie décrite mais inexistante dissuade d'en écrire une vraie.


## PIT-S60-010 — Un commentaire de test peut annoncer une isolation que le test ne respecte pas
`console-error-guard.test.ts:20-21` annonce que son lint de fixtures reste « isolé des plugins next/storybook ».
Vrai pour le volet 2 (config minimale), **faux pour le volet 1**, qui appelle
`new ESLint().calculateConfigForFile(...)` — donc charge `eslint.config.mjs` et **tous** ses imports. C'est ce
qui rend ce fichier, et lui seul, sensible à un `node_modules` incomplet. Le commentaire a probablement orienté
#308 vers la déclaration de dépendance plutôt que vers le cwd. Cf. [[PIT-S41-004]], [[PIT-S53-006]].


## PIT-S61-001 — Vitest : un mock de module PARTAGÉ + `mockReset()` fait passer un rejet traité pour un échec
Un mock de module partagé rendant une promesse rejetée, combiné à `mockReset()`/`mockClear()` en `beforeEach`,
fait rapporter la valeur de rejet comme un échec de test (`Serialized Error`, message `undefined`) **alors que le
rejet EST traité**. Établi par bisection (#307) : passe sans `beforeEach`, échoue avec `mockReset`, `mockClear`
ou une promesse pré-`catch`ée. Remède : recréer un `vi.fn()` par test. Variante de [[PIT-S11-002]].


## PIT-S61-002 — Désactiver des champs révèle les valeurs manquantes du pré-remplissage
`mapToFullCalendarEvent` jetait `durationValue`/`durationUnit` : un formulaire ouvert depuis la frise naissait
**invalide** sur `durationUnit` alors que `type='duration'`. Bug **silencieux** tant que le submit était
seulement refusé, **bloquant** dès que #230 a verrouillé les champs. Avant de poser un `disabled`, vérifier que
le schéma reste satisfiable avec les valeurs **réellement pré-remplies**, pas celles du fixture de test.


## PIT-S61-003 — `filter:grayscale()` ne préserve PAS le ratio de contraste WCAG
Contredit le commentaire posé par #230. `contrastInk` ne choisit que du noir ou du blanc, or **ce sont des points
fixes de `grayscale()`** : l'encre ne bouge pas, seul le fond bouge — et il s'**assombrit** (le filtre pondère les
canaux gamma-encodés, la luminance WCAG linéarise d'abord ; par convexité le gris obtenu a une luminance
inférieure). Encre claire → contraste augmente ; **encre foncée → il diminue**. Mesuré : 8,6 % des couleurs
passant AA échouaient après grisage. Toute décision d'a11y doit porter sur le **couple rendu** (fond + encre),
jamais sur la couleur source : exposer un `renderedColor(state)` unique consommé par l'encre ET par le verdict.


## PIT-S61-004 — Ne jamais annoncer un seuil de contraste sans les constantes du dépôt
`INK_DARK` vaut **`#0B0C0E`** (L = 0.00366), pas `#000000` : le point d'égalisation noir/blanc descend de 4.583 à
4.424. Le lead ET le reviewer ont cité `#0070F8` comme cas cassant — calculé avec du noir pur. Recalculé avec la
constante réelle, cette couleur **basculait déjà** avant correctif (4.494 < 4.5) : l'exemple ne démontrait rien.
Le phénomène était réel, l'exemplaire faux. Recalculer avec les constantes du code avant d'annoncer un ratio.


## PIT-S61-005 — Le check coverage-E2E est vert quand les specs sont seulement CITÉES
Au S61 il affichait « 10 testids ajoutés, 0 sans spec » alors que **les 5 specs du sprint n'avaient jamais été
exécutées** et que 2 échouaient. Il vérifie qu'un `data-testid` apparaît sous `frontend/e2e/`, il ne lance rien.
Combiné à 920 Vitest verts et un build OK, l'illusion est convaincante. Un `RECOMMAND_TEST_RUNNER` se traite en
**exécutant**, jamais en constatant. Famille [[PIT-S48-002]] (CI verte ≠ page correcte).


## PIT-S61-006 — « le flag est fourni par l'issue N » n'est pas une preuve : grepper les APPELANTS
Issue #67, planifiée XS : `RecurrenceExpansion.capped` existait, `MAX_OCCURRENCES = 4000` aussi, le service le
calculait, et la javadoc citait même son consommateur `#67`. Mais **`RecurrenceExpansionService` n'avait aucun
appelant** dans `backend/src/main` — seul son test unitaire le référençait. Code orphelin : aucune réponse d'API
où loger le flag. Un `grep` de la déclaration validait l'issue à tort ; c'est le `grep` des **appels**
(`\.methode(`, service injecté, champ présent dans le DTO de réponse) qui la disqualifie. Sortie du sprint → #439.


## PIT-S61-007 — `npm run dev` (turbopack) infère un mauvais workspace root en worktree, et TOUT casse
Le script force `--turbopack`, qui choisit un **autre worktree** quand plusieurs lockfiles coexistent : toutes les
pages rendent 500 (`ENOENT app-build-manifest.json`), `auth.setup.ts` casse, **0 spec ne s'exécute** — et le
message d'erreur ne dit rien de la cause. Un agent test-runner en a conclu « E2E impossibles sans modifier le
dépôt ». Contournement réel, sans modification : `rtk proxy npx next dev -p 3100` (webpack). Voisin de
[[PIT-S60-008]] (le squatteur de port peut être un autre worktree du même projet).


## PIT-S62-001 — `elementsFromPoint()` n'est PAS une preuve de peinture
Corollaire de [[PIT-S58-001]] côté hit-testing. Une couche Radix ouverte pose `body{pointer-events:none}` : tout le reste sort du test de survol et l'élément visé **remonte en tête de pile alors qu'il est recouvert**. S62 : la preuve DOM se lisait comme une *confirmation* que le popover était peint, tandis que le pixel montrait 100 % de panneau de drawer sur 15 offsets. `getComputedStyle` donne la couleur déclarée, `elementsFromPoint` la pile hit-testée — **jamais la peinte**. Seule la lecture de pixel tranche. (Sprint 62 #414)


## PIT-S62-002 — `page.screenshot({clip})` intersecte le viewport en silence
Toute échelle dérivée de `décodé/clip` devient fausse dès que l'élément touche le bord droit ou bas, et l'accesseur lit un pixel décalé. Mesuré : élément collé au bord bas, lecture « fond adjacent » à +6 px → rend **la couleur de l'élément lui-même**, unanimité **93 %** — donc indétectable par une garde d'unanimité. Clamper le clip sur `page.viewportSize()`, asserter `decoded ≈ clip × devicePixelRatio`, et **lever** au lieu de rabattre un point hors région. Une unanimité haute n'atteste ni de l'échelle ni de la position. (Sprint 62, review cycle 1)


## PIT-S62-003 — Un garde-fou validé par des fixtures supprimées n'est pas armé
S62 : 3 gardes ajoutées à `e2e/support/pixel.ts`, prouvées par des fixtures synthétiques **supprimées avant commit**. Les specs existantes restaient vertes — mais unanimité 100 % et éléments loin des bords : **aucune garde ne se déclenchait sur un cas réel du dépôt**. Toute régression future (seuil inversé, `<` en `<=`, tolérance élargie) serait passée en CI verte. Exiger un test **du garde lui-même**, avec contrôle négatif (sans lui, une garde qui lèverait *toujours* passe). Variante « garde-fou » de [[coverage-check-vert-ne-prouve-rien]]. (Sprint 62, review cycle 2)


## PIT-S62-004 — Retirer un layout d'une route retire AUSSI sa `metadata`
Pas seulement son `<html>`. La 1re passe de #413 a vu le document manquant et **pas** le `<title>` : `NEXT_MISSING_ROOT_TAGS` est bruyant, la perte de `metadata` est **silencieuse**. Après tout déplacement de `<html>`, mesurer le `<title>` **servi**, pas seulement la balise `<html>`. (Sprint 62 #413)


## PIT-S62-005 — Layout racine transparent : Next casse la 404, et deux contournements ne marchent pas
Next **exige** que le layout RACINE rende `<html>`/`<body>` pour servir `/_not-found`. Réduire `app/layout.tsx` à `{children}` (pattern next-intl) donne `NEXT_MISSING_ROOT_TAGS` sur toute URL non matchée. Mesuré inefficaces : `app/not-found.tsx` avec son propre `<html>` (**prérend** correctement mais **n'est jamais servi**) ; attrape-tout `[locale]/[...rest]` + `notFound()` (la route est atteinte mais `notFound()` **échappe** à `[locale]/not-found.tsx`). Seule forme servie : `experimental.globalNotFound` + `app/global-not-found.tsx` — cf. [[PAT-S62-002]]. (Sprint 62 #413)


## PIT-S62-006 — Un écran prérendu hors layout ne peut pas résoudre la locale pendant le rendu
Mismatch d'hydratation garanti sur `lang` **et** sur le texte. Poser la locale en `useEffect` (1er rendu = défaut des deux côtés). La voie `headers()` est interdite : elle sortirait la route du décompte `Generating static pages`. Corollaire : le `<title>` d'une telle page ne peut pas être localisé — `metadata` est résolue au build sur une page **unique** servie pour toutes les locales, sans `params` ni URL. (Sprint 62 #413)


## PIT-S62-007 — Contrôle à `<input>` masqué : le contour `@layer base` est structurellement inopérant
`opacity:0; width:0; height:0` → le contour se peint sur **0×0 px**. Tout composant qui masque son input doit porter le contour du DS sur sa **sœur visible**, sinon il n'a aucun indicateur de focus, quel que soit le token. Grep de détection : `input{...opacity:0...width:0}` + `+ .<classe>` sans `outline`. (Sprint 62 #415)


## PIT-S62-008 — Sur Radix, « désactivé » est un attribut sur un `div`, jamais une propriété DOM
Une garde d'état qui ne teste que `.disabled` (sur `HTMLInputElement`/`HTMLButtonElement`) est **inopérante** sur `Select`/`DropdownMenu`/`Checkbox`/`Switch` : Radix pose `aria-disabled` / `data-disabled`. Et un `Item`/`Group` **ancêtre** désactive ses descendants sans qu'aucune propriété DOM ne le signale → tester `el.closest('[aria-disabled="true"],[data-disabled]')`, pas `el` seul. Sans ça, le 1,59:1 de S58 (mesure sur contrôle désactivé) revient. (Sprint 62, review cycles 1 et 2)


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)


## PIT-S62-011 — Deux runs E2E complets rapprochés ne PEUVENT pas passer
`global-setup` purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de **5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « N did not run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre deux runs. Cousin de [[e2e-cors-origin-proxy-trap]] : sur ce harnais, tout échec de provisioning se déguise en autre chose. (Sprint 62)


## PIT-S62-012 — Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre un serveur SANS le proxy `/api`
`playwright.config.ts` fait `baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, à défaut, lance son propre `webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` : le rewrite `/api/*` n'existe pas, le `POST /api/auth/register` du projet `setup` tombe en **404**, les 4 comptes échouent et **aucun test ne démarre**. Un audit S62 en a conclu « BLOQUANT, régression du code » à tort. **Oracle : `401` sur `/api/auth/me` = proxy OK ; `404` = proxy absent.** Lire l'oracle avant toute hypothèse — cf. [[e2e-cors-origin-proxy-trap]]. (Sprint 62, audit Phase 6)


## PIT-S62-013 — Importer `globals.css` dans un composant testé crache ~5 500 lignes de stderr
jsdom + `css: true`. `vi.mock` de la feuille dans le test. (Sprint 62 #413)


## PIT-S62-014 — Un briefing qui exige de citer un fichier supprimé est infalsifiable
Erreur du lead au S62 : le briefing d'un subagent imposait de lire `briefing-415.md` et d'en citer les marqueurs comme preuve de chargement du context-pack — alors que les briefings venaient d'être **retirés avant l'ouverture de la PR** (convention anti-bloat). Soit l'agent invente les marqueurs, soit il bloque. L'agent a refusé d'inventer et l'a signalé en tête de rapport — bon comportement. Ne pas adosser une preuve de chargement à un artefact que la convention de sprint supprime. (Sprint 62)


## PIT-S63-001 — `locator.count()` n'auto-attend pas : routage responsive en course silencieuse
Router un parcours E2E par `getByTestId('x').count()` crée une course quand la bascule est un `matchMedia` JS. `useMediaQuery` rend **`false` au premier rendu** (SSR-safe) : la frise est DESKTOP avant hydratation. Aux largeurs mobiles le test prenait donc la branche desktop, cliquait la pastille (qui, elle, auto-attend et se résout), puis attendait un `event-drawer-edit` **jamais monté** par `TimelineMobilePortrait`. Parade : résoudre la variante par `matchMedia` **dans la page**, puis **vérifier la racine** de cette variante sous budget court. Famille [[PIT-S61-006]] (grepper les appelants) : le symbole existe, le chemin non. (Sprint 63 #74/#449)


## PIT-S63-002 — `actionTimeout: 0` est le défaut Playwright : une erreur de routage coûte le budget du TEST
Sans budget explicite sur les clics d'un parcours à branches, une attente impossible consomme les **300 s du test**, × `retries: 2`. Le job `e2e` est passé de ~15 min à **42 min** pour 4 tests. Poser un budget par clic fait échouer **vite** et **nommer** le chemin manquant. (Sprint 63 #449)


## PIT-S63-003 — L'outillage de dev bloque le CLIC, pas seulement la MESURE
`.tsqd-parent-container` (React Query Devtools) était exclu des mesures depuis le S59, mais **interceptait les clics** — 42 tentatives repoussées. La CI e2e tourne sur `next dev` : l'outillage est présent. Parade : `pointer-events: none` via `addInitScript`, en le **laissant dans le DOM** pour ne pas invalider l'exclusion de mesure existante. (Sprint 63 #449)


## PIT-S63-004 — Invoquer un pitfall de MÉTRIQUE pour excuser un TIMEOUT est une erreur de catégorie
Erreur du lead au S63 : 4 échecs E2E excusés par [[PIT-S52-001]] (« mesures de largeur non concluantes sur macOS »). Or ce pitfall couvre les écarts de **métrique de police** ; un test qui **expire** n'a produit **aucune** mesure. La cause réelle était un routage responsive faux ([[PIT-S63-001]]). Signal de reconnaissance : l'échec est un `locator.*: Test timeout`, pas un écart de valeur. Refuser ce raisonnement est ce qui a mené au vrai diagnostic. (Sprint 63)


## PIT-S63-005 — Tailwind v4 : `max-[Npx]` compile en `width < N`, pas `<=`
Le palier compact s'arrête donc à `N-1`, et **`N` devient un second creux local** (header `de` : 52 px à 359, **23 px à 360**). Vérifié deux fois (`columnGap` 4/8 px, `paddingLeft` 8/16 px). Une grille de largeurs qui saute de 320 à 375 est **aveugle** à ce creux. Mesurer `N-1` **et** `N` pour tout palier `max-[]`, comme [[PIT-S59-001]] l'exige déjà pour les seuils `min-`. (Sprint 63 #423)


## PIT-S63-006 — Un mock i18n en `${ns}.${key}` rend un namespace FAUX indiscernable d'un juste
`useTranslations('deleteDialog')` (namespace inexistant) et `('common.deleteDialog')` (juste) produisent **le même** résultat de test. Le défaut a survécu plusieurs sprints sous **3 fichiers de tests verts**, et les E2E ne ciblaient que des `data-testid`, jamais du texte. Prévention : tout composant à `useTranslations` doit avoir au moins une assertion sur un **libellé traduit**, via `NextIntlClientProvider` alimenté par les VRAIS messages + collecteur `onError`. (Sprint 63 #441)


## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)


## PIT-S63-008 — « Environnement laissé debout » est une promesse que rien ne tient
Un agent a conclu son rapport par « `next dev` laissé debout, réutilisable » ; sa tâche de fond a été tuée **après** l'envoi, et l'affirmation est devenue fausse sans que rien ne la corrige. Survenu **3 fois** au S63. Prévention : ne jamais promettre un **état** à l'agent suivant — donner la **commande de relance** et un fait **horodaté**. Variante temporelle de [[PIT-S62-009]]. (Sprint 63 #442)


## PIT-S63-009 — Un `test.fail()` laissé comme marqueur de dette fige le périmètre de l'issue suivante
Le S62 avait figé le popover invisible en 2 `test.fail()` sur **un seul widget**. L'issue #446 a donc décrit un défaut de `ui/select` — alors que la cause est un **palier `z` partagé** : `PopoverPicker`, monté dans le même drawer, était cassé à l'identique (46-66 % de panneau mesurés) et absent du périmètre. Corriger le seul `Select` aurait laissé le champ voisin invisible **dans le formulaire qu'on prétendait réparer**. Grepper les **frères du composant** avant d'accepter le périmètre d'une issue de superposition. (Sprint 63 #446)


## PIT-S63-010 — Étendre un matcher de test CSS par inertie fait rougir du CSS sain
#447 demandait d'asserter le focus « des 3 sélecteurs surveillés » — or **aucun** ne porte de règle de focus : les indicateurs vivent sur des sélecteurs **composés frère-adjacent** (`.mt-check input:focus-visible + .mt-check__box`, `core.css:160/172/189`). Réutiliser le matcher exact existant aurait rendu `decls.length === 0` puis fait échouer `toBeGreaterThan(0)` **sur du CSS parfaitement sain**. Grepper la règle **réelle** avant d'étendre. Symétrique de [[PIT-S61-006]]. (Sprint 63 #447)


## PIT-S63-011 — Recette docker jammy : `host.docker.internal` donne 403 CORS sur tout écran authentifié
Le backend fige `localhost:3000` comme origine acceptée. Depuis le conteneur, viser `host.docker.internal:3000` rend **403** ; via un **forwarder TCP** `127.0.0.1:3000 → host.docker.internal:3000`, la requête atteint la logique applicative (400). Invisible pour les audits de **landing** (pages non authentifiées) — d'où sa découverte tardive. (Sprint 63 #74)


## PIT-S63-012 — Balayage `rect.right > clientWidth` : exclure les défileurs, mais surtout PAS `<body>`
La frise produit 9-16 faux positifs par largeur (défilement horizontal légitime). Mais exclure `<body>` est pire : un scroll-lock Radix ouvert y déclare **tout le document** comme « contenu » et **masque l'élément fautif**. (Sprint 63 #74)


## PIT-S63-013 — `unique()` fabrique un faux débordement : jeton de 16 chiffres insécable
`support/products.ts:40` produit un identifiant de 16 chiffres ; rendu dans un `h1`, il déborde de 50-53 px. Un audit a failli « corriger » ce non-défaut. **Signal de reconnaissance : le débordement n'est PAS corrélé à la locale.** Défaut réel adjacent tracé : le `h1` du titre produit n'a pas de `break-words`. (Sprint 63 #74)


## PIT-S63-014 — `scrollLeft` est en pixels : toute échelle variable le périme
Au zoom, l'échelle px/jour change ; le navigateur **rabat** la valeur périmée sur `scrollWidth − clientWidth` et la virtualisation horizontale démonte **toutes** les pastilles (0 dans le DOM, lanes toujours rendues). Mesuré : `31348 / 32330 / 982`. **Règle : une position de défilement mémorisée dans une vue à échelle variable se stocke dans l'unité du DOMAINE (jours), jamais en pixels.** (Sprint 63 #449/#451)


## PIT-S63-015 — Mesurer `scrollLeft` sous `scroll-behavior: smooth` donne des valeurs fantômes
4 lectures contradictoires (4, 16, 17, 17259) pour **deux** écritures identiques à 59677 : les mesures étaient prises **en pleine animation**. Attendre deux lectures consécutives égales avant toute mesure ; poser une position avec `behavior:'instant'` — l'animation est de toute façon rabattue par le clamp avant d'aboutir. Famille [[PIT-S54-003]]. (Sprint 63 #449)


## PIT-S63-016 — Un effet de positionnement en `useEffect(..., [])` réussit sur des données absentes
`computeRange([])` (`zoom.ts:122`) renvoie `min = max = today` puis ±30 j : une étendue **factice mais plausible**. `scrollToToday()` s'exécutait donc au montage **avant l'arrivée des données**, réussissait silencieusement sur cette étendue fausse, et n'était **jamais rejoué**. Résultat mesuré : frise ouverte **13 ans avant aujourd'hui**, **sans aucun symptôme d'erreur**. Keyer un effet de positionnement sur l'**identité des données**, pas sur le montage. (Sprint 63 #449)


## PIT-S63-017 — Les garde-fous à `grep` ne distinguent pas une NÉGATION d'une demande
Deux occurrences au S63. (1) `check-sprint-completeness.sh` a remonté 7 « signaux non traités » : **5 étaient des négations explicites** (« pas de `RECOMMAND_DB_EXPERT` car aucun schéma »), les 2 autres étaient traités. (2) La précondition Phase 9 `grep -q "\[MISSING\]"` aurait abandonné à tort sur les phrases « **Aucun** `[MISSING]` » de l'audit. Un `grep` de jeton lit la présence, jamais l'intention. Vérifier le contexte avant d'agir sur un tel garde-fou. (Sprint 63, clôture) — **S64 : les DEUX se sont reproduits**, et une 3e nuance est apparue : `check-sprint-completeness.sh` teste `ls $SPRINT_DIR | grep <marker>`, donc un **NOM DE FICHIER**, jamais le traitement réel. Un signal parfaitement traité par un AUTRE specialist reste « non traité » ; à l'inverse, un fichier vide nommé `*test-runner*` suffirait à passer. Voie de sortie honnête : reformuler le signal en négation (`Pas de RECOMMAND_X ouvert — clos car …`), jamais renommer un artefact pour tromper le grep.


## PIT-S64-001 — Un `tsc` vert ne prouve RIEN du reporter Playwright
`ReporterDescription` est typé `[string, any]` : `['html', { open: 'jamais' }]` **compile**. Contrôle négatif joué au S64 — `tsc --noEmit` EXIT=0 sur une valeur invalide. Seul un run CI réel atteste qu'un reporter écrit ce qu'on croit. Même famille que « coverage vert ne prouve rien ». (Sprint 64 #461)


## PIT-S64-002 — Greper `playwright-report/index.html` est un faux négatif GARANTI
Le reporter `html` embarque ses données en **base64** dans `<template id="playwrightReportBase64">` (441 Ko décodés → `report.json` + ~32 JSON). Chercher le nom d'un test échoué dans le HTML ne renvoie donc jamais rien, même quand l'échec y est. **Décoder avant de conclure.** (Sprint 64 #461)


## PIT-S64-003 — Un correctif qui agit sur l'ordre d'EXÉCUTION ne corrige jamais une dépendance à l'ordre d'IMPORT
La persistance de `.auth/accounts.json` a été présentée comme le correctif de [[PIT-S47-004]]. Elle ne l'était pas : `dependencies: ['setup']` ordonne l'**exécution**, pas le **moment de l'import du module**, et le projet `setup` étant lui-même `fullyParallel`, le worker qui écrivait le fichier n'était pas celui qui enregistrait les comptes. Mesuré au S64 (4 specs `settings-*` rouges par run dès `workers >= 2`). Le mécanisme d'identité a été refait au S65 (#469) : graine `E2E_RUN_ID` posée avant le fork des workers + résolution paresseuse. **La leçon durable n'est pas la valeur de `workers` mais la forme du raisonnement** — vérifier qu'un correctif agit sur la MÊME dimension que le défaut. (Sprint 64 #465, mécanisme refait S65 #469)

## PIT-S64-004 — Le message « does not work with output: standalone » de `next start` est TROMPEUR
`output: 'standalone'` est **additif** : `.next/standalone/` est produit EN PLUS, et `next start` reste pleinement fonctionnel. Vérifié au S64 sur le build exact : SSG 200, `/fr/nope` 404, chunks JS 200, CSS 200, `favicon.ico` 200, rewrite `/api/*` actif. **Contredit `PIT-S62-009`** qui l'annonçait « non fiable ». Ne pas basculer sur `.next/standalone/server.js` sur la foi de ce message. (Sprint 64 #462)


## PIT-S64-005 — `curl … -w '%{http_code}' || echo 000` CONCATÈNE au lieu de substituer
Le résultat est `000000`, qui passe un test `-lt 500` : une boucle d'attente se croit satisfaite au premier tour et laisse passer un service mort. Mesuré au S64 en écrivant les oracles du job `e2e`. (Sprint 64 #462)


## PIT-S64-006 — `npx <cmd> &` : `$!` capture le WRAPPER, pas le process
`npx` fork un enfant. Un `kill "$PID"` posé sur `$!` tue `npm exec` et **ment** sur ce qu'il arrête ; que l'enfant meure dépend du relais de SIGTERM par npm — un détail d'implémentation, pas un contrat. Utiliser le binaire direct (`./node_modules/.bin/<cmd>`, script à shebang exec'é) pour que `$!` soit le bon PID. (Sprint 64, revue)


## PIT-S64-007 — Un step GitHub Actions dont la dernière commande est `echo >> "$GITHUB_ENV"` NE PEUT JAMAIS ÉCHOUER
Le `echo` rend 0, donc le step sort en succès même si le service lancé juste avant est mort à la seconde 0. Le diagnostic est repoussé au step suivant, qui accuse alors l'attente plutôt que le démarrage (jusqu'à 180 s perdues). Terminer un tel step par un contrôle de vie explicite qui `exit 1`. (Sprint 64, revue)


## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)


## PIT-S64-009 — Les flakes de virtualisation de la timeline DISPARAISSENT quand on les isole
La suite E2E sème une catégorie et un produit par spec **sans nettoyage** et dépasse désormais `LANE_VIRTUALIZATION_MIN_ROWS = 60` (`virtualization.ts:80`) — 76 lanes en CI, 77 en local : la lane semée n'est plus montée dans le DOM. Rejouer la spec seule ne sème qu'une catégorie ⇒ virtualisation inactive ⇒ **le test passe**. Le réflexe d'isolement fait donc disparaître le défaut. C'est une **famille** (le membre qui tombe varie), suivie par l'issue **#467**. (Sprint 64)


## PIT-S65-002 — Un run de mesure lancé en ARRIÈRE-PLAN par un subagent meurt avec sa session — et deux campagnes concurrentes se corrompent en silence
Deux campagnes de mesure de #469 ont été perdues ainsi. (1) Le subagent lançait ses runs en tâche de fond puis rendait la main : les process mouraient avec sa session, **aucun résultat capturé**. (2) Le lead, croyant les runs morts, a lancé les siens **pendant qu'ils tournaient encore** : les deux campagnes écrivaient dans les **mêmes fichiers de log** d'un scratchpad partagé et partageaient `e2e/.auth/` — d'où un faux rouge portant la signature [[PIT-S47-004]] pour une cause qui n'a rien à voir. Diagnostics fautifs du lead à ne pas reproduire : `find -maxdepth 4` trop court pour atteindre le scratchpad (« pas de logs » ≠ « runs morts ») et un `ps` tombé dans l'intervalle entre deux runs. **Parades** : mesurer au premier plan ; répertoire de logs **horodaté unique** par campagne ; et surtout **compter les blocs `Running N tests using M workers` par log — il doit y en avoir exactement 1**. Un log en contenant deux (`231 passed (7.0m)` ET `222 passed / 10 failed (8.2m)`) est la preuve de la concurrence. (Sprint 65 #469)


## PIT-S65-003 — Un listing Playwright `--list` sans `rtk proxy` sort en `PASS (0) FAIL (0)`
Le hook RTK tronque/mal-parse la sortie du listing : le résultat ressemble **exactement** à une suite vide — soit précisément le faux signal que #470 élimine par ailleurs. Préfixer `rtk proxy` pour tout listing Playwright. Même famille que [[PIT-S20-003]] (`git diff` vidé) et [[PIT-S27-002]]. (Sprint 65 #470)


## PIT-S65-004 — Une boucle de poll CI dont la condition de sortie cherche un MOT dans la sortie texte se termine à tort
Une boucle `if ! echo "$OUT" | grep -qE 'pending|queued'` est sortie **dès la 1re itération** sur la réponse `no checks reported on the branch` : juste après un push, les checks n'existent pas encore, la chaîne ne contient donc aucun de ces mots, et l'absence de checks se lit comme « CI stabilisée ». Variante de [[PIT-S55-*]] (watcher muet), mais ici le watcher ment au lieu de se taire. **Ne jamais faire porter la condition sur la présence d'un mot dans une sortie texte** : interroger le STATUT du run pour le SHA exact (`gh run list --json headSha,status --jq 'select(.headSha=="<sha>")'`) et n'accepter que `completed`. (Sprint 65)


## PIT-S65-005 — ÉDITER le corps d'une entrée `PIT-*` existante périme les packs, pas seulement en AJOUTER une
Le job CI **requis** `ai-env-packs` lance `gen-pit-packs.sh --check`. La note connue portait sur l'ajout d'entrées non classées ; en réalité **toute édition du corps d'une entrée existante** périme les packs dérivés. Au S65, `PIT-S47-004` et `PIT-S64-003` réécrits ⇒ `ai-env-packs` rouge en 12 s, découvert **après** l'ouverture de la PR. Réflexe : dès que `docs/memory/pitfalls.md` apparaît dans `git status`, relancer `gen-pit-packs.sh` avant de pousser. Nuance : seules les entrées de sprints **≥ S53** figurent en texte intégral dans les packs (les plus anciennes n'y sont qu'en index de titres) — éditer une vieille entrée peut donc ne produire **aucun** diff de pack tout en faisant échouer `--check` à cause d'une autre. (Sprint 65)


## PIT-S66-001 — Une action centrale peut n'avoir qu'UN déclencheur, logé dans un conteneur `hidden lg:flex` : morte sous le palier, sans aucun test rouge
Au S66 (#455), `setShowCreate(true)` n'avait qu'un appelant, dans l'`<aside className="hidden … lg:flex">` du shell : créer un événement était impossible sous 1024 px depuis le S44, et ni Vitest (jsdom sans layout) ni les E2E desktop ne pouvaient le voir. Un compte d'appelants > 0 ne prouve PAS l'atteignabilité : il faut grepper les appelants d'un `setX(true)` ET remonter leurs conteneurs responsive. Prévention : pour toute action centrale, un E2E qui exerce le palier dans les DEUX sens (borne basse ET borne haute), cf. PAT-S66-001.


## PIT-S66-002 — Une utilitaire Tailwind `duration-*` SEULE arme une transition sur TOUTES les propriétés (`transition-property` initial = `all`)
Au S66 (#79), un panneau portant `motion-safe:duration-200` (posé pour une animation d'entrée) a vu son `max-height` inline s'ANIMER : le DOM montrait `style.maxHeight = "462px"` mais `getComputedStyle` variait d'une lecture à l'autre (683 → 675 → 571 px) et un `!important` inline n'y changeait rien (une transition prime sur l'inline dans la cascade). Cause : `transition-duration` sans `transition-property` explicite → `all`. Fix : restreindre `transition-property` (ici `transform`). Prévention : quand une valeur calculée contredit un style inline, lire `el.getAnimations()` AVANT de chercher un `!important`, et se méfier de toute `duration-*` posée sans `transition-*`.


## PIT-S67-001 — Un « blocage amont non corrigeable » se périme EN SILENCE, et survit dans un commentaire de CI puis dans les énoncés d'issues qui le citent
Au S45, `.github/workflows/ci.yml` a consigné que l'advisory `brace-expansion` était incorrigible en aval : « le seul corrigé est 5.0.8, qui change sa forme d'export ; le forcer casse le lint (`expand is not a function`) ». Vrai à l'époque. Faux ~20 sprints plus tard : une `1.1.18` est sortie sur la branche 1.x, or `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` → elle y entre, la branche 5.x n'est jamais sollicitée, `npm run lint` sort exit 0 avec 0 occurrence de l'erreur. Le verdict avait été recopié tel quel dans l'énoncé de #438, ce qui orientait l'issue vers un arbitrage documentaire (« masquer le signal rouge ? ») au lieu d'une correction : les 8 entrées d'audit étaient TOUTES des patchs in-range, `npm audit` est passé de 8 à 0. Prévention : un blocage amont n'est pas un acquis — il se périme le jour où l'amont publie un patch dans la plage semver DÉJÀ déclarée, et rien ne le signale. Lire les plages dans le lockfile (`packages[].dependencies`) avant de croire un « non corrigeable », et re-tester à chaque sprint plutôt que recopier.


## PIT-S67-002 — Retirer l'`overrides.postcss` de MyTimeline casserait l'étape CI BLOQUANTE : `next` épingle postcss en version EXACTE
`next@15.5.22` déclare `postcss` en `8.4.31` **exact** (version vulnérable, GHSA-r28c-9q8g-f849 / GHSA-6g55-p6wh-862q). Sans l'override qui le hisse en `^8.5.23`, npm recrée un `node_modules/next/node_modules/postcss@8.4.31` imbriqué et `npm audit --omit=dev` — l'étape BLOQUANTE du job CI `security` — repasse de 0 à 2 vulnérabilités de PRODUCTION. Mesuré au S67 sur une copie hors dépôt. L'override `sharp` joue le même rôle. Prévention : ces deux `overrides` sont load-bearing, PAS du bruit à nettoyer ; leur raison d'être est inscrite dans `frontend/package.json` (clé `_overridesRationale`) et `frontend/README.md` § « Overrides npm ». À revoir si un futur bump de `next` change son pin postcss.


## PIT-S67-003 — Le compteur « added N packages » de npm surestime massivement la churn réelle du lockfile
Au S67, `npm` annonçait « 195 / 183 packages added » sur le bump de la chaîne Storybook : de quoi croire à une explosion du lockfile et refuser le changement. La churn réelle, mesurée en diffant les entrées `packages` du lock, était de **15 add / 10 remove** — l'écrasante majorité des « ajouts » sont des binaires de plateforme OPTIONNELS (`@oxc-resolver/binding-*`, `@emnapi/*`) déjà présents au lock. Prévention : juger l'ampleur d'un bump sur le diff du lockfile (add/remove/change + comparaison des majeurs), jamais sur la sortie texte de npm. Corollaire : c'est aussi en diffant le lock qu'on trouve ce que `npm audit fix --dry-run` ne montre pas — au S67, un downgrade subi `oxc-resolver 11.23.0 → 11.21.2` (+19 bindings), absent du relevé `--dry-run` du lead, épinglé en exact par `storybook@10.6.0`.


## PIT-S67-004 — `check-sprint-completeness.sh` lit LIGNE À LIGNE : une négation « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal NON traité
Le hook extrait chaque ligne contenant `RECOMMAND_<SPEC>` et teste la négation (`pas de.{0,5}recommand`, `non applicable`, `aucun`…) sur **cette seule ligne**. Au S67, `issue-438-done.md` portait « …, pas de\n  `RECOMMAND_UI_DESIGN` (aucune surface visuelle). » : le « pas de » étant sur la ligne précédente, le signal a été compté comme actionnable et non traité, bloquant `/sprint end`. Second piège du même hook : il cherche un fichier dont le NOM contient `test-runner` / `db-expert` / `ui-design` **dans `docs/memory/sprints/sprint-N/`** — un test-runner réellement spawné dont le rapport n'est rangé que dans `docs/memory/audits/` reste invisible. Prévention : une négation `RECOMMAND_*` tient sur UNE ligne (un tiret par spécialiste), et le rapport d'un spécialiste spawné se dépose dans le dossier du sprint (convention S61 : `sprints/sprint-61/test-runner-report.md`).


## PIT-S68-002 — La section « RETOMBÉE CI » d'un briefing peut être elle-même périmée : lire le job, pas l'énoncé de la spec
Au S68, le lead a averti l'agent contre la lecture d'énoncés périmés, PUIS a écrit dans le même briefing une section « retombée CI » fausse : elle affirmait qu'`auth-signature.spec.ts` skippe en CI et que le mode dégradé virerait au rouge. Source de l'erreur : le lead a lu l'en-tête § « Conditionnement » de la spec (écrit au S50) au lieu de lire `ci.yml`. Depuis #462/S64, le job `e2e` lance DEUX serveurs Next (`:3000` dégradé, `:3001` vérifiant) encadrés par un oracle `probe_mode` — la spec ne skippe pas, elle tourne contre `:3001`. Le commentaire de spec était périmé de quatre sprints. Prévention : toute affirmation sur le comportement CI se vérifie dans `.github/workflows/ci.yml` à l'instant T, jamais dans un commentaire de code qui le décrit. Même famille que [[upstream-blocker-verdict-expires]] — la « retombée CI » d'un briefing n'est pas une source, c'est une hypothèse à valider.


## PIT-S69-001 — Ajouter un `useQuery` dans un composant testé sans `QueryClientProvider` casse TOUS ses tests : mocker le HOOK, pas envelopper d'un provider
Au S69 (#67), brancher `useRecurrencePreview` (TanStack `useQuery`) dans `EventEditForm` a fait échouer l'intégralité d'`EventEditForm.test.tsx` — le fichier ne monte aucun `QueryClientProvider`. Réflexe coûteux et mauvais : envelopper chaque `render` d'un provider (bruit dans ~45 tests, et on se met à tester TanStack plutôt que le composant). Solution retenue : `vi.mock('@/hooks/useRecurrencePreview')` et piloter le retour test par test — le composant est testé sur ce qu'il FAIT du `data`, pas sur la mécanique de query. **Second piège, dans la foulée** : `vi.clearAllMocks()` (souvent en `beforeEach` global) efface les appels ET les implémentations mais PAS de manière fiable les `mockReturnValue` posés au niveau module — il faut REPOSER le retour par défaut dans un `beforeEach` dédié, sinon un test hérite du `mockReturnValue` du précédent et devient vert/rouge selon l'ordre d'exécution.


## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.

---

## §2 — Index historique (titre = règle ; détail dans docs/memory/pitfalls.md)

- PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
- PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
- PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
- PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
- PIT-S5-004 — Worktree partagé multi-agents (fan-out /sprint, même working tree)
- PIT-S7-001 — jsdom n'exécute pas `window.location.href=` (no-op silencieux)
- PIT-S7-002 — TanStack Query v5 : `staleTime:Infinity` + `initialData` fige la valeur du premier render
- PIT-S7-003 — Logger l'objet axios `error` brut expose le password en clair
- PIT-S8-001 — `next build` CSR bailout : `useSearchParams()` sans `<Suspense>`
- PIT-S8-004 — (orchestration) L'audit tests ne lance PAS `next build`
- PIT-S8-005 — `React.use(params)` (Next async params) incassable en vitest
- PIT-S9-002 — br-auth pack pointe `useAuth.ts` mais la vraie source PII est `AuthContext.tsx`
- PIT-S9-003 — Audit PII : `grep localStorage` seul insuffisant avec TanStack Query
- PIT-S11-001 — Radix Select/Dialog en test Vitest+jsdom : Pointer Capture / scrollIntoView manquants
- PIT-S11-002 — Tester le rejet d'une mutation TanStack v5 en isolation → unhandled rejection au runner
- PIT-S11-003 — Assouplir un schéma Zod (désync DTO) sans auditer les schémas DÉRIVÉS qui l'héritent
- PIT-S14-002 — Architect Phase 0.5 « aucune evidence » faux négatif : lire le fichier cible réel, pas grep du nom d'exception
- PIT-S15-001 — `next dev`/`next build` réécrit `next-env.d.ts` → casse `npm run lint`
- PIT-S15-002 — E2E full-stack cross-port : cookie JWT SameSite=Lax non envoyé sur POST
- PIT-S15-004 — `next build` (ESLint strict) échoue là où vitest+tsc passent ; commitlint header ≤100
- PIT-S16-003 — Codemod `storybook upgrade` laisse des packages périmés dans package.json
- PIT-S16-004 — id généré via compteur module-level → mismatch d'hydratation SSR
- PIT-S17-001 — Migration vers classes DS `.mt-*` : vérifier que `globals.css` importe la feuille DS
- PIT-S17-002 — Concat de classes CSS en template string : l'espace séparateur saute silencieusement
- PIT-S17-003 — Réécriture de composant : un `data-testid`/contenu couvert par E2E mais pas par l'unit se perd silencieusement
- PIT-S18-001 — Migration modèle 1-couleur (BR-EVE-009) : appliquer AUSSI à la vue lecture, pas que le formulaire
- PIT-S19-002 — Imports inutilisés dans un test : vitest vert mais `next build` (eslint strict) rouge en CI
- PIT-S20-001 — Convertir une clé i18n string→objet casse les autres consommateurs (next-intl)
- PIT-S20-002 — Masquer une scrollbar scroll-x : `scrollbar-width:none` seul ne suffit pas sous Chromium
- PIT-S21-002 — Test swipe/pointer sous jsdom : `clientY` des synthetic pointer events = null
- PIT-S21-003 — AuthContext détient son user en useState : `invalidateQueries` ne le rafraîchit PAS
- PIT-S22-002 — Tester le threading d'une prop vers un enfant MOCKÉ : exposer la prop en data-attr
- PIT-S24-001 — `.focus()` seul ne défile pas des conteneurs scrollables imbriqués → `scrollIntoView` explicite
- PIT-S26-001 — Composant `useTranslations` (next-intl) monté au layout RACINE App Router → crash prerender SSG de TOUTES les pages
- PIT-S26-002 — Timeout axios global requalifie les uploads multipart longs en erreur réseau
- PIT-S28-001 — Un `case`-arm de test partagé entre scopes de nature différente = faux vert silencieux
- PIT-S29-001 — RTK tronque/mélange la sortie de `docker compose build/ps`
- PIT-S31-001 — `npm audit fix` tire des majeurs transitifs non voulus
- PIT-S31-002 — Garde ESLint anti-fuite `console.error` : couvrir le mono-arg
- PIT-S33-001 — URL absolue renvoyée par le backend + `apiClient.baseURL` finissant par `/api` → double `/api/api`
- PIT-S33-002 — Liste de locales dupliquée dans N fichiers → 404 silencieux sur les langues non déclarées partout
- PIT-S34-001 — `getRequestConfig({locale})` déprécié en next-intl (utiliser `requestLocale`)
- PIT-S37-003 — E2E : DB dev locale bloquée à une vieille version Flyway → boot backend échoue sur données stale
- PIT-S39-001 — Bordures UI Graphite : les tokens `rule`/`rule-strong` échouent le seuil WCAG AA ≥3:1
- PIT-S40-001 — `git mv` d'un segment de route Next.js → `.next/types/**` périmé → `tsc` TS2307 fantômes
- PIT-S40-002 — Shell client-only enveloppant `children` : la garde auth (redirection incluse) DOIT vivre dans le shell
- PIT-S40-003 — Consolider la nav dans un shell casse les E2E desktop qui cliquaient la nav propre d'un écran (devenue `lg:hidden`)
- PIT-S41-001 — Hitbox a11y `::before` (PAT-S24-002) clippée par un ancêtre `overflow:hidden` → cible < 44px aux bords
- PIT-S41-002 — Flex item + `text-overflow:ellipsis` sans `min-width:0` → ellipsis muette, hard-clip du parent
- PIT-S41-003 — CSS timeline vit dans le design system (`styles/ds/components/`), pas à côté des `.tsx`
- PIT-S41-004 — `./scripts/test-quiet.sh frontend` lancé depuis le repo principal (pas le worktree) → faux échec `eslint-plugin-storybook`
- PIT-S44-001 — `EventCreationRequest` : `durationValue`/`durationUnit` requis MÊME pour `type='single'`
- PIT-S44-003 — `if (!open) return null` ne démonte PAS un composant : l'état interne survit
- PIT-S44-004 — Copier un pattern a11y maison sans reprendre son invariant : `aria-hidden` sur spinner ⇒ état muet
- PIT-S44-005 — Schéma Zod jamais `parse()` : un `superRefine` qui ne protège rien
- PIT-S42-003 — Des `data-testid` en source ne prouvent PAS un flux atteignable
- PIT-S45-001 — Middleware Next : un `Location` RELATIF renvoie 500 (`ERR_INVALID_URL`), build ET tests unitaires VERTS
- PIT-S45-002 — Tester un `config.matcher` Next avec une regex reconstruite à la main : 3 itérations de trou de sécurité
- PIT-S45-004 — `nextUrl.pathname` n'est PAS percent-décodé : toute garde comparant des segments en clair est contournable
- PIT-S45-005 — Vagues parallèles : « prendre le prochain numéro libre » produit des collisions (2× ADR-004)
- PIT-S45-006 — `npm audit fix` : une 2e passe AGGRAVE, et les « fix available » mentent
- PIT-S45-007 — `frontend/.eslintcache` est TRACKÉ par git : tout run eslint pollue le working tree partagé
- PIT-S45-008 — `node_modules` n'est PAS partagé entre worktrees ; setup vitest et `server.deps.inline`
- PIT-S46-001 — Un `data-testid` en dur dans un composant partagé pollue les compteurs E2E des autres surfaces
- PIT-S46-002 — Réutiliser un callback desktop pour un chemin mobile n'hérite PAS de ses protections
- PIT-S46-003 — `DeleteConfirmDialog.onConfirm` transmet un `reassignToCategoryId?: string` à tout callback branché
- PIT-S46-004 — Le gate `[MISSING]` de `/sprint end` grep le littéral : écrire « aucun [MISSING] » bloque la PR
- PIT-S47-001 — Un `find` qui renvoie 0 ne prouve PAS une absence : le cwd du shell persiste entre les appels
- PIT-S47-002 — Le profil `dev` fige `app.cors.allowed-origins=:3000` : un front sur un autre port échoue en accusant le rate-limit
- PIT-S47-003 — La base de dev `eventmanager` est inmigrable : V7 casse sur des données que V9 nettoierait
- PIT-S47-004 — `workers > 1` rougit 4 specs `settings-*` : DEUX causes distinctes, même signature
- PIT-S47-005 — `npm run build` tue le `next dev` en cours, et Next 15.5.22 peut renvoyer un 500 fantôme après recompilation
- PIT-S48-001 — Contraste bi-mode : la contrainte serrée change de fond selon le thème
- PIT-S48-002 — Tailwind v4 scanne les COMMENTAIRES : citer une classe morte la ressuscite
- PIT-S48-003 — `.section-animation { opacity: 0 }` sans repli = landing INVISIBLE, pas « non animée »
- PIT-S48-004 — Changer une URL casse des specs E2E que le grep des `href` ne trouve pas
- PIT-S48-005 — `<Button asChild>` remonte sur le `<a>` des propriétés qui ne s'appliquaient qu'à l'élément interne — DEUX régressions invisibles aux tests
- PIT-S49-001 — Un couple `hover:bg-*` + `hover:text-*` dans un variant partagé est CASSABLE PAR CONSTRUCTION — 4 CTA invisibles en production
- PIT-S49-002 — L'échelle typo du DS Graphite ÉCRASE celle de Tailwind — tout budget de largeur calculé sur les valeurs Tailwind est faux d'un facteur ~2
- PIT-S49-003 — Un grep sur `frontend/src` RATE `frontend/app` (App Router hors `src/`) — le lead a « corrigé » une issue dans le mauvais sens
- PIT-S49-004 — Les panneaux navigateur d'agent mentent : `document.hidden` tue `IntersectionObserver`, et `innerHeight` ≠ `clientHeight`
- PIT-S49-005 — Trois façons dont un test de contraste/rendu passe au VERT à tort
- PIT-S49-006 — Deux agents ont déclaré la stack E2E morte alors qu'elle tournait ; et `test-quiet.sh e2e` contourne le `--workers=1` du runbook
- PIT-S49-007 — Tailwind v4 scanne les fichiers `.test.ts` : un témoin de test peut générer du CSS invalide et mettre l'app en 500
- PIT-S49-008 — Un défaut de contraste peut n'exister QUE dans un état mixte souris + clavier
- PIT-S50-003 — Passer une fonction en `async` casse les call sites de test EN SILENCE
- PIT-S50-004 — `url.host = 'h'` ne supprime PAS le port existant (WHATWG)
- PIT-S50-005 — `openssl … | base64` replie à 76 colonnes sur GNU, pas sur BSD/macOS
- PIT-S50-006 — Un audit documentaire écrit en vague N est périmé par le code de la vague N+1 du MÊME sprint
- PIT-S50-007 — Le hook RTK tronque les SORTIES, pas seulement les diffs : il fausse les MESURES
- PIT-S52-001 — Mesurer un débordement de mise en page sur macOS seul ne prouve RIEN
- PIT-S52-002 — Un port qui répond ne prouve pas que c'est VOTRE process qui répond
- PIT-S52-003 — Un `text-*` posé sur le conteneur d'un composant Radix est hérité, donc cassable
- PIT-S52-004 — L'indicateur de focus n'est pas forcément dans le `className` du composant
- PIT-S52-005 — Sonde `wget localhost` en image alpine : `unhealthy` à vie sur une app qui répond 200
- PIT-S52-006 — Un plan d'architecte peut produire le FAUX négatif de chemin fantôme
- PIT-S52-007 — Le hook RTK décale aussi `git log` (amende PIT-S50-007)


<!-- CACHE_CONTROL_BREAKPOINT -->
<!-- ===== rules-jit/frontend.md ===== -->
<!-- PROVENANCE : copie Layer B de rules-jit/frontend.md du plugin ai-env 0.3.1 (Layer A).
     Source : ~/.claude/plugins/cache/edel-projects/ai-env/0.3.1/rules-jit/frontend.md
     Copie volontaire (et non symlink) : le cache plugin est hors dépôt et versionné 0.3.1.
     À re-differ contre la source à chaque bump du plugin. -->

---
globs: **/*.{ts,tsx}
---

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

# Regles frontend Next.js / TypeScript

## Conventions TypeScript
- TypeScript strict : zero `any`, zero `as` cast non justifie
- Server Components par defaut, `use client` uniquement si necessaire
- `"use client"` inutile sur fichiers type-only (pas de hooks React)
- TanStack Query cote client, fetch natif dans Server Components
- Forms : React Hook Form + Zod
- Style : Tailwind CSS + shadcn/ui UNIQUEMENT

## i18n (BR-17)
- TOUJOURS `useTranslations("namespace")` — jamais de strings FR hardcodees
- `useTranslations("ns")` separe par namespace (next-intl ne supporte pas `t("key", { ns })`)
- Zod schemas : factory function `createSchema(messages)` avec useMemo
- Module-level i18n : separer styles statiques + `buildConfig(t)` function

## Formatage suisse (BR-20)
- TOUJOURS `<locale-constant>` de `@/lib/utils` — jamais `"<locale-code>"` hardcode
- SSR : utiliser `formatSwissNumber()` (deterministe) — jamais `Intl.NumberFormat` inline (hydration mismatch)
- `Intl.DateTimeFormat(<locale-constant>, ...)` pour dates

## Montants (BR-23)
- Tout montant avec code devise ISO 4217
- Utiliser `currency` du type response, jamais hardcoder "CHF"

## Accessibilite
- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`
- Tables : `aria-label` sur `<table>`, `scope="col"` sur `<th>`
- Barres progression : `role="progressbar"` + `aria-valuenow/min/max`
- Boutons : `focus:ring-2 focus:ring-gold-primary`
- Elements interactifs custom (cards, tiles) : `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `focus:ring-2`

## Charts Recharts
- TOUJOURS `useChartTheme()` — JAMAIS de hex inline
- Importer couleurs depuis `tokens.ts` ou `useChartTheme()`
- `Number(value)` pour Tooltip formatter

## Zod / DTO Synchronisation
Voir `.claude/rules-jit/zod-dto-sync.md` pour convention nullable/optional, overlays generes, et checklist obligatoire.
Resume : `.nullable()` pour nullable backend, `.optional()` pour absent, jamais `.nullish()` en code manuel.
- Endpoint pagine : TOUJOURS `paginatedSchema(itemSchema)`, jamais `schema.array()` — sinon `.filter()` crash sur l'objet `{items, total, page, size}`

## Design
- Consulter `la charte de design` et `les design tokens`
- Theme-aware : chaque composant fonctionne en clair ET sombre
- Mock data : format machine-readable, jamais strings FR hardcodees
- Animations : `duration-300` standard

## Tests — zéro warning stderr (MEMO-007)
Tout test livré doit produire un run vitest sans aucune ligne stderr.

- **MockImage** : exclure `priority`, `fill`, `quality`, `placeholder`, `blurDataURL`, `loader`, `unoptimized` du spread `...rest` vers `<img>`
- **`act()` warning** : render avec effets async → test `async` + `await waitFor(() => stableCondition)`
- **Logs d'erreur intentionnels** : `vi.spyOn(console, "error").mockImplementation(() => {})` + `mockRestore()` dans le test qui déclenche volontairement l'erreur (Zod fallback, validation failure, etc.)

## Schemas Zod — source de verite (DEC-029)
- Les schemas generes (`zod.gen.ts`) sont post-traites par `postprocess-zod.mjs` (bigint→number, nullable/optional fix)
- `.nullish()` est ACCEPTE dans le code genere (equivalent a `.nullable().optional()` en Zod 4)
- Tout nouveau schema DOIT re-exporter le genere sauf justification documentee (JSDoc `/** MANUAL — Reason: ... */`)
- Apres `npm run generate:api`, toujours verifier : `npx tsc --noEmit` + `npx vitest run`
- Version @hey-api/openapi-ts pinee (pas de ^) — tester avant chaque upgrade


## Execution tests — wrapper silencieux (optim tokens)

Ne JAMAIS lancer `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` directement dans le contexte agent. L'output (le framework de test frontend verbose + TS errors + Playwright traces) = 20-60 KB par run, multiplies par les iterations de debug.

**Usage obligatoire** :
```bash
./scripts/test-quiet.sh frontend   # le framework de test frontend + tsc --noEmit
./scripts/test-quiet.sh e2e        # Playwright (reset DB inclus)
./scripts/test-quiet.sh unit       # Backend + Frontend
```

wrapper capture tout dans `/tmp/<project-lower>-tests-<timestamp>.log` et renvoie :
- Recap le framework de test frontend (`Test Files N failed | N passed`, `Tests N passed`)
- Top 10 fichiers `FAIL src/...`
- Compte d'erreurs TS + 5 premieres
- Playwright : `N passed / N failed / N flaky` + top 10 echecs

Pour debug precis d'un test frontend, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), ne JAMAIS re-run `npx vitest run <fichier>` dans le contexte.

**Pour suites lourdes (Playwright full + vitest + tsc)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il isole l'output et retourne <=500 tokens au lead.

Reference : audit tokens 2026-04-24 — verbosite tests = cause #2 saturation contexte apres reviews multi-agent.

<!-- ===== rules-jit/ux-patterns.md ===== -->
# UX Patterns — interactions clavier & a11y (référentiel de validation)

> Référentiel des patterns d'interaction attendus pour la Vue Timeline et, par
> extension, les composants riches (drawers, listes navigables) de MyTimeline.
> Source de vérité = code livré #81 (commit `518aa86`) + briques #55/#192.
> Sert de checklist à `ui-design` pour trancher « conforme / réserves levées ».
>
> Statut : chaque pattern est marqué **[LIVRÉ]** (implémenté + testé),
> **[PARTIEL]** (implémenté, couverture ou robustesse à compléter) ou
> **[PRÉVU]** (spécifié, non implémenté).

---

## 1. Region landmark (repère de navigation) — [LIVRÉ]

La frise est un `<section role="region">` explicite avec :
- `aria-label` descriptif (`dashboard.timeline.region.label`, i18n — jamais de FR hardcodé) ;
- `aria-describedby` pointant une aide clavier `sr-only` (`#timeline-region-desc`) lue à l'entrée dans la région.

Effet voulu : VoiceOver / NVDA annoncent la frise comme repère navigable et
rappellent les raccourcis à l'entrée.

Réf. code : `TimelineView.tsx` `<section role="region" …>` + `<p id="timeline-region-desc" className="sr-only">`.
Réf. test : `TimelineView.test.tsx` « expose la frise comme région landmark ».

---

## 2. Roving tabindex — [LIVRÉ]

**PAT-S24-roving-resource-keyed** (pattern a11y canonique de la frise).

Règle : dans une grille dont les items apparaissent/disparaissent (collapse de
catégorie, filtre), **UN SEUL** arrêt de tabulation. La pastille active porte
`tabIndex=0`, toutes les autres `tabIndex=-1`. Conséquence voulue : la frise ne
« piège » pas le Tab (des dizaines d'events = 1 stop) → les actions primaires de
la page restent atteignables au clavier.

Contrainte d'implémentation (le cœur du pattern) :
- l'état actif est **keyé par ID stable** (`{ resourceId, evt }`), **JAMAIS par un index brut de lane** ;
- l'index de coordonnée (lane) est **dérivé à la volée** via une `Map<resourceId, laneIndex>` ;
- les handlers de navigation restent en coordonnées `(lane, evt)` — non réécrits.

Anti-pattern (régression MAJEUR-2 corrigée) : stocker `{ lane, evt }` en index
bruts dans le state. Au collapse d'une catégorie AU-DESSUS, `navLanes` rétrécit →
l'index mémorisé glisse silencieusement vers une AUTRE ressource.

Fallback : `activeNav = null` → la 1re pastille non vide devient l'arrêt par défaut.

Réf. code : `TimelineView.tsx` `activeNav` / `laneIndexByResource` / `rovingNav` / `firstNav`.
Réf. test : « roving tabindex : UNE seule pastille focusable », « la pastille active
reste focusable après collapse », « MAJEUR-2 : le roving suit la RESSOURCE ».

---

## 3. Navigation flèches (déléguée par la pastille) — [LIVRÉ]

Déléguée par `EventPill.onKeyDown` → `TimelineView.onPillKeyDown(e, lane, evt)`.
Lanes collapsées EXCLUES (pastilles non rendues → non focusables). Les lanes
vides sont sautées (`nextNonEmptyLane`).

| Touche | Comportement |
|--------|--------------|
| `→` | pastille suivante DANS la lane ; aux extrémités, déborde sur la 1re pastille de la lane non vide suivante |
| `←` | pastille précédente DANS la lane ; aux extrémités, déborde sur la dernière pastille de la lane non vide précédente |
| `↓` | lane non vide suivante, **index de colonne conservé** et **clampé** (`Math.min(evt, len-1)`) |
| `↑` | lane non vide précédente, colonne conservée + clampée |
| `Home` | 1re pastille de la 1re lane non vide (global) |
| `End` | dernière pastille de la dernière lane non vide (global) |
| `Entrée` / `Espace` | ouvrent le drawer **NATIVEMENT** (`<button>`) — aucun handler custom → pas de double-ouverture |

Chaque touche gérée fait `e.preventDefault()`. Après déplacement, le focus est
posé ET **`scrollIntoView({ block:'nearest', inline:'nearest' })`** est appelé
explicitement (cf. §7).

Réf. code : `TimelineView.tsx` `onPillKeyDown` + `focusNav`.
Réf. test : « ↓ déplace le focus vers la lane suivante, ↑ revient », « End … Home … »,
« Entrée sur une pastille ouvre le drawer ».
Couverture à compléter (§9) : `←`/`→` inter-lanes non couverts par un test dédié.

---

## 4. Focus-trap du drawer — [LIVRÉ]

Le `EventDrawer` (`role="dialog"` + `aria-modal="true"` + `aria-label`) piège le focus :
- **focus initial** sur le 1er focusable (bouton fermer) à l'ouverture ;
- **Tab / Shift+Tab** bouclent dans le panneau (dernier→premier / premier→dernier), `preventDefault` aux bornes ;
- sélecteur focusables : `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` ;
- à la fermeture (unmount), **restauration du focus** sur l'élément déclencheur (`previousFocus`).

Fermeture **Échap** : gérée par le PARENT (`TimelineView`, handler global — cf. §5),
priorité au drawer. Le drawer ne gère QUE le trap + le focus initial/restauré.

Réf. code : `EventDrawer.tsx` `useEffect` (trap Tab, focus init, restore).
Réf. test : « ouvre le drawer … puis le ferme avec Échap », « ferme le drawer via le bouton fermer ».
Couverture à compléter (§9) : le cyclage Tab/Shift+Tab et la restauration de focus
ne sont pas couverts par un test unitaire dédié.

---

## 5. Raccourcis clavier globaux — [LIVRÉ]

Handler `keydown` sur `window`. Gardes :
- ignore si un champ a le focus (`INPUT` / `TEXTAREA` / `isContentEditable`) ;
- **Échap traité AVANT la garde de saisie** (ferme même depuis un champ) ;
- n'intercepte PAS les combinaisons OS/navigateur (`metaKey` / `ctrlKey` / `altKey`) →
  Cmd+F / Ctrl+F restent la recherche navigateur.

| Touche | Action | Statut |
|--------|--------|--------|
| `T` / `t` | aller à aujourd'hui (`GO_TO_TODAY` + recentrage scroll) | [LIVRÉ] |
| `[` | période précédente (`PREV_PERIOD`) | [LIVRÉ] |
| `]` | période suivante (`NEXT_PERIOD`) | [LIVRÉ] |
| `+` / `=` | zoom avant | [LIVRÉ] |
| `-` | zoom arrière | [LIVRÉ] |
| `F` / `f` | plein écran (toggle) | [LIVRÉ] |
| `Échap` | ferme le drawer (priorité), sinon sort du plein écran | [LIVRÉ] |

**Aide raccourcis — hover/focus-only PAR DÉCISION (option B, S41 #227)** :
`?` n'est **PAS** un raccourci clavier et il n'existe volontairement PAS de
`case '?'` dans le handler global. La surface d'aide est un **tooltip**
(`.mt-tlv__help-pop`, `role="tooltip"`) affiché au **hover/focus** du bouton `?`
de la toolbar. Ce choix est acté (pas d'écart, pas de dialog déclenché au clavier).

Réf. code : `TimelineView.tsx` `useEffect(onKey …)` + bloc `.mt-tlv__help`.
Réf. test : « le raccourci "+" zoome », « le raccourci "F" ne hijacke pas Cmd/Ctrl+F ».
Couverture à compléter (§9) : `T`, `[`, `]`, `-` non couverts par un test dédié.

---

## 6. Annonces `aria-live` (polite) — [LIVRÉ]

Région `sr-only` `role="status"` `aria-live="polite"` `aria-atomic="true"`.
Une seule string, la dernière écriture gagne. Annonce :
- le **niveau de zoom** à chaque changement (silencieux au montage : pas d'annonce
  parasite, garde `lastAnnouncedZoom` contre le double-invoke StrictMode) ;
- l'**event sélectionné** à l'ouverture du drawer.

Réf. code : `TimelineView.tsx` `liveMessage` + effets zoom/selected.
Réf. test : « aria-live annonce le changement de zoom », « … l'event sélectionné ».

---

## 7. Focus + scroll (piège jsdom) — [LIVRÉ]

**PIT-S24-scrollintoview-focus** : `.focus()` seul ne défile pas fiablement des
conteneurs scrollables imbriqués (lanes vertical + rail horizontal). Toujours
appeler `node.scrollIntoView({ block:'nearest', inline:'nearest' })` APRÈS
`.focus()`. jsdom n'implémente pas `scrollIntoView` → **stub requis dans
`vitest.setup.ts`** (déjà présent) sinon les tests clavier throw.

Réf. code : `TimelineView.tsx` `focusNav`.

---

## 8. Label a11y agrégé de la pastille — [LIVRÉ]

`EventPill` porte un `aria-label` riche construit par `buildEventAriaLabel`
(titre + statut + dates + produit + récurrence — BR-EVE-006/012). Le texte visuel
interne est décoratif (`aria-hidden`, le bouton porte déjà l'annonce). Garde-fou
contraste (BR-EVE-009) : si le libellé ne passe pas AA 4.5:1 DEDANS, un libellé
extérieur décoratif (`aria-hidden`) est rendu à côté.

Réf. code : `EventPill.tsx` + `lib.ts` `buildEventAriaLabel` / `eventLabelReadableInside`.
Réf. test : « le bloc event expose un aria-label riche », bloc « garde-fou contraste ».

---

## 9. Écarts connus vs code livré #81 & suivi

- **Aide `?` — TRANCHÉ (option B actée, S41 #227)** : l'aide reste en tooltip
  hover/focus uniquement (`.mt-tlv__help-pop`) PAR DÉCISION. `?` n'est pas un
  raccourci clavier et a été retiré de la liste des raccourcis (§5). Pas de
  `case '?'` à câbler, pas de follow-up ouvert.
- **`EventPill.tsx:100`** — `<span aria-hidden="true">{event.title}</span>` reste
  `aria-hidden` **même quand c'est le seul texte visible** (cas contraste OK, pas
  de libellé extérieur). Aujourd'hui inoffensif : l'`aria-label` du bouton couvre
  le titre pour les lecteurs d'écran. Statut : **écart MINEUR toléré** (pas de
  perte d'info a11y). Correctif trivial possible (retirer `aria-hidden` quand
  `readableInside`) mais non requis → RECOMMAND_FOLLOWUP (facultatif).
- **Couverture de tests à compléter** (non bloquant) : `←`/`→` inter-lanes,
  cyclage Tab/Shift+Tab du drawer + restauration de focus, raccourcis `T`/`[`/`]`/`-`.

---

## 10. Checklist ui-design (validation Timeline)

- [ ] region landmark présent + aria-label/description i18n
- [ ] un seul `tabIndex=0` parmi les pastilles (roving)
- [ ] roving keyé par ID stable (pas d'index brut en state)
- [ ] flèches ←→↑↓ + Home/End + Entrée/Espace natif
- [ ] focus-trap drawer + restauration focus au close
- [ ] raccourcis T/[/]/+/-/F/Échap ; garde saisie + garde modificateurs
- [ ] aria-live polite (zoom + sélection), silencieux au montage
- [ ] `scrollIntoView` après focus
- [ ] écarts §9 tracés (issue de suivi ou décision actée)


## Dependances intra-sprint
- **Tu es la VAGUE 1.** L'issue #325 (vérification visuelle de la mini-frise en
  clair/sombre) est la vague 2 et sera lancée APRÈS toi, sur ton résultat. Elle
  vérifiera l'aperçu **à sa position finale** — donc celle que tu livres.
- Conséquence : ne laisse pas l'aperçu dans un état visuellement provisoire. Si tu
  sais qu'un écart visuel subsiste, écris-le explicitement dans ton `RETOUR` — il
  deviendra une entrée de la checklist de #325 au lieu d'une découverte tardive.
- Fichiers que #325 touchera très probablement : `timeline.css` (bloc `.mt-evt--preview`
  et voisins) et `EventPreviewTimeline.tsx`. Tu peux les modifier — tu passes en premier.

## Designer
Non applicable (pas de nouveau composant : repositionnement d'un composant existant).
La spéc EST le handoff §6, cité dans le HEAD. **Ne réinvente pas le rendu de l'aperçu**,
c'est le périmètre de #325.

## Contraintes

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Tu travailles dans un worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Piège mesuré sur ce
  projet : un subagent peut défaut-`cwd` sur le dépôt principal et produire un faux KO
  (fichier « introuvable », diff vide). Garde-fou : `git rev-parse HEAD` doit rendre
  `fd954b2a0e0f1ff7eb45adae619618776108dbe4` (ou un descendant, si tu as déjà commité).
- Branche : `claude/sprint-70-start-b946cb` (déjà checkout, == `origin/dev`).
  **Convention projet : PAS de branche `sprint/70`.** Ne la crée pas.
- `frontend/node_modules` est **ABSENT** dans ce worktree (`PIT-S69-002`). Si
  `./scripts/test-quiet.sh frontend` échoue sur un préflight d'environnement,
  **ce n'est PAS une suite rouge** — ne conclus pas à une régression. Installe
  (`cd frontend && npm ci`) ou dis-le dans ton retour.
- **`git diff` est avalé par le proxy RTK** sur ce poste (sortie ~vide, trompeuse).
  Utilise `rtk proxy git diff …`, ou `git show --stat`, ou dump-vers-fichier + lecture.
  Idem : `git log` peut rendre une sortie mal filtrée — `git rev-parse` est fiable.

### Code
- Commit : **1 commit logique**, message gitmoji en **français**.
  `git add` **CIBLÉ** sur tes fichiers — **jamais `git add -A`** (le working tree est
  partagé, un autre agent peut y écrire).
- Code en anglais, commentaires/docs en français (convention projet).
- Réutilise le pattern portal existant (`footerPortalNode`) plutôt que d'inventer un
  second mécanisme, **sauf** si tu démontres qu'il ne convient pas — auquel cas explique
  pourquoi dans le commit et le retour.
- Zéro couleur littérale, zéro `z-index` littéral : tokens DS uniquement.
- Ne touche PAS : `backend/**`, `db/migration/**`, `frontend/e2e/**` (sauf si tu ajoutes
  une spec — voir ci-dessous), `frontend/src/components/EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*` (surfaces d'édition hors périmètre).

### Tests — OBLIGATOIRE
- Tests unitaires : `NewEventDrawer.test.tsx` et/ou `EventEditForm.test.tsx` doivent
  couvrir le nouveau positionnement (présence du nœud sticky en `mode="create"`,
  **absence** en mode édition — c'est la preuve de non-régression des 3 surfaces
  partagées).
- ⚠ **Un test jsdom ne prouve RIEN sur un comportement de scroll ou de sticky**
  (`jsdom` ne calcule aucune mise en page ; `getComputedStyle` y rend des valeurs
  déclarées, pas rendues). Si ta livraison repose sur un effet de `position:sticky`
  réellement observable, **il faut un E2E Playwright** qui mesure la position du nœud
  après scroll du corps du drawer. Précédents à copier : `frontend/e2e/support/contrast.ts`,
  `sprint-62-control-focus-contrast.spec.ts`, `landing-cta-contrast.spec.ts`.
- Recette E2E locale : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`
  (4 pièges non devinables — CORS, base `eventmanager_e2e`, port `:3100`, workers).
  Elle tourne réellement en local. Si tu ne peux pas la lancer, dis-le, ne prétends pas.
- Tout nouveau `data-testid` ajouté dans un `.tsx` DOIT être cité dans une spec de
  `frontend/e2e/` (le check de couverture du sprint échouera sinon). ⚠ Ce check vérifie
  seulement que le testid est **cité** — pas que la spec passe. Ne t'en contente pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA, ...]
- resume: <objectif + BR touchées + fichiers clés + pièges rencontrés + tests>
- **fichiers de contexte lus:** <liste EXACTE des fichiers de contexte que tu as
  réellement ouverts (chemins), avec pour CHACUN un ancrage vérifiable — l'identifiant
  du dernier pitfall lu, un numéro de ligne, une citation courte>. Cette ligne est
  **obligatoire** et sera auditée : le Sprint 69 a livré sans pouvoir prouver que les
  archives pointées avaient été lues. Si tu n'as pas lu un fichier pointé, écris-le.
- tests: <commandes lancées + résultat chiffré ; « non lancé » si non lancé, jamais de
  supposition>
- ecarts_visuels_connus: <ce que tu SAIS ne pas être conforme au handoff §6 après ton
  changement — sert de checklist à l'issue #325, vague 2>
- [MEMORY:*] signaux: <pitfall / pattern / decision, si applicables>
- recommandations suite: <RECOMMAND_FOLLOWUP / RECOMMAND_UI_DESIGN / … OU négation
  explicite « Pas de RECOMMAND_X car … »>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
