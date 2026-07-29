[BRIEFING ISSUE #339 — Sprint 53, Vague 1]

## Où travailler (garde-fou, à faire EN PREMIER)
Répertoire de travail OBLIGATOIRE :
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/nice-liskov-6059da`

`cd` dessus explicitement avant toute commande. Puis vérifie :
- `git rev-parse --short HEAD` → doit valoir **`2966994`**
- `git branch --show-current` → doit valoir **`sprint/53`**

Si l'un des deux diffère, **ARRÊTE** et signale-le : tu es dans le mauvais dépôt ou la mauvaise branche.
Ne corrige pas toi-même, ne fais pas de checkout.

⚠ **Piège outillage de ce projet** : un hook RTK filtre `git log` et `git diff`. `git diff` sort quasi
vide et `git log` masque les commits de merge. Si tu as besoin de l'historique ou d'un diff réel :
`rtk proxy git diff ...` / `rtk proxy git log ...`. Ne conclus JAMAIS « aucun changement » sur un
`git diff` nu.

## Issue
**[BUG] h1..h6 { margin: 0 } non-layerisé annule silencieusement les mb-***
Labels : `bug`, `epic:design`, `priority:P2`, `size:S`, `frontend`

### Contexte (énoncé de l'issue)
`frontend/src/styles/ds/tokens/base.css` déclare `h1..h6 { margin: 0; font-weight: semibold }` **hors de
tout `@layer`**. Le CSS non-layerisé bat le CSS layerisé (les utilitaires Tailwind sont dans
`@layer utilities`), donc toute classe `mb-*` ou `font-bold` posée sur un titre est **silencieusement
annulée**.

Le Sprint 48 avait layerisé **uniquement** les règles sur les liens `<a>` (cf. `DEC-S48-002` et le
commentaire de cascade lignes 35-43 de `base.css`), par peur des décalages de mise en page. Cette dette
est celle que #339 doit solder.

### Critères d'acceptation de l'issue
- [ ] Décision prise sur l'approche → **DÉJÀ TRANCHÉE, cf. section « Décision d'approche » ci-dessous.
      Tu l'appliques, tu ne la rediscutes pas.**
- [ ] Les classes `mb-*`/`font-*` appliquées sur des titres produisent l'effet attendu
- [ ] Aucune régression visuelle sur les pages contenant des titres (landing, dashboard, etc.)
- [ ] Cas `FooterSection.tsx` corrigé et vérifié

## Faits déjà ÉTABLIS ET MESURÉS par le lead — appuie-toi dessus, ne les re-mesure pas

1. **La règle fautive**, `frontend/src/styles/ds/tokens/base.css` lignes **21-27**, hors de tout layer.
   Le premier `@layer base {` du fichier n'apparaît qu'à la **ligne 44** :
   ```css
   h1, h2, h3, h4, h5, h6 {
     font-family: var(--font-display);
     font-weight: var(--weight-semibold);
     line-height: var(--leading-tight);
     letter-spacing: var(--tracking-tight);
     margin: 0;
   }
   ```

2. **⚠ DÉRIVE DE LIGNE DANS L'ÉNONCÉ DE L'ISSUE.** L'issue cite `FooterSection.tsx:41`. C'est **FAUX**.
   Le `<h4 className="text-ink mb-3 font-bold">` est aux lignes **43, 63 et 78** — **trois occurrences,
   pas une**. Corrige les trois. (Pitfall récurrent de ce projet : `PIT-S52-006` — ne jamais faire
   confiance au numéro de ligne d'une issue, toujours re-grep le fichier.)

3. **Rayon de souffle : ~38 titres** portent aujourd'hui un `mb-*`/`mt-*`/`font-*` inopérant, sur
   `components/landing/`, `components/dashboard/`, `components/settings/`, `components/products/`,
   `components/timeline/`, `components/shared/`.

4. **Le garde-fou de cascade existe déjà et il est bon** :
   `frontend/src/styles/__tests__/base-layer.test.ts`. Il compile la **vraie** chaîne CSS
   (`globals.css` + `@import 'tailwindcss'`) via PostCSS + `@tailwindcss/postcss`, puis assert **sur
   l'AST de sortie** que (1) la règle `a` du DS est dans `@layer base`, (2) les utilitaires de couleur
   sont dans `@layer utilities`, (3) l'ordre déclaré met `base` AVANT `utilities`. Il porte un second
   test « le détecteur ne passe pas à vide » (compile une fixture régressée et vérifie qu'elle est bien
   détectée hors layer).
   **C'est LE patron à étendre pour `h1..h6`. Lis-le en entier avant d'écrire quoi que ce soit.**
   ⚠ Note le commentaire sur la mémoïsation : le `from` de la fixture témoin DOIT différer de
   `GLOBALS`, sinon le plugin Tailwind renvoie le CSS réel et le test passe à vide.

5. **`@theme` (dans `frontend/src/styles/globals.css`) expose `--font-*` et `--text-*` mais PAS
   `--leading-*` ni `--tracking-*`.** Vérifié par lecture directe. Conséquence mesurée :
   | utilitaire | valeur appliquée aujourd'hui (défaut Tailwind) | token DS (`typography.css`) | dérive |
   |---|---|---|---|
   | `leading-tight` | 1.25 | `--leading-tight: 1.08` | **oui, visible** |
   | `leading-none` | 1 | `--leading-none: 1` | non, identiques |
   | `tracking-widest` | 0.1em | `--tracking-widest: 0.16em` | oui |
   | `tracking-tight` | −0.025em | `--tracking-tight: −0.02em` | marginale |
   `font-bold`/`font-medium`/`font-semibold` (700/500/600) coïncident avec `--weight-*` : **aucune
   dérive de graisse.** `font-mono` et `text-*` sont mappés : aucune dérive.

## Décision d'approche — ARBITRÉE PAR LE DEV, À APPLIQUER TELLE QUELLE

Verdict `ui-design` + arbitrage du développeur (2026-07-29) :

**(a) Layeriser les 5 propriétés EN BLOC** dans `@layer base`, même geste que le S48 sur `a`.
Ne PAS scinder la règle entre une partie layerisée et une partie hors layer : cela obligerait à
dupliquer le sélecteur `h1..h6`, c'est fragile et ça diverge du patron `a` déjà validé.

**(b) AJOUTER `--leading-*` dans le bloc `@theme` de `globals.css`**, en même temps.
C'est la **condition de non-régression** de (a) : sans ce mapping, les ~7 titres landing qui portent
déjà `leading-tight` passeraient de **1.08 à 1.25** — une régression visuelle réelle au-dessus de la
ligne de flottaison, contraire à l'AC « aucune régression visuelle ».
Ce mapping est **prouvé sans effet de bord** : les 3 seuls usages de `leading-*` hors titre sont
`leading-none` (`components/ui/card.tsx:38`, `components/ui/label.tsx:10`,
`components/ui/dialog.tsx:91`) et `--leading-none: 1` == défaut Tailwind `1`. Rien d'autre ne bouge.
Mappe les 5 : `none`, `tight`, `snug`, `normal`, `relaxed`.

**(c) NE PAS mapper `--tracking-*`. HORS PÉRIMÈTRE de ce sprint.**
Ce serait une correction *séparée*, avec son propre rayon de souffle visible sur **11 sites hors titre**
(eyebrows mono en capitales : `tracking-widest` 0.1em → 0.16em ; `components/timeline/Ruler.tsx:40`
`tracking-wide` 0.025em → 0.06em). Le développeur a explicitement choisi de la sortir de #339 pour
garder l'issue à sa taille S et lui donner sa propre vérification visuelle.
→ **Signale-la en `RECOMMAND_FOLLOWUP`** dans ton retour, avec le constat chiffré ci-dessus.
→ Conséquence assumée et à **documenter en commentaire dans le code** : après ton correctif, un
`tracking-widest` sur un titre rendra 0.1em au lieu des 0.16em voulus par le DS. C'est une dérive
**connue, bornée et acceptée**, pas un oubli.

## Check-list des surfaces qui vont VISIBLEMENT bouger (verdict ui-design, risque décroissant)

Tu n'as pas à toutes les ouvrir au navigateur — le lead le fera. Mais tu dois **savoir** ce qui bouge
pour ne pas confondre un changement attendu avec une casse :

1. `components/dashboard/KpiMarginalia.tsx:38`, `ProductList.tsx:29`, `ProductCarousel.tsx:43`,
   `WeekAgenda.tsx:40`, `CompactAgenda.tsx:80` — bascule police display → **mono** (l'utilitaire
   `font-mono` prend enfin effet) + tracking. **Changement de famille de police, très visible.**
2. `components/products/ProductDetailView.tsx:211,225` — idem + `mb-2` s'active.
3. `components/dashboard/GreetingHeader.tsx:50` — graisse 600 → 500 (`font-medium`).
4. `components/landing/FooterSection.tsx:43,63,78` — graisse 600 → 700 + `mb-3` (12 px) s'active.
   **C'est le cas cité par l'issue.**
5. `components/landing/HeroSection.tsx:59` — `mb-6` (24 px) s'active + graisse 700. Le `leading-tight`
   reste à 1.08 **grâce au mapping (b)**.
6. `components/landing/CtaSection.tsx:38`, `HowItWorksSection.tsx:22,36`, `TestimonialSection.tsx:21`,
   `MobileAppSection.tsx:28`, `FeaturesSection.tsx:29,47` — même triptyque graisse + marge.
7. `components/settings/ProfileSection.tsx:100`, `SecuritySection.tsx:95,177` — graisse 600 → 500 +
   `mb-2`/`mb-3` s'activent.
8. **Témoins de contrôle — NE DOIVENT PAS bouger** (utilitaire `font-semibold` == défaut 600) :
   `components/settings/AccountSection.tsx:50`, `DeleteAccountSteps.tsx:47,79`,
   `ProfileSection.tsx:93`, `SecuritySection.tsx:88`, `PreferencesSection.tsx:54`,
   `mobile/BottomSheet.tsx:124`, `components/shared/StateScreen.tsx:84`,
   `components/products/ProductsListView.tsx:148`, `ProductDetailView.tsx:169`,
   `CategoriesView.tsx:77`.
9. `components/timeline/EventDrawer.tsx:58`, `TimelineLandscapeDrawer.tsx:86`,
   `TimelineBottomSheet.tsx:130` — pilotés par les classes DS `.mt-drawer__title` / `.mt-sheet__title`
   (sélecteur de classe, déjà gagnant) → **neutres**.
   ⚠ Dans ce dépôt, le préfixe `mt-` des classes DS signifie **MyTimeline**, ce n'est PAS l'utilitaire
   Tailwind `margin-top`. Ne confonds pas.

`ui-design` n'a trouvé **aucun** titre qui s'appuierait structurellement sur `margin: 0` dans un
conteneur `flex/gap` (pas de risque de double espacement identifié).

## Ce que tu dois livrer

1. **`base.css`** : `h1..h6` déplacée dans `@layer base`. Mets à jour / étends le commentaire de cascade
   existant (lignes 35-43) pour qu'il couvre aussi `h1..h6` et non plus seulement `a` — ce commentaire
   est la mémoire du pourquoi, il doit rester exact.
2. **`globals.css`** : les 5 `--leading-*` ajoutées au bloc `@theme`, avec un commentaire court disant
   pourquoi (sinon `leading-tight` régresse 1.08 → 1.25) **et** notant que `--tracking-*` est
   volontairement laissé non mappé (follow-up).
3. **`FooterSection.tsx`** : vérifie les 3 `<h4>` (43, 63, 78). Le `mb-3 font-bold` devient effectif —
   normalement **aucune modification du .tsx n'est nécessaire**, c'est le CSS qui débloque l'effet.
   Ne touche au `.tsx` que si tu constates un vrai problème, et dis-le.
4. **`base-layer.test.ts` ÉTENDU** : ajoute la couverture `h1..h6` sur le même patron AST —
   (i) `h1..h6` est bien dans `@layer base`, (ii) le test témoin « détecteur pas à vide » pour `h1..h6`,
   (iii) idéalement, une assertion que `--leading-tight` est bien exposée comme utilitaire avec la
   valeur DS **1.08** et non 1.25 (c'est ce qui verrouille la décision (b) contre une régression future).
   Le point (iii) est le plus précieux : c'est la seule chose qui empêchera quelqu'un de retirer le
   mapping sans s'en apercevoir.

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
- **#339 est la Vague 1. Elle ne dépend de rien.**
- **#340 (Vague 2) dépend de TOI** : elle auditera `animations.css`, `landing.css`, `hero-timeline.css`
  et `ds/components/*.css` en **réutilisant la méthode de layerisation que tu valides ici**. Écris ton
  correctif et ton test comme un **patron reproductible**, pas comme un one-shot. Si tu découvres une
  contrainte de méthode (ordre des layers, piège de mémoïsation PostCSS, forme d'assertion AST qui
  marche), **dis-le explicitement** dans ton retour : ça part directement dans le briefing de #340.
- **#346 a été RETIRÉE du sprint** (livrée au S52, PR #374). Ne la cherche pas, ne la traite pas.
  `components/ui/dropdown-menu.tsx` et `select.tsx` sont **déjà corrigés** — n'y touche pas.

## Designer
**APPROUVÉ avec conditions** — verdict `ui-design` intégral repris dans la section « Décision
d'approche » et la check-list des surfaces, en HEAD de ce briefing. Les conditions (layerisation en
bloc + mapping `--leading-*` + `--tracking-*` hors périmètre) sont **fermes** : elles ont été arbitrées
par le développeur. Ne les rediscute pas, applique-les.

## Contraintes
- Branche cible : **`sprint/53`** (déjà checkout, ancrage `2966994`). Ne change pas de branche.
- Commit : **1 commit logique**, message **gitmoji en français** (convention du dépôt, cf.
  `rtk proxy git log --oneline -20` pour le style).
- ⚠ **`git add` CIBLÉ, fichier par fichier. JAMAIS `git add -A` / `git add .`** — le working tree est
  partagé, un `add` large ramasserait le travail d'un autre agent ou des artefacts de sprint.
- Tests : `./scripts/test-quiet.sh` (à la racine du dépôt). Lance **au minimum** la suite frontend et
  fais passer `base-layer.test.ts`. Si le volume dépasse ~500 tests ou 3 min, arrête et retourne
  `RECOMMAND_TEST_RUNNER` — le lead lancera la suite complète.
- ⚠ **jsdom ne résout NI `@layer` NI le layout.** Un test RTL sur `className` ne prouverait
  strictement RIEN ici : les classes sont déjà présentes AVANT le correctif, c'est précisément le
  piège. **Le seul test qui prouve quelque chose est l'assertion AST post-compilation PostCSS**
  (patron `base-layer.test.ts`). N'écris pas de test RTL pour « couvrir » cette issue, ce serait un
  faux filet. Cf. pitfall S48 « CI verte ≠ page correcte » : le S48 a livré 2 CTA invisibles
  (contraste 1,00:1) avec une CI verte.
- **NE TOUCHE PAS** à : `components/ui/dropdown-menu.tsx`, `components/ui/select.tsx`,
  `components/ui/language-selector.tsx` (livrés au S52) · `styles/animations.css`,
  `styles/landing.css`, `styles/hero-timeline.css`, `styles/ds/components/*.css` (**réservés à #340**,
  Vague 2 — tout conflit de fichier bloquerait la vague suivante) · aucun fichier backend.
- **NE MAPPE PAS `--tracking-*`** dans `@theme` (décision (c) — hors périmètre, follow-up).
- La vérification navigateur clair + sombre est faite **par le lead**, après ton commit. Tu n'as pas à
  lancer de navigateur. Mais ton retour doit dire **ce qu'il faut regarder**.

## Posture attendue (règle projet, non négociable)
- Ne qualifie pas ton propre travail de « parfait » / « complet » / « excellent ». Décris ce que le code
  FAIT.
- Avant de te déclarer terminé, **énumère explicitement ce qui MANQUE ou n'a PAS été vérifié**.
- « Je n'ai pas vérifié » est une réponse valide et **préférable** à une affirmation confiante non
  fondée.
- Si un fait de ce briefing se révèle FAUX à la lecture du code (numéro de ligne, valeur de token,
  hypothèse de cascade) : **dis-le franchement et corrige-le dans ton retour**. Le briefing a déjà
  redressé deux erreurs de l'issue ; il peut lui-même en contenir. La mesure prime sur l'énoncé.

## Livrable attendu (format STRICT, MAX 500 tokens, style télégraphique — pas de prose)
```
RETOUR #339
commits: [SHA]
resume: <objectif + fichiers touchés + ce que le test AST prouve réellement>
methode_layerisation (pour #340): <patron reproductible + pièges rencontrés — SOIS PRÉCIS,
  ce bloc part tel quel dans le briefing de la Vague 2>
surfaces_a_verifier_navigateur: <liste courte priorisée, clair+sombre>
faits_du_briefing_infirmes: <ce qui était faux, ou AUCUN>
tests: <commande lancée + passed/failed réels — chiffres, pas d'appréciation>
NON VÉRIFIÉ: <obligatoire — ce que tu n'as pas pu établir>
[MEMORY:pitfall|pattern|decision] <signaux si applicables>
RECOMMAND_FOLLOWUP: mapping --tracking-* dans @theme [S | frontend/design] — 11 sites hors titre
  impactés (eyebrows mono 0.1em→0.16em, Ruler.tsx:40 0.025em→0.06em)
recommandations suite: <RECOMMAND_TEST_RUNNER / RECOMMAND_UI_DESIGN / autre, ou négation explicite
  « pas de RECOMMAND_X car ... »>
STATUS: COMPLETED
```
(ou `STATUS: PARTIAL` + `BLOQUE_SUR:` si tu es bloqué plus de 30 min)
