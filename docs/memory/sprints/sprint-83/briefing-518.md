[BRIEFING ISSUE #518 — SPRINT 83]

## Garde-fou d'environnement (À EXÉCUTER EN PREMIER, AVANT TOUTE LECTURE)

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton cwd par défaut
peut être faux (PIT sprint-subagent-worktree-cwd).

```bash
cd "/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc"
git rev-parse --show-toplevel   # DOIT afficher exactement : /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc
git log --oneline -1            # DOIT afficher : 8ed3dd9 :memo: docs(sprint-plan): corriger les énoncés de #621 et #629
```

Si l'un des deux ne correspond pas : **ARRÊTE** et rends `STATUS: PARTIAL` +
`BLOQUE_SUR: mauvais worktree`. Ne code pas ailleurs.

## Issue

=====ISSUE #518
[FEATURE] ~15 composants rendent des dates dans un span au lieu d'un time datetime
---
## Contexte
Le Design System (`i18n.css` §7) définit une convention claire pour l'affichage des
dates dans l'interface : elles doivent être rendues avec la balise sémantique
`<time datetime="...">` (portant l'attribut `datetime` et une classe `mt-date--*`),
et non un simple `<span>`. Cette convention garantit que les dates sont exposées comme
telles aux technologies d'assistance (lecteurs d'écran) et respectent les standards
d'accessibilité HTML.

Or l'état réel du code s'écarte largement de cette convention : il n'existe que **2**
balises `<time>` dans tout le frontend, alors qu'environ **15 composants** affichent
des dates dans un simple `<span>` — notamment `ProductDetailView` (ligne 401),
`ProductsListView` (ligne 295), `SessionList`, `ExportDataFlow`, `CompactAgenda`, ainsi
que les drawers de la timeline. Conséquence : perte de sémantique HTML et
d'accessibilité (une date affichée dans un `<span>` n'est pas identifiable comme une
date par un lecteur d'écran), en plus d'une convention DS non respectée à grande
échelle.

## À faire
Recenser l'ensemble des composants affichant une date dans un `<span>` et les migrer
vers `<time datetime="..." class="mt-date--*">`, conformément à la convention DS
définie dans `i18n.css` §7. Vu le volume (~15 composants), prévoir un découpage en
plusieurs sous-tâches ou PR par zone fonctionnelle (produits, sessions, export,
timeline/drawers) plutôt qu'un unique gros changement.

## BR impactées
Aucune.

## Critères d'acceptation
- [ ] Liste exhaustive des composants concernés confirmée (au moins les 5 cités :
      `ProductDetailView`, `ProductsListView`, `SessionList`, `ExportDataFlow`,
      `CompactAgenda`, + les drawers de la timeline).
- [ ] Chaque composant listé migre son affichage de date d'un `<span>` vers
      `<time datetime="..." class="mt-date--*">`, sans régression visuelle.
- [ ] L'attribut `datetime` porte une valeur ISO 8601 valide correspondant à la date
      affichée.
- [ ] Un test (unitaire ou E2E) vérifie qu'au moins les composants les plus visibles
      utilisent bien `<time>` avec `datetime`, pour éviter une régression future.

## Piste technique
Convention définie dans `frontend/src/styles/ds/components/i18n.css` §7. Composants
identifiés à migrer : `ProductDetailView.tsx:401`, `ProductsListView.tsx:295`,
`SessionList`, `ExportDataFlow`, `CompactAgenda`, drawers de la timeline (à recenser
précisément en début de tâche).

## Dépendances
Aucune, mais gagnerait à être découpée en plusieurs issues plus petites une fois le
recensement exhaustif fait (volume ~15 composants).

## Risques techniques
Risque de régression visuelle si le style appliqué à `<span>` (marges, display inline)
n'est pas identique par défaut à celui d'un `<time>` — vérifier au cas par cas. Volume
important : risque d'oubli de composants lors du recensement initial.

## Estimation
M — ~15 composants à migrer, recensement + risque de régression visuelle à vérifier
composant par composant ; à considérer comme candidat au découpage en sous-issues.

## Origine
Sprint 72 — `docs/memory/sprints/sprint-72/issue-72-done.md`


## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_518:
  fichiers_cles:
    - "frontend/src/components/products/ProductDetailView.tsx"   # cité :401 par l'issue
    - "frontend/src/components/products/ProductsListView.tsx"    # cité :295 par l'issue
    - "frontend/src/components/settings/SessionList.tsx"
    - "frontend/src/components/settings/ExportDataFlow.tsx"
    - "frontend/src/components/dashboard/CompactAgenda.tsx"
    - "frontend/src/styles/ds/components/i18n.css"               # §7, :146-153 : convention .mt-date--*
    - "frontend/src/components/dashboard/WeekAgenda.tsx"         # :54-60 PRÉCÉDENT à répliquer
    - "frontend/src/components/events/EventPreviewTimeline.tsx"  # :243-249 PRÉCÉDENT à répliquer
    - "frontend/src/components/dashboard/intl-formats.test.tsx"  # :125-131 harnais de test existant
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: |
    Le précédent du dépôt choisit délibérément `.mt-date--long` et REFUSE
    `.mt-date--short` (WeekAgenda.tsx:57 et EventPreviewTimeline.tsx:246 : `--short`
    force uppercase + 11px). Appliquer `--short` par symétrie avec le DS produirait
    une régression visuelle sur les écrans migrés.
  ordre_ecriture: |
    1) recenser exhaustivement (l'issue dit ~15 composants, seuls 5 sont nommés)
    2) répliquer le motif WeekAgenda/EventPreviewTimeline (<time dateTime={toLocalIso(x)}>)
    3) étendre intl-formats.test.tsx plutôt que créer un harnais concurrent
    4) découper par zone si le diff dépasse la taille M : produits / réglages / dashboard
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    3 fichiers portent déjà `<time>` (WeekAgenda, EventPreviewTimeline, et le test
    intl-formats), pas 2 comme l'affirme l'issue. Les 5 composants cibles nommés
    existent tous aux chemins ci-dessus. La convention est bien définie en
    i18n.css §7. Migration réelle à faire.
  conflit_a_arbitrer: |
    #517 (« .mt-date--short est définie mais inutilisée », backlog) est la conséquence
    directe du précédent ci-dessus : les deux migrations antérieures ont écarté
    `--short` avec justification écrite. #518 va de fait re-trancher #517 — décider
    ici si `--short` doit être branchée ou supprimée, et le consigner.
