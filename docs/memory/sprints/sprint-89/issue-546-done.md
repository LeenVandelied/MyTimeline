# Issue #546 — done (Sprint 89, vague 1)

## Résumé

Commit `ad57148` — `:bug: fix(categories): le dialog de suppression bascule en réassignation sur 409 (#546)`.

Option A (arbitrage 2026-09-13) : un produit archivé occupe toujours sa catégorie. Le comptage natif du backend n'a pas été modifié, et il n'y a pas de migration.

- **Cause côté UI (confirmée)** : `CategoriesView` et `CategoryDrawer` calculent `linkedProductsCount` à partir d'un listing qui exclut les produits archivés. Une catégorie qui ne porte que des archivés affiche donc « aucun produit ». Le dialog envoie alors DELETE sans cible, reçoit un 409 et affiche `errors.conflict`, un message qui ne propose aucune suite.
- **Correctif** : dans `frontend/src/components/shared/DeleteConfirmDialog.tsx`, un 409 reçu sur un DELETE de catégorie sans cible passe l'état local `reassignRequiredByServer` à vrai. `needsReassign` devient vrai, ce qui affiche :
  - une note `delete-reassign-required-note` (role=alert, clé `category.reassignRequired`) ;
  - le select de réassignation, obligatoire (bouton Supprimer désactivé tant qu'aucune cible n'est choisie) ;
  - le message `noOtherCategory` quand aucune autre catégorie n'existe.
  L'état est remis à zéro à chaque ouverture. Le correctif est dans le dialog, donc les deux appelants (CategoriesView, CategoryDrawer) en profitent.
- **Pourquoi un 409 suffit à conclure** : sans `reassignToCategoryId`, le seul 409 possible sur ce DELETE est `CategoryInUseException`. `CategoryReassignTargetInvalidException` exige une cible. Le 409 de verrou optimiste ne concerne pas `deleteById`. Le corps du 409 ne permet pas de distinguer les cas (`error`=CONFLICT dans tous les cas, `GlobalExceptionHandler.java:65-74`), d'où ce raisonnement par absence de cible.
- **Cas conservés** : un 409 reçu AVEC une cible affiche toujours `errors.conflict`. Les variantes event et product ne basculent jamais.
- Commentaires ajoutés près du code : JSDoc du dialog et bloc au-dessus de `needsReassign`.

## Fichiers de contexte lus

