# Mini-plans architect — Sprint 114

> Généré par /sprint plan 5 (architect, 2026-10-24, base `86337a24`), déroulé à la main par le lead.
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **bugs visibles + suites du S112** ; Phase 0.5 scriptée remplacée par une contre-vérification
> manuelle (architect sur chaque issue, puis lead sur 8 affirmations clés). Numéros de ligne relevés sur `86337a24` : à re-grepper au démarrage.
> i18n : `frontend/public/locales/{fr,en,es,de}/*.json`. Mesures : `/usr/bin/grep` (RTK fausse `grep`, `grep -c`, `wc -l`).

**Thème :** Liste produits et onglets lisibles au clavier — cohésion 1.00 (br-packs : products)
**Effort :** 6 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprint 113 (#836 a touché `ProductsListView.tsx` et `ProductDetailView.tsx`)

**Vagues :**
- V1 : #816 (code + E2E, détient Playwright) ∥ #815 (code + Vitest) ∥ #825 (code + Vitest de structure) — sources disjointes (`dashboard/ProductList.tsx`, `ui/tabs.tsx`, `products/ProductsListView.tsx`).
- V2 : E2E #825, puis E2E #815, à la suite (les trois E2E sèment via `support/products.ts`).

```yaml
issue_825:
  fichiers_cles: ["frontend/src/components/dashboard/ProductList.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E (fr et de, 1024 et 1280 px, nom long + prochain événement long)"
  risque_regression: "Le texte secondaire est caché sous sm (hidden sm:inline) : ne pas casser le mobile."
  ordre_ecriture: "E2E rouge (largeur du nom ≥ seuil), puis min-w-0 / basis plafonnée sur le span secondaire"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — ProductList.tsx:91 nom `min-w-0 flex-1` (base 0) contre :95 secondaire `truncate` en base auto sans plafond (vérifié aussi par le lead)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_815:
  fichiers_cles:
    - "frontend/src/components/ui/tabs.tsx"
    - "frontend/app/[locale]/(app)/products/page.tsx"
    - "frontend/src/components/products/ProductDetailView.tsx"
    - "frontend/e2e/sprint-107-tab-focus-outline.spec.ts"
  couches_touchees: ["frontend (DS)"]
  strategie_test: "unit+E2E (créer tabs.test.tsx, absent ; toBeFocused après ←/→/Home/End)"
  risque_regression: "sprint-107-tab-focus-outline mesure :focus-visible : un .focus() programmatique après une touche doit le garder"
  ordre_ecriture: "test rouge, refs par onglet, .focus() dans onKeyDown (tabs.tsx:40-53)"
  zod_dto_sync: "NON"
  premisse_verifiee: "partielle — défaut confirmé (tabs.tsx:52 select() sans focus) ; SettingsShell N'EST PAS un consommateur (tablist propre qui fait déjà .focus(), SettingsShell.tsx:74, vérifié par le lead) : 2 consommateurs réels sur 3 annoncés"
  possibly_done: false
  etat_reel_du_code: "Retirer SettingsShell du critère d'acceptation (déjà conforme)."

issue_816:
  fichiers_cles:
    - "frontend/src/components/products/ProductsListView.tsx"
    - "frontend/e2e/sprint-107-products-list-mobile.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (640, 1024 et 1280 px, document.scrollWidth == innerWidth)"
  risque_regression: "Garder la troncature sous sm (#608, :385 max-sm:max-w-0) ; le sr-only :463 doit rester lu"
  ordre_ecriture: "E2E rouge, `relative` sur :332, plafond sm: sur la colonne Produit :385"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — :332 `overflow-x-auto` sans relative ; :385 plafond seulement en max-sm"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```
