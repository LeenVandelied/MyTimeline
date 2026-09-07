[BRIEFING ISSUE #578 — SPRINT 83]

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

=====ISSUE #578
[BUG] Nav active : le précédent interne a remplacé la maquette (cause racine)
---
## Contexte

Les maquettes montrent l'état de navigation actif comme une **pilule graphite pleine à texte blanc**, avec le libellé en mono capitales espacées. Le produit rend une **pilule bleu pâle à texte bleu** (`bg-accent-soft text-accent`), libellé en sentence case.

L'origine est traçable, et c'est ce qui rend cette issue différente des trois autres motifs :

- Le motif naît dans `frontend/src/components/settings/SettingsShell.tsx:93`, introduit le **5 juillet 2026** par le commit `43d9e14` (#86, « Réglages desktop 4 chapitres »). Rien dans ce commit ne le rattache à une maquette.
- `AppShell.tsx:222-224` l'a ensuite recopié, et le **documente explicitement** en commentaire (`AppShell.tsx:91-93`) : la classe est *« calquée sur `SettingsShell` »*. La maquette n'est pas mentionnée.

Autrement dit : un écran s'est aligné sur son voisin interne plutôt que sur la référence, puis le suivant a hérité de l'écart. C'est le mécanisme qui explique une bonne part des autres constats de l'audit — et il continuera de produire de la dérive tant qu'il n'est pas nommé.

Deux faits aggravants relevés au même endroit :
- Le CTA « Nouvel événement » de la sidebar est en `bg-primary` (graphite) là où la maquette le veut en bleu accent — les deux couleurs sont exactement **inverties** par rapport à la maquette (`AppShell.tsx:190-200`, commentaire `:93`).
- Le projet de maquettes Claude Design n'a pas été modifié depuis le **24 juin 2026**, soit une vingtaine de sprints : la référence a cessé d'être consultée *et* d'être mise à jour.

## À faire

1. Aligner l'état actif de la navigation sur la maquette : pilule graphite pleine, texte `--color-primary-ink`, dans `AppShell` **et** dans `SettingsShell` (corriger la source, pas seulement la copie).
2. Rétablir le bleu accent sur le CTA « Nouvel événement » de la sidebar.
3. Trancher le libellé de navigation : mono capitales espacées (maquette) ou sentence case (produit actuel) — voir Dépendances, ce point interagit avec #575.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] `SettingsShell.tsx:93` et `AppShell.tsx:222-224` partagent le même état actif, conforme à la maquette
- [ ] Le commentaire `AppShell.tsx:91-93` est mis à jour : il ne doit plus désigner `SettingsShell` comme référence
- [ ] Le CTA sidebar est en bleu accent
- [ ] Contraste AA vérifié sur la pilule graphite dans les deux thèmes (elle s'inverse en sombre : `--color-primary` passe à `#ECEDEF`)

## Piste technique

- `frontend/src/components/layout/AppShell.tsx:190-200,222-224` et son commentaire `:91-93`
- `frontend/src/components/settings/SettingsShell.tsx:93` (la source du motif)
- Tokens : `--color-primary` / `--color-primary-ink` (`frontend/src/styles/ds/tokens/colors.css`)

## Dépendances

- **#575** (titre avalé par l'eyebrow) touche la même question de casse et de police pour les libellés — traiter les deux ensemble évite deux arbitrages contradictoires.
- Le point 3 (casse des libellés de navigation) demande une décision, pas seulement un correctif.

## Risques techniques

Faible techniquement. Le vrai risque est de ne corriger que `AppShell` en laissant `SettingsShell` intact : la source du motif resterait en place et pourrait réessaimer au prochain écran.

## Estimation

S — deux fichiers, mais une décision de casse à trancher au préalable.

## Origine

Audit de conformité maquettes ↔ production du 7 septembre 2026 (motif transversal 4/4). Ce motif est la **cause racine** identifiée par l'audit, les trois autres en étant en partie des symptômes.

Piste de fond, hors périmètre de cette issue : rien dans le processus actuel n'oblige à confronter un nouvel écran à sa maquette. Une entrée de mémoire projet ou une étape de revue pointant le handoff (`design_handoff_mytimeline/README.md` du projet Claude Design `e8ce9db5-cc08-42a5-8585-76e13a43f2f8`) éviterait la reproduction du motif.


## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_578:
  fichiers_cles:
    - "frontend/src/components/layout/AppShell.tsx"          # :223 'bg-accent-soft text-accent font-medium'
    - "frontend/src/components/settings/SettingsShell.tsx"   # origine du précédent (commit 43d9e14)
    - "frontend/src/styles/ds/components/core.css"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "AppShell.test.tsx (22.7K) assert probablement la classe legacy — la mise à jour du test doit refléter la maquette, pas figer le précédent."
  ordre_ecriture: "SettingsShell (source) -> AppShell (copie) -> commentaire :91-93 qui documente le calque -> tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    AppShell.tsx:223 rend encore `bg-accent-soft text-accent font-medium`, et le
    commentaire :41,:92 documente explicitement le calque sur SettingsShell.
    SettingsShell.tsx existe bien sous components/settings/ (pas components/layout/).
```

Contexte de vague : ce sprint exécute V1 = #518 ∥ #578 | V2 = #574 | V3 = #642.
Tu es en **vague 1**.

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

Aucune en amont. Tu es SEUL propriétaire de frontend/src/components/layout/AppShell.tsx pendant cette vague. #574 puis #642 y écriront APRÈS toi — laisse le fichier cohérent et commité.

**Arbitrage imposé sur le point 3 de l'issue (casse des libellés de navigation)** :
l'issue elle-même renvoie à #575, qui n'est PAS dans ce sprint. Tu livres donc les
points 1 et 2 (pilule graphite pleine dans AppShell ET SettingsShell + CTA sidebar en
bleu accent + commentaire :91-93 corrigé), et tu **ne changes pas la casse ni la police
des libellés** — sinon tu pré-empteras l'arbitrage de #575. Consigne ce choix dans ton
retour sous `RECOMMAND_FOLLOWUP` en le rattachant à #575.

Le critère d'acceptation « contraste AA dans les deux thèmes » ne se prouve pas sous
jsdom. Calcule le ratio depuis les tokens de `colors.css` (clair ET sombre) et donne
les deux chiffres dans ton retour ; si tu ne peux pas les calculer, dis-le en clair
dans `non vérifié / manquant`.

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
