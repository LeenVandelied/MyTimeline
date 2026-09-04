[BRIEFING ISSUE #417 — Sprint 74 « Landing & focus polish »]

## Issue #417 — [BUG] Contour de focus rogné dans `.mt-zoom` et le tablist des réglages

Labels : `bug`, `epic:design`, `priority:P3`, `size:XS`, `frontend`, `sprint-74`

### Énoncé (verbatim GitHub)

**Contexte.** Dans deux zones (contrôles de zoom de la timeline, onglets des réglages), le cadre
qui signale l'élément atteint au clavier est **rogné** : seuls 1 ou 2 côtés sur 4 sont peints.
Défaut **pré-existant** : le Sprint 58 ne l'a pas introduit, il l'a rendu visible en unifiant
l'indicateur de focus.

**À faire.** L'`overflow:hidden` posé sur les conteneurs coupe le contour de focus des éléments
enfants : 1 à 2 côtés peints sur 4, dans `.mt-zoom` et dans le tablist des réglages.
Pré-existant, prouvé (fichiers restaurés au commit de base puis re-mesurés — l'ancien `ring-*`
était rogné exactement de la même manière). Correctif attendu : `outline-offset: -2px`, motif
**déjà employé dans le dépôt** — `ds/components/timeline.css:115` et `:131`.

**BR impactées :** aucune.

**Critères d'acceptation :**
- [ ] Contour peint sur les **4** côtés dans `.mt-zoom`
- [ ] Contour peint sur les 4 côtés dans le tablist des réglages
- [ ] Vérifié au navigateur, en clair et en sombre
- [ ] Le correctif emploie `outline-offset` négatif, **pas** un retour au `ring-*` (`DEC-S58-001`)

**Risques techniques.**
- ⚠ Ne **pas** répondre par un retour au `ring-*` : c'est un `box-shadow`, il se fait rogner à
  l'identique par `overflow:hidden`, et il est écarté par `DEC-S58-001`.
- Un `outline-offset` négatif rapproche le contour du contenu : vérifier qu'il ne recouvre pas
  le libellé sur les cibles les plus étroites.

**Origine.** Follow-up du Sprint 58, arbitré au triage de clôture. Artefacts :
`docs/memory/sprints/sprint-58/` (`issue-383-done.md`, `issue-352-done.md`),
charte : `docs/memory/sprints/sprint-58/design-arbitrage-383-352.md`.

## Triage

Taille : XS · Modèle : opus · Effort : high

## État réel du code — vérifié par le lead à `455862f`

⚠ **Les numéros de ligne de l'énoncé sont périmés.** Le motif cité « `timeline.css:115` et
`:131` » ne s'y trouve plus. Les occurrences réelles d'`outline-offset` négatif sont :

```
frontend/src/styles/ds/components/timeline.css:180  .mt-tlv__group-head:focus-visible{outline:2px solid var(--color-focus); outline-offset:-2px;}
frontend/src/styles/ds/components/timeline.css:196  .mt-tlv__lane-head:focus-visible{outline:2px solid var(--color-focus); outline-offset:-2px;}
frontend/src/styles/ds/components/timeline.css:284  .mt-tlm__evt--archived{… outline-offset:-1px;}
```

C'est **ce** motif (lignes 180 / 196) qui fait référence, pas les lignes annoncées.

### Zone A — `.mt-zoom` (contrôles de zoom)

`frontend/src/styles/ds/components/timeline.css` :

```
123: .mt-zoom{display:inline-flex; align-items:stretch; border:1px solid var(--color-rule-emphasis); border-radius:var(--radius-md); overflow:hidden;}
124: .mt-zoom__btn{width:30px; background:var(--color-surface); border:0; …}
125: .mt-zoom__btn:first-child{border-right:1px solid var(--color-rule);}
126: .mt-zoom__btn:last-child{border-left:1px solid var(--color-rule);}
127: .mt-zoom__btn:hover{background:var(--color-surface-2);}
```

`.mt-zoom` porte bien `overflow:hidden` (ligne 123), et **`.mt-zoom__btn` n'a aucune règle
`:focus-visible` propre** : il hérite du contour `@layer base` du DS, à `outline-offset` positif
(2 px) → rogné par le conteneur. Confirmé.

⚠ **Il existe déjà une exception mobile** à ne pas casser :
```
390: .mt-tlm .mt-zoom{overflow:visible;}
391: .mt-tlm .mt-zoom__btn{position:relative; min-height:44px;}
```
(commentée lignes 375-390). Ton correctif doit rester cohérent avec elle — et le cas
`.mt-tlm` (où `overflow` est déjà `visible`) n'a peut-être **pas** besoin de l'offset négatif :
un offset négatif y dégraderait un contour aujourd'hui correct. Tranche explicitement.

### Zone B — tablist des réglages

Ce n'est **pas** un `overflow:hidden`, contrairement à l'énoncé :

```
frontend/src/components/settings/SettingsShell.tsx:67
  className="border-rule flex flex-row gap-1 overflow-x-auto border-b"
```

C'est un **`overflow-x-auto`** (utilitaire Tailwind), qui calcule `overflow-y` à `auto`
également. Le contour des onglets est posé par :

```
frontend/src/styles/ds/components/core.css:251  .mt-tabs{display:flex; gap:24px; border-bottom:1px solid var(--color-rule);}
frontend/src/styles/ds/components/core.css:252  .mt-tab{… padding:0 1px 10px; border-bottom:2px solid transparent; margin-bottom:-1px; …}
frontend/src/styles/ds/components/core.css:260  .mt-tab:focus-visible{outline:2px solid var(--color-focus); outline-offset:3px;}
```

`outline-offset:3px` dans une boîte à `overflow-x-auto` : le rognage est cohérent avec le
constat. Le composant est `frontend/src/components/ui/tabs.tsx` (`.mt-tabs` l. 61, `.mt-tab` l. 73).

### Ce que le lead N'A PAS tranché — lis ceci avant de coder

1. **`frontend/src/styles/ds/a11y-audit.md:326` semble contredire l'issue.** À propos du cas
   `<tr>` dans un `div.overflow-x-auto`, l'audit conclut : « **Aucune action** : ni `ring-*`
   […] ni `outline-offset` négatif, qui poserait le trait SUR la bordure `border-b` de la
   ligne. » Ta zone B est *exactement* cette configuration (conteneur `overflow-x-auto`,
   `.mt-tab` avec un `border-bottom` et un `margin-bottom:-1px`). **Lis l'entrée en entier**
   (`sed -n '300,340p' frontend/src/styles/ds/a11y-audit.md`) et **tranche explicitement** :
   soit le raisonnement de l'audit ne s'applique pas ici et tu dis pourquoi, soit il s'applique
   et la zone B relève d'un autre correctif que l'offset négatif. Une correction qui pose le
   contour par-dessus le soulignement d'onglet sélectionné (`border-bottom-color: accent`,
   l. 259) rendrait l'état sélectionné illisible : c'est une régression, pas un correctif.
   **Ne te contente pas d'appliquer l'énoncé si le code te dit autre chose.** Si les deux zones
   n'admettent pas le même remède, livre le remède de A et rends `PARTIAL` sur B avec ton
   analyse — c'est un résultat acceptable, un correctif qui casse la sélection ne l'est pas.
