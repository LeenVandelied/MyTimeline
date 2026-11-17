# Mini-plans architect — Sprint 91

> Généré par /sprint plan 5 -c "focus mvp" (architect, 2026-09-13). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> [V] = vérifié dans le code par l'architect ; [D] = déduit. Numéros de ligne à re-vérifier au démarrage
> (S89 #652 modifie timeline/lib.ts et zoom.ts ; S90 #624 retire un point de montage de frise).

**Thème :** Frise — instant, durée, série
**Vagues :** V1 = #676 ∥ #594 | V2 = #595 (partage `EventPill.tsx` avec #594 ; fantômes ont besoin de `recurrenceEndDate` propagé par #676)
**Cohésion :** 1.00 · **Migrations :** aucune · **Dépend de :** S89 (#652), S90 (#624)
**Rappel :** `TimelineView.tsx` pèse 74,4 Ko (pas 58) — ne pas y mettre deux agents en parallèle.

```yaml
issue_676:
  fichiers_cles: ["frontend/src/types/event.ts:187-220", "frontend/src/components/timeline/TimelineEditHost.tsx:87-90"]
  couches_touchees: [types, timeline]
  strategie_test: "unit (propagation) + E2E sprint-82-recurrence-capped-hint, sprint-71-edit-preview-pinned"
  risque_regression: "hint de plafond affiché à tort si la borne n'arrive pas jusqu'au formulaire"
  possibly_done: false
  etat_reel_du_code: "[V] conforme à l'énoncé : champ absent du view-model, pré-remplissage forcé à null"
issue_594:
  fichiers_cles: ["frontend/src/components/timeline/zoom.ts:218,228", "frontend/src/components/timeline/EventPill.tsx:85-129", "frontend/src/styles/ds/components/timeline.css (.mt-tlv__evt-outside)"]
  couches_touchees: [timeline, ds-css]
  strategie_test: "unit géométrie + E2E : TOUTES les specs qui citent les pills (grep data-event-title|timeline-event|mt-evt — 13 au plan)"
  risque_regression: "widthPx alimente le rangement en lanes et la virtualisation"
  possibly_done: false
  etat_reel_du_code: "[V] aucune branche 'single' dans EventPill/TimelineView ; minWidth=6 ; rendu mobile à déterminer par fullstack-dev"
issue_595:
  fichiers_cles: ["frontend/src/components/timeline/EventPill.tsx", "frontend/src/components/events/previewTimeline.ts:76 (nextOccurrenceStart)", "frontend/src/components/events/EventPreviewTimeline.tsx:202-211 (référence)", "frontend/src/styles/ds/components/timeline.css:88,96", "frontend/src/components/timeline/TimelineSidebar.tsx (légende, DEC-S85-002)"]
  couches_touchees: [timeline, events, ds-css]
  strategie_test: "unit occurrences + E2E + vérification navigateur (chevauchement de séries)"
  risque_regression: "multiplication des nœuds DOM : fantômes à borner à la fenêtre visible"
  possibly_done: false
  etat_reel_du_code: "[V] classes DS consommées seulement par EventPreviewTimeline ; aucun ↻ dans EventPill ; [D] l'API renvoie une ligne par série (NON vérifié)"
```
