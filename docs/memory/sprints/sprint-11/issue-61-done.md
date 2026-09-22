# Issue #61 — ProductDrawer (desktop + mobile) — DONE

**Vague :** 2
**Commit :** `34342b9`

## Résumé
ProductDrawer unifié (création simple / couplée / édition) remplaçant `AddProducts.tsx` monolithe. Desktop drawer 452px, mobile bottom sheet (même pattern responsive que DeleteConfirmDialog #65). Combobox catégories câblée sur `useCategories` (#65) → fin des 4 UUID hardcodés.

## BR touchées
- BR-PRO-001 — fix désync Zod `name` min(3)→min(1).max(100) (aligné `@Size` backend)
- BR-PRO-002 / BR-CAT-007 — combobox câblée sur API, fin des UUID hardcodés
- BR-PRO-009 — PATCH partiel `{name?, categoryId?}`
- BR-PRO-010 — 409/404 inline
- BR-PRO-005 — jamais `events:null` (omis pour éviter NPE backend)

## Fichiers clés
- `frontend/src/components/products/{ProductDrawer.tsx,ProductSparkline.tsx,AddProductButton.tsx}`
- `frontend/src/hooks/{useCreateProduct.ts,useUpdateProduct.ts}`
- `frontend/src/services/productService.ts` (updateProduct PATCH + deleteProduct)
- `frontend/src/types/{product.ts,category.ts}` (productUpdateSchema + `color` sur categorySchema)
- `frontend/app/[locale]/dashboard/page.tsx` (migré vers AddProductButton)
- `public/locales/{fr,en,es,de}/products.json` (`products.drawer.*`)
- Supprimé : `AddProducts.tsx`

## Tests
20 nouveaux (Zod nom vide/min(1)/max(100)/UUID + productUpdateSchema ; hooks create/update happy-path + garde userId ; ProductDrawer combobox sans UUID hardcodé, POST création, PATCH édition pré-remplie, nom vide rejeté, submitting spinner+disabled, error 409 inline, fallback combobox vide). Suite complète : 15 fichiers / 59 tests verts. `tsc --noEmit` OK, `eslint` OK, `next build` 0 erreur.

## [MEMORY:*] signaux
- [MEMORY:pitfall] Tests hooks TanStack v5 mutations en isolation (renderHook+jsdom) : ne pas tester le rejet via mutateAsync/mutate isolé (unhandled rejection remonte au runner malgré MutationCache.onError) ; couvrir la propagation d'erreur end-to-end au niveau composant. Hooks tests = happy-path + garde d'input.
- [MEMORY:business-rule] Couleur produit NON persistée backend : `ProductResponse`/`ProductCreationRequest`/`ProductUpdateRequest` sans champ `color` ; seule la catégorie porte `color` (`CategoryResponse`). Surcharge couleur produit = UI-only tant qu'un champ backend n'existe pas.
- [MEMORY:pattern] Nommage divergent create vs update produit : POST=`category`(UUID), PATCH=`categoryId`(UUID). Anti-pattern : réutiliser `productCreateSchema` pour le PATCH.

## Recommandations suite
- RECOMMAND_FOLLOWUP : surcharge couleur produit = aperçu local non persisté (pas de champ backend). Si le produit doit porter sa propre couleur → issue backend (ajout `color` sur `ProductCreationRequest`/`ProductUpdateRequest`/`ProductResponse` + migration). Triage estimé : M | domaine products. Hors scope #61.
- Pas de RECOMMAND_TEST_RUNNER (suite frontend légère, 59 tests <7s).
- Pas de RECOMMAND_DB_EXPERT (aucune modif schéma/migration).

STATUS: COMPLETED
