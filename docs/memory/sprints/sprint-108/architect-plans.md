# Mini-plans architect — Sprint 108

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Tableau de bord : ruban et « En bref » — cohésion 0.70
**Effort :** 5 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune

**Vagues :**
- V1 #623 ∥ #640 ∥ #699 (fichiers disjoints) ; dashboard.json partagé #623/#640 → git add ciblé ; E2E l'un après l'autre.

```yaml
issue_623:
  fichiers_cles: ["frontend/src/components/dashboard/DensityRibbon.tsx", "frontend/src/components/timeline/Minimap.tsx (viewport glissable existant, :8-35)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E (pointeur desktop, défilement tactile)"
  risque_regression: "Mutualiser le glisser de Minimap touche la frise (virtualisation, zoom) : ne pas changer le contrat de Minimap."
  possibly_done: false
  etat_reel_du_code: "Confirmé : aucun onPointer* dans DensityRibbon.tsx, overflow-x-auto à :127. Minimap.tsx a déjà un viewport déplaçable souris+clavier. Synchro avec la frise à trancher."
issue_640:
  fichiers_cles: ["frontend/src/components/dashboard/KpiMarginalia.tsx:64-68", "frontend/src/hooks/useDashboardData.ts:26,47-60,95-108", "frontend/public/locales/{fr,en,es,de}/dashboard.json:65"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (compte vide, ex æquo sur la catégorie la plus chargée)"
  possibly_done: false
  etat_reel_du_code: |
    currentStreak à KpiMarginalia.tsx:66-67 et useDashboardData.ts:105 ; aucune des 3 métriques du handoff n'existe,
    toutes calculables côté frontend. Définition de « couverture en cours » : à déterminer par fullstack-dev avec la maquette.
issue_699:
  possibly_done: false
  etat_reel_du_code: |
    Moitié livrée : dashboard-open-timeline porte déjà TOUCH_TARGET_HITBOX (44×44 < 768 px, #754, DensityRibbon.tsx:107-113 — vérifié par le lead).
    Reste l'arbitrage du token de piste vide (border-rule-emphasis, EmptyState.tsx:88) : décision design d'abord.
```