```

_#642 : taille S sans mini-plan obligatoire. Fichiers vérifiés par l'architect :
`frontend/src/components/landing/HeaderSection.tsx` (aucun toggle aujourd'hui), les 4
pages auth, `next-themes@^0.4.6` déjà en dépendance, `ThemeProvider` déjà monté._
```

Contexte de vague : ce sprint exécute V1 = #518 ∥ #578 | V2 = #574 | V3 = #642.
Tu es en **vague 1**.

## Triage
Taille: M
Modèle: opus
Effort: xhigh

## Context-pack domaine (lire EN PRIORITÉ avant tout code)

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
<!-- ===== fin cp-frontend.md ===== -->

## Packs complémentaires — À LIRE TOI-MÊME (trop volumineux pour être inlinés)

Ces fichiers ne sont PAS dans ce prompt. Ouvre-les avec Read/grep depuis le worktree :

- `.ai-env/context-packs/pit-frontend.md` (164 Ko) — pièges frontend connus.
  **Obligatoire** : grep les mots-clés de ton issue avant d'écrire du code
  (ex. `grep -n "AppShell\|shadow-lg\|<time>\|next-themes\|dateTime" .ai-env/context-packs/pit-frontend.md`).
- `.claude/rules/frontend-stack.md` — TS strict, Zod, next-intl, Tailwind v4.
- `.claude/rules/conventions.md` — code EN / docs FR.
- `frontend/src/styles/ds/` — design system (tokens, composants).
- `docs/design/` s'il existe — charte.

**Dans ton retour, tu DOIS inclure une ligne `fichiers de contexte lus : ...`**
énumérant les fichiers ci-dessus que tu as réellement ouverts. Une ligne absente ou
vide sera traitée comme un travail non fondé.

## Dépendances intra-sprint

Aucune. #518 est disjointe de #578 (ne touche PAS AppShell.tsx). Ne modifie sous aucun prétexte frontend/src/components/layout/AppShell.tsx — il est tenu par #578 en parallèle.

## Contraintes d'exécution (DURES)

- **Branche** : déjà sur `claude/sprint-83-start-4651a0` (= contenu de `sprint/83`).
  Ne change PAS de branche, ne rebase pas, ne `git stash` pas (stash partagé entre
  worktrees — PIT).
- **Commit** : 1 seul commit logique, message gitmoji **en français**.
- **`git add` CIBLÉ obligatoire** — jamais `git add -A`, jamais `git add .`
  (le worktree est partagé avec d'autres agents en parallèle : tu commiterais leur
  travail). Liste les chemins un par un :
  `git add frontend/src/a.tsx frontend/src/b.tsx`.
  ⚠ `git add -- $F` avec une variable non quotée est **inerte sous zsh** (PIT S76) —
  écris les chemins littéralement.
- **Ne touche à AUCUN fichier hors de ton périmètre**, en particulier :
  `docs/memory/**`, `.ai-env/**`, `playwright.config.ts`, et les fichiers cités
  dans les mini-plans des AUTRES issues du sprint.
- **Tests** : lance `./scripts/test-quiet.sh frontend` (ou le scope adapté). Les tests
  unitaires frontend sont **obligatoires** avant de rendre.
- **Playwright / E2E** : ne lance PAS la suite E2E toi-même (un seul agent à la fois
  peut la tenir, et le lead s'en charge). Si ton issue a besoin d'un E2E, **écris la
  spec** et signale `RECOMMAND_TEST_RUNNER`.
- **jsdom ne prouve pas le scroll ni le rendu visuel** (PIT) : si ta vérification
  dépend d'une mesure réelle du navigateur, dis-le explicitement plutôt que d'affirmer
  que c'est vérifié.
- Si un énoncé de l'issue contredit ce que tu lis dans le code, **le code fait foi** —
  consigne l'écart dans ton retour (PIT : énoncés d'issue périmés).

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA]
- fichiers de contexte lus: <liste>
- resume: <objectif + fichiers clés + décisions d'arbitrage + tests lancés & résultat chiffré>
- non vérifié / manquant: <ce que tu n'as PAS pu prouver — obligatoire, "rien" interdit sans justification>
- [MEMORY:pitfall|pattern|decision|bug] signaux: <liste ou "aucun">
- RECOMMAND_FOLLOWUP: <desc [triage|domaine]> ou "aucun"
- recommandations suite: <RECOMMAND_TEST_RUNNER / RECOMMAND_UI_DESIGN / ... ou "aucune">
- STATUS: COMPLETED  (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>) — **dernière ligne**
