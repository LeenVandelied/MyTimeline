[BRIEFING ISSUE #346 — SPRINT 52]

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
[BUG] Le même couplage fond/encre subsiste sous focus: dans 5 menus déroulants

### Body
## Contexte

Au Sprint 49, quatre boutons d'appel à l'action de la page d'accueil étaient devenus **invisibles en production** : leur texte prenait exactement la couleur de leur fond. Ratios de contraste mesurés : **1,00 · 1,03 · 1,07 · 3,83:1** (le minimum lisible est 4,5:1). Le correctif (`24f44a3`, `8d2ccdd`) a supprimé la cause : un couplage entre la couleur de fond et la couleur d'encre au survol.

**Le même couplage subsiste, sous `focus:` cette fois, dans les composants de menus déroulants du design system.** Il est aujourd'hui **latent** : confirmé par recherche dans le code, mais aucun consommateur ne le déclenche encore — donc **aucun ratio n'a été mesuré**. Il se déclenchera dès qu'un composant surchargera le seul fond.

## À faire

Supprimer la paire `focus:bg-accent focus:text-accent-foreground` aux 5 emplacements et ne faire varier au focus que la **surface** (`focus:bg-accent-soft`), l'encre restant `text-ink`.

**Pourquoi la paire est cassable :** `tailwind-merge` ne fusionne que des classes portant la *même* propriété CSS. `bg-*` et `text-*` sont deux propriétés distinctes : un consommateur qui passe `className="focus:bg-autre-chose"` remplace le fond mais **conserve** `focus:text-accent-foreground`. Résultat : encre de la couleur du nouveau fond.

Emplacements exacts :
- `frontend/src/components/ui/dropdown-menu.tsx` lignes **77, 95, 131, 214**
- `frontend/src/components/ui/select.tsx` ligne **121**

Étendre ensuite le garde-fou AST existant (`ui/button.hover-pairing.test.ts`, `landing.hover-pairing.test.ts`) pour qu'il scanne tout `frontend/src/components/ui/` et couvre le préfixe `focus:` en plus de `hover:`. Le détecteur actuel n'interdit pas tout changement d'encre : il exige que si surface **et** encre changent ensemble, ce soit la paire sanctionnée du DS.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] Aucune occurrence de `focus:bg-*` accompagnée d'un `focus:text-*` non sanctionné dans `frontend/src/components/ui/`
- [ ] Le focus reste visuellement perceptible (changement de surface) dans les thèmes clair **et** sombre
- [ ] Le garde-fou AST couvre `components/ui/` et le préfixe `focus:`, et rougit sur une réintroduction volontaire du défaut
- [ ] Ratio de contraste ≥ 4,5:1 mesuré sur un item de menu au focus, en clair et en sombre
- [ ] Suite unitaire et E2E au vert

## Piste technique

`frontend/src/components/ui/dropdown-menu.tsx`, `frontend/src/components/ui/select.tsx`, `frontend/src/components/ui/button.hover-pairing.test.ts`, `frontend/src/components/landing/landing.hover-pairing.test.ts`.

## Dépendances

Aucune. Le remède est déjà connu et appliqué ailleurs (S49).

## Risques techniques

- `SelectContent` a été explicitement arbitré comme **décoratif** au S49 (cadre de popover) : ne pas le repasser en fonctionnel par effet de bord.
- jsdom ne résout ni `@layer` ni le layout : un test unitaire vert ne prouve pas le rendu. Vérifier au navigateur (cf. mémoire « CI verte ≠ page correcte »).

## Estimation

**S** — 5 lignes à modifier, mais l'extension du garde-fou AST et la mesure navigateur dans 2 thèmes constituent l'essentiel du coût.

## Source

`docs/memory/sprints/sprint-49/review-batch.md` (§ Follow-ups, point 3) · `pitfalls.md` `PIT-S49-001`.



## Plan d'implémentation (architect, re-planification du 2026-07-29)

> Mini-plan produit par l'architecte **après lecture du code au HEAD `473ed65`**.
> Le champ `etat_reel_du_code` est une mesure, pas une supposition — mais **re-vérifie**
> les numéros de ligne avant d'éditer : ils peuvent avoir bougé.

```yaml
issue_0346:
  fichiers_cles:
    - "frontend/src/components/ui/dropdown-menu.tsx"
    - "frontend/src/components/ui/select.tsx"
    - "frontend/src/components/ui/button.hover-pairing.test.ts"
    - "frontend/src/components/landing/landing.hover-pairing.test.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Repasser SelectContent en « fonctionnel » par effet de bord contredirait l'arbitrage « décoratif » acté au S49 ; et le garde-fou élargi à components/ui/ peut rougir sur des paires legacy hors périmètre de l'issue."
  ordre_ecriture: |
    1. Remplacer `focus:bg-accent focus:text-accent-foreground` par `focus:bg-accent-soft`
       seul (encre de repos conservée) aux 5 emplacements : dropdown-menu.tsx:77, :95, :131,
       :214 et select.tsx:121. Ne PAS toucher les branches `data-[variant=destructive]:focus:*`
       de la ligne 77 (paire destructive, arbitrage distinct).
    2. Étendre le détecteur : `findHoverPairingOffences` ne matche aujourd'hui que
       /hover:bg-[\w-]+/ et /hover:text-[\w-]+/ — généraliser au préfixe `focus:`.
    3. Étendre le PÉRIMÈTRE de scan à `frontend/src/components/ui/` (le test landing ne lit
       que LANDING_DIR ; le test button ne lit que le corps du `cva()` de button.tsx).
    4. Ajouter le témoin de régression `focus:` (miroir du témoin `hover:` existant), sinon
       un détecteur aveugle rendrait le test vert pour de mauvaises raisons.
    5. Mesurer au navigateur le ratio d'un item de menu AU FOCUS, clair + sombre.
  zod_dto_sync: "NON"
  verification_navigateur: "OBLIGATOIRE — item de DropdownMenu et de Select au focus clavier, thème clair ET sombre, ratio >= 4.5:1 mesuré (pas déduit des classes). jsdom ne résout pas @layer : la CI ne clôt pas cette issue."
  possibly_done: false
  etat_reel_du_code: |
    Re-vérifié au HEAD 473ed65 — mini-plan S53 (ancrage fc2a3a0) valide SANS correction de ligne.
    `focus:bg-accent focus:text-accent-foreground` présent à dropdown-menu.tsx:77, :95, :131, :214
    et select.tsx:121. Un grep `focus:bg-` croisé `focus:text-` sur tout components/ui/ ne remonte
    QUE ces 5 lignes : périmètre exact, ni plus ni moins.
    Les 2 garde-fous AST existent. landing.hover-pairing.test.ts:132-133 code en dur
    /hover:bg-[\w-]+/g et /hover:text-[\w-]+/g et scanne `landingComponents()` sur LANDING_DIR
    (= components/landing/) — donc NI `focus:` NI components/ui/.
    button.hover-pairing.test.ts est borné au corps du `cva()` de button.tsx (fonction `cvaCall`).
    CONSOMMATEUR VIVANT à surveiller : language-selector.tsx:65 pose `bg-accent
    text-accent-foreground` sur l'item de locale ACTIVE, et son en-tête (lignes 17-41) documente
    que le `focus:bg-accent` de dropdown-menu.tsx masquait un défaut de survol mesuré à 1.10:1 /
    1.17:1. Retirer ce `focus:` peut donc DÉMASQUER l'état mixte souris+clavier décrit là.
    Garde-fou E2E de ce cas : e2e/landing-mobile-menu.spec.ts:268 (« sélecteur de langue »).
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
- **#347** (header de la landing, palier tablette) — il réécrit
  `frontend/src/components/landing/HeaderSection.tsx`.
- **#372** (README racine) — documentaire, aucun fichier commun.

Aucune dépendance d'ordre : personne n'attend ton travail, tu n'attends celui de personne.

### ⚠ Couplage logique avec #347 — lis ceci avant de toucher au garde-fou

Tu vas **élargir** `landing.hover-pairing.test.ts` (préfixe `focus:` + périmètre
`components/ui/`). Or ce test scanne **tout `components/landing/`**, donc `HeaderSection.tsx`
que #347 est en train de réécrire au même moment.

- `HeaderSection.tsx:110` porte `hover:bg-accent hover:text-accent-ink` — **paire sanctionnée
  du DS, légitime**. Ton détecteur élargi ne doit **pas** la faire rougir.
- Si ton test devient rouge à cause d'une modification de #347 dans `HeaderSection.tsx` :
  **ne corrige pas `HeaderSection.tsx` toi-même** (fichier interdit). Signale-le dans
  `recommandations suite` et rends quand même ton travail.
- Ton détecteur doit distinguer « surface **et** encre changent ensemble hors paire sanctionnée »
  (= défaut) de « paire sanctionnée du DS » (= légitime). C'est déjà la sémantique du détecteur
  existant : conserve-la.

## Fichiers interdits (propriété d'un autre agent)

- `frontend/src/components/landing/HeaderSection.tsx` → **#347**
- `frontend/src/components/landing/LandingMobileMenu.tsx` → **#347**
- `frontend/e2e/landing-mobile-menu.spec.ts` → **#347**
- `README.md` → **#372**

Si ton correctif semble en exiger un, **ne le touche pas** : signale-le en `RECOMMAND_FOLLOWUP`.

## Designer
Non applicable — correctif de conformité au DS existant, pas de nouveau composant.
Le remède est déjà arbitré et appliqué ailleurs au S49 (`24f44a3`, `8d2ccdd`).

## Point de vigilance spécifique — un consommateur vivant peut être démasqué

`frontend/src/components/ui/language-selector.tsx:65` pose `bg-accent text-accent-foreground`
sur l'item de locale **active**, et son en-tête (lignes 17-41) documente que le
`focus:bg-accent` de `dropdown-menu.tsx` **masquait** un défaut de survol mesuré à **1,10:1 et
1,17:1**. Retirer ce `focus:` peut donc **démasquer** l'état mixte souris+clavier décrit là.

- **Mesure ce cas précis au navigateur** (item de locale active, au focus clavier ET au survol,
  clair + sombre) avant de conclure.
- Si le défaut réapparaît : `language-selector.tsx` **n'est pas dans ton périmètre** — signale-le
  en `RECOMMAND_FOLLOWUP` avec les ratios mesurés (une issue #353 existe déjà sur ce fichier).
- Garde-fou E2E existant de ce cas : `frontend/e2e/landing-mobile-menu.spec.ts:268`
  (« sélecteur de langue ») — **ce fichier appartient à #347**, ne le modifie pas ; contente-toi
  de vérifier qu'il reste vert.

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
