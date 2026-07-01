# Audit tests — Sprint 11

> Généré en fin de Phase 6. Sprint 100% frontend (#65 DeleteConfirmDialog, #61 ProductDrawer).
> Aucune modif backend, aucune migration Flyway. Aucun marqueur de couverture bloquant (cf. Conclusion).

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Component/RTL frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-CAT-002 | Suppression catégorie inexistante → 404 inline | OUI | ✅ (S10, inchangé) | ✅ (DeleteConfirmDialog.test) | ⚠ harness absent | ⚠ GAP (voir note) |
| BR-PRO-001 | Nom produit 1..100 (fix désync Zod min(1)) | NON (validation front) | ✅ (S10, inchangé) | ✅ (product.test.ts) | n/a | n/a |
| BR-PRO-002 | Catégorie obligatoire/existante (combobox API) | OUI | ✅ (S10, inchangé) | ✅ (ProductDrawer.test) | ⚠ harness absent | ⚠ GAP (voir note) |
| BR-CAT-007 | Chargement dynamique catégories (fin UUID hardcodés) | OUI | ✅ (S10 #52) | ✅ (ProductDrawer.test — combobox sans UUID) | ⚠ harness absent | ⚠ GAP (voir note) |
| BR-PRO-009 | PATCH partiel produit (name/categoryId) | OUI | ✅ (S10 #50) | ✅ (useUpdateProduct.test + ProductDrawer édition) | ⚠ harness absent | ⚠ GAP (voir note) |
| BR-PRO-010 | Catégorie cible ownership → 404/409 inline | OUI | ✅ (S10 #50) | ✅ (ProductDrawer 409 inline) | ⚠ harness absent | ⚠ GAP (voir note) |

> **Note E2E — condition pré-existante, PAS une régression S11 :** le projet n'a AUCUN harness E2E réel
> (`frontend/e2e/` = `.gitkeep` vide, cf. cp-frontend). Les flux cross-system de S11 (création/édition produit,
> suppression+réassignation catégorie) consomment des endpoints backend déjà livrés ET couverts par des tests
> d'intégration backend en S10 (#50, #52). La couche UI ajoutée en S11 est couverte au niveau composant (RTL,
> API axios mockée). Le « E2E métier » (parcours réel front→back→DB) reste non couvert faute d'infrastructure
> Playwright — gap connu et global, à traiter par un sprint/issue dédié `/create-e2e` (voir Follow-ups).
> Aucun `data-testid` nouveau introduit dans le diff (composants requêtés par rôle ARIA) → heuristique Phase 8 = OK.

## Tests créés
- `frontend/src/components/shared/DeleteConfirmDialog.test.tsx` (13 tests — 3 variantes, réassignation, deleting, 404/409 inline)
- `frontend/src/components/products/ProductDrawer.test.tsx` (combobox sans UUID, POST création, PATCH édition, nom vide rejeté, submitting, 409 inline, fallback vide)
- `frontend/src/hooks/useCreateProduct.test.tsx`, `useUpdateProduct.test.tsx` (happy-path + garde userId)
- `frontend/src/types/product.test.ts` (Zod nom vide/min(1)/max(100)/UUID + productUpdateSchema)
- `frontend/vitest.setup.ts` (stubs Radix Pointer Capture — infra test partagée)

## Résultats runs
- Frontend (Vitest) : **59/59 passed, 0 failed, 0 erreur TS** (test-runner isolé, 2.79s)
- Backend : non exécuté — aucune modif backend dans le sprint
- E2E : aucun spec réel (`frontend/e2e/` vide)

## Conclusion
Prêt pour PR côté couverture unit/composant (59/59 verts, build OK). **Aucun marqueur bloquant** :
le seul gap est le harness E2E, condition pré-existante et globale au projet (pas une régression S11),
tracée comme follow-up `/create-e2e` post-merge. Les endpoints backend sous-jacents sont déjà testés (S10).
