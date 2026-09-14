# Issue #629 — Squelette de chargement en frise monté sur les routes

## Résumé

Objectif : monter `LoadingSkeleton` en fallback de segment (`loading.tsx`) ET dans les branches `isLoading` internes (arbitrage dev 2026-09-14), variante choisie d'après le layout réel de chaque écran. Aucune variante supprimée, aucune clé de locale ajoutée, `LoadingSkeleton.tsx` non modifié.

Fichiers (14, 1 commit) :
- Créés : `frontend/app/[locale]/(app)/timeline/loading.tsx`, `products/loading.tsx`, `products/[productId]/loading.tsx`, `settings/loading.tsx` + un `loading.test.tsx` chacun.
- Modifiés : `timeline/page.tsx` (+ `page.test.tsx`), `src/components/products/ProductsListView.tsx` (+ test), `src/components/products/CategoriesView.tsx` (+ test).

Variante par route :
| Route / branche | Variante | Pourquoi |
|---|---|---|
| `timeline/loading.tsx` | `timeline` (6 lanes) | écran à frise ; en-tête eyebrow + `<h1>` rendus avec les vrais libellés, enveloppe `px-6 py-8 gap-6` identique à la page |
| `timeline/page.tsx` `isLoading` | `timeline` (6), testid `timeline-data-loading` conservé | même forme que le fallback de segment → segment → données → frise sans changement de forme |
| `products/loading.tsx` | `list` (6) dans un cadre `border rounded-lg px-4` | `products-table` = lignes ; onglets inertes `.mt-tabs/.mt-tab`, titre + sous-titre réels, blocs bouton `h-9`, recherche `h-9` + tri `w-[220px]` |
| `ProductsListView` `isLoading` | `list` (6), testid `products-loading`, libellé `products.list.loading` | idem |
| `CategoriesView` `isLoading` | `cards` (6), testid `categories-loading` | la liste réelle est une grille 1/2/3 colonnes `gap-4` de cartes `rounded-lg border p-4` — géométrie identique à la variante `cards` |
| `products/[productId]/loading.tsx` (hors plan) | `timeline` (3) | **écart assumé** : un `loading.tsx` enveloppe aussi les segments enfants ; sans ce fichier, `/products/[id]` aurait hérité du squelette de LISTE. La fiche embarque la frise → `timeline` |
| `settings/loading.tsx` | `list` (5) | panneaux = formulaires empilés ; en-tête réel `settings.pageTitle`, bloc `h-9 w-9 lg:hidden` réservant la place de `settings-back`, barre d'onglets `h-11` bordée. Libellé `settings.loading` (clé existante, 4 locales) plutôt que `common.spinner.loading`, cf. DEC-S82-003 |

Statuts hors remplacement :
- `dashboard/loading.tsx` : **inchangé, variante `list` maintenue.** Après #624 le dashboard garde ruban de densité + agenda + listes ; le ruban est une carte à barres de densité, pas des lanes à gouttière 168 px — `timeline` ne l'épouse pas. En revanche son ENVELOPPE est fausse aujourd'hui (`max-w-3xl px-6 py-8` contre `max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6` dans la page) : non corrigée ici, la page étant en cours de modification par #624 → follow-up.
- `products/page.tsx` spinner `products-page-loading` : **laissé.** Branche inatteignable : `AppShell.tsx:198` rend `app-shell-loading` tant que `loading || !user` et ne monte pas `children` ; la page ne voit donc jamais `loading === true`. Même cas que `timeline-loading` (DEC-S56-003). Remplacer du code mort par un squelette n'a aucun effet visible → follow-up de suppression (idem `product-detail-page-loading`).
- `ProductDetailView` branche `product-detail-loading` : non touchée (hors plan) → follow-up.

Verdict `--lane-height` : **pas de piège.** `--lane-height: 46px` et `--lane-header-w: 168px` sont définis sous `:root` dans `frontend/src/styles/ds/tokens/spacing.css:47-48` (importé par `globals.css:18`). Seule redéfinition locale : `.mt-tlm--landscape` (`timeline.css:746`), sans incidence hors frise mobile paysage. Aucune valeur de repli ajoutée au composant.

