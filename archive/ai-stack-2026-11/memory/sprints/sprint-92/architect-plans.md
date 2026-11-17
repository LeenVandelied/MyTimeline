# Mini-plans architect — Sprint 92

> Généré par /sprint plan 5 -c "focus mvp" (architect, 2026-09-13). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> [V] = vérifié dans le code par l'architect ; [D] = déduit. Numéros de ligne à re-vérifier au démarrage
> (S89 #652 modifie ProductsListView / ProductDetailView / dashboard/lib.ts ; S91 #676 touche TimelineEditHost).

**Thème :** Retour d'action et échéances produit
**Vagues :** V1 = #621 ∥ #603 | V2 = #605 (partage `NewEventDrawer` avec #621 et `products.json` avec #603)
**Cohésion :** 0.67 · **Migrations :** aucune · **Dépend de :** S89 (#652), S91 (#676)

## Arbitrages à trancher au /sprint start
- **#621** : brancher `ui/toast.tsx` comme rendu de react-hot-toast, ou supprimer `ui/toast.tsx` ? Recommandation : brancher.
- **#603** : garder « Dernière activité » en plus du prochain événement, ou la retirer ?
- **#605** : confirmer le vocabulaire « Archiver » (s'appliquera ensuite à #600).

```yaml
issue_621:
  fichiers_cles: ["frontend/app/[locale]/layout.tsx:7,85", "frontend/src/components/ui/toast.tsx", "frontend/src/components/events/NewEventDrawer.tsx:104-105", "frontend/src/components/timeline/TimelineEditHost.tsx", "frontend/src/components/categories/CategoryDrawer.tsx"]
  couches_touchees: [app-router, ui, events, timeline, categories]
  strategie_test: "unit + E2E (le toast en haut à droite ne doit masquer aucun contrôle cliqué par les specs)"
  risque_regression: "toast superposé à un contrôle cliqué par une spec → rouge intermittent"
  possibly_done: false
  etat_reel_du_code: "[V] ui/toast.tsx sans consommateur ; CategoryDrawer n'appelle PAS toast (commentaire :50) — l'énoncé corrigé se trompe encore sur ce point"
issue_603:
  fichiers_cles: ["frontend/src/components/products/ProductsListView.tsx:49-60,82,109-111,298", "frontend/src/components/dashboard/lib.ts:10-16 (nextEvent)", "frontend/src/components/events/previewTimeline.ts:76", "frontend/public/locales/*/products.json:137"]
  couches_touchees: [products, dashboard-lib, locales]
  strategie_test: "unit (prochaine occurrence, récurrences comprises, TZ non-UTC) + E2E products.spec.ts"
  risque_regression: "nextEvent est partagé par ProductList et ProductCarousel du dashboard"
  ordre_ecriture: "helper mutualisé (récurrences) → colonne + tri → compteur d'événements → locales"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] Tris lastActivity* présents (:49-56).
    [V] nextEvent existe mais ignore la récurrence et lit la date en UTC (:12) — la lecture UTC sera corrigée par #652 (S89).
    [V] 'products.list.count' (:137, pas :132) compte des PRODUITS, pas des événements ; non consommé.
issue_605:
  fichiers_cles: ["frontend/src/components/products/ProductDetailView.tsx:290,300", "frontend/src/components/layout/CreateEventContext.tsx:31-36", "frontend/src/components/events/NewEventDrawer.tsx:84", "frontend/public/locales/*/products.json"]
  couches_touchees: [products, layout, events, locales]
  strategie_test: "unit + E2E (pré-remplissage du produit)"
  risque_regression: "l'API du contexte de création change ; AppShell (shell partagé) potentiellement touché ; DeleteConfirmDialog partagé avec #546 (S89)"
  possibly_done: false
  etat_reel_du_code: "[V] useOpenCreateEvent() ne prend aucun argument, productId est un état interne ('') → le pré-remplissage exige d'étendre l'API ; taille S à risque M"
```
