# issue-218-done

commits: [] (aucun — commit laissé au flow /sprint)

resume:
- Créé `frontend/e2e/categories.spec.ts` (4 tests) + `frontend/e2e/products.spec.ts` (3 tests) + helper `frontend/e2e/support/products.ts` (seed API + nav).
- Auth: compte fixe `PROD` ajouté à `support/accounts.ts` (storageState via `auth.setup.ts`) → ZÉRO register/test (anti rate-limit 5/min; le projet a explicitement abandonné le per-test register). +1 register setup (4 total + golden = 5, setup résilient 429).
- Mapping 7 critères:
  1 création catégorie (drawer→liste) = categories.spec:51
  2 édition catégorie = :68
  3 suppression SANS produits = :90
  4 suppression AVEC produits + réassignation = :110
  5 nav liste↔détail produit = products.spec:33
  6 création produit (ProductDrawer) = :61
  7 édition produit = :83
- data-testid RÉUTILISÉS (aucun ajout source): categories-view/-new-button/-card-{id}/-count-{id}/-delete-{id}, category-drawer-form/-name-input/-submit/-swatch-{hex}, products-list-view/-table/-new-button/-row-{id}/-row-category-{id}/-edit-{id}, product-drawer-form/-name-input/-category-trigger/-category-option-{id}/-first-event-date/-submit, product-detail-view/-card/-category/-back.
- Réassignation (comportement RÉEL, lu dans le code, non supposé):
  `deleteCategory(id, reassignToCategoryId?)` → `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>`.
  AVEC produits + cible → 204, produits réassignés ATOMIQUEMENT vers cible (backend 409 `CategoryInUseException` si cible absente). DeleteConfirmDialog force le select (linkedProductsCount>0), cible = toutes catégories sauf celle supprimée. Test assert: produit passe en catégorie cible (products-row-category), source disparaît.

tests:
- `playwright test --list`: 7/7 tests découverts, compilation OK, 0 erreur.
- Run réel `test-quiet.sh e2e`: NON exécuté. Env full-stack indispo: front dev MyTimeline PAS up sur :3000 (200 sur `/` mais 404 sur `/fr/*` = autre serveur; l'app est localePrefix:'always'). Backend :8080 (401) + pg :5432 up. Ne PAS fabriquer un faux vert.
- 0 scénario exécuté live, 7 écrits+listés. → RECOMMAND_TEST_RUNNER (run isolé, front correct up).

[MEMORY:pattern] E2E seed via storageState (compte fixe PROD) + page.request.post same-origin (cookie Lax proxy Next). Anti-pattern: per-test registerAndLogin (429 rate-limit).

recommandations suite:
- RECOMMAND_TEST_RUNNER: lancer `./scripts/test-quiet.sh e2e` avec front MyTimeline up (:3000) + backend (:8080) — valider les 7 (surtout réassignation, seed event payload).
- RECOMMAND_FOLLOWUP: DeleteConfirmDialog (#65) sans data-testid sur bouton confirmer / select réassignation / options → specs retombent sur role/label/`#reassign-select`. Ajouter testid pour robustesse.
- RECOMMAND_FOLLOWUP: `deleteCategory` appelé en direct (CategoriesView) sans invalidation TanStack → liste ne se rafraîchit pas seule post-suppression (specs reloadent). UX: invalider categories.all + products.withEvents dans onConfirm.

STATUS: PARTIAL
BLOQUE_SUR: run e2e réel impossible (front dev MyTimeline absent de :3000); specs écrites+listées (7/7), non exécutées live → RECOMMAND_TEST_RUNNER.

## Fix CI e2e (post-review)

Contexte : CI e2e ROUGE sur 2 tests `categories.spec.ts` (l.90 suppression sans produits → timeout click confirm ; l.110 réassignation → `getByText(REASSIGN_LABEL)` introuvable). Cause : sélecteurs fragiles (role/name + libellé i18n) sur `DeleteConfirmDialog` sans data-testid. Résout aussi RF1 du follow-up.

Résolution : data-testid stables ajoutés au composant + specs rewirées.

Fichiers touchés :
- `frontend/src/components/shared/DeleteConfirmDialog.tsx` : ajout `data-testid="delete-confirm-button"` (Button confirmer), `data-testid="delete-reassign-label"` (label réassignation, rendu ssi `needsReassign`), `data-testid="delete-reassign-select"` (SelectTrigger). Attributs plats forwardés via `...props` (Button/SelectTrigger) — non-breaking.
- `frontend/e2e/categories.spec.ts` : suppression des constantes fragiles `CONFIRM_DELETE`/`REASSIGN_LABEL` et du selector `#reassign-select`. Test l.90 (sans produits) : assert `delete-reassign-label` ET `delete-reassign-select` `toHaveCount(0)`, puis click direct `delete-confirm-button`. Test l.110 (avec produits) : `delete-reassign-label` visible, ouverture du select via `delete-reassign-select`, sélection option, confirm via `delete-confirm-button`.

Comment les 2 tests sont réparés :
- l.90 : le click ne dépend plus de `getByRole('button',{name:'Supprimer'})` (ambigu avec le titre « Supprimer cette catégorie ? ») → cible unique `delete-confirm-button`, plus de timeout.
- l.110 : l'attente ne dépend plus d'un libellé i18n exact (ellipsis U+2026) → cible `delete-reassign-label` (testid stable), rendu dès `linkedProductsCount > 0`.

Vérif locale : `--list` playwright → compilation OK, 0 erreur ; aucune réf résiduelle `CONFIRM_DELETE`/`REASSIGN_LABEL`/`#reassign-select`. Run live non exécuté (:3000 occupé par serveur étranger) → validation finale par CI post-push.
