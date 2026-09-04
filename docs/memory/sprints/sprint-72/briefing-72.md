[BRIEFING ISSUE #72]

## Garde-fou repertoire (LIRE EN PREMIER)
Tu travailles dans un WORKTREE. Avant toute action :
  cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe
Verifie : `git rev-parse --show-toplevel` doit rendre ce chemin exact, et
`git branch --show-current` doit rendre `claude/sprint-start-72-320b8d`.
Si ce n'est pas le cas, STOP et remonte l'ecart. Ne travaille JAMAIS dans
/Users/herrh/VSProjects/MyTimeline (repo principal).

## Issue
[FEATURE] i18n : formats dates/nombres localises (Intl)

## AVERTISSEMENT — l'enonce de l'issue est PERIME
L'issue a ete redigee quand le code formatait les dates en dur via `dayjs`. Ce n'est
plus vrai. Le lead a verifie l'etat reel sur HEAD le 2026-09-04 :

DEJA LIVRE — NE PAS REFAIRE, NE PAS RE-AUDITER :
- `Intl.DateTimeFormat(locale, ...)` est utilise dans ~15 composants, la locale venant
  de `useLocale()` (next-intl). Points 1 et 5 de l'issue : faits.
- `dayjs` : **zero** occurrence dans `frontend/src`. `date-fns` : **zero** occurrence
  (ni import, ni `package.json`). Point 4 de l'issue : fait. Ne lance pas de
  desinstallation, il n'y a rien a desinstaller.

PERIMETRE REEL DE CETTE ISSUE — c'est le seul travail attendu :
1. **`Intl.NumberFormat` : zero occurrence dans tout le frontend.** Les nombres sont
   rendus bruts. Points de rendu identifies par le lead (liste de depart, pas
   exhaustive — verifie et complete) :
     - `components/dashboard/ProductCarousel.tsx:81`  `{count}`
     - `components/dashboard/ProductList.tsx:61`      `{count}`
     - `components/products/ProductDetailView.tsx:135,143` `{counts.active}` / `{counts.archived}`
     - `components/dashboard/DensityRibbon.tsx:88,121` `${b.count}` (dans un `title`)
2. **Les classes du Design System `mt-date--short` / `mt-num` sont appliquees dans
   ZERO composant.** Elles sont pourtant definies dans
   `frontend/src/styles/ds/components/i18n.css` et cette feuille EST bien chargee
   (`frontend/src/styles/globals.css:31`). Le code utilise a la place des utilitaires
   Tailwind ad-hoc (`font-mono ... tabular-nums`) qui font double emploi.
3. La convention posee par `i18n.css` est `<time datetime="..." class="mt-date--short">`.
   Il n'y a que **2** balises `<time>` dans tout le frontend
   (`dashboard/WeekAgenda.tsx:53`, `events/EventPreviewTimeline.tsx:243`).
4. Tests sur les 4 locales (fr/en/es/de) pour les affichages que tu modifies.

## Jugement attendu de ta part (ne pas appliquer mecaniquement)
Ne colle pas `mt-num` sur tout ce qui contient un chiffre. Ces classes servent
l'alignement en colonne et l'isolation bidi : elles ont du sens sur une date, un
compteur, une valeur tabulaire — pas sur un mot qui contient un nombre.
De meme pour `Intl.NumberFormat` : sur de petits compteurs entiers, le gain est nul
en fr/en/es/de. **Si tu conclus qu'un point de rendu n'a pas besoin d'etre change,
dis-le explicitement dans ton rapport avec la raison** — c'est une conclusion valable
et utile, pas un echec. Ce qui n'est pas acceptable, c'est de ne pas trancher.
La ou tu remplaces des utilitaires Tailwind par une classe DS, verifie que le rendu
ne change pas (taille, casse, graisse) : `.mt-date--short` impose `text-transform:
uppercase` et `font-size:11px`, ce que `font-mono tabular-nums` ne faisait pas.

## Plan d'implementation
inventaire verifie -> classes DS la ou elles ont du sens -> `Intl.NumberFormat` la ou
il a du sens -> tests 4 locales -> verification de non-regression FR.

## Piege connu de ce depot (PIT)
Les tests unitaires tournent sous jsdom. Un test qui asserte une chaine formatee est
valable ; un test qui pretendrait verifier une mise en page (largeur, alignement,
scroll) ne prouve rien sous jsdom. Reste sur des assertions de contenu textuel.
Attention aussi aux tests existants qui assertent des chaines FR en dur : si tu
changes un format, ils tomberont — c'est un signal, pas un obstacle a contourner.

## Triage
Taille: M (reduite de fait par le perimetre deja livre)
Modele: opus
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

## Packs a LIRE toi-meme avec l outil Read (chemins reels dans ce worktree)
Non inlines ici (volume). Ouvre-les avec Read AVANT de coder :
- `.ai-env/context-packs/pit-frontend.md` (102290 octets)
- `.ai-env/context-packs/br-events.md` (27518 octets)

Dans ton rapport, ajoute une ligne `fichiers de contexte lus:` enumerant ceux
que tu as reellement ouverts. Si tu n en as lu aucun, dis-le.

## Dependances intra-sprint
Aucune. L'issue #142 tourne en parallele sur `backend/**` et sur le seul fichier
frontend `frontend/src/services/authService.ts`.

## Fichiers a NE PAS toucher (appartiennent a #142, en cours en parallele)
- `backend/**` (tout)
- `frontend/src/services/authService.ts`

## Designer
Les classes que tu appliques viennent du Design System deja livre
(`frontend/src/styles/ds/components/i18n.css`). Tu n'inventes aucun style :
si un besoin visuel n'est pas couvert par une classe DS existante, remonte-le en
follow-up au lieu d'ecrire du CSS ad-hoc.
**Ne modifie pas `i18n.css`** — il est livre et hors perimetre.

## Contraintes
- Branche cible : `claude/sprint-start-72-320b8d` (deja checkout, ne pas en changer).
- Commit : 1 commit logique, message gitmoji en francais.
- `git add` CIBLE sur tes fichiers. **JAMAIS `git add -A` ni `git add .`** — un autre
  agent commite en parallele dans le meme working tree.
- Tests : `./scripts/test-quiet.sh` (scope frontend) — obligatoire, et rapporte les
  chiffres reels (passed/failed), pas une impression.
- Aucune modification de `package.json` / `package-lock.json` attendue.

## Honnetete du rapport
Si tu n'as pas execute les tests, dis-le. Si une partie du scope n'est pas livree,
dis-le en clair plutot que de la resumer comme faite. Un « STATUS: PARTIAL » exact
vaut mieux qu'un « COMPLETED » approximatif. Enumere explicitement les points de rendu
que tu as DECIDE de ne pas changer, avec la raison.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: objectif + fichiers cles + points de rendu changes / ecartes (avec raison)
  + resultats de tests chiffres
- [MEMORY:*] signaux: (pitfall / bug / pattern / decision) si applicables
- recommandations suite: RECOMMAND_* ou RECOMMAND_FOLLOWUP: <desc> [triage | domaine]
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
