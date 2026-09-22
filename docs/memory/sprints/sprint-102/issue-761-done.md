# Issue #761 — un 403 signalé deux fois dans les fenêtres d'édition

## Résumé
Opt-out PAR REQUÊTE du toast 403 de l'intercepteur. Nouveau module `frontend/src/services/inlineErrorHandling.ts` : augmentation de module axios `AxiosRequestConfig.inlineHandledStatuses?: readonly InlineHandledStatus[]` avec `InlineHandledStatus = 403` (le TYPE interdit d'y mettre 401/400/500), constante gelée `HANDLES_FORBIDDEN_INLINE`, prédicat `handlesStatusInline(config, 403)`. Branche 403 de `apiClient.ts` : `console.error` assaini conservé, `toast.error` seulement si la requête n'a pas déclaré le 403. Transport écran → hook (`options?` optionnel) → service (`options?` passé en 3e argument axios) ; seuls les 4 appels create/update de `ProductDrawer` et `CategoryDrawer` passent l'option. Le commentaire faux de `apiClient.ts` (TimelineEditHost « gère le 403 inline ») est remplacé par le constat exact.
Module séparé (et non dans `apiClient.ts`) : les drawers importent la constante sans charger les effets de bord d'`apiClient` (`setInterval` de refresh).

## Fichiers
- `frontend/src/services/inlineErrorHandling.ts` (neuf) + `inlineErrorHandling.test.ts` (neuf)
- `frontend/src/services/apiClient.ts`, `apiClient.test.ts`
- `frontend/src/services/productService.ts`, `categoryService.ts`
- `frontend/src/hooks/useCreateProduct.ts`, `useUpdateProduct.ts`, `useCreateCategory.ts`, `useUpdateCategory.ts` ; `useCreateProduct.test.tsx`, `useUpdateProduct.test.tsx`
- `frontend/src/components/products/ProductDrawer.tsx`, `ProductDrawer.test.tsx`
- `frontend/src/components/categories/CategoryDrawer.tsx`, `CategoryDrawer.forbidden.test.tsx` (neuf)

Commit : `22cb2de7`.

