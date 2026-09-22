# Sprint 92 — Absorption tardive A : rafraîchir la liste produits après archivage

**Origine :** triage de clôture (`/sprint end 92`, Phase 4) — défaut préexistant rendu visible par #605, le dev a choisi de l'absorber avant merge. Sources : `review-batch.md` (section « liste non rafraîchie »), `review-fixes-done.md`, `PIT-S92-004`.
**Agent :** fullstack-dev (opus, high) · **Spawn ref :** `6d2071f` · **Briefing :** `briefing-absorb-archive.md` · en parallèle de l'absorption B (fichiers disjoints)

## Commit (vérifié par le lead)
- `ea5d02f` — :bug: fix(products): rafraîchir la liste après archivage (useArchiveProduct) — posé sur `d51c6f6` (B).
- `git show --stat` : 9 fichiers — `hooks/useArchiveProduct.ts` (+87) et son test (+170), `ProductDetailView.tsx` (30) + test (134), `ProductDrawer.tsx` (8) + test (18), `ProductsListView.tsx` (8) + test (17), `e2e/sprint-92-product-detail-actions.spec.ts` (42). Aucun `docs/**`, aucun fichier du toaster.
- `git branch --contains ea5d02f` = `sprint/92` ; arbre propre hors `docs/memory` après commit.
- **Rejeu du lead sur l'arbre propre (B + A committés)** : Vitest 139 fichiers / **1791 / 1791** · tsc exit 0 · `format:check` exit 0 — les 3 rouges observés par l'agent B pendant le travail non committé de A ont disparu.

## Résumé
- **Hook `frontend/src/hooks/useArchiveProduct.ts`** : au succès du DELETE, retire le produit du cache `products.withEvents(userId)`, puis invalide `products.all`. Ce préfixe couvre la liste, le dashboard (`useDashboardData`) et les compteurs de `CategoriesView` (tous via `useProductsWithEvents`). `categories.all` non invalidé (aucun compteur). Aucune requête `events.*` ne liste les événements d'un produit. Le retrait du cache évite qu'au retour du détail la liste montre encore la ligne pendant le refetch. La promesse d'invalidation n'est pas attendue : le toast part à la réponse du DELETE.
- **Surfaces** (via `mutateAsync`, rejet non avalé — contrat `DeleteConfirmDialog`, pitfall #65) : `ProductsListView.tsx:175`, `ProductDrawer.tsx:245`, `ProductDetailView.tsx:246`.
- **Ordre sur le détail** : l'invalidation part avant la navigation ; pour éviter un passage par « Produit introuvable », `useIsProductArchivedHere` (lecture de l'état des mutations) garde la dernière fiche affichée tant qu'un archivage de CE produit, lancé d'ici, est en cours ou réussi.
- **Hors périmètre strict, justifié par l'agent** : `onDeleted={goBack}` sur le drawer du détail — sans lui, un archivage depuis ce drawer laissait la fiche archivée affichée.
- **E2E** (`sprint-92-product-detail-actions.spec.ts`) : test drawer → `products-row-${id}` en `toHaveCount(0)` sur la liste EN PLACE (témoin visible avant), avant l'assertion après rechargement ; test détail → témoin seedé après chargement du détail, visible au retour, produit absent, sans rechargement.

## Tests (déclarés par l'agent)
- `frontend-unit` 1791/1791 (139 fichiers) ; hook 7/7 ; composants 71/71 ; `tsc`, `format:check`, `next lint` (10 fichiers) OK.
- `--list` : 3 tests (8 avec le setup).
- Armements (3, restaurés) : sans invalidation → 2 rouges ; sans fiche gardée → rouge « introuvable » ; sans retrait du cache → 1 rouge.
- Rejeu lead sur l'arbre propre (après B + A) : en cours.

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend §L12/L38 ; br-products BR-PRO-007 (titre, L83) ; pit-frontend PIT-S92-004 L1492, PIT-S90-008 L1420 ; `review-fixes-done.md` L38/L42.
- `issue-605-done.md` : grep sans résultat, contenu NON LU.

## Non vérifié
- E2E exécuté (job `e2e` de la CI seulement) ; flash du détail en navigateur réel (couvert en unitaire, routeur mocké).
- Rejet de `mutateAsync` testé au niveau composant seulement : sous `renderHook`, un rejet remonte en erreur de test, d'où `mutate` + `isError` dans le test du hook (piège déjà documenté dans `useSetEventArchived.test.tsx`).
- `ProductsListView` : aucun test d'échec d'archivage (préexistant).
- Relecture ciblée du commit : lancée par le lead.

## Signaux mémoire
- [MEMORY:pattern] Vue détail montée pendant qu'une mutation retire son entité du cache → état « introuvable » avant la navigation. Solution : `useMutationState` filtré sur la clé de mutation et l'id, garder la dernière valeur vue (état dérivé au rendu). Anti-pattern : naviguer puis compter sur le démontage, ou ne pas mettre à jour le cache.
- [MEMORY:pitfall] Test de hook : un rejet de `mutateAsync` sous `renderHook` remonte en erreur de test même avec un `vi.fn()` neuf et un `Error` ; tester le cas d'erreur via `mutate` + `isError`. Le remède « mock neuf par test » ne suffit pas avec `mutateAsync`.

## Recommandations suite
- Pas de RECOMMAND_FOLLOWUP : le défaut préexistant est absorbé ; l'absence de test d'échec d'archivage sur la liste est antérieure au sprint et reste mineure.
- Pas de RECOMMAND_TEST_RUNNER car la CI de la PR #710 joue la spec et le lead rejoue la suite unitaire.
- Pas de RECOMMAND_DB_EXPERT car aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.
- Pas de RECOMMAND_UI_DESIGN car aucun rendu visuel ne change.

STATUS: COMPLETED