- `frontend/src/components/products/CategoriesView.tsx` : l.47-56 `countByCategory` (commentaire « produits archivés déjà exclus API #50 »), l.207 `linkedProductsCount`.
- `frontend/src/components/shared/DeleteConfirmDialog.tsx` : l.100 `needsReassign`, l.113 `noOtherCategory`, l.137-139 mapping 404/409.
- `frontend/src/components/shared/DeleteConfirmDialog.test.tsx` : le cas « erreur 409 » (variante category, sans cible) testait justement le défaut. Il passe désormais par la variante event.
- `frontend/src/components/shared/DeleteConfirmDialog.intl.test.tsx` : lecture seule. Motif « vrais messages fr ».
- `frontend/src/hooks/useDeleteCategory.ts` : `mutateAsync` rejette, invalide `categories.all` et `products.all`.
- `frontend/src/components/categories/CategoryDrawer.tsx` : l.419, 2e appelant du dialog, par grep.
- `backend/.../CategoryDeleteReassignIntegrationTest.java` : l.144-176 testait la réassignation mixte actif + archivé. Le cas « archivés seuls, sans cible » n'était pas couvert : ajouté.
- `backend/.../application/services/CategoryServiceImpl.java` : l.111-117, 409 si `referencing > 0` sans cible.
- `backend/.../controllers/GlobalExceptionHandler.java` : l.65-74 (CategoryInUse) et l.135-145 (ReassignTargetInvalid), tous deux `CONFLICT`.
- `backend/.../domain/exceptions/CategoryInUseException.java` : l.12, message « La catégorie est utilisée par N produits ».
- `backend/.../repositories/jpa/ProductRepositoryJpaImpl.java` : l.118-123, commentaire #52 « Requêtes NATIVES volontaires ». Chemin réel sous `jpa/`, différent de celui du briefing.
- `frontend/e2e/categories.spec.ts` : tests l.129 et l.151.
- `frontend/e2e/support/products.ts` : `seedCategory`/`seedProduct`/`deleteProduct` (204|404). Lu, non modifié.
- `frontend/e2e/support/seed-cleanup.ts` : l.176-190, purge par `?reassignToCategoryId=<poubelle>`, 404 accepté. La source supprimée par le test n'est donc pas un problème.
- `frontend/public/locales/{fr,en,es,de}/common.json` : `deleteDialog.category`. `fr/products.json:201` : `productCount` `=0 {aucun produit}`.
- `.ai-env/context-packs/br-categories.md` : l.117 « Suppression catégorie liée : exige `reassignToCategoryId` (sinon `CategoryInUseException` → 409) » et BUG-S22-002.
- `.ai-env/context-packs/br-products.md` : l.10 `@SQLRestriction("archived = false")`, BR-PRO-007 soft delete, BR-PRO-002 FK `category_id NOT NULL`.
- `.ai-env/context-packs/cp-frontend.md` : l.37 « zéro `any`, zéro `as` non justifié », l.15 next-intl 4 locales.
- `docs/memory/sprints/sprint-79/issue-463-done.md` : l.149-155, `[MEMORY:pitfall]` sur le comptage natif et le contournement par la poubelle.
- Pitfalls inline du briefing : PIT-S79-006, PIT-S76-005 (chemins littéraux pour `git add`), PIT-S86-008 (pas de `next build`), PIT-S69-002 (juger `tsc` sur les fichiers du diff), PIT-S54-004.

## Preuves

- Garde-fou worktree : `rev-parse --show-toplevel` = WT, branche `claude/sprint-89-start-6c6966`. `git -C <dépôt principal> status` ne montre que `docker-compose.override.yml`, présent avant la tâche : rien n'a été écrit dans le dépôt principal.
- **Contre-épreuve Vitest** : les 5 nouveaux cas ont été joués AVANT le correctif avec `npx vitest run src/components/shared/DeleteConfirmDialog.test.tsx`. Résultat : **3 failed | 15 passed (18)**. Les 3 rouges sont la bascule, la relance avec cible et le cas sans autre catégorie. Les 2 verts sont des gardes de non-régression, vertes par construction : 409 avec cible et variante product.
- **Après le correctif** : `npx vitest run` sur DeleteConfirmDialog.test, DeleteConfirmDialog.intl.test, CategoriesView.test, CategoryDrawer.test, i18n-namespaces.test et e2e-rate-limit-budget.test. Résultat : **6 files, 87 passed, 0 failed**. Un passage intermédiaire a rougi l'ancien cas « erreur 409 » (category, sans cible), qui attendait le comportement défectueux. Il a été réécrit sur la variante event.
- Budget rate-limit E2E (`src/__tests__/e2e-rate-limit-budget.test.ts`) : **27 passed**. La nouvelle spec n'émet ni register, ni login, ni reset.
- `npx tsc --noEmit` : **0 `error TS`**, projet complet.
- `npx eslint` sur les 3 fichiers TS modifiés : exit 0. `npx prettier --check` sur les 7 fichiers frontend modifiés : « All matched files use Prettier code style! », après un `--write` sur le test et la spec.
- **IT backend** `-Dtest=CategoryDeleteReassignIntegrationTest`, sous verrou : **Tests run: 7, Failures: 0, Errors: 0** (5 existants + 2 nouveaux). Pas de contre-épreuve rouge possible : ces tests verrouillent un contrat existant, ils n'ont pas été écrits pour échouer.
- **Suite backend complète** `./mvnw -q test`, sous verrou, exit 0 : agrégat des `surefire-reports/*.txt` **run=598 fail=0 err=0 skip=0**. Réserve : `backend/target` est partagé avec #685. L'agrégat peut donc inclure des rapports que #685 a laissés s'ils n'ont pas été régénérés, mais le run complet les réécrit normalement.
- **Pas vérifié** : le nouvel E2E (`categories.spec.ts`, « suppression d'une catégorie ne portant qu'un produit archivé bascule en réassignation ») n'a PAS été joué, car l'exclusivité Playwright revient à #652. `next build` n'a pas été joué non plus. Le rendu visuel de la note n'a pas été vérifié dans un navigateur.

## Signaux mémoire

[MEMORY:decision] Context: #546, une catégorie ayant porté un produit archivé renvoie 409 pour toujours et l'UI n'offre aucune issue. Decision: option A, un produit archivé occupe toujours sa catégorie. Le comptage natif `countByCategoryId` reste inchangé (archivés inclus) et le correctif est côté UI : `DeleteConfirmDialog` passe en réassignation obligatoire sur un 409 reçu sans cible. Why: `products.category_id` est NOT NULL + FK (V1__baseline.sql). Exclure les archivés du comptage ferait exécuter `deleteById` sur une catégorie encore référencée, d'où une violation FK et un 500 (commentaire #52, `ProductRepositoryJpaImpl.java:118-123`). Aucune UI ne permet de désarchiver un produit : réassigner est la seule issue.

[MEMORY:pattern] Problem: un compteur « enfants liés » calculé à partir d'un listing filtré (soft delete) sous-estime ce que le serveur compte, et une garde UI armée sur ce compteur laisse passer une requête vouée au 409. Solution: considérer le compteur local comme une INDICATION, et traiter le refus serveur comme la source de vérité en basculant l'UI dans le mode exigé (ici la réassignation) au lieu d'afficher une erreur. On ne discrimine par statut que si ce statut n'a qu'une cause possible dans ce contexte (409 sans cible = catégorie occupée). Anti-pattern: aligner le comptage backend sur le listing filtré, ce qui transforme le 409 en 500 FK.

[MEMORY:pitfall] Context: #546, le test Vitest existant « erreur 409 : affiche le message conflict inline » (variante category, sans cible) décrivait exactement le comportement défectueux, et il rougit une fois le bug corrigé. Solution: le déplacer sur une variante où ce message reste correct (event) et commenter pourquoi. Prevention: quand un test rougit après un correctif, vérifier s'il gravait le bug avant de « réparer » le correctif.

## Recommandations suite

- RECOMMAND_TEST_RUNNER (lead) : jouer `frontend/e2e/categories.spec.ts`, les 5 tests dont le nouveau, contre `next build` + `next start`, et `next build` lui-même (PIT-S86-008). Les specs qui citent les testids touchés, liste grep complète : `frontend/e2e/categories.spec.ts`, `frontend/e2e/sprint-73-model-vs-rendered.spec.ts`, `frontend/e2e/support/products.ts`. Le nouveau testid `delete-reassign-required-note` n'est cité que par `categories.spec.ts`.
- Traité par le lead (test-runner non délégué, l'E2E ne se délègue pas sur ce projet) : `next build` de production 52/52 et suite E2E complète sur `7ed997c`, dont les 5 tests de `categories.spec.ts` (nouveau cas l.197 compris), aucun en échec — preuves dans `specialists-test-runner.md`.
- Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête n'a été modifiée (option A).
- Pas de RECOMMAND_SECURITY car aucun changement d'auth, d'ownership ou d'endpoint.
- Pas de RECOMMAND_ZOD_DTO_SYNC car aucun DTO ni schéma Zod n'a été touché.
- RECOMMAND_FOLLOWUP: le compteur de la carte catégorie affiche « aucun produit » pour une catégorie qui porte des archivés, ce qui reste trompeur avant même d'ouvrir le dialog. Un compteur fiable demanderait une source backend (compteur incluant les archivés, ou champ `archivedProductsCount`), hors du périmètre fixé par l'option A. Taille estimée S à M, backend + front.
- RECOMMAND_FOLLOWUP: le corps des 409 catégorie ne distingue pas les causes (`error`=CONFLICT pour CategoryInUse, ReassignTargetInvalid et NameConflict). Un code stable dédié (ex. `CATEGORY_IN_USE`) éviterait au front de raisonner par absence de cible. Taille S, contrat `ErrorCode`.
- RECOMMAND_FOLLOWUP: dans le briefing, le chemin `infrastructure/adapters/repositories/ProductRepositoryJpaImpl.java` est périmé. Le fichier réel est sous `repositories/jpa/`. XS, documentation.

STATUS: COMPLETED
