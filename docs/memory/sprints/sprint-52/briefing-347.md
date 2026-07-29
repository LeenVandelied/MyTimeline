[BRIEFING ISSUE #347 — SPRINT 52]

## ⚠ GARDE-FOU CWD — À EXÉCUTER EN PREMIER, AVANT TOUTE LECTURE

Tu travailles dans un **WORKTREE**, pas dans le dépôt principal. Des subagents de sprints
précédents ont lu des fichiers du dépôt principal et rendu des verdicts faux à cause de ça.

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990
git rev-parse --show-toplevel   # DOIT contenir .claude/worktrees/sprint-52-start-252990
git rev-parse --abbrev-ref HEAD # DOIT être sprint/52
git merge-base --is-ancestor 473ed65f5f8b2260392ec45847999972dde7cd59 HEAD && echo "ancrage OK"
```

Si l'un des trois échoue : **STOP**, rends `STATUS: PARTIAL` avec `BLOQUE_SUR: garde-fou cwd`.
Ne lis JAMAIS un chemin sous `/Users/herrh/VSProjects/MyTimeline/` qui ne contient pas le
segment `.claude/worktrees/sprint-52-start-252990`.

**Piège outillage mesuré sur ce projet :** le hook RTK avale la sortie de `git diff` (rendu
quasi vide) et décale celle de `git log`. Utilise `rtk proxy git diff` / `rtk proxy git log`,
ou `git rev-parse` qui n'est pas affecté. Ne conclus jamais « aucun changement » sur un
`git diff` vide sans avoir re-testé via `rtk proxy`.

## ⚠ WORKING TREE PARTAGÉ — 3 AGENTS EN PARALLÈLE

Deux autres fullstack-dev travaillent **dans ce même working tree, en même temps que toi**,
sur les issues listées en « Dépendances intra-sprint ». Conséquences non négociables :

- **`git add` CIBLÉ UNIQUEMENT.** Liste tes fichiers un par un.
  **JAMAIS `git add -A`, JAMAIS `git add .`, JAMAIS `git commit -a`** — tu emporterais le
  travail en cours des deux autres agents dans ton commit.
- **Ne modifie AUCUN fichier hors de ta liste `fichiers_cles`** (voir « Fichiers interdits »).
- `git status` te montrera des fichiers modifiés qui ne sont pas à toi : **c'est normal**,
  ignore-les, ne les commit pas, ne les reverte pas.
- Le SHA que tu liras via `git rev-parse HEAD` après ton commit peut déjà avoir bougé
  (course entre agents). Rapporte le SHA de **ton** commit via
  `git log -1 --format=%H -- <un de tes fichiers>` plutôt que `rev-parse HEAD`.

## Issue

### Titre
[BUG] Le header de la landing déborde encore entre 768 et ~1000 px

### Body
## Contexte

Sur la page d'accueil, la barre du haut (logo, navigation, boutons) est plus large que l'écran sur les formats tablette : le visiteur voit apparaître une **barre de défilement horizontale**, la page « glisse » latéralement et du contenu sort du cadre.

Le Sprint 49 (#334) a corrigé ce défaut sur mobile — 320, 375 et 390 px sont désormais propres en `fr`, `de` et `es`. **Le palier tablette n'était pas dans le périmètre et reste défaillant.** Défaut **pré-existant**, vérifié inchangé par le S49.

## Ce qui est mesuré

Débordement constaté à **768 px** de large (mesures Playwright, `scrollWidth` vs `clientWidth`) :

| Locale | scrollWidth | clientWidth | Débordement |
|---|---|---|---|
| `fr` | 871 | 768 | **+103 px** |
| `de` | 858 | 768 | **+90 px** |
| `es` | 876 | 768 | **+108 px** |

Le débordement s'étend d'environ 768 px jusqu'à ~1000 px de large.

## À faire

Cause identifiée : le **groupe droit du header au palier `md`**. Le `whitespace-nowrap` a été volontairement borné à `< md` lors du correctif mobile, laissant le palier `md` sans traitement. Il faut arbitrer le comportement entre 768 et ~1000 px : passage anticipé au menu burger, réduction de l'échelle typographique du groupe droit, ou autorisation du retour à la ligne.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` à **768 px** dans les **4 locales** (`fr`, `en`, `de`, `es`)
- [ ] Idem vérifié à 820 px et 1024 px (bornes du palier)
- [ ] Aucune régression aux largeurs déjà propres : 320, 375, 390 px
- [ ] Le header reste utilisable : tous les liens et CTA atteignables au clavier et à la souris
- [ ] Test E2E ajouté au spec de responsive existant, couvrant le palier tablette

## Piste technique

`frontend/src/components/landing/HeaderSection.tsx` (groupe droit, classes de palier `md:`), `frontend/src/components/landing/LandingMobileMenu.tsx` (si le seuil du burger est remonté), spec E2E `frontend/e2e/landing-mobile-menu.spec.ts` qui porte déjà les assertions `scrollWidth <= clientWidth`.

## Dépendances

Aucune. #334 est livrée et mergée.

## Risques techniques

- Remonter le seuil du burger au-dessus de `md` change la fermeture automatique au redimensionnement, câblée au S49 via `useMediaQuery` — les deux seuils doivent rester synchronisés, sinon le focus-trap reste actif sur un panneau masqué.
- L'allemand et l'espagnol sont les locales les plus larges : toute mesure faite uniquement en `fr` sous-estime le débordement.

## Estimation

**S** — un seul palier à arbitrer, mais la validation porte sur 4 locales × 3 largeurs.

## Source

`docs/memory/sprints/sprint-49/issue-334-done.md`.



## Plan d'implémentation (architect, re-planification du 2026-07-29)

> Mini-plan produit par l'architecte **après lecture du code au HEAD `473ed65`**.
> Le champ `etat_reel_du_code` est une mesure, pas une supposition — mais **re-vérifie**
> les numéros de ligne avant d'éditer : ils peuvent avoir bougé.

```yaml
issue_0347:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"
    - "frontend/src/components/landing/LandingMobileMenu.tsx"
    - "frontend/e2e/landing-mobile-menu.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Remonter le seuil du burger désynchronise MD_BREAKPOINT_QUERY (HeaderSection.tsx:43) de la classe `md:hidden` du bouton (ligne 135) : le focus-trap resterait actif sur un panneau masqué, avalant l'Escape de toute la page."
  ordre_ecriture: |
    1. Mesurer d'abord au navigateur à 768/820/1024 px en fr/en/de/es la largeur réelle
       de chacun des 3 blocs du header (logo ligne 86, <nav> ligne 91, groupe droit ligne 103)
       AVANT de choisir l'arbitrage. Le body propose 3 options (burger anticipé / échelle typo
       réduite / retour à la ligne) sans trancher.
    2. Appliquer l'arbitrage. Si le seuil du burger bouge : changer MD_BREAKPOINT_QUERY
       (ligne 43), la classe `md:hidden` du bouton (ligne 135) ET le `md:hidden` de
       LandingMobileMenu EN MÊME TEMPS — le commentaire lignes 38-42 dit explicitement que
       les deux doivent bouger ensemble.
    3. Étendre e2e/landing-mobile-menu.spec.ts : le test `scrollWidth` de la ligne 159 ne
       tourne qu'à la constante MOBILE. Ajouter les paliers 768/820/1024 × 4 locales, et
       conserver 320/375/390 en non-régression.
    4. Vérifier au navigateur que le logo `md:text-3xl` (57 px, HeaderSection.tsx:86) est bien
       comptabilisé dans le budget de largeur — l'échelle DS n'est PAS celle de Tailwind.
  zod_dto_sync: "NON"
  verification_navigateur: "OBLIGATOIRE — 768 / 820 / 1024 px × 4 locales (fr, en, de, es), thèmes clair ET sombre ; non-régression à 320/375/390. Les AC scrollWidth exigent Playwright, PAS jsdom (jsdom ne clampe pas les métriques de défilement — pitfall S51)."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré au HEAD 473ed65.
    HeaderSection.tsx:86 — logo `text-md sm:text-lg md:text-3xl ... whitespace-nowrap
    md:whitespace-normal` : le `whitespace-nowrap` est bien borné à `< md`, exactement comme
    le décrit l'issue. Commentaire lignes 83-85 : l'empêcher au-dessus de md élargirait le
    header de 234 → 328 px.
    Ligne 91 — <nav> en `hidden ... md:flex` : les 3 ancres REAPPARAISSENT à md, ce sont elles
    qui rechargent le palier tablette.
    Lignes 103-114 — groupe droit `flex items-center gap-2 md:gap-4`, dont un sous-bloc
    `hidden items-center gap-4 md:flex` contenant LanguageSelector + bouton Connexion :
    lui aussi réapparaît à md. Aucune classe de palier `lg:` nulle part dans le fichier —
    donc aucun traitement entre md (768) et lg (1024). Cause confirmée.
    Ligne 43 `MD_BREAKPOINT_QUERY = '(min-width: 48rem)'` ; ligne 135 le burger est `md:hidden`.
    E2E : landing-mobile-menu.spec.ts:159-179 assère bien
    documentElement.scrollWidth <= clientWidth, mais UNIQUEMENT à la constante MOBILE (375).
    Ligne 188 fait un setViewportSize({width:1280}) pour un autre test (fermeture du panneau),
    sans assertion de débordement. Les paliers 768/820/1024 sont donc à créer.
    ATTENTION LIGNE 110 : le bouton Connexion porte `hover:bg-accent hover:text-accent-ink`,
    paire sanctionnée lue par landing.hover-pairing.test.ts (que #346 durcit en parallèle).
    Toute réécriture de ce className doit conserver la paire intacte OU la supprimer
    entièrement — jamais n'en garder une moitié.
```

## Triage
Taille: S
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

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

Tu tournes **en parallèle** de :
- **#346** (couplage fond/encre sous `focus:` dans les menus déroulants) — il touche
  `frontend/src/components/ui/dropdown-menu.tsx`, `select.tsx` et **les deux garde-fous AST**
  dont `frontend/src/components/landing/landing.hover-pairing.test.ts`.
- **#372** (README racine) — documentaire, aucun fichier commun.

Aucune dépendance d'ordre : personne n'attend ton travail, tu n'attends celui de personne.

### ⚠ Couplage logique avec #346 — lis ceci avant de toucher au header

`landing.hover-pairing.test.ts` scanne **tout `components/landing/`**, donc **ton**
`HeaderSection.tsx`. #346 est en train d'**élargir** ce détecteur (préfixe `focus:` en plus de
`hover:`).

