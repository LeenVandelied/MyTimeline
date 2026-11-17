# Mini-plans architect — Sprint 112

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Cibles tactiles et focus mesurés — cohésion 0.53
**Effort :** 5 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprints 105, 106, 107 (frise, ProductDetailView)

**Vagues :**
- V1 #768 → V2 #767 → V3 #700 : tout séquentiel (centré Playwright, exclusif à 1 agent).

```yaml
issue_768:
  possibly_done: false
  etat_reel_du_code: "Confirmé : measureControls défini 3 fois (sprint-99:71, sprint-101:63, sprint-102:56), expectHitbox seulement dans sprint-101:190. Créer e2e/support/touch-targets.ts."
issue_767:
  fichiers_cles:
    - "frontend/src/components/products/ProductsListView.tsx:263"
    - "frontend/src/components/products/CategoriesView.tsx:150"
    - "frontend/src/components/products/ProductDetailView.tsx:489"
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx:396"
    - "frontend/src/lib/touchTarget.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E à 375 px (via le helper de #768)"
  possibly_done: false
  etat_reel_du_code: "Confirmé : aucune spec ne mesure ces 4 zones ; sprint-102:155 clique timeline-event-more sans le mesurer. CategoriesView est dans components/products/."
issue_700:
  fichiers_cles: ["frontend/src/components/shared/EmptyState.tsx:102", "frontend/src/components/shared/LoadingSkeleton.tsx:113", "frontend/e2e/sprint-90-first-contact.spec.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E (sans mock du tiroir) + rapport manuel lecteur d'écran"
  risque_regression: "Volet VoiceOver/NVDA non exécutable par un agent (NVDA = Windows) : à faire par le dev."
  possibly_done: false
  etat_reel_du_code: "Confirmé : sprint-90-first-contact vérifie le focus seulement après avoir vidé la recherche (:263), jamais au retour d'annulation/création dans le tiroir. role=status déjà présent sur les 2 composants."
```
