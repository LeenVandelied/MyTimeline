[BRIEFING ISSUE #331 — Sprint 54, vague 1]

## ⚠ AVANT TOUT — cwd et HEAD (garde-fou worktree, leçon S45+)

Tu tournes dans un **worktree git**, pas dans le dépôt principal. Ta première commande DOIT être :

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990 && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `claude/sprint-54-start-8ee5a7`, HEAD `68a924c` (ou un descendant si la vague a déjà commité).
**Si tu vois autre chose (ex. `main`, `dev`, ou un chemin `/Users/herrh/VSProjects/MyTimeline` sans `.claude/worktrees/`), ARRÊTE et signale-le** — tu es dans le mauvais arbre de travail et tout ce que tu mesureras sera faux.

Toutes les commandes suivantes utilisent des chemins **relatifs à ce worktree**.

## Issue

**#331 — [FEATURE] Exposer des data-testid sur les SelectItem Radix**
Labels : `enhancement`, `epic:events`, `priority:P2`, `size:S`, `frontend`, `sprint-54`

### Contexte
Certains menus déroulants de l'application (choix du produit dans le panneau de création d'événement, choix de l'unité de récurrence — semaine/mois/année — dans le formulaire d'édition) n'ont pas d'identifiant de test stable sur leurs options. Les tests automatisés qui doivent cliquer sur une option précise sont donc obligés de la désigner par sa **position dans la liste** (« la 2e option ») plutôt que par son nom. Si l'ordre des choix change un jour dans l'interface, ces tests continueront de s'exécuter mais cliqueront sur la mauvaise option, sans qu'aucune alerte ne se déclenche — une régression silencieuse.

### À faire
Les composants `SelectItem` de la bibliothèque Radix UI utilisés dans le sélecteur de produit (drawer de création) et le sélecteur d'unité de récurrence (`EventEditForm`) n'exposent aucun `data-testid`. Vérifié dans la source Radix : la prop `value` est déstructurée en interne et n'est pas répercutée sur les attributs DOM du composant rendu — il n'existe donc aucun moyen de la récupérer côté test sans ajout explicite.

Ajouter des `data-testid` de la forme `…-option-<value>` sur ces `SelectItem`, sur le modèle de ce qui existe déjà pour `product-category-option-*`.

### BR impactées
Aucune.

### Critères d'acceptation
- [ ] Les options du sélecteur de produit exposent un `data-testid` de la forme `product-option-<value>` (ou équivalent cohérent avec `product-category-option-*`)
- [ ] Les options d'unité de récurrence dans `EventEditForm` exposent un `data-testid` de la forme `recurrence-unit-option-<value>` (WEEK/MONTH/YEAR)
- [ ] Les specs E2E concernées ciblent désormais ces options par `data-testid` plutôt que par index (`.nth(n)`)

### Risques techniques (énoncé de l'issue)
Aucun — ajout non intrusif de `data-testid`, sans impact fonctionnel ni visuel.

## Plan d'implémentation (architect, /sprint plan — **emplacements re-vérifiés par le lead au démarrage, aucune dérive de ligne**)

```yaml
issue_0331:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/e2e/timeline.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Aucun — ajout d'attributs non intrusif. Le risque réel est de NE PAS le faire : un réordonnancement des options fait cliquer les tests sur la mauvaise valeur, sans alerte."
  ordre_ecriture: "Suivre la convention existante ProductDrawer.tsx `product-category-option-${id}`."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ⚠ CHEMIN : `EventEditForm.tsx` est à la RACINE de `frontend/src/components/` (PAS components/events/).
    SelectItem WEEK/MONTH/YEAR aux lignes 436-438, sans data-testid.
    Sélecteur produit : NewEventDrawer.tsx:215-217, sans data-testid.
    Ciblage fragile confirmé : timeline.spec.ts:221 `.getByRole('option').nth(1).click()`.
```

### Mesures du lead (2026-07-29, HEAD `68a924c`) — à prendre comme point de départ, pas comme parole d'évangile

