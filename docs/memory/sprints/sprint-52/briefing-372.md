[BRIEFING ISSUE #372 — SPRINT 52]

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
[DOC] README racine — démarrage local en une commande

### Body
## Contexte
Il n'y a **aucun README à la racine**. `HELP.md` est le stub généré par Spring Initializr (liens vers la doc Maven), il ne décrit ni le produit ni comment le lancer. Pour un MVP dont la cible est « ça tourne en local », c'est le point d'entrée manquant.

Pièges connus non documentés :
- le port 5432 entre en conflit avec un PostgreSQL déjà installé sur la machine → override nécessaire
- sans `JWT_PRIVATE_KEY` dans `.env`, le backend génère une paire **éphémère** : les sessions ne survivent pas à un `docker compose restart` (comportement voulu, mais déroutant)
- `e2e` : CORS sur `:3000` produit une erreur qui se déguise en « rate-limit » ; `workers>1` fait rougir 4 specs settings

## À faire
- README racine : ce qu'est MyTimeline, capture ou description des écrans, stack, licence.
- Section « Démarrage » : prérequis, `.env` à partir de `.env.example`, la commande unique, l'URL d'accès, comment créer un premier compte.
- Section « Pièges connus » avec les trois points ci-dessus.
- Section « Tests » : unitaires backend/frontend et E2E.
- Renvoyer vers `docs/ops/deploiement-profils.md` pour la prod sans la dupliquer.

## Critères d'acceptation
- [ ] Un dépôt fraîchement cloné démarre en suivant **uniquement** le README, sans connaissance préalable — vérifié en repartant d'un clone vierge
- [ ] La commande de démarrage est unique et copiable
- [ ] Les trois pièges connus sont documentés
- [ ] `HELP.md` est supprimé ou vidé de son contenu générique


## Plan d'implémentation (architect, re-planification du 2026-07-29)

> Mini-plan produit par l'architecte **après lecture du code au HEAD `473ed65`**.
> Le champ `etat_reel_du_code` est une mesure, pas une supposition — mais **re-vérifie**
> les numéros de ligne avant d'éditer : ils peuvent avoir bougé.

```yaml
issue_0372:
  fichiers_cles:
    - "README.md"
    - "docker-compose.yml"
    - ".env.example"
    - "frontend/e2e/README.md"
    - "CLAUDE.md"
  couches_touchees: ["docs"]
  strategie_test: "aucun test automatisé — la preuve est un clone vierge démarré en suivant le seul README"
  risque_regression: "Aucune régression de code possible (aucun fichier source touché) ; le risque réel est un README qui documente une commande jamais exécutée — exactement le défaut que l'AC1 vise."
  ordre_ecriture: |
    1. CORRIGER LE PÉRIMÈTRE avant d'écrire — deux prémisses du body sont fausses au HEAD :
       - `HELP.md` n'existe NULLE PART dans le dépôt : l'AC « HELP.md supprimé ou vidé »
         est déjà satisfaite, la barrer plutôt que de la traiter.
       - `docs/ops/deploiement-profils.md` n'existe PAS : le renvoi demandé pointe dans le
         vide. Soit renvoyer vers un fichier existant de docs/ops/, soit retirer la section.
    2. Rédiger le README racine : produit, stack, écrans, licence.
    3. Section Démarrage : prérequis, `.env` depuis `.env.example` (4.5K, présent), la commande
       unique, l'URL, création du premier compte. EXÉCUTER la commande depuis un clone vierge
       avant de l'écrire — ne pas la déduire de docker-compose.yml.
    4. Section « Pièges connus » : les 3 points du body (conflit de port 5432, JWT_PRIVATE_KEY
       absente => paire éphémère, CORS :3000 déguisé en rate-limit + workers>1).
    5. Section Tests : renvoyer vers `scripts/test-quiet.sh`, `backend/mvnw` et
       `frontend/e2e/README.md` (6.6K, déjà écrit) — lier, ne pas dupliquer.
  zod_dto_sync: "NON"
  verification_navigateur: "NON APPLICABLE — livrable documentaire. La preuve exigée est un clone vierge démarré en suivant le seul README (AC1), pas un rendu de page."
  possibly_done: false
  etat_reel_du_code: |
    Vérifié au HEAD 473ed65. `ls` racine : .ai-env/ .claude/ .github/ backend/ docs/ frontend/
    scripts/ .env.example (4.5K) CLAUDE.md (2.6K) crowdin.yml docker-compose.yml (4.3K)
    pr-sprint.md. AUCUN README.md à la racine — confirmé, c'est bien le manque.
    `find -iname "HELP.md"` sur tout le dépôt (hors node_modules) => AUCUN RÉSULTAT.
    La prémisse « HELP.md est le stub Spring Initializr » est FAUSSE au HEAD ; backend/ ne
    contient que .mvn/ src/ .dockerignore Dockerfile mvnw mvnw.cmd package.json pom.xml.
    docs/ops/ ne contient QUE flyway-v11-validation.md et purge-git-secrets-runbook.md —
    `deploiement-profils.md` est un CHEMIN FANTÔME.
    Existent et sont réutilisables : frontend/README.md, frontend/e2e/README.md (6.6K),
    scripts/test-quiet.sh, scripts/flyway-validate.sh, docker-compose.yml, .env.example.
    NON VÉRIFIÉ PAR MOI : je n'ai pas lancé docker compose, ni constaté qu'une commande unique
    démarre effectivement la pile. Le fullstack-dev doit le prouver, pas le déclarer.
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

Tu tournes **en parallèle** de **#346** et **#347**, qui modifient tous deux des composants
sous `frontend/src/components/`. **Aucun fichier commun avec toi** — ton livrable est un
`README.md` à la racine, qui n'existe pas encore.

## Fichiers interdits (propriété d'un autre agent)

- **tout** `frontend/src/components/ui/**` → **#346**
- **tout** `frontend/src/components/landing/**` → **#347**
- `frontend/e2e/landing-mobile-menu.spec.ts` → **#347**

Tu peux **lire** n'importe quel fichier ; tu n'en **écris** aucun hors de `README.md`
(et, si tu le juges nécessaire, un fichier de `docs/` que tu signaleras explicitement).

⚠ Les deux autres agents modifient l'arborescence pendant que tu travailles. Si tu lances la
pile ou des tests, tu peux tomber sur un état transitoire incohérent : **ce n'est pas un bug
du dépôt**. Ne « corrige » rien qui ne soit pas à toi.

## Designer
Non applicable — livrable documentaire.

## ⚠ Deux prémisses de l'issue sont FAUSSES — vérifiées par l'architecte au HEAD 473ed65

Corrige le périmètre **avant** d'écrire, ne traite pas ces deux points tels quels :

1. **`HELP.md` n'existe nulle part dans le dépôt.** `find -iname "HELP.md"` → aucun résultat.
   La prémisse « HELP.md est le stub généré par Spring Initializr » est fausse. Le critère
   d'acceptation « HELP.md est supprimé ou vidé » est **déjà satisfait** : barre-le, ne le traite pas.
2. **`docs/ops/deploiement-profils.md` n'existe pas.** `docs/ops/` ne contient que
   `flyway-v11-validation.md` et `purge-git-secrets-runbook.md`. Le renvoi demandé par l'issue
   **pointe dans le vide** : soit tu renvoies vers un fichier réellement présent, soit tu retires
   la section. **N'invente pas un lien mort de plus.**

Re-vérifie ces deux points toi-même (`ls`, `find`) et confirme-les dans `premisses_infirmees`.
C'est le **5ᵉ sprint consécutif** où un chemin cité dans une issue ou un plan n'existe pas :
**vérifie l'existence de chaque chemin que tu écris dans le README.**

## Le critère d'acceptation n°1 est le cœur de l'issue

> « Un dépôt fraîchement cloné démarre en suivant **uniquement** le README, sans connaissance
> préalable — vérifié en repartant d'un clone vierge »

**Ce critère se prouve, il ne se déclare pas.** Exécute réellement la commande de démarrage
avant de l'écrire ; ne la déduis pas de la lecture de `docker-compose.yml`.

Si tu ne peux pas aller au bout d'un démarrage réel (Docker indisponible, port occupé,
image trop longue à construire), **dis-le franchement** dans `non_couvert` et écris exactement
ce que tu as pu vérifier et ce que tu as seulement déduit. Un README honnêtement annoté vaut
mieux qu'un README faussement validé.

⚠ **Attention aux effets de bord** : deux autres agents travaillent dans ce working tree.
Si tu démarres la pile, utilise un override de port et **arrête ce que tu as démarré** avant
de rendre.

## Matière première déjà présente (à lier, pas à dupliquer)

- `docker-compose.yml` (4,3 Ko) · `.env.example` (4,5 Ko) — présents à la racine
- `frontend/README.md` · `frontend/e2e/README.md` (6,6 Ko, déjà écrit et détaillé)
- `scripts/test-quiet.sh` · `scripts/flyway-validate.sh` · `backend/mvnw`
- `CLAUDE.md` (2,6 Ko) — décrit la stack, utile comme source, **pas** comme cible de lien public

## Les 3 pièges connus à documenter (mesurés sur ce projet, pas théoriques)

1. **Port 5432** : conflit avec un PostgreSQL déjà installé sur la machine → override nécessaire.
2. **`JWT_PRIVATE_KEY` absente de `.env`** : le backend génère une paire **éphémère**, donc les
   sessions ne survivent pas à un `docker compose restart`. Comportement **voulu**, mais déroutant
   — dis-le comme tel.
3. **E2E** : CORS sur `:3000` produit une erreur **qui se déguise en « rate-limit »**, et
   `workers>1` fait rougir 4 specs settings → `workers=1` obligatoire en local.


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