Verdict mouvement réduit : **respecté par une règle globale, aucune classe ajoutée.** `frontend/src/styles/ds/tokens/base.css:179-186`, hors `@layer`, `!important` : `animation-duration: 0.01ms; animation-iteration-count: 1` sur `*`. Le keyframe `pulse` de Tailwind 4 ne définit que `50% { opacity: .5 }` → après une itération de 0,01 ms, les blocs restent à opacité 1, statiques. Non vérifié au navigateur (jsdom n'applique pas les media queries).

## Fichiers de contexte lus

- `.ai-env/context-packs/pit-frontend.md` — PIT-S22-001 (l.39 « `next build` (lint bloquant) attrape des erreurs invisibles ») : lu ; build non joué (interdit), eslint joué sur les 14 fichiers.
- `.ai-env/context-packs/pit-frontend.md` — PIT-S41-005 (l.59, `no-unused-vars` dans les tests) : lu ; appliqué : eslint sur les `.test.tsx` touchés.
- `.ai-env/context-packs/pit-frontend.md` — PIT-S54-002 (l.137 « Un `grep` de testid n'atteste NI un usage réel NI un rendu ») : lu ; `timeline.spec.ts:181/186` lu dans le code (assertion `toBeVisible` puis `toHaveCount(0)`), pas seulement grepé.
- `.ai-env/context-packs/pit-frontend.md` — PIT-S74-008 (l.872) et PIT-S75-002 (l.880) : lus ; toutes les commandes jouées via `rtk proxy` avec `exit=`.
- `.ai-env/context-packs/pit-frontend.md` — PIT-S78-001 (l.993, ancres de classes réordonnées par prettier) : lu ; aucun test n'ancre une chaîne de classes (assertions sur testid / role / `style.height`).
- `.ai-env/context-packs/pit-frontend.md` — PIT-S83-004 (l.1160, `tsc` rouge sous vitest vert) : lu ; `tsc --noEmit` joué.
- `.ai-env/context-packs/pit-frontend.md` — PIT-S83-005 (l.1164, `format:check`) : lu ; `prettier --check` joué sur les 14 fichiers (pas `npm run format:check` global).
- `.ai-env/context-packs/pit-frontend.md` — PIT-S62-006 (l.541 « Un écran prérendu hors layout ne peut pas résoudre la locale ») : lu ; non applicable, les 4 `loading.tsx` sont sous `app/[locale]/(app)/`, donc sous le `NextIntlClientProvider` du layout `[locale]` (même montage que `dashboard/loading.tsx`).
- `frontend/src/styles/ds/readme.md` — **NON LU** en entier ; seule la ligne 178 (`prefers-reduced-motion`, via grep).
- `frontend/src/styles/ds/tokens/spacing.css` — l.6 `:root {`, l.47-48 `--lane-height: 46px; --lane-header-w: 168px;`.
- `frontend/src/styles/ds/tokens/base.css` — l.179 `@media (prefers-reduced-motion: reduce)`.
- `docs/memory/decisions.md` — DEC-S56-003 (l.384 « Branche morte supprimée plutôt que testid renommé ; `app-shell-loading` canonique ») ; DEC-S82-003 (l.755 « L'état de chargement nomme l'action en cours ») ; #57 (l.135, l.138 : error boundaries, sans décision sur les squelettes).

## Tests joués

Depuis `<worktree>/frontend`, sur l'état final :
- `rtk proxy npx vitest run "app/[locale]/(app)/timeline" "app/[locale]/(app)/products" "app/[locale]/(app)/settings" src/components/products/ProductsListView.test.tsx src/components/products/CategoriesView.test.tsx src/components/shared/LoadingSkeleton.test.tsx` → **8 fichiers, 42/42 passés, exit=0**.
  - Nouveaux : `timeline/loading.test.tsx` (3), `products/loading.test.tsx` (2), `products/[productId]/loading.test.tsx` (2), `settings/loading.test.tsx` (2) ; ajoutés : 1 cas dans `timeline/page.test.tsx`, `ProductsListView.test.tsx`, `CategoriesView.test.tsx`. `LoadingSkeleton.test.tsx` intact (5, cas `cards`/`timeline` conservés).
  - Les tests des variantes `timeline` assertent `lane.style.height === 'var(--lane-height)'` : ils attestent que le token est câblé, PAS que la lane a une hauteur non nulle au rendu.
- `rtk proxy npx tsc --noEmit` → **exit=0**. (Un premier passage avait rendu exit=2 sur 1 erreur `dashboard/page.tsx:247 ARMING_TimelineEditHost`, fichier de #624 en cours ; disparue au second passage, aucune erreur dans mes fichiers dans les deux cas.)
- `rtk proxy npx eslint <14 fichiers>` → **exit=0**, 0 message.
- `rtk proxy npx prettier --check <14 fichiers>` → **exit=0** (après `--write`, qui a reformaté `CategoriesView.tsx` seulement).
- NON joués (interdits au briefing) : `next build`, Playwright, `test-quiet.sh`, `npm run format:check` global.

## À vérifier par le lead

- `next build` : 4 nouveaux `loading.tsx` Client Components sous `(app)/`. `auth-guard-paths.test.ts:579` ignore déjà les fichiers `loading.tsx` frères.
- E2E citant les testids touchés :
  - `e2e/timeline.spec.ts:153` (`timeline-data-loading` `toHaveCount(0)`), `:174-186` (`toBeVisible` puis `toHaveCount(0)`). Le squelette monte 6 lanes de 46 px : `toBeVisible` doit tenir, **à confirmer au run**. NB : #624 modifie aussi ce fichier (13 lignes, aucune sur loading/skeleton).
  - `products-loading`, `categories-loading`, `products-page-loading` : cités par **0** spec E2E (grep `frontend/e2e`). Nouveaux testids `timeline-loading-skeleton`, `products-loading-skeleton`, `product-detail-loading-skeleton`, `settings-loading-skeleton` : cités par 0 spec → risque de signalement coverage-e2e MAJEUR ; un `loading.tsx` n'est observable en E2E qu'en ralentissant la navigation de segment.
- Navigateur (jsdom ne mesure rien, aucun « zéro CLS » revendiqué) :
  1. `/fr/timeline` avec listing ralenti : lanes visibles (hauteur 46 px, gouttière 168 px), en-tête immobile au passage squelette → frise. La frise `layout="screen"` a une sidebar de filtres et une règle : le squelette ne les reproduit pas → décalage horizontal/vertical attendu à la bascule vers la frise.
  2. `/fr/products` : hauteur des onglets inertes (`span.mt-tab`) = celle des `button.mt-tab` ? Lignes `list` (`py-2`) vs lignes du tableau (`py-3` + sparkline) → la hauteur totale diffère probablement.
  3. Onglet Catégories : cartes du squelette vs cartes réelles (hauteur de contenu différente).
  4. `/fr/settings` < 1024 px : le titre ne bouge pas à l'arrivée de `settings-back` ; ≥ 1024 px, le bloc réservé est masqué.
  5. `/fr/products` → clic sur une ligne : c'est bien `product-detail-loading-skeleton` qui apparaît (et pas le squelette de liste), si le fallback est visible.
  6. `prefers-reduced-motion: reduce` émulé : blocs statiques.
  7. Clair + sombre : `bg-surface-2` visible sur `bg-bg`.

## Signaux mémoire

- `[MEMORY:pitfall] Contexte : #629, ajout de products/loading.tsx. Un loading.tsx enveloppe son segment ET tous ses enfants. products/loading.tsx seul serait devenu le fallback de /products/[productId], soit un squelette de liste pendant l'ouverture d'une fiche. Solution : [productId]/loading.tsx dédié. Prévention : à chaque loading.tsx ajouté, lister les sous-dossiers de segment et décider pour chacun.`
- `[MEMORY:pattern] Problème : pages 'use client' dont le vrai temps d'attente est une branche isLoading interne. Solution : même variante LoadingSkeleton et même enveloppe (en-tête réel inclus) dans loading.tsx et dans la branche interne, testid de la branche conservé via la prop testId, testid distinct pour le fallback de segment. Anti-pattern : un loading.tsx seul (quasi invisible) ou un testid partagé entre les deux (DEC-S56-003).`
- `[MEMORY:decision] Contexte : critère « prefers-reduced-motion respecté » de #629. Décision : pas de motion-reduce:animate-none sur LoadingSkeleton. Pourquoi : base.css:179 neutralise déjà toute animation globalement (0.01ms, 1 itération, !important hors layer) et le keyframe pulse finit à opacité 1. Non vérifié au navigateur.`

## Recommandations suite

- `RECOMMAND_FOLLOWUP: réaligner l'enveloppe de dashboard/loading.tsx (max-w-3xl px-6 py-8) sur la page (max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 ; salutation + ruban + grille agenda/aside) une fois #624 mergée, mesures au navigateur [XS | design/chargement]`
- `RECOMMAND_FOLLOWUP: supprimer les branches mortes products-page-loading (products/page.tsx:35) et product-detail-page-loading ([productId]/page.tsx:32), inatteignables sous AppShell.tsx:198, comme #391/DEC-S56-003 [XS | design/chargement]`
- `RECOMMAND_FOLLOWUP: remplacer la branche texte product-detail-loading de ProductDetailView.tsx:240 par LoadingSkeleton (testid conservé), alignée sur products/[productId]/loading.tsx [XS | design/chargement]`
- `RECOMMAND_FOLLOWUP: décider si les 4 nouveaux testids *-loading-skeleton exigent une spec E2E (fallback de segment observable seulement avec navigation ralentie) ou une exemption coverage-e2e [XS | tests E2E]`

STATUS: COMPLETED
