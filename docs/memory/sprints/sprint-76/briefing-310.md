[BRIEFING ISSUE #310 — Sprint 76]

## Issue

**[FRONTEND] Garde anti-boucle sur le retry « garder mes modifications » (409)**
Labels : `enhancement`, `epic:events`, `priority:P3`, `size:XS`, `frontend`.

Quand deux modifications entrent en conflit sur un même événement, une modale 409 propose
« garder mes modifications » (`onKeepMine`), qui **re-soumet** la requête (#231). La revue de la
PR #306 a ajouté la désactivation des boutons pendant la soumission — ce qui évite les clics
multiples accidentels — mais **rien ne protège d'un serveur qui répondrait 409 en boucle** (forte
contention) : re-soumissions répétées sans limite.

Risque cantonné à l'utilisateur lui-même (ownership requis pour atteindre ce flux) : pas de risque
de sécurité inter-utilisateurs, mais mauvaise expérience et charge serveur inutile.

### Critères d'acceptation (énoncé d'origine)
- [ ] « garder mes modifications » ne peut pas se re-soumettre indéfiniment sur 409 répétés
- [ ] Un message explicite s'affiche après N échecs consécutifs
- [ ] Comportement vérifié par un test (unitaire ou E2E)

### BR impactées
Aucune (le flux est adossé à BR-EVE-015, mais la garde n'en change pas la sémantique).

## État réel du code — VÉRIFIÉ par le lead le 2026-09-05

⚠ **L'énoncé ne nomme AUCUN fichier** : il renvoie à « la modale de conflit 409 (#231) » et à la
PR #306. Sur ce dépôt, un énoncé qui désigne un composant se trompe régulièrement
([[PIT-S74-003]]) — voici donc ce que le lead a réellement lu, à toi de le confirmer et non de le
recopier.

La logique vit dans **`frontend/src/hooks/useEventEditConflict.ts`** (146 lignes), machine à états
PARTAGÉE extraite d'`EventContent` pour être réutilisée par `TimelineEditHost`. Extrait actuel :

```ts
  const [submitState, setSubmitState] = useState<EventSubmitState>('idle')
  const [conflict, setConflict] = useState<{ server: Event; local: EventEditFormValues } | null>(null)

  const onSubmit = useCallback(async (data) => {
    setSubmitState('submitting')
    try { … await updateEvent(eventId, data) … setConflict(null); setSubmitState('idle'); onDone?.() }
    catch (error) {
      const status = httpStatusOf(error)
      if (status === 409) {
        const server = conflictServerEventOf(error)
        setConflict(server ? { server, local: data } : null)
        setSubmitState('conflict')
      } else { setSubmitState('error') }
      …
    }
  }, [eventId, invalidateEvents, onDone, user?.id])

  const onKeepMine = useCallback(() => {
    if (conflict) {
      void onSubmit({ ...conflict.local, version: conflict.server.version ?? null })
    }
  }, [conflict, onSubmit])
```

**Aucun compteur de tentatives, aucun backoff, aucun plafond.** L'issue décrit donc un vrai manque.

**Ce que l'énoncé ne dit pas et qui change la conception :** `onKeepMine` **ré-aligne déjà la
version** sur celle du serveur issue du corps 409 (`version: conflict.server.version`). C'est
précisément l'anti-boucle du cas nominal : sans ce ré-alignement le backend redétecterait le même
décalage à chaque fois. La boucle résiduelle que tu dois borner est donc le cas de **contention
réelle** (un tiers écrit entre le 409 et ta re-soumission), pas un bug de version. Écris cette
distinction dans le done.md : elle détermine si le compteur doit se réinitialiser, et quand.

Consommateurs à connaître (ne les modifie que si nécessaire, et dis-le) :
- `frontend/src/components/EventContent.tsx` (~l.259) passe `conflict.onKeepMine` au form.
- `frontend/src/components/EventEditForm.tsx` (l.118 prop, l.205, l.948) — c'est là que vit
  l'`EventSubmitState` et la désactivation des boutons de la PR #306.
- `frontend/src/components/shared/ConflictDialog.tsx` — la modale elle-même.
- Tests existants qui doivent rester verts : `EventContent.test.tsx` (voir le commentaire l.129 —
  il documente DÉJÀ le risque de boucle), `EventEditForm.test.tsx` (l.193-226),
  `ConflictDialog.test.tsx` (l.152+), `ConflictDialog.intl.test.tsx`.

## Plan d'implémentation

Aucun mini-plan architect (issue XS). Approche attendue :

1. **Où poser la garde.** Le hook `useEventEditConflict` est le bon endroit : il est partagé par
   les deux points de montage (`EventContent` et `TimelineEditHost`), donc une garde posée dans un
   composant ne couvrirait qu'un seul chemin. Vérifie cette affirmation avant de t'y fier
   (`grep -rn "useEventEditConflict" frontend/src`).
2. **Compteur plutôt que backoff, sauf argument contraire.** Un backoff temporel est tentant, mais
   [[PIT-S54-001]] est explicite sur ce dépôt : *un backoff de retry qui dépasse le budget de
   timeout du test rend le retry ET son diagnostic inatteignables*. Si tu introduis un délai, il
   doit être injectable/mockable et le test ne doit PAS dépendre d'une horloge réelle. Un plafond
   de tentatives (`MAX_KEEP_MINE_ATTEMPTS`) est testable sans horloge — préfère-le, ou justifie.
3. **Sémantique de réinitialisation — à trancher explicitement, c'est le cœur de l'issue :**
   - le compteur repart-il à zéro sur un succès ? (oui, évidemment)
   - sur `onConflictDismiss` / `onTakeServer` / `onReload` ? (l'utilisateur a abandonné le flux)
   - sur `reset()` ? sur un changement d'`eventId` ?
   - sur une soumission *initiale* (`onSubmit` appelé par le form) par opposition à une
     re-soumission issue de `onKeepMine` ? **Attention : `onKeepMine` appelle `onSubmit`.** Si tu
     incrémentes dans `onSubmit`, tu comptes aussi les soumissions normales. Si tu incrémentes
     dans `onKeepMine`, tu comptes les *clics* et non les *409*. Les deux sont défendables, mais
     ils ne bornent pas la même chose — dis lequel tu as choisi et pourquoi.
4. **Message utilisateur après N échecs.** Critère d'acceptation explicite. Il doit être
   **traduit** (next-intl, 4 locales `fr`/`en`/`es`/`de` — la clé doit exister dans les 4, sinon
   la parité i18n casse). Repère où vivent les libellés du `ConflictDialog` et suis la même
   convention. N'invente pas un chemin de messages : ouvre un fichier existant et copie le motif.
5. **État terminal.** Quand le plafond est atteint, que devient `submitState` ? Le bouton doit
   cesser d'être actionnable — vérifie que la désactivation de la PR #306 couvre bien cet état, ou
   étends-la. Un message affiché sous un bouton toujours cliquable ne satisfait pas le critère 1.

## Tests attendus

Unitaire Vitest (l'énoncé autorise unitaire OU E2E ; **c'est unitaire ici** — la stack E2E est
réservée à un autre agent de la vague, voir la section « partage de la stack » plus bas).

Ce que le test doit **prouver** :
- N 409 consécutifs ⇒ exactement N (ou N+1, selon ta sémantique) appels à `updateEvent`, **pas
  plus** — et le message d'échec est rendu.
- Un succès intercalé **remet le compteur à zéro** (sinon la garde punit un utilisateur légitime).
- **Contrôle négatif obligatoire** : retire la garde ⇒ le test doit ROUGIR. Sur ce dépôt une suite
  entièrement verte a déjà coexisté avec cinq specs jamais exécutées ; un test qui passe avant ET
  après le correctif ne prouve rien ([[PIT-S54-002]], [[PIT-S56-001]]).

Pièges de test propres à ce fichier :
- `useEventEditConflict` utilise `useAuth` et `useQueryClient`. **Mocke le HOOK, n'enveloppe pas
  d'un provider** — [[PIT-S69-001]] documente que l'inverse casse toute la suite du composant.
- Mock de module PARTAGÉ + `mockReset()` fait passer un rejet traité pour un échec
  ([[PIT-S61-001]]).

## Triage
Taille : XS · Modèle : opus · Effort : high (la conception de la sémantique de reset porte le
risque, pas le volume de code) · Domaine : events (frontend)

## ⚠ GARDE-FOU WORKTREE — À LIRE AVANT TOUT AUTRE CHOSE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal :

    /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59

- **Tous** tes `Read`, `Edit`, `Write`, `Glob`, `Grep` doivent viser des chemins **ABSOLUS** sous ce
  répertoire. Un chemin relatif, et même un `cd` en commande composée, résout sur le dépôt PRINCIPAL
  `/Users/herrh/VSProjects/MyTimeline/` — tes écritures partent alors ailleurs et tes lectures voient
  un autre code ([[PIT-S24-002]], [[PIT-S27-003]], [[PIT-S19-001]]).
- Premier réflexe : `cd "/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59" && git rev-parse --abbrev-ref HEAD` → doit rendre `sprint/76`.
  Si ce n'est pas le cas : **ARRÊTE** et remonte-le dans ton retour.

## ⚠ WORKING TREE PARTAGÉ — 4 AGENTS ÉCRIVENT EN MÊME TEMPS

Trois autres agents travaillent **dans ce même répertoire de travail au même instant**. Conséquences
non négociables :

1. **JAMAIS `git add -A`, `git add .`, `git commit -a`** — tu commiterais le travail en cours des
   autres ([[PIT-S12-003]]).
2. **`git commit` SANS pathspec commite tout l'index**, y compris ce que les autres y ont mis. Le
   seul motif sûr est :
   `git add <tes fichiers exacts> && git commit -m "…" -- <tes fichiers exacts>`
   ([[PIT-S57-001]], [[PIT-S71-010]]).
3. **JAMAIS `git commit --amend`, `git stash`, `git checkout -- .`, `git reset`** — tu réécrirais ou
   détruirais le commit d'un autre ([[PIT-S55-002]]).
4. Un `git status` « sale » de fichiers que tu n'as pas touchés est **NORMAL** : ce sont les autres.
   Ne les nettoie pas, ne les commite pas, n'en tire aucune conclusion sur ton propre travail.
5. Un test rouge dans un fichier hors de ton périmètre peut appartenir au diff d'un autre agent
   ([[PIT-S54-004]], [[PIT-S72-006]]). Avant d'accuser ton code : vérifie que le fichier rouge est
   bien dans TON périmètre, sinon dis-le et n'y touche pas.

## ⚠ RTK MENT SUR LES SORTIES — vérifier le code de sortie, jamais le texte

Un hook réécrit tes commandes shell en `rtk <cmd>`. RTK **ne tronque pas seulement l'affichage : il
falsifie des sorties qui servent de données** ([[PIT-S71-002]], [[PIT-S45-003]]). Cas mesurés sur ce
dépôt : un `prettier --check` ROUGE affiché « All files formatted correctly » ([[PIT-S74-008]]), un
`next build` en échec rendu vert ([[PIT-S75-002]]), un `git diff` rendu vide ([[PIT-S20-003]]).

Règles :
- Pour toute commande dont tu **lis la sortie comme une donnée** (diff, build, tests, `--list`) :
  préfixe par `rtk proxy` → `rtk proxy git diff …`, `rtk proxy npm run build`.
- Ne conclus JAMAIS « vert » sur du texte : lis `echo "EXIT=$?"` juste après la commande.

## Commandes de test

    cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59
    ./scripts/test-quiet.sh backend      # suite Spring Boot (Testcontainers, Docker requis)
    ./scripts/test-quiet.sh frontend     # Vitest UNIQUEMENT (pas Playwright — [[PIT-S60-009]])
    ./scripts/test-quiet.sh e2e          # Playwright

⚠ `warn-test-delegation.sh` peut tuer la commande ENTIÈRE, y compris un heredoc qui l'enveloppe, et
l'échec se déguise en lancement réussi ([[PIT-S74-007]], [[PIT-S63-007]]). Si une commande de test
semble n'avoir rien produit, c'est la première hypothèse.

<!-- ===== cp-frontend ===== -->
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

<!-- ===== pit-frontend (extrait ciblé) ===== -->
## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)

## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)

## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)

## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.

## PIT-S55-002 — `git commit --amend` en fan-out réécrit le commit d'un AUTRE agent
Sprint 55 : un agent a amendé pour remplacer un SHA placeholder dans son propre rapport. Entre son commit et
son amend, un autre agent avait poussé HEAD — **l'amend a réécrit le commit de l'autre**, qui porte désormais
4 lignes du rapport du premier. Rien perdu (`git log --stat`), historique faux. `--amend` réécrit le HEAD
*courant*, qui en fan-out n'est pas forcément le sien : aussi destructeur que `reset`. **Cause racine** :
demander à l'agent d'écrire son propre SHA dans son rapport crée mécaniquement le besoin d'amender.
Solution : ne pas le demander, ou accepter un 2ᵉ commit. Ajouter `--amend` à la liste des verbes git
interdits des briefings, aux côtés de `reset`/`rebase`/`checkout`/`stash`/`clean`.
Cf. [[sprint-parallel-commits-shared-worktree]].

## PIT-S71-010 — Indexer ses seuls hunks dans un working tree partagé : plumbing git, jamais le working tree
`UserControllerTest.java` était édité en parallèle par #134 et #148. `git add -p` est indisponible (mode non interactif) et le diff redirigé est corrompu ([[PIT-S71-002]]). Recette : `git cat-file -p HEAD:<path>` → reconstruction du contenu voulu → `git hash-object -w` → `git update-index --cacheinfo` : l'index reçoit la version voulue et **le working tree n'est jamais touché**, donc le WIP du voisin reste intact. Complément de [[sprint-parallel-commits-shared-worktree]]. (Sprint 71 #134)

## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)

## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)

## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)

## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)

## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)

## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.

## PIT-S60-009 — `test-quiet.sh frontend` ne lance QUE Vitest, contrairement à ce que disent le README et les briefings
`run_frontend` exécute un seul `npm test --silent` : ni `build`, ni `typecheck`, ni `lint`. La description
« vitest + build + typecheck + lint » circulait dans les briefings de sprint et le README. **Anti-pattern :
conclure « frontend vert » sur ce seul scope.** Corrigé au S60 (README §Tests + piège 4). Voisin de
[[PIT-S58-004]] : une garantie décrite mais inexistante dissuade d'en écrire une vraie.

## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)

## PIT-S72-006 — Un run de tests dans un working tree partagé n'est valable que si `git status` est stable de bout en bout
La suite frontend est sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 éditait `authService.ts` dans le même arbre ; verte au re-run isolé. Prévention : en fan-out, re-jouer avant d'imputer un échec à son propre diff. Corollaire direct de l'étiquette « pré-existant » et complément de [[PIT-S71-010]]. (Sprint 72 #72)

## PIT-S74-007 — `warn-test-delegation.sh` bloque aussi le heredoc qui CONTIENT la commande, et l'échec se déguise en lancement réussi
Le hook scanne le texte de l'appel `Bash` : écrire un script avec un heredoc contenant `npx playwright test` est bloqué comme si on la lançait. Conséquence vécue au S74 : le heredoc bloqué n'a pas créé le `.sh`, l'appel suivant a lancé `nohup` dessus et a rendu un `pid=` rassurant — **10 minutes d'attente sur un run qui n'existait pas**. Prévention : préfixer de `SKIP_DELEGATION=1` **l'appel qui écrit le script**, pas seulement celui qui l'exécute, et vérifier `ls -l` du script avant tout `nohup`. (Sprint 74)

## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)

## PIT-S73-008 — Deux subagents en fan-out qui partagent la stack E2E se corrompent mutuellement
Deux absorptions lancées en parallèle dans le même worktree ont chacune démarré `next dev` + Playwright : `.next` corrompu en cours de run (`Cannot find module './vendor-chunks/…'`, 500 sur `/fr/dashboard`) → tests rouges dont le diagnostic accuse FAUSSEMENT le code de la page ; puis 3 runs perdus sur le verrou `e2e/.auth/run.lock`. Prévention : sérialiser les agents qui ont besoin de la stack E2E, ou ne paralléliser que ceux qui n'en ont pas besoin. (Sprint 73)

## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)

## PIT-S70-002 — « Pré-existant, non lié au sprint » : l'étiquette d'un audit se réfute avec la CI de la base
Au S70, le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts faux, tous deux étiquetés « pré-existant ». (1) « `npm run build` FAIL, page `/terms` manquante » — la page existe, et surtout **la CI de `dev` était verte sur `fd954b2`, la base exacte du sprint**, alors que la CI lance le build. (2) « E2E 4 failed / 247 skipped, serveur `next dev` défaillant » — l'agent avait lancé un build **contre un `next dev` en cours**, piège nommé dans le runbook E2E S47, provoquant le 500 `InvariantError: clientReferenceManifest` qui tue `auth.setup.ts` ; il a donc créé la panne puis l'a imputée au code. Prévention, deux réflexes gratuits : **comparer tout échec dit « pré-existant » à la CI du SHA de base** (`gh run list --branch dev`), et **distinguer « rouge » de « non mesuré »** — une suite dont le `setup` échoue et qui passe 247 specs en `skipped` n'a rien mesuré, ne jamais l'écrire comme un résultat.

## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)

## PIT-S74-003 — Un énoncé d'issue peut nommer le mauvais composant, et la recon du lead peut relayer l'erreur
« Le tablist des réglages » de #417 ne passe PAS par `.mt-tab` du DS : `SettingsShell.tsx` utilise des utilitaires Tailwind bruts, `.mt-tab` sert aux onglets **produits**. Appliquer le CSS nommé par l'issue aurait corrigé un composant voisin en laissant le vrai défaut. Le briefing du lead relayait l'erreur — une recon de lead ne l'immunise pas, elle déplace l'erreur d'un cran. Au S74, **3 énoncés sur 4** portaient une piste technique fausse ou périmée (chemin vidé par un sprint antérieur, lignes inexistantes, pattern non transposable). Prévention : `grep` du sélecteur **dans le `.tsx`** avant d'éditer le CSS nommé, et dire explicitement au subagent que le briefing peut se tromper. (Sprint 74 #417 / #342 / #343)

## PIT-S75-003 — Un énoncé qui se déclare « non-impactant au runtime » est une hypothèse à réfuter, pas un fait
#279 affirmait noir sur blanc « Non-impactant au runtime actuel […] indépendant de `getRequestConfig` ». Faux : `next.config.mjs` fait `createNextIntlPlugin('./i18n.ts')`, ce qui en fait le request-config ACTIF, et les pages légales y résolvent leurs messages via `getTranslations`. La conséquence n'est pas académique — elle change la preuve exigible : un `vitest` vert ne prouvait rien, seul un `next build` le pouvait. Troisième sprint consécutif où l'énoncé se trompe ([[PIT-S74-003]], [[DEC-S72-004]]). Prévention : traiter toute clause d'innocuité d'une issue comme une affirmation à vérifier — ici, deux `grep` (le plugin, les appelants) suffisaient. (Sprint 75 #279)

## PIT-S72-002 — « `tsc --noEmit` : 0 erreur » dans un rapport d'agent peut être faux — vitest ne typecheck pas
L'agent de #72 a rapporté un typecheck propre ; `i18n-intl-classes.test.ts:65` levait pourtant TS2322 à HEAD. La suite vitest était verte parce qu'elle **ne typecheck pas** : seul le job frontend en CI l'aurait attrapé. L'écart a été trouvé par l'agent de l'autre issue, puis vérifié par le lead. Prévention : rejouer soi-même `tsc --noEmit` avant de reprendre un chiffre de typage dans un audit ; deux rapports d'agent qui se contredisent se tranchent par la mesure, jamais par l'ancienneté du rapport. Voir [[PIT-S71-...]] sur l'étiquette « pré-existant ». (Sprint 72)

## PIT-S54-001 — Un backoff de retry qui dépasse le budget de timeout du test rend le retry ET son diagnostic inatteignables
Le retry 429 de `auth.setup.ts` était **mort depuis le S47** : le budget Playwright par défaut (30 s) est
inférieur au coût d'UN cycle (8 s d'attente `login-form` + 20 s de backoff bucket4j = 28 s), donc la 2ᵉ
soumission expirait **toujours** — mesuré 4/4 `provision` en `Test timeout of 30000ms exceeded`, sans une
ligne de diagnostic. Le message d'échec censé distinguer les causes n'était jamais atteint. Corrigé par
`PROVISION_TIMEOUT_MS` (150 s puis 180 s après recalcul du pire cas ~127 s en review — le premier calcul
oubliait les deux `ensureRegisterForm(recover)`, qui sont des boucles de retry complètes). Solution : tout
`waitForTimeout` de backoff impose un `test.setTimeout()` explicite couvrant `(tentatives × attente) +
(backoffs) + navigations + marge`, écrit en commentaire à côté de la constante.

## PIT-S61-001 — Vitest : un mock de module PARTAGÉ + `mockReset()` fait passer un rejet traité pour un échec
Un mock de module partagé rendant une promesse rejetée, combiné à `mockReset()`/`mockClear()` en `beforeEach`,
fait rapporter la valeur de rejet comme un échec de test (`Serialized Error`, message `undefined`) **alors que le
rejet EST traité**. Établi par bisection (#307) : passe sans `beforeEach`, échoue avec `mockReset`, `mockClear`
ou une promesse pré-`catch`ée. Remède : recréer un `vi.fn()` par test. Variante de [[PIT-S11-002]].

## PIT-S69-001 — Ajouter un `useQuery` dans un composant testé sans `QueryClientProvider` casse TOUS ses tests : mocker le HOOK, pas envelopper d'un provider
Au S69 (#67), brancher `useRecurrencePreview` (TanStack `useQuery`) dans `EventEditForm` a fait échouer l'intégralité d'`EventEditForm.test.tsx` — le fichier ne monte aucun `QueryClientProvider`. Réflexe coûteux et mauvais : envelopper chaque `render` d'un provider (bruit dans ~45 tests, et on se met à tester TanStack plutôt que le composant). Solution retenue : `vi.mock('@/hooks/useRecurrencePreview')` et piloter le retour test par test — le composant est testé sur ce qu'il FAIT du `data`, pas sur la mécanique de query. **Second piège, dans la foulée** : `vi.clearAllMocks()` (souvent en `beforeEach` global) efface les appels ET les implémentations mais PAS de manière fiable les `mockReturnValue` posés au niveau module — il faut REPOSER le retour par défaut dans un `beforeEach` dédié, sinon un test hérite du `mockReturnValue` du précédent et devient vert/rouge selon l'ordre d'exécution.

## PIT-S56-001 — Un test unitaire hors shell couvre une branche structurellement inatteignable
S56 #391 : `timeline/page.tsx` portait un `if (loading) return <div data-testid="timeline-loading">`. Le test
RTL rendait la page **en isolation**, hors du shell qui intercepte déjà le chargement de session — la branche
était donc verte en test et **inatteignable en production**. Elle a survécu **3 sprints** sous cette couverture.
Prévention : pour toute branche de garde (auth/loading), vérifier que l'ancêtre qui monte le composant ne
l'intercepte pas déjà. **Un test RTL de branche de garde sur une page sous shell est suspect par défaut.**
Correctif : supprimer test et branche **ensemble**, et poser le contrat au niveau où l'état est atteignable.

## PIT-S56-002 — Un stub d'API navigateur qui mute l'état sans émettre son événement inverse le verdict
S56 #395 : le stub E2E de `requestFullscreen`/`exitFullscreen` mutait `document.fullscreenElement` **sans
dispatcher `fullscreenchange`**. Effet : il fait **rougir une implémentation correcte** (celle qui dérive son
état de l'événement) et **passer une fausse** (celle qui bascule un `useState` dans le handler). Le verdict du
test est donc exactement inversé. Prévention : tout stub d'une API à événement doit dispatcher l'événement ;
et l'oracle d'une issue « exposer un état observable » doit inclure un cas qui **contourne le déclencheur UI**
(ici `page.evaluate(() => document.exitFullscreen())`). Cf. [[PAT-S56-001]].

## PIT-S54-002 — Un `grep` de testid n'atteste NI un usage réel NI un rendu
Deux faux positifs distincts, même racine, au S54. (1) **Faux OK de couverture** : le check COVERAGE-E2E du
protocole A.4 (`grep -rq "$val" frontend/e2e/`) a rendu OK sur `product-option-<id>` alors que la seule
occurrence était un **commentaire** (`timeline.spec.ts:41`) — le testid livré par #331 n'était consommé par
aucune spec. (2) **Faux « existe » de rendu** : trois specs de #330 échouaient sur un locator jamais résolu
(`timeline-zoom-in`, `timeline-fullscreen`, `timeline-loading`) — le grep prouvait qu'ils étaient *écrits*,
pas *montés* (rendu conditionnel au viewport, ou code mort masqué par un composant parent ajouté plus tard :
`AppShell` #210 court-circuite la branche loading de `timeline/page.tsx:47`). Solution : prouver un usage par
`grep -E "getByTestId|locator\("` (jamais la simple présence de la chaîne), et prouver un rendu au **runtime**
(`toHaveCount(1)` dans le contexte visé), pas au grep. Cf. [[jsdom-scroll-tests-prove-nothing]].

## PIT-S63-006 — Un mock i18n en `${ns}.${key}` rend un namespace FAUX indiscernable d'un juste
`useTranslations('deleteDialog')` (namespace inexistant) et `('common.deleteDialog')` (juste) produisent **le même** résultat de test. Le défaut a survécu plusieurs sprints sous **3 fichiers de tests verts**, et les E2E ne ciblaient que des `data-testid`, jamais du texte. Prévention : tout composant à `useTranslations` doit avoir au moins une assertion sur un **libellé traduit**, via `NextIntlClientProvider` alimenté par les VRAIS messages + collecteur `onError`. (Sprint 63 #441)

## PIT-S63-009 — Un `test.fail()` laissé comme marqueur de dette fige le périmètre de l'issue suivante
Le S62 avait figé le popover invisible en 2 `test.fail()` sur **un seul widget**. L'issue #446 a donc décrit un défaut de `ui/select` — alors que la cause est un **palier `z` partagé** : `PopoverPicker`, monté dans le même drawer, était cassé à l'identique (46-66 % de panneau mesurés) et absent du périmètre. Corriger le seul `Select` aurait laissé le champ voisin invisible **dans le formulaire qu'on prétendait réparer**. Grepper les **frères du composant** avant d'accepter le périmètre d'une issue de superposition. (Sprint 63 #446)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

Aucune. Vague 1 avec #237 (`contexts/NetworkStatusContext.tsx`), #175 (backend Java) et #527
(pages légales + E2E). **Fichiers disjoints des trois.**

## ⚠ PARTAGE DE LA STACK DE TEST — contrainte de vague

- **L'agent #527 détient l'exclusivité de Playwright et de tout serveur Next** ([[PIT-S73-008]],
  [[PIT-S62-009]]).
- **Toi : Vitest uniquement.** Ne lance NI Playwright, NI le script E2E de `package.json`, NI
  `npm run dev`, NI `next build`. `tsc --noEmit` + `./scripts/test-quiet.sh frontend` suffisent.
- Le `next build` global est joué par le lead en fin de vague ([[PIT-S22-001]]).
- Si tu juges qu'un E2E est **indispensable** pour prouver la garde : ne le lance pas, **écris la
  spec** et signale-le en `RECOMMAND_TEST_RUNNER` dans ton retour. Le lead arbitrera.

Si `node_modules` manque dans le worktree, lis [[PIT-S69-002]] avant d'improviser.

## Designer

Non applicable en pré-implémentation : tu ajoutes un message dans une modale existante, tu ne crées
pas de surface. **Mais** si tu introduis un état visuel nouveau (bandeau d'erreur, bouton
définitivement désactivé), réutilise les jetons et composants déjà présents dans `ConflictDialog` —
ne pose aucune couleur littérale. Ce dépôt a été mordu deux fois par des contrastes déduits plutôt
que mesurés (S48 : 1.00:1 ; BUG-S70-001 : 2,49:1) ; si tu poses une couleur, dis-le explicitement
dans le done.md pour que le lead décide s'il faut une mesure.

## Contraintes

- Branche cible : `sprint/76` — **déjà checkout**.
- **1 commit logique**, gitmoji français (ex. `:lock: feat(events): …` ou `:sparkles: feat(events): …`).
- Commit strictement ciblé : `git add <chemins exacts> && git commit -m "…" -- <chemins exacts>`.
- Ne touche à **aucun** de ces fichiers (périmètre des autres agents) :
  `frontend/src/contexts/NetworkStatusContext.tsx`, `frontend/app/[locale]/privacy/**`,
  `frontend/app/[locale]/terms/**`, `frontend/e2e/**`, `frontend/src/lib/legal-pages.ts`,
  `backend/**`, `docs/memory/sprint-history.md`.
- Toute clé i18n ajoutée doit l'être dans les **4 locales** (`fr`, `en`, `es`, `de`) — une parité
  cassée fait rougir la CI.
- Code en anglais, commentaires et docs en français.

## Livrable attendu

Écris `docs/memory/sprints/sprint-76/issue-310-done.md` (chemin ABSOLU sous le worktree), puis
rends un retour de **500 tokens maximum**, télégraphique :

```
RETOUR :
- commits: [SHA]
- resume: <où la garde est posée + sémantique de reset choisie et pourquoi + plafond vs backoff + clés i18n + tests + contrôle négatif joué>
- [MEMORY:pitfall|pattern|decision] <si applicable>
- recommandations suite: <RECOMMAND_* ou « pas de RECOMMAND_X car … » sur UNE SEULE LIGNE>
- STATUS: COMPLETED
```

`STATUS: COMPLETED` (ou `PARTIAL` + `BLOQUE_SUR`) en **dernière ligne** du done.md. Section
« Recommandations suite » obligatoire, négation sur une seule ligne ([[PIT-S70-005]]).
