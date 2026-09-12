# Mini-plans architect — Sprint 11

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

```yaml
issue_0061:
  fichiers_cles:
    - "frontend/src/components/products/ProductDrawer.tsx  # nouveau (remplace AddProducts.tsx)"
    - "frontend/src/components/products/AddProducts.tsx  # supprime/vide"
    - "frontend/src/types/product.ts  # Zod name min(3)->min(1).max(100) — FIX DESYNC confirme"
    - "frontend/src/hooks/useCategories.ts  # nouveau (GET /api/categories)"
    - "frontend/src/hooks/useCreateProduct.ts, useUpdateProduct.ts  # nouveaux (POST / PATCH #50)"
    - "frontend/src/services/categoryService.ts  # nouveau (absent du repo)"
    - "frontend/src/services/productService.ts  # etendre (PATCH)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Zod, hooks mock axios PAT-S7-001) + E2E Playwright (creation/edition, combobox categories)"
  risque_regression: "Suppression AddProducts.tsx casse tout appelant non migre ; combobox vide si #52 non deploye (fallback requis)."
  ordre_ecriture: "categoryService + hooks TanStack -> ProductDrawer -> fix Zod -> suppression AddProducts -> integration dialog #65"
  zod_dto_sync: "OUI (aligner productCreateSchema sur DTO backend #50 : min(1) max(100), forme couleur v3 #44)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — AddProducts.tsx 22.1K present avec min(3) confirme ; pas de categoryService.ts frontend)"

issue_0065:
  fichiers_cles:
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx  # nouveau"
  couches_touchees: ["frontend"]
  strategie_test: "unit (3 variantes, bouton desactive sans reassignation, etat deleting, erreur inline 404/409)"
  risque_regression: "Select reassignation vide si user n'a qu'une categorie -> message explicatif requis (pas blocage silencieux)."
  ordre_ecriture: "frontend — verifier registre composants (AlertDialog Radix existant ?) avant creation"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```

## Dependances
- Depend de S10 : #50 (PATCH produit) + #52 (CRUD categorie + `GET /api/categories` fiable). Si #52 regresse -> combobox vide, fallback UI requis.
- Vague 2 : #61 consomme le `DeleteConfirmDialog` de #65 (integration apres exposition du composant).

## Backlog explicite (reporte hors 5 sprints)
- #62 (Drawer Categorie), #68 (page Produits) — memes hooks/composants, sprint Wave 3 "finition".
- Alternative validee NON retenue : #61 + #62 (au lieu de #61 + #65).