**Contrainte dure sur `HeaderSection.tsx:110`** : le bouton Connexion porte
`hover:bg-accent hover:text-accent-ink`. C'est une **paire sanctionnée du DS**. Si tu réécris
ce `className`, tu **conserves la paire entière** ou tu la **supprimes entièrement** —
**jamais une moitié**. Garder `hover:text-accent-ink` sans son `hover:bg-accent` recrée
exactement le défaut d'encre invisible que #346 traite (mesuré à 1,00:1 au S49).

Si la suite unitaire rougit sur un fichier de `components/ui/` : c'est le périmètre de #346,
**ne le corrige pas**, signale-le.

## Fichiers interdits (propriété d'un autre agent)

- `frontend/src/components/ui/dropdown-menu.tsx` → **#346**
- `frontend/src/components/ui/select.tsx` → **#346**
- `frontend/src/components/ui/button.hover-pairing.test.ts` → **#346**
- `frontend/src/components/landing/landing.hover-pairing.test.ts` → **#346**
- `README.md` → **#372**

Si ton correctif semble en exiger un, **ne le touche pas** : signale-le en `RECOMMAND_FOLLOWUP`.

## Designer
Non applicable en pré-implémentation — mais **tu portes un arbitrage de design**.
Le body de l'issue propose trois options sans trancher (burger anticipé / réduction de
l'échelle typographique du groupe droit / autorisation du retour à la ligne).
**Mesure d'abord, choisis ensuite, et documente le pourquoi du choix dans ton done.md.**

