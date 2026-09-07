[BRIEFING ISSUE #574 — SPRINT 83]

## Garde-fou d'environnement (À EXÉCUTER EN PREMIER, AVANT TOUTE LECTURE)

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton cwd par défaut
peut être faux (PIT sprint-subagent-worktree-cwd).

```bash
cd "/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc"
git rev-parse --show-toplevel   # DOIT afficher exactement : /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc
git log --oneline -1            # DOIT afficher : 8ed3dd9 :memo: docs(sprint-plan): corriger les énoncés de #621 et #629
```

Si l'un des deux ne correspond pas : **ARRÊTE** et rends `STATUS: PARTIAL` +
`BLOQUE_SUR: mauvais worktree`. Ne code pas ailleurs.

## Issue

=====ISSUE #574
[CHORE] Ombre au repos contre filet 1px : 8 surfaces hors charte sur 3 écrans
---
## Contexte

La charte de design réserve les ombres `shadow-md`/`shadow-lg` aux popovers et aux modales, et impose un filet 1 px sur les surfaces au repos. Le commentaire du token le formule sans ambiguïté (`frontend/src/styles/ds/tokens/spacing.css:3-4,31`) : *« Subtle shadows — the system prefers hairline rules to elevation »*, *« elevation — used sparingly; rules come first »*.

L'audit de conformité aux maquettes Claude Design (7 septembre 2026) a relevé **8 surfaces au repos qui portent `shadow-lg`** sur 3 écrans distincts. Ce n'est donc plus un défaut local comme #505, mais un motif systémique.

Cas particulier à noter : sur `FeaturesSection.tsx:65`, la carte porte `shadow-lg` au repos **et** `hover:shadow-md` — l'ombre *diminue* au survol, l'effet d'élévation est inversé.

## À faire

Remplacer `shadow-lg` par le traitement conforme (filet `border border-rule` + `shadow-xs`/`shadow-sm` si une élévation reste nécessaire) sur les 8 sites listés. Corriger au passage l'inversion de survol de `FeaturesSection`.

Écrans concernés :
- **Landing** — `FeaturesSection.tsx:65`, `TestimonialCard.tsx:42`, `HeroSection.tsx:113`
- **Auth** — `login/page.tsx:68` et les 3 équivalents (`register`, `forgot-password`, `reset-password`), qui portent `shadow-lg` **sans aucune bordure**
- **Pages légales** — `terms/page.tsx:70`, `privacy/page.tsx:95` (ces deux-là ont déjà un `border-rule` : l'ombre est en plus, pas à la place)

Bonus sur le même périmètre : les pages légales portent aussi `rounded-xl` (14 px), au-delà du plafond de 10 px pour une carte (`frontend/src/styles/ds/readme.md:72`).

## BR impactées

Aucune (conformité à la charte de design, pas de règle métier).

## Critères d'acceptation

- [ ] Aucune des 8 surfaces listées ne porte `shadow-lg` au repos
- [ ] Les 4 cartes Auth portent un filet 1 px
- [ ] `FeaturesSection` n'a plus d'ombre qui décroît au survol
- [ ] `rounded-xl` des pages légales ramené à `rounded-lg` (10 px)
- [ ] Rendu vérifié en clair **et** en sombre (les ombres du thème sombre sont bien plus opaques : `rgba(0,0,0,.65)` pour `shadow-lg`)

## Piste technique

- Charte : `frontend/src/styles/ds/readme.md:106-107` ; tokens : `frontend/src/styles/ds/tokens/spacing.css:31-35`
- Correctif de référence : celui appliqué au Sprint 71 sur `TimelineEditHost` (`shadow-md` → `border-b border-rule`)
- ⚠️ `frontend/src/components/settings/` est **indemne** de ce motif : s'en servir comme référence de ce à quoi doit ressembler le résultat.

## Dépendances

Aucune. Recouvre partiellement #505 (même motif, autre fichier) — vérifier avant de fermer si #505 devient redondante.

## Risques techniques

Faible. Purement CSS, aucun changement de structure. Le seul point de vigilance est la perception de profondeur des cartes Auth, qui n'ont aujourd'hui aucune bordure : vérifier qu'elles restent distinctes du fond en thème clair (`--color-bg` #FCFCFD vs `--color-surface` #FFFFFF, différence très faible).

## Estimation

S — 8 remplacements de classes, mais répartis sur 3 écrans et à revérifier en 2 thèmes.

## Origine

Audit de conformité maquettes ↔ production du 7 septembre 2026 (motif transversal 1/4), par confrontation du code au handoff écrit du projet Claude Design « Refonte graphique MyTimeline ».


## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_574:
  fichiers_cles:
    - "frontend/src/components/landing/HeroSection.tsx"        # :113
    - "frontend/src/components/landing/FeaturesSection.tsx"    # :65 (ombre qui DIMINUE au survol)
    - "frontend/src/components/TestimonialCard.tsx"            # :42
    - "frontend/src/components/layout/AppShell.tsx"            # :323 (FAB mobile)
    - "frontend/app/[locale]/login/page.tsx"                   # :68
    - "frontend/app/[locale]/register/page.tsx"
    - "frontend/app/[locale]/forgot-password/page.tsx"
    - "frontend/app/[locale]/reset-password/page.tsx"
    - "frontend/app/[locale]/privacy/page.tsx"                 # :95 (porte DÉJÀ un filet)
    - "frontend/app/[locale]/terms/page.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Le FAB mobile d'AppShell:323 est un élément flottant, pas une surface au repos — le retirer de l'ombre serait un faux positif du sweep. Arbitrer avant d'écrire."
  ordre_ecriture: "Écrans hors landing d'abord (auth + légal, gestes identiques) -> landing -> AppShell FAB en dernier avec arbitrage explicite"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    `shadow-lg` confirmé sur les 10 fichiers ci-dessus. FeaturesSection.tsx:36 porte
    même un commentaire qui décrit le conflit `shadow-lg` -> `hover:shadow-md`.
    Aucune correction en cours.
  note_aval: |
    #610 (Sprint 87) réécrit HeroSection.tsx:113. Le filet posé ici DOIT être
    préservé par ce sprint-là — cité dans le briefing S87.
```

Contexte de vague : ce sprint exécute V1 = #518 ∥ #578 | V2 = #574 | V3 = #642.
Tu es en **vague 2**.

## Triage
Taille: S
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
<!-- ===== fin cp-frontend.md ===== -->

## Packs complémentaires — À LIRE TOI-MÊME (trop volumineux pour être inlinés)

Ces fichiers ne sont PAS dans ce prompt. Ouvre-les avec Read/grep depuis le worktree :

- `.ai-env/context-packs/pit-frontend.md` (164 Ko) — pièges frontend connus.
  **Obligatoire** : grep les mots-clés de ton issue avant d'écrire du code
  (ex. `grep -n "AppShell\|shadow-lg\|<time>\|next-themes\|dateTime" .ai-env/context-packs/pit-frontend.md`).
- `.claude/rules/frontend-stack.md` — TS strict, Zod, next-intl, Tailwind v4.
- `.claude/rules/conventions.md` — code EN / docs FR.
- `frontend/src/styles/ds/` — design system (tokens, composants).
- `docs/design/` s'il existe — charte.

**Dans ton retour, tu DOIS inclure une ligne `fichiers de contexte lus : ...`**
énumérant les fichiers ci-dessus que tu as réellement ouverts. Une ligne absente ou
vide sera traitée comme un travail non fondé.

## Dépendances intra-sprint

#578 (vague 1) a déjà réécrit `frontend/src/components/layout/AppShell.tsx` et
`frontend/src/components/settings/SettingsShell.tsx` — ces commits sont sur la branche.
**Ne touche PAS au FAB mobile d'`AppShell.tsx:323`** : l'architect l'a identifié comme un
faux positif du sweep (élément flottant, pas une surface au repos), et il ne figure pas
dans les 8 sites listés par l'issue. Consigne cet arbitrage dans ton retour.

Ton périmètre est **exactement les 8 sites de l'issue** (+ `rounded-xl` des pages légales) :
landing (`FeaturesSection.tsx:65`, `TestimonialCard.tsx:42`, `HeroSection.tsx:113`),
auth (`login`, `register`, `forgot-password`, `reset-password`), légal (`terms`, `privacy`).

Vérifie aussi si **#505** (même motif, autre fichier) devient redondante, et dis-le.

Note aval : #610 (Sprint 87) réécrira `HeroSection.tsx:113`. Le filet que tu poses ici devra
être préservé — mentionne-le dans ton retour pour qu'il soit tracé.

Le critère « rendu vérifié en clair ET en sombre » ne se prouve pas sous jsdom. Raisonne sur
les tokens (`ds/tokens/spacing.css`, `ds/tokens/colors.css`) et dis explicitement ce que tu
n'as PAS pu observer — en particulier la lisibilité des cartes Auth sans bordure en thème
clair (`--color-bg` #FCFCFD vs `--color-surface` #FFFFFF, écart très faible).

## Contraintes d'exécution (DURES)

- **Branche** : déjà sur `claude/sprint-83-start-4651a0` (= contenu de `sprint/83`).
  Ne change PAS de branche, ne rebase pas, ne `git stash` pas (stash partagé entre
  worktrees — PIT).
- **Commit** : 1 seul commit logique, message gitmoji **en français**.
- **`git add` CIBLÉ obligatoire** — jamais `git add -A`, jamais `git add .`
  (le worktree est partagé avec d'autres agents en parallèle : tu commiterais leur
  travail). Liste les chemins un par un :
  `git add frontend/src/a.tsx frontend/src/b.tsx`.
  ⚠ `git add -- $F` avec une variable non quotée est **inerte sous zsh** (PIT S76) —
  écris les chemins littéralement.
- **Ne touche à AUCUN fichier hors de ton périmètre**, en particulier :
  `docs/memory/**`, `.ai-env/**`, `playwright.config.ts`, et les fichiers cités
  dans les mini-plans des AUTRES issues du sprint.
- **Tests** : lance `./scripts/test-quiet.sh frontend` (ou le scope adapté). Les tests
  unitaires frontend sont **obligatoires** avant de rendre.
- **Playwright / E2E** : ne lance PAS la suite E2E toi-même (un seul agent à la fois
  peut la tenir, et le lead s'en charge). Si ton issue a besoin d'un E2E, **écris la
  spec** et signale `RECOMMAND_TEST_RUNNER`.
- **jsdom ne prouve pas le scroll ni le rendu visuel** (PIT) : si ta vérification
  dépend d'une mesure réelle du navigateur, dis-le explicitement plutôt que d'affirmer
  que c'est vérifié.
- Si un énoncé de l'issue contredit ce que tu lis dans le code, **le code fait foi** —
  consigne l'écart dans ton retour (PIT : énoncés d'issue périmés).

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA]
- fichiers de contexte lus: <liste>
- resume: <objectif + fichiers clés + décisions d'arbitrage + tests lancés & résultat chiffré>
- non vérifié / manquant: <ce que tu n'as PAS pu prouver — obligatoire, "rien" interdit sans justification>
- [MEMORY:pitfall|pattern|decision|bug] signaux: <liste ou "aucun">
- RECOMMAND_FOLLOWUP: <desc [triage|domaine]> ou "aucun"
- recommandations suite: <RECOMMAND_TEST_RUNNER / RECOMMAND_UI_DESIGN / ... ou "aucune">
- STATUS: COMPLETED  (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>) — **dernière ligne**
