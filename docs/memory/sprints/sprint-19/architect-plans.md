# Mini-plans architect — Sprint 19

> Genere par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

issue_0063:
  fichiers_cles:
    - frontend/src/components/timeline/TimelineMobilePortrait.tsx (nouveau)
    - frontend/src/components/timeline/lib.ts (reuse computed position)
    - frontend/src/app/(...)/ page timeline mobile (breakpoint switch)
  couches_touchees: [frontend/components, frontend/app]
  strategie_test: Vitest rendu portrait + Playwright viewport 375px scroll vertical
  risque_regression: MOYEN — switch desktop/mobile via breakpoint peut casser TimelineView desktop si conditionnel mal isole
  ordre_ecriture: [conteneur portrait, cablage lib.ts, integration page, tests]
  zod_dto_sync: aucun (consomme contrat events v3 #150 existant)
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — aucun fichier TimelineMobile* trouve dans frontend/src/components/timeline/"

issue_0064:
  fichiers_cles:
    - frontend/src/components/timeline/TimelineMobileLandscape.tsx (nouveau, derive de #63)
    - frontend/src/components/timeline/Minimap.tsx (reuse)
  couches_touchees: [frontend/components]
  strategie_test: Vitest rendu paysage + Playwright viewport 812x375 orientation
  risque_regression: MOYEN — partage du conteneur mobile #63 ; regression si extraction commune mal factorisee
  ordre_ecriture: [factoriser commun depuis #63, variante paysage, minimap horizontale, tests]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_0192:
  fichiers_cles:
    - frontend/src/components/timeline/Minimap.tsx (EXISTE — deja cable)
    - frontend/src/components/timeline/EventPill.tsx (nouveau — a extraire de EventBar)
    - frontend/src/components/timeline/EventBar.tsx (EXISTE — source extraction)
  couches_touchees: [frontend/components]
  strategie_test: Storybook stories EventPill + Vitest ; preserver data-testid timeline-event
  risque_regression: FAIBLE — extraction pure, tests E2E golden-path #163 dependent de data-event-title
  ordre_ecriture: [extraire EventPill de EventBar, story, brancher dans Lane, tests]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "Minimap.tsx PRESENT et cable dans TimelineView.tsx (buildMinimapBuckets L95, onMinimapSeek L147, <Minimap> L264). EventPill : AUCUN fichier dedie — reste a extraire depuis EventBar.tsx. Issue reduite M->S (moitie deja faite)."
