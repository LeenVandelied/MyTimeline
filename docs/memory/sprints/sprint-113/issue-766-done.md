# Issue #766 — 403 expliqué dans l'édition d'événement et la confirmation de suppression

**Commit :** 667f5ad1 (31 fichiers, +542/−50)

## Résumé
- `DeleteConfirmDialog` : branche 403 → `common.deleteDialog.errors.forbidden` (vaut pour les 7 appelants).
- `EventEditForm` : nouvel état `EventSubmitState='forbidden'` → `validation.event.forbidden` (même testid `event-form-error`) ; posé par `useEventEditConflict` sur 403. Écart de nommage assumé : le formulaire lit le namespace `validation.event`.
- `options?: InlineErrorOptions` rétro-compatible sur `updateEvent`, `deleteEvent`, `deleteProduct`, `deleteCategory`, `useArchiveProduct`, `useDeleteCategory`, `useEventEditConflict`.
- Opt-out `HANDLES_FORBIDDEN_INLINE` sur les 7 appelants (tous relancent l'erreur vers le dialogue) : TimelineEditHost (PATCH + DELETE, mobile/desktop), ProductDrawer, ProductsListView, ProductDetailView, CategoryDrawer, CategoriesView.
- i18n ×4 ; fr au vouvoiement, aligné sur les clés voisines.
- Commentaire de l'intercepteur `apiClient.ts` mis à jour.

## Tests
- Nouveaux : `TimelineEditHost.forbidden.test.tsx`, `DeleteConfirmDialog.forbidden.test.tsx` (chaîne réelle, seul `apiClient.defaults.adapter` remplacé, témoins sans opt-out qui toastent).
- Vitest 2289/2289 (174 fichiers) ; tsc 0 ; lint 0 ; prettier 0 (rapport agent).
- Non vérifié : test 403 de bout en bout pour ProductsListView, ProductDetailView, CategoriesView (même hook que les drawers testés). Aucun E2E touché.

## Signaux
- [MEMORY:pattern] Un mock de hook à signature figée (`fake(userId)`) avale les nouveaux paramètres → relayer `...args: Parameters<typeof actual.hook>`.

## Recommandations suite
- RECOMMAND_FOLLOWUP: `common.deleteDialog.errors.notFound` dit « Cette catégorie n'existe plus. » pour les 3 variantes (événement et produit compris) — antérieur au sprint [triage XS | domaine products/events].
- RECOMMAND_FOLLOWUP: test 403 de bout en bout pour ProductsListView / ProductDetailView / CategoriesView si le reviewer l'exige [triage S].
- Pas de RECOMMAND_DB_EXPERT (aucune migration), pas de RECOMMAND_SECURITY (affichage d'erreur côté client, aucun contrôle d'accès modifié).

STATUS: COMPLETED
