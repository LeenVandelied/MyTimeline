[BRIEFING ISSUE #69 — Sprint 49, vague 1]

## ⚠ AVANT TOUT — ancrage d'exécution (lire en premier, ne pas sauter)

Tu travailles dans un **worktree git**, PAS dans le dépôt principal.

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
```

**Fais ce `cd` explicitement en tout début de session**, avant toute commande. Un subagent qui
part sur `/Users/herrh/VSProjects/MyTimeline` lit un autre arbre de fichiers et produit un faux KO.

Garde-fou à exécuter et à vérifier avant d'écrire la moindre ligne :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
git branch --show-current   # DOIT afficher : sprint/49
git rev-parse HEAD          # base de départ : 92c14c4e32f6549b19efe6b925271f89b2b99747
```

Si la branche n'est pas `sprint/49` → **STOP**, retourne `STATUS: PARTIAL` avec `BLOQUE_SUR: mauvaise branche`.

**Piège outillage connu :** `git diff` renvoie une sortie ~vide sous le proxy RTK de ce poste.
Utilise `rtk proxy git diff` ou redirige vers un fichier puis lis-le. Ne conclus jamais
« aucun changement » depuis un `git diff` vide.

## Issue

**#69 — [FEATURE] Frontend : virtualisation de la Timeline (>1000 événements)**
Labels : `epic:events`, `feature`, `priority:P1`, `size:L`, `sprint-49`

### Contexte (corps d'origine)

Le composant `TimelineCalendar` calcule les positions de toutes les lanes et de tous les événements en
une seule passe, sans virtualisation. Pour les power users qui accumulent plusieurs centaines à milliers
d'événements, ce comportement entraîne des temps de rendu élevés, des freezes d'interface et une
dégradation générale de l'expérience. La scalabilité de la vue Timeline est une condition de viabilité à
long terme du produit (BR-EVT-001).

### À faire

- **Mesure baseline** : instrumenter le rendu actuel (React DevTools Profiler ou `performance.mark`) pour
  quantifier le problème avant toute optimisation.
- **Virtualisation des lanes** : ne monter dans le DOM que les lanes visibles dans la fenêtre + un buffer
  haut/bas.
- **Virtualisation des événements** : à l'intérieur de chaque lane visible, ne monter que les événements
  dans la plage temporelle visible (axe horizontal).
- **Budget de rendu** : définir un seuil cible (ex. < 16 ms par frame pour 1000 événements) et valider
  par mesure après implémentation.
- **Cohérence a11y** : les nœuds focusables (navigation clavier, lecteur d'écran) doivent rester cohérents
  quand des nœuds sont montés/démontés par la virtualisation.

### Critères d'acceptation

- [ ] Mesure baseline documentée (temps de rendu initial et scroll pour 500 et 1000 événements)
- [ ] Avec 1000 événements, le rendu initial tient sous le budget défini (< 16 ms par frame ou seuil convenu)
- [ ] Le scroll vertical et horizontal ne provoque pas de freeze visible (60 fps cible)
- [ ] Les événements hors viewport ne sont pas dans le DOM
- [ ] La navigation clavier entre événements fonctionne sans sauter d'événement visible
- [ ] Les annonces lecteur d'écran (rôles, labels) ne régressent pas par rapport à l'état pré-virtualisation
- [ ] Les tests existants passent sans modification (ou sont mis à jour **avec justification écrite**)

### Librairies candidates (du corps d'issue, à arbitrer par toi)

`@tanstack/react-virtual` (windowing 2D, léger, sans opinion de layout) ou `react-window` (plus simple, 1D).
Approche recommandée par l'issue : axe vertical (lanes) d'abord, puis axe horizontal si nécessaire.
Pour l'a11y : `aria-rowcount` / `aria-rowindex` pour informer les lecteurs d'écran du nombre réel de lignes
même non montées ; conserver le focus via `tabIndex` géré dynamiquement.

## 🚨 PÉRIMÈTRE CORRIGÉ — la piste technique de l'issue est PÉRIMÉE

**Ne code PAS sur `TimelineCalendar.tsx`.** Le corps de l'issue le désigne comme cible : c'est **faux**.
Ce fichier (114 lignes) est **mort depuis le Sprint 42**. Vérifié au grep par le lead le 2026-07-28
sur `92c14c4` : les 4 seules références restantes sont **des commentaires et un readme** —
`TimelineEditHost.tsx:21`, `lib.ts:6`, `index.ts:3`, `ds/readme.md:35`. **Aucun import, aucun montage.**
`TimelineEditHost.tsx:21` le documente noir sur blanc : « monté uniquement via `TimelineCalendar` →
`Lane` → `EventBar`, que PLUS AUCUNE page ne rend » (régression S17).

Virtualiser `TimelineCalendar` = **8 points livrés sur du code mort, zéro gain**.
Le périmètre a été corrigé par commentaire sur l'issue GitHub le 2026-07-16.

**Vrai chemin de rendu :** `TimelineEditHost` → `TimelineResponsive` → `TimelineView.tsx` (desktop)
/ `TimelineMobilePortrait.tsx` / `TimelineMobileLandscape.tsx`.

`TimelineCalendar.tsx` est candidat à la suppression, mais **par une issue dédiée** — **n'y touche pas ici**,
ne l'absorbe pas.

## Plan d'implémentation (mini-plan, ancrage vérifié sur `92c14c4` le 2026-07-28)

```yaml
issue_69:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"            # vérifié, 708 l. — VRAIE cible desktop
    - "frontend/src/components/timeline/zoom.ts"                     # vérifié, 323 l. — calcul des positions, type PositionedEvent
    - "frontend/src/components/timeline/lib.ts"                      # vérifié, 280 l. — buildEventsByResource, getDaysRange
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx"  # vérifié, 267 l.
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx" # vérifié, 287 l.
    - "frontend/src/components/timeline/Lane.tsx"                    # vérifié, 62 l.
    - "frontend/src/components/timeline/lib-a11y.test.ts"            # vérifié, 103 l. — filet a11y à NE PAS casser
    - "frontend/package.json"                                        # vérifié : AUCUNE dép de virtualisation (grep 'virtual' = 0 hit)
    - "frontend/src/components/calendar/TimelineCalendar.tsx"        # vérifié : 114 l., MORT — NE PAS Y TOUCHER
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    La virtualisation démonte des nœuds focusables → `lib-a11y.test.ts` + la navigation clavier de
    `TimelineView` sont le filet de sécurité. Les faire passer n'est pas optionnel.
    Filet E2E disponible et à faire passer : `frontend/e2e/timeline.spec.ts` (21.4K) et
    `frontend/e2e/timeline-mobile.spec.ts` (15.5K), livrés au Sprint 47 précisément pour valider ce
    travail. Sans eux la virtualisation se validerait à l'aveugle — utilise-les.
  ordre_ecriture: "mesure baseline (performance.mark) → choix lib (ADR) → TimelineView → vues mobiles → mesure après → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — aucune dép de virtualisation, positions calculées en une passe dans zoom.ts.)"
```

## Livrable documentaire attendu en plus du code

Un **ADR** justifiant le choix de librairie (`@tanstack/react-virtual` vs `react-window` vs virtualisation
maison), à ranger avec les ADR existants du projet (cherche `ADR-00*` sous `docs/` pour le format et
l'emplacement exacts — le S48 a produit `ADR-006-route-canonique-landing`, prends le suivant).
Y consigner : la mesure **baseline** et la mesure **après**, avec la méthodologie, sinon le critère
d'acceptation n°1 n'est pas rempli.

## Triage

Taille: L
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

Tu es en **vague 1**, lancé **en parallèle** de deux autres subagents :
- **#335** — travaille sur `frontend/src/styles/landing.css` + `frontend/src/styles/animations.css`
- **#336** — travaille sur `frontend/src/styles/ds/components/core.css` + 5 composants de formulaire
  (`EventEditForm.tsx`, `ConflictDialog.tsx`, `NewEventDrawer.tsx`, `StateScreen.tsx`, `BottomSheet.tsx`)

Ces périmètres sont **disjoints du tien** — vérifié au grep. Mais l'arbre de travail git est **partagé**.

### Règles de commit en arbre partagé (impératif)

- **`git add` CIBLÉ sur tes fichiers uniquement. JAMAIS `git add -A`, JAMAIS `git add .`** — tu
  emporterais le travail en cours des deux autres subagents dans ton commit.
- Un seul commit logique, message gitmoji en français.
- Ne fais **aucun** `git rebase`, `git reset`, `git stash`, ni `git checkout` d'un autre fichier.
- Le SHA que tu liras via `git rev-parse HEAD` juste après ton commit peut déjà avoir bougé (course
  entre subagents). Rapporte le SHA **de ton commit** (`git log -1 --format=%H -- <un de tes fichiers>`),
  et signale si tu as un doute plutôt que d'affirmer.

### Fichiers formellement INTERDITS pour toi

- `frontend/src/styles/landing.css` et `frontend/src/styles/animations.css` (→ #335)
- `frontend/src/styles/ds/components/core.css` (→ #336)
- `frontend/src/styles/ds/tokens/colors.css` — **lecture seule** pour tout le monde ce sprint
- `frontend/src/components/calendar/TimelineCalendar.tsx` — code mort, hors périmètre
- `frontend/src/components/landing/**` (→ #334, vague 2)

`frontend/package.json` est **à toi seul** sur ce sprint (aucun autre subagent n'ajoute de dépendance).

## Designer

Non applicable — aucun changement de charte visuelle attendu. La virtualisation doit être
**visuellement transparente** : à nombre d'événements égal, le rendu doit être identique avant/après.
C'est d'ailleurs un bon critère de validation.

## Contraintes

- **Branche cible : `sprint/49`** (déjà checkout dans le worktree, vérifie-le — cf. garde-fou en HEAD)
- **Commit :** 1 commit logique, gitmoji, message en **français**
- **Code en anglais, documentation et commits en français** (convention projet)
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore` non justifié
- **Tests obligatoires, inline :**
  ```bash
  ./scripts/test-quiet.sh frontend   # Vitest unitaires
  ./scripts/test-quiet.sh e2e        # Playwright (nécessite la stack complète)
  ```
  Les scopes valides sont : `unit`/`backend` (défaut), `frontend`, `e2e`, `all`.
  Ce sprint est **100 % frontend** — ne lance pas la suite backend, elle exige Docker et ne t'apprendra rien.
- Si le volume de tests dépasse ~500 ou 3 min : signale `RECOMMAND_TEST_RUNNER` plutôt que d'attendre.
- **i18n :** tout texte affiché passe par `next-intl`, jamais en dur (locale principale `fr`).
- **Pas de migration Flyway** sur cette issue (`zod_dto_sync: NON`, zéro fichier backend).

### ⚠ Piège de vérification propre à ce sprint (mémoire projet, S48)

**« CI verte » ne prouve pas que la page est correcte.** Au Sprint 48, 2 CTA invisibles (contraste
1.00:1) et 1 bouton tronqué sont passés à travers une CI entièrement verte : `jsdom` ne résout **ni la
précédence des `@layer` CSS ni aucune mise en page réelle**. Pour une issue de **rendu** comme la tienne,
les tests unitaires ne peuvent pas te dire si la frise s'affiche.

⇒ **Valide dans un vrai navigateur** avant de déclarer terminé : monte la frise avec un jeu de données
volumineux, vérifie que les événements hors viewport sont absents du DOM, que le scroll ne saute pas,
et que la navigation clavier atteint bien chaque événement visible. Rapporte ce que tu as **mesuré**,
pas ce que tu supposes.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA, ...]
- resume: <objectif atteint + BR touchées + fichiers clés + pitfalls rencontrés + résultat des tests>
- mesures: baseline (500 / 1000 evts) vs après — chiffres réels, pas d'estimation
- lib retenue: <nom + version> + n° ADR écrit
- [MEMORY:*] signaux: <pitfall / pattern / décision / bug — si applicables>
- recommandations suite: <RECOMMAND_* ou piège subtil découvert ; ou "aucune" explicitement>
- RECOMMAND_FOLLOWUP: <découvertes NON-XS hors périmètre, avec triage estimé ; ou "aucun">
- ABSORBED: <découvertes XS que tu as corrigées au passage ; ou "aucune">
- STATUS: COMPLETED   ← en TOUTE DERNIÈRE LIGNE (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

Écris ce retour tel quel. La dernière ligne doit être exactement `STATUS: COMPLETED` ou
`STATUS: PARTIAL` — le lead la lit programmatiquement pour détecter les crashs de subagent.

**Sois factuel sur ce qui manque.** Si un critère d'acceptation n'est pas rempli, dis-le et dis pourquoi.
Un `PARTIAL` honnête vaut mieux qu'un `COMPLETED` qui masque un critère non tenu.