- `frontend/src/components/EventEditForm.tsx` contient **10 occurrences** de `SelectItem`, réparties en **trois** `<Select>` distincts :
  - lignes **290-291** : type d'événement (`duration` / `single`)
  - lignes **334-337** : unité de durée (`days` / `weeks` / `months` / `years`)
  - lignes **436-438** : **unité de récurrence** (`WEEK` / `MONTH` / `YEAR`) ← **le seul visé par le critère d'acceptation**
  L'issue ne demande QUE le troisième. Si tu juges que les deux autres méritent le même traitement, c'est une **décision à justifier et à signaler**, pas à prendre en silence : ils ne sont couverts par aucun critère d'acceptation, et un `data-testid` posé au hasard sur `days`/`weeks`/`months`/`years` **collisionnerait sémantiquement** avec `recurrence-unit-option-*` (`weeks` vs `WEEK`). Choisis des préfixes qui ne se marchent pas dessus, ou abstiens-toi et signale en `RECOMMAND_FOLLOWUP`.
- `frontend/src/components/events/NewEventDrawer.tsx:215-217` : `<SelectItem key={product.id} value={product.id}>` — la valeur est un **id** (pas un libellé), donc le testid sera `product-option-<uuid>`, pas `product-option-<nom>`. Vérifie que c'est bien exploitable côté spec (une spec qui connaît le nom du produit mais pas son id ne gagne rien).
- `frontend/e2e/timeline.spec.ts:221` : `await page.getByRole('listbox').getByRole('option').nth(1).click()` — **seule** occurrence de `.nth()` sur une option de `<Select>` dans les 18 specs de `frontend/e2e/`. Les lignes **213** et **216** portent le commentaire qui explique pourquoi ; il devra être mis à jour ou supprimé, pas laissé à mentir.
- Autres usages d'options dans les specs, ciblés **par nom accessible** (`getByRole('option', { name: … })`) et donc **déjà robustes** : `categories.spec.ts:137`, `settings-preferences.spec.ts:30,37,48,52,62`, `timeline.spec.ts:205,289`. **Ne les réécris pas** — le critère ne porte que sur le ciblage par index.
- **Vérifie toi-même la référence `product-category-option-*`** avant de la copier : je ne l'ai pas ouverte. L'architect la situe dans `ProductDrawer.tsx`. Si le chemin ou la forme diffèrent, dis-le dans ton retour (les chemins fantômes de plans architectes ont coûté 4 sprints consécutifs sur ce projet).

## Triage
Taille: S
Modèle: opus
Effort: medium

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

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

- **#329 tourne EN PARALLÈLE de toi**, sur `frontend/e2e/auth.setup.ts` **uniquement**. Ne touche pas ce fichier.
- **#330 démarrera APRÈS toi** et consommera les `data-testid` que tu poses (18 specs E2E de la frise). Ta convention de nommage est donc un **contrat** : nomme-la clairement dans ton retour, elle sera recopiée dans le briefing de #330.
- Vous partagez **un seul working tree**. Conséquence dure : **`git add` ciblé fichier par fichier, JAMAIS `git add -A` / `git add .`** — tu embarquerais le travail en cours de l'autre agent dans ton commit.

## Designer

