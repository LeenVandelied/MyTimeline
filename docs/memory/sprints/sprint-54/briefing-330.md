[BRIEFING ISSUE #330 — Sprint 54, vague 2]

## ⚠ AVANT TOUT — cwd et HEAD (garde-fou worktree, leçon S45+)

Tu tournes dans un **worktree git**, pas dans le dépôt principal. Ta première commande DOIT être :

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990 && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && pwd
```

Attendu : branche `claude/sprint-54-start-8ee5a7`, HEAD `2e0dbaa` (ou un descendant), pwd contenant `.claude/worktrees/sprint-52-start-252990`.
**Si tu vois `main`, `dev`, ou un pwd sans `.claude/worktrees/` : ARRÊTE et retourne `STATUS: PARTIAL` + `BLOQUE_SUR: mauvais worktree`.**

Tu es **seul** sur l'arbre de travail cette fois (la vague 1 est terminée et commitée). Pas de risque de collision avec un autre agent.

## Issue

**#330 — [FEATURE] Couvrir les 18 data-testid de la frise encore sans spec E2E**
Labels : `enhancement`, `epic:events`, `priority:P2`, `size:M`, `frontend`, `sprint-54`

### Contexte
Le Sprint 47 avait pour objectif de combler 3 trous précis de couverture de tests automatisés sur la frise (timeline), et les a effectivement comblés. Mais la frise contient encore 18 éléments d'interface identifiables (boutons, overlays, panneaux…) qui n'ont pas de test automatisé dédié. Ce n'est pas une régression introduite par le Sprint 47 : ces éléments n'étaient déjà pas couverts avant, et le sprint ne visait pas leur couverture.

### À faire (énoncé d'origine — **voir la correction obligatoire plus bas, le compte de 18 est faux**)
Écrire des specs E2E (Playwright) pour les `data-testid` de la frise encore sans couverture :

`desktop-edit-trigger`, `mobile-delete-trigger`, `timeline-actionsheet-overlay`, `timeline-drawer`, `timeline-drawer-close`, `timeline-drawer-overlay`, `timeline-event-outside-label`, `timeline-fullscreen`, `timeline-help`, `timeline-landscape-drawer-overlay`, `timeline-live-region`, `timeline-loading`, `timeline-minimap-viewport`, `timeline-sheet-grabber`, `timeline-sheet-overlay`, `timeline-today`, `timeline-weekend`, `timeline-zoom-out`

Exclus du décompte par l'issue : `timeline-edit-host-stub` et `timeline-responsive-stub`, qui sont des doublures RTL déclarées dans des `*.test.tsx`.

Cette issue peut être découpée en plusieurs sous-tâches par lot fonctionnel (drawer, overlays d'actions, contrôles de zoom/aide, minimap, états de chargement) plutôt que traitée d'un bloc.

### BR impactées
Aucune.

### Critères d'acceptation (énoncé d'origine)
- [ ] Chacun des 18 `data-testid` listés est exercé par au moins une spec E2E
- [ ] Les 2 testids exclus (`timeline-edit-host-stub`, `timeline-responsive-stub`) restent hors périmètre
- [ ] Le rapport de couverture des testids de la frise (§4 de l'audit) passe à 0 écart restant après cette issue

### Risques techniques (énoncé de l'issue)
Périmètre large : risque de sous-estimation si traité comme une seule tâche atomique — envisager un découpage en lots fonctionnels plutôt qu'une PR unique.

---

# ⚠⚠ CORRECTION OBLIGATOIRE DU PÉRIMÈTRE — la cible est **16**, pas 18

Le lead a vérifié les 18 un par un avant de te briefer. **Deux d'entre eux ne sont pas des éléments d'interface** : ce sont des doublures RTL, du même type exact que les deux que l'issue exclut déjà — et déclarées **dans le même fichier**.

| Faux positif | Seules occurrences dans tout le dépôt (hors `docs/`) |
|---|---|
| `desktop-edit-trigger` | `frontend/src/components/timeline/TimelineEditHost.test.tsx:72` (déclaration du stub) et `:224` (clic RTL) |
| `mobile-delete-trigger` | `frontend/src/components/timeline/TimelineEditHost.test.tsx:63` (déclaration) et `:131,148,163,179,194,212,240` (clics RTL) |

Ils n'apparaissent **nulle part** dans `frontend/src/**/*.tsx` de production, ni dans `frontend/app/`. Le vrai composant `TimelineEditHost.tsx` n'expose qu'un seul testid : `timeline-edit-dialog`.

**La chaîne de preuve est dans le dépôt, et elle montre une régression d'audit :**
- `docs/memory/audits/sprint-46-test-coverage.md:47` écrit noir sur blanc : « **2 faux positifs** — `mobile-delete-trigger` et `timeline-responsive-stub` sont des **stubs de test** définis dans `TimelineEditHost.test.tsx`, pas des testids de production. »
- `docs/memory/audits/sprint-47-test-coverage.md` §4 — **source de la liste des 18 reprise par l'issue** — exclut bien `timeline-edit-host-stub` et `timeline-responsive-stub` au motif que ce sont « des doublures RTL déclarées dans des `*.test.tsx` », mais **réintègre** `desktop-edit-trigger` et `mobile-delete-trigger`, qui répondent au même critère et vivent dans le même fichier. Le S47 a donc **perdu** la conclusion du S46.

**Conséquence pour toi : le critère d'acceptation n°1 tel qu'écrit est inatteignable par construction.** On ne peut pas écrire de spec Playwright pour un testid qui n'existe que dans un `*.test.tsx` — le navigateur ne le rendra jamais.

**Ce que tu fais :**
1. Tu couvres les **16 testids réels**.
2. Tu **ne fabriques pas** d'élément d'interface pour satisfaire la liste, et tu ne renommes rien dans `TimelineEditHost.test.tsx`.
3. Tu documentes les 2 exclusions **avec la chaîne de preuve ci-dessus** (S46 → régression S47), pour que le prochain audit ne les réintègre pas une troisième fois.
4. Si en vérifiant tu trouves que **je me trompe** — par exemple un de ces deux testids existe dans un composant de production que je n'ai pas vu —, dis-le et couvre-le. Vérifie, ne me crois pas sur parole.

### Les 16 testids réels et leur composant source (mesuré par le lead, HEAD `2e0dbaa`)

| Testid | Fichier source |
|---|---|
| `timeline-drawer` | `frontend/src/components/timeline/EventDrawer.tsx` |
| `timeline-drawer-close` | `frontend/src/components/timeline/EventDrawer.tsx` |
| `timeline-drawer-overlay` | `frontend/src/components/timeline/EventDrawer.tsx` |
| `timeline-landscape-drawer-overlay` | `frontend/src/components/timeline/TimelineLandscapeDrawer.tsx` |
| `timeline-actionsheet-overlay` | `frontend/src/components/timeline/TimelineActionSheet.tsx` |
| `timeline-sheet-overlay` | `frontend/src/components/timeline/TimelineBottomSheet.tsx` |
| `timeline-sheet-grabber` | `frontend/src/components/timeline/TimelineBottomSheet.tsx` |
| `timeline-zoom-out` | `TimelineMobilePortrait.tsx` **et** `TimelineMobileLandscape.tsx` |
| `timeline-today` | `TimelineMobilePortrait.tsx` **et** `TimelineMobileLandscape.tsx` |
| `timeline-weekend` | `TimelineMobilePortrait.tsx` **et** `TimelineMobileLandscape.tsx` |
| `timeline-help` | `frontend/src/components/timeline/TimelineView.tsx` |
| `timeline-fullscreen` | `frontend/src/components/timeline/TimelineView.tsx` |
| `timeline-live-region` | `frontend/src/components/timeline/TimelineView.tsx` |
| `timeline-minimap-viewport` | `frontend/src/components/timeline/Minimap.tsx` |
| `timeline-event-outside-label` | `frontend/src/components/timeline/EventPill.tsx` |
| `timeline-loading` | **`frontend/app/[locale]/(app)/timeline/page.tsx:47`** ⚠ |

⚠ **`timeline-loading` n'est PAS sous `frontend/src/`** — l'app router de ce projet est `frontend/app/`. Un `grep` limité à `frontend/src/` conclut à tort qu'il n'existe pas (le lead est tombé dedans en préparant ce briefing). C'est aussi le seul testid **d'état transitoire** de la liste : il n'est visible que pendant le chargement, ce qui en fait le plus délicat à exercer de façon déterministe — pense à `page.route()` pour retarder la réponse plutôt qu'à une course contre le rendu.

## Plan d'implémentation (architect, /sprint plan — lots à corriger du fait des 2 faux positifs)

```yaml
issue_0330:
  fichiers_cles:
    - "frontend/e2e/timeline.spec.ts"
    - "frontend/e2e/timeline-mobile.spec.ts"
    - "frontend/src/components/timeline/TimelineView.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "18 testids traités comme une PR atomique = dérive garantie ; l'issue elle-même recommande le découpage par lot fonctionnel."
  ordre_ecriture: "3 lots : (a) drawer/overlays — timeline-drawer, -close, -overlay, -landscape-drawer-overlay, -actionsheet-overlay, -sheet-overlay, -sheet-grabber ; (b) contrôles — timeline-zoom-out, -help, -fullscreen, -today, -weekend ; (c) minimap/états — timeline-minimap-viewport, -loading, -live-region, -event-outside-label, desktop-edit-trigger, mobile-delete-trigger. Un lot = un commit."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non couvert. Le lead a re-vérifié les 18 (pas l'échantillon de 8 de l'architecte) :
    0 spec E2E pour CHACUN. Les 18 specs de frontend/e2e/ n'en exercent aucun.
```

**Le lot (c) de l'architecte contient les 2 faux positifs** — retire-les, il tombe à 4 testids. Le découpage en 3 commits reste bon : garde-le.

## Contrat de nommage livré par #331 (vague 1, commit `9791d61`) — **disponible sur ton HEAD**

```
product-option-<uuid>                      (valeur = product.id ; seedProduct retourne l'id, tu l'as donc en main)
recurrence-unit-option-<WEEK|MONTH|YEAR>   (valeur = enum BR-EVE-006)
```

`frontend/e2e/timeline.spec.ts:219` utilise déjà `getByTestId('recurrence-unit-option-MONTH')`. **N'écris plus aucun `.nth(n)` sur une option de `<Select>`** — c'est précisément la fragilité que la vague 1 vient de supprimer.

## Ce que la vague 1 a changé pour toi (et qui n'est pas dans l'issue)

`#329` a réparé `frontend/e2e/auth.setup.ts` (commit `515ab87`). Deux conséquences directes :
- **Le retry 429 documenté depuis le S47 ne fonctionnait pas** : le backoff (8 s + 20 s = 28 s) dépassait le budget Playwright par défaut (30 s), donc la 2ᵉ tentative expirait toujours — mesuré 4/4 provisions en `Test timeout of 30000ms exceeded`, sans diagnostic. `PROVISION_TIMEOUT_MS = 150_000` a été ajouté. **Si tu ajoutes un `waitForTimeout` de backoff dans une spec, pose un `test.setTimeout()` explicite** — sinon ton retry et son message d'échec sont tous deux inatteignables.
- **Baseline mesurée après la vague 1 : la suite E2E complète passe à 108 passed / 0 failed / 0 skipped en 154 s** (`--workers=1`). Toute spec rouge après ça est imputable à ton travail, pas à l'existant. C'est ton point de référence.

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

- **Vague 1 terminée et commitée** (`9791d61` #331, `515ab87` #329). Tu es seul sur l'arbre de travail — pas de collision possible.
- Tu **consommes** le contrat de testid de #331 (cf. section dédiée en tête de briefing). Ne le renomme pas.
- Tu es la **dernière vague d'implémentation**. Après toi : audit de couverture, review batch, PR.

## Designer

Non applicable — tu écris des specs, tu ne touches pas au rendu. **Si tu te retrouves à devoir modifier un composant pour rendre un élément testable, ARRÊTE et signale-le** : ce serait un élargissement de périmètre à arbitrer, pas une décision d'agent. Le mini-plan de l'architecte cite `TimelineView.tsx` dans `fichiers_cles` ; les 16 testids **existent déjà tous**, donc tu ne devrais avoir aucune raison de l'éditer. Si tu l'édites quand même, dis pourquoi.

## Contraintes

- **Branche cible** : `claude/sprint-54-start-8ee5a7` (déjà checkout, ne change PAS de branche).
- **3 commits, un par lot** (recommandation de l'architecte ET de l'issue). Gitmoji, messages **en français**, chacun référençant `(#330)` :
  - lot (a) drawer / overlays — 7 testids
  - lot (b) contrôles — 5 testids
  - lot (c) minimap / états — 4 testids (les 2 faux positifs retirés)
- **`git add` fichier par fichier**, jamais `git add -A`.
- **Code en anglais, commentaires/docs/commits en français**.
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore`.

### Qualité des specs — ce qui distingue une couverture réelle d'un cochage de case

C'est le cœur du sujet, et c'est là qu'une issue « 16 testids à couvrir » se rate le plus facilement.

- **Une spec qui fait `expect(getByTestId('timeline-help')).toBeVisible()` et rien d'autre ne couvre rien.** Elle prouve que l'élément est dans le DOM, pas qu'il **fait** quelque chose. Pour chaque testid, exerce le **comportement** : le bouton d'aide ouvre un panneau ; l'overlay du drawer le **ferme** au clic ; `timeline-zoom-out` **change** le niveau de zoom (`timeline-zoom-level` existe, sers-t'en comme oracle) ; `timeline-today` **ramène** le viewport sur aujourd'hui ; `timeline-minimap-viewport` **se déplace** quand on scrolle la frise.
- **`timeline-live-region`** est une région ARIA : ce qui compte est son **contenu textuel après une action**, pas sa présence. Une live region vide est un bug d'accessibilité qu'une assertion de présence ne verrait pas.
- **`timeline-weekend`** : vérifie qu'il y en a le **bon nombre** sur la fenêtre affichée, pas qu'il en existe au moins un.
- **`timeline-event-outside-label`** (`EventPill.tsx`) n'apparaît que quand le libellé ne tient pas dans la pastille. Il faut donc une **fixture qui produit cette condition** — un événement court avec un nom long, ou un zoom arrière. Si tu n'arrives pas à la provoquer, dis-le plutôt que d'assouplir l'assertion.
- **`timeline-loading`** est un état transitoire. Une assertion qui court contre le rendu sera **flaky**. Utilise `page.route()` pour retarder la réponse et rendre l'état observable de façon déterministe.
- **Mobile** : `timeline-sheet-*`, `timeline-actionsheet-overlay`, `timeline-landscape-drawer-overlay`, et les variantes portrait/paysage de `timeline-today`/`-weekend`/`-zoom-out` n'existent qu'à certaines tailles d'écran. `frontend/e2e/timeline-mobile.spec.ts` est le fichier de référence pour ce style (viewport, rotation). `timeline-zoom-out`/`-today`/`-weekend` sont déclarés dans **deux** composants (portrait ET paysage) — une spec sur une seule orientation ne couvre qu'une moitié ; dis laquelle tu couvres.

**Un test qui passe alors que le comportement est cassé est pire que pas de test** : il crée une fausse assurance. Sur ce projet, une vérification navigateur verte a déjà raté 28 titres en régression au S53 — l'échantillon avait été choisi par commodité, pas par risque. Choisis tes assertions par le risque.

### Tests — obligatoire, et le vert doit être MESURÉ

**Lis `docs/memory/sprints/sprint-47/e2e-local-runbook.md` en entier avant la première spec.** Les 4 pièges qui t'enverront sur une fausse piste :

- `:3000` peut être squatté par le `next-server` d'un **autre projet** → front sur **`:3100`** + `PLAYWRIGHT_BASE_URL`.
- Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` → un **403 CORS** sur `POST /api/auth/register` se **déguise en « rate-limit register »**. (Le message a été amélioré par #329 : il rapporte désormais les statuts réellement observés. Lis-le, il te dira la vraie cause.)
- Base **`eventmanager_e2e`** (migrée V15), **jamais** `eventmanager`.
- **`--workers=1` impératif** en local, sinon 4 specs `settings-*` rougissent sans rapport avec ton code.

Commandes :
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
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=1 --reporter=line
```
`SKIP_DELEGATION=1` est requis (le hook `warn-test-delegation.sh` bloque `npx playwright test` sans lui).

⚠ **Ne lance PAS `npm run build` ni `build-storybook` pendant qu'un `next dev` tourne** : ils réécrivent `.next` sous ses pieds et le tuent (`ENOENT … _buildManifest.js.tmp`).

⚠ **Suite entièrement rouge dès le `setup`** → `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/fr/register`. Si 500 : bug de manifeste du serveur de dev Next 15.5.22, **pas ton code** → redémarrer `next dev`.

**Ce que tu dois rapporter** : le compte de la suite **complète** (baseline post-vague-1 = **108 passed / 0 failed**), et le compte de tes nouvelles specs. Une régression sur les 108 est imputable à toi. Si tu ne parviens pas à lever la stack, dis-le explicitement avec l'erreur exacte — un « E2E non exécuté » honnête vaut mieux qu'un vert supposé.

### Pièges de mesure sur ce projet

- **`git diff` renvoie ~vide** sous le hook RTK. Utilise `rtk proxy git diff`, ou redirige vers un fichier et lis-le. Ne conclus pas « aucun changement » sur une sortie vide.
- **Les tests jsdom/RTL ne prouvent RIEN sur le scroll ni le layout** : jsdom ne clampe pas `scrollLeft` (on y écrit 400, on relit 400). Toute assertion de scroll, de position ou de dimension doit être E2E. Et sur un E2E rouge lié au scroll, **vérifie d'abord l'arithmétique de ta fixture** avant d'accuser le code (leçon S51).
- **Sur un E2E rouge, va chercher le statut HTTP réel et le log du serveur** avant de conclure sur le texte de l'erreur Playwright. Le message peut accuser la mauvaise cause — c'est exactement le bug que #329 vient de corriger.

### Vérification finale attendue

Avant de rendre, prouve la couverture par la mesure, pas par la relecture. Pour chacun des 16 :

```
for t in <les 16 testids>; do
  n=$(grep -rl -- "$t" frontend/e2e/ 2>/dev/null | wc -l)
  printf "%-36s specs=%s\n" "$t" "$n"
done
```

⚠ Tu tournes sous **zsh** : une variable non quotée **n'est pas découpée en mots** (le lead s'est fait piéger en préparant ce briefing — la boucle a traité les 18 testids comme une seule chaîne et a répondu « 0 partout »). Écris la liste littéralement dans le `for`, ou utilise un tableau.

`specs=0` sur un des 16 = critère non tenu. Colle cette sortie dans ton retour.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR #330
commits: [<SHA lot a>, <SHA lot b>, <SHA lot c>]
couverture: 16/16 (ou X/16 + lesquels manquent et pourquoi)
preuve_couverture: <la sortie de la boucle de vérification, 16 lignes>
faux_positifs_confirmes: desktop-edit-trigger, mobile-delete-trigger — <CONFIRMÉS stubs RTL / INFIRMÉ + où tu les as trouvés en production>
specs_creees: <fichiers + nb de tests>
comportements_exerces: <pour les 3-4 testids les plus délicats (loading, live-region, event-outside-label, minimap-viewport) : QUOI est asserté, pas seulement "couvert">
tests:
  - suite e2e complète: <N passed / M failed / K skipped> vs baseline 108/0/0
  - mes nouvelles specs: <N passed / M failed>
  - unit frontend: <N passed / M failed> (si touché)
orientations_couvertes: <portrait / paysage / desktop — pour zoom-out, today, weekend qui existent en double>
composants_modifies: <aucun, j'espère — sinon lesquels et POURQUOI>
premisses_infirmees: <toute affirmation du briefing que le code contredit. "aucune" si rien.>
pack_lu: OUI — <nom du pack> §<titre de section RÉELLE que tu as lue>
[MEMORY:pitfall|pattern|decision] <si applicable>
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L] (ou "aucun")
RECOMMAND_TEST_RUNNER / RECOMMAND_SECURITY / RECOMMAND_DB_EXPERT / RECOMMAND_UI_DESIGN : <ou négation explicite>
STATUS: COMPLETED
```

Dernière ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` précédé d'une section `BLOQUE_SUR:` détaillée).

**Si tu ne couvres pas les 16, c'est acceptable et attendu d'être dit** — 16 testids dont plusieurs états transitoires et deux orientations mobiles, c'est un périmètre M ambitieux. Un `STATUS: PARTIAL` avec 12 couvertures solides et 4 blocages nommés vaut mieux que 16 assertions de présence qui ne testent rien.
