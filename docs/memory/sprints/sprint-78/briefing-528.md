[BRIEFING ISSUE #528 — Sprint 78, vague 1]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire, et vérification du HEAD attendu :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `sprint/78`, HEAD `12f8bc1` (ou un descendant si un autre agent a déjà commité).
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## ⚠ WORKING TREE PARTAGÉ — un autre agent code EN MÊME TEMPS QUE TOI

L'issue **#434** tourne en parallèle sur le MÊME working tree. Elle touche
`scripts/test-quiet.sh`, le `README.md` **racine**, et peut créer/supprimer un fichier sonde
éphémère nommé `frontend/src/__tmp-434-typecheck-probe.ts`.

Règles non négociables :
- `git add <chemins explicites>` **uniquement**. JAMAIS `git add -A`, `git add .`, `git add -u`.
- `git commit -- <mêmes chemins explicites>` (sans pathspec, `git commit` commite TOUT l'index,
  y compris ce que l'autre agent y aurait mis — cf. PIT-S57-001 dans le pack).
- JAMAIS `git commit --amend`, JAMAIS `git stash`, JAMAIS `git checkout -- .`, JAMAIS `git reset`.
- Si un `prettier --check` final signale `frontend/src/__tmp-434-typecheck-probe.ts` ou tout
  fichier hors de ton périmètre que tu ne reconnais pas : **ignore-le**, c'est l'autre agent.
  Ne le reformate pas, ne le commite pas, ne le supprime pas.
- Ne touche PAS : `scripts/test-quiet.sh`, `README.md` (racine), `backend/**`,
  `frontend/vitest.config.mts`. Ils appartiennent à #434 et #169.

## Issue #528 — [CHORE] Trancher le sort de `format:check` — le câbler en CI ou retirer les scripts `format*`

### Contexte (corps de l'issue)

`frontend/package.json` déclare des scripts `format` / `format:check`, mais **aucun workflow
`.github/workflows/` ne lance `format:check`**. La CI lance `npm run lint` (eslint) — lint et
formatage sont deux gates distincts, et une CI verte ne dit rien du second.

C'est une **redécouverte, pas une nouveauté** : le défaut est déjà consigné sous `BUG-S71-002`
dans `docs/memory/bugs-resolved.md`, avec la même conclusion et le même arbitrage laissé ouvert.
Deux sprints (S71, S75) l'ont signalé sans le trancher. L'issue #510 était le MÊME défaut :
fermée comme doublon de celle-ci le 2026-09-06.

### Arbitrage attendu (binaire — c'est le cœur de l'issue)

- **Soit** câbler `format:check` dans la CI — ce qui impose de reformater d'abord la dette
  existante. `prettier-plugin-tailwindcss` réordonne les classes : le diff sera large et touchera
  des fichiers sans rapport avec un quelconque sprint.
- **Soit** retirer les scripts `format*` du `package.json`, et assumer que le formatage n'est pas
  un gate de ce dépôt.

Le statu quo — des scripts qui existent, échouent, et que rien n'exécute — est le pire des trois :
il produit à chaque sprint un faux signal que les agents doivent instruire pour le disqualifier.

**Tu tranches, tu ne demandes pas.** Choisis la branche que la mesure justifie, applique-la
intégralement, et écris le raisonnement (y compris ce qui plaide CONTRE ton choix) dans la
décision consignée.

### Critères d'acceptation

- [ ] L'une des deux branches de l'arbitrage est appliquée **intégralement**
- [ ] Si `format:check` est câblé : `npm run format:check` est VERT à HEAD après reformatage,
      **et** l'étape CI est réellement bloquante (pas un `continue-on-error`, pas un step dont
      la dernière commande ne peut pas échouer — cf. PIT-S64-007)
- [ ] Si les scripts sont retirés : `prettier` et `prettier-plugin-tailwindcss` sortent aussi des
      `devDependencies`, `.prettierrc` / `.prettierignore` sont traités, et rien dans le dépôt
      ne référence plus `format:check` (README, docs, briefings, hooks)
- [ ] La décision est consignée dans `docs/memory/decisions.md` (fichier qui t'est RÉSERVÉ ce
      sprint — cf. section Dépendances) pour clore la boucle de redécouverte
- [ ] La suite unitaire frontend et le `next build` restent verts après reformatage

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_528:
  fichiers_cles:
    - ".github/workflows/ci.yml"
    - "frontend/package.json"
    - "frontend/src/**  (fichiers non conformes)"
    - "frontend/e2e/**  (fichiers non conformes)"
  couches_touchees: ["ci", "frontend"]
  strategie_test: "unit+E2E (non-régression après reformatage massif)"
  risque_regression: "prettier-plugin-tailwindcss réordonne les classes Tailwind — un ordre modifié
    peut changer la cascade et casser une comparaison visuelle (sprint-76-legal-visual,
    sprint-77-theme-visual)."
  ordre_ecriture: "décision → reformat → câblage CI → run des specs visuelles"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — MESURÉ par le lead le 2026-09-06 sur `sprint/78` @ `12f8bc1`

Ces chiffres sont vérifiés, pas déduits. **Trois d'entre eux contredisent le corps de l'issue et
le mini-plan architect — c'est la mesure qui fait foi, pas l'énoncé** (cf. PIT-S71-001).

1. `grep -c format:check .github/workflows/ci.yml` → **0**. Le gate n'existe pas en CI.
   Jobs présents : `backend`, `frontend`, `e2e`, `flyway-smoke`, `security`, `secret-scan`,
   `ai-env-packs`. Le job `frontend` (`.github/workflows/ci.yml` ~L77-115) enchaîne
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint`, en `working-directory: frontend`.

2. **La dette n'est PAS de 2-3 fichiers** comme le laisse entendre le corps de l'issue.
   - `npx prettier --check src e2e` → EXIT 1, « Code style issues found in **104 files** ».
   - **Mais le script `format:check` du dépôt vaut `prettier --check .`** — périmètre `.`, pas
     `src e2e`. Mesuré : EXIT 1, « Code style issues found in **119 files** ».
   - **119 est le chiffre qui compte** : c'est ce que la CI verrait. Le mini-plan architect dit
     104 (il a mesuré `src e2e`) — il sous-estime de 15 fichiers, dont `tailwind.config.ts`.

3. `frontend/.prettierrc` et `frontend/.prettierignore` **existent** (le second ignore déjà
   `.next`, `node_modules`, `coverage`, `playwright-report`, `test-results`, `storybook-static`,
   `public/locales`, `src/styles/ds`). `.prettierrc` : `semi:false`, `singleQuote:true`,
   `trailingComma:"all"`, `printWidth:100`, `tabWidth:2`, `arrowParens:"always"`,
   `plugins:["prettier-plugin-tailwindcss"]`.

4. `frontend/README.md` existe et tombe dans le périmètre `.` de prettier. Le `README.md`
   **racine** n'y tombe PAS (prettier tourne en `working-directory: frontend`) — et il appartient
   à #434 de toute façon.

### PIÈGE DE MESURE CONFIRMÉ EN DIRECT (lead, 2026-09-06) — lis ceci deux fois

Le hook RTK **transforme un `prettier --check` ROUGE en « All files formatted correctly »**
(PIT-S74-008, texte intégral dans le pack ci-dessous). Et un appel derrière un pipe
(`… | tail -15`) rapporte l'exit code de `tail`, donc **0**.

**Protocole de mesure imposé** — toute affirmation de ta part sur l'état du formatage doit venir
de cette forme exacte, sans pipe, avec l'exit code lu immédiatement :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59/frontend
rtk proxy npx prettier --check . > /tmp/pc-528.txt 2>&1; echo "EXIT=$?"; tail -3 /tmp/pc-528.txt
```

Un rapport qui annonce « vert » sans un `EXIT=0` obtenu ainsi sera considéré comme non vérifié.
Le même piège vaut pour `next build` (PIT-S75-002) et `git log -1` (PIT-S77-008).

## Triage
Taille: S
Modèle: opus
Effort: high

## Context-pack (lire EN PRIORITÉ avant tout code)

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

<!-- ===== pit-frontend.md (extrait ciblé issue #528) ===== -->
## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)


## PIT-S16-002 — Subagent en worktree : `cd` Bash résout sur le repo principal
Un subagent lancé depuis un worktree peut voir son `Bash cd <chemin relatif>` résoudre sur le repo principal (`dev`) au lieu du worktree → fichiers écrits au mauvais endroit, faux KO. Solution : chemins ABSOLUS du worktree + `git -C <worktree>`, vérifier `git branch --show-current` AVANT chaque écriture (pas seulement avant commit). (Sprint 16 #166)


## PIT-S19-001 — Subagent lancé depuis un worktree : les écritures dérapent vers le repo principal (raffinement worktree-cwd)
Un fullstack-dev spawné dans un worktree lit bien le worktree (Read initial OK) MAIS ses `Write`/`Edit` + `cd` bash peuvent écrire dans le REPO PRINCIPAL : le cwd bash se reset au repo principal entre appels. En Sprint 19, #63 a codé dans `/Users/herrh/VSProjects/MyTimeline/frontend` (repo principal, SANS le commit #192), puis recopié main→worktree en écrasant l'intégration `<EventPill>` de #192 (regression détectée par le lead à la vérification post-vague, corrigée en `a0a94f1`). Le garde-fou HEAD **au début** NE SUFFIT PAS — c'est l'écriture qui dérape. Prévention : chemins ABSOLUS sous le worktree, `git -C <worktree>` pour tout git, et vérifier `git status` du worktree APRÈS chaque batch d'écriture. Aggravation si le repo principal n'a pas les commits des vagues précédentes → clobber silencieux. (Sprint 19 #63, incident merge)


## PIT-S21-001 — Sprint depuis worktree : le garde-fou EFFICACE est un bloc en tête de briefing (pas « vérifie avant commit »)
Rappel du piège (cf. auto-memory `sprint-subagent-worktree-cwd`) : un subagent lancé depuis `.claude/worktrees/*` défaut-cwd sur le repo principal (`dev`) et écrit au mauvais endroit. En S21, les briefings à garde-fou faible (« vérifie la branche avant de commit ») ont ENCORE laissé #75 et #86 détourer (~10 min/agent + résidus untracked à nettoyer sur `dev`). Ce qui a marché pour #87 + correction : un bloc `⚠️ GARDE-FOU WORKTREE` en TOUT PREMIER avec (a) chemin absolu du worktree, (b) 1re action `cd <worktree> && /usr/bin/git rev-parse --show-toplevel`, (c) tous chemins Write ABSOLUS sous le worktree, (d) `/usr/bin/git -C <worktree>` (bypass RTK qui masque l'écart). Lead : `git -C <repo-principal> status` après chaque retour + `clean -fd` SCOPÉ (jamais global : emporte `.mcp.json`/`CLAUDE.md`/`.ai-env/`). (Sprint 21 #75/#86/#87)


## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)


## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)


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


## PIT-S54-004 — Sur un worktree partagé, un E2E rouge peut appartenir au diff d'un AUTRE agent
En vague 1, la 1re passe E2E de #331 est sortie entièrement rouge dès le `setup` (`getByTestId('dashboard')`
absent), alors que le diff de #331 n'a rien à voir avec l'auth : #329 éditait `auth.setup.ts` **en direct dans
le même working tree** pendant le run. Solution : sur worktree partagé, isoler par `git stash push -- <mes
fichiers>` puis re-run avant d'accuser son propre diff ; un `POST /api/auth/register` en direct (201) départage
API vs UI en 2 s. Corollaire de méthode observé côté lead : **ne jamais lancer deux suites Playwright
concurrentes** contre un backend/une base uniques — la contention a produit 8 puis 12 rouges sur un code
identique (`event-outside-label` rougissait sous contention, passe au run isolé). La règle `--workers=1` du
runbook S47 vaut aussi AU-DESSUS du process Playwright. Cf. [[mytimeline-e2e-ci-only-gate]].


## PIT-S55-002 — `git commit --amend` en fan-out réécrit le commit d'un AUTRE agent
Sprint 55 : un agent a amendé pour remplacer un SHA placeholder dans son propre rapport. Entre son commit et
son amend, un autre agent avait poussé HEAD — **l'amend a réécrit le commit de l'autre**, qui porte désormais
4 lignes du rapport du premier. Rien perdu (`git log --stat`), historique faux. `--amend` réécrit le HEAD
*courant*, qui en fan-out n'est pas forcément le sien : aussi destructeur que `reset`. **Cause racine** :
demander à l'agent d'écrire son propre SHA dans son rapport crée mécaniquement le besoin d'amender.
Solution : ne pas le demander, ou accepter un 2ᵉ commit. Ajouter `--amend` à la liste des verbes git
interdits des briefings, aux côtés de `reset`/`rebase`/`checkout`/`stash`/`clean`.
Cf. [[sprint-parallel-commits-shared-worktree]].


## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.


## PIT-S58-004 — Un garde-fou cité dans la doc peut n'exister nulle part
`ds/a11y-audit.md` affirmait que toute réintroduction d'anneau local serait rattrapée par
`base-layer.test.ts` — ce fichier ne contenait **aucune** occurrence de `focus` / `outline` / `ring`.
Sur ce dépôt les commentaires servent de mémoire d'arbitrage : une garantie fictive est **pire** que pas de
garantie, parce qu'elle dissuade d'en écrire une vraie. **Vérifier l'existence réelle de chaque garde-fou
cité, pas seulement que le chemin du fichier résolve.** Et quand on écrit l'assertion manquante, écrire
**avec elle ce qu'elle n'attrape pas** (ici : elle verrouille la layerisation du CSS source, elle ne détecte
pas un `ring-2` réintroduit dans un `.tsx`).


## PIT-S59-004 — Turbopack sert un chunk CSS périmé et produit un FAUX VERT
Après édition de `globals.css`, la première passe du test d'injection `.dark` est sortie **22 passed** — la
règle injectée n'était simplement pas dans le CSS servi. `touch` et rechargement n'ont rien changé ; **seul
un redémarrage du serveur dev** a compilé la règle. Prévention : avant de conclure « le défaut injecté n'est
pas vu », `curl` le chunk CSS servi et vérifier que l'injection y figure. (Corollaire de [[PIT-S52-002]].)


## PIT-S60-008 — Le squatteur de port peut être un AUTRE worktree DU MÊME projet
Variante de [[PIT-S56-004]] : `:3100` était tenu par un `next-server` de
`worktrees/new-feature-2347-14cb9a/frontend` (up 21 h), rendant **500 sur `/fr/register`**. Le réflexe « c'est
un autre projet du poste » ne suffit donc pas — même nom de projet, même app, mais **code d'une autre branche**.
`lsof -a -p <pid> -d cwd` identifie le propriétaire réel. Prendre un port libre plutôt que tuer le process d'une
autre session.


## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)


## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)


## PIT-S64-007 — Un step GitHub Actions dont la dernière commande est `echo >> "$GITHUB_ENV"` NE PEUT JAMAIS ÉCHOUER
Le `echo` rend 0, donc le step sort en succès même si le service lancé juste avant est mort à la seconde 0. Le diagnostic est repoussé au step suivant, qui accuse alors l'attente plutôt que le démarrage (jusqu'à 180 s perdues). Terminer un tel step par un contrôle de vie explicite qui `exit 1`. (Sprint 64, revue)


## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)


## PIT-S67-001 — Un « blocage amont non corrigeable » se périme EN SILENCE, et survit dans un commentaire de CI puis dans les énoncés d'issues qui le citent
Au S45, `.github/workflows/ci.yml` a consigné que l'advisory `brace-expansion` était incorrigible en aval : « le seul corrigé est 5.0.8, qui change sa forme d'export ; le forcer casse le lint (`expand is not a function`) ». Vrai à l'époque. Faux ~20 sprints plus tard : une `1.1.18` est sortie sur la branche 1.x, or `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` → elle y entre, la branche 5.x n'est jamais sollicitée, `npm run lint` sort exit 0 avec 0 occurrence de l'erreur. Le verdict avait été recopié tel quel dans l'énoncé de #438, ce qui orientait l'issue vers un arbitrage documentaire (« masquer le signal rouge ? ») au lieu d'une correction : les 8 entrées d'audit étaient TOUTES des patchs in-range, `npm audit` est passé de 8 à 0. Prévention : un blocage amont n'est pas un acquis — il se périme le jour où l'amont publie un patch dans la plage semver DÉJÀ déclarée, et rien ne le signale. Lire les plages dans le lockfile (`packages[].dependencies`) avant de croire un « non corrigeable », et re-tester à chaque sprint plutôt que recopier.


## PIT-S67-004 — `check-sprint-completeness.sh` lit LIGNE À LIGNE : une négation « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal NON traité
Le hook extrait chaque ligne contenant `RECOMMAND_<SPEC>` et teste la négation (`pas de.{0,5}recommand`, `non applicable`, `aucun`…) sur **cette seule ligne**. Au S67, `issue-438-done.md` portait « …, pas de\n  `RECOMMAND_UI_DESIGN` (aucune surface visuelle). » : le « pas de » étant sur la ligne précédente, le signal a été compté comme actionnable et non traité, bloquant `/sprint end`. Second piège du même hook : il cherche un fichier dont le NOM contient `test-runner` / `db-expert` / `ui-design` **dans `docs/memory/sprints/sprint-N/`** — un test-runner réellement spawné dont le rapport n'est rangé que dans `docs/memory/audits/` reste invisible. Prévention : une négation `RECOMMAND_*` tient sur UNE ligne (un tiret par spécialiste), et le rapport d'un spécialiste spawné se dépose dans le dossier du sprint (convention S61 : `sprints/sprint-61/test-runner-report.md`).


## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.


## PIT-S70-005 — `check-sprint-completeness.sh` teste LIGNE PAR LIGNE : une négation coupée par un retour à la ligne n'est pas reconnue
Le hook cherche `RECOMMAND_<SPEC>` puis teste, **sur la même ligne**, un motif de négation (`pas de.{0,5}recommand`, `^\s*-?\s*(pas de|aucun)`, `non applicable`, `n/a`…). Au S70, trois négations parfaitement explicites ont été comptées comme signaux non traités uniquement parce que le retour à la ligne d'un paragraphe markdown séparait le « Pas de » du `RECOMMAND_DB_EXPERT`. Symptôme trompeur : `/sprint end` bloque en Phase 1 alors que les `done.md` sont conformes sur le fond. Prévention : dans un `done.md`, écrire **une négation par ligne**, commençant par la négation et portant l'identifiant du signal sur cette même ligne (`- Pas de \`RECOMMAND_X\` : <raison>`). Ne jamais réécrire pour « faire passer » un signal réellement pendant — ici seule la mise en forme était en cause, le fond était déjà correct.


## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)


## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)


## PIT-S71-008 — Normaliser la casse d'un hex sur le chemin « déjà conforme » fait passer une identité pour une modification
Une fonction de plancher qui `toLowerCase()` sa sortie avant même de décider qu'il n'y a rien à corriger renvoie une valeur ≠ de l'entrée : style inline recalculé à chaque frappe, `toBe` faussement rouge, diff bruyant. Prévention : court-circuiter (`return input`) sur le chemin conforme **avant** toute normalisation de format. (Sprint 71 #497)


## PIT-S71-010 — Indexer ses seuls hunks dans un working tree partagé : plumbing git, jamais le working tree
`UserControllerTest.java` était édité en parallèle par #134 et #148. `git add -p` est indisponible (mode non interactif) et le diff redirigé est corrompu ([[PIT-S71-002]]). Recette : `git cat-file -p HEAD:<path>` → reconstruction du contenu voulu → `git hash-object -w` → `git update-index --cacheinfo` : l'index reçoit la version voulue et **le working tree n'est jamais touché**, donc le WIP du voisin reste intact. Complément de [[sprint-parallel-commits-shared-worktree]]. (Sprint 71 #134)


## PIT-S72-002 — « `tsc --noEmit` : 0 erreur » dans un rapport d'agent peut être faux — vitest ne typecheck pas
L'agent de #72 a rapporté un typecheck propre ; `i18n-intl-classes.test.ts:65` levait pourtant TS2322 à HEAD. La suite vitest était verte parce qu'elle **ne typecheck pas** : seul le job frontend en CI l'aurait attrapé. L'écart a été trouvé par l'agent de l'autre issue, puis vérifié par le lead. Prévention : rejouer soi-même `tsc --noEmit` avant de reprendre un chiffre de typage dans un audit ; deux rapports d'agent qui se contredisent se tranchent par la mesure, jamais par l'ancienneté du rapport. Voir [[PIT-S71-...]] sur l'étiquette « pré-existant ». (Sprint 72)


## PIT-S72-006 — Un run de tests dans un working tree partagé n'est valable que si `git status` est stable de bout en bout
La suite frontend est sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 éditait `authService.ts` dans le même arbre ; verte au re-run isolé. Prévention : en fan-out, re-jouer avant d'imputer un échec à son propre diff. Corollaire direct de l'étiquette « pré-existant » et complément de [[PIT-S71-010]]. (Sprint 72 #72)


## PIT-S73-008 — Deux subagents en fan-out qui partagent la stack E2E se corrompent mutuellement
Deux absorptions lancées en parallèle dans le même worktree ont chacune démarré `next dev` + Playwright : `.next` corrompu en cours de run (`Cannot find module './vendor-chunks/…'`, 500 sur `/fr/dashboard`) → tests rouges dont le diagnostic accuse FAUSSEMENT le code de la page ; puis 3 runs perdus sur le verrou `e2e/.auth/run.lock`. Prévention : sérialiser les agents qui ont besoin de la stack E2E, ou ne paralléliser que ceux qui n'en ont pas besoin. (Sprint 73)


## PIT-S74-007 — `warn-test-delegation.sh` bloque aussi le heredoc qui CONTIENT la commande, et l'échec se déguise en lancement réussi
Le hook scanne le texte de l'appel `Bash` : écrire un script avec un heredoc contenant `npx playwright test` est bloqué comme si on la lançait. Conséquence vécue au S74 : le heredoc bloqué n'a pas créé le `.sh`, l'appel suivant a lancé `nohup` dessus et a rendu un `pid=` rassurant — **10 minutes d'attente sur un run qui n'existait pas**. Prévention : préfixer de `SKIP_DELEGATION=1` **l'appel qui écrit le script**, pas seulement celui qui l'exécute, et vérifier `ls -l` du script avant tout `nohup`. (Sprint 74)


## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)


## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)


## PIT-S76-005 — zsh ne fait pas de word-splitting : `git add -- $F` avec une liste de chemins en variable ne stage RIEN
Sous zsh (shell de ce poste), `$F` contenant plusieurs chemins arrive comme **UN SEUL** pathspec : `git add` sort en 128, rien n'est indexé. L'échec est bruyant donc bénin, mais il coûte un aller-retour à chaque agent d'une vague de fan-out — et le même piège produit des FAUX POSITIFS silencieux dans les boucles d'audit (`for tid in $NEW_TESTIDS` du check coverage-E2E a rendu un MAJEUR fantôme au S76). Écrire les chemins littéralement, ou `${=F}`, ou un tableau. À corriger dans les gabarits de briefing qui recommandent « `git add <fichiers exacts>` ». (Sprint 76 #310)


## PIT-S76-007 — Le vérificateur de complétude de sprint lit LIGNE À LIGNE : une négation `RECOMMAND_*` repliée par le formatage compte comme signal NON TRAITÉ
Récurrence mesurée de [[PIT-S70-005]] / [[PIT-S67-004]] au S76 : le done.md de #310 portait « … ; pas\nde `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY_EXPERT` car … ». Le « pas » étant sur la ligne précédente, `check-sprint-completeness.sh` a compté **deux** signaux actionnables non traités et bloqué la clôture. Le piège n'est pas la rédaction mais **le repli à 100 colonnes** appliqué après coup. Écrire chaque négation sur UNE ligne, et le dire dans le done.md pour qu'un reformatage ultérieur ne la casse pas. Même famille : le garde-fou de Phase 9 grep `[MISSING]` littéralement et se déclenche sur la PHRASE QUI LE DOCUMENTE dans l'audit. (Sprint 76, clôture)



## PIT-S77-008 — RTK corrompt `git log -1` ET avale le code de sortie : vérifier HEAD par `git rev-parse`
Au S77, `git log --oneline -1` rendait le **parent** (`1271253`) là où `git rev-parse HEAD` rendait le vrai HEAD (`82d66b9`) — de quoi conclure à tort que le briefing du lead se trompait de base. Et `npx vitest … ; echo $?` rend une chaîne **vide** sous le hook. Le hook réécrit aussi les **arguments** : `npx storybook dev -p 6006` est devenu `storybook dev -p 6006 dev 6006`. Toute vérification de HEAD passe par `git rev-parse`, tout code de sortie et toute commande longue par `rtk proxy`. Élargit [[PIT-S45-003]] et [[PIT-S71-002]]. (Sprint 77)


## PIT-S77-010 — `toHaveScreenshot` se stabilise sur le MAUVAIS rendu : deux frames de repli consécutives sont identiques
L'API rejoue la capture jusqu'à obtenir deux captures consécutives identiques avant de comparer — on en déduit à tort qu'elle attend un rendu **correct**. Deux frames en police de repli sont identiques : elle se stabilise dessus et compare celle-là. « Attendre la stabilité » ne remplace jamais « attendre la bonne condition » (police chargée, spinner retombé, section révélée). (Sprint 77 #294)


## PIT-S77-011 — Une référence de diff visuel capture l'habillage dépendant de l'ENVIRONNEMENT — et `mask` est le mauvais remède
Peints DANS la boîte de l'élément : indicateur de dev Next (`nextjs-portal`, absent sous `next start`), devtools TanStack (`.tsqd-parent-container`, dev only) et surtout `OfflineBanner` (`[data-testid="network-banner"]`), qui n'existe QUE quand l'API est injoignable — il **aurait rougi la CI en permanence**. Remède : injecter un `display:none` via `addStyleTag`, **pas** `toHaveScreenshot({ mask })` : un masque ne s'applique qu'aux éléments EXISTANTS, il graverait un rectangle dans la référence sans équivalent en CI. Prévention : avant de générer une référence, énumérer les éléments `position: fixed|sticky` et se demander lesquels dépendent du mode de build ou de la santé de l'API. (Sprint 77 #294)


## PIT-S77-016 — Une tolérance déplacée d'une config globale vers le point d'appel peut n'être plus délivrée — un run vert ne le prouve pas
Sur un poste où le bruit visuel mesuré est de **0 pixel**, les captures passent AUSSI BIEN avec la tolérance qu'avec le défaut « aucun pixel toléré » : **11/11 vert ne prouve rien** sur la délivrance de l'option. Remède : **contrôle par élargissement** — porter temporairement `maxDiffPixelRatio` au-dessus du ratio produit par la mutation du contrôle négatif ; celui-ci DOIT alors échouer. Sur toute constante de tolérance, exiger une expérience qui **change le verdict**, jamais un run vert. (Sprint 77, cycle 2 de review)


## PIT-S77-017 — Un contrôle négatif qui appelle `toHaveScreenshot` avec ses propres options perd la tolérance et se désarme EN SILENCE
Y oublier la tolérance le fait retomber sur le défaut Playwright (aucun pixel toléré) : il **reste vert**, mais cesse de mesurer la tolérance réellement appliquée aux captures. Aucun signal. Remède : étaler la constante partagée (`{ ...VISUAL_TOLERANCE, timeout }`). Quand on sort une valeur d'une config globale, énumérer **tous** ses consommateurs, contrôle négatif compris. (Sprint 77, cycle 2 de review)


## PIT-S77-019 — Références `toHaveScreenshot` : jammy ≠ noble rougit la CI, et `--update-snapshots` grave la mutation du contrôle négatif
Deux pièges enchaînés, mesurés sur la PR #536. (1) **Plateforme** : Playwright suffixe `-chromium-linux` pour *toute* distribution. Des références générées en `playwright:v1.61.1-jammy` (22.04) sont donc **comparées** sur un runner `ubuntu-latest` = **noble 24.04**, pas signalées manquantes — écart **ratio 0,01** (717 à 1259 px sur les cartes auth), soit l'ordre de grandeur de la plus petite régression détectable (0,0117) : **élargir la tolérance désarme la spec**. Seul remède : régénérer sur l'image du runner, contre un build de **production** (la CI joue `next start`). (2) **Régénération** : `--update-snapshots` **écrase** les références existantes, donc grave la mutation d'interlettrage du contrôle négatif dans `landing-hero-light.png` (13 058 px d'écart au run suivant). La garde `existsSync` protège d'une *création*, pas d'un *écrasement*. Toujours `--grep-invert "armement"`, puis **rejouer SANS `--update-snapshots`** avant de conclure. Fragilité durable : un futur bump d'`ubuntu-latest` rougira pareil. (Sprint 77 #294, PR #536)


## PIT-S77-020 — Playwright sort **exit 0** avec « N did not run » quand le projet `setup` échoue : lire le COMPTE de tests, pas le code de sortie
Vérification du lead lancée sans `--no-deps` : Playwright a joué le projet `setup`, qui provisionne des comptes contre un backend absent ; les **11 tests visuels ont été sautés** et la sortie affichait « 1 passed, **11 did not run** » — **avec un code de sortie 0**. Une vérification qui ne vérifiait rien. Un code de sortie ne suffit jamais : lire le nombre de tests **réellement exécutés**. Voisin de [[PIT-S61-005]] et [[PIT-S45-003]]. (Sprint 77, audit de clôture)

---


<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

- **Vague 1**, en parallèle avec **#434** (`scripts/test-quiet.sh` + `README.md` racine).
- **#169** (JaCoCo + vitest coverage) est en **vague 2** et attend ton commit : elle touche
  `.github/workflows/ci.yml` et `frontend/vitest.config.mts`. **`ci.yml` est à TOI pendant la
  vague 1** — #169 rebasera sur ton état. Laisse le fichier dans un état cohérent et commité.
- **Fichiers qui te sont RÉSERVÉS ce sprint** (personne d'autre n'y touche) :
  `.github/workflows/ci.yml`, `frontend/package.json`, `frontend/package-lock.json`,
  `frontend/.prettierrc`, `frontend/.prettierignore`, `docs/memory/decisions.md`,
  et tout `frontend/src/**` + `frontend/e2e/**`.
- **Fichiers INTERDITS** : `scripts/test-quiet.sh`, `README.md` racine, `backend/**`,
  `frontend/vitest.config.mts`, `docs/memory/sprint-history.md`.

## Exclusivité Playwright

**Tu détiens l'exclusivité Playwright pour la vague 1.** Aucun autre agent ne lance de E2E.
Si tu reformates `frontend/e2e/**` (10 specs concernées), c'est à toi de vérifier la
non-régression. Attention :
- Les specs de diff visuel (`sprint-76-legal-visual`, `sprint-77-theme-visual`) comparent des
  captures de référence. Un réordonnancement de classes Tailwind **peut** changer la cascade
  (PIT-S53-001/003/004 dans le pack) — mais `prettier-plugin-tailwindcss` trie selon un ordre
  **canonique** qui n'est censé changer que la source, pas le rendu. Si une comparaison visuelle
  rougit, c'est un signal RÉEL : ne « corrige » pas en régénérant les références
  (`--update-snapshots` grave la mutation dans la référence — PIT-S77-019/017).
- Les références de screenshot sont plateforme-dépendantes (jammy ≠ noble). Un rouge local sur
  `toHaveScreenshot` peut n'être QUE cela. Distingue-le avant de conclure, et dis-le explicitement
  dans ton rapport si tu ne peux pas trancher.
- Playwright peut sortir **exit 0** avec « N did not run » si le projet `setup` échoue : lis le
  COMPTE de tests, jamais le seul code de sortie (PIT-S77-020).
- Recette E2E locale : la config `playwright.config.ts` documente la recette worktree (webpack,
  PAS turbopack). Lis-la avant de lancer quoi que ce soit. Si l'environnement E2E ne se lève pas
  en moins de ~15 minutes d'efforts, **ne t'obstine pas** : rapporte-le en clair, livre le reste,
  et signale `RECOMMAND_TEST_RUNNER` — le lead lancera la suite complète en Phase 6.

## Contraintes

- Branche cible : `sprint/78` (déjà checkout dans le worktree). **Aucune CI ne tourne sur les
  branches `sprint/N`** (PIT-S64-008) — tu ne peux donc pas « laisser la CI juger » : la
  vérification locale est la seule qui existe avant la PR.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant
  l'arbitrage. Si le reformatage est massif, il reste dans le MÊME commit que le câblage — un
  reformatage sans son gate est exactement le statu quo que l'issue condamne.
- `git add <chemins explicites>` puis `git commit -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement, ou utilise un tableau bash.
- Tests obligatoires avant de conclure, chacun avec son exit code lu :
  `npm run test` (Vitest), `npm run typecheck`, `npm run build`, `npm run lint`,
  et `npm run format:check` si tu as retenu cette branche.
  `./scripts/test-quiet.sh` peut échouer dans un worktree (`node_modules` absent —
  PIT-S69-002) : dans ce cas lance les commandes npm directement depuis `frontend/`.
- Si tu dois trancher un arbitrage secondaire non prévu (ex. faut-il ignorer un dossier
  supplémentaire), tranche et documente — ne bloque pas.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-528-done.md`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-528-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #528 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<objectif, arbitrage retenu ET pourquoi l'autre a été écarté, fichiers clés, chiffres mesurés
avec leurs exit codes, pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>

## Signaux mémoire
[MEMORY:decision] <une ligne>
[MEMORY:pitfall] <une ligne>   (autant que nécessaire ; écris-les ICI, pas seulement dans ta
                                réponse — c'est ce fichier que le lead consolide)

## Recommandations suite
RECOMMAND_<X> : <raison>
ou une NÉGATION EXPLICITE tenant sur UNE SEULE LIGNE, ex :
"Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête SQL touchée."
(le vérificateur de complétude lit LIGNE À LIGNE — une négation repliée sur deux lignes n'est
pas reconnue : PIT-S67-004 / PIT-S70-005 / PIT-S76-007)
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L|XL | domaine <x>]   (si applicable)

STATUS: COMPLETED
```

Dernière ligne du fichier = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
`BLOQUE_SUR` détaillée juste avant). Rien après.
