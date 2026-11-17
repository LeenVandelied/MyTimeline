# Mini-plans architect — Sprint 89

> Généré par /sprint plan 5 -c "focus mvp" (architect, 2026-09-13). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> [V] = vérifié dans le code par l'architect ; [D] = déduit.

**Thème :** Données affichées = données saisies
**Vagues :** V1 = #546 ∥ #652 (fichiers disjoints ; exclusivité navigateur à #652)
**Cohésion :** 0.33 · **Migrations :** aucune · **Dépend de :** aucun sprint (arbitrages tranchés)

## Arbitrages — TRANCHÉS par le dev le 2026-09-13 (commentaires posés sur les issues)
- **#546 → option A** : un produit archivé occupe toujours sa catégorie. Correctif UI seul (le dialogue bascule en réassignation). PAS de modification du comptage natif (violation FK → 500), PAS de V16.
- **#652 → option A** : une `LocalDate` est une date civile, lue en heure locale partout, via un helper unique dans `lib/date-iso.ts`. Taille S → M.

```yaml
issue_546:
  fichiers_cles: ["frontend/src/components/products/CategoriesView.tsx:47-66", "frontend/src/components/shared/DeleteConfirmDialog.tsx:100", "backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:109-136 (lecture, contrat 409)", "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java:118-140 (NE PAS modifier le comptage)", "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:65"]
  couches_touchees: [frontend]
  strategie_test: "integration (catégorie avec produits archivés seuls : sans cible → 409 ; avec cible → 204) + unit dialogue (bascule sur 409) + E2E categories.spec.ts"
  risque_regression: "garde FK #52 cassée si l'on touche au comptage natif ; cas « unique catégorie » sans cible de réassignation à traiter explicitement"
  ordre_ecriture: "test IT du scénario S79 → dialogue (bascule réassignation sur 409 / compte incluant archivés) → message si aucune autre catégorie → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] Requête native VOLONTAIRE (commentaire #52, ProductRepositoryJpaImpl.java:118-123) :
        products.category_id NOT NULL + FK (V1__baseline.sql:37,63). Énoncé démenti sur l'intention.
    [V] Réassignation des archivés déjà testée (CategoryDeleteReassignIntegrationTest.java:144-176).
    [V] Défaut réel côté UI : compteur construit depuis la liste produits, archivés exclus
        (CategoriesView.tsx:47-57) → 0 → needsReassign=false (DeleteConfirmDialog.tsx:100) → DELETE sans cible → 409.
    [V] Aucune UI ne désarchive un produit (seuls les événements ont « Désarchiver »).
issue_652:
  fichiers_cles: ["frontend/src/lib/date-iso.ts", "frontend/src/components/events/previewTimeline.ts:124 (parseLocalIsoDate à mutualiser)", "frontend/src/components/dashboard/{WeekAgenda.tsx:79-81,ProductList.tsx:72-74,ProductCarousel.tsx:90-92,CompactAgenda.tsx:32,lib.ts:12-13}", "frontend/src/hooks/useDashboardData.ts:49,98", "frontend/src/components/products/{ProductsListView.tsx:64,ProductDetailView.tsx:269,435-437}", "frontend/src/components/timeline/{lib.ts:35,232,376,405,422,425,zoom.ts:130,189,359,EventDrawer.tsx:43,TimelineBottomSheet.tsx:89,TimelineLandscapeDrawer.tsx:57}"]
  couches_touchees: [frontend-lib, dashboard, products, timeline]
  strategie_test: "unit (vitest lancé avec TZ=America/New_York au démarrage du process, jamais process.env.TZ=undefined) + E2E test.use({timezoneId:'America/New_York'}), non vacant même sous CI UTC"
  risque_regression: "géométrie de frise décalée pour les fuseaux non-UTC ; invisible en CI (TZ=UTC), visible au poste Europe/Paris"
  ordre_ecriture: "helper + tests TZ → dashboard → produits → frise (lib/zoom en dernier) → E2E timezoneId"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] EventResponse.java:41 LocalDate ; types/event.ts:196 transmet la chaîne brute ; ~30 lignes font
        new Date(<date seule>). Périmètre de l'énoncé (5 composants) sous-estimé : la frise est touchée.
    [V] toLocalIsoDate (date-iso.ts:32-37) est juste ; le défaut est la lecture en amont.
    [V] Un parseur local existe déjà, utilisé seulement dans previewTimeline.ts.
    [V] Aucun réglage TZ/timezoneId dans playwright.config.ts ni vitest.
```
