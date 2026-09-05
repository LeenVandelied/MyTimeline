# Issue #68 — Page Produits (liste + détail + catégories)

commits: [fb329dd, 0f50719, 0058e85, e6bd60f]

## resume
- Objectif: 3 vues frontend produits/catégories. Frontend pur (backend #50/#52 déjà livré).
- BR: BR-PRO-001 (nom, via ProductDrawer), BR-PRO-006 (listing par user connecté), BR-CAT-001/007 (CategoryDrawer + chargement dynamique), #50 (archivés exclus API).
- Routes (app router `app/`, PAS src/app):
  - `frontend/app/[locale]/products/page.tsx` — liste + catégories (onglets `Tabs` DS tablist).
  - `frontend/app/[locale]/products/[productId]/page.tsx` — détail (`useParams`, React 18, PAS `use()`).
- Composants (nouveaux, sous `src/components/products/`):
  - `ProductsListView.tsx` — tableau, recherche/tri LOCAUX (client), badge catégorie coloré, ProductSparkline/ligne, éditer/archiver, ligne cliquable (role=link + Enter/Space + focus:ring).
  - `ProductDetailView.tsx` — fiche + historique + sous-frise filtrée EN AMONT (events/resources du produit uniquement) via TimelineResponsive NON modifié.
  - `CategoriesView.tsx` — cards palette + compteur produits (dérivé local de useProductsWithEvents), CategoryDrawer create/edit, DeleteConfirmDialog variant category (categoryId + linkedProductsCount).
- Réutilisés SANS modif: ProductDrawer (#61), CategoryDrawer (#62), DeleteConfirmDialog (#65 variants product+category), ProductSparkline (#61), TimelineResponsive/TimelineView, hooks useProductsWithEvents/useCategories, services deleteProduct/deleteCategory, lib/color contrastInk.
- i18n: namespace `products` étendu (`list`/`detail`/`categories`) dans les 4 locales (fr/en/es/de). ICU plural pour compteurs.

## pitfalls
- [MEMORY:bug] Context: `next build` (lint CI) échouait sur `CategoryDrawer.tsx` (#62) — `nameConflict` (useState) jamais LU (409 surfacé via form.setError), `@typescript-eslint/no-unused-vars`. Invisible aux tests RTL/tsc, seul `next build` l'attrape. Solution: consommer la valeur en `aria-invalid` sur le champ nom (lint OK + a11y correcte, zéro changement comportement). Rule: toujours `npm run build` avant fin — lint bloque le build, pas tsc/vitest.
- Tabs DS (`ui/tabs.tsx`) = tablist ARIA seul (props `items`/`value`/`onValueChange`), PAS des sous-composants Radix TabsList/Trigger/Content. Piloter les panneaux via état local du consommateur.
- Détail: filtrage produit EN AMONT (approche imposée carte archi) — TimelineView NON forké (pas de prop productId ajouté, filtrage amont suffisant).

## tests
- Vitest inline: `ProductsListView.test.tsx` (12), `ProductDetailView.test.tsx` (7), `CategoriesView.test.tsx` (7) = 26 nouveaux, tous PASS.
- Suite front complète: 305 PASS / 0 FAIL (était 279). tsc: 0 erreur. `next build`: OK (2 routes /products + /products/[productId]). Lint: 0 warning/erreur sur mes fichiers.
- data-testid ajoutés: products-list-view, products-new-button, products-search-input, products-sort-trigger/-option-<key>, products-table, products-row-<id>, products-row-category-<id>, products-edit-<id>, products-archive-<id>, products-loading/-empty/-empty-search/-error; product-detail-view, product-detail-back/-edit/-delete/-card/-category/-timeline/-timeline-empty/-history/-history-row-<eventId>/-not-found/-loading; categories-view, categories-new-button, categories-card-<id>, categories-count-<id>, categories-system-<id>, categories-delete-<id>, categories-loading/-empty/-error; products-page, products-tabs, product-detail-page.

## [MEMORY:*]
- [MEMORY:pattern] Problem: sous-frise filtrée par produit. Solution: filtrer events/resources EN AMONT au niveau page (map produit unique → FullCalendarEvent via mapToFullCalendarEvent), passer à TimelineResponsive tel quel. Anti-pattern: forker/ajouter un prop filtre à TimelineView (composant central dashboard, risque régression).
- [MEMORY:pitfall] Context: `next build` seul attrape les erreurs lint bloquantes (no-unused-vars) invisibles à tsc/vitest. Prevention: `npm run build` obligatoire en fin de tâche frontend.

## recommandations suite
- Pas de RECOMMAND_TEST_RUNNER car 26 tests / <3s, suite complète 305/9s (< seuils 500 tests / 3min).
- Pas de RECOMMAND_DB_EXPERT / SECURITY car frontend pur, contrat backend #50/#52 déjà vérifié dans le code réel.
- Virtualisation liste: NON faite (non bloquant, borné par la carte). RECOMMAND follow-up si listes réelles > 50 produits (perf tableau ; sparkline déjà bornée 90j).
- Filtre Timeline: résolu par filtrage amont (pas de refactor TimelineView). Pas de RECOMMAND_UI_DESIGN — composants/tokens existants réutilisés, aucune UX inventée.
- Note à la lead: le fix `CategoryDrawer.tsx` (#62) touche un fichier « ne pas réécrire » mais était un blocage build CI hérité de #62 (dead state). Changement minimal non comportemental — à valider par le reviewer #62 si besoin.

STATUS: COMPLETED
