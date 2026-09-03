# Mini-plans architect — Sprint 73

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1.

#458 ∥ #416 ∥ #298 : 3 fichiers totalement disjoints, 100% parallélisable (cohésion thématique 0 mais risque opérationnel nul).

```yaml
issue_0416:
  fichiers_cles: ["frontend/src/components/categories/CategoryDrawer.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E (coche visible sur pastille sélectionnée, contraste a11y)"
  risque_regression: "BR-CAT : le glyphe ne doit pas fausser la couleur soumise ni casser la sélection"
  ordre_ecriture: "frontend"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(à déterminer par fullstack-dev)"
```
```yaml
issue_0298:
  fichiers_cles: ["frontend/src/components/layout/AppShell.tsx", "frontend/src/components/layout/AppShell.test.tsx", "frontend/src/styles/ds/tokens/spacing.css (--sidebar-width-collapsed)", "frontend/src/styles/globals.css"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (AppShell.test.tsx) + E2E (breakpoint md→lg → sidebar icon-only ~64px)"
  risque_regression: "token mal nommé/positionné casse la largeur sidebar sur desktop (régression layout globale)"
  ordre_ecriture: "frontend : token DS → AppShell → test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — NO-OP vérifié réel : token --sidebar-width-collapsed absent)"
```

# #458 (XS) — pas de bloc YAML requis
# 1 classe Tailwind `break-words` sur h1 `product.name` (~ligne 302) dans `frontend/src/components/products/ProductDetailView.tsx`.
