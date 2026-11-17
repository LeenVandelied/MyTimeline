# Mini-plans — Sprint 121

> Rédigés par le lead (planification sans architect, matrice triviale). Lus par /sprint start Phase 4.1.

issue_898:
  fichiers_cles:
    - "frontend/src/hooks/useDensity.ts"
    - "frontend/app/[locale]/layout.tsx (ou layout du groupe (app)) — application précoce de data-density"
    - "frontend/src/components/settings/PreferencesSection.tsx (consommateur actuel, à garder)"
    - "frontend/e2e/sprint-121-density-persisted.spec.ts (nouveau)"
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E"
  risque_regression: "mismatch d'hydratation sur <html> si data-density est posé avant React sans suppressHydrationWarning ; flash de densité"
  ordre_ecriture: "lecture du mécanisme thème (next-themes) → application persistée au niveau layout → unit → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — data-density posé uniquement par useDensity, monté seulement dans PreferencesSection"

issue_858:
  fichiers_cles:
    - "frontend/src/components/timeline/useFocusTrap.ts (onEscape dans les deps de l'effet, l. 67)"
    - "frontend/src/components/settings/mobile/BottomSheet.tsx (useFocusTrap(panelRef, open, onClose))"
    - "appelants de BottomSheet qui passent onClose inline (AccountSection, etc.)"
    - "frontend/e2e/sprint-121-bottom-sheet-focus.spec.ts (nouveau, 375×812)"
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E"
  risque_regression: "useFocusTrap est partagé (AppShell, MobileDrawer, EventFormDrawer, LandingMobileMenu, EventEditForm…) : Escape et retour de focus doivent rester identiques partout"
  ordre_ecriture: "mesure/test qui reproduit → ref de callback pour onEscape dans le hook → unit → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — onEscape toujours dans le tableau de dépendances"
