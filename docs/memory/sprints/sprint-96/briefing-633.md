[BRIEFING ISSUE #633 — SPRINT 96 — VAGUE 1]

## Issue #633 — [A11Y] Réglages mobiles : cible tactile du bouton retour à 36px au lieu de 44px

### Contexte (énoncé GitHub, verbatim)
Le handoff fixe une cible tactile minimale de **44 px** (le token `--space-11` vaut précisément 44px).
Le produit tient cette contrainte presque partout, y compris avec des zones d'expansion invisibles
sur les petits boutons de zoom de la frise (`timeline.css:410,414,456` : `min-height:44px` plus un
`::before` de 44×44). `CompactRail.tsx:69-104` est à 48 px.
**Une exception** : le bouton retour des réglages mobiles est en `h-9 w-9`, soit **36 px**, sans
zone d'expansion (`frontend/src/components/settings/mobile/MobileSettings.tsx:52`).
C'est aussi un manquement WCAG 2.5.5 (cible minimale), sur un bouton de navigation fréquemment utilisé.

### À faire (énoncé)
- Passer le bouton à `h-11 w-11` (token `--space-11`), ou ajouter une zone d'expansion invisible
  sur le modèle de `.mt-zoom__btn`.
- Vérifier qu'aucune autre cible du produit ne passe sous le seuil.

### Critères d'acceptation (énoncé)
- [ ] Le bouton retour atteint 44 px de cible effective
- [ ] La mise en page de l'en-tête des réglages mobiles absorbe l'agrandissement
- [ ] Un balayage confirme qu'aucune autre cible interactive n'est sous 44 px

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_633:
  fichiers_cles:
    - "frontend/src/components/settings/mobile/MobileSettings.tsx:52 (h-9 w-9)"
  couches_touchees: ["frontend-settings"]
  strategie_test: "E2E boundingBox 375 px"
  risque_regression: "le critère « balayage de toutes les cibles » est à borner (sinon S)"
  possibly_done: false
  etat_reel_du_code: "Confirmé."
  ecart_enonce_code: "aucun"
```

## Triage
Taille: XS | Modèle: opus | Effort: medium

## Bornage explicite du 3e critère (décision du lead — à respecter)
« Un balayage confirme qu'aucune autre cible interactive n'est sous 44 px » est, pris au pied de
la lettre, un audit produit complet — hors d'un XS. PÉRIMÈTRE IMPOSÉ :
- Correction de code : le seul bouton retour de `MobileSettings.tsx`.
- Balayage : LIMITÉ aux écrans de réglages en viewport mobile (375 px), c.-à-d. les surfaces
  rendues sous `frontend/src/components/settings/**`.
- Toute cible < 44 px trouvée HORS de ce périmètre : NE PAS la corriger. L'écrire dans
  `## Recommandations suite` sous la forme `RECOMMAND_FOLLOWUP: <écran> <élément> mesuré Npx
  [triage XS|S] [domaine transversal]`. Le lead arbitrera en clôture de sprint.

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

<!-- ===== pit-frontend (extrait ciblé — pièges qui ont réellement coûté des sprints) ===== -->
## PIT-S91-011 — Mesurer un contraste sur une lane mobile : le helper refuse la grille `background-image`
`readTextRendering` (`frontend/e2e/support/contrast.ts`) lève dès qu'il traverse un dégradé ; or `.mt-tlm__lane` peint sa grille en `background-image`. Vérifier que ce dégradé est le seul traversé, le passer à `none` le temps de la mesure, puis mesurer contre le fond réellement peint (`--color-surface`). Motif : `frontend/e2e/sprint-91-more-contrast.spec.ts`. (Sprint 91, absorption `⋯`)


## PIT-S92-001 — `ln -s <cible> node_modules` sur un dossier existant crée `node_modules/node_modules`, que Node résout en premier
Au démarrage du S92 le lead a lu « (empty) » d'un `ls -d node_modules` résumé par RTK comme « absent » et posé un symlink vers le `node_modules` du dépôt principal : le dossier existait, le lien est donc parti DEDANS. La résolution Node privilégie ce `node_modules` imbriqué → versions étrangères chargées, Vitest (`eachMapping`) et eslint (`eslint-patch`) en erreur pour les 2 agents de la vague. Tester l'existence sans RTK (`test -d frontend/node_modules`) avant tout lien ; ne jamais conclure « absent » d'un `ls` résumé. (Sprint 92, lead)


## PIT-S92-002 — Hook `warn-test-delegation` : `SKIP_DELEGATION=1` requis même pour `playwright test --list` ; `npx eslint` cassé
Le hook intercepte toute ligne `npx playwright test`, `--list` compris : un agent briefé pour « vérifier le chargement de sa spec » est bloqué. Et `npx eslint <fichier>` échoue dans ce dépôt (config ESLint 9) : prescrire `npx next lint --file <f>`. Les deux commandes sont à écrire telles quelles dans les gabarits de briefing. (Sprint 92 #621)


## PIT-S93-004 — `playwright test --list` exige les variables d'environnement, et RTK résume sa sortie
`playwright.config.ts` réclame `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` **même pour une simple collecte** : sans elles `--list` échoue avec un message qui parle du serveur `next dev` et oriente vers un faux diagnostic. Et sous le hook RTK, `--list` est résumé en « PASS (0) FAIL (0) » : passer par `rtk proxy` pour voir la liste réelle. `SKIP_DELEGATION=1` reste requis même pour `--list`. (Sprint 93 #711)


## PIT-S93-008 — `grep` sous le hook RTK peut rendre « 0 résultat » sur un fichier qui contient la chaîne
Le contrôle coverage-E2E du lead a rendu **0 testid** sur un diff de 60 Ko non tronqué, puis **7** avec `/usr/bin/grep`. Le piège RTK connu portait sur les gros diffs, `vitest` et `prettier --check` ; il vaut aussi pour un `grep`/`wc` d'analyse — et `rtk proxy` devant la commande qui ÉCRIT le fichier n'y change rien, c'est le `grep` suivant qui ment. Pour toute MESURE, appeler le binaire par chemin absolu. (Sprint 93, lead)


## PIT-S94-006 — Le hook `warn-test-delegation.sh` a tué un heredoc qui ÉCRIVAIT l'audit (5e occurrence)
Le fichier `docs/memory/audits/sprint-94-test-coverage.md` contient la chaîne `playwright test` dans son tableau de résultats : le heredoc qui l'écrit est bloqué comme s'il LANÇAIT la suite. Préfixer `SKIP_DELEGATION=1`. Suite de [[PIT-S63-007]], [[PIT-S74-007]], [[PIT-S78-008]]. Et le gate de Phase 9 grep `\[MISSING\]` : ne pas écrire ce jeton dans la prose de l'audit lui-même ([[PIT-S80-009]]). (Sprint 94, lead)


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
## TU N'ES PAS PROPRIÉTAIRE PLAYWRIGHT — ne lance AUCUN run E2E
Un seul agent tient le stack E2E par vague ; pour la vague 1 c'est l'agent de l'issue #665.
Deux `next dev`/`next start` sur le même `.next` se détruisent mutuellement (PIT-S81, PIT-S95-001),
et `./scripts/test-quiet.sh frontend` RECONSTRUIT `.next` : ne le lance donc PAS non plus tant que
tu n'as pas la main (voir ci-dessous).

Ce que tu fais à la place :
1. Tu écris ta spec E2E (boundingBox >= 44×44 à 375 px sur le bouton retour des réglages mobiles),
   dans le style des specs existantes du domaine : `frontend/e2e/settings-mobile.spec.ts` et
   `frontend/e2e/settings-breakpoints.spec.ts` (ce sont les 2 specs qui citent déjà cette surface —
   regarde si ta mesure a sa place dans l'une d'elles plutôt que dans un nouveau fichier).
   ⚠ Une spec NEUVE n'a pas de session : `test.use({ storageState })` est obligatoire — copie le
   motif exact d'une spec authentifiée existante.
2. Tu VÉRIFIES qu'elle se charge, sans l'exécuter :
   `SKIP_DELEGATION=1 npx playwright test <fichier> --list` (le hook intercepte `--list` aussi).
3. Tu écris noir sur blanc dans ton done.md : « spec écrite, NON EXÉCUTÉE — exécution déléguée à
   la vague 2 ». N'écris jamais qu'elle passe : une spec citée mais jamais jouée est un faux vert
   documenté sur ce dépôt.
4. Vérification statique de ton changement : `npx next lint --file frontend/src/components/settings/mobile/MobileSettings.tsx`
   (`npx eslint` est cassé ici) et `npx prettier --check` sur tes fichiers.
5. Mesure de géométrie : si tu veux un chiffre AVANT exécution, tu peux le tirer du CSS/Tailwind
   (h-11 = 2.75rem = 44px) — mais dis alors que c'est une valeur DÉCLARÉE, pas MESURÉE. Un test
   de géométrie sous jsdom ne prouve rien (jsdom ne met pas en page).

## Dépendances intra-sprint
- #665 (vague 1, en parallèle) touche `frontend/src/components/ui/palette-color-picker.tsx` et ses
  consommateurs — fichiers disjoints des tiens.
- Ne touche PAS : `frontend/src/components/ui/palette-color-picker.tsx`, les drawers catégorie /
  produit / événement, `frontend/app/[locale]/login|register|forgot-password|reset-password/**`,
  `frontend/src/components/shared/OfflineBanner.tsx`.
- Ta spec sera exécutée par l'agent de la vague 2 (#702). Écris-la pour qu'elle soit lisible et
  autonome : s'il doit la déboguer, il n'aura pas ton contexte.

## Designer
Non applicable. Source normative : le handoff (44 px, token `--space-11`) et
`frontend/src/styles/ds/a11y-audit.md`. Le motif d'expansion invisible de référence est
`.mt-zoom__btn` (`timeline.css:410,414,456`) — si tu le retiens plutôt que `h-11 w-11`, justifie
en une ligne (p. ex. l'agrandissement casserait l'alignement de l'en-tête).

## Contraintes
- Branche : `claude/sprint-96-start-b98611` (déjà checkout, worktree — cf. GF-1)
- 1 commit logique, gitmoji FR, `git add` ciblé (GF-3)
- Code en anglais, docs/commentaires en français ; TS strict ; i18n next-intl
- L'en-tête doit absorber l'agrandissement : vérifie le rendu du header des réglages mobiles (titre,
  alignement) — à 375 px, un bouton qui passe de 36 à 44 px peut décaler le titre ou créer un
  débordement. Si tu ne peux pas le mesurer sans Playwright, dis-le et décris le risque.

## Livrable attendu
1. Un fichier `docs/memory/sprints/sprint-96/issue-633-done.md` contenant :
   - `## Objectif` / `## Fichiers modifiés` / `## Mesures` (en distinguant DÉCLARÉ et MESURÉ) /
     `## Tests` (spec écrite, NON exécutée — le dire) / `## Balayage` (périmètre réglages mobiles :
     ce que tu as regardé, ce que tu as trouvé)
   - `## Recommandations suite` — SECTION OBLIGATOIRE. Soit des `RECOMMAND_*`
     (`RECOMMAND_FOLLOWUP: <desc> [triage] [domaine]` pour toute cible < 44 px hors périmètre),
     soit une négation explicite (« Pas de RECOMMAND_X car … »).
   - Les signaux `[MEMORY:pitfall]` / `[MEMORY:pattern]` / `[MEMORY:decision]` ÉCRITS DANS CE FICHIER.
   - Dernière ligne EXACTEMENT : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + `## BLOQUE_SUR`).
2. Un message de retour de 500 tokens MAX, télégraphique : SHA du commit, 3 lignes de résumé,
   pointeur vers le done.md.
