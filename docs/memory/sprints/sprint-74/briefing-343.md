[BRIEFING ISSUE #343 — Sprint 74 « Landing & focus polish »]

## Issue #343 — [FEATURE] Animation de la frise hero : easing hors DS et import CSS mal scopé

Labels : `enhancement`, `epic:design`, `priority:P3`, `size:XS`, `frontend`, `sprint-74`

### Énoncé (verbatim GitHub)

**Contexte.** La revue de design du Sprint 48 sur l'animation de la frise (« hero timeline ») a
rendu un verdict global **APPROUVÉ SOUS RÉSERVE** — non bloquant pour la livraison, mais deux
écarts mineurs restent à corriger pour rester cohérent avec le système de design.

**À faire.** Deux écarts relevés par la revue ui-design du Sprint 48 :

a) `frontend/src/styles/hero-timeline.css:22` utilise un easing hardcodé
   `cubic-bezier(0.4, 0, 0.2, 1)` alors que le DS expose déjà le token `--ease-quart`
   (`ds/tokens/spacing.css:39`) — incohérence avec le système de motion du DS.

b) `hero-timeline.css` est importé dans le **root layout** (`frontend/app/layout.tsx:5`), donc
   chargé sur **toutes les routes**, alors que le composant concerné n'est utilisé que sur la
   landing page. Le CSS devrait être scopé à la landing seule.

**BR impactées :** aucune.

**Critères d'acceptation :**
- [ ] `hero-timeline.css:22` utilise `--ease-quart` au lieu de la valeur hardcodée
- [ ] `hero-timeline.css` n'est plus importé dans le root layout, mais uniquement dans le
      périmètre de la landing
- [ ] Animation de la frise hero inchangée visuellement
- [ ] Aucune régression sur les autres routes (CSS non chargé inutilement)

## Triage

Taille : XS · Modèle : opus · Effort : medium

## État réel du code — vérifié par le lead à `455862f`

### (a) Easing hardcodé — CONFIRMÉ VIVANT

`frontend/src/styles/hero-timeline.css:22` :

```css
.hero-timeline__progress {
  animation: hero-timeline-sweep var(--hero-timeline-duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
```

Seule occurrence de `cubic-bezier` du fichier. `--ease-quart` est bien en service ailleurs
(`ds/components/core.css:20, 93, 134, 166, 182`).

