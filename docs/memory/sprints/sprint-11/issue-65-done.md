# Issue #65 — DeleteConfirmDialog (desktop + mobile) — DONE

**Vague :** 1
**Commit :** `:sparkles: #65 DeleteConfirmDialog 3 variantes (event/product/category)` (sur sprint/11)

## Résumé
Composant partagé `DeleteConfirmDialog` (3 variantes event/product/category), responsive desktop modal / mobile bottom sheet. Livré avant #61 (qui le consomme).

## BR touchées
- BR-CAT-002 (404 inline sur suppression catégorie inexistante)
- S10 #52 : réassignation atomique `DELETE /api/categories/{id}?reassignToCategoryId`, garde self-target, 409 conflit
- ADR-002 : `system` boolean (pas d'ownerId exposé)

## Fichiers clés
- `frontend/src/components/shared/DeleteConfirmDialog.tsx`
- `frontend/src/components/shared/DeleteConfirmDialog.test.tsx` (13 tests)
- `frontend/src/hooks/useCategories.ts` (TanStack Query v5, `queryKeys.categories.all`, `enabled` = open && needsReassign)
- `frontend/src/services/categoryService.ts` (`getCategories`, parse Zod)
- `frontend/src/types/category.ts` (`categorySchema` + `system`)
- `frontend/public/locales/{fr,en,es,de}/common.json` (namespace `deleteDialog`)
- `frontend/vitest.setup.ts` (stubs Pointer Capture + scrollIntoView)

## Tests
13/13 verts, suite complète 39/39, `tsc --noEmit` OK, ESLint OK, 0 stderr. Périmètre respecté (rien dans `components/products/**`).

## [MEMORY:*] signaux
- [MEMORY:pitfall] Radix Select/Dialog en test Vitest+jsdom : stub `HTMLElement.prototype.{hasPointerCapture,setPointerCapture,releasePointerCapture,scrollIntoView}` dans `vitest.setup.ts` ; ne pas fixer manuellement `id`+`aria-describedby` sur DialogContent (laisser `DialogDescription` auto-câbler).
- [MEMORY:pattern] Mock next-intl en test composant : `vi.mock('next-intl', () => ({ useTranslations: (ns) => (k) => \`${ns}.${k}\` }))` → assertions sur les clés, pas sur libellés FR.

## Recommandations suite
- Pas de RECOMMAND_TEST_RUNNER (13 tests / <1s).
- **Pitfall pour #61** : `onConfirm` doit REJETER la promesse (propager `error.response.status`) pour que le dialog affiche 404/409 inline — ne pas avaler l'erreur côté appelant.

STATUS: COMPLETED
