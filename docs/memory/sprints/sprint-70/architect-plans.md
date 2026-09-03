# Mini-plans architect — Sprint 70

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1.

Surfaces d'édition PARTAGÉES (`EventEditForm` sert création ET édition) — #326 puis #325 en séquence, PAT-S44-001.

```yaml
issue_0326:
  fichiers_cles: ["frontend/src/components/events/NewEventDrawer.tsx", "frontend/src/components/EventEditForm.tsx (surface PARTAGÉE création+édition)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E (aperçu sticky visible au scroll du drawer création ; édition non régressée)"
  risque_regression: "PAT-S44-001 : EventEditForm sert création ET édition — un sticky mal ciblé casse le form d'édition"
  ordre_ecriture: "frontend"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(à déterminer par fullstack-dev)"
```
```yaml
issue_0325:
  fichiers_cles: ["frontend/src/components/events/EventPreviewTimeline.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E visuel clair/sombre (peu de code, surtout vérification de rendu)"
  risque_regression: "même surface que #326 — doit passer APRÈS le repositionnement sticky (Wave 2)"
  ordre_ecriture: "frontend"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(à déterminer par fullstack-dev)"
```
