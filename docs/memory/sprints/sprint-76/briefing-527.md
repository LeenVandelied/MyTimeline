[BRIEFING ISSUE #527 — Sprint 76]

## Issue

**[CHORE] Pages légales : mesurer les contrastes des éléments ajoutés et le débordement du sommaire en `de`**
Labels : `chore`, `priority:P2`, `size:S`, `frontend`. Follow-up du Sprint 75 (#60).
Sources : `docs/memory/sprints/sprint-75/issue-60-done.md`,
`docs/memory/audits/sprint-75-test-coverage.md` (section « Ce qui n'est PAS couvert »).

Le Sprint 75 a ajouté à `/privacy` et `/terms` un **sommaire en chiffres romains** et un
**disclaimer** « la version française fait foi ». Livrés avec une couverture E2E fonctionnelle
(33/33 verts, saut d'ancre mesuré) mais **aucune vérification visuelle** : ni contraste, ni
responsive.

### Deux points à MESURER au navigateur, en thème clair **et** sombre
1. **Contrastes des éléments ajoutés** — chiffres romains du sommaire et bloc disclaimer.
   Seuils : WCAG 1.4.3 (**4,5:1** texte) et 1.4.11 (**3:1** non-textuel).
2. **Débordement du sommaire en `de`** — l'allemand produit des titres longs ; le sommaire n'a
   jamais été rendu sur une largeur mobile dans cette locale.

Étendre la spec E2E au-delà de chromium **si l'arbitrage le justifie** (le S75 n'a joué que chromium).

### Critères d'acceptation
- [ ] Contrastes **mesurés (valeurs chiffrées reportées)** pour les chiffres romains et le
      disclaimer, en clair et en sombre, sur `/privacy` et `/terms`
- [ ] Sommaire rendu **sans débordement en `de`** sur une largeur mobile (375 px)
- [ ] Tout écart aux seuils WCAG corrigé, avec **preuve de mutation** (réintroduire l'ancienne
      valeur doit faire ROUGIR le test)

### BR impactées
Aucune.

## ⚠ Pourquoi ce n'est PAS de la précaution générique

Ce dépôt s'est fait mordre **deux fois** par exactement ce trou :
- **S48** : deux CTA invisibles (contraste mesuré **1.00:1**) trouvés APRÈS une CI verte.
- **S70 / BUG-S70-001** : la mini-frise de l'aperçu, livrée au S46, n'avait jamais été inspectée au
  rendu. Sa conformité était *déduite* de l'usage des jetons du DS. Mesure réelle : **2,49:1** en
  thème sombre, sous le seuil de 3:1.

Le S75 est dans la même position : la conformité des éléments ajoutés est **déduite** du fait qu'ils
réutilisent des jetons validés ailleurs. C'est un raisonnement, pas une mesure. **Un écart transmis
par un agent qui n'a pas ouvert de navigateur est une hypothèse, pas un constat** ([[PIT-S70-006]]).
Ton livrable central, ce sont des **nombres**.

## État réel du code — VÉRIFIÉ par le lead le 2026-09-05

⚠ **Chemins** : l'App Router de ce projet vit sous **`frontend/app/`**, PAS `frontend/src/app/`.
Les composants, eux, sont sous `frontend/src/components/`.

- Pages : `frontend/app/[locale]/privacy/page.tsx`, `frontend/app/[locale]/terms/page.tsx`
- Sommaire : `frontend/src/components/legal/legal-table-of-contents.tsx`
- Disclaimer : `frontend/src/components/legal/legal-disclaimer.tsx`
- Données/utilitaires : `frontend/src/lib/legal-pages.ts` (`PRIVACY_SECTIONS`, `TERMS_SECTIONS`,
  `toRomanNumeral`, `shouldShowLegalDisclaimer`)
- Traductions : `frontend/public/locales/<locale>/legal.json` (4 locales `fr`/`en`/`es`/`de`)
- Spec E2E existante : `frontend/e2e/sprint-75-legal-pages.spec.ts`

**Les deux cibles exactes de la mesure.**

Chiffre romain (`legal-table-of-contents.tsx`) — dans un `<li className="flex gap-3">` :
```tsx
  <span aria-hidden="true" className="text-ink-muted tabular-nums shrink-0 w-10">
    {toRomanNumeral(index + 1)}.
  </span>
  <a href={`#${section.id}`} data-testid={`${testId}-link-${section.id}`}
     className="text-ink-muted hover:text-ink underline-offset-4 hover:underline
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
```
Le `<nav>` porte `bg-surface rounded-xl p-6 shadow-lg border border-rule mb-8`,
`data-testid={testId}` (`privacy-toc` / `terms-toc`), liens en `${testId}-link-${section.id}`.

Disclaimer (`legal-disclaimer.tsx`) :
```tsx
  <p role="note" data-testid="legal-disclaimer"
     className="bg-surface border border-rule rounded-xl px-4 py-3 mb-8 text-sm text-ink-muted">
```

**Trois pièges spécifiques à ces deux cibles, à ne pas manquer :**

1. **Le chiffre romain est `aria-hidden`.** Cela ne l'exempte PAS de WCAG 1.4.3 : le critère porte
   sur la *présentation visuelle* du texte, pas sur son exposition aux technologies d'assistance.
   Il est visible, donc il est soumis à 4,5:1 (il est en `text-sm`-équivalent, pas en « grand
   texte »). Vérifie sa taille rendue réelle avant de choisir le seuil — `requiredRatio()` du
   helper le fait pour toi.
2. **`text-ink-muted` sur `bg-surface` est exactement le motif que BUG-S70-001 a réfuté.** Le fait
   que cette paire soit utilisée ailleurs ne prouve rien ici : le fond effectif dépend de la pile
   d'ancêtres réellement peints, pas du `background-color` d'un ancêtre quelconque
   ([[PIT-S58-001]]). Mesure le fond peint, ne le déduis pas de la classe.
3. **`shrink-0 w-10` sur le chiffre + `flex gap-3` sur le `<li>` :** le lien est **enfant direct
   d'un flex**. [[PIT-S73-001]] est littéralement ce cas : `break-words` seul ne corrige PAS un
   débordement dans cette configuration. C'est très probablement la forme que prendra le défaut en
   `de` — et sa correction n'est pas celle qu'on écrit d'instinct.

## Outillage EXISTANT — à réutiliser, ne réinvente rien

Ce dépôt a déjà une machinerie de mesure mûre. **Ouvre-la avant d'écrire une ligne :**

- `frontend/e2e/support/contrast.ts` — `WCAG_AA_NORMAL` (4.5), `WCAG_AA_LARGE` (3),
  `WCAG_AA_NON_TEXT` (3), `requiredRatio(rendering)`, `describeRendering(label, r)`,
  `expectNotTruncated(label, r)`.
- `frontend/e2e/support/pixel.ts` — `relativeLuminance()`, `contrastRatio(a, b)`, `formatProfile()`,
  `WCAG_NON_TEXT`. Mesure au **pixel**, pas au CSS calculé.
- `frontend/e2e/support/dev-tooling.ts` — `DEV_TOOLING`, `devToolingSelectors()`. L'outillage de dev
  de Next se superpose au rendu : il fausse les mesures **et bloque les clics**
  ([[PIT-S59-002]], [[PIT-S63-003]]).
- Specs modèles à imiter : `landing-cta-contrast.spec.ts`, `sprint-62-control-focus-contrast.spec.ts`,
  et surtout **`sprint-63-de-overflow-audit.spec.ts`** (audit de débordement en `de` — c'est
  exactement ton point 2, avec le balayage `rect.right > clientWidth` déjà écrit et ses exclusions).

**N'annonce jamais un seuil de contraste sans citer les constantes du dépôt** ([[PIT-S61-004]]).

## Plan d'implémentation

Aucun mini-plan architect. Ordre attendu :

1. **Mesurer d'abord, corriger ensuite.** Écris la spec de mesure, joue-la, **reporte les chiffres**.
   Ne corrige rien tant que tu n'as pas un nombre sous un seuil. Un « correctif » posé avant la
   mesure rend la preuve de mutation impossible à construire.
2. **Matrice de mesure** : {`/privacy`, `/terms`} × {clair, sombre} × {chiffre romain, disclaimer}.
   Le disclaimer ne s'affiche **que hors `fr`** (`shouldShowLegalDisclaimer`) — choisis une locale
   non-`fr` pour le mesurer, et dis laquelle.
   Comment bascule-t-on le thème sur ce projet ? **Trouve le mécanisme réel** (classe sur `<html>`,
   `data-theme`, `prefers-color-scheme`) et cite ce que tu as lu. Ne suppose pas.
3. **Débordement `de` à 375 px** : sommaire de `/privacy` **et** `/terms`. Reprends le balayage de
   `sprint-63-de-overflow-audit.spec.ts` — et ses exclusions : exclure les défileurs, **mais surtout
   PAS `<body>`** ([[PIT-S63-012]]), et se méfier des faux débordements fabriqués par des jetons
   insécables ([[PIT-S63-013]]).
4. **Correctifs éventuels.** Si un écart sort :
   - contraste : change le **jeton**, jamais une couleur littérale. Et n'utilise que des jetons de
     PALETTE pour un calcul d'encre, jamais les alias sémantiques ([[PIT-S73-002]]).
   - débordement : relis [[PIT-S73-001]] avant d'ajouter `break-words`, et [[PIT-S63-005]] avant de
     toucher à un palier `max-[Npx]`.
   - **preuve de mutation obligatoire** : réintroduis l'ancienne valeur → le test doit ROUGIR.
     Rapporte que tu l'as joué. C'est le critère d'acceptation n°3, pas une option.
5. **Extension multi-navigateurs** : l'énoncé dit « si l'arbitrage le justifie ». **Arbitre
   explicitement et écris ta décision.** Deux runs E2E complets rapprochés ne PEUVENT pas passer sur
   ce poste ([[PIT-S62-011]]) — multiplier les navigateurs multiplie ce risque. Un « non, et voici
   pourquoi » documenté est une réponse acceptable ; un silence ne l'est pas.
6. Si **aucun** écart ne sort : c'est un résultat, pas un échec. Le livrable reste la spec de mesure
   permanente + les chiffres. Mais alors la preuve de mutation doit porter sur la spec elle-même
   (durcis un seuil → elle doit rougir), sinon tu ne sais pas si elle mesure quoi que ce soit
   ([[PIT-S61-005]] : le check de coverage est vert quand les specs sont seulement CITÉES).

## Triage
Taille : S · Modèle : opus · Effort : xhigh · Domaine : frontend / a11y

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

<!-- ===== pit-frontend (extrait ciblé : contraste, mesure, débordement, E2E) ===== -->
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

## PIT-S58-001 — Le fond sous un `outline` n'est PAS le `background-color` d'un ancêtre
`outline-offset: 2px` peint le trait **sur le parent**, et ce qui s'y trouve réellement peut être un
dégradé, un `color-mix`, un pseudo-élément ou un empilement de surfaces. Remonter le DOM pour trouver le
premier ancêtre non transparent produit donc de **faux ratios** : S58 a mesuré **1,00:1** sur un CTA accent
avant que la lecture de pixel ne donne **5,93:1**. Corollaire symétrique, même sprint : une sonde
« pixel le plus écarté du fond » attrape la **bordure du popover** (1 px au-delà du trait) et annonce
**16,3:1 au lieu de 6,08:1**. Les offsets d'échantillonnage se fixent par **dump brut**, jamais par
heuristique de contraste maximal. Règle : tout ratio annoncé doit dire **comment** il a été obtenu —
`getComputedStyle` ne tranche que la couleur *déclarée*, jamais la couleur *peinte*.

## PIT-S58-002 — Mesurer un contraste au mauvais instant ou dans le mauvais état
Deux façons d'obtenir une valeur fausse sans que rien ne le signale.
(1) **Instant** : Tailwind v4 fait entrer `outline-color` (et les couleurs de bordure) dans
`transition-colors`. Une sonde lancée moins de **~400 ms** après le changement d'état lit une couleur
**interpolée**. Attendre ≥450 ms, et exiger que le pixel ET `getComputedStyle` concordent.
(2) **État** : S58 a lu 1,59:1 sur un bouton qui était `disabled` (`opacity:.4`), et un autre dont l'état
par défaut `aria-pressed=true` écrase la bordure par `accent`. **Asserter l'état avant de mesurer**
(`:focus-visible === true`, non `disabled`, `aria-pressed` connu) fait partie de la mesure.

## PIT-S61-003 — `filter:grayscale()` ne préserve PAS le ratio de contraste WCAG
Contredit le commentaire posé par #230. `contrastInk` ne choisit que du noir ou du blanc, or **ce sont des points
fixes de `grayscale()`** : l'encre ne bouge pas, seul le fond bouge — et il s'**assombrit** (le filtre pondère les
canaux gamma-encodés, la luminance WCAG linéarise d'abord ; par convexité le gris obtenu a une luminance
inférieure). Encre claire → contraste augmente ; **encre foncée → il diminue**. Mesuré : 8,6 % des couleurs
passant AA échouaient après grisage. Toute décision d'a11y doit porter sur le **couple rendu** (fond + encre),
jamais sur la couleur source : exposer un `renderedColor(state)` unique consommé par l'encre ET par le verdict.

## PIT-S61-004 — Ne jamais annoncer un seuil de contraste sans les constantes du dépôt
`INK_DARK` vaut **`#0B0C0E`** (L = 0.00366), pas `#000000` : le point d'égalisation noir/blanc descend de 4.583 à
4.424. Le lead ET le reviewer ont cité `#0070F8` comme cas cassant — calculé avec du noir pur. Recalculé avec la
constante réelle, cette couleur **basculait déjà** avant correctif (4.494 < 4.5) : l'exemple ne démontrait rien.
Le phénomène était réel, l'exemplaire faux. Recalculer avec les constantes du code avant d'annoncer un ratio.

## PIT-S71-003 — Chrome renvoie `color(srgb ...)` et non `rgb()` pour un fond issu de `color-mix` : le parseur naïf SURESTIME le contraste
Vérification navigateur S71 : l'instrument de mesure ne matchait que `rgb(...)`, n'a donc pas reconnu le fond composite et a lu le mauvais fond — ratio **surestimé de +0,18** (citron, thème clair). Une passe a11y menée avec cet outil peut déclarer conforme ce qui ne l'est pas, sans rien signaler. Prévention : accepter `color(srgb r g b)` autant que `rgb()`/`oklch()`, et faire **échouer explicitement** le parseur sur un format inconnu plutôt que retomber sur un ancêtre. Cousin de [[PIT-S58-001]] (mauvais élément) et [[PIT-S70-004]] (sonde silencieusement décalée) : ici l'élément est bon, c'est le FORMAT qui trahit. (Sprint 71, vérif navigateur)

## PIT-S71-007 — Un plancher de contraste ne se cherche pas par dichotomie : le prédicat n'est pas monotone
Le long du chemin couleur→encre du thème, la luminance peut **traverser** celle du fond (couleur quasi noire en thème sombre) : le ratio descend jusqu'à 1,00:1 avant de remonter. Une recherche binaire converge donc vers un faux plancher. Prévention : balayage **linéaire** du paramètre de mélange, et vérification du ratio sur le hex **arrondi** effectivement rendu, pas sur la valeur flottante intermédiaire. (Sprint 71 #497)

## PIT-S73-002 — Encre calculée sur un fond peint en hex inline : n'utiliser que des tokens de PALETTE, jamais les alias sémantiques
Pour choisir une couleur de glyphe par luminance sur un fond `style={{backgroundColor: hex}}`, utiliser `--gray-0` / `--gray-900` (palette brute). Les alias `--color-ink` / `--color-primary-foreground` s'inversent sous `.dark` → le glyphe disparaît en thème sombre, alors que le fond, lui, ne change pas. Prévention : verrouiller par test que le bloc dark ne redéfinit AUCUN des tokens de palette utilisés (vérifié au S73 : `--gray-*` définis uniquement sur `:root`). (Sprint 73 #416)

## PIT-S70-003 — Un `opacity` cumulé à une variante déjà « faible » se paie sur le trait qui porte l'objet
`.mt-evt--draft` (occurrence fantôme de l'aperçu) portait `opacity:.8` en plus d'un fond à 8 %, d'un contour pointillé, d'une encre `muted` et d'une absence d'ombre. Le dimmer ne retirait donc plus d'insistance — il retirait du **contraste**, précisément sur les deux seuls éléments qui rendent l'objet lisible : contour à **2,49:1** en thème sombre (sous le seuil WCAG 1.4.11 de 3:1) et date du fantôme à **3,59:1** en clair (sous 4.5:1). Correctif : **retirer le dimmer**, pas assouplir le seuil ; l'identité colorée est conservée (le contour reste peint par `--mt-evt`). Prévention : avant d'empiler un `opacity` sur un traitement déjà atténué, mesurer — et vérifier le nombre de consommateurs de la classe avant de la modifier (ici un seul, `EventPreviewTimeline.tsx:180`, d'où l'absence de risque sur la frise réelle).

## PIT-S70-004 — `border-*-color` vaut `currentColor` quand aucune bordure n'est déclarée : la sonde répond, mais à une autre question
En mesurant le contraste d'un contour, `getComputedStyle(el).borderTopColor` renvoie `currentColor` (donc la couleur du TEXTE) si l'élément ne déclare pas de bordure — la mesure réussit et produit un chiffre plausible qui ne décrit pas ce qu'on croit mesurer. Au S70, `e2e/support/contrast.ts` a reçu une garde qui **lève** dans ce cas plutôt que de rendre une valeur. Même famille que [[PIT-S53-001]] (une assertion sur `text-*` peut apparier un `line-height` au lieu d'une taille) : le danger n'est pas l'erreur bruyante, c'est la sonde silencieusement décalée. Prévention : toute sonde de style calculé doit échouer explicitement quand la propriété visée n'est pas réellement déclarée.

## PIT-S70-006 — Un écart transmis par un agent qui n'a pas ouvert de navigateur est une HYPOTHÈSE, pas un constat
La vague 1 du S70 a livré une liste de 4 « écarts visuels connus », que le lead a recopiée telle quelle dans le briefing de la vague 2 comme checklist d'entrée. La vérification mesurée en a **réfuté 2** : le « double filet » header/aperçu (filets réellement distants de **207 px** en clair, 187 px en sombre) et l'« amputation du corps défilant » (le bandeau occupe 29,6 % de 700 px, il reste 418 px). Les deux venaient d'une lecture de code, pas d'une observation. Prévention : étiqueter explicitement la provenance de chaque écart transmis entre vagues (`mesuré` vs `déduit du code`) — un agent qui n'a pas rendu la page ne peut produire que des hypothèses, et les propager comme des faits fait perdre du temps à la vague suivante.

## PIT-S62-001 — `elementsFromPoint()` n'est PAS une preuve de peinture
Corollaire de [[PIT-S58-001]] côté hit-testing. Une couche Radix ouverte pose `body{pointer-events:none}` : tout le reste sort du test de survol et l'élément visé **remonte en tête de pile alors qu'il est recouvert**. S62 : la preuve DOM se lisait comme une *confirmation* que le popover était peint, tandis que le pixel montrait 100 % de panneau de drawer sur 15 offsets. `getComputedStyle` donne la couleur déclarée, `elementsFromPoint` la pile hit-testée — **jamais la peinte**. Seule la lecture de pixel tranche. (Sprint 62 #414)

## PIT-S62-002 — `page.screenshot({clip})` intersecte le viewport en silence
Toute échelle dérivée de `décodé/clip` devient fausse dès que l'élément touche le bord droit ou bas, et l'accesseur lit un pixel décalé. Mesuré : élément collé au bord bas, lecture « fond adjacent » à +6 px → rend **la couleur de l'élément lui-même**, unanimité **93 %** — donc indétectable par une garde d'unanimité. Clamper le clip sur `page.viewportSize()`, asserter `decoded ≈ clip × devicePixelRatio`, et **lever** au lieu de rabattre un point hors région. Une unanimité haute n'atteste ni de l'échelle ni de la position. (Sprint 62, review cycle 1)

## PIT-S63-012 — Balayage `rect.right > clientWidth` : exclure les défileurs, mais surtout PAS `<body>`
La frise produit 9-16 faux positifs par largeur (défilement horizontal légitime). Mais exclure `<body>` est pire : un scroll-lock Radix ouvert y déclare **tout le document** comme « contenu » et **masque l'élément fautif**. (Sprint 63 #74)

## PIT-S63-013 — `unique()` fabrique un faux débordement : jeton de 16 chiffres insécable
`support/products.ts:40` produit un identifiant de 16 chiffres ; rendu dans un `h1`, il déborde de 50-53 px. Un audit a failli « corriger » ce non-défaut. **Signal de reconnaissance : le débordement n'est PAS corrélé à la locale.** Défaut réel adjacent tracé : le `h1` du titre produit n'a pas de `break-words`. (Sprint 63 #74)

## PIT-S73-001 — `break-words` seul ne corrige PAS un débordement quand l'élément est enfant direct d'un flex
`min-width:auto` sur un item de flex conserve la taille min-content du mot le plus long, et `overflow-wrap:break-word` (contrairement à `anywhere`) ne réduit pas min-content : le texte déborde quand même. Solution : `min-w-0` **+** `break-words` sur l'élément, ou `overflow-wrap:anywhere`. Prévention : tout correctif de débordement textuel doit remonter la chaîne flex avant de conclure — PIT-S63-013 annonçait « il manque break-words » et c'était insuffisant. (Sprint 73 #458)

## PIT-S59-002 — Un élément « débordant » relevé sur `npm run dev` peut être de l'outillage de dev
Un audit par `getBoundingClientRect().right > clientWidth` remonte le bouton flottant des **TanStack Query
Devtools** (`.tsqd-parent-container`) et l'overlay `nextjs-portal`, avec un `right` qui **suit la largeur du
viewport** (329@320, 384@375, 399@390) — indiscernable d'un vrai défaut, alors que
`scrollWidth == clientWidth`. **A produit #341 : trois sprints de suspicion sur un SVG de landing qui
n'existe pas.** Exclusion portée par `frontend/e2e/support/dev-tooling.ts`. Cf. [[PIT-S58-005]].

## PIT-S59-004 — Turbopack sert un chunk CSS périmé et produit un FAUX VERT
Après édition de `globals.css`, la première passe du test d'injection `.dark` est sortie **22 passed** — la
règle injectée n'était simplement pas dans le CSS servi. `touch` et rechargement n'ont rien changé ; **seul
un redémarrage du serveur dev** a compilé la règle. Prévention : avant de conclure « le défaut injecté n'est
pas vu », `curl` le chunk CSS servi et vérifier que l'injection y figure. (Corollaire de [[PIT-S52-002]].)

## PIT-S53-001 — En Tailwind 4, `text-*` apparie un `line-height` : layeriser une règle d'élément la lui fait céder
Le correctif de #339 layerisait les 5 propriétés de `h1..h6` en bloc. Or une utilitaire `text-*` ne pose pas
que `font-size` : elle pose **aussi** `line-height: var(--tw-leading, var(--text-lg--line-height))`, défauts
émis dans `@layer theme`. Hors layer, la règle du DS battait cet appariement ; layerisée, elle **cède**.
Mesuré : `h2.text-lg` **29,16 px (1.08) → 42 px (1,5556)**, `h1.text-xl` **37,8 → 49 px**. **28 titres** du
dépôt portent `text-*` sans `leading-*` explicite → dérive **systémique et silencieuse** du rythme typo.
Mapper `--leading-*` dans `@theme` **ne protège pas** : ça gouverne les utilitaires nommées `leading-*`, pas
l'appariement. Solution : sortir `line-height` du layer, seul ; les 4 autres propriétés y restent (elles
doivent céder, c'est l'objet de #339). Contrepartie mesurée nulle (les 6 titres à `leading-*` explicite
valent déjà 1.08).

## PIT-S61-005 — Le check coverage-E2E est vert quand les specs sont seulement CITÉES
Au S61 il affichait « 10 testids ajoutés, 0 sans spec » alors que **les 5 specs du sprint n'avaient jamais été
exécutées** et que 2 échouaient. Il vérifie qu'un `data-testid` apparaît sous `frontend/e2e/`, il ne lance rien.
Combiné à 920 Vitest verts et un build OK, l'illusion est convaincante. Un `RECOMMAND_TEST_RUNNER` se traite en
**exécutant**, jamais en constatant. Famille [[PIT-S48-002]] (CI verte ≠ page correcte).

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

## PIT-S62-011 — Deux runs E2E complets rapprochés ne PEUVENT pas passer
`global-setup` purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de **5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « N did not run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre deux runs. Cousin de [[e2e-cors-origin-proxy-trap]] : sur ce harnais, tout échec de provisioning se déguise en autre chose. (Sprint 62)

## PIT-S62-012 — Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre un serveur SANS le proxy `/api`
`playwright.config.ts` fait `baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, à défaut, lance son propre `webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` : le rewrite `/api/*` n'existe pas, le `POST /api/auth/register` du projet `setup` tombe en **404**, les 4 comptes échouent et **aucun test ne démarre**. Un audit S62 en a conclu « BLOQUANT, régression du code » à tort. **Oracle : `401` sur `/api/auth/me` = proxy OK ; `404` = proxy absent.** Lire l'oracle avant toute hypothèse — cf. [[e2e-cors-origin-proxy-trap]]. (Sprint 62, audit Phase 6)

## PIT-S72-004 — Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
La suite E2E est morte au projet `setup` (`provision shared`), 248 tests non exécutés : `expect(getByTestId('dashboard')).toBeVisible()` a 5 s de timeout, or le **premier** `GET /fr/dashboard` a pris **4172 ms** (compilation webpack 3,4 s) contre 72/59/35 ms ensuite — les 3 provisions suivantes sont passées. Diagnostic par lecture des durées dans le log `next dev`, pas par hypothèse. Prévention : préchauffer les routes ou relancer une fois avant de conclure à un défaut ; un échec du **seul premier** cas d'une série identique désigne l'environnement, pas le code. (Sprint 72)

## PIT-S63-002 — `actionTimeout: 0` est le défaut Playwright : une erreur de routage coûte le budget du TEST
Sans budget explicite sur les clics d'un parcours à branches, une attente impossible consomme les **300 s du test**, × `retries: 2`. Le job `e2e` est passé de ~15 min à **42 min** pour 4 tests. Poser un budget par clic fait échouer **vite** et **nommer** le chemin manquant. (Sprint 63 #449)

## PIT-S73-006 — Une spec E2E qui seede une donnée PATHOLOGIQUE sur un compte PARTAGÉ casse une AUTRE spec
La sonde du S73 seedait un produit au nom de 64 caractères sans espace sur le compte `PROD` ; `seedProduct` ne nettoie rien, donc la donnée persiste. `sprint-62` utilise le même compte : son popover de `<Select>` s'élargit et le point échantillonné sort du viewport 390 px → 2 tests rouges en CI, à 1000 lignes du diff. Solution : helper `deleteProduct` + `afterEach` **inconditionnel** (jamais en fin de `test()` — non atteint quand le test échoue, précisément le jour où la pollution dure). Prévention : toute spec qui seede du hors-norme le supprime. (Sprint 73)

## PIT-S73-009 — `Date.now()` comme suffixe de nom sur un compte E2E partagé collisionne, et remonte en 500
`uq_categories_owner_name` est `UNIQUE(owner, name)` : à `workers: 2`, deux tests seedant « S73 <timestamp> » dans la même milliseconde violent la contrainte. Le backend remonte **500** (pas 409) → diagnostiqué à tort comme « backend cassé ». Prévention : toujours le helper `unique()` de `frontend/e2e/support/products.ts`. (Sprint 73)

## PIT-S64-002 — Greper `playwright-report/index.html` est un faux négatif GARANTI
Le reporter `html` embarque ses données en **base64** dans `<template id="playwrightReportBase64">` (441 Ko décodés → `report.json` + ~32 JSON). Chercher le nom d'un test échoué dans le HTML ne renvoie donc jamais rien, même quand l'échec y est. **Décoder avant de conclure.** (Sprint 64 #461)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

Aucune sur le code. Vague 1 avec #310 (`frontend/src/hooks/useEventEditConflict.ts`),
#237 (`frontend/src/contexts/NetworkStatusContext.tsx`) et #175 (backend Java).
**Fichiers disjoints des trois.**

## ⚠ TU DÉTIENS L'EXCLUSIVITÉ DE LA STACK E2E ET DU SERVEUR NEXT

Trois agents frontend partagent ce working tree. Deux subagents qui partagent la stack E2E se
corrompent mutuellement ([[PIT-S73-008]]) et `frontend/.next` est unique pour tout le worktree
([[PIT-S62-009]]). Le lead a donc interdit Playwright, `npm run dev` et `next build` aux deux
autres agents : **la stack est à toi seul pendant cette vague.** Les autres sont en Vitest pur.

### Recette E2E de ce worktree — LIS-LA, ne l'improvise pas

La recette complète est en tête de `frontend/playwright.config.ts` (commentaire `#427`). Points
saillants, à vérifier dans le fichier :

- `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` sont **obligatoires**. Sans elles, `next dev` ne
  pose pas le rewrite `/api/*`, le `POST /api/auth/register` du projet `setup` part en **404**, et
  le diagnostic accuse ensuite le rate-limit, le CORS ou un 409 — trois conclusions fausses qui ont
  coûté les sprints 47, 56 et 57. Une variable exportée **vide** compte comme absente.
- **En worktree, la voie « laisser Playwright démarrer Next » est un piège** : elle passe par
  `npm run dev`, donc `next dev --turbopack`, et avec plusieurs lockfiles turbopack infère un
  mauvais workspace root — toutes les pages rendent 500 et aucune spec ne tourne. **Prends la voie
  2 du commentaire : serveur déjà lancé en `npx next dev -p 3000` (webpack), puis
  `PLAYWRIGHT_BASE_URL=http://localhost:3000`.**
- **Oracle avant toute autre hypothèse** — 401 = proxy OK, 404 = proxy absent :
  `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/me`
  (un `curl` qui répond ne disculpe PAS le CORS : il n'envoie pas d'en-tête `Origin` —
  [[PIT-S57-003]]).
- `:3000` peut appartenir à un AUTRE projet du poste, ou à un autre worktree du MÊME projet
  ([[PIT-S56-004]], [[PIT-S60-008]]). Vérifie qui tient le port avant de conclure.
- Ne lance **jamais** un run de mesure en arrière-plan : il meurt avec ta session, et deux campagnes
  concurrentes se corrompent en silence ([[PIT-S65-002]]).
- Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
  ([[PIT-S72-004]]) — et `actionTimeout: 0` est le défaut ([[PIT-S63-002]]).

### Ce que « E2E impossible » vaut sur ce projet

**Quatre fois sur quatre**, un agent a conclu à tort que les E2E ne pouvaient pas tourner ici
([[PIT-S73-004]]). La recette ci-dessus a produit 49/49 en 38 s en local. Si tu bloques : dis
précisément à quelle étape, avec la sortie réelle et le code de sortie — **pas** « E2E
indisponible ». Et ne grep jamais `playwright-report/index.html` pour un verdict : faux négatif
garanti ([[PIT-S64-002]]).

### Hygiène des comptes E2E partagés

Les identités sont partagées entre specs. Ne seede **aucune** donnée pathologique sur un compte
partagé ([[PIT-S73-006]]), et n'utilise pas `Date.now()` comme suffixe de nom — il collisionne et
remonte en 500 ([[PIT-S73-009]]). Les pages `/privacy` et `/terms` sont **publiques** : ta spec ne
devrait avoir besoin d'aucune authentification, ce qui t'évite tout ce champ de mines. Si tu te
surprends à toucher aux comptes, c'est que tu as dérivé.

## Designer

Pas de spawn `ui-design` en amont : tu ne crées pas de surface, tu mesures et corriges l'existant.
Si un correctif de contraste t'amène à changer un jeton du DS, **dis-le explicitement** dans ton
retour — le lead décidera s'il faut une validation charte, parce qu'un jeton touché ici se répercute
partout ailleurs.

## Contraintes

- Branche cible : `sprint/76` — **déjà checkout**.
- **1 commit logique** (ou 2 : mesure/spec puis correctif, si ça rend le diff plus lisible), gitmoji
  français (ex. `:white_check_mark: test(legal): …`, `:lipstick: fix(legal): …`).
- Commit strictement ciblé : `git add <chemins exacts> && git commit -m "…" -- <chemins exacts>`.
- Ne touche à **aucun** de ces fichiers (périmètre des autres agents) :
  `frontend/src/hooks/useEventEditConflict.ts`, `frontend/src/contexts/NetworkStatusContext.tsx`,
  `frontend/src/components/EventContent.tsx`, `frontend/src/components/EventEditForm.tsx`,
  `backend/**`, `docs/memory/sprint-history.md`.
- Toute clé i18n ajoutée doit l'être dans les **4 locales**.
- Code en anglais, commentaires et docs en français.

## Livrable attendu

Écris `docs/memory/sprints/sprint-76/issue-527-done.md` (chemin ABSOLU sous le worktree). Il doit
contenir **un tableau de mesures chiffrées** — c'est le cœur de l'issue :

| Cible | Page | Thème | Locale | Ratio mesuré | Seuil | Verdict |
|---|---|---|---|---|---|---|

Puis rends un retour de **500 tokens maximum**, télégraphique :

```
RETOUR :
- commits: [SHA]
- resume: <ratios mesurés (chiffres!) + verdict par cible + débordement de à 375px oui/non + correctifs + preuve de mutation jouée + arbitrage multi-navigateurs>
- [MEMORY:pitfall|pattern|bug] <si applicable — un écart mesuré mérite une entrée>
- recommandations suite: <RECOMMAND_* ou « pas de RECOMMAND_X car … » sur UNE SEULE LIGNE>
- STATUS: COMPLETED
```

`STATUS: COMPLETED` (ou `PARTIAL` + `BLOQUE_SUR`) en **dernière ligne** du done.md. Section
« Recommandations suite » obligatoire, négation sur une seule ligne ([[PIT-S70-005]],
[[PIT-S67-004]]).

⚠ **Un done.md sans valeurs chiffrées ne satisfait pas cette issue**, même si tout est vert : c'est
littéralement le défaut que l'issue existe pour corriger.
