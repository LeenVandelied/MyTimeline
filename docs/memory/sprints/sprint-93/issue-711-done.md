# Issue #711 — [FEATURE] Restaurer un produit archivé

**Vague :** 1 (seule issue) · **Agent :** fullstack-dev (opus, high) · **Branche :** `claude/sprint-93-start-54837d`

## Commits
- `6c7f4480` — :sparkles: feat(products): endpoints de lecture et de restauration des produits archivés (#711)
  - `git show --stat` : 9 fichiers, +608/−1 — `ArchivedProductResponse.java` (+39, nouveau), `ProductServiceImpl` (+21), `ProductRepository` (+23), `ProductService` (+12), `ProductController` (+48), `ProductRepositoryJpaImpl` (+64), `ProductServiceImplTest` (+32), `ProductControllerOwnershipTest` (+100), `ProductRestoreIntegrationTest.java` (+270, nouveau).
- `54bd2ef7` — :sparkles: feat(products): onglet « Archivés » et désarchivage d'un produit (#711)
  - `git show --stat` : 25 fichiers, +1298/−33 — `ArchivedProductsView.tsx` (+163) + 2 tests (+262), `RestoreProductDialog.tsx` (+143) + test (+110), `useArchivedProducts.ts` (+21), `useRestoreProduct.ts` (+70) + test (+135), `useArchiveProduct.ts`, `query-keys.ts`, `productService.ts`, `types/product.ts`, `DeleteConfirmDialog.tsx` + `.intl.test.tsx`, page produits (3e onglet), 8 locales, `e2e/sprint-93-restore-product.spec.ts` (+180), `.ai-env/context-packs/br-products.md` (+31/−…).

Non commités (artefacts du lead, laissés en place) : `briefing-711.md`, `briefing-695.head.md`, `spawn-ref-711.txt`, `ui-design-review.md`, et ce fichier.

## Résumé
**Backend** — deux routes, toutes deux en SQL NATIF (PIT-S79-006 : `@SQLRestriction("archived = false")` ne s'applique pas au natif, seule façon d'atteindre un archivé) :
- `GET /api/users/{userId}/products/archived` → **200** `ArchivedProductResponse[]` (`{id,name,color,category:{id,name,color}}`, **sans `events`**), **403** si path ≠ JWT, **401** sans auth. Filtre `WHERE user_id = :uid AND archived = true ORDER BY updated_at DESC, id`. Pas de filtre « a des événements » (BR-PRO-006 non transposée) : un archivé sans événement reste restaurable.
- `POST /api/users/{userId}/products/{productId}/restore` → **204** (choix aligné sur le `DELETE` d'archivage : transition d'état, aucune représentation utile à renvoyer ; le front rafraîchit par invalidation). **404** si inconnu / déjà actif / produit d'autrui (réponse unique, anti-énumération, BR-PRO-011) ; **403** si path ≠ JWT ; **401** sans auth.
- Ownership : `UPDATE products SET archived = false, version = version + 1, updated_at = :now WHERE id = :id AND user_id = :uid AND archived = true` — ownership ET état dans le même `WHERE`, 0 ligne → `ProductNotFoundException` → 404. Le contrôle habituel (`findDomainProductById` + `productBelongsToUser`) est INAPPLICABLE : un archivé y est invisible et répondrait toujours 404. `version`/`updated_at` tenus à la main (le natif court-circuite `@Version` et l'audit JPA).
- Mapping « produit sans événements » placé dans `ProductRepositoryJpaImpl` (privé) et NON dans `ProductMapper` : la première version l'avait mis dans le mapper (couche `application`) et `ArchitectureTest` (FreezingArchRule) a rougi — 7 violations application → infrastructure. `ProductMapper` est donc inchangé par rapport à `HEAD`.
- Routage : le littéral `/products/archived` l'emporte sur `/products/{productId}` (vérifié par test, pas déduit).
- **Aucune migration Flyway** (colonne `archived` présente depuis V7).

**Frontend** — 3e onglet « Archivés » dans `app/[locale]/(app)/products/page.tsx` (état local `'products' | 'categories' | 'archived'`, garde de type au lieu d'un `as`), `ArchivedProductsView` (colonnes Produit + Actions seulement, bouton `outline` `sm` + `ArchiveRestore`, `EmptyState` sans CTA ni `track`), `RestoreProductDialog` (composant DÉDIÉ, non destructif, calqué sur `events/ArchiveConfirmDialog` ; erreur API inline 404/générique ; fermeture bloquée pendant l'attente). `useRestoreProduct` : retrait de la ligne du cache des archivés + invalidation `products.all` ET `categories.all` (PIT-S92-004 : état juste EN PLACE) ; sur 404, invalidation des seuls archivés. Nouvelle clé `queryKeys.products.archived(userId) = ['products', { userId, archived: true }]`, volontairement SOUS `['products']` pour que `useArchiveProduct` rafraîchisse l'onglet sans le connaître. Zod : `archivedProductSchema = productSchema.omit({ events: true })`.

**Textes** — clés ajoutées dans les **4 locales** : `products.archived.{title,loading,error,empty,emptyDescription,tableLabel,columns.{product,actions},restore,restoreLabel}`, `products.restoreDialog.{title,description,cancel,confirm,confirming,errors.{notFound,generic}}`, `common.toast.productRestored`. `common.deleteDialog.product.description` réécrite (4 locales) : dit désormais que rien n'est perdu et que le produit se désarchive depuis l'onglet « Archivés ». JSDoc réécrites : `productService.deleteProduct`, `useArchiveProduct`, `DeleteConfirmDialog` (lignes #605 « aucune restauration exposée »).

**Testids** : `products-archived-view`, `-loading`, `-error`, `-empty`, `-table`, `products-archived-row-{id}`, `products-archived-row-category-{id}`, `products-archived-restore-{id}`, `product-restore-confirm`, `product-restore-confirm-button`, `product-restore-cancel`, `product-restore-error` (+ `data-kind`).

**Doc métier** : `br-products.md` §1 (transition (Archived) → (Created), mention « périmé » de l'ancien énoncé), §2 (2 lignes d'actions), BR-PRO-007 (réversible, vocabulaire), **BR-PRO-011** (nouvelle : natif scopé au propriétaire + 404 uniforme), §Référence (backend + frontend).

## Tests
- **Backend** : `SKIP_DELEGATION=1 ./scripts/test-quiet.sh unit` → **627 tests, 0 failure, 0 erreur** (BUILD SUCCESS). Dont `ProductRestoreIntegrationTest` (nouveau, 7 tests, `@SpringBootTest` + `@AutoConfigureMockMvc` + Testcontainers Postgres) et +9 cas unitaires (service + contrôleur).
  - 1er run rouge : `ArchitectureTest` (7 violations) à cause du mapper — corrigé en déplaçant le mapping dans l'adaptateur, pas en dégelant la règle.
- **Frontend** : `rtk proxy npx vitest run` → **1818/1818 (143 fichiers)** ; `tsc --noEmit` exit 0 ; `next lint --file` sur les **16** fichiers touchés → exit 0 partout ; `npm run format:check` → vert (4 fichiers reformatés par `prettier --write` avant la vérification).
- **E2E** : `sprint-93-restore-product.spec.ts` **collectée seulement** (`--list` → 1 test + 5 du projet `setup`). ⚠ Le fichier `playwright.config.ts` exige `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` **même pour `--list`** ; sans elles la collecte échoue avec un message qui parle de `next dev`. Spec NON exécutée (consigne : le lead joue la pile).
- **Armement** (vérifié, puis restauré à l'identique) :
  - IDOR backend : clause `AND user_id = :uid` **et** son binding retirés → `restore_otherUsersArchivedProduct_returns404_andStaysArchived` rougit avec `Status expected:<404> but was:<204>` ; garde restaurée → 7/7 vert. (Un premier essai retirant la seule clause donnait une erreur de paramètre non lié, pas un rouge sémantique : arming refait.)
  - Invalidation en place Vitest : `invalidateQueries({ queryKey: queryKeys.products.all })` retiré de `useRestoreProduct` → 1 test rouge (`isInvalidated` faux sur la liste active) ; restauré → 5/5 vert.
- **Non-régression des surfaces citées** : aucune spec E2E n'assert un NOMBRE d'onglets (`grep` sur `getByRole('tab'` / `products-tabs` : seuls `support/products.ts` — sélection par libellé « Catégories » — et ma spec) ; `loading.test.tsx` vérifie l'absence de `products-tabs` pendant le chargement, inchangé. Le garde #605 (`aucun « supprim… » dans le dialog produit`) est resté vert : la description fr dit « rien n'est perdu » et non « rien n'est supprimé » — première rédaction rouge, corrigée sans toucher au test.

## Fichiers de contexte lus
- `.ai-env/context-packs/br-products.md` — intégral (BR-PRO-004 l.62, BR-PRO-006 l.76, BR-PRO-007 l.83, BR-PRO-010 l.95, §1 l.10-15) ; modifié par cette issue.
- `.ai-env/context-packs/cp-backend.md` — **en entier** (conventions 1 DTO en HTTP, 2 ownership cible + 404, 4 update-in-place, 5 soft delete + natif ; §Tests : `standaloneSetup` bypasse Security → `@SpringBootTest` + `@AutoConfigureMockMvc`).
- `.ai-env/context-packs/cp-frontend.md` — **en entier** (§ Sync Zod ↔ DTO, § i18n, § TanStack v5 / query-keys, § Tests RTL).
- `.ai-env/context-packs/pit-backend.md` — `PIT-S79-006` (l.598, natif vs `@SQLRestriction`).
- `.ai-env/context-packs/pit-frontend.md` — `PIT-S92-004` (l.1492), `PIT-S92-005` (l.1496), `PIT-S92-007` (l.1504, rejet de `mutateAsync` sous `renderHook`).
- `docs/memory/sprints/sprint-92/issue-605-done.md` — vocabulaire « Archiver », toasts, testids, et le `RECOMMAND_FOLLOWUP` qui a donné #711.
- `docs/memory/sprints/sprint-93/ui-design-review.md` — l.7-12 (appliqué tel quel) ; `briefing-711.md` (intégral).
- Code : `ProductController.java`, `ProductServiceImpl.java`, `ProductRepository(JpaImpl).java`, `ProductEntity.java`, `ProductMapper.java`, `ProductResponse.java`, `CallerResolver.java`, `GlobalExceptionHandler.java` (l.41-49), `ProductArchivedFilterIntegrationTest.java`, `ProductControllerOwnershipTest.java`, `EventControllerOwnershipTest.java` (motif `@WithMockUser`), `ProductsListView.tsx` (l.176-430), `ProductDetailView.tsx` (l.88-135, 236-262, 470-515), `events/ArchiveConfirmDialog.tsx`, `DeleteConfirmDialog(.intl).test.tsx`, `EmptyState.tsx`, `LoadingSkeleton.tsx`, `ui/tabs.tsx`, `e2e/support/products.ts`, `e2e/support/seed-cleanup.ts`, `e2e/sprint-92-product-detail-actions.spec.ts`, `src/__tests__/i18n-namespaces.test.ts`.
- **NON LU** : `pit-*` hors identifiants ci-dessus (grep ciblé, pas lecture intégrale) ; `coverage-products.md` (non fourni) ; `docs/memory/sprints/sprint-92/issue-603-done.md` ; les maquettes `design_handoff_mytimeline` (absentes du worktree, cf. Designer).

## Non vérifié
- **La spec E2E n'a pas été exécutée** (consigne) : le parcours réel — onglet, dialog, toast, retour du produit — n'est prouvé que par les tests unitaires et l'intégration backend.
- Rendu visuel (clair/sombre), contraste mesuré, lecteur d'écran : non mesurés (aucun navigateur lancé). La couleur de pastille et les classes reprennent `ProductsListView` sans vérification pixel.
- Comportement avec un volume important d'archivés (pas de pagination : la route renvoie tout ; `ORDER BY updated_at DESC` non indexé).
- Concurrence : deux restaurations simultanées du même produit → la seconde rend 404 (0 ligne). Non testé sous charge réelle, déduit du `WHERE archived = true`.
- `updated_at` est posé depuis la JVM (`LocalDateTime.now()`) et non par l'audit JPA : cohérent avec `AuditingEntityListener` (même source d'horloge), mais non comparé en base à un `PATCH` normal.
- Impact sur `useIsProductArchivedHere` d'un produit archivé PUIS restauré dans la même session : la mutation d'archivage reste en cache « success », ce qui ne change rien tant que la liste live porte le produit (analysé, pas testé).

## Signaux mémoire
- [MEMORY:business-rule] BR-PRO-011 (#711) — Archivés produits : la lecture (`GET .../products/archived`) et la restauration (`POST .../restore`) passent par du SQL natif ; le natif ne filtre RIEN de lui-même, donc `user_id` ET `archived = true` doivent être liés dans le WHERE. 0 ligne modifiée → 404 uniforme (inconnu / déjà actif / d'autrui) ; 403 réservé au path ≠ JWT. L'état (Archived) n'est plus définitif.
- [MEMORY:pitfall] Un soft delete masqué par `@SQLRestriction` rend l'ownership habituel du contrôleur (charger la ressource puis comparer le propriétaire) INAPPLICABLE : la ressource est invisible, la lecture répond toujours 404. L'autorisation doit alors migrer DANS la requête native — et son absence ne se voit à aucun endroit du contrôleur.
- [MEMORY:pitfall] Armer un test d'IDOR en retirant la seule clause SQL (`AND user_id = :uid`) sans retirer le `setParameter` correspondant produit une ERREUR de paramètre non lié, pas un rouge sémantique : le test « rougit » pour la mauvaise raison et l'armement ne prouve rien. Retirer clause ET binding.
- [MEMORY:pitfall] Ajouter une méthode à un mapper de `application/` qui prend une entité JPA en paramètre casse `ArchitectureTest` (FreezingArchRule) même quand la classe viole DÉJÀ la règle : le gel est par violation, pas par classe. Mettre le mapping dans l'adaptateur `infrastructure/`.
- [MEMORY:pattern] Un texte d'UI corrigé peut faire rougir un garde de vocabulaire d'un sprint antérieur : « rien n'est supprimé » violait le garde #605 « aucun “supprim…” dans le dialog produit ». Reformuler le texte (« rien n'est perdu »), jamais affaiblir le garde.
- [MEMORY:decision] Réponse du listing des archivés : DTO dédié `ArchivedProductResponse` SANS `events`, au lieu d'un `ProductResponse` avec `events: []`. Motif : la surface n'affiche aucun événement, et les charger passerait par la collection paresseuse d'une entité filtrée par `@SQLRestriction` (N+1 + risque de chargement à travers l'entité restreinte). Un DTO sans le champ ne ment pas ; un `events: []` si.
- [MEMORY:decision] `queryKeys.products.archived(userId)` placée sous le préfixe `['products']` : l'invalidation `products.all` déjà faite par `useArchiveProduct` rafraîchit l'onglet « Archivés » sans modification de ce hook (vague 2 / #695 ne touchera donc pas ce point).
- [MEMORY:pitfall] `playwright.config.ts` exige `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` même pour `npx playwright test --list` : sans elles la COLLECTE échoue, avec un message qui parle du serveur `next dev` et oriente vers un faux diagnostic. Et sous le hook RTK, `--list` est résumé en « PASS (0) FAIL (0) » : passer par `rtk proxy` pour voir la liste réelle.

## Recommandations suite
- RECOMMAND_SECURITY : l'issue introduit un contrôle d'ownership d'un type NOUVEAU au dépôt (autorisation portée par le `WHERE` d'un `UPDATE` natif, hors contrôleur, avec 404 uniforme) — un audit devrait vérifier qu'aucun autre chemin natif de `ProductRepositoryJpaImpl` (`countByCategoryId`, `updateCategoryForProducts`, `deleteAllByUserId`) n'est atteignable sans scope utilisateur, et que le 404 ne fuit pas d'oracle temporel [S | backend].
- RECOMMAND_FOLLOWUP : aucune pagination ni index sur le tri des archivés (`ORDER BY updated_at DESC`) — à revoir si un compte accumule les archivés [XS | backend].
- RECOMMAND_FOLLOWUP : le détail d'un produit archivé reste un 404 (« Produit introuvable ou archivé ») ; aucun lien depuis l'onglet « Archivés » vers une fiche en lecture seule [S | fullstack].
- RECOMMAND_FOLLOWUP : `useIsProductArchivedHere` garde en cache les archivages réussis de la session ; une restauration ne les efface pas (sans effet observé, mais l'état devient faux) [XS | frontend].
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma : la colonne `archived` existe depuis V7 et aucune migration n'a été créée.
- Pas de RECOMMAND_TEST_RUNNER car les suites ont été jouées ici (backend 627, Vitest 1818) et l'exécution E2E revient au lead par consigne.
- Pas de RECOMMAND_UI_DESIGN car la revue Designer de pré-implémentation a été appliquée telle quelle (onglet, colonnes, bouton, état vide, dialog dédié), sans écart.

STATUS: COMPLETED
