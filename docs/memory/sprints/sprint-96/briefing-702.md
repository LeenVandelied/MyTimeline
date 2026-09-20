[BRIEFING ISSUE #702 — SPRINT 96 — VAGUE 2]

## Issue #702 — [BUG] Test E2E instable : flèche droite dans la palette du formulaire d'événement

### Contexte (énoncé GitHub, verbatim)
Un test automatisé qui vérifie la navigation au clavier dans la palette de couleurs du formulaire
d'événement échoue parfois de façon aléatoire, sans lien avec le travail du Sprint 90. Ce test
instable a été démontré comme préexistant sur la branche principale (`dev`) avant le sprint, et non
introduit par lui — il reste à en trouver la cause réelle et à la corriger.

### À faire (énoncé)
- Investiguer l'échec intermittent de `frontend/e2e/sprint-84-palette.spec.ts:128` : l'assertion
  `toBeFocused` sur la pastille suivante échoue alors que cette pastille est déjà marquée
  `aria-checked="true"` (la sélection se déplace bien, mais le focus est repris juste après).
- Piste prioritaire : un re-rendu qui reprend le focus pendant ou après l'animation d'ouverture du
  tiroir (drawer), lorsqu'il est ouvert depuis le tableau de bord.
- Pistes DÉJÀ ÉCARTÉES, à ne pas ré-explorer sans nouvel élément : le gestionnaire clavier de
  `palette-color-picker.tsx:108-109` focalise AVANT le `onChange` ; aucun auto-focus n'est déclenché
  dans le tiroir (`NewEventDrawer.tsx`).
- Corriger la cause identifiée, côté code (`palette-color-picker.tsx`, `EventEditForm.tsx`,
  `NewEventDrawer.tsx` ou le shell applicatif) ou côté test selon ce que l'investigation révèle.

### Critères d'acceptation (énoncé)
- [ ] La cause de l'instabilité est identifiée et documentée
- [ ] Un correctif (code ou spec) est apporté
- [ ] Le test est rejoué **10 fois de suite de façon isolée, sans aucun échec**, avant de considérer
      l'issue résolue

### Origine
`docs/memory/audits/sprint-90-test-coverage.md`. Caractère préexistant démontré par A/B au S90
(2/5 sur la base `a6b39ad`, 3/5 sur la branche du sprint, sur du code qu'il ne touchait pas).

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_702:
  fichiers_cles:
    - "frontend/e2e/sprint-84-palette.spec.ts:128"
    - "frontend/src/components/ui/palette-color-picker.tsx:108-109"
    - "frontend/src/components/events/NewEventDrawer.tsx"
  couches_touchees: ["e2e", "frontend-ui"]
  strategie_test: "E2E répété (>=10 invocations SÉQUENTIELLES)"
  risque_regression: "corriger côté test peut masquer un vrai vol de focus produit"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "flake préexistant, sévère sur ce poste"
  ecart_enonce_code: "à déterminer (cause inconnue)"
```

## Triage
Taille: S | Modèle: opus | Effort: xhigh

## CE QUE LA VAGUE 1 T'A DÉJÀ APPRIS (lis-le avant de rouvrir l'enquête)
L'agent de l'issue #665 vient de restructurer `palette-color-picker.tsx` sur CETTE branche. Son
rapport complet : `docs/memory/sprints/sprint-96/issue-665-done.md` §« Régression 1 » (lignes ~152-188).
Résumé, mesuré et non supposé :

1. **Le flake est SÉVÈRE sur ce poste, des deux côtés.** A/B à 10 invocations séquentielles par
   côté (`--repeat-each` est inutilisable ici, PIT-S95-002) :
   base restaurée = **5 échecs / 10**, branche #665 = **4 échecs / 10**. Pas d'aggravation, et pas
   de « 2/5 » comme au S90 : attends-toi à reproduire facilement.
2. **Signature confirmée** : `aria-checked="true"` EST passé sur la pastille suivante — la sélection
   avance — et seul `toBeFocused()` rend « inactive ». Ce n'est ni un sélecteur cassé, ni un compte
   de pastilles, ni un testid.
3. **Ce que la grille 6×2 de #665 change — et ne change pas** :
   - Ordre DOM : **inchangé** (12 `<button role="radio">` dans l'ordre d'`EVENT_PALETTE`).
   - Roving tabindex : **inchangé** (`tabStop` = index coché sinon 0).
   - `handleKeyDown` : **inchangé** — navigation LINÉAIRE, →/↓ = +1 avec bouclage, ←/↑ = −1, Home/End.
   - Ce qui change : **uniquement** la correspondance ordre linéaire ↔ géométrie. `ArrowRight`
     depuis la 6e pastille descend d'une ligne ; `ArrowDown` avance d'UNE case, pas de six.
   - Le cas exact de la spec (cobalt index 7 → pervenche index 8) : les deux restent adjacents
     horizontalement, ligne 2 colonnes 2 et 3. Le geste testé n'a pas changé de nature.
4. `#665` signale un follow-up connexe, à traiter AVEC toi si tu touches au clavier : la sémantique
   de grille (↓ = +6) n'est PAS implémentée — c'est conforme au motif `radiogroup` de l'APG, mais
   c'est une décision, pas un oubli. Ne la change pas sans le dire explicitement.

## Exigence de preuve — non négociable
« 10 fois de suite sans échec » = **10 invocations SÉQUENTIELLES du runner**, pas
`--repeat-each=10` (qui rejoue le projet `setup` et fait courser `.auth/accounts.json` : 12 tests
rendent « did not run » — PIT-S95-002).
Consigne dans le done.md, en clair : la boucle exacte utilisée, le nombre d'échecs AVANT ton
correctif (pour prouver que tu reproduisais), et le 10/10 APRÈS. Un « ça a l'air stable » ne vaut rien.

**Le piège central de cette issue** : corriger côté test (attente, retry, assertion assouplie) peut
MASQUER un vrai vol de focus que l'utilisateur subit au clavier. Si tu pars sur une correction de
spec, tu dois démontrer que le produit ne perd PAS le focus — pas seulement que le test verdit.

<!-- ===== cp-frontend ===== -->
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

<!-- ===== rules-jit/frontend ===== -->
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
./scripts/test-quiet.sh frontend       # build + Vitest + tsc --noEmit + next lint (#434)
./scripts/test-quiet.sh frontend-unit  # Vitest SEUL — un vert ici ne dit RIEN du build
./scripts/test-quiet.sh e2e            # Playwright (reset DB inclus)
./scripts/test-quiet.sh all            # Backend puis frontend complet (`unit` = backend SEUL)
```

wrapper capture tout dans `/tmp/<project-lower>-tests-<timestamp>.log` et renvoie :
- Recap le framework de test frontend (`Test Files N failed | N passed`, `Tests N passed`)
- Top 10 fichiers `FAIL src/...`
- Compte d'erreurs TS + 5 premieres
- Playwright : `N passed / N failed / N flaky` + top 10 echecs

Pour debug precis d'un test frontend, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), ne JAMAIS re-run `npx vitest run <fichier>` dans le contexte.

**Pour suites lourdes (Playwright full + vitest + tsc)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il isole l'output et retourne <=500 tokens au lead.

Reference : audit tokens 2026-04-24 — verbosite tests = cause #2 saturation contexte apres reviews multi-agent.

<!-- ===== pit-frontend (extrait ciblé) ===== -->
## PIT-S92-002 — Hook `warn-test-delegation` : `SKIP_DELEGATION=1` requis même pour `playwright test --list` ; `npx eslint` cassé
Le hook intercepte toute ligne `npx playwright test`, `--list` compris : un agent briefé pour « vérifier le chargement de sa spec » est bloqué. Et `npx eslint <fichier>` échoue dans ce dépôt (config ESLint 9) : prescrire `npx next lint --file <f>`. Les deux commandes sont à écrire telles quelles dans les gabarits de briefing. (Sprint 92 #621)


## PIT-S93-004 — `playwright test --list` exige les variables d'environnement, et RTK résume sa sortie
`playwright.config.ts` réclame `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` **même pour une simple collecte** : sans elles `--list` échoue avec un message qui parle du serveur `next dev` et oriente vers un faux diagnostic. Et sous le hook RTK, `--list` est résumé en « PASS (0) FAIL (0) » : passer par `rtk proxy` pour voir la liste réelle. `SKIP_DELEGATION=1` reste requis même pour `--list`. (Sprint 93 #711)


## PIT-S93-008 — `grep` sous le hook RTK peut rendre « 0 résultat » sur un fichier qui contient la chaîne
Le contrôle coverage-E2E du lead a rendu **0 testid** sur un diff de 60 Ko non tronqué, puis **7** avec `/usr/bin/grep`. Le piège RTK connu portait sur les gros diffs, `vitest` et `prettier --check` ; il vaut aussi pour un `grep`/`wc` d'analyse — et `rtk proxy` devant la commande qui ÉCRIT le fichier n'y change rien, c'est le `grep` suivant qui ment. Pour toute MESURE, appeler le binaire par chemin absolu. (Sprint 93, lead)


## PIT-S94-001 — Un primitif Radix qui ne pose pas un attribut ne prouve RIEN sur la coque du projet
Le lead a réfuté la piste de l'énoncé #672 (`[role="dialog"][aria-modal="true"]`) en grepant `frontend/node_modules/@radix-ui/react-dialog/dist/` : `aria-modal` n'y est que dans les `.map`, donc Radix n'en pose aucun — **fait exact, conclusion fausse**. `frontend/src/components/events/EventFormDrawer.tsx:173-174` pose `role="dialog"` ET `aria-modal="true"` à la main. Pour réfuter un sélecteur, chercher l'attribut dans `src/` AVANT `node_modules/`. (Sprint 94, #672, fullstack-dev contre le briefing du lead)


## PIT-S94-005 — `requestFullscreen` EST supporté en Chromium headless : la prémisse inverse dormait dans une spec depuis #330
`timeline.spec.ts` stubbe l'API Fullscreen au motif qu'« aucune garantie de support » n'existe en headless. Mesuré au S94 par sonde jetable : `requestFullscreen` et `exitFullscreen` fonctionnent, avec et sans geste utilisateur, et `fullscreenElement` est fidèle. Pire, un stub qui résout immédiatement MASQUE l'asynchronie d'`exitFullscreen` — c'est-à-dire exactement le défaut de #712. Famille [[upstream-blocker-verdict-expires]]. (Sprint 94, #712)


## PIT-S95-001 — Un `next build` pendant qu'un `next start` sert le même `.next` : toutes les pages rendent 200, mais l'hydratation est morte
`test-quiet.sh frontend` reconstruit `.next` ; si un `next start` sert la même arborescence, le symptôme ne ressemble PAS à une panne de build : les pages rendent 200, et c'est le projet `setup` Playwright qui échoue sur `register-form` introuvable — ce qui se diagnostique spontanément en rate-limit ou en CORS. Extension du couple `next dev` de [[PIT-S81]] au couple build/start. Remède : rebuild + restart, et ne jamais lancer `test-quiet.sh` pendant un run E2E. (Sprint 95, #714)


## PIT-S95-002 — `--repeat-each` rejoue AUSSI le projet `setup`, qui course sur `.auth/accounts.json`
`npx playwright test --repeat-each=N` relance le projet `setup` à chaque passe ; les passes se disputent le fichier d'identités partagé et 12 tests rendent « did not run ». Pour rejouer une spec N fois sur ce dépôt : N invocations séquentielles du runner. `--repeat-each` est inutilisable ici. (Sprint 95, #714)


## PIT-S95-003 — Sur macOS les captures visuelles ne rougissent plus, elles VERDISSENT à tort (inversion de [[PIT-S82]])
Seules les références `*-chromium-linux.png` sont suivies. Sur macOS Playwright cherche des `-darwin` absentes — et comme `updateSnapshots: 'missing'` est désormais le DÉFAUT, il les CRÉE et fait PASSER les tests au lieu d'échouer. Au S95 la suite a rendu `422 passed / 0 failed` dont **10 « passed » vides** (portée réelle : 412). Le rapport ne le signale nulle part ; le seul indice est `git status` (10 PNG `-darwin` non suivis apparus après le run). Le constat mémorisé au S82 comme « 10 faux ROUGES » décrit donc l'ANCIEN symptôme. Remède : `git status --porcelain | /usr/bin/grep darwin` AVANT de conclure d'un vert, supprimer les PNG générés, retrancher ces tests du décompte annoncé. (Sprint 95, lead)


## PIT-S95-007 — Une affirmation géométrique écrite sans oracle a survécu 3 sprints avec 3 chiffres faux, et un arbitrage s'est appuyé dessus
La JSDoc de `toaster.tsx` (S92) situait la croix du `ProductDrawer` « à ≈84–100px à 844px quand le formulaire remplit la sheet ». Mesure S95 : à 390×844 le contenu (672px) n'atteint JAMAIS 92vh (776px), le recouvrement est **nul**, et le cas n'existe qu'en dessous de ≈730px. Deux autres cotes étaient fausses (carte 65px et non ≈46px ; haut de sheet 171px et non ≈68px). L'arbitrage Designer de #714 s'était appuyé sur ces chiffres. Toute affirmation géométrique consignée dans un commentaire doit citer la spec qui la mesure. (Sprint 95, #714)

---


<!-- ===== pit- garde-fous d'exécution (lead, Sprint 96) ===== -->
## GF-1 — Tu travailles dans un WORKTREE
Répertoire de travail IMPOSÉ : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`.
Tout `cd` implicite vers `~/VSProjects/MyTimeline` produit un faux KO (tu lirais le code de `dev`).
Premier réflexe, à exécuter et à recopier dans ton done.md :
```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e
git rev-parse --abbrev-ref HEAD   # doit rendre claude/sprint-96-start-b98611
```

## GF-2 — RTK réécrit tes commandes
Le hook RTK réécrit `git`, `grep`, `prettier`… `grep` sous RTK peut rendre « 0 résultat » sur un
fichier qui CONTIENT la chaîne, et `git diff` rend ~vide.
→ Pour toute MESURE ou tout comptage : `/usr/bin/grep` en chemin absolu.
→ Pour un diff : `rtk proxy git diff` ou `git diff > /tmp/d.txt` puis lire le fichier.

## GF-3 — Commits : `git add` CIBLÉ, jamais `-A`
Le working tree est PARTAGÉ avec les autres agents de la vague. `git add -A` volerait leurs
fichiers. Lister les chemins un par un, en dur (pas `$F` : sous zsh `git add -- $F` est inerte).
1 commit logique, message gitmoji en français, terminé par :
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## GF-4 — Lancer les tests
- Unitaires / lint / build frontend : `./scripts/test-quiet.sh frontend`
  ⚠ `test-quiet.sh` RECONSTRUIT `.next`. Ne JAMAIS le lancer pendant qu'un run E2E tourne
  (PIT-S95-001) et ne jamais le lancer si un autre agent de la vague tient le stack E2E.
  ⚠ `test-quiet.sh` n'exécute PAS `format:check` : lancer `npx prettier --check <fichiers>`
  séparément (et ne pas croire sa sortie sous RTK — utiliser `npx` en direct).
- E2E : SEUL l'agent désigné « propriétaire Playwright » dans son briefing monte le stack.
  Recette : `frontend/playwright.config.ts` (en-tête, 2 chemins documentés) +
  `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
  Le hook `warn-test-delegation` intercepte toute ligne `npx playwright test`, `--list` compris :
  préfixer `SKIP_DELEGATION=1` (PIT-S92-002). `npx eslint` est cassé ici → `npx next lint --file <f>`.

## GF-5 — Captures visuelles sur macOS : un vert peut être VIDE
Seules les références `*-chromium-linux.png` sont suivies. Sur macOS, `updateSnapshots: 'missing'`
CRÉE les `-darwin` absentes et fait PASSER le test sans rien comparer (PIT-S95-003).
→ Après tout run touchant une spec visuelle : `git status --porcelain | /usr/bin/grep darwin`.
S'il y a des PNG `-darwin` : les SUPPRIMER, et retrancher ces tests du décompte annoncé.
Ne jamais committer un PNG `-darwin`. Les références Linux se régénèrent en CI, pas ici.

## GF-6 — Ne pas surestimer ta preuve
« La CI est verte » ne prouve pas que la page est correcte ; « la spec cite le testid » ne prouve
pas qu'elle passe ; un test de géométrie sous jsdom ne prouve RIEN (jsdom ne met pas en page).
Toute affirmation géométrique que tu écris (px, recouvrement, hauteur) doit citer la commande ou
la spec qui l'a MESURÉE. Si tu n'as pas mesuré, écris « non vérifié ».

<!-- ===== tail — contraintes de la vague ===== -->
## Tu es PROPRIÉTAIRE PLAYWRIGHT de la vague 2
Tu es seul sur la branche ; aucun autre agent ne tourne. La pile E2E montée par #665 a été
**démontée** (conteneurs + volumes supprimés, port 3000 libéré) : tu la remontes.
- Recette : en-tête de `frontend/playwright.config.ts` (2 chemins ; le 2e contourne le `--turbopack`
  qui casse en worktree) + `docs/memory/sprints/sprint-47/e2e-local-runbook.md`. Le §Tests du
  done.md de #665 décrit la pile exacte qu'il vient d'utiliser avec succès — pars de là.
- Oracle avant tout run : `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/me`
  doit rendre **401** (404 = proxy absent) ET `…/fr/login` doit rendre **200** (PIT-S81).
- Ne lance JAMAIS `./scripts/test-quiet.sh frontend` pendant qu'un serveur sert le même `.next`
  (PIT-S95-001).

## Travail supplémentaire qui t'incombe (délégation de la vague 1)
La spec de géométrie de l'issue #633 a été ÉCRITE mais JAMAIS EXÉCUTÉE — l'agent n'avait pas la
pile. Elle vit dans `frontend/e2e/settings-mobile.spec.ts` (bouton retour des réglages mobiles,
boundingBox >= 44×44 à 375 px, pas de débordement d'en-tête).
→ Exécute-la, rapporte passed/failed RÉELS dans ton done.md sous un titre `## Spec déléguée #633`.
→ Si elle est rouge : diagnostique et corrige (commit SÉPARÉ, message citant #633), c'est une
   livraison de ce sprint. Si le défaut est dans le code de #633 et non dans la spec, dis-le.

## Dépendances intra-sprint
- `palette-color-picker.tsx` porte la correction de #665 (commit `14363a50`) : tu travailles sur
  cette version, pas sur celle de `dev`.
- La vague 3 (#656) touchera `frontend/app/[locale]/{login,register,forgot-password,reset-password}/`
  et `frontend/src/components/shared/OfflineBanner.tsx` — n'y touche pas.
- Si tu modifies `palette-color-picker.tsx`, rejoue la spec de #665
  (`frontend/e2e/sprint-96-palette-geometry.spec.ts`, 6 tests) ET `sprint-95-toast-overlap.spec.ts`
  (#665 l'a cassée puis réparée : elle est sensible à la hauteur de la palette).

## Specs à rejouer (liste grep complète, pas un échantillon choisi à la main)
`categories.spec.ts`, `sprint-70-preview-visual.spec.ts`, `sprint-73-model-vs-rendered.spec.ts`,
`sprint-84-palette.spec.ts`, `sprint-95-toast-overlap.spec.ts`, `timeline.spec.ts`,
`sprint-96-palette-geometry.spec.ts`, `settings-mobile.spec.ts`.
Les `sprint-70-*` / `sprint-73-*` sont VISUELLES : relis GF-5, et ne committe aucun PNG `-darwin`.

## Designer
Non applicable, SAUF si ton correctif change un comportement perçu au clavier (ordre de navigation,
anneau de focus, sémantique de grille). Dans ce cas : décris le changement dans le done.md et pose
`RECOMMAND_UI_DESIGN` plutôt que de trancher seul.

## Contraintes
- Branche : `claude/sprint-96-start-b98611` (déjà checkout, worktree — cf. GF-1)
- 1 commit logique pour #702 (+ 1 commit séparé si tu répares la spec de #633), gitmoji FR,
  `git add` ciblé (GF-3)
- Vérification format OBLIGATOIRE avant commit, avec le binaire DIRECT :
  `cd frontend && ./node_modules/.bin/prettier --check .`
  ⚠ `npx prettier --check` MENT sous RTK : il a répondu « All files formatted correctly » sur un
  fichier que le binaire direct refusait, et `test-quiet.sh` n'exécute pas `format:check` — la CI
  aurait rougi. Constaté deux fois sur ce sprint (une fois par un agent, une fois par le lead).
- Code en anglais, docs/commentaires en français ; TS strict

## Livrable attendu
1. `docs/memory/sprints/sprint-96/issue-702-done.md` contenant :
   - `## Cause identifiée` — la cause RÉELLE, avec la preuve qui l'établit. Si tu ne la trouves pas,
     écris-le : `STATUS: PARTIAL` + `## BLOQUE_SUR` est une réponse acceptable et honnête ; un
     correctif cosmétique qui verdit le test sans cause identifiée ne l'est pas.
   - `## Preuve de stabilité` — la boucle exacte, échecs AVANT, 10/10 APRÈS.
   - `## Spec déléguée #633` — passed/failed réels.
   - `## Fichiers modifiés` / `## Tests` (specs rejouées, passed/failed réels)
   - `## Recommandations suite` — SECTION OBLIGATOIRE : `RECOMMAND_*` ou négation explicite.
   - Signaux `[MEMORY:pitfall]` / `[MEMORY:pattern]` / `[MEMORY:decision]` ÉCRITS DANS CE FICHIER.
   - Dernière ligne EXACTEMENT : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + `## BLOQUE_SUR`).
2. Message de retour 500 tokens MAX, télégraphique : SHA, cause en 1 phrase, 10/10 oui/non,
   pointeur vers le done.md.
