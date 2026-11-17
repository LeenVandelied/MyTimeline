# Mini-plans architect — Sprint 106

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Fiche produit — cohésion 0.50
**Effort :** 6 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune (doit précéder S107, S109, S112)

**Vagues :**
- V1 #606 → V2 #607 → V3 #698 : tout séquentiel (les trois touchent ProductDetailView.tsx, worktree partagé).

```yaml
issue_606:
  fichiers_cles: ["frontend/src/components/products/ProductDetailView.tsx:364-390", "frontend/src/styles/ds/components/timeline.css (.mt-drawer__row/__k/__v)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit + vérification navigateur (valeur longue en de)"
  possibly_done: false
  etat_reel_du_code: "Confirmé : grid-cols-1 sm:grid-cols-2 à :364 (énoncé 313) ; dt en text-2xs tracking-widest uppercase sans font-mono à :366,:387. #575 fermée (S84)."
issue_607:
  fichiers_cles: ["frontend/src/components/products/ProductDetailView.tsx:449-485", "frontend/src/styles/ds/components/timeline.css:90"]
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E de contraste (AA sur le texte)"
  risque_regression: "opacity:.45 appliquée à du texte fait tomber l'AA (commentaire timeline.css:389)."
  possibly_done: false
  etat_reel_du_code: "Confirmé : `event.archived && 'mt-evt--archived'` à :455, sur la pastille seule ; aucun critère « passé » dans le code."
issue_698:
  fichiers_cles:
    - "frontend/src/components/products/ProductDetailView.tsx:271"
    - "frontend/app/[locale]/(app)/products/[productId]/loading.tsx"
    - "frontend/app/[locale]/(app)/dashboard/loading.tsx:18-19"
    - "frontend/src/components/products/ProductsListView.tsx:159-161"
    - "frontend/src/components/shared/LoadingSkeleton.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit + mesure au navigateur de la largeur du squelette"
  risque_regression: "Specs de squelette rouges contre `next dev` (pas de préchargement, S91) → valider contre next build + next start."
  possibly_done: false
  etat_reel_du_code: |
    Chemin de l'énoncé FAUX : `frontend/src/app/...` → vrai chemin `frontend/app/[locale]/(app)/...`.
    Confirmé : texte brut à ProductDetailView.tsx:271 ; dashboard/loading.tsx:19 max-w-3xl contre max-w-7xl sur la page (page.tsx:223,239) ;
    aucun prefetch (goToDetail = router.push, :161). Arbitrage onSuccess : décision produit à obtenir par écrit avant de coder.
```
