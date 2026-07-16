# Mini-plans architect — Sprint 47

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1.
> ⚠ App router = `frontend/app/`, PAS `frontend/src/app/`.
> ⚠ **Sprint 100% E2E** — non lançable en local (stack down, cf. [[mytimeline-e2e-ci-only-gate]]).
> Le job CI e2e est le SEUL gate : budgéter 2-3 itérations.

```yaml
issue_314:
  fichiers_cles:
    - "frontend/app/[locale]/(app)/timeline/page.tsx"               # vérifié : timeline-screen L~68, timeline-data-loading L~82, timeline-empty L~89, timeline-host L~96
    - "frontend/src/components/events/NewEventDrawer.tsx"           # vérifié : 3 fichiers src portent shell-new-event-drawer*
    - "frontend/src/components/EventEditForm.tsx"                   # vérifié : event-form-preview-recurrence (2 hits src)
    - "frontend/e2e/sprint-42-events.spec.ts"                       # vérifié (13.6K, spec events existante)
    - "frontend/e2e/golden-path.spec.ts"                            # vérifié (exerce déjà timeline-resource-title)
    - "frontend/e2e/support/products.ts"                            # vérifié (fixture produit requise par le drawer)
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "GAP CONFIRME par grep : shell-new-event-drawer* / timeline-screen / timeline-host / timeline-data-loading / event-form-preview-recurrence = 0 hit dans frontend/e2e/. Seul timeline-empty est couvert (1 hit). PIEGE PAYLOAD (PIT-S44-001) : durée requise même en type `single` — un POST /api/events sans durée renvoie 400."
  ordre_ecriture: "fixture produit → parcours création → assertions testids"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(gap prouvé par grep — cf. risque)"

issue_304:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"           # vérifié L634 : data-testid="timeline-resource-head"
    - "frontend/e2e/golden-path.spec.ts"                            # vérifié
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "timeline-resource-head = 2 hits src / 0 hit e2e (vérifié). Le toggle bascule aria-expanded ; asserter l'ATTRIBUT, pas la seule visibilité (le collapse peut passer par une hauteur CSS animée → race Playwright)."
  ordre_ecriture: "MEME fichier de spec que #314 (une seule passe timeline)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — testid présent, 0 spec)"

issue_205:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx"   # vérifié (10.8K)
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx"  # vérifié (11.7K)
    - "frontend/src/components/timeline/TimelineResponsive.tsx"       # vérifié (bascule useMediaQuery)
    - "frontend/src/components/timeline/TimelineActionSheet.tsx"      # vérifié
    - "frontend/src/components/timeline/TimelineMobilePortrait.stories.tsx"   # A CREER — absent (vérifié : seuls .test.tsx existent)
    - "frontend/src/components/timeline/TimelineMobileLandscape.stories.tsx"  # A CREER — absent
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "TimelineResponsive bascule sur useMediaQuery — Playwright doit fixer le VIEWPORT AVANT navigation, sinon la vue desktop est montée et les testids mobiles n'existent pas."
  ordre_ecriture: "périmètre réduit à Storybook + E2E (le RTL est DEJA fait) → stories → spec E2E mobile (fichier distinct de #314/#304)"
  zod_dto_sync: "NON"
  possibly_done: false          # PARTIEL, pas done
  etat_reel_du_code: |
    PARTIEL : TimelineMobilePortrait.test.tsx + TimelineMobileLandscape.test.tsx existent (RTL).
    Aucun .stories.tsx, aucune spec E2E.
    Recommandation architect : GARDER en réduisant le périmètre à « Storybook + E2E » — le RTL est fait.
```

## Vagues
- **V1 (séquentiel strict — UNE seule passe E2E timeline)** : #314 → #304 dans un même fichier de spec.
  Prescrit par le corps de #314 : « envisager UNE seule passe E2E timeline couvrant les deux plutôt que deux specs qui se marchent dessus ».
- **V2 (parallélisable — vues mobiles, fichier de spec distinct + .stories.tsx)** : #205

## Dépendances
- **Dépend de S46** : #315 fige l'aperçu que #314 asserte ; #309 câble la suppression mobile que #205 exerce.
- **Prérequis de S49** : sans cette couverture, #69 (virtualisation) se valide à l'aveugle.