2. **`.mt-zoom__btn` fait 30 px de large** (l. 124) et `.mt-tab` a `padding:0 1px 10px`
   (l. 252, soit 1 px latéral) : ce sont les « cibles les plus étroites » dont parle l'issue.
   Un `outline-offset:-2px` y pose le trait **sur** le glyphe / le libellé. Regarde ce que ça
   donne géométriquement avant de choisir la valeur, et envisage `-1px`.
3. **Contraste.** `--color-focus` doit rester lisible contre le fond réellement peint sous le
   contour — `PIT-S58-001` : « le fond sous un `outline` n'est PAS le `background-color` d'un
   ancêtre ». Un offset négatif déplace le contour sur `--color-surface` (bouton) au lieu du
   fond de toolbar : le ratio change. Tu ne peux pas le mesurer sans navigateur — **dis-le**,
   et donne au lead la liste précise de ce qu'il doit mesurer (sélecteur, thème, paire de
   couleurs attendue).
4. `DEC-S58-001` interdit `ring-*` et `outline-none` (seul `outline-hidden` émet le fallback
   `@media (forced-colors: active)`). Ne réintroduis ni l'un ni l'autre.

## Contraintes d'exécution — LIRE AVANT TOUTE COMMANDE

### 0. Répertoire de travail — VÉRIFIE-LE AVANT TOUT

