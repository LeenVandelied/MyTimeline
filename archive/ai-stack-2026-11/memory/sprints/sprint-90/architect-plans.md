# Mini-plans architect — Sprint 90

> Généré par /sprint plan 5 -c "focus mvp" (architect, 2026-09-13). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> [V] = vérifié dans le code par l'architect ; [D] = déduit. Numéros de ligne à re-vérifier au démarrage
> (S89 #652 modifie WeekAgenda / ProductList / ProductsListView).

**Thème :** Premier contact d'un compte — tableau de bord, états vides, chargement
**Vagues :** V1 = #624 ∥ #629 (#629 limité aux `loading.tsx` et branches `isLoading`) | V2 = #630 (mêmes pages et mêmes locales)
**Cohésion :** 0.87 · **Migrations :** aucune · **Dépend de :** S89 (#652)

## Arbitrages à trancher au /sprint start
- **#629** : les 4 pages sont `'use client'` → un `loading.tsx` ne couvre que le chargement du segment, pas le fetch. Le squelette doit-il aussi remplacer les chargements internes des pages ? (sinon effet visible quasi nul)
- **#624** : où vit désormais la création de produit sur le dashboard ?

## Consigne dure
**#624 re-route d'abord `golden-path.spec.ts:129-140`** (il vérifie l'événement dans la frise DU DASHBOARD — preuve E2E du MVP).

```yaml
issue_624:
  fichiers_cles: ["frontend/app/[locale]/(app)/dashboard/page.tsx:8,12,201,215,227-239", "frontend/src/components/layout/CreateEventContext.tsx:36 (useOpenCreateEvent)", "frontend/public/locales/*/dashboard.json", "frontend/e2e/golden-path.spec.ts:129-140"]
  couches_touchees: [app-router, locales, e2e]
  strategie_test: "unit page + E2E : golden-path, sprint-42-events, sprint-62-select-focus-indicator, sprint-85-timeline-sidebar, sprint-85-timeline-toolbar, timeline-mobile, timeline.spec (re-grepper la liste complète au démarrage)"
  risque_regression: "golden-path vérifie l'événement dans la frise du dashboard ; la preuve E2E du MVP casse si non re-routée vers /timeline"
  ordre_ecriture: "golden-path re-routé → retrait de TimelineEditHost → bouton Ouvrir la frise → CTA Nouvel événement → specs sprint-85 (layout embedded)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] TimelineEditHost monté seulement dans la branche desktop (:237) ; mobile et paysage non.
    [V] « Ouvrir la frise » absent des locales fr.
issue_629:
  fichiers_cles: ["frontend/src/components/shared/LoadingSkeleton.tsx:19,109-110", "frontend/app/[locale]/(app)/{timeline,products,settings}/loading.tsx (à créer)", "frontend/app/[locale]/(app)/dashboard/loading.tsx:21"]
  couches_touchees: [app-router, shared]
  strategie_test: "unit + vérification navigateur (flash, CLS)"
  risque_regression: "ne pas supprimer les variantes timeline/cards du composant (vivantes en tests) ; CLS au remplacement"
  possibly_done: false
  etat_reel_du_code: "[V] un seul loading.tsx (dashboard, variante list) ; les pages sont 'use client' ; variantes timeline et cards sans consommateur de production"
issue_630:
  fichiers_cles: ["frontend/src/components/shared/EmptyState.tsx:18-31", "frontend/app/[locale]/(app)/timeline/page.tsx:77-83", "frontend/src/components/products/ProductsListView.tsx:202-204", "frontend/src/components/products/CategoriesView.tsx:97-98", "frontend/src/components/dashboard/WeekAgenda.tsx:55-56", "frontend/src/styles/ds/components/timeline.css:96 (.mt-evt-connector)"]
  couches_touchees: [shared, products, dashboard, timeline, locales]
  strategie_test: "unit EmptyState + E2E : testids timeline-empty / products-empty à préserver (sprint-42, sprint-61, timeline.spec)"
  risque_regression: "renommer un testid rend 3 specs vacantes ou rouges"
  possibly_done: false
  etat_reel_du_code: |
    [V] 4 états vides ad hoc existent déjà (texte seul, sans CTA) ; EmptyState n'est consommé que par
        dashboard/ProductList.tsx:39. Énoncé partiellement démenti (« la frise n'a aucun état vide »).
```
