# Audit tests — Sprint 22

> Généré en fin de Phase 6. Aucune couche manquante bloquante (gate Phase 9 franchi). E2E métier des nouveaux
> parcours produits/catégories = **différé post-merge via `/create-e2e`** (Phase 8, review-protocol A.4).

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Component front | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-PRO-005 | Produit sans événement autorisé (null-guard) | NON | ✅ | — | ⚠ N/A | ⚠ N/A |
| BR-CAT-001 | Nom catégorie obligatoire (Zod) | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |
| BR-CAT-002 | Suppression protégée + réassignation | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |
| BR-CAT-004 | Unicité nom → 409 inline | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |
| BR-PRO-001 | Nom produit obligatoire (liste + fiche) | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |
| BR-PRO-006 | Listing filtré par utilisateur | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |
| BR-CAT-007 | Chargement dynamique des catégories | OUI | (existant) | ✅ | ❌ | ⏳ /create-e2e |

- `(existant)` = contrat backend déjà couvert par la suite backend des sprints antérieurs (#50/#52) ; ce sprint est frontend pur côté produits/catégories, sauf #186.
- `⏳ /create-e2e` = flux cross-system dont la couverture E2E métier est **planifiée post-merge** (voir §Suivi E2E). Couverture composant Vitest présente pour chaque BR → aucune couche non couverte bloquante.

## Tests créés

**Backend (#186)**
- `backend/src/test/java/.../application/services/ProductServiceImplTest.java` → `createProduct_nullEvents_doesNotThrow_savesProductWithNoEvents` (BR-PRO-005).

**Frontend (#62)**
- `frontend/src/components/categories/CategoryDrawer.test.tsx` — 8 tests (create name/color/description, sans couleur, Zod nom vide, edit préremplissage+PATCH, 409 inline, delete+réassign, système masqué, aperçu live).

**Frontend (#68)**
- `frontend/src/components/products/ProductsListView.test.tsx` — liste, recherche/tri locaux, sparkline, actions.
- `frontend/src/components/products/ProductDetailView.test.tsx` — sous-frise filtrée amont, fiche, edit/delete.
- `frontend/src/components/products/CategoriesView.test.tsx` — cards compteur+palette, ouverture drawers.

## Résultats runs (lead, inline, quiet wrapper)

- **Backend** : `./scripts/test-quiet.sh backend` → **270 run, 0 failure, 0 error** — BUILD SUCCESS.
- **Frontend** : `./scripts/test-quiet.sh frontend` → **305 tests / 43 fichiers, 305 passed, 0 failed** (6.93s).
- **E2E** : `frontend/e2e/` contient golden-path + settings-*.spec.ts (parcours existants). Aucun nouveau spec produits/catégories dans ce sprint (voir §Suivi E2E).
- **Build** : `next build` OK (#68 a corrigé un blocage lint hérité de #62 — commit e6bd60f).

## Suivi E2E (Phase 8 — coverage-E2E)

46 nouveaux `data-testid` ajoutés (produits + catégories), **aucun encore référencé** dans `frontend/e2e/`.
→ **MAJEUR non bloquant** : planifier `/create-e2e <PR>` **après merge** (invocation manuelle, bug nested-skills connu).
Parcours à couvrir : CRUD catégorie (drawer create/edit/delete+réassignation), navigation liste↔détail produit, création/édition produit via drawer depuis la page.

## Conclusion

**Prêt pour PR.** Suites backend + frontend vertes, aucune régression, aucune couche de test manquante bloquante.
Aucun signal `RECOMMAND_DB_EXPERT`/`RECOMMAND_SECURITY` (pas de migration, pas de nouvelle surface auth/PII — #186 = garde locale sur service produits ; #62/#68 = frontend consommant des endpoints existants #50/#52).
Réserve unique : couverture E2E métier des nouveaux parcours différée post-merge (`/create-e2e`).
