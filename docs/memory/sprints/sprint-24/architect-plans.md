# Mini-plans architect — Sprint 24

> Généré par /sprint plan 5 (architect). Lu par /sprint start 24 Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> Thème : a11y Timeline (frise clavier + lecteur d'écran). Cohésion 0.78. Migrations : aucune.

```yaml
issue_0081:
  fichiers_cles: ["frontend/src/components/timeline/TimelineView.tsx", "frontend/src/components/timeline/EventPill.tsx", "frontend/src/components/timeline/lib.ts", "frontend/src/styles/ds/components/timeline.css"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (vitest RTL: Tab/flèches/Home/End + focus-visible) + a11y assertions role/aria-live"
  risque_regression: "casser la sélection tactile mobile (useTimelineMobileSelection) ou le scroll horizontal en ajoutant le roving tabindex"
  ordre_ecriture: "frontend (pattern roving sur EventPill -> live-region dans TimelineView -> CSS focus-visible)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    PARTIEL. EventPill.tsx:36 = <button aria-label> (activable clavier nativement) MAIS pas de
    tabIndex/roving, pas de onKeyDown flèches, aucune aria-live. Accordéon catégorie a aria-expanded
    (TimelineView.tsx:349). Minimap DÉJÀ roving (role=slider, Minimap.tsx:80-99). EventDrawer focus-trap OK.
    Reste: naviguer pastille-à-pastille au clavier + annonces vocales (zoom/sélection).
    Reco: pattern grid/listbox roving keyé resource.id x jour, NE PAS re-faire Minimap.

issue_0197:
  fichiers_cles: ["frontend/src/components/timeline/TimelineView.test.tsx", "docs/frontend/keyboard-patterns.md (a creer)", ".claude/rules-jit/ux-patterns.md"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (couvre Tab-nav pastilles + live-region ajoutés par #81)"
  risque_regression: "aucun (doc + tests)"
  ordre_ecriture: "frontend (après #81)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Raccourcis globaux T/[/]/+/-/F/Échap déjà testés (TimelineView.test.tsx:126-188).
    MANQUE: doc design des patterns, tests Tab-nav pastilles, tests live-region. Dépend de #81 pour exister.

issue_0082:
  fichiers_cles: ["frontend/src/styles/ds/components/timeline.css", "frontend/src/components/timeline/EventDrawer.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (cible close >=44px) + audit final cibles tactiles"
  risque_regression: "aucun (CSS + audit)"
  ordre_ecriture: "frontend (CSS close 28->44px, audit)"
  zod_dto_sync: "NON"
  possibly_done: partiellement
  etat_reel_du_code: |
    Réévalué M->S : focus-trap sur 7 modaux + cibles tactiles >=44px déjà livrés (S16-S20).
    Reste UNIQUEMENT : .mt-drawer__close{width:28px;height:28px} (timeline.css:137) -> 44px
    (ou hitbox pseudo-élément) + audit final des cibles résiduelles.
```
