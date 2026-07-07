[BRIEFING ISSUE #207 + #133 — FUSIONNÉES (même fichier scripts/test-quiet.sh)]

## Contexte worktree (garde-fou HEAD — LIRE EN PREMIER)
- Le repo de travail est `/Users/herrh/VSProjects/MyTimeline` (PAS le cwd par défaut si tu es lancé ailleurs).
- **PREMIÈRE ACTION** : `cd /Users/herrh/VSProjects/MyTimeline` puis `git branch --show-current` → DOIT afficher `sprint/28`. Si ce n'est pas le cas, STOP et signale-le (ne code pas à l'aveugle).
- Tous les chemins ci-dessous sont relatifs à ce repo.

## Issue #207 — [BUG] test-quiet.sh : l'alias e2e lance vitest au lieu de Playwright
`scripts/test-quiet.sh` a un mode `e2e` censé exécuter Playwright, mais il lance en réalité `npm test` (Vitest unitaires) au lieu de `npm run test:e2e`. Conséquence : `frontend/e2e/golden-path.spec.ts` n'est JAMAIS exécuté ; les sprints croient tester les parcours E2E alors qu'ils ne le font pas.

À faire : corriger le mode `e2e` pour invoquer `npm run test:e2e` (Playwright).

Critères d'acceptation :
- `./scripts/test-quiet.sh e2e` exécute effectivement `npm run test:e2e` (Playwright).
- Les autres modes (unitaires, etc.) continuent de fonctionner sans régression.
- `frontend/e2e/golden-path.spec.ts` est bien exécuté lors d'un appel à `./scripts/test-quiet.sh e2e`.

Risque : l'environnement Playwright (navigateurs installés, serveur de dev) doit être dispo là où `test-quiet.sh e2e` est appelé (local + CI), sinon le correctif fera échouer un gate qui « passait » silencieusement.

## Issue #133 — [CHORE] Câbler vitest dans test-quiet.sh frontend + vérifier la CI
`scripts/test-quiet.sh frontend` est actuellement un no-op : aucun runner vitest câblé. Les 12 tests frontend existants ne sont exécutés ni par l'outillage de sprint, ni de façon fiable par la CI (seul un job CI séparé les couvre).

À faire :
- Câbler `vitest run` dans la branche `frontend` (et/ou `e2e`) de `scripts/test-quiet.sh`.
- Vérifier que le job CI frontend exécute bien la suite vitest complète.
- S'assurer que l'échec d'un test vitest fait échouer le script (exit code propagé).

Critères d'acceptation :
- `scripts/test-quiet.sh frontend` exécute `vitest run` et affiche un résumé pass/fail.
- Un test vitest en échec fait sortir le script avec un code non-zéro.
- Le job CI frontend est vérifié pour confirmer qu'il exécute bien l'intégralité des tests existants.
- Documentation du wrapper de tests mise à jour si elle existe (HELP.md éventuel).

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0207_0133:
  fichiers_cles: ["scripts/test-quiet.sh", ".github/workflows/ (CI frontend)", "frontend/package.json"]
  couches_touchees: ["devops"]
  strategie_test: "meta (run_frontend scope=frontend -> vitest ; scope=e2e -> playwright ; CI verte)"
  risque_regression: "séparer les 2 scopes SANS casser le skip explicite existant (test-quiet.sh:96-97) quand aucun runner ; la CI ne doit pas bloquer si e2e a besoin d'un backend up"
  ordre_ecriture: "devops (test-quiet.sh: scope frontend=npm test/vitest, scope e2e=npm run test:e2e -> CI)"
  etat_reel_du_code: |
    run_frontend (test-quiet.sh:87-100) lance 'npm test'=vitest pour scopes 'e2e|frontend' (l.116).
    package.json a bien test:e2e=playwright (l.13) mais JAMAIS appelé. Bug alias confirmé.
    #207 et #133 touchent le MÊME script -> fusionner le fix (séquentiel).
```

Point clé : aujourd'hui les scopes `e2e` ET `frontend` retombent tous deux sur `npm test` (vitest). Il faut les DISSOCIER :
- scope `frontend` → `vitest run` (unitaires frontend).
- scope `e2e` → `npm run test:e2e` (Playwright).
Ne PAS casser le comportement de skip explicite quand un runner est absent (voir test-quiet.sh:96-97). Vérifie les vrais numéros de ligne (le mini-plan peut avoir dérivé).

## Triage
Taille: S (fusion #207 S + #133 S)
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

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- **CRITIQUE** : #207 (scope e2e corrigé) débloque l'issue #218 (specs Playwright, Vague 2). Ton correctif du scope `e2e` DOIT rendre `./scripts/test-quiet.sh e2e` réellement exécutable via Playwright, sinon la Vague 2 est bloquée.
- Aucune dépendance backend. Fichiers disjoints de l'agent backend (#41+#124) qui tourne en parallèle — ne touche PAS à `backend/`.

## Designer
Non applicable (devops/tooling, aucun rendu UI).

## Contraintes
- Repo : `/Users/herrh/VSProjects/MyTimeline` — Branche cible : `sprint/28` (déjà checkout). Vérifie `git branch --show-current` avant tout commit.
- Commit : 1 à 2 commits logiques gitmoji français (ex: `:bug: #207 test-quiet.sh scope e2e lance Playwright` / `:white_check_mark: #133 câbler vitest scope frontend + CI`). Référence les numéros d'issue.
- **Tests inline OBLIGATOIRES** : après correction, valide toi-même :
  - `./scripts/test-quiet.sh frontend` → vitest s'exécute, résumé pass/fail, exit code propagé sur échec.
  - `./scripts/test-quiet.sh e2e` → invoque bien `npm run test:e2e` (Playwright). Si l'env Playwright (navigateurs/serveur) n'est pas disponible localement, NE force PAS un run complet : vérifie via `bash -x` ou dry-run que la bonne commande est appelée, et documente-le. Ne fais pas passer un faux vert.
- CI : inspecte `.github/workflows/` (job frontend). Confirme qu'il exécute la suite vitest complète. Si le job e2e a besoin d'un backend up, ne le rends pas bloquant à tort — documente le choix.
- Ne PAS toucher : `backend/**`, `frontend/src/**` (hors config test), aucune spec E2E nouvelle (c'est #218 en Vague 2).

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-28/issue-207-133-done.md` avec :
- commits: [SHA1, ...]
- resume: <objectif + fichiers modifiés + comment scopes frontend/e2e dissociés + résultat des runs de validation>
- tests: <ce que tu as réellement lancé et le résultat ; distingue vitest réel vs vérification dry-run Playwright>
- [MEMORY:*] signaux: <si applicable — ex pitfall sur skip runner absent>
- recommandations suite: <RECOMMAND_* explicites, ou "Pas de RECOMMAND_X car ..." ; en particulier confirme si #218 peut lancer un vrai run Playwright>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué).
