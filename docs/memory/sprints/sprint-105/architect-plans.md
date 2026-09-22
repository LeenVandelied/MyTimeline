# Mini-plans architect — Sprint 105

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Frise : gouttière, zébrures, recadrage — cohésion 0.50
**Effort :** 6 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune

**Vagues :**
- V1 : #674 + #429 portées par le MÊME agent (même ligne timeline.css:258).
- V2 : #596 (timeline.css) ∥ #597 (TimelineView.tsx, zoom.ts) ; E2E l'un après l'autre.
- 4 issues : #429 et #596 touchent les règles que #674 décale (timeline.css:247,258,308). #418 fermée au plan (déjà livrée).

```yaml
issue_674:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/spacing.css:48"
    - "frontend/src/components/timeline/TimelineView.tsx:205 (LANE_TRACK_OFFSET_PX = 168)"
    - "frontend/src/components/timeline/TimelineView.test.tsx (test de dérive CSS↔JS)"
    - "frontend/src/styles/ds/components/timeline.css:34,216,233,258,306,308,318"
    - "frontend/e2e/sprint-91-recurrence-marks.spec.ts:639 (168 en dur — absent de l'énoncé)"
    - "frontend/e2e/timeline.spec.ts:1041-1045,1194-1201,1309"
    - "frontend/e2e/sprint-85-timeline-group-head.spec.ts, sprint-63-de-overflow-audit.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit (dérive) + E2E géométrie"
  risque_regression: "sprint-91-recurrence-marks (168 en dur) rougira ; commentaires de timeline.spec deviennent faux."
  ordre_ecriture: "grep `168\\b` (tous appelants) → token + constante JS → specs → minimap au navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    168 confirmé (spacing.css:48, TimelineView.tsx:205). Gouttière mobile = token distinct (--lane-header-w-m = 120), non concernée.
    176 px non présent dans graphite-handoff.md ; source : docs/memory/sprints/sprint-85/maquette-vue-timeline.md:73,90 (LH = 176px).
issue_429:
  possibly_done: false
  etat_reel_du_code: "Confirmé : `width:var(--lane-header-w, 160px)` à timeline.css:258 (énoncé :161). Même commit que #674."
issue_596:
  possibly_done: false
  etat_reel_du_code: |
    Grille verticale à timeline.css:247 (.mt-tlv__lane), même motif :37 (.mt-lane__track) et :743 (.mt-tlm__lane mobile).
    Cible handoff : zébrures ink 2.6% (graphite-handoff.md:126). À trancher au démarrage : desktop seul ou mobile aussi.
issue_597:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx:1337-1403,1483-1485,1764-1769"
    - "frontend/src/components/timeline/zoom.ts:48-90"
    - "frontend/src/components/timeline/TimelineSidebar.tsx"
    - "frontend/public/locales/*/dashboard.json:122 (dashboard.timeline.help.fullscreen)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (reducer FIT) + E2E"
  risque_regression: "Plein écran verrouillé par sprint-94-fullscreen-overlays, sprint-94-modal-shortcuts, sprint-85-timeline-toolbar, TimelineView.fullscreen-overlays.test.tsx ; le bouton timeline-fullscreen reste le déclencheur."
  ordre_ecriture: "action FIT dans zoom.ts → réaffectation de F → aide i18n → specs plein écran"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    case 'f'/'F' → toggleFullscreen() à TimelineView.tsx:1483-1485 (énoncé :1051) ; zoom.ts sans FIT ni reset (:48-55).
    #593 (zoom continu, ouverte, hors plan) touche le même reducer : garder FIT compatible avec un pxPerDay continu.
```
