# Audit tests — Sprint 93

> Généré en fin de Phase 6 par le lead. Un marqueur de couverture manquante dans le tableau ci-dessous bloquerait l'ouverture de la PR ; il n'y en a aucun.

## Couverture par règle métier

| BR | Description | Flux inter-systèmes | Unit backend | Intégration | Vitest | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-PRO-007 (amendée) | L'archivage produit n'est plus définitif : restauration exposée | OUI | ✅ | ✅ | ✅ | ✅ | ✅ |
| BR-PRO-011 (créée) | Lecture des archivés et restauration : scope utilisateur porté par la requête native, 404 uniforme | OUI | ✅ | ✅ `ProductRestoreIntegrationTest` (dont cas cross-tenant) | ✅ | ✅ `sprint-93-restore-product` | ✅ |
| BR-PRO-004 | Le `{userId}` du path fait autorité (403 si ≠ JWT) | OUI | ✅ | ✅ `ProductControllerOwnershipTest` | n/a | n/a | ✅ |
| BR-CAT-008 (créée) | Compteurs actifs / archivés servis par `GET /api/categories`, scopés à l'appelant | OUI | ✅ | ✅ `CategoryDeleteReassignIntegrationTest` | ✅ `CategoriesView.test.tsx` | ✅ `categories.spec.ts` | ✅ |
| BR-CAT-005 / DEC-S89-001 | Un produit archivé occupe toujours sa catégorie (repli 409 → réassignation) | OUI | ✅ | ✅ | ✅ | ✅ (cas dédié conservé) | ✅ |
| PIT-S92-004 | Mise à jour en place après mutation, sans rechargement | NON | n/a | n/a | ✅ | ✅ | ✅ |

## Tests créés ou modifiés
- Backend : `ProductRestoreIntegrationTest` (neuf), `ProductControllerOwnershipTest`, `ProductServiceImplTest`, `CategoryControllerTest`, `CategoryDeleteReassignIntegrationTest`.
- Frontend : `ArchivedProductsView.test.tsx` + `.intl.test.tsx`, `RestoreProductDialog.test.tsx`, `useRestoreProduct.test.tsx`, `useArchiveProduct.test.tsx`, `CategoriesView.test.tsx`, `DeleteConfirmDialog.intl.test.tsx`.
- E2E : `sprint-93-restore-product.spec.ts` (neuf), `categories.spec.ts` (adapté, repli 409 conservé).

## Résultats de run
- Backend : **632 tests, 632 passés, 0 échec** (baseline S92 : 627).
- Frontend Vitest : **1824 passés** (baseline après #711 : 1818) · `tsc` 0 · `next lint` 0 · `format:check` vert.
- E2E, suite complète jouée par le lead contre `next build` + `next start` (port 3100, backend e2e bâti depuis HEAD, base recréée à vide) : **410 passés / 2 échoués / 8 sautés / 1 non exécuté**, en 2,8 min.

### Les 2 échecs, tous deux hors périmètre du sprint
1. `sprint-77-theme-visual.spec.ts:620` — contrôle négatif d'armement d'une comparaison de captures. Il échoue **mécaniquement** sur macOS avec `--ignore-snapshots` (son garde-fou refuse d'écrire une référence) : comportement attendu hors Linux. La CI Linux tranche.
2. `sprint-84-palette.spec.ts:128` — flake préexistant mesuré ~2 échecs sur 5 sur `dev` comme sur branche (A/B du S90). Aucun fichier de ce sprint ne touche la palette ni le formulaire d'événement.

## Couverture des testids ajoutés
7 testids statiques ajoutés. 5 sont cités par une spec E2E. Les 2 restants — `product-restore-error` et `products-archived-error` — sont des états d'erreur couverts par `RestoreProductDialog.test.tsx` et `ArchivedProductsView.test.tsx` ; pas de lacune de couverture, le chemin d'erreur est testé au niveau unitaire.

## Conclusion
Couverture complète sur les règles métier touchées, aucune ligne du tableau sans test. Suite E2E verte à l'exception de deux cas connus et étrangers au sprint. Prêt pour la PR.
