[BRIEFING ISSUE #60 — absorbe #172]

## Issue
[CHORE] Frontend : finitions Page Légale

Les pages publiques `/privacy` et `/terms` (server components Next.js, namespace i18n `legal`)
demandent plusieurs finitions avant une mise en ligne soignée.

### Périmètre ARRÊTÉ par le développeur (fonctionnel uniquement)
1. **i18n du bouton « Retour »** — la chaîne est codée en dur, donc cassée hors français.
2. **Date de mise à jour centralisée** — `01/06/2023` est en dur dans le source des deux pages.
3. **Disclaimer** « la version française fait foi » en tête des pages, hors locale `fr`.
4. **Sommaire numéroté en chiffres romains** (I, II, III…) en tête de chaque page, ancré vers les
   sections existantes.
5. **Absorption de #172** : ajouter la valeur `fr` de la clé `legal.disclaimerOriginalFrench`.
6. **Spec E2E ciblée** (voir §Stratégie de test).

**HORS PÉRIMÈTRE — ne fais PAS de restyling DS.** L'énoncé de l'issue annonce un « restyling DS
Graphite » bloqué par #45 : c'est périmé, les deux pages utilisent déjà les jetons du DS
(`bg-bg`, `text-ink`, `text-ink-muted`, `border-rule`, `bg-surface`). N'élargis pas le diff à une
retouche visuelle des éléments déjà conformes. Les éléments que tu AJOUTES (sommaire, disclaimer)
doivent évidemment respecter ces mêmes jetons.

## Plan d'implémentation (vérifié contre le code par le lead, 2026-09-04)

**Les chemins donnés par l'énoncé de l'issue sont FAUX. Voici les vrais, vérifiés :**

| L'énoncé dit | Réalité |
|---|---|
| `app/[locale]/(public)/privacy/page.tsx` | `frontend/app/[locale]/privacy/page.tsx` (aucun groupe `(public)`) |
| `app/[locale]/(public)/terms/page.tsx` | `frontend/app/[locale]/terms/page.tsx` |
| `messages/fr/legal.json` | `frontend/public/locales/fr/legal.json` |
| tokens à porter depuis #45 | déjà présents dans les pages |

Locales du projet : `fr` (référence), `en`, `es`, `de` — quatre fichiers `legal.json`.

### État réel constaté

- **« Retour » apparaît DEUX fois par page** : le bouton fantôme en haut avec l'icône `ArrowLeft`
  (`<span>Retour</span>`), et un second bouton en bas, `Retour à l&apos;accueil`. Les deux sont en
  dur, dans `privacy/page.tsx` ET `terms/page.tsx` — donc **quatre occurrences au total**. Ne
  traite pas que la première.
- **La date** est rendue par `{t('privacy.lastUpdated')}: 01/06/2023` en bas de page (idem pour
  `terms`). Le libellé passe déjà par i18n, c'est la valeur qui est en dur.
- **`legal.disclaimerOriginalFrench` existe déjà en `en`, `de`, `es`** avec un texte rédigé
  (« The French version prevails in case of any discrepancy. » et ses équivalents), **absente en
  `fr`**, et **appelée nulle part dans le code**. C'est exactement le point 1 de l'issue #172, que
  tu absorbes : ajoute la valeur `fr` (formulée pour un lecteur francophone, la clé doit exister
  pour la parité même si la page `fr` n'affiche pas le disclaimer) et **câble la clé** dans les
  pages pour les locales autres que `fr`.
- **Aucune ancre n'existe** : `grep 'id="'` sur les deux pages ne renvoie rien. Les sections sont
  des `<section className="mb-8">` contenant un `<h2>` dont le texte vient de `t('privacy.<clé>.title')`.
  Le sommaire suppose donc d'ajouter des `id` stables et de dériver les entrées des mêmes clés i18n
  que les `<h2>` — pas de titres recopiés en dur, sinon ils divergeront à la prochaine traduction.
- **Aucun `lib/config.ts` n'existe.** `frontend/src/lib/` contient des modules ciblés
  (`auth-*.ts`, `color.ts`, `query-keys.ts`, `utils.ts`…). Crée un module dédié et étroit pour la
  date légale plutôt que d'inventer un `config.ts` fourre-tout, et justifie ton choix dans le retour.

### Points d'attention

- Les deux pages sont des **server components async** avec `params: Promise<{locale: string}>` et
  `getTranslations({ locale, namespace: 'legal' })`. Le sommaire et ses ancres doivent rester
  rendus côté serveur si possible ; si tu introduis un composant client, dis pourquoi.
- **Format de la date** : elle est affichée `01/06/2023` (JJ/MM/AAAA). Une date centralisée doit
  rester lisible dans les 4 locales — soit tu stockes une date ISO et tu la formates par locale,
  soit tu assumes un format unique. Choisis, applique, et **écris ton choix et sa raison** dans le
  retour ; ne laisse pas le lecteur le deviner.
- **Chiffres romains** : l'énoncé les impose. Ils sont décoratifs et ne doivent pas polluer
  l'étiquette accessible du lien d'ancre.
- Le namespace `legal` a **64 clés en fr, 65 dans les autres**. Après ton travail, la parité doit
  être exacte dans les 4 locales — vérifie-le explicitement, ne le suppose pas.
- Si tu ajoutes de nouvelles clés i18n, elles doivent l'être dans **les 4 locales**, sans recopie du
  français dans `en`/`es`/`de` (un test de garde comparable existe déjà pour le sélecteur de langue,
  `src/components/ui/language-selector.i18n.test.ts` — lis-le, c'est le modèle attendu).

### Stratégie de test

**Aucun E2E ne couvre `/privacy` ni `/terms` aujourd'hui** (`frontend/e2e/` vérifié). Le
développeur a tranché : une spec E2E ciblée est **exigée**, en plus des tests unitaires.

La spec doit prouver, au minimum :
1. le bouton « Retour » rend le libellé traduit en `fr` **et** en `en` (pas la chaîne française),
2. le disclaimer est présent hors `fr` et absent en `fr`,
3. **le saut d'ancre du sommaire fonctionne réellement** — un clic sur une entrée amène à la
   section correspondante.

Deux mises en garde de la mémoire projet, qui ont déjà coûté des sprints ici :
- **jsdom ne prouve rien sur le défilement ni sur la navigation par fragment** : il ne clampe pas
  `scrollLeft` et ne résout pas les ancres. Le point 3 ne peut PAS être couvert en unitaire.
- **Le check de couverture E2E vérifie qu'un `data-testid` est CITÉ dans `e2e/`, pas que la spec
  passe.** Un sprint est déjà passé « tout vert » avec cinq specs jamais exécutées, dont deux
  cassées. **Exécute ta spec et rapporte le compte réel passed/failed.** La recette d'exécution
  locale est documentée dans `frontend/playwright.config.ts` (lis-la : elle impose webpack et non
  turbopack, et des réglages qui évitent de faux échecs) ; le fichier `frontend/e2e/README.md`
  complète.

## Triage
Taille: S (élargie — 2 pages, 4 fichiers de locale, 1 module de config, 1 spec E2E)
Modèle: opus
Effort: high

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

<!-- ===== pit-frontend.md (POINTEUR — 117 Ko, non inliné) ===== -->

## Pièges frontend — à LIRE depuis le disque

Le pack `pit-frontend.md` pèse 117 Ko et n'est pas inliné ici (un prompt de cette taille est
ininlinable — pitfall d'orchestration connu). **Tu dois le lire toi-même** :

- `.ai-env/context-packs/pit-frontend.md` — pièges frontend consolidés. Ne le lis pas en entier :
  `grep` les termes de ton périmètre (`i18n`, `next-intl`, `locale`, `server component`,
  `getTranslations`, `e2e`, `playwright`, `ancre`/`anchor`, `jsdom`) puis lis les entrées trouvées.
- `.claude/rules-jit/ux-patterns.md` — motifs UX du projet (10 Ko), à lire si tu ajoutes du rendu.
- `frontend/e2e/README.md` — conventions E2E du projet.
- `frontend/playwright.config.ts` — recette d'exécution locale des E2E (contraintes réelles,
  notamment webpack vs turbopack).

**Obligation de traçabilité** : ton retour DOIT contenir une ligne
`fichiers de contexte lus : <liste des chemins que tu as réellement ouverts>`.
Une liste vide est une réponse valide et honnête ; une liste inventée ne l'est pas.

<!-- CACHE_CONTROL_BREAKPOINT -->
## Dépendances intra-sprint
- Vague 1, en parallèle avec l'issue #279 (migration `getRequestConfig` de `frontend/i18n.ts`).
  **Fichiers strictement disjoints** : l'autre agent ne touche QUE `frontend/i18n.ts`. Tu ne le
  touches pas. Le working tree est PARTAGÉ entre vous deux.
- **`git add` ciblé, fichier par fichier. JAMAIS `git add -A` ni `git add .`** — tu emporterais le
  travail en cours de l'autre agent dans ton commit.
- Conséquence de #279 : la résolution des messages serveur (`getTranslations`) change de signature
  pendant ce sprint. Si tu observes une anomalie de chargement de messages qui n'a pas de rapport
  avec ton diff, **ne la corrige pas dans `i18n.ts`** — signale-la dans ton retour.

## Designer
Non applicable — périmètre fonctionnel, aucun restyling demandé (cf. HORS PÉRIMÈTRE ci-dessus).
Les éléments ajoutés (sommaire, disclaimer) réutilisent les jetons DS déjà en place sur ces pages.

## Contraintes
- Branche cible : `sprint/75` (déjà checkout, ne pas en changer)
- Répertoire de travail : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe`
  — **c'est un worktree**. Vérifie `git rev-parse --abbrev-ref HEAD` = `sprint/75` avant tout
  commit ; ne travaille jamais depuis `/Users/herrh/VSProjects/MyTimeline` directement.
- Commit : 1 commit logique, message gitmoji en français. Mentionne l'absorption de #172.
- Tests : `./scripts/test-quiet.sh` pour l'unitaire + **exécution réelle de ta spec E2E**
- Piège outillage connu : le proxy `rtk` avale la sortie de `git diff` (elle revient ~vide) et a
  déjà rendu un verdict `prettier --check` FAUX (deux appels successifs sur un fichier intact,
  deux verdicts opposés). Pour un diff fiable : `rtk proxy git diff`, ou redirige vers un fichier et
  lis-le. Ne conclus rien d'une sortie vide, et n'impute pas à ton propre edit une non-conformité
  que tu n'as pas prouvée pré-existante.
- Ne PAS toucher : `frontend/i18n.ts`, `backend/`, `frontend/middleware.ts`

## Livrable attendu (format strict, MAX 500 tokens, style caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <ce qui a changé + choix de format de date + comptes de tests RÉELS passed/failed>
- [MEMORY:*] signaux: <liste si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou négation explicite>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)

Écris ton retour dans `docs/memory/sprints/sprint-75/issue-60-done.md`.
