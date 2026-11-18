# Mini-plans architect — Sprint 113

> Généré par /sprint plan 5 (architect, 2026-10-24, base `86337a24`), déroulé à la main par le lead.
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **bugs visibles + suites du S112** ; Phase 0.5 scriptée remplacée par une contre-vérification
> manuelle (architect sur chaque issue, puis lead sur 8 affirmations clés). Numéros de ligne relevés sur `86337a24` : à re-grepper au démarrage.
> i18n : `frontend/public/locales/{fr,en,es,de}/*.json`. Mesures : `/usr/bin/grep` (RTK fausse `grep`, `grep -c`, `wc -l`).

**Thème :** Dialogues : focus rendu et 403 expliqués — cohésion 1.00 (split appliqué : #838 → S116)
**Effort :** 4 pts nominaux (charge réelle ~M+S) | **Migrations Flyway :** aucune | **Dépend de :** aucune

**Vagues :**
- V1 : #766 (Vitest seul).
- V2 : #836 (E2E réel, détient Playwright) — après #766 : `DeleteConfirmDialog.tsx`, `EventEditForm.tsx` et les hôtes (`ProductsListView`, `CategoriesView`, `ProductDetailView`, `TimelineEditHost`) sont communs.
- Les nouvelles specs naissent en `sessionState(X)` (pas de dette pour #840).

```yaml
issue_836:
  fichiers_cles:
    - "frontend/src/components/products/ProductDrawer.tsx"
    - "frontend/src/components/categories/CategoryDrawer.tsx"
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx"
    - "frontend/src/components/products/RestoreProductDialog.tsx"
    - "frontend/src/components/shared/ConflictDialog.tsx"
    - "frontend/src/components/events/ArchiveConfirmDialog.tsx"
    - "frontend/src/components/settings/AccountSection.tsx"
    - "frontend/src/components/products/ProductsListView.tsx"
    - "frontend/src/components/products/CategoriesView.tsx"
    - "frontend/src/components/products/ProductDetailView.tsx"
    - "frontend/src/components/products/ArchivedProductsView.tsx"
    - "frontend/src/components/EventEditForm.tsx"
    - "frontend/src/components/timeline/TimelineEditHost.tsx"
    - "frontend/src/components/settings/mobile/MobileSettings.tsx"
    - "frontend/e2e/sprint-112-focus-return.spec.ts"
  couches_touchees: ["frontend", "E2E"]
  strategie_test: "E2E (réel, sans mock de tiroir, PIT-S112-002) + unit sur le helper de retour de focus s'il est factorisé"
  risque_regression: "Un déclencheur dans un DropdownMenu est démonté à la fermeture : le focus doit aller au bouton du menu, pas à body. Garder intact le correctif #700 des tiroirs de création."
  ordre_ecriture: "1) mesurer les 7 dialogues en E2E (rouge attendu) 2) factoriser un retour de focus (component-guardian avant tout nouveau hook) 3) câbler onCloseAutoFocus dialogue par dialogue 4) rejouer sprint-112-focus-return en viewport mobile (bottom sheet)"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — onCloseAutoFocus seulement dans ProductDrawer.tsx:267, CategoryDrawer.tsx:250 (passthrough) et les hôtes de création ProductsListView.tsx:515, CategoriesView.tsx:272 ; aucun Dialog.Trigger dans les dialogues listés"
  possibly_done: false
  etat_reel_du_code: |
    Seul le mode création est corrigé (b5e717c1, #700). Mode édition et 5 autres dialogues non traités.
    ConflictDialog et ArchiveConfirmDialog sont hébergés par frontend/src/components/EventEditForm.tsx (racine, pas events/).

issue_766:
  fichiers_cles:
    - "frontend/src/hooks/useEventEditConflict.ts"
    - "frontend/src/components/EventEditForm.tsx"
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx"
    - "frontend/src/services/eventService.ts"
    - "frontend/src/services/inlineErrorHandling.ts"
    - "frontend/public/locales/{fr,en,es,de}/common.json"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest sur la chaîne réelle, seul l'adaptateur HTTP simulé ; modèle ProductDrawer.forbidden.test.tsx, avec un témoin sans opt-out)"
  risque_regression: "DeleteConfirmDialog a 7 appelants dont les onConfirm passent par des services distincts. L'opt-out HANDLES_FORBIDDEN_INLINE doit traverser chaque service (updateEvent(eventId, data) n'a pas de paramètre d'options, eventService.ts:84). Ne jamais poser l'opt-out avant le message inline, sinon l'écran devient muet."
  ordre_ecriture: "1) clés i18n common.deleteDialog.errors.forbidden ×4 (absentes) 2) branche 403 → errors.forbidden dans DeleteConfirmDialog et useEventEditConflict 3) tests rouges puis verts 4) SEULEMENT ENSUITE : options dans les services et opt-out"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — useEventEditConflict.ts:158-162 met tout non-409 en 'error' générique ; DeleteConfirmDialog.tsx:177-179 renvoie errors.generic hors 404/409"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — S à la limite : prévoir M si les variantes event, produit et catégorie sont toutes couvertes."
```
