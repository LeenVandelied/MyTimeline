# Mini-plans — Sprint 98

> Rédigés par le LEAD au démarrage (2026-09-21) : aucun `/sprint plan` n'a produit de mini-plan pour ce
> sprint (milestone #99 et labels posés au triage de clôture du S97). Énoncés contre-vérifiés dans le code
> avant spawn. Cohésion 1.00 (un seul pack : frise / `epic:events`, frontend seul).

**Vagues :** V1 = #747 (Playwright exclusif) ∥ #748 (Vitest seul) ∥ ui-design (arbitrage de charte #746, lecture seule)
| V2 = #746 (Playwright exclusif ; après #748, même fichier ; après arbitrage du dev)
**Migrations Flyway :** aucune

```yaml
issue_748:
  fichiers_cles:
    - "frontend/src/components/timeline/lane-layout.test.ts"
    - "frontend/src/components/timeline/lane-layout.ts (seulement si un cas casse la règle « première rangée libre »)"
  couches_touchees: ["frontend-timeline"]
  strategie_test: "unit (Vitest)"
  risque_regression: "nul si tests seuls ; si correction de layoutLane, toute la géométrie d'empilage S97 (sprint-97-lane-stacking)"
  ordre_ecriture: "tests → constat → correction éventuelle + contrôle négatif"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — lecture du lead : widthPx=0 ⇒ end=start, un 2e événement au même leftPx ouvre une rangée (gap 8 > 0) ; leftPx<0 sans garde ; identiques ⇒ 2 rangées, ordre d'entrée. Probablement aucun correctif."

issue_747:
  fichiers_cles:
    - "frontend/src/components/timeline/useTimelineMobileState.ts (hook PARTAGÉ portrait + paysage : zoomIn/zoomOut/pinch passent tous par son reducer)"
    - "frontend/src/components/timeline/TimelineView.tsx:1129-1266 (référence desktop #449 : ancre en JOURS, re-projection en useLayoutEffect sur dayWidth)"
    - "frontend/e2e/sprint-98-mobile-zoom-anchor.spec.ts (nouvelle)"
  couches_touchees: ["frontend-timeline-mobile"]
  strategie_test: "unit (fonction pure de re-projection) + E2E portrait ET paysage (jsdom ne clampe pas scrollLeft : un test unitaire de scroll ne prouve rien)"
  risque_regression: "report de position à la ROTATION (setScrollNode, branche fraction) ; synchro minimap (effet rawOnScroll sur dayWidth) ; centrage initial sur aujourd'hui"
  ordre_ecriture: "fonction pure + tests → useLayoutEffect dans le hook → E2E + contrôle négatif → specs mobiles existantes"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Confirmé absent : le hook ne fait que resynchroniser la minimap quand dayWidth change (l.323-326), aucune re-projection du scrollLeft. Écart d'énoncé : « adapter séparément pour 2 frises » — un seul hook couvre les deux ; la taille M est probablement surestimée."
  decision_lead: "ancre = date au CENTRE de la zone de piste visible (pas le bord gauche du desktop) : sur 360-850 px de large, l'objet regardé est au centre, et le pinch agit au centre. À consigner en DEC-S98-00x."

issue_746:
  fichiers_cles:
    - "frontend/src/components/timeline/lane-layout.ts (réservation widthPx = PIN_FOOTPRINT_PX 100/90)"
    - "frontend/src/components/timeline/zoom.ts (PIN_FOOTPRINT_PX), useTimelineMobileState.ts:215"
    - "frontend/src/components/timeline/EventPill.tsx:200 (.mt-tlv__evt-outside, libellé extérieur de secours)"
    - "frontend/src/styles/ds/components/timeline.css:353 (.mt-evt-pin__label max-width:240px + ellipsis)"
  couches_touchees: ["frontend-timeline", "frontend-timeline-mobile", "ds-css"]
  strategie_test: "unit (réservation) + E2E hit-test de non-chevauchement desktop et mobile"
  risque_regression: "nombre de rangées (hauteur de lane) si la réservation grandit ; références visuelles Linux"
  ordre_ecriture: "arbitrage de charte (ui-design V1 + dev) → réservation → CSS → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Confirmé : la réservation ne connaît que PIN_FOOTPRINT_PX ; le libellé extérieur et les pins > 100/90 px ne sont pas réservés."
```
