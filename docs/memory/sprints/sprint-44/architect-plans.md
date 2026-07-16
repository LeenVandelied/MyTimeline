# Mini-plans architect — Sprint 44

> Généré par /sprint plan (architect, 2026-07-16). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implémentation").
> Thème : Boucle démo frise + création d'événement — cohésion 0.58 — 12 pts.
> Vagues : V1 = #301 seul → V2 = #300 seul (SÉQUENTIEL, conflit AppShell.tsx).
> Fallback capacité : si #301 dérape, #300 glisse en S45 (#301 seul = sprint P0 démo-valide).

```yaml
issue_301:
  fichiers_cles:
    - "frontend/app/[locale]/(app)/timeline/page.tsx"   # remplacer TimelinePlaceholder
    - "frontend/src/components/timeline/TimelineEditHost.tsx"   # host réutilisé (S42)
    - "frontend/src/components/timeline/TimelineResponsive.tsx" # déjà responsive #63/#64
    - "frontend/src/hooks/useProductsWithEvents.ts"     # source données agrégée
    - "frontend/src/components/layout/AppShell.tsx"     # état actif nav "Timeline"
  couches_touchees: ["frontend/app (route)", "frontend/src/components", "frontend/src/hooks"]
  strategie_test: "RTL page /timeline (loading/vide/rempli via mock useProductsWithEvents) + AppShell.test.tsx nav active ; E2E golden-path non régressé (gate CI)."
  risque_regression: "TimelineEditHost attend events+resources par produit ; l'agrégation multi-produits peut casser le calcul de lanes/positions (zoom.ts) si resources non dédupliquées."
  ordre_ecriture: "1) décider source données (agrégé useProductsWithEvents vs 1er produit) 2) câbler host dans page.tsx 3) purger réfs erronées #166 4) état actif nav AppShell 5) tests RTL."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    timeline/page.tsx = TimelinePlaceholder explicite (commentaire réfère à tort #166 — chore ArchUnit fermé).
    Composants frise livrés S42 (TimelineResponsive/TimelineEditHost) déjà consommés par ProductDetailView
    et dashboard, non montés sous cette route. Décision V1 à signaler [MEMORY:decision] : agrégation multi-produits.

issue_300:
  fichiers_cles:
    - "frontend/src/components/layout/AppShell.tsx"     # Dialog minimal (l.247) -> drawer 452px
    - "frontend/src/services/eventService.ts"           # AJOUTER createEvent (POST /api/events)
    - "frontend/src/components/EventEditForm.tsx"       # réutilisé tel quel (defaultValues create)
    - "frontend/src/components/timeline/EventDrawer.tsx" # variante .mt-drawer existante (slide-in 452px)
    - "frontend/src/types/event.ts"                     # EventCreationRequest shape (productId requis)
  couches_touchees: ["frontend/src/services", "frontend/src/components", "frontend/src/hooks (nouveau useCreateEvent)"]
  strategie_test: "RTL nouveau composant drawer (ouverture, sélection produit, submit, aperçu live, récurrence) + AppShell.test.tsx (clic ouvre drawer, plus Dialog) ; mock createEvent."
  risque_regression: "Le bouton shell est hors contexte produit mais Event.productId est requis -> sans sélecteur de produit dans le drawer, la création échoue (400). Invalidation query manquante -> l'event n'apparaît pas dans la frise."
  ordre_ecriture: "1) service createEvent + hook mutation (invalide useProductsWithEvents) 2) sélecteur produit dans drawer 3) EventEditForm en mode create (defaultValues vides, onSubmit=create) 4) remplacer Dialog par EventDrawer dans AppShell 5) tests."
  zod_dto_sync: "OUI — vérifier createEventEditSchema vs EventCreationRequest backend (productId requis, champs récurrence)."
  possibly_done: false
  etat_reel_du_code: |
    AppShell.tsx l.247 = Dialog Radix placeholder ('createDialog', aucun formulaire).
    eventService.ts n'a AUCUN createEvent (getEventsByProductId/updateEventColor/updateEvent/deleteEvent seuls).
    Backend POST /api/events opérationnel (EventController.createEvent, EventCreationRequest).
    EventEditForm mode-agnostique (defaultValues+onSubmit) — le refactor "edit-only" redouté par le body est FAUX.
    M borne haute : surveiller le glissement vers L.
```

## Matrice de conflits (architect)
- #301 ↔ #300 : `AppShell.tsx` (nav active vs Dialog→drawer) + zone timeline/events → SÉQUENTIEL strict.
- #301 ↔ #69 (écartée) : conflit fort (virtualiser un écran en construction) — #69 après S44.
- #302/#283/#307 écartées : lot auth → S45 ; #307 bloquée par décision produit dev (Option A/B).