## Point de vigilance spécifique — synchronisation du seuil burger

Si ton arbitrage remonte le seuil du menu burger, **trois choses doivent bouger ensemble** :
1. `MD_BREAKPOINT_QUERY` — `HeaderSection.tsx:43` (`'(min-width: 48rem)'`)
2. la classe `md:hidden` du bouton burger — `HeaderSection.tsx:135`
3. le `md:hidden` correspondant dans `LandingMobileMenu.tsx`

Le commentaire `HeaderSection.tsx:38-42` documente explicitement cette contrainte. En cas de
désynchronisation, **le focus-trap reste actif sur un panneau masqué et avale l'`Escape` de
toute la page** — régression silencieuse, invisible en CI.

## Mesure avant correctif (l'ordre compte)

Les chiffres du body (871 / 858 / 876 px à 768 px en fr/de/es) sont **repris de la mesure du
S49 et n'ont pas été re-vérifiés par l'architecte**. Re-mesure-les toi-même avant de coder, et
mesure la largeur réelle de chacun des **trois blocs** du header — logo (ligne 86),
`<nav>` (ligne 91), groupe droit (ligne 103) — pour savoir **lequel** dépasse le budget.
Corriger le mauvais bloc est le risque principal ici.

Rappel du contexte DS : le logo est en `md:text-3xl`, soit **57 px** dans l'échelle Graphite
(et non 30 px comme le laisserait croire Tailwind). Il pèse lourd dans le budget de largeur.

