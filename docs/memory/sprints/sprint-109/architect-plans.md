# Mini-plans architect — Sprint 109

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Tableau de bord : sur-titres et nettoyage — cohésion 0.50
**Effort :** 6 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprint 106 (#606) et Sprint 108 (dashboard.json, KpiMarginalia)

**Vagues :**
- V1 #632 ∥ #697 (disjoints) → V2 #664 (CompactAgenda, dashboard.json partagés avec V1).

```yaml
issue_632:
  fichiers_cles:
    - "frontend/src/components/dashboard/GreetingHeader.tsx:49"
    - "frontend/src/components/dashboard/CompactAgenda.tsx:126,148"
    - "frontend/src/components/dashboard/MobileDrawer.tsx:81,88"
    - "frontend/app/[locale]/(app)/timeline/page.tsx:64"
    - "frontend/app/[locale]/(app)/timeline/loading.tsx:32"
    - "frontend/src/components/products/ProductDetailView.tsx:464"
  couches_touchees: ["frontend"]
  strategie_test: "unit (section-titles.test.tsx) + E2E en de"
  possibly_done: false
  etat_reel_du_code: |
    Liste de l'énoncé périmée : ProductCarousel, ProductList, WeekAgenda, KpiMarginalia, DensityRibbon déjà conformes (DensityRibbon.tsx:90 = .mt-eyebrow).
    7 sur-titres écrits à la main restent ailleurs (liste ci-dessus). #575 fermée.
issue_664:
  possibly_done: false
  etat_reel_du_code: "Les 6 sections n'ont qu'un h2 (WeekAgenda:70, KpiMarginalia:53, ProductList:40, CompactAgenda:97, ProductCarousel:53, ProductDetailView:413). Contenu cible absent du dépôt → le LEAD le relève dans la maquette (e8ce9db5…) avant le briefing."
issue_697:
  fichiers_cles:
    - "frontend/src/components/products/AddProductButton.tsx"
    - "frontend/src/components/layout/AppShell.tsx:125"
    - "frontend/public/locales/*/dashboard.json:80 (recentEvents)"
    - "frontend/app/[locale]/(app)/products/page.tsx:50"
    - "frontend/app/[locale]/(app)/products/[productId]/page.tsx:36"
    - "frontend/e2e/sprint-100-fab-clearance.spec.ts:84,90,102"
    - "frontend/e2e/sprint-42-events.spec.ts:20-21"
    - "docs/memory/decisions.md:884"
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E sprint-100-fab-clearance"
  risque_regression: "sprint-100-fab-clearance.spec.ts:102 attend products-page-loading à 0 : supprimé, le test devient vacant sans rougir → retirer aussi la ligne loading du spec."
  possibly_done: false
  etat_reel_du_code: "Chemins de l'énoncé FAUX (`frontend/src/app/...` → `frontend/app/...`, lignes 50/36, AppShell:125). Consommateur de test non signalé : fab-clearance."
```
