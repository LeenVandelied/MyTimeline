[BRIEFING ISSUE #434 — Sprint 78, vague 1]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `sprint/78`, HEAD `1ebdd64` (ou un descendant).
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## ⚠ WORKING TREE PARTAGÉ — un autre agent réécrit `frontend/` EN CE MOMENT

L'issue **#528** tourne en parallèle et **reformate potentiellement 119 fichiers sous
`frontend/`** (prettier + prettier-plugin-tailwindcss), plus `.github/workflows/ci.yml`,
`frontend/package.json` et `docs/memory/decisions.md`.

Conséquences concrètes pour toi :
- `git status` sera bruyant et **instable de bout en bout** : ne tire AUCUNE conclusion d'un
  `git status` global (PIT-S72-006). Raisonne uniquement sur TES fichiers.
- `git add <chemins explicites>` **uniquement**. JAMAIS `git add -A`, `git add .`, `git add -u`.
- `git commit -- <mêmes chemins explicites>` : sans pathspec, `git commit` commite TOUT l'index,
  donc le travail de l'autre agent (PIT-S57-001).
- JAMAIS `git commit --amend`, `git stash`, `git checkout -- .`, `git reset`.
- **Fichiers INTERDITS** (ils appartiennent à #528 / #169) : `frontend/package.json`,
  `frontend/package-lock.json`, `frontend/.prettierrc`, `frontend/.prettierignore`,
  `.github/workflows/ci.yml`, `docs/memory/decisions.md`, `frontend/README.md`,
  `frontend/vitest.config.mts`, `backend/pom.xml`, tout `frontend/src/**` et `frontend/e2e/**`
  **de façon durable** (voir l'exception « fichier sonde » plus bas).
- **Fichiers qui te sont RÉSERVÉS** : `scripts/test-quiet.sh`, `README.md` **racine**, et les
  gabarits de briefing sous `.claude/` s'il en existe.

## ⚠ PAS DE PLAYWRIGHT, PAS DE E2E

L'exclusivité Playwright de la vague 1 est détenue par #528. **Tu ne lances jamais
`./scripts/test-quiet.sh e2e`, ni la CLI Playwright, ni aucun serveur `next dev` / `next start`
de longue durée.** Deux agents qui partagent la stack E2E se corrompent mutuellement
(PIT-S73-008), et le port peut être squatté par un AUTRE worktree du même projet
(PIT-S60-008). Le lead exécutera la suite E2E complète en Phase 6.

Tu peux en revanche lancer `npm run typecheck`, `npm run lint`, `npm run build` et `npm run test`
depuis `frontend/` — ils ne nécessitent pas de serveur.

## Issue #434 — [BUG] Aligner `scripts/test-quiet.sh frontend` sur ce qu'annoncent les docs

### Contexte (corps de l'issue)

`scripts/test-quiet.sh` permet de lancer rapidement les vérifications automatiques du frontend.
La documentation et les consignes internes décrivaient ce contrôle comme complet : tests +
build + typecheck + style. En réalité il ne lance **que** Vitest. Un développeur — ou un agent —
qui voit ce contrôle au vert et en conclut « le frontend est bon » se trompe : le build peut être
cassé sans que ce contrôle le détecte. Ce malentendu a déjà produit **un rapport de vérification
entièrement faux** lors d'un sprint précédent (PIT-S60-009, texte intégral dans le pack), et
s'est reproduit dans les documents de travail du Sprint 60 lui-même.

### À faire — arbitrage binaire

1. **Étendre** le scope `frontend` pour qu'il exécute réellement `typecheck` + `lint` + `build`
   en plus de Vitest — que le contrôle corresponde à ce que son nom laisse penser.
2. **Renommer** ce scope en `frontend-unit` (signalant qu'il ne couvre que l'unitaire) et
   documenter séparément les commandes build / typecheck / lint.

**Tu tranches, tu ne demandes pas.** Mesure d'abord le coût (option 1 rallonge fortement le
scope : `next build` sur ce projet n'est pas gratuit — chronomètre-le), puis choisis, applique
intégralement, et écris ce qui plaidait CONTRE ton choix.

Si tu retiens l'option 2 (renommage), tu dois traiter **tous les appelants existants** du scope
`frontend` — un scope renommé sans ses appelants est une régression, pas une clarification.
Grep-les : `docs/`, `.claude/`, `README.md`, `scripts/`, workflows.

### Critères d'acceptation

- [ ] Décision documentée entre les deux options, avec la mesure de durée qui la fonde
- [ ] `scripts/test-quiet.sh frontend` (ou son nouveau nom) exécute **exactement** ce que sa
      documentation annonce — ni plus, ni moins
- [ ] Le `README.md` racine et les gabarits de briefing de sprint sont cohérents avec le
      comportement réel
- [ ] **Vérification empirique obligatoire** : casser volontairement le build (erreur de type)
      et confirmer que le scope choisi le détecte — ou, si scope renommé, que la documentation
      indique clairement la commande alternative, et que CELLE-CI détecte la casse.
      Protocole imposé pour cette vérification : voir « Fichier sonde » ci-dessous.

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_434:
  fichiers_cles:
    - "scripts/test-quiet.sh  (run_frontend ; case SCOPE)"
    - "README.md  (racine)"
  couches_touchees: ["ci"]
  strategie_test: "manuel (exécuter les scopes) — pas de test automatisé du script"
  risque_regression: "Option 1 (étendre le scope) rallonge fortement `frontend` (build Next) et
    peut faire échouer les briefings de sprint qui l'appellent en boucle ; option 2 (renommer en
    frontend-unit) casse tous les appels existants du scope `frontend`."
  ordre_ecriture: "décision documentée → script → README/briefings"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — vérifié par l'architect puis par le lead (2026-09-06)

**Le corps de l'issue est en partie périmé. Deux écarts relevés — vérifie AVANT de t'appuyer
sur l'énoncé** (PIT-S71-001, PIT-S74-003) :

1. **Les numéros de ligne de la « piste technique » sont faux.** L'issue dit
   `run_frontend`, lignes ~96-103 ; l'architect a mesuré ~L200-225, et le `case SCOPE` ~L250.
   Localise la fonction par son nom, pas par son numéro de ligne.

2. **Le scope n'est pas « nu ».** Depuis #308, le script a gagné un **préflight substantiel**
   (résolution des paquets importés par `eslint.config.mjs`, détection d'un `node_modules`
   absent ou vide). Le scope n'est donc pas vide : il est **incomplet au sens annoncé**.
   Le `README.md` a déjà été corrigé au S60, et le script **documente honnêtement son périmètre
   dans son en-tête (~L18-20)**. Ton diff doit tenir compte de cet existant plutôt que de le
   réécrire depuis zéro.

3. `run_frontend()` n'exécute effectivement que `npm test --silent` (Vitest) : ni typecheck,
   ni lint, ni build. **CONFIRMÉ.**

4. Le scope `coverage` contient **déjà** un branchement conditionnel
   (`grep -q jacoco backend/pom.xml`) : il s'activera tout seul quand **#169** livrera, en
   vague 2. **N'y touche pas** — et ne « corrige » pas ce branchement au prétexte qu'il ne
   s'active pas aujourd'hui.

5. Pour référence (job CI `frontend`, `.github/workflows/ci.yml` ~L77-115) : la CI enchaîne
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint`. C'est l'ordre de référence si
   tu retiens l'option 1. **Tu ne modifies PAS `ci.yml`** (fichier de #528).

### Fichier sonde — protocole imposé pour la vérification empirique

Tu dois casser le typecheck pour prouver que ton scope le détecte, mais un autre agent réécrit
`frontend/src/**` en même temps. Contrainte :

- Nomme le fichier **exactement** `frontend/src/__tmp-434-typecheck-probe.ts` (l'agent #528 a
  été prévenu de ce nom précis et sait qu'il doit l'ignorer).
- Crée-le, lance ton scope, lis l'exit code, **supprime-le immédiatement** dans le même
  enchaînement. Il ne doit JAMAIS être stagé ni commité.
- Vérifie sa disparition avant de conclure : `ls frontend/src/__tmp-434-typecheck-probe.ts`
  doit renvoyer « No such file ». Un `trap EXIT` à chemin relatif MENT (PIT-S71-005) — vérifie
  explicitement, ne te fie pas au trap.

### Piège de mesure

Le hook RTK falsifie des sorties : il a déjà transformé un `prettier --check` rouge en « All
files formatted correctly » (PIT-S74-008), et il falsifie aussi `next build` — **la redirection
vers un fichier ne désamorce rien** (PIT-S75-002). `vitest` a été affiché « PASS (23) FAIL (0) »
alors qu'une suite échouait à la COLLECTE (PIT-S45-003).

**Toute affirmation de ta part sur un vert/rouge doit citer un exit code lu sans pipe :**

```bash
rtk proxy <commande> > /tmp/out-434.txt 2>&1; echo "EXIT=$?"; tail -5 /tmp/out-434.txt
```

Un `… | tail -15` rapporte l'exit code de `tail`, pas celui de la commande.

Attention aussi : `warn-test-delegation.sh` tue la commande ENTIÈRE, **y compris un heredoc qui
écrit un fichier**, et l'échec se déguise en lancement réussi (PIT-S63-007, PIT-S74-007). Le lead
s'est fait piéger en direct en écrivant CE briefing : un heredoc contenant la chaîne de la CLI
Playwright a été tué par le hook. Si une écriture par heredoc semble n'avoir rien produit, c'est
probablement ça — utilise l'outil Write.

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

<!-- ===== pit-frontend.md (extrait ciblé issue #434) ===== -->
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


## PIT-S61-007 — `npm run dev` (turbopack) infère un mauvais workspace root en worktree, et TOUT casse
Le script force `--turbopack`, qui choisit un **autre worktree** quand plusieurs lockfiles coexistent : toutes les
pages rendent 500 (`ENOENT app-build-manifest.json`), `auth.setup.ts` casse, **0 spec ne s'exécute** — et le
message d'erreur ne dit rien de la cause. Un agent test-runner en a conclu « E2E impossibles sans modifier le
dépôt ». Contournement réel, sans modification : `rtk proxy npx next dev -p 3100` (webpack). Voisin de
[[PIT-S60-008]] (le squatteur de port peut être un autre worktree du même projet).


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)


## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)


## PIT-S64-005 — `curl … -w '%{http_code}' || echo 000` CONCATÈNE au lieu de substituer
Le résultat est `000000`, qui passe un test `-lt 500` : une boucle d'attente se croit satisfaite au premier tour et laisse passer un service mort. Mesuré au S64 en écrivant les oracles du job `e2e`. (Sprint 64 #462)


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


## PIT-S71-005 — Un `trap EXIT` de restauration à chemin RELATIF ment : il annonce `[restored]` sur un fichier encore muté
Script de mutation testing (#495) : `trap restore EXIT`, puis la suite Playwright lancée depuis `frontend/` via un `cd`. Le trap s'exécute dans le cwd **final** → `FileNotFoundError` sur le chemin relatif, fichier source resté **muté** dans un working tree partagé par 3 autres agents — et le script a rendu `exit 0` en affichant `[restored]`. Prévention : chemins **absolus** dans tout trap de restauration, et vérifier la restauration par un `grep -c` du motif attendu, jamais par la sortie du script. (Sprint 71 #495)


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



<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

- **Vague 1**, en parallèle avec **#528** (`format:check` / reformatage massif de `frontend/`).
- **#169** (JaCoCo + vitest coverage) est en **vague 2**. Elle rendra actif le branchement
  `coverage` déjà présent dans `scripts/test-quiet.sh`. **Ne l'anticipe pas**, ne le modifie pas :
  ton diff doit rester compatible avec ce branchement tel qu'il est écrit aujourd'hui.
- Si ton arbitrage rend le scope `frontend` sensiblement plus long, **dis-le explicitement** :
  #169 et les sprints suivants appellent ce scope en boucle. C'est une conséquence à assumer,
  pas à cacher.

## Contraintes

- Branche cible : `sprint/78` (déjà checkout dans le worktree). **Aucune CI ne tourne sur les
  branches `sprint/N`** (PIT-S64-008) : la vérification locale est la seule qui existe avant la PR.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant
  l'arbitrage et citant la mesure de durée qui le fonde.
- `git add <chemins explicites>` puis `git commit -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement.
- `./scripts/test-quiet.sh` peut échouer dans un worktree parce que `node_modules` y est absent,
  et le `node_modules` partagé du dépôt principal ne le sauve pas (PIT-S69-002). **C'est une
  contrainte de premier ordre pour cette issue** : si le script ne peut pas tourner ici, dis-le,
  et vérifie ton arbitrage en lançant les commandes npm équivalentes depuis `frontend/`.
  Ne conclus jamais « le scope marche » sur un script que tu n'as pas réussi à exécuter.
- Un garde-fou cité dans la doc peut n'exister nulle part (PIT-S58-004) : si tu écris dans le
  README qu'une commande existe, exécute-la d'abord.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-434-done.md`.
- `docs/memory/decisions.md` est **réservé à #528** ce sprint. Ta décision ne s'y écrit PAS :
  émets-la comme signal `[MEMORY:decision]` dans ton done.md — le lead la consolidera en Phase 2
  de `/sprint end`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-434-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #434 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<arbitrage retenu ET pourquoi l'autre a été écarté, mesure de durée, fichiers clés, appelants
traités, pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>
<preuve empirique de la détection de casse : sonde créée, scope lancé, EXIT=N, sonde supprimée>

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