## Tests
- `cd frontend && npx vitest run src/services src/hooks src/components/categories src/components/products` → 30 fichiers / 263 tests verts.
- Ajouts : `apiClient.test.ts` +3 (403 avec opt-out → aucun toast, rejet, log sans en-têtes ; 403 même route sans opt-out → toast ; 401 avec opt-out → toast + redirection `/en/login`) ; `inlineErrorHandling.test.ts` 4 (prédicat, gel, services SANS option → aucun drapeau dans la config axios, AVEC → `[403]`, 4 fonctions) ; hooks +2 (relais de l'option ; sans option → `undefined`, 2 assertions existantes adaptées) ; `ProductDrawer.test.tsx` +1 (hooks reçoivent `HANDLES_FORBIDDEN_INLINE`, 403 → `errors.forbidden` inline) ; `CategoryDrawer.forbidden.test.tsx` 3 — chaîne RÉELLE drawer → hook → service → apiClient → intercepteur, seul l'adaptateur axios est remplacé (403) : création et édition → `errors.forbidden` inline ET `toast.error` non appelé ; témoin : même 403 sans opt-out → toast (prouve que le test n'est pas vacant).
- Mutation : retrait de l'option dans `CategoryDrawer` (création) → test « création » rouge, témoin vert. Restauré.
- `npx tsc --noEmit` 0 ; `npx eslint <16 fichiers>` 0 ; `rtk proxy npx prettier --check <16 fichiers>` EXIT=0.
- Vitest complet (avant le commit #762, arbre incluant #761) : 156 fichiers / 1994 tests verts.

## Écarts d'énoncé
- `TimelineEditHost` cité par l'énoncé comme écran « qui gère le 403 inline » : faux (contre-vérification du lead confirmée par lecture). `useEventEditConflict` et `DeleteConfirmDialog` rendent un message générique ; le toast y reste le seul porteur de « accès refusé ». Non modifiés ; commentaire d'`apiClient.ts` corrigé.
- Opt-out par requête au lieu d'une liste d'URL sur le modèle `INLINE_VALIDATION_ENDPOINTS` (piste de la RECOMMAND_FOLLOWUP S101) : une liste d'URL tairait tout futur appelant des mêmes routes.
- L'archivage produit (`useArchiveProduct`) et la suppression de catégorie (`useDeleteCategory`), déclenchés depuis les drawers via `DeleteConfirmDialog`, ne passent PAS l'option (message générique dans le dialog).

fichiers de contexte lus:
- `.ai-env/context-packs/pit-frontend.md` — PIT-S95-006 (l.1575, regex de test citant un libellé), PIT-S84 mock `PopoverPicker` doit rendre `children` (l.1221, appliqué au nouveau test)
- `.ai-env/context-packs/br-auth.md` — BR-AUT-003 l.55 (aucun compteur de test concerné par #761)
- `docs/memory/sprints/sprint-101/issue-733-done.md` — l.55 RECOMMAND_FOLLOWUP double signalement 403
- `docs/memory/decisions.md` — DEC-S101-001 l.1102 (403 → toast sans redirection, préservé)
- `frontend/src/services/apiClient.ts` — l.146-177 `INLINE_VALIDATION_ENDPOINTS` (#713), branche 403 l.218-247

## Signaux mémoire
- [MEMORY:pattern] Problem: faire taire un signalement global (toast d'intercepteur) pour un écran qui affiche l'erreur lui-même. Solution: champ typé par augmentation `declare module 'axios' { interface AxiosRequestConfig {…} }`, statut restreint par le type (`InlineHandledStatus = 403`), passé par requête écran → hook → service. Anti-pattern: liste d'URL, qui tait aussi les futurs appelants de la route sans gestion inline.
- [MEMORY:pitfall] Context: tester « le toast global n'est pas appelé » dans un test de composant dont les hooks de mutation sont mockés. Solution: l'intercepteur ne s'exécute jamais, l'assertion est vacante ; garder la chaîne réelle et ne remplacer que `apiClient.defaults.adapter`, avec un test témoin où le même statut SANS opt-out toaste. Prevention: tout test « aucun toast » d'intercepteur doit avoir un témoin positif dans le même montage.

## Recommandations suite
- RECOMMAND_FOLLOWUP: afficher `errors.forbidden` inline dans le formulaire d'événement (`useEventEditConflict` bascule en erreur générique sur tout statut ≠ 409) et dans `DeleteConfirmDialog` (`errors.generic` sur 403), puis leur faire passer `HANDLES_FORBIDDEN_INLINE` [S | frontend]
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête.
- Pas de RECOMMAND_SECURITY : le serveur refuse toujours ; seul l'affichage client change ; le log 403 reste assaini (test : pas d'en-tête `Authorization` dans le log) ; le 401 ne peut pas être neutralisé (type restreint au 403, test).
- Pas de RECOMMAND_TEST_RUNNER : Vitest exécuté en direct ; `/usr/bin/grep -rln "forbidden\|Accès refusé\|403" frontend/e2e` → 6 fichiers, aucun n'intercepte un 403 : `sprint-95-toast-overlap.spec.ts` provoque un 400 sur `POST /products` (l.225-228), les autres citent 401/403 dans des messages de diagnostic. `next build` non joué (réservé au lead).
- Pas de RECOMMAND_UI_DESIGN : aucun rendu nouveau, un toast en moins.

## Retour de review
- Retour de review (MINEUR) : `ProductDrawer` sans test de la chaîne réelle → ajout de `frontend/src/components/products/ProductDrawer.forbidden.test.tsx` (3 tests : création/édition → `errors.forbidden` inline sans toast, témoin sans opt-out → toast ; `useCategories`/`useAuth` mockés, seul l'adaptateur HTTP est faux). Mutation : option retirée du drawer → 2 rouges, témoin vert ; restauré. tsc/eslint/prettier 0. Commit `80aa644e`.

STATUS: COMPLETED
