[BRIEFING ISSUE #340 — Sprint 53, Vague 2]

## Où travailler (garde-fou, à faire EN PREMIER)
Répertoire de travail OBLIGATOIRE :
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/nice-liskov-6059da`

`cd` dessus explicitement avant toute commande. Puis vérifie :
- `git branch --show-current` → doit valoir **`sprint/53`**
- `rtk proxy git log --oneline -1` → doit montrer **`40665fc`** (le commit de #339, Vague 1)

Si l'un des deux diffère, **ARRÊTE** et signale-le.

⚠ **Piège outillage** : un hook RTK filtre `git log` et `git diff` (`git diff` sort quasi vide, `git log`
masque les merges). Utilise `rtk proxy git diff ...` / `rtk proxy git log ...`. Ne conclus JAMAIS
« aucun changement » sur un `git diff` nu.

## Issue
**[FEATURE] Auditer les fichiers CSS non-layerisés restants**
Labels : `enhancement`, `epic:design`, `priority:P2`, `size:S`, `frontend`

### Énoncé de l'issue
> Même défaut que celui identifié sur les titres (#339), mais à vérifier sur d'autres fichiers de
> style : `frontend/src/styles/animations.css`, `landing.css`, `hero-timeline.css` et
> `ds/components/*.css`. Toute règle ciblant directement un élément HTML (sans passer par une classe,
> hors `@layer`) écrase les utilitaires Tailwind quelle que soit sa spécificité CSS normale. Il faut
> identifier lesquelles de ces règles posent réellement problème (écrasent une classe utilitaire
> quelque part dans le code) et les encapsuler dans `@layer base`.

### Critères d'acceptation
- [ ] Audit des fichiers listés pour repérer les règles CSS non-layerisées ciblant des éléments HTML
- [ ] **Pour chaque règle problématique identifiée, vérifier si elle écrase effectivement une classe
      Tailwind utilisée quelque part** ← **c'est le VERROU de portée de cette issue. Applique-le
      strictement : pas de preuve d'un conflit réel dans le dépôt = pas de modification.**
- [ ] Les règles problématiques confirmées sont encapsulées dans `@layer base`
- [ ] Aucune régression visuelle constatée après encapsulation

## ⚠ LA PRÉMISSE LITTÉRALE DE L'ISSUE EST LARGEMENT INFONDÉE — mesuré par le lead

J'ai compté, dans les fichiers que l'issue désigne :

| fichier | `@layer` | lignes | sélecteurs d'ÉLÉMENT HTML |
|---|---|---|---|
| `styles/animations.css` | 0 | 133 | **0** |
| `styles/landing.css` | 1 | 157 | **0** |
| `styles/hero-timeline.css` | 0 | 74 | **0** |
| `styles/ds/components/core.css` | 0 | 251 | **0** |
| `styles/ds/components/i18n.css` | 0 | 186 | **0** |
| `styles/ds/components/timeline.css` | 0 | 335 | **0** |
| `styles/ds/styles.css` | 0 | 13 | **0** |

**Aucun de ces fichiers ne contient un seul sélecteur d'élément HTML.** Tout y est classe (`.mt-*`),
`:root`, `@keyframes` ou `@media`. Cherché à la fois en colonne 0 et en position indentée ; les seules
correspondances sont des paliers de `@keyframes` (`0%`, `50%`, `100%`).

**Ne perds donc pas ton temps à chercher des sélecteurs d'élément dans ces 7 fichiers : il n'y en a pas.
Confirme mon comptage d'abord (c'est rapide), puis passe au vrai sujet ci-dessous.**

## LE VRAI DÉFAUT, que l'issue n'énonce pas

L'issue restreint le problème aux sélecteurs d'élément. **C'est une restriction fausse.** Le CSS hors
layer bat le CSS layerisé **quel que soit le type de sélecteur** — une **classe** hors layer bat elle
aussi toutes les utilitaires Tailwind de `@layer utilities`.

Or `ds/components/*.css` = **772 lignes de classes `.mt-*` entièrement hors layer**. Conséquence :
**toute utilitaire Tailwind posée sur un élément qui porte aussi une classe `.mt-*` du DS est
silencieusement annulée** si les deux touchent la même propriété.

Exemple concret à vérifier en premier :
`ds/components/timeline.css:154` →
`.mt-drawer__title{font-family:var(--font-display); font-size:19px; letter-spacing:-.01em; color:var(--color-ink);}`
Cette règle, hors layer, bat `font-mono`, `text-lg`, `text-ink-muted`… posées sur le même `<h2>`.
`ui-design` l'a relevé pendant le S53 : les titres de drawers timeline sont « neutres » vis-à-vis de
#339 précisément **parce que cette classe hors layer gagne déjà**.

**Le dépôt CONNAÎT déjà ce mécanisme** — il est documenté dans le fichier lui-même,
`styles/landing.css` lignes 4-10 :
> *« ce fichier n'étant pas dans un `@layer`, ils ÉCRASAIENT les utilitaires `border-rule` posées sur
> les mêmes éléments au sprint 48 (le CSS sans layer bat le CSS layered). »*

C'est donc un défaut **déjà constaté et déjà corrigé une fois ponctuellement** (S48, sur les couleurs de
`landing.css`), mais **jamais traité systématiquement**. C'est ça, l'audit que #340 doit livrer.

## ⚠⚠ PIÈGE MAJEUR — À LIRE AVANT DE LAYERISER QUOI QUE CE SOIT

Transmis par le fullstack-dev de #339 (Vague 1), **mesuré, pas supposé** :

`ds/tokens/*.css` (`typography.css`, `colors.css`, `spacing.css`) déclare `--leading-*`, `--tracking-*`,
`--text-*`, `--color-*` dans un `:root` **HORS LAYER**, avec **les mêmes noms** que le namespace de thème
de Tailwind 4. Tailwind émet ses propres défauts dans `@layer theme`. C'est **le fait d'être hors layer**
qui fait gagner les tokens du DS.

**Si tu layerises ces `:root` dans un layer situé avant `theme`, TOUTE l'échelle typographique et
chromatique du produit bascule silencieusement sur les défauts Tailwind.** `--leading-tight` passerait
de 1.08 à 1.25, `--tracking-widest` de 0.16em à 0.1em, etc.

→ **Règle : NE LAYERISE AUCUN bloc `:root` de `ds/tokens/`.** Ce n'est pas dans le périmètre de #340 et
c'est activement dangereux. Si tu penses devoir le faire, **arrête-toi et remonte-le** au lieu d'agir.

Corollaire utile : ce même mécanisme a fait qu'un « fait » du briefing de #339 était faux — le lead avait
déduit d'une absence de clé dans `@theme` que le défaut Tailwind s'appliquait. **Faux** : le DS squattait
le même nom de variable hors layer. **Ne déduis jamais une valeur effective de la lecture de `@theme`
seul.** Compile et mesure.

## Méthode de layerisation validée en Vague 1 — réutilise-la telle quelle

Livrée avec le commit `40665fc` (#339). Artefact complet :
`docs/memory/sprints/sprint-53/issue-339-done.md`. **Lis-le.** Résumé opérationnel :

1. **Patron d'assertion AST** : `layersOf(root, selecteur, /regex-declaration/)` puis
   `expect(chain).toContain('base')`. **La regex de déclaration est obligatoire** : Tailwind émet son
   preflight sous les mêmes sélecteurs. Sans discriminant, le test passe sur le reset Tailwind et ne
   prouve rien.
2. Comparaison de sélecteur : `rule.selector.trim() !== selector`, chaîne **exacte**. La sortie PostCSS
   normalise les listes en `a, b, c` (virgule + espace).
3. **Mémoïsation PostCSS** : chaque fixture témoin exige un `from` **unique** — sinon le plugin Tailwind
   renvoie le CSS réel et le test **passe à vide**. Cf. `__cascade-regression__.css` et
   `__heading-regression__.css`, chemins virtuels dans `src/styles/` (jamais écrits sur disque, les
   `@import './ds/...'` relatifs résolvent quand même).
4. **Ordre des layers mesuré** : `theme, base, components, utilities`. Hors layer bat **tout**.
   `base` bat `theme`. **Pour des classes de composant, le layer sémantiquement correct est
   `components`, pas `base`** — c'est ce qui laisse les utilitaires gagner, ce qui est le comportement
   attendu. (L'issue dit « encapsuler dans `@layer base` » ; pour des classes `.mt-*` c'est
   probablement le mauvais layer. Tranche et **justifie ton choix**.)
5. **Valide TOUJOURS par MUTATION** : dé-layerise, relance, **exige le rouge**. Un test AST vert ne
   prouve pas qu'il détecte quoi que ce soit.
6. `tsc` n'est pas couvert par vitest : `walkDecls(prop, d => arr.push(...))` casse
   (`number` vs `false | void`) — corps à accolades obligatoire. Lance `npx tsc --noEmit`.

Le fichier de test à étendre : `frontend/src/styles/__tests__/base-layer.test.ts` (5 tests aujourd'hui :
2 pour `a`, 3 pour `h1..h6`). Il contient un helper `winningRootVar` qui résout la précédence de layers
sur les custom properties — **c'est l'outil pour prouver une valeur effective**.

## À absorber dans #340 (report explicite de la Vague 1)

`ds/tokens/base.css` conserve, **hors layer** et non traités par #339 :
`body` · `time, .mono, [data-mono]` · `*` (box-sizing / scrollbar) · `::selection` · `:focus-visible`.

Le fullstack-dev de #339 les a inventoriés en commentaire dans le fichier et a recommandé de traiter
**`time, .mono, [data-mono]`** ici plutôt qu'en issue séparée. Son analyse : ce sélecteur pose un
`font-family` qui battrait une utilitaire `font-*` posée directement sur un `<time>` ; **impact constaté
aujourd'hui nul** (seul site : `EventPreviewTimeline.tsx:203`, qui pose `font-mono` — même valeur).
→ Applique le verrou de l'AC : **impact nul constaté ⇒ pas de correctif obligatoire.** Si tu le
layerises quand même, dis pourquoi. `body` est inoffensif (il n'agit que par héritage ; une utilitaire
sur un descendant gagne de toute façon).

## Ce que tu dois livrer

1. **Un audit écrit**, `docs/memory/sprints/sprint-53/audit-css-layers-340.md`, qui recense **par
   fichier** les règles hors layer et tranche, **avec preuve**, si chacune écrase une utilitaire
   réellement utilisée dans le dépôt. Format tableau : `fichier:ligne | sélecteur | propriété | conflit
   réel constaté (oui/non + où) | action`. **L'audit est le livrable principal de cette issue** — même
   si peu de corrections en découlent.
2. **Les corrections confirmées uniquement** : layerisation des règles pour lesquelles tu as établi un
   conflit réel. Verrou strict de l'AC : **pas de preuve = pas de modification.**
3. **Extension de `base-layer.test.ts`** pour verrouiller ce que tu corriges, sur le patron ci-dessus,
   avec validation par mutation.
4. Si l'audit conclut qu'un chantier plus large est nécessaire (p. ex. layeriser les 772 lignes de
   `ds/components/*.css` dans `@layer components`), **ne l'entreprends PAS ici** : chiffre-le et
   remonte-le en `RECOMMAND_FOLLOWUP`. Cette issue est calibrée **S**.

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
- **#340 est la Vague 2. Elle dépend de #339 (commit `40665fc`), déjà livrée et sur ta branche.**
  Ne re-fais pas son travail : `h1..h6` est déjà layerisé, les 5 `--leading-*` sont déjà mappées dans
  `@theme`. **N'y touche pas.**
- **#346 a été RETIRÉE du sprint** (livrée au S52, PR #374). `components/ui/dropdown-menu.tsx`,
  `select.tsx`, `language-selector.tsx` sont livrés — n'y touche pas.
- **Tu es la dernière vague d'implémentation.** Après toi : test-runner, reviewer, vérification
  navigateur par le lead, puis PR.

## Designer
**Non applicable en pré-implémentation** — `ui-design` a rendu son verdict sur #339 (Vague 1), pas sur
#340 : le périmètre de #340 n'était pas connu avant l'audit, c'est justement ce que tu produis.
Si ton audit débouche sur un changement à **risque visuel réel** (p. ex. layeriser `ds/components/*.css`
et faire basculer la précédence composant/utilitaire), **ne tranche pas seul** : retourne
`RECOMMAND_UI_DESIGN` et laisse le lead arbitrer.

## Contraintes
- Branche cible : **`sprint/53`** (déjà checkout). Ne change pas de branche.
- Commit : **1 commit logique**, message **gitmoji en français**.
- ⚠ **`git add` CIBLÉ, fichier par fichier. JAMAIS `git add -A` / `git add .`** — working tree partagé.
- Tests : `./scripts/test-quiet.sh frontend` (la suite complète tournait en **13,7 s / 828 tests** en
  Vague 1 — largement sous le seuil, lance-la en entier). Plus `npx tsc --noEmit`.
- ⚠ **jsdom ne résout NI `@layer` NI le layout.** Un test RTL sur `className` ne prouverait **rien** :
  les classes sont déjà présentes avant le correctif, c'est le piège. **Seule l'assertion AST
  post-compilation PostCSS prouve quelque chose.** N'écris pas de test RTL pour « couvrir » cette
  issue.
- **NE LAYERISE AUCUN `:root` de `ds/tokens/`** (piège majeur ci-dessus — bascule silencieuse de toute
  l'échelle typo/chromatique).
- **NE TOUCHE PAS** à : `ds/tokens/typography.css`, `colors.css`, `spacing.css`, `fonts.css` (blocs
  `:root`) · la règle `h1..h6` et le mapping `--leading-*` livrés en Vague 1 · `components/ui/*.tsx` ·
  aucun fichier backend.
- La vérification navigateur clair + sombre est faite **par le lead** après ton commit. Ton retour doit
  dire **quoi regarder** — sois précis, c'est ce qui conditionne le merge.

## Posture attendue (règle projet, non négociable)
- Ne qualifie pas ton travail de « parfait » / « complet ». Décris ce que le code FAIT.
- Avant de te déclarer terminé, **énumère ce qui MANQUE ou n'a PAS été vérifié**.
- « Je n'ai pas vérifié » est une réponse valide, **préférable** à une affirmation confiante non fondée.
- **Un audit qui conclut « peu de choses à corriger » est un résultat VALABLE et attendu.** Ne fabrique
  pas du travail pour justifier l'issue : le verrou de l'AC (« vérifier si la règle écrase effectivement
  une classe utilitaire utilisée quelque part ») existe exactement pour ça. Layeriser une règle sans
  conflit démontré, c'est prendre un risque de cascade **contre rien**.
- **Ce briefing contient déjà deux réfutations d'énoncés antérieurs** (la prémisse de l'issue #340, et un
  fait faux du briefing #339). Il peut lui-même contenir des erreurs — notamment mon comptage
  « 0 sélecteur d'élément ». **Vérifie-le, et si je me trompe, dis-le franchement.** La mesure prime sur
  l'énoncé, y compris sur le mien.

## Livrable attendu (format STRICT, MAX 500 tokens, style télégraphique — pas de prose)
```
RETOUR #340
commits: [SHA]
audit: docs/memory/sprints/sprint-53/audit-css-layers-340.md — <N règles hors layer recensées,
  M conflits réels démontrés, K corrigées>
comptage_lead_confirme: <OUI / NON + ce qui diffère — mon tableau « 0 sélecteur d'élément »>
corrections: <fichier:ligne → layer choisi + la PREUVE du conflit réel. Ou « aucune » + pourquoi.>
layer_choisi_et_pourquoi: <base vs components — justifie>
surfaces_a_verifier_navigateur: <liste courte priorisée, clair+sombre. « aucune » si aucun
  changement de rendu possible.>
faits_du_briefing_infirmes: <ce qui était faux, ou AUCUN>
tests: <commande + passed/failed réels + mutations testées — chiffres, pas d'appréciation>
NON VÉRIFIÉ: <obligatoire>
[MEMORY:pitfall|pattern|decision] <signaux si applicables>
RECOMMAND_FOLLOWUP: <chantiers chiffrés hors périmètre S — p. ex. layerisation globale de
  ds/components/*.css. Ou négation explicite.>
recommandations suite: <RECOMMAND_UI_DESIGN si risque visuel réel / autre, ou négation explicite>
STATUS: COMPLETED
```
(ou `STATUS: PARTIAL` + `BLOQUE_SUR:` si tu es bloqué plus de 30 min)
