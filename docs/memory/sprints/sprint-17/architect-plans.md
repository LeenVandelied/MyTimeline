# Mini-plans architect — Sprint 17

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> Dé-scope validé (2026-07-03) : #63 (Timeline mobile portrait) retiré de S17 → backlog,
> pour tenir la cible ~8-10 points. S17 = #55 seul.

issue_0055:
  fichiers_cles:
    - "frontend/src/components/TimelineCalendar.tsx (réécriture sur sous-composants #47)"
    - "frontend/src/components/timeline/* (étendus depuis #47)"
    - "hooks useEvents/useProducts (TanStack Query — dépendance #48 à vérifier par fullstack-dev)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest) + stories + vérif visuelle ; E2E golden path (#163) ne doit pas régresser"
  risque_regression: "BR-EVE-001 (event↔user) : frise n'affiche que les events de l'utilisateur. Virtualisation horizontale (@tanstack/react-virtual) sur >500 events. Zoom state (Zustand/useReducer à décider). Dépend du contrat #150 (color unique)."
  ordre_ecriture: "frontend (composants timeline → zoom/minimap → drawer → raccourcis clavier)"
  zod_dto_sync: "NON (consomme #150)"
  possibly_done: false
  etat_reel_du_code: "(greenfield — bloqué par #47, à livrer en S16)"