⚠ **L'énoncé donne une localisation de token à vérifier.** Il annonce `--ease-quart` dans
`ds/tokens/spacing.css:39` — un token de *motion* dans un fichier `spacing.css` est
suffisamment inattendu pour que tu confirmes toi-même :
`grep -rn 'ease-quart' frontend/src/styles/ds/tokens/`.
Vérifie surtout **la valeur** du token : si `--ease-quart` ne vaut pas `cubic-bezier(0.4,0,0.2,1)`,
alors le substituer **change l'animation**, ce qui contredit le critère « animation inchangée
visuellement ». Dans ce cas : applique quand même le token (c'est la demande explicite du DS)
mais **dis-le franchement** dans ton retour, chiffres à l'appui (ancienne courbe vs nouvelle),
et laisse le lead trancher à la vérification navigateur. Ne maquille pas l'écart.

### (b) Import mal scopé — L'ÉNONCÉ EST PÉRIMÉ, le défaut a bougé

**`frontend/app/layout.tsx` n'importe plus rien** : il a été rendu volontairement transparent
par #413 (`PIT-S62-005`, `PIT-S62-012`), son en-tête le documente. `hero-timeline.css` est
aujourd'hui importé ici :

```
frontend/app/[locale]/layout.tsx:5:import '../../src/styles/hero-timeline.css'
```

`app/[locale]/layout.tsx` couvre **toutes** les routes localisées (`login`, `register`,
`dashboard`, `timeline`, `settings`, `products`, `privacy`, `terms`…), pas seulement la
landing : le défaut décrit par l'issue est donc réel, simplement pas au chemin annoncé.

Le seul consommateur du CSS est `frontend/src/components/landing/HeroTimelineAnimation.tsx`
(classes `.hero-timeline`, `.hero-timeline__progress`, `.hero-timeline__today`).
La landing canonique est `frontend/app/[locale]/page.tsx` (ADR-006), qui rend
`@/components/pages/HomePage`.

### Ce que le lead N'A PAS tranché — c'est ton arbitrage

Où déplacer l'import ? Trois candidats, à trancher **sur le code**, pas au flair :
- `frontend/app/[locale]/page.tsx` (la route landing) — sûr côté App Router, mais ne couvre pas
  d'autres pages qui rendraient `HeroTimelineAnimation` : **vérifie d'abord** qui rend ce
  composant (`grep -rn 'HeroTimelineAnimation' frontend/`). S'il est rendu ailleurs que sous
  la landing, ce choix casse l'animation sur cette autre route — c'est le mode d'échec à ne
  pas rater.
- `frontend/src/components/landing/HeroTimelineAnimation.tsx` (import co-localisé au
  composant) — le plus robuste au déplacement, mais **peut casser le test unitaire existant**
  `HeroTimelineAnimation.test.tsx` sous jsdom (`PIT-S62-013`) et exiger un `vi.mock`.
- `HomePage` — intermédiaire.

Justifie ton choix en une phrase dans le retour, et dis quel mode d'échec tu as écarté.

## Contraintes d'exécution — LIRE AVANT TOUTE COMMANDE

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

### Périmètre fichiers — issue #343

**Autorisé en écriture (et rien d'autre) :**
- `frontend/src/styles/hero-timeline.css`
- `frontend/app/[locale]/layout.tsx` (**uniquement la ligne 5, l'import à retirer**)
- **UN SEUL** parmi : `frontend/app/[locale]/page.tsx`, `frontend/src/components/landing/HeroTimelineAnimation.tsx`,
  `frontend/src/components/pages/HomePage.tsx` — celui où tu déposes l'import
- `frontend/src/components/landing/HeroTimelineAnimation.test.tsx` (si le déplacement l'impacte)

**Interdit** (les 3 autres agents y travaillent) :
- `frontend/src/styles/landing.css` — **issue #384 l'édite en ce moment.** Ne dépose pas ton
  import via un `@import` dans `landing.css` : c'est le conflit garanti.
- `frontend/src/components/landing/FeaturesSection.tsx` (issue #384)
- `frontend/src/styles/ds/**` — **lecture seule** (issue #417 y écrit). Tu lis les tokens,
  tu n'y touches pas.
- `frontend/src/components/ui/**` (issue #342)
- `frontend/app/layout.tsx` (root) — n'y remets rien.

**Test attendu.** `HeroTimelineAnimation.test.tsx` existe déjà et doit rester vert
(`npx vitest run src/components/landing/HeroTimelineAnimation.test.tsx`). Le scope d'un import
CSS n'est pas testable sous jsdom — n'invente pas un test qui « prouverait » le scope ;
constate-le par lecture et dis-le comme tel.

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

### Pitfalls de ton issue (#343)

| Id | Pourquoi |
|---|---|
| `PIT-S64-003` | **Le plus important pour toi.** « Un correctif qui agit sur l'ordre d'EXÉCUTION ne corrige jamais une dépendance à l'ordre d'IMPORT. » Déplacer un import CSS change l'ordre de cascade : ce qui gagnait peut perdre. |
| `PIT-S62-005` | Layout racine transparent : Next casse la 404, et deux contournements ne marchent pas. Explique pourquoi `app/layout.tsx` est vide — n'essaie pas de l'« arranger ». |
| `PIT-S62-013` | Importer une feuille globale dans un composant testé crache ~5 500 lignes de stderr sous jsdom. Concerne directement l'option « import co-localisé ». |
| `PIT-S59-004` | Turbopack sert un chunk CSS périmé et produit un FAUX VERT. Tu ne lances pas de serveur, mais retiens-le : c'est pourquoi le lead vérifiera au navigateur après redémarrage propre. |
| `PIT-S66-002` | Une `duration-*` seule arme la transition sur `all`. À l'esprit si tu touches à la déclaration `animation`. |

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
