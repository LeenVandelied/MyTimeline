# Mini-plans architect — Sprint 107

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Liste produits + onglets — cohésion 0.50
**Effort :** 4 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprint 106 (ProductsListView, ProductDetailView)

**Vagues :**
- V1 #609 ∥ #524 (fichiers disjoints) → V2 #608 (même `<table>` que #609).

```yaml
issue_609:
  possibly_done: false
  etat_reel_du_code: |
    Moitié livrée : catégorie DÉJÀ fusionnée en mono sous le nom (ProductsListView.tsx:339-359, « handoff §5 » — vérifié par le lead).
    Reste : th en font-medium sentence case (:297-311) contre `.mt-table th` = mono 9px uppercase (core.css:328). Ne livrer que cette partie.
issue_608:
  fichiers_cles: ["frontend/src/components/products/ProductsListView.tsx:303,382", "frontend/src/components/products/ProductSparkline.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E à 390 px"
  possibly_done: false
  etat_reel_du_code: |
    Sparkline `hidden md:table-cell` à :382 ; c'est la colonne événements qui est en sm (:306).
    DEC-S82-010 (--breakpoint-* dans @theme, suite #643) non appliquée : garder les paliers Tailwind par défaut.
issue_524:
  possibly_done: false
  etat_reel_du_code: "Hypothèse : .mt-tab à core.css:260-267 (ProductDetailView.tsx, app/[locale]/(app)/products/page.tsx). a11y-audit.md §8ter:387 exclut déjà l'offset négatif. Mesurer d'abord ; si rien n'est rogné, fermer sans code."
```
