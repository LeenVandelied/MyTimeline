[BRIEFING ISSUE #497]

## Issue
[A11Y] Plancher de lisibilité sur les traits peints dans la couleur utilisateur (jusqu'à 1,02:1 mesuré)

## Contexte

Follow-up détecté pendant le Sprint 70 (issue #325, PR #494).
Source : `docs/memory/sprints/sprint-70/issue-325-done.md` et `BUG-S70-001`.

## Description — défaut d'accessibilité MESURÉ

Dans la mini-frise d'aperçu du formulaire d'événement, deux traits sont peints **dans la
couleur choisie par l'utilisateur**, sans aucun plancher de lisibilité :

- le **connecteur pointillé** entre occurrences (`EventPreviewTimeline.tsx:152`) ;
- le **contour de l'occurrence fantôme** (`.mt-evt--draft`, `timeline.css:74`).

Contrastes mesurés au navigateur (WCAG, fond composité, drawer 1280×700) :

| Couleur d'événement | Thème | Connecteur | Contour fantôme |
|---|---|---:|---:|
| Défaut `#3B62D4` | clair | 5,41:1 | conforme |
| Défaut `#3B62D4` | sombre | 3,38:1 | ~3,15:1 |
| Citron (très clair) | clair | **2,20:1** | **2,07:1** |
| Quasi-noir | sombre | **1,02:1** | **1,02:1** |

Le seuil WCAG 1.4.11 (composants non textuels) est de **3:1**. Un utilisateur qui choisit une
couleur claire en thème clair, ou sombre en thème sombre, obtient un aperçu dont la partie
« récurrence » est **invisible**.

Le Sprint 70 a corrigé le cas de la couleur par défaut (retrait d'un `opacity:.8` redondant,
cf. `PIT-S70-003`) mais **pas** les couleurs extrêmes.

## Pourquoi ce n'est pas corrigé au Sprint 70

C'est un **arbitrage de doctrine du design system**, pas une correction visuelle : poser un
plancher de lisibilité sur une couleur choisie par l'utilisateur revient à décider que le DS
peut **modifier** cette couleur au rendu. Cela croise **#352**, qui a classé ce pointillé en
« tier fonctionnel » — sans mesurer le cas nominal.

## À faire

1. Trancher la doctrine : plancher de contraste (ex. mélange progressif vers l'encre jusqu'à
   atteindre 3:1) ? repli sur un token neutre sous le seuil ? contour de renfort ?
2. Implémenter, en restant **theme-aware** (le pire cas n'est pas le même en clair et en sombre).
3. Étendre `e2e/sprint-70-preview-visual.spec.ts` — il mesure **déjà** ces 4 cas, les
   assertions correspondantes sont à durcir une fois la doctrine posée.

## Triage estimé

S | Domaine : events / design


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — DOCTRINE TRANCHEE, NE PAS LA REOUVRIR :
Melange progressif de la couleur utilisateur vers l'ENCRE DU THEME jusqu'a atteindre 3:1.

- Perimetre STRICT : les 2 traits mesures dans l'issue, et eux seuls —
  le connecteur pointille (`EventPreviewTimeline.tsx:152`) et le contour de l'occurrence
  fantome (`.mt-evt--draft`, `timeline.css:74`). Ne PAS appliquer ce plancher aux autres
  surfaces peintes dans la couleur utilisateur : ce serait un elargissement sans mandat
  (c'est exactement le defaut MAJEUR attrape par la review du S70).
- Theme-aware obligatoire : le pire cas n'est pas le meme en clair (couleur tres claire)
  qu'en sombre (couleur quasi-noire). La cible de melange est l'encre du theme courant.
- Le melange doit etre PROGRESSIF (on s'arrete des que 3:1 est atteint), pas un saut a
  l'encre pleine — la teinte choisie doit rester reconnaissable quand c'est possible.
- Le calcul de contraste doit se faire sur le FOND COMPOSITE reellement rendu, comme dans
  les mesures de l'issue. Si une fonction de contraste/melange existe deja sous
  `frontend/src/styles/ds/` ou `frontend/src/lib/`, la reutiliser plutot que d'en ecrire une.
- Tests : `e2e/sprint-70-preview-visual.spec.ts` MESURE DEJA les 4 cas du tableau de l'issue
  — durcir ses assertions au seuil 3:1 plutot que d'ecrire une nouvelle spec. Ajouter des
  tests unitaires sur la fonction de plancher (cas: deja conforme -> inchangee ; citron en
  clair ; quasi-noir en sombre).
- Piege connu : les tests de rendu sous jsdom ne prouvent rien sur le contraste reel —
  la preuve attendue est l'E2E navigateur.

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
worktree : `docs/memory/sprints/sprint-71/briefing-497.md`. Il n'est pas recopié ici en entier — le recopier ferait
transiter ~57 K tokens DEUX fois par le contexte du lead, et une reproduction verbatim de cette
taille est elle-même une source d'erreur de transcription.

**LECTURE OBLIGATOIRE, dans cet ordre, AVANT d'écrire du code.** Tous ces chemins sont versionnés
et stables dans CE worktree :

1. `.ai-env/context-packs/br-events.md` (25 Ko) — règles métier `events`. **BR-EVE-009**
   (modèle couleur event) encadre la couleur utilisateur que tu vas plancher.
2. `.ai-env/context-packs/pit-frontend.md` (94 Ko) — cherche EN PRIORITÉ : `contrast`, `a11y`,
   `WCAG`, `opacity`, `theme`, `token`, `couleur`, `timeline.css`, `jsdom`.
3. `docs/memory/pitfalls.md` — **PIT-S70-003** (l'`opacity:.8` redondant retiré au S70) et
   **BUG-S70-001** dans `docs/memory/bugs-resolved.md` : ce sont tes antécédents directs.
4. `docs/memory/sprints/sprint-70/issue-325-done.md` — la mesure d'origine et sa méthode.
5. `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — **obligatoire** avant de toucher
   à `e2e/sprint-70-preview-visual.spec.ts` (recette d'exécution locale, pièges CORS/workers).
6. `frontend/src/styles/ds/` — chercher une fonction de contraste/mélange déjà existante.

⚠ Ce pointeur n'est **pas contraignant techniquement** : c'est TOI qui garantis la lecture.
C'est la faiblesse consignée à la clôture du Sprint 69 (« impossible de prouver que l'agent a
ouvert l'archive pointée »). D'où la ligne **`fichiers de contexte lus`** exigée dans ton
livrable, avec un ancrage vérifiable par fichier (identifiant de pitfall, numéro de ligne, ou
citation courte). Elle SERA auditée à la clôture du sprint. Si tu n'as pas lu un fichier,
écris-le — un aveu est exploitable, une affirmation fausse ne l'est pas.
## Dependances intra-sprint
- Aucune dependance bloquante.
- #495 travaille EN PARALLELE sur `EventDrawer`, `TimelineEditHost`, `ConflictDialog`.
  Toi tu restes sur `EventPreviewTimeline.tsx` + `timeline.css` + la spec E2E de mesure.

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
- **Ne PAS toucher aux fichiers** : `EventEditForm.tsx`, `EventDrawer`, `TimelineEditHost`, `ConflictDialog` (perimetres de #495/#496)

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Ecris `docs/memory/sprints/sprint-71/issue-497-done.md` avec :

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
