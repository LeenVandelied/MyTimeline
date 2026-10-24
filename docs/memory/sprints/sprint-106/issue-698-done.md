# Issue #698 — Fiche produit : squelette cohérent et navigation plus rapide

## Commits
- `9fbca3c4` :zap: perf(products): squelette de fiche, squelette du dashboard aligné et préchargement au survol (#698) — contient aussi `frontend/e2e/sprint-106-product-detail.spec.ts` (couvre #606/#607/#698)

## Résumé
- `ProductDetailView.tsx` : branche `isLoading` → `LoadingSkeleton variant="timeline" rows={3}` (même composition que `[productId]/loading.tsx`), testid `product-detail-loading`, `role="status"` et libellé `sr-only` conservés ; bouton retour conservé.
- `frontend/app/[locale]/(app)/dashboard/loading.tsx` : enveloppe de la branche desktop de `page.tsx` (`mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8`) + salutation + ruban (carte `border p-4`, barres `h-24`) + grille `lg:grid-cols-[minmax(0,1fr)_280px]` (agenda | marge). Une seule région `role="status"` (`dashboard-loading-skeleton`, conservé). Testids ajoutés : `dashboard-loading-layout`, `dashboard-loading-greeting`, `dashboard-loading-ribbon`.
- `ProductsListView.tsx` : `prefetchDetail` → `router.prefetch(href)` sur `onMouseEnter` ET `onFocus` du `<tr>`, dédupliqué par un `Set` (1 fois par fiche).
- onSuccess `useCreateProduct`/`useCreateCategory` : AUCUN changement (arbitrage).
- Tests unit : `ProductDetailView.test.tsx` (squelette 3 lanes, status, sr-only), `ProductsListView.test.tsx` (survol → 1 prefetch, re-survol → toujours 1 ; tab clavier → prefetch ; aucun push), nouveau `dashboard/loading.test.tsx` (enveloppe, ordre des blocs, une seule région status).

## Mesures (E2E, chromium 1280×900, sidebar dépliée)
- Squelette dashboard vs page réelle : salutation x=280 w=968 / x=280 w=968 ; ruban x=280 y=135 w=968 / x=280 y=135.2 w=968. Avant : `max-w-3xl` (≤ 768 px). Hauteur salutation 87 vs 87.2 px.
- Préchargement : 1 requête RSC `/fr/products/<id>?_rsc=` au survol (et au focus), URL inchangée, pas de 2e au re-survol ; le clic suivant arrive bien sur la fiche.

## Écarts d'énoncé
- Chemin de l'énoncé `frontend/src/app/...` faux → `frontend/app/[locale]/(app)/...` (relevé par l'architect).
- `router.prefetch()` précharge en mode FULL (défaut de l'API impérative) : la requête part SANS l'en-tête `next-router-prefetch: 1` (relevé par sonde) — la spec l'identifie par l'URL RSC + absence de navigation, pas par cet en-tête. Le mode FULL charge aussi la page (pas seulement la frontière `loading.tsx`), donc le clic est servi depuis le cache.
- Harnais : le backend `:8086` (lancé depuis le worktree sprint-105) n'autorise en CORS que `:3000`/`:3100` → `register` du projet `setup` en 403 depuis `:3106`. Contourné SANS toucher le backend : shim Node `:8186` → `:8086` qui réécrit `Origin: http://localhost:3106` en `http://localhost:3100` (`scratchpad/origin-shim.mjs`), build + start avec `E2E_API_PROXY_TARGET=http://localhost:8186`.

## E2E
- `sprint-106-product-detail.spec.ts` : 14/14 (setup inclus).
- Specs citant la surface (31 fichiers, workers 2) : 180 passed, 1 failed = `sprint-101-fab-landscape:271` (paysage 740×390) — rouge connu sur la base (#769), hors sprint. Inclus : products, categories, sprint-100-fab-clearance, sprint-101-*, sprint-42, 61, 63-de-overflow, 70-create/visual, 71, 73, 82, 84, 85×2, 86×2, 89, 90-first-contact (squelette fiche + préchargement toujours vert), 91×3, 92×3, 93, 94, 97, timeline.
- Aucun PNG darwin créé (`git status | grep darwin` vide).

## [MEMORY:*] signaux
- [MEMORY:pitfall] Context: E2E prefetch d'un `router.prefetch()`. Solution: il part en mode FULL, SANS `next-router-prefetch: 1` (≠ `<Link>` en AUTO) ; identifier par `?_rsc=` + URL de page inchangée. Prevention: ne pas réutiliser `waitForPrefetch` de sprint-90 (filtre sur l'en-tête) pour un préchargement impératif.
- [MEMORY:pitfall] Context: harnais E2E local sur un port libre (3106) contre un backend partagé. Solution: le CORS dev (`APP_CORS_ALLOWED_ORIGINS`, défaut :3000) renvoie 403 au register du `setup` ; shim réécrivant `Origin` vers une origine autorisée + rebuild avec le proxy pointé dessus. Prevention: sonder `OPTIONS /api/auth/register` avec `Origin: http://localhost:<port>` avant de lancer la suite.

## Recommandations suite
- RECOMMAND_FOLLOWUP: le briefing prescrivait `:3106` contre un backend dont le CORS n'autorise que 3000/3100 — ajouter la sonde CORS `OPTIONS` au gabarit de briefing (ou lancer le backend partagé avec 3106 dans `APP_CORS_ALLOWED_ORIGINS`) [triage | tooling]
- RECOMMAND_FOLLOWUP: `dashboard/loading.tsx` ne couvre que la branche desktop (SSR) ; les branches mobile portrait/paysage ont une autre structure (carousel, rail) [triage | frontend]
- Pas de RECOMMAND_SECURITY car le préchargement ne vise que des routes de l'utilisateur authentifié déjà listées, sans nouvelle donnée exposée.

## Non vérifié
- Gain de latence perçu (non chronométré) ; seule la présence du préchargement est prouvée.
- Préchargement sur écran tactile (pas de survol ; le focus/tap reste la seule intention).
- Squelette dashboard en mobile portrait/paysage (non mesuré).
- Harnais laissé actif : `next start -p 3106` (PID 42240) et shim `:8186` (PID 29660) — à tuer par PID quand plus utiles.

STATUS: COMPLETED