Non applicable — aucun changement visuel (ajout d'attributs DOM uniquement).

## Contraintes

- **Branche cible** : `claude/sprint-54-start-8ee5a7` (déjà checkout dans le worktree, ne change PAS de branche).
- **Commit** : 1 commit logique, message gitmoji **en français**, référençant `(#331)`.
  Exemple de forme : `:white_check_mark: test(e2e): expose des data-testid sur les options de <Select> (#331)`
- **Code en anglais, docs/commentaires/commits en français** (convention projet).
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore`.
- **i18n** : les libellés affichés passent par `next-intl`. Un `data-testid` ne doit **jamais** dériver d'un libellé traduit (il changerait avec la locale) — dérive-le de la `value`.

### Tests — obligatoire, et le vert doit être MESURÉ

Lance ce que tu peux et **rapporte les nombres réels**. « Ça devrait passer » n'est pas un résultat.

1. **Unitaires frontend** (rapide, sans stack) :
   ```
   cd frontend && SKIP_DELEGATION=1 npx vitest run --silent
   ```
   ou `./scripts/test-quiet.sh frontend` depuis la racine si le script accepte ce scope.

2. **E2E de la spec impactée** — c'est le seul vrai juge de ton critère 3. **Lis d'abord `docs/memory/sprints/sprint-47/e2e-local-runbook.md` en entier.** Résumé des 4 pièges qui t'enverront sur une fausse piste :
   - `:3000` peut être squatté par le `next-server` d'un **autre projet** → lancer le front sur **`:3100`** et passer `PLAYWRIGHT_BASE_URL`.
   - Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` → un **403 CORS** sur `POST /api/auth/register` se **déguise en « rate-limit register 5/min/IP »** dans le message de `auth.setup.ts`. Override obligatoire au lancement du backend.
   - Utiliser la base **`eventmanager_e2e`** (migrée V15), **jamais** `eventmanager`.
   - **`--workers=1` impératif** en local : au-delà, 4 specs `settings-*` rougissent pour une raison qui n'a rien à voir avec le code (deux pid génèrent deux identités de compte).

   Commandes (issues du runbook) :
   ```
   cd backend && SKIP_DELEGATION=1 ./mvnw --batch-mode --no-transfer-progress -DskipTests package
   ```
   ```
   cd backend && SPRING_PROFILES_ACTIVE=dev,e2e DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local RATE_LIMIT_ENABLED=false java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
   ```
   ```
   cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3100
   ```
   ```
   cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test timeline.spec.ts --workers=1 --reporter=line
   ```
   `SKIP_DELEGATION=1` est requis (le hook `warn-test-delegation.sh` bloque `npx playwright test` sans lui).

   ⚠ **Ne lance PAS `npm run build` ni `build-storybook` pendant qu'un `next dev` tourne** : ils réécrivent `.next` sous ses pieds et le tuent (`ENOENT … _buildManifest.js.tmp`). Sur un worktree partagé par plusieurs agents, c'est le mode d'échec le plus vicieux.

   ⚠ **Suite entièrement rouge dès le `setup`** → `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/fr/register`. Si 500 : bug de manifeste du serveur de dev Next 15.5.22, **pas ton code** → redémarrer `next dev`. (C'est exactement le problème que #329 traite en parallèle.)

3. **Si tu ne parviens pas à lever la stack** : dis-le explicitement, ne le maquille pas. Rapporte ce que tu as tenté et l'erreur exacte. Un « E2E non exécuté » honnête vaut mieux qu'un vert supposé.

### Pièges de mesure sur ce projet

- **`git diff` renvoie ~vide** sous le hook RTK. Utilise `rtk proxy git diff`, ou redirige vers un fichier et lis-le. Ne conclus pas « aucun changement » sur une sortie vide.
- Les tests **jsdom ne prouvent rien sur le comportement navigateur** (scroll, layout, cascade CSS). Ici l'enjeu est un attribut DOM, donc jsdom suffit pour l'existence de l'attribut — mais pas pour affirmer que la spec E2E clique au bon endroit.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris ton retour ainsi, et **rien d'autre** :

```
RETOUR #331
commits: [<SHA court>]
convention_testid: <la forme exacte posée, ex. product-option-<id> / recurrence-unit-option-<VALUE>> — CONTRAT pour #330
fichiers: <liste chemin:lignes>
tests:
  - unit frontend: <N passed / M failed>  (ou NON EXÉCUTÉ + raison)
  - e2e timeline.spec.ts: <N passed / M failed> (ou NON EXÉCUTÉ + raison)
premisses_infirmees: <toute affirmation du briefing que le code contredit — chemin, numéro de ligne, convention. Écris "aucune" si rien.>
pack_lu: OUI — <nom du pack> §<titre de section RÉELLE que tu as lue>
[MEMORY:pitfall|pattern|decision] <si applicable>
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L] (ou "aucun")
RECOMMAND_TEST_RUNNER / RECOMMAND_SECURITY / RECOMMAND_DB_EXPERT / RECOMMAND_UI_DESIGN : <ou négation explicite, ex. "pas de RECOMMAND_SECURITY : aucun changement d'authentification ni de donnée personnelle">
STATUS: COMPLETED
```

Dernière ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` précédé d'une section `BLOQUE_SUR:` détaillée).