## ⚠ Pitfalls projet applicables — non négociables

**« CI verte ≠ page correcte » (Sprint 48).** jsdom ne résout **ni `@layer` ni le layout**.
Au S48, 2 CTA rigoureusement invisibles (contraste 1,00:1) et 1 tronqué sont passés à travers
une CI entièrement verte. **Cette issue n'est clôturable par aucune suite de tests.** Il faut
ouvrir un navigateur réel et mesurer.

**« Les tests de scroll sous jsdom ne prouvent rien » (Sprint 51).** jsdom ne clampe pas
`scrollLeft` (on y écrit 400, on relit 400). Toute assertion de type
`scrollWidth <= clientWidth` **exige Playwright**, jamais un test unitaire.

**L'échelle typographique du DS Graphite écrase celle de Tailwind.** Dans
`frontend/src/styles/ds/tokens/typography.css`, `--text-3xl` vaut **57 px** (pas 30 px).
Nuance mesurée par l'architecte : `@theme` **étend** le thème Tailwind au lieu de le remplacer,
donc `text-4xl`/`text-5xl` résolvent quand même aux défauts Tailwind (36 px / 48 px) bien
qu'absents des tokens. **Lis les tokens avant de choisir une classe, ne déduis rien de Tailwind.**

## Comment vérifier au navigateur

La pile démarre via `docker compose` à la racine du worktree. **Piège connu : le port 5432
entre en conflit avec un PostgreSQL déjà installé** → prévois un override de port.
Tu disposes d'outils navigateur (`mcp__Claude_Browser__*` : `preview_start`, `navigate`,
`resize_window` avec `colorScheme` light/dark, `javascript_tool` pour mesurer
`getBoundingClientRect()` / `getComputedStyle()` / `scrollWidth`). **Mesure les valeurs
calculées, ne les déduis pas des classes CSS.**

## Contraintes communes

- **Branche cible : `sprint/52`** (déjà checkout, créée sur `dev` à `473ed65`). Ne change pas de branche.
- **1 commit logique**, message **gitmoji en français** (convention du dépôt, cf. `.claude/rules/git-workflow.md`).
- **Tests : `./scripts/test-quiet.sh <scope>`** depuis la racine du worktree. Le lancer est
  OBLIGATOIRE avant de rendre. Ne déclare jamais un test vert sans l'avoir exécuté.
- Si le volume de tests dépasse 500 ou 3 min : signale `RECOMMAND_TEST_RUNNER` plutôt que d'attendre.
- Code en **anglais**, docs et commentaires en **français** (convention projet).
- **i18n** : toute chaîne visible passe par next-intl, et dans les **4 locales** `fr`/`en`/`de`/`es`
  (`frontend/public/locales/<locale>/*.json`). La locale pilote est `fr`.

## Honnêteté de rapport (règle projet, appliquée strictement)

- « Je n'ai pas vérifié X » est une réponse **valide et attendue**. Une affirmation confiante
  non mesurée est une faute plus grave qu'un trou déclaré.
- Si une prémisse de l'issue est **fausse** quand tu lis le code, dis-le explicitement et
  documente ce que tu as mesuré. C'est arrivé sur 5 sprints consécutifs ici : chemins
  inexistants, numéros de ligne décalés, mesures non reproductibles. **On veut le savoir.**
- Ne qualifie pas ton propre travail de « parfait », « complet » ou « excellent ». Décris ce
  que le code fait, et liste ce qui reste non couvert.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris tes conclusions dans `docs/memory/sprints/sprint-52/issue-<N>-done.md` ET retourne le même contenu :

```
commits: [SHA]
pack_lu: OUI — <nom du pack> §<titre d'une section RÉELLE que tu as lue>
resume: <objectif · fichiers clés touchés · ce qui a été mesuré vs supposé>
verification_navigateur: <ce que tu as réellement ouvert et mesuré, ou "NON FAITE — raison">
tests: <commande exacte · passed/failed>
premisses_infirmees: <prémisses de l'issue trouvées fausses, avec la mesure — ou "aucune">
non_couvert: <ce que tu n'as PAS fait ou PAS vérifié — obligatoire, "rien" interdit sans justification>
[MEMORY:pitfall|pattern|decision] <signaux mémoire si applicables>
recommandations suite: <RECOMMAND_* ou pitfall subtil — ou "aucune">
STATUS: COMPLETED
```

La **dernière ligne** du done.md doit être exactement `STATUS: COMPLETED` (ou `STATUS: PARTIAL`
avec une section `BLOQUE_SUR:` juste au-dessus). Le lead parse ces 3 dernières lignes.
