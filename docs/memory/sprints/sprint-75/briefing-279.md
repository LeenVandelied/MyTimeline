[BRIEFING ISSUE #279]

## Issue
[CHORE] Migrer i18n.ts getRequestConfig({locale}) → requestLocale/hasLocale (API dépréciée next-intl)

`frontend/i18n.ts` utilise `getRequestConfig(async ({locale}) => …)`. Le paramètre `locale` est
déprécié depuis next-intl 3.22 au profit de `requestLocale` (une Promise) accompagné de `hasLocale`.
Le projet est en next-intl `^4.13.2` et Next `^15.2.4`.

### Critères d'acceptation
- `frontend/i18n.ts` utilise `requestLocale` + `hasLocale` au lieu du paramètre `locale` déprécié
- Aucune régression sur `next build` (4 locales prérendues : fr, en, es, de)
- Suite unitaire i18n existante toujours au vert

## Plan d'implémentation (vérifié contre le code par le lead, 2026-09-04)

**ATTENTION — l'énoncé de l'issue est inexact sur un point décisif.** Il affirme
« Non-impactant au runtime actuel […] indépendant de `getRequestConfig` ». C'est faux, vérifié :

- `frontend/next.config.mjs:3` fait `createNextIntlPlugin('./i18n.ts')` — le fichier EST le
  request-config actif de l'application.
- `frontend/app/[locale]/privacy/page.tsx` et `.../terms/page.tsx` appellent
  `getTranslations({ locale, namespace: 'legal' })` côté serveur, ce qui résout ses messages
  **via ce `getRequestConfig`**.

Donc : changement d'une ligne, mais sur un chemin vivant. Un test unitaire vert ne suffit PAS à
prouver l'absence de régression — il faut un `next build` et un rendu réel des pages.

**Contenu actuel de `frontend/i18n.ts`** (866 octets) : un `loadMessages(locale)` exporté qui lit
`public/locales/<locale>/*.json` depuis le disque et agrège un objet `{namespace: contenu}`, puis
le `export default getRequestConfig(async ({locale}) => ({ locale: locale || 'fr', messages: await loadMessages(safeLocale) }))`.

**Points d'attention :**
- `loadMessages` est aussi importé ailleurs (notamment par `app/[locale]/layout.tsx`) — **ne pas
  changer sa signature ni son comportement**, seul le `export default getRequestConfig` est dans le
  périmètre.
- `requestLocale` est une `Promise<string | undefined>` : il faut l'`await`.
- `hasLocale` s'importe depuis `next-intl` (pas `next-intl/server`) et attend une liste de locales.
  La liste des locales supportées doit venir d'une source déjà existante dans le projet plutôt que
  d'un tableau réinventé sur place — cherche-la (`middleware.ts`, `src/i18n/`, `next.config.mjs`) et
  réutilise-la ; si aucune n'est exportable proprement, déclare-la dans `i18n.ts` et dis-le dans ton
  retour.
- Le repli sur `'fr'` doit être conservé (locale de référence du projet).
- Le retour de `getRequestConfig` doit continuer à inclure `locale` (requis en next-intl 4).

**Vérification obligatoire avant de rendre :** `next build` complet, et confirmation que les 4
locales sont toujours prérendues. Si le build échoue ou si le nombre de pages prérendues change,
c'est un signal, pas un détail : rapporte-le.

## Triage
Taille: XS
Modèle: opus
Effort: medium

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
- Vague 1, en parallèle avec l'issue #60 (pages légales). **Fichiers strictement disjoints** :
  tu ne touches QUE `frontend/i18n.ts` (+ un éventuel test). L'autre agent travaille sur
  `frontend/app/[locale]/{privacy,terms}/page.tsx`, `frontend/public/locales/*/legal.json` et
  `frontend/e2e/`. Le working tree est PARTAGÉ entre vous deux.
- **`git add` ciblé, fichier par fichier. JAMAIS `git add -A` ni `git add .`** — tu emporterais le
  travail en cours de l'autre agent dans ton commit.

## Designer
Non applicable (aucun rendu visuel).

## Contraintes
- Branche cible : `sprint/75` (déjà checkout, ne pas en changer)
- Répertoire de travail : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe`
  — **c'est un worktree**. Vérifie `git rev-parse --abbrev-ref HEAD` = `sprint/75` avant tout
  commit ; ne travaille jamais depuis `/Users/herrh/VSProjects/MyTimeline` directement.
- Commit : 1 commit logique, message gitmoji en français
- Tests : `./scripts/test-quiet.sh` pour la suite unitaire, **plus** un `next build` du frontend
  (c'est la seule preuve qui compte ici, cf. plan d'implémentation)
- Piège outillage connu : le proxy `rtk` avale la sortie de `git diff` (elle revient ~vide) et a
  déjà rendu un verdict `prettier --check` FAUX. Pour un diff fiable : `rtk proxy git diff`, ou
  redirige vers un fichier et lis-le. Ne conclus pas sur une sortie vide.
- Ne PAS toucher : `app/`, `public/locales/`, `e2e/`, `src/components/`

## Livrable attendu (format strict, MAX 500 tokens, style caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <ce qui a changé + preuve build + tests>
- [MEMORY:*] signaux: <liste si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou négation explicite>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)

Écris ton retour dans `docs/memory/sprints/sprint-75/issue-279-done.md`.
