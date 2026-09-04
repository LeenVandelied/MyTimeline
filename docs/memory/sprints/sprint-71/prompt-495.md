[BRIEFING ISSUE #495]

## Issue
[DESIGN] Étendre l'aperçu épinglé aux 3 surfaces d'édition (handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 70 (issue #326, PR #494).
Source : `docs/memory/sprints/sprint-70/issue-326-done.md`

## Description

Le Sprint 70 a livré l'aperçu live **épinglé en haut du drawer de création** (handoff §6),
par un portail : `EventEditForm` accepte une prop `previewPortalNode` et y portalise son bloc
d'aperçu ; `NewEventDrawer` monte le nœud hôte `.mt-drawer__preview` entre le header et
`.mt-drawer__body`. Voir `PAT-S70-001` dans `docs/memory/patterns.md`.

Le handoff §6 couvre « création **/ édition** », mais le périmètre du S70 a été volontairement
borné au **chemin création** (arbitrage du lead, pour ne pas élargir le risque de régression
sans mandat). Les 3 surfaces d'édition gardent donc l'aperçu **en flux** :
`EventDrawer`, `TimelineEditHost`, `ConflictDialog`.

## À faire

Étendre l'épinglage aux 3 surfaces d'édition, conformément au handoff §6.

## Difficulté réelle — lire avant d'estimer

La prop est **déjà générique** : côté `EventEditForm`, il n'y a rien à écrire. Le travail est
entièrement côté surfaces appelantes, et c'est là qu'est le risque :

- `TimelineEditHost` et `ConflictDialog` **n'ont pas la structure**
  `header / body(overflow:auto) / footer` du drawer — le pattern suppose un nœud hôte **frère**
  de la zone défilante, il faut donc vérifier surface par surface qu'un tel emplacement existe.
- `ConflictDialog` est rendu **PAR** `EventEditForm` (`import { ConflictDialog } from './shared/ConflictDialog'`),
  ce n'est pas un montage séparé du formulaire — le cas est particulier.
- Contrainte de non-régression : `PAT-S44-001` (le mode historique doit rester le défaut).
- ⚠ Si l'aperçu est épinglé sur une surface, **la classe du libellé « Aperçu » bascule aussi**
  (`previewLabelClassName`, `EventEditForm.tsx:365`) : c'est voulu, mais c'est exactement le
  défaut MAJEUR que la review du S70 a attrapé quand le changement fuyait sans mandat. Couvrir
  par un test par surface.

## Triage estimé

S | Domaine : events / design


## Plan d'implementation (arbitrage dev, /sprint start 71)
Pas d'arbitrage produit a rendre : le pattern est deja pose au S70 (`PAT-S70-001`).

- `EventEditForm` accepte deja la prop generique `previewPortalNode` : cote formulaire il
  n'y a NORMALEMENT rien a ecrire. Si tu constates le contraire, dis-le dans le retour
  plutot que d'elargir silencieusement.
- Travail = les 3 surfaces appelantes : `EventDrawer`, `TimelineEditHost`, `ConflictDialog`.
  Verifier SURFACE PAR SURFACE qu'un noeud hote frere de la zone defilante existe :
  `TimelineEditHost` et `ConflictDialog` n'ont PAS la structure header/body(overflow:auto)/footer
  du drawer. Si une surface ne peut pas accueillir le pattern sans restructuration lourde,
  NE PAS la forcer : livrer les autres et remonter le cas en STATUS PARTIAL + BLOQUE_SUR.
- Cas particulier : `ConflictDialog` est rendu PAR `EventEditForm`
  (`import { ConflictDialog } from './shared/ConflictDialog'`), ce n'est pas un montage separe.
- Non-regression `PAT-S44-001` : le mode historique doit rester le defaut.
- Epingler une surface fait aussi basculer la classe du libelle « Apercu »
  (`previewLabelClassName`, `EventEditForm.tsx:365`) : c'est VOULU ici, mais il faut un test
  PAR SURFACE qui le couvre — c'est le defaut que la review du S70 a attrape.
- CONFLIT DE FICHIER : l'issue #496 (vague 2) modifiera les commentaires de
  `EventEditForm.tsx` lignes ~174 et ~289. Evite d'y toucher ; si tu dois absolument editer
  ce fichier, signale-le dans ton retour.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack frontend (inline)

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


## Context-pack domaine — 1 pack inline ci-dessus, le reste par pointeur

Le briefing COMPLET (~230 Ko : `cp-*` + `br-*` + `pit-*` + règles JIT) est présent dans CE
worktree : `docs/memory/sprints/sprint-71/briefing-495.md`. Il n'est pas recopié ici en entier — le recopier ferait
transiter ~57 K tokens DEUX fois par le contexte du lead, et une reproduction verbatim de cette
taille est elle-même une source d'erreur de transcription.

**LECTURE OBLIGATOIRE, dans cet ordre, AVANT d'écrire du code.** Tous ces chemins sont versionnés
et stables dans CE worktree :

1. `.ai-env/context-packs/br-events.md` (25 Ko) — règles métier `events`.
2. `.ai-env/context-packs/pit-frontend.md` (94 Ko) — cherche EN PRIORITÉ : `portal`, `sticky`,
   `z-index` / `--z-modal` / `--z-sticky`, `drawer`, `sheet`, `scroll`, `overflow`, `jsdom`,
   `EventEditForm`.
3. `docs/memory/patterns.md` — **PAT-S70-001** (le pattern de portail que tu étends) et
   **PAT-S44-001** (le mode historique reste le défaut : contrainte de non-régression).
4. `docs/design/graphite-handoff.md` §6 — la spéc de référence (« création / édition »).
5. `docs/memory/sprints/sprint-70/issue-326-done.md` — comment le pattern a été posé côté
   création, et pourquoi l'édition avait été volontairement exclue du périmètre.
6. `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — seulement si tu écris un E2E.

⚠ Ce pointeur n'est **pas contraignant techniquement** : c'est TOI qui garantis la lecture.
C'est la faiblesse consignée à la clôture du Sprint 69 (« impossible de prouver que l'agent a
ouvert l'archive pointée »). D'où la ligne **`fichiers de contexte lus`** exigée dans ton
livrable, avec un ancrage vérifiable par fichier (identifiant de pitfall, numéro de ligne, ou
citation courte). Elle SERA auditée à la clôture du sprint. Si tu n'as pas lu un fichier,
écris-le — un aveu est exploitable, une affirmation fausse ne l'est pas.
## Dependances intra-sprint
- Aucune dependance bloquante en amont.
- **Doit etre livree AVANT #496** (vague 2), qui editera les commentaires de `EventEditForm.tsx`.
- #497 travaille EN PARALLELE sur `EventPreviewTimeline.tsx` et `timeline.css` — n'y touche pas.

## Designer
Non applicable (pas de nouvelle surface visuelle a valider en amont) — sauf mention contraire
dans le plan d'implementation ci-dessus.

## Contraintes d'execution (LIRE — pieges deja payes sur ce projet)

- **Repertoire de travail** : `cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  EN PREMIERE COMMANDE. C'est un **worktree git**, pas le repo principal. Ne JAMAIS `cd` vers
  `/Users/herrh/VSProjects/MyTimeline` tout court : tu travaillerais sur un autre checkout et
  ton verdict serait faux.
- **Garde-fou HEAD** : verifie `git rev-parse --abbrev-ref HEAD` == `claude/sprint-71-start-09aa02`
  avant toute ecriture. Si ce n'est pas le cas : STOP et remonte-le.
- **Working tree PARTAGE** : 3 autres subagents travaillent EN PARALLELE dans ce meme repertoire
  sur d'autres issues. Consequences non negociables :
  - `git add` **CIBLE fichier par fichier**. JAMAIS `git add -A`, JAMAIS `git add .`,
    JAMAIS `git commit -a` — tu commiterais le travail en cours des autres.
  - Ne `git checkout` / `git restore` / `git stash` **rien** que tu n'aies pas ecrit toi-meme.
  - Ne touche pas aux fichiers listes en « Ne PAS toucher » ci-dessous.
  - Le SHA que tu lis via `git rev-parse HEAD` juste apres ton commit peut deja avoir bouge
    (commit concurrent). Reporte le SHA rendu par ta propre commande `git commit`, et dis-le
    si tu as un doute.
- **Piege outillage RTK** : `git diff` peut renvoyer une sortie vide/tronquee sous le hook RTK.
  Utilise `rtk proxy git diff ...` (ou redirige vers un fichier puis lis-le). Une sortie vide
  n'est PAS une preuve qu'il n'y a pas de diff.
- **Commit** : 1 seul commit logique, message gitmoji en francais, se terminant par
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. **Ne PAS `git push`.**
- **Tests** : `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE, inline). Le lancement direct de
  `backend/./mvnw` est le repli si le script echoue. Si volume > 500 tests OU > 3 min :
  ecris `RECOMMAND_TEST_RUNNER` dans ton retour plutot que d'attendre.
- **Migration Flyway** : aucune attendue sur cette issue. Si tu en crees une, ce serait `V16`
  et il faut le signaler (`RECOMMAND_DB_EXPERT`).
- **Ne PAS toucher aux fichiers** : `EventPreviewTimeline.tsx`, `frontend/src/styles/**/timeline.css` (perimetre de #497)

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Ecris `docs/memory/sprints/sprint-71/issue-495-done.md` avec :

RETOUR :
- commits: [SHA...]
- resume: objectif + BR touchees + fichiers cles + pitfalls rencontres + tests (chiffres reels)
- [MEMORY:*] signaux: bug / pitfall / pattern / business-rule / decision (si applicable)
- recommandations suite: signaux `RECOMMAND_*` (DB_EXPERT / TEST_RUNNER / SECURITY / UI_DESIGN /
  FOLLOWUP) **OU une negation explicite sur UNE SEULE LIGNE** du type
  `Pas de RECOMMAND_SECURITY car <raison>` — la negation coupee par un retour a la ligne n'est
  pas reconnue par le hook de completude.
- Section `## Recommandations suite` OBLIGATOIRE (meme vide-avec-negation), sinon la cloture
  du sprint est bloquee.
- Derniere ligne du fichier : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
  `BLOQUE_SUR` au-dessus).

Ne declare pas « termine » ce que tu n'as pas execute : enumere ce qui n'a PAS ete verifie.

### Ligne supplémentaire OBLIGATOIRE dans le done.md

- `fichiers de contexte lus:` — un item par fichier listé dans la section pointeur ci-dessus,
  avec un **ancrage vérifiable** (identifiant `PIT-*` / `BR-*` / `PAT-*`, numéro de ligne, ou
  citation courte). Écris explicitement `NON LU` pour ceux que tu n'as pas ouverts. Cette ligne
  est auditée à la clôture du sprint.
