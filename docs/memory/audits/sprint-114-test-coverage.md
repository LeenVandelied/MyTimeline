# Audit tests — Sprint 114

> Généré en fin de Phase 6 par le lead. Toutes les mesures ci-dessous ont été rejouées par le lead depuis le worktree
> (`sprint/114`), aucune n'est reprise d'un rapport de subagent.

## Couverture par issue

Aucune BR métier impactée (correctifs de présentation et d'accessibilité clavier, frontend seul, pas de flux inter-systèmes).

| Issue | Sujet | Cross-system flow | Vitest | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| #825 | Nom produit lisible dans « Tes produits » (dashboard) | NON | ✅ `ProductList.test.tsx` 4/4 (rouges avant correctif) | ✅ `sprint-114-dashboard-product-name` 4/4 (fr/de × 1024/1280) | N/A |
| #815 | Focus suit la sélection des onglets DS (←/→/Home/End) | NON | ✅ `tabs.test.tsx` 15/15 (9 rouges avant correctif) | ✅ `sprint-114-tabs-focus-follows` 4/4 (/products + fiche produit, 1280/390) | N/A |
| #816 | Liste produits : pas de débordement au-delà de sm, sr-only clippés | NON | ✅ `ProductsListView.test.tsx` 31/31 (tests de structure rouges avant correctif) | ✅ `sprint-114-products-list-overflow` 7/7 (640/768/1024/1280 avec largeur visible du nom ≥ seuil, 375 #608, 2 auto-contrôles) | N/A |

## Tests créés
- frontend/src/components/dashboard/ProductList.test.tsx (#825)
- frontend/src/components/ui/tabs.test.tsx (#815)
- frontend/src/components/products/ProductsListView.test.tsx — test de structure ajouté (#816)
- frontend/e2e/sprint-114-dashboard-product-name.spec.ts
- frontend/e2e/sprint-114-tabs-focus-follows.spec.ts
- frontend/e2e/sprint-114-products-list-overflow.spec.ts

## Résultats runs (lead, HEAD final be209310 + 2 commits docs)
- Second passage après correction de review (#816, densité md..lg), base e2e recréée à neuf :
  - `next build` OK ; Vitest 177 fichiers, 2322/2322 ; `npm run format:check` OK
  - E2E complète : 653 passés / 1 échec / 8 sautés en 5,1 min — même échec attendu (`sprint-77-theme-visual:620`, armement visuel darwin) ; sprint-114 : 4 + 4 + 7 verts ; sprint-107 : 3 + 5 verts.

## Premier passage (lead, HEAD 77126b1a)
- `next build` (NEXT_PUBLIC_API_URL=/api, lint bloquant inclus) : OK
- Vitest : 177 fichiers, 2321/2321 passés
- `npm run format:check` : OK
- E2E suite complète contre `next build` + `next start` (backend e2e :8086, `--ignore-snapshots`) : 651 passés / 1 échec / 8 sautés en 4,1 min.
  - L'unique échec est `sprint-77-theme-visual:620` (armement de la comparaison de captures) : attendu sur darwin avec `--ignore-snapshots`, la comparaison de captures est jugée par la CI Linux.
  - Specs voisines rejouées dans la suite : `sprint-107-products-list-mobile` 3/3, `sprint-107-tab-focus-outline` 5/5, plus les 19 autres specs qui citent `products-table` / `products-tabs` / `product-detail-filter`.
  - Aucune référence de capture darwin écrite (`git status` propre).
- Coverage E2E : 2 testids neufs (`dashboard-product-list-name`, `dashboard-product-list-next`), tous deux cités par une spec.

## Conclusion
Prêt pour PR. Pas de backend ni de migration : backend e2e réutilisé depuis l'image S113 (0 commit `backend/` depuis sa création).
