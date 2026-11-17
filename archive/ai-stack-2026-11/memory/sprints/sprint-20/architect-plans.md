# Mini-plans architect — Sprint 20

> Genere par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> NOTE CAPACITE : 3xM = 12 pts > cap 10. Si velocity serree, sortir #85 (P2) au backlog
> et garder #80+#83 (P1, ~8 pts). Decision au /sprint start.

issue_0080:
  fichiers_cles:
    - frontend/src/components/dashboard/ (nouveau dossier)
    - frontend/src/components/dashboard/DashboardDesktop.tsx
    - frontend/src/app/(...)/dashboard/page.tsx
    - frontend/src/components/layout/ (RISQUE fichier partage — sidebar/header)
  couches_touchees: [frontend/components, frontend/app, frontend/layout]
  strategie_test: Vitest cards + Playwright desktop 1280px + revue clair/sombre
  risque_regression: MOYEN — touche components/layout/ (fichier partage a risque) ; verifier non-collision avec header auth existant
  ordre_ecriture: [structure dossier + tokens DS, cards KPI, layout desktop, cablage page, tests]
  zod_dto_sync: aucun (agrege endpoints events/products existants)
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — frontend/src/components/dashboard/ vide/inexistant (ls: aucun .tsx)"

issue_0083:
  fichiers_cles:
    - frontend/src/components/dashboard/DashboardMobilePortrait.tsx
    - frontend/src/components/dashboard/ (composants #80 reutilises)
  couches_touchees: [frontend/components]
  strategie_test: Vitest + Playwright viewport 375px portrait
  risque_regression: MOYEN — depend structure #80 ; embarque Timeline mobile #63 (S19)
  ordre_ecriture: [layout portrait, integration frise mobile #63, cards empilees, tests]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_0085:
  fichiers_cles:
    - frontend/src/components/dashboard/DashboardMobileLandscape.tsx
    - rail navigation 64px + grille 2 colonnes
  couches_touchees: [frontend/components]
  strategie_test: Vitest grille 2 col + Playwright 812x375
  risque_regression: MOYEN — derive #83 ; rail navigation peut toucher components/layout
  ordre_ecriture: [rail 64px, grille 2 col, portage cards, tests]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
