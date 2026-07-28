# Mini-plans architect — Sprint 51

> Généré par /sprint plan (architect, 2026-07-28, ancrage HEAD fc2a3a0). Lu par /sprint start Phase 4.1.

## Thème : Frise : bug de rotation + dette d'implémentation — cohésion 0.40
## Milestone GitHub : #51 | Effort : 7 pts | Migrations : aucune | Dépend de : (aucune — indépendant de S50)

## Vagues
- Vague 1 (parallèle, fichiers disjoints) : #328 (`useTimelineMobileState.ts` + `TimelineResponsive.tsx`), #349 (`TimelineView.tsx` + `lib.ts`)
- Vague 2 (après vague 1) : #351 (`TimelineView.tsx` + `useTimelineViewport.ts`)

## Recommandation architecte (validée au plan)
- **Absorber #350 en marge du sprint** (suppression `frontend/src/components/calendar/TimelineCalendar.tsx`,
  114 lignes, code mort depuis S42) : vérifié zéro import, 4 références résiduelles toutes en
  commentaire/doc (`TimelineEditHost.tsx:21`, `timeline/lib.ts:6`, `timeline/index.ts:3`, `ds/readme.md:35`).
  XS, zéro risque, ne consomme pas de slot d'issue. Commit dédié.
- #349 et #351 se recouvrent sur `TimelineView.tsx` → séquencement obligatoire (vagues 1→2).

```yaml
issue_0328:
  fichiers_cles:
    - "frontend/src/components/timeline/useTimelineMobileState.ts"
    - "frontend/src/components/timeline/TimelineResponsive.tsx"
    - "frontend/e2e/timeline-mobile.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Rejouer scrollToToday au changement de variante écraserait la position utilisateur au lieu de la restaurer — inversion du bug, pas correction."
  ordre_ecriture: "1) hisser scrollLeft en state React (ou dériver de viewportStart déjà hissé). 2) réagir au CHANGEMENT DE VARIANTE, pas au montage. 3) resynchroniser la fenêtre minimap. 4) étendre la spec E2E de rotation pour asserter scrollLeft (et non plus seulement la sélection)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. useTimelineMobileState.ts:91 `const [viewportStart, setViewportStart] = useState(0)`
    et ligne 88 le reducer de zoom sont bien hissés ; le commentaire ligne 40 le dit explicitement
    (« NE SONT PAS réinitialisés »). scrollLeft reste DOM : lignes 140 et 173 le lisent/écrivent
    sur `el` directement, sans état React. TimelineResponsive.tsx:32 documente « La rotation
    portrait ↔ paysage démonte/remonte » — cause exacte confirmée.

issue_0349:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"
    - "frontend/src/components/timeline/lib.ts"
    - "frontend/src/components/timeline/TimelineView.perf.stories.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Une mémoïsation incrémentale trop agressive rétrécit la bande de virtualisation et réintroduit des trous de frontière (événements manqués)."
  ordre_ecriture: "MESURER avant/après sur le banc existant (TimelineView.perf.stories.tsx + stress-fixtures.ts), pas estimer. Cf. ADR-007 pour le budget perf redéfini."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Banc de mesure présent et rejouable : TimelineView.perf.stories.tsx + stress-fixtures.ts
    existent dans frontend/src/components/timeline/. ADR-007 présent dans docs/adr/.

issue_0351:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"
    - "frontend/src/components/timeline/useTimelineViewport.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Cibler scrollEl au lieu de window en capture peut perdre l'événement si la frise est imbriquée dans un conteneur défilant (drawer, plein écran)."
  ordre_ecriture: "à déterminer par fullstack-dev (XS)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ⚠ CHEMIN FANTÔME CORRIGÉ. L'issue cite `frontend/src/hooks/useTimelineViewport.ts` —
    N'EXISTE PAS. Vrai chemin : `frontend/src/components/timeline/useTimelineViewport.ts`.
    Défaut 2 confirmé à la ligne 206 : `window.addEventListener('scroll', schedule, { passive: true, capture: true })`.
    Défaut 1 confirmé : cales à TimelineView.tsx:756 et :849 (l'issue dit 754/847, décalage de 2)
    — `<div aria-hidden="true" data-testid="timeline-lane-spacer">` enfants directs de
    `<div role="list" data-testid="timeline-lane-list">` (ligne 753), sans role="presentation".
```
