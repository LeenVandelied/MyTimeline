# Issue #624 — Tableau de bord : frise complète dupliquée, pas de « Ouvrir la frise »

## Résumé
Objectif : le tableau de bord montre un APERÇU de la frise (ruban de densité) et un bouton « Ouvrir la frise » vers `/timeline`. Il ne monte plus la frise complète, et le CTA `AddProductButton` est retiré sans remplacement (arbitrage dev du 2026-09-14).

Fichiers (1 commit) :
- `frontend/app/[locale]/(app)/dashboard/page.tsx` : section `TimelineEditHost` (desktop) supprimée ; `AddProductButton` retiré des branches portrait et desktop ; imports retirés ; `isLoading`, `resources` et `refetch` ne sont plus destructurés (no-unused-vars, PIT-S41-005). Le motif de l'arbitrage est écrit dans l'en-tête JSDoc de la page. Pour `GreetingHeader`, la rangée `flex justify-between` n'avait plus de voisin : le salut est rendu seul.
- `frontend/src/components/dashboard/DensityRibbon.tsx` : nouvelle prop optionnelle `timelineHref`. Si elle est fournie, `Button asChild variant="outline" size="sm"` + `next/link` sont rendus dans la rangée d'en-tête du ruban (`data-testid="dashboard-open-timeline"`).
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` : `density.openTimeline` (fr « Ouvrir la frise », en « Open timeline », es « Abrir la cronología », de « Zeitachse öffnen »). Rien n'a été ajouté sous `common.navigation`.
- Tests : nouveau `app/[locale]/(app)/dashboard/page.test.tsx` ; `DensityRibbon.intl.test.tsx` étendu.
- E2E : `golden-path`, `sprint-84-section-titles`, `sprint-85-timeline-sidebar`, `sprint-85-timeline-toolbar`, `timeline`.

Choix faits :
- **Lien DANS l'en-tête du ruban, pas sur une rangée à lui** (écart de forme au plan « à côté du ruban »). Une rangée dédiée ajoutait environ 60 px au-dessus de la grille. Or `sprint-84-section-titles.spec.ts:123-128` exige que les 4 titres de section commencent avant 800 px à 1280×800. `size="sm"` (32 px) tient dans la hauteur eyebrow + titre. Le ruban est rendu une fois par branche et les branches sont exclusives (ternaire) : il y a donc exactement un lien à une largeur donnée, avec un seul testid sans suffixe. `grep` préalable : aucun `dashboard-open-timeline` / `open-timeline` dans `app src e2e public/locales` (PIT-S85-006).
- **`sprint-84-section-titles.spec.ts:356`** (boîte de `add-product-button` à 375 px) : assertion re-ciblée, pas supprimée. Le test prouvait qu'un nom insécable dans le salut ne pousse pas le CTA voisin hors de l'écran. Le CTA n'existe plus, mais le risque demeure pour le salut lui-même (sans `break-words`, le jeton élargit la page). L'assertion porte maintenant sur le bord droit du `h1` de `dashboard-greeting`. La précondition « jeton ≥ 14 caractères » et l'assertion de débordement de page sont conservées. Le lien « Ouvrir la frise » est mesuré à 375 px en allemand, dans le describe « mobile portrait en allemand » (`boundingBox` du lien incluse dans celle du ruban).
- **ÉCART AU PLAN — 3 specs non listées dépendaient de la frise incrustée du dashboard**, trouvées en croisant les specs qui atterrissent sur le dashboard (`ensureAuthenticated` → `/fr/dashboard`) avec `timeline-view` :
  - `sprint-85-timeline-sidebar.spec.ts:301` (DEC-S85-005, pas de sidebar sur la frise incrustée) ;
  - `sprint-85-timeline-toolbar.spec.ts:240` (DEC-S85-005, ni « Aujourd'hui » ni « Nouvel événement ») ;
  - `timeline.spec.ts:680` (bulle `?` sur frise incrustée).
  Sans modification, les trois auraient été rouges (`timeline-view` introuvable). Elles sont re-ciblées sur la fiche produit (`/fr/products/:id`), désormais seule frise `embedded` (`ProductDetailView.tsx:377`). Les deux specs sprint-85 gardent leur listing stubbé : `useProductsWithEvents` lit le même `GET /api/users/{id}/products` que `PRODUCTS_LIST_RE`, et la fiche retrouve le produit par `id` dans ce listing. `timeline.spec` seedait déjà un produit : son `id` est maintenant utilisé.
- **golden-path** : produit créé via `shell-sidebar-nav-link-products` → `products-list-view` → `products-new-button`. Les testids du formulaire sont inchangés (vérifiés dans `ProductDrawer.tsx:260,275,305,314,370,436` ; `ProductsListView.tsx:346` monte le même `ProductDrawer mode="create"`). Retour par `shell-sidebar-nav-link-dashboard`. Assertion non vacante : `dashboard-product-list` contient le nom du produit (donc les données sont chargées) PUIS `timeline-view` compte 0. Ensuite, clic `dashboard-open-timeline` → URL `/fr/timeline` → `timeline-screen` → assertion inchangée sur le NOM du produit créé dans `timeline-resource-title`. Viewport Desktop Chrome (1280) : la sidebar du shell est peinte.

## Fichiers de contexte lus
- `.ai-env/context-packs/pit-frontend.md` — PIT-S22-001 (l.39, « `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest ») ; PIT-S41-005 (l.59, `no-unused-vars` invisible à vitest) ; PIT-S54-002 (l.137, « Un `grep` de testid n'atteste NI un usage réel NI un rendu ») ; PIT-S74-008 (l.872, RTK et `prettier --check`) ; PIT-S75-002 (l.880, RTK falsifie `next build`) ; PIT-S83-004 (l.1160, tsc rouge sous vitest vert) ; PIT-S83-005 (l.1164, `format:check` exigé par la CI) ; PIT-S83-009 (l.1180, clés exactes de `common.navigation`) ; PIT-S85-006 (l.1260, testid déjà pris).
- `docs/memory/decisions.md` — DEC-S85-005 (l.884, « `TimelineView` est monté par TROIS écrans : `/timeline`, le dashboard (`…dashboard/page.tsx:237`) et la fiche produit »). Cette entrée est désormais périmée sur ce point, voir Recommandations.
- `frontend/src/styles/ds/readme.md` — l.53-60 (« sentence case for UI labels and buttons ») et l.86 (`--color-rule-emphasis` : « outline buttons »), d'où `variant="outline"` et le libellé en casse de phrase.

## Tests joués
Depuis `<worktree>/frontend`, tous via `rtk proxy`, code de sortie lu :
- `rtk proxy npx vitest run "app/[locale]/(app)/dashboard/page.test.tsx" src/components/dashboard src/__tests__/i18n-namespaces.test.ts "app/[locale]/(app)/timeline/page.test.tsx" src/components/ui/language-selector.i18n.test.ts` → **11 fichiers, 109/109 tests, exit=0**.
- Armement de `page.test.tsx` : `TimelineEditHost` réinjecté temporairement dans la branche desktop → **1 failed | 8 passed, exit=1** (`timeline-edit-host-stub` trouvé), puis retour arrière (`grep -c ARMING` = 0).
- Après retour arrière : `rtk proxy npx vitest run "app/[locale]/(app)/dashboard/page.test.tsx" src/components/dashboard/DensityRibbon.intl.test.tsx` → **2 fichiers, 16/16, exit=0**.
- `rtk proxy npx tsc --noEmit` → **exit=0** (le tsconfig inclut `**/*.ts(x)`, donc `e2e/` compris). Rejoué après retour arrière : exit=0.
- `rtk proxy npx eslint <9 fichiers .ts/.tsx modifiés>` → **exit=0**.
- `rtk proxy npx prettier --check <13 fichiers modifiés, JSON compris>` → **exit=0**.
- NON joués (exclusivité lead) : `next build`, `npm run format:check` global, Playwright.

## Specs E2E modifiées NON jouées
- `frontend/e2e/golden-path.spec.ts`
- `frontend/e2e/sprint-84-section-titles.spec.ts` (describes « dashboard mobile portrait en allemand » et « salut à 375 px » ; aussi « dashboard desktop » light/dark, pour la ligne de flottaison avec le lien dans l'en-tête du ruban)
- `frontend/e2e/sprint-85-timeline-sidebar.spec.ts` (describe « #592 frise incrustée (fiche produit) »)
- `frontend/e2e/sprint-85-timeline-toolbar.spec.ts` (describe « #602 frise incrustée (fiche produit) »)
- `frontend/e2e/timeline.spec.ts` (test « aide : le survol ouvre le panneau de raccourcis »)
- À jouer aussi, non modifiées mais atterrissant sur le dashboard : `sprint-73-tablet-sidebar.spec.ts`, `sprint-89-local-date-west.spec.ts`, `sprint-63-de-overflow-audit.spec.ts`.

## Signaux mémoire
- `[MEMORY:pitfall] Context: #624 retire un composant d'un écran ; le plan listait 2 specs dépendantes, il y en avait 5. Les 3 manquantes n'écrivaient jamais « dashboard » à côté de « timeline-view » : elles y arrivaient implicitement via ensureAuthenticated(), qui fait goto('/fr/dashboard'). Solution : croiser les specs appelant ensureAuthenticated sans goto ultérieur avec le testid retiré. Prevention : pour tout retrait sur le dashboard, grepper « ensureAuthenticated » + le testid, pas seulement « dashboard ».`
- `[MEMORY:pattern] Problem: ajouter un bouton à un écran dont un E2E asserte « titres au-dessus de la ligne de flottaison ». Solution: loger l'action dans la rangée d'en-tête existante (size sm, flex-wrap) plutôt que sur une rangée dédiée. Anti-pattern: rangée supplémentaire qui repousse la grille de ~60 px.`

## Recommandations suite
- RECOMMAND_FOLLOWUP: `frontend/src/components/products/AddProductButton.tsx` n'a plus aucun consommateur (seule mention restante : un commentaire dans `AppShell.tsx:121`). Supprimer le composant ou lui trouver un usage [XS | design/products]
- RECOMMAND_FOLLOWUP: les clés `dashboard.recentEvents.{title,noEvents,viewAll}` n'ont plus aucun consommateur dans `app/` et `src/`. Purger les 4 locales [XS | i18n/dashboard]
- RECOMMAND_FOLLOWUP: `docs/memory/decisions.md` DEC-S85-005 cite encore le dashboard parmi les 3 écrans qui montent `TimelineView` (`page.tsx:237`). Il n'en reste que deux, `/timeline` et la fiche produit. Même décalage dans le commentaire d'en-tête de `e2e/sprint-42-events.spec.ts:20-21` [XS | docs/mémoire]
- RECOMMAND_FOLLOWUP: le lien `dashboard-open-timeline` fait 32 px de haut (`size="sm"`), sous la cible tactile de 44 px retenue pour le FAB mobile (#455). Il satisfait WCAG 2.5.8 AA (24 px), pas 2.5.5. Arbitrage Designer à 375 px [XS | design/dashboard]

STATUS: COMPLETED
