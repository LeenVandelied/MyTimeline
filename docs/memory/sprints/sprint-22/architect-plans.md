# Mini-plans architect — Sprint 22

> Genere par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> RISQUE DUPLICATION : ProductDrawer #61 EXISTE deja — invoquer component-guardian
> pour eviter un composant produit redondant. Drawer categorie doit reutiliser pattern #61/#65.

issue_0068:
  fichiers_cles:
    - frontend/src/components/products/ProductsPage.tsx / ProductList / ProductDetail (nouveaux)
    - frontend/src/app/(...)/produits/page.tsx
    - frontend/src/components/products/ProductDrawer.tsx (EXISTE — reuse #61)
    - integration drawer categorie #62
  couches_touchees: [frontend/components, frontend/app]
  strategie_test: Vitest liste/detail + Playwright CRUD produit + filtre categorie
  risque_regression: MOYEN — L ; reutilise ProductDrawer #61 existant, ne pas dupliquer (invoquer component-guardian)
  ordre_ecriture: [page liste, detail produit, integration ProductDrawer existant, integration drawer categorie #62, filtres, tests]
  zod_dto_sync: reuse schemas produits existants ; verifier alignement PATCH/soft-delete #50
  possibly_done: false
  etat_reel_du_code: "ProductDrawer.tsx + ProductSparkline.tsx + AddProductButton.tsx PRESENTS (composants #61). Page/liste/detail produits : AUCUN fichier dans frontend/src/app produit* (find: rien). Page a construire, drawer a reutiliser."

issue_0062:
  fichiers_cles:
    - frontend/src/components/categories/CategoryDrawer.tsx (nouveau, desktop+mobile)
    - reuse dialogs confirmation #65, pattern ProductDrawer #61
  couches_touchees: [frontend/components]
  strategie_test: Vitest drawer CRUD + reassignation + Playwright desktop/mobile
  risque_regression: MOYEN — reassignation categorie touche ownership V8 (backend #52 livre) ; verifier contrat
  ordre_ecriture: [drawer shell desktop, formulaire CRUD, reassignation, variante mobile bottom sheet, tests]
  zod_dto_sync: schema categorie (verifier #97 @Valid contraintes DTO) aligne backend #52
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — pas de dossier components/categories ni CategoryDrawer trouve"

issue_0186:
  fichiers_cles:
    - backend/.../application/services/ProductServiceImpl.java (L67)
  couches_touchees: [backend/application]
  strategie_test: JUnit createProduct avec request.events == null -> pas de NPE (liste vide toleree)
  risque_regression: FAIBLE — ajout garde null localise
  ordre_ecriture: [null-check/Optional sur getEvents(), test unitaire regression]
  zod_dto_sync: aucun (peut lier #201/#202 contrat mais hors scope ici)
  possibly_done: false
  etat_reel_du_code: "CONFIRME bug reel : ProductServiceImpl.java L67 `request.getEvents().forEach(...)` sans null-check -> NPE si events null. Non corrige."
