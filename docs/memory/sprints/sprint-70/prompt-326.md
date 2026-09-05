[BRIEFING ISSUE #326]

## Issue
[DESIGN] Aperçu sticky en haut du drawer de création (handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 46 (issue #315, PR #324).
Source : `docs/memory/sprints/sprint-46/issue-315-done.md`

## Description

Le handoff `docs/design/graphite-handoff.md` §6 spécifie que l'aperçu de l'événement reste **collé en haut
du drawer** (sticky) pendant que l'utilisateur fait défiler le formulaire.

L'issue #315 a livré le **contenu** de l'aperçu (mini-frise conforme au handoff) mais **pas son positionnement
sticky** : l'aperçu reste à sa place actuelle dans le flux du formulaire.

## Pourquoi ce n'est pas fait au Sprint 46

Écart assumé et documenté. Hisser l'aperçu en haut du drawer impliquerait `NewEventDrawer.tsx` et modifierait
les **surfaces d'édition partagées** — `EventEditForm` sert à la fois la création (drawer) et l'édition
(`EventDrawer`, `TimelineEditHost`, `ConflictDialog`). Le scope dépassait celui de #315.

## À faire

- Rendre l'aperçu sticky en haut du drawer de création, conformément au handoff §6
- **Sans régresser** les surfaces d'édition qui partagent `EventEditForm` (cf. `PAT-S44-001` : le mode
  historique doit rester le défaut)

## Triage estimé

S | Domaine : events / design

## Origine

`RECOMMAND_FOLLOWUP` remonté par le fullstack-dev pendant le Sprint 46, arbitré en Phase 4 de `/sprint end`.
Classé backlog libre : écart design assumé, sans urgence.


## Plan d'implementation
(Aucun mini-plan architect : le Sprint 70 n'a PAS été planifié par `/sprint plan`
— le milestone #71 et les labels `sprint-70` viennent du triage de clôture du
Sprint 46. Pas d'`architect-plans.md`. Tu décides de l'approche d'après l'état
vérifié ci-dessous + le pack domaine + le body de l'issue.)

### État vérifié par le lead au démarrage (mesuré sur `fd954b2`, pas supposé)

| Vérification | Résultat |
|---|---|
| `grep -rn sticky frontend/src/components/events/` | **0 hit** — aucun sticky sur l'aperçu. #326 est intégralement à faire, aucun NO-OP. |
| Où vit l'aperçu aujourd'hui | `frontend/src/components/EventEditForm.tsx` ~ligne 750, **dans le flux du formulaire, APRÈS le champ Couleur**, dans le bloc `{...}` non-`isCreate`-agnostique. Wrapper : `<div>` + libellé `tDetails('preview')` + `<EventPreviewTimeline .../>`. |
| Composant rendu | `frontend/src/components/events/EventPreviewTimeline.tsx` (livré #315, S46) |
| Drawer de création | `frontend/src/components/events/NewEventDrawer.tsx`. Le corps scrollable est `.mt-drawer__body` (desktop) / `.mt-sheet__body` (compact `<1024px`). `EventEditForm` est monté DEDANS, précédé du sélecteur de produit (`mt-drawer__field`) qui vit hors du formulaire. |
| Précédent de sticky déjà en place dans ce drawer | `.mt-sheet__footer` (#79) — pied sticky obtenu en **sortant** le nœud de `.mt-sheet__body` et en y **portalisant** le contenu depuis `EventEditForm` via la prop `footerPortalNode`. C'est le pattern maison pour « épingler un morceau du formulaire à une extrémité du drawer » ; il existe déjà, il est testé, et il ne duplique aucun markup. |
| Surfaces partagées à ne PAS régresser | `EventEditForm` sert AUSSI l'édition : `EventDrawer`, `TimelineEditHost`, `ConflictDialog`. Cf. `PAT-S44-001` — le mode historique doit rester le défaut. |
| Tokens `z-index` disponibles | `--z-sticky: 10` (`frontend/src/styles/ds/tokens/spacing.css:82`). ⚠ `PIT` connu : `.mt-sheet` / `.mt-actionsheet` partagent `--z-modal` (cf. issue #446) — vérifie l'empilement, ne pose pas un z-index littéral. |
| CSS de l'aperçu | `frontend/src/styles/ds/components/timeline.css:68-73` (`.mt-evt--preview`) |
| Spéc de référence | `docs/design/graphite-handoff.md` §6 (ligne 197) : « **Aperçu live sticky en haut** : mini-frise (ruler, TODAY) … + légende prochaine occurrence » |

### Contrainte de périmètre (tranchée par le lead)

L'issue dit « en haut du **drawer de création** ». Le handoff §6 couvre « création /
édition ». **Périmètre retenu : le chemin CRÉATION uniquement** (`mode="create"`,
donc `NewEventDrawer`). Motif : c'est le texte littéral de l'issue, et étendre le
sticky aux 3 surfaces d'édition partagées (`EventDrawer`, `TimelineEditHost`,
`ConflictDialog`) élargit le risque de régression sans mandat. Si ton implémentation
rend l'extension triviale et sans risque, **ne la fais pas quand même** : signale-la en
`RECOMMAND_FOLLOWUP`.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack domaine — 1 pack inline, 4 par pointeur

Le briefing COMPLET (150 Ko : `cp-frontend` + `br-events` + `pit-frontend` +
`rules-jit/frontend` + `rules-jit/ux-patterns`) est committé dans ce worktree :
`docs/memory/sprints/sprint-70/briefing-326.md`. Il n'est pas recopié ici en entier —
le recopier ferait transiter ~70 K tokens DEUX fois par le contexte du lead, et une
reproduction verbatim de cette taille est elle-même une source d'erreur de transcription.

**LECTURE OBLIGATOIRE, dans cet ordre, AVANT d'écrire du code.** Tous ces chemins sont
versionnés et stables dans CE worktree :

1. `.ai-env/context-packs/br-events.md` (25 Ko) — règles métier du domaine `events`
   (BR-EVE-*). Pour toi, l'essentiel est **BR-EVE-009** (perf de l'aperçu live : les
   valeurs arrivent débouncées à 150 ms depuis `EventEditForm`, ne re-branche rien sur
   les `watch()` bruts).
2. `.ai-env/context-packs/pit-frontend.md` (90 Ko) — archive des pièges frontend.
   Cherche EN PRIORITÉ : `sticky`, `z-index` / `--z-modal` / `--z-sticky`, `portal`,
   `drawer`, `sheet`, `scroll`, `overflow`, `jsdom`, `EventEditForm`.
3. `docs/design/graphite-handoff.md` §6 (ligne 197) — la spéc de référence.
4. `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — seulement si tu écris un E2E.
5. Les sections `rules-jit/frontend.md` et `rules-jit/ux-patterns.md`, recopiées dans
   `docs/memory/sprints/sprint-70/briefing-326.md` (à partir du marqueur
   `<!-- ===== rules-jit/frontend.md ===== -->`).

⚠ Ce pointeur n'est **pas contraignant techniquement** : c'est TOI qui garantis la
lecture. C'est exactement la faiblesse consignée à la clôture du Sprint 69 (« impossible
de prouver que l'agent a ouvert l'archive pointée »). D'où la ligne **`fichiers de
contexte lus`** exigée dans ton livrable, avec un ancrage vérifiable par fichier
(identifiant de pitfall, numéro de ligne, ou citation courte). Elle SERA auditée à la
clôture du sprint. Si tu n'as pas lu un fichier, écris-le — un aveu est exploitable,
une affirmation fausse ne l'est pas.

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

## Dependances intra-sprint
- **Tu es la VAGUE 1.** L'issue #325 (vérification visuelle de la mini-frise en
  clair/sombre) est la vague 2 et sera lancée APRÈS toi, sur ton résultat. Elle
  vérifiera l'aperçu **à sa position finale** — donc celle que tu livres.
- Conséquence : ne laisse pas l'aperçu dans un état visuellement provisoire. Si tu
  sais qu'un écart visuel subsiste, écris-le explicitement dans ton `RETOUR` — il
  deviendra une entrée de la checklist de #325 au lieu d'une découverte tardive.
- Fichiers que #325 touchera très probablement : `timeline.css` (bloc `.mt-evt--preview`
  et voisins) et `EventPreviewTimeline.tsx`. Tu peux les modifier — tu passes en premier.

## Designer
Non applicable (pas de nouveau composant : repositionnement d'un composant existant).
La spéc EST le handoff §6, cité dans le HEAD. **Ne réinvente pas le rendu de l'aperçu**,
c'est le périmètre de #325.

## Contraintes

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Tu travailles dans un worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Piège mesuré sur ce
  projet : un subagent peut défaut-`cwd` sur le dépôt principal et produire un faux KO
  (fichier « introuvable », diff vide). Garde-fou : `git rev-parse HEAD` doit rendre
  `fd954b2a0e0f1ff7eb45adae619618776108dbe4` (ou un descendant, si tu as déjà commité).
- Branche : `claude/sprint-70-start-b946cb` (déjà checkout, == `origin/dev`).
  **Convention projet : PAS de branche `sprint/70`.** Ne la crée pas.
- `frontend/node_modules` est **ABSENT** dans ce worktree (`PIT-S69-002`). Si
  `./scripts/test-quiet.sh frontend` échoue sur un préflight d'environnement,
  **ce n'est PAS une suite rouge** — ne conclus pas à une régression. Installe
  (`cd frontend && npm ci`) ou dis-le dans ton retour.
- **`git diff` est avalé par le proxy RTK** sur ce poste (sortie ~vide, trompeuse).
  Utilise `rtk proxy git diff …`, ou `git show --stat`, ou dump-vers-fichier + lecture.
  Idem : `git log` peut rendre une sortie mal filtrée — `git rev-parse` est fiable.

### Code
- Commit : **1 commit logique**, message gitmoji en **français**.
  `git add` **CIBLÉ** sur tes fichiers — **jamais `git add -A`** (le working tree est
  partagé, un autre agent peut y écrire).
- Code en anglais, commentaires/docs en français (convention projet).
- Réutilise le pattern portal existant (`footerPortalNode`) plutôt que d'inventer un
  second mécanisme, **sauf** si tu démontres qu'il ne convient pas — auquel cas explique
  pourquoi dans le commit et le retour.
- Zéro couleur littérale, zéro `z-index` littéral : tokens DS uniquement.
- Ne touche PAS : `backend/**`, `db/migration/**`, `frontend/e2e/**` (sauf si tu ajoutes
  une spec — voir ci-dessous), `frontend/src/components/EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*` (surfaces d'édition hors périmètre).

### Tests — OBLIGATOIRE
- Tests unitaires : `NewEventDrawer.test.tsx` et/ou `EventEditForm.test.tsx` doivent
  couvrir le nouveau positionnement (présence du nœud sticky en `mode="create"`,
  **absence** en mode édition — c'est la preuve de non-régression des 3 surfaces
  partagées).
- ⚠ **Un test jsdom ne prouve RIEN sur un comportement de scroll ou de sticky**
  (`jsdom` ne calcule aucune mise en page ; `getComputedStyle` y rend des valeurs
  déclarées, pas rendues). Si ta livraison repose sur un effet de `position:sticky`
  réellement observable, **il faut un E2E Playwright** qui mesure la position du nœud
  après scroll du corps du drawer. Précédents à copier : `frontend/e2e/support/contrast.ts`,
  `sprint-62-control-focus-contrast.spec.ts`, `landing-cta-contrast.spec.ts`.
- Recette E2E locale : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`
  (4 pièges non devinables — CORS, base `eventmanager_e2e`, port `:3100`, workers).
  Elle tourne réellement en local. Si tu ne peux pas la lancer, dis-le, ne prétends pas.
- Tout nouveau `data-testid` ajouté dans un `.tsx` DOIT être cité dans une spec de
  `frontend/e2e/` (le check de couverture du sprint échouera sinon). ⚠ Ce check vérifie
  seulement que le testid est **cité** — pas que la spec passe. Ne t'en contente pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA, ...]
- resume: <objectif + BR touchées + fichiers clés + pièges rencontrés + tests>
- **fichiers de contexte lus:** <liste EXACTE des fichiers de contexte que tu as
  réellement ouverts (chemins), avec pour CHACUN un ancrage vérifiable — l'identifiant
  du dernier pitfall lu, un numéro de ligne, une citation courte>. Cette ligne est
  **obligatoire** et sera auditée : le Sprint 69 a livré sans pouvoir prouver que les
  archives pointées avaient été lues. Si tu n'as pas lu un fichier pointé, écris-le.
- tests: <commandes lancées + résultat chiffré ; « non lancé » si non lancé, jamais de
  supposition>
- ecarts_visuels_connus: <ce que tu SAIS ne pas être conforme au handoff §6 après ton
  changement — sert de checklist à l'issue #325, vague 2>
- [MEMORY:*] signaux: <pitfall / pattern / decision, si applicables>
- recommandations suite: <RECOMMAND_FOLLOWUP / RECOMMAND_UI_DESIGN / … OU négation
  explicite « Pas de RECOMMAND_X car … »>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
