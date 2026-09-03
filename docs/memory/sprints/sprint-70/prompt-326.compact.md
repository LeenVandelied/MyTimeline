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

<!-- ===== pit-frontend.md (POINTEUR, non recopié) ===== -->

## Archive de pièges frontend — LECTURE OBLIGATOIRE, par pointeur

Le fichier `.ai-env/context-packs/pit-frontend.md` (≈ 90 Ko, versionné, chemin stable
dans CE worktree) n'est pas recopié ici : le recopier ferait transiter ~45 K tokens
DEUX fois par le contexte du lead pour une pure duplication d'un fichier que tu peux
ouvrir toi-même.

**Ordre de lecture imposé :**
1. `.ai-env/context-packs/pit-frontend.md` — cherche EN PRIORITÉ les entrées portant sur :
   `sticky`, `z-index` / `--z-modal` / `--z-sticky`, `portal`, `drawer`, `sheet`,
   `scroll`, `jsdom`, `EventEditForm`, `overflow`.
2. `docs/design/graphite-handoff.md` §6 (ligne 197) — la spéc.
3. `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — si tu écris un E2E.

⚠ Ce pointeur n'est pas contraignant techniquement : c'est TOI qui garantis la lecture.
C'est exactement la faiblesse consignée à la clôture du Sprint 69 (« impossible de
prouver que l'agent a ouvert l'archive pointée »). D'où la ligne **`fichiers de contexte
lus`** exigée dans ton livrable, avec un ancrage vérifiable par fichier. Elle SERA
auditée.

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