Ce sprint tourne dans un **worktree git**, pas dans le dépôt principal. Un subagent peut
démarrer avec un `cwd` par défaut sur `~/VSProjects/MyTimeline` (le dépôt principal, branche
`dev`) : tu y lirais du code voisin mais pas le tien, et tout ton travail serait perdu ou
commité sur la mauvaise branche.

**Première commande, sans exception :**

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59 \
  && pwd && git rev-parse --abbrev-ref HEAD && git log --oneline -1
```

Attendu : la branche est **`sprint/74`**. Si `pwd` ou la branche diffèrent, **ARRÊTE-TOI** et
rends `STATUS: PARTIAL` avec `BLOQUE_SUR: cwd/branche inattendus — <ce que tu as vu>`.
Ne « corrige » pas en changeant de branche.

Préfixe chaque `Bash` d'un `cd` explicite vers ce chemin : le cwd ne persiste pas de façon
garantie entre tes appels.

### 1. Working tree PARTAGÉ — 4 agents tournent en parallèle sur ce répertoire

Tu n'es pas seul. Trois autres `fullstack-dev` travaillent **en même temps, dans ce même
working tree**, sur les issues #342, #343, #384, #417 (l'une d'elles est la tienne).

Conséquences **impératives** :

- **`git add` CIBLÉ, jamais `git add -A` / `git add .` / `git commit -a`.** Tu listes
  explicitement les chemins que TU as modifiés. Un `-A` embarque le travail des trois autres
  dans ton commit et rend le sprint irréconstituable.
- **Ne touche AUCUN fichier hors de ta liste autorisée** (section « Périmètre fichiers »
  ci-dessous). Si ton correctif semble exiger un fichier hors liste : **arrête-toi**, ne
  l'édite pas, et remonte-le en `BLOQUE_SUR` dans ton retour.
- **Le SHA que tu lis après ton commit peut ne pas être le tien** : `HEAD` bouge sous tes
  pieds quand un voisin commite. Récupère ton SHA avec
  `git log -1 --format=%H -- <un fichier que tu as modifié>` plutôt qu'un `git rev-parse HEAD`
  nu, et dis-le si tu as un doute.
- **`git stash` INTERDIT** (la pile est partagée avec les autres worktrees du dépôt).

### 2. INTERDIT : `next dev`, `next build`, Playwright, Storybook

`frontend/.next` est **unique** pour tout le working tree. Un `next build` réécrit `.next`
sous les pieds du serveur d'un voisin et **tue sa tâche de fond sans aucun signal** —
`git status` ne dit rien (`PIT-S62-009`). Avec 4 agents concurrents, c'est la garantie de
faux rouges et de faux verts croisés.

**Tu ne lances donc NI `npm run dev`, NI `npm run build`, NI `npx playwright`, NI Storybook.**

La vérification navigateur (clair + sombre) exigée par les critères d'acceptation sera faite
par le **lead**, en série, après la vague — c'est prévu, ce n'est pas un oubli de ta part.
Tu ne la fais pas, et tu ne prétends pas l'avoir faite.

Corollaire : ne conclus **jamais** « vérifié visuellement » ni « animation inchangée » sur la
foi d'une lecture de code. Écris ce que tu as réellement exécuté, et ce que tu n'as PAS pu
vérifier. La mémoire projet retient trois échecs distincts de ce type (`CI verte ≠ page
correcte`, `Coverage-E2E vert ne prouve rien`, `tests de scroll sous jsdom ne prouvent rien`) :
une affirmation visuelle non exécutée est un mensonge de rapport, pas un raccourci.

### 3. Commandes AUTORISÉES

```bash
cd frontend && npx tsc --noEmit          # typecheck (n'écrit pas .next)
cd frontend && npx vitest run <chemin>   # tests unitaires CIBLÉS sur tes fichiers
cd frontend && npx eslint <chemin>       # lint ciblé
```

- `npx vitest run` **sur la suite entière est déconseillé** (long, et le bruit des voisins).
  Cible tes fichiers.
- ⚠ **RTK filtre les sorties** (`PIT-S62-010`) : `git diff` rend quasi vide, et une redirection
  `> log 2>&1` peut rendre un résumé faux. Si un `git diff` te paraît vide alors que tu viens
  d'éditer, relance en `rtk proxy git diff`. Ne reprends jamais un récap de commit RTK
  (« N files changed ») comme vérité.

### 4. Périmètre du sprint

Sprint 74 « Landing & focus polish » — 4 issues XS `epic:design` / `priority:P3`, aucune BR
impactée, aucune migration. **Ne fais QUE ton issue.** Si tu repères un défaut voisin :
ne le corrige pas, remonte-le en `RECOMMAND_FOLLOWUP` (sauf typo/rename trivial dans un
fichier que tu édites déjà — alors signale-le en `ABSORBED`).

## Design System — contraintes de charte

- `frontend/src/styles/ds/` est le Design System « Graphite ». Les tokens
  (`ds/tokens/*.css`) sont la source de vérité : **pas de valeur hardcodée** quand un token
  existe (couleur, durée, easing, rayon, espacement).
- **`DEC-S58-001`** — le contour porté par `@layer base` du DS est l'**unique** indicateur de
  focus de l'application. Aucun composant ne pose d'utilitaire de focus. Un correctif ne doit
  **pas** réintroduire de `ring-*` (c'est un `box-shadow` : il se fait rogner à l'identique par
  un `overflow`, et son `ring-offset` peint une bande opaque blanche en thème sombre), ni de
  `outline-none` (seul `outline-hidden` émet le fallback `@media (forced-colors: active)`).
- Tailwind **v4** : `@utility` → `@layer utilities`. Attention aux compositions silencieuses
  (cf. index pitfalls plus bas).
- i18n : aucune chaîne FR en dur dans le TSX ; `useTranslations("namespace")`.

### Périmètre fichiers — issue #417

**Autorisé en écriture (et rien d'autre) :**
- `frontend/src/styles/ds/components/timeline.css` (zone A)
- `frontend/src/styles/ds/components/core.css` (zone B)
- `frontend/src/styles/ds/a11y-audit.md` (si tu dois y consigner l'arbitrage du point 1)
- `frontend/src/components/settings/SettingsShell.tsx` **uniquement si** l'arbitrage montre que
  le remède est côté conteneur et non côté contour — et alors dis-le explicitement

**Interdit** (les 3 autres agents y travaillent) :
- `frontend/src/components/ui/tabs.tsx` — **lecture seule** (voisin du périmètre #342 dans
  `components/ui/`). Si le correctif l'exige, c'est un `BLOQUE_SUR`.
- `frontend/src/components/ui/**` en général (issue #342)
- `frontend/src/styles/landing.css`, `frontend/src/components/landing/**` (issues #343, #384)
- `frontend/src/styles/hero-timeline.css`, `frontend/app/**` (issue #343)

**Test attendu.** ⚠ **Aucun test unitaire ne peut prouver cette issue.** jsdom ne peint rien et
ne fait pas de layout : « 4 côtés peints » n'est pas observable sous vitest. N'écris **pas** un
test qui simulerait la preuve — la mémoire projet retient plusieurs cas où un test vert a été
présenté comme preuve d'un rendu jamais observé.

Ce que tu peux légitimement produire :
- une assertion CSS textuelle (la règle attendue existe avec la valeur attendue) — en assumant
  qu'elle verrouille la **non-régression du texte**, pas le rendu ;
- et surtout : une **liste de vérification navigateur exploitable par le lead**, précise —
  sélecteur exact, comment atteindre l'élément au clavier (quelle route, quelle séquence de
  Tab), ce qu'il faut observer, dans les deux thèmes. Cette liste est ton vrai livrable de
  vérification. Soigne-la.

<!-- ===== cp-frontend.md (context-pack domaine, inline) ===== -->

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

## Index de pitfalls ciblés — À LIRE avant de coder

Le pack complet `.ai-env/context-packs/pit-frontend.md` fait 108 Ko : **ne le lis pas en
entier**. Extrais uniquement les entrées ci-dessous, par exemple :

```bash
awk '/^## PIT-S53-004/,/^## PIT-S53-005/' .ai-env/context-packs/pit-frontend.md
```

**À lire par tout le monde :**

| Id | Pourquoi il te concerne |
|---|---|
| `PIT-S62-009` | Working tree partagé : `.next` unique, le `next dev` d'un voisin meurt sans signal. C'est la raison de l'interdiction §2. |
| `PIT-S62-010` | RTK filtre les sorties — `git diff` quasi vide, récaps de commit faux. |
| `PIT-S22-001` / `PIT-S41-005` | `next build` (ESLint CI) attrape des erreurs **invisibles** à `tsc` et à `vitest` (`no-unused-vars` notamment). Comme tu ne peux pas builder, passe `npx eslint` sur tes fichiers : c'est ton seul filet contre ce mode d'échec. |

**Selon ton issue** (détail dans ta section « Pitfalls de ton issue »).

## Fichiers de contexte à lire (traçable)

Liste dans ton retour, sous le libellé exact `fichiers de contexte lus :`, les fichiers que tu
as réellement ouverts. Attendu minimal :

- le ou les fichiers de ton périmètre,
- les entrées de pitfalls citées pour ton issue,
- `frontend/src/styles/ds/` (le fichier de tokens concerné) si tu touches au CSS du DS.

### Pitfalls de ton issue (#417)

| Id | Pourquoi |
|---|---|
| `PIT-S58-001` | **Central.** « Le fond sous un `outline` n'est PAS le `background-color` d'un ancêtre. » Un offset négatif change le fond réel sous le trait, donc le contraste. |
| `PIT-S62-007` | Contrôle à `<input>` masqué : le contour `@layer base` est structurellement inopérant. Même famille — comprendre quand le contour de base ne suffit pas. |
| `PIT-S53-001` | Tailwind 4 : layeriser une règle d'élément lui fait céder un `line-height` apparié. Pertinent si tu touches à la cascade de `.mt-tab`. |
| `PIT-S63-005` | Tailwind v4 : `max-[Npx]` compile en `width < N`, pas `<=`. Utile si tu touches à une media query. |
| `PIT-S53-004` | Ne layerise pas une règle `:hover`/`:focus-visible` sans vérifier les utilitaires sans variante posées sur le même élément. |

Lis aussi, **avant de coder** :
- `sed -n '300,340p' frontend/src/styles/ds/a11y-audit.md` (la contradiction du point 1)
- `sed -n '55,65p' frontend/src/styles/ds/a11y-audit.md` (la règle de focus du DS)
- `docs/memory/sprints/sprint-58/design-arbitrage-383-352.md` (la charte `DEC-S58-001`)
- `sed -n '370,395p' frontend/src/styles/ds/components/timeline.css` (l'exception mobile `.mt-tlm`)

## Livrable attendu — format strict, 500 tokens max, style télégraphique

Écris ton commit toi-même (1 commit logique, message **gitmoji + français**, corps expliquant
le POURQUOI). Termine par la ligne de co-auteur :

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Puis rends ce format exact :

```
RETOUR :
- commits: <SHA obtenu via `git log -1 --format=%H -- <ton fichier>`>
- resume: <ce qui a changé, fichier:ligne, et POURQUOI ce choix plutôt que l'autre>
- verifie: <commandes RÉELLEMENT exécutées + leur résultat chiffré>
- NON verifie: <ce que tu n'as pas pu vérifier — obligatoirement la vérif navigateur>
- fichiers de contexte lus : <liste>
- [MEMORY:pitfall|pattern|decision] <si applicable, 1 ligne chacun>
- ABSORBED: <découvertes triviales intégrées, ou "aucune">
- RECOMMAND_FOLLOWUP: <défaut voisin non traité [triage X | domaine Y], ou "aucun">
- RECOMMAND_UI_DESIGN / RECOMMAND_SECURITY / ... : <ou négation explicite : "Pas de RECOMMAND_X car ...">
STATUS: COMPLETED
```

Dernière ligne = `STATUS: COMPLETED`, ou `STATUS: PARTIAL` avec une section `BLOQUE_SUR:`
au-dessus. Si tu es bloqué > 30 min, rends `PARTIAL` — ne bricole pas.

**Ne déclare jamais « complet » sans avoir énuméré ce qui n'a pas été vérifié.**
