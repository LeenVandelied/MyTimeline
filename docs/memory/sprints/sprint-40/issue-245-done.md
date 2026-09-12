# Issue #245 — deleteCategory : invalidation TanStack Query manquante

**Vague :** 1 (parallèle avec #210) | **Taille :** S | **Modèle :** opus/high

## Commits
- `8183d1a` — :bug: Invalider le cache TanStack après suppression de catégorie (#245)

## Résumé
Bug : `deleteCategory` appelé en service brut sur 2 call sites → aucune invalidation TanStack, listes périmées (E2E #218 forçaient `reload()`).
Fix : nouveau hook `frontend/src/hooks/useDeleteCategory.ts` (useMutation symétrique à `useCreateCategory`/`useUpdateCategory`), `onSuccess` invalide `queryKeys.categories.all` + `queryKeys.products.all`. Les 2 call sites (`CategoriesView.tsx:66`, `CategoryDrawer.tsx:230`) câblés via `mutateAsync` ; imports service supprimés.

## Fichiers clés
- `frontend/src/hooks/useDeleteCategory.ts` (nouveau) + `.test.tsx`
- `frontend/src/components/products/CategoriesView.tsx` + test adapté
- `frontend/src/components/categories/CategoryDrawer.tsx` + test adapté
- `frontend/e2e/categories.spec.ts` (reload() workaround retiré)

## Choix technique
Invalidation par **préfixe** `queryKeys.products.all` (`['products']`) COUVRE `products.withEvents(userId)` — évite de threader `userId` dans le hook (CategoryDrawer ne l'a pas). Même convention que `useUpdateCategory`. `mutateAsync` propage le rejet → `DeleteConfirmDialog` (#65) affiche l'erreur inline (pas de régression flux d'erreur).

## Tests
- 431/431 vitest OK, tsc 0 erreur.
- `useDeleteCategory.test.tsx` : appel service + invalidation des 2 keys onSuccess.
- E2E `categories.spec.ts` mis à jour mais **NON exécuté localement** (requiert backend :8080 + Postgres → job CI `e2e`). À valider en CI.

## [MEMORY:pattern]
Invalidation ciblée `products.withEvents(userId)` impossible quand le composant n'a pas `userId` (ex. CategoryDrawer) → invalider le **préfixe** `queryKeys.products.all` (`['products']`) ; le matching de préfixe TanStack couvre toutes les sous-clés produits. Anti-pattern : threader `userId` juste pour l'invalidation, ou éparpiller des littéraux de query key.

## Recommandations suite
Pas de RECOMMAND_TEST_RUNNER (suite frontend légère <15s). Pas de RECOMMAND_DB_EXPERT (frontend pur). Pas de RECOMMAND_SECURITY. E2E à valider en CI (backend requis).

STATUS: COMPLETED
