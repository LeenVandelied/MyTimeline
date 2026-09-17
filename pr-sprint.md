## Objectif

Un produit archivé cesse d'être perdu : il se retrouve et se restaure. Et la carte d'une catégorie cesse de mentir en affichant « aucun produit » alors qu'elle porte des produits archivés.

## Issues traitées

- **#711** (P1, M) — [FEATURE] Restaurer un produit archivé
- **#695** (P2, M) — [BUG] La carte d'une catégorie affiche « aucun produit » alors qu'elle porte des produits archivés

Vagues : V1 = #711, puis V2 = #695 (mêmes ports produits, même règle « un archivé occupe sa catégorie »). Cohésion 0.50.

## Arbitrages rendus par le dev au démarrage

- Surface des archivés : **3e onglet « Archivés »** sur `/products`, plutôt qu'une route dédiée ou un filtre dans la liste.
- Désarchivage **avec confirmation** puis toast (le désarchivage d'un événement, lui, reste direct).
- Carte catégorie : **actifs + « N archivés »** séparés, plutôt qu'un total unique.

## Changements clés

### #711 — Restauration
- `GET /api/users/{userId}/products/archived` → `ArchivedProductResponse[]` (sans les événements) ; `POST /api/users/{userId}/products/{productId}/restore` → 204.
- `ProductEntity` porte `@SQLRestriction("archived = false")` : la lecture et la restauration passent donc par des requêtes **natives**, seules capables de voir une ligne archivée. Le filtre `archived` y est posé explicitement (PIT-S79-006).
- **L'ownership est porté par la clause `WHERE` de l'UPDATE** (`id` + `user_id` + `archived = true`) : 0 ligne modifiée ⇒ 404 uniforme (inconnu, déjà actif, ou appartenant à un autre utilisateur), conformément à l'anti-énumération de BR-PRO-010. Le 403 path ≠ JWT reste celui des autres routes.
- Front : onglet « Archivés », `ArchivedProductsView`, `RestoreProductDialog` (dialog dédié, non destructif), `useArchivedProducts` / `useRestoreProduct`, retrait en place + invalidation `products.all` et `categories.all` (PIT-S92-004). Textes du dialog d'archivage réécrits : l'archivage est réversible.

### #695 — Compteurs de la carte
- Une **seule requête native groupée** (`count(*) FILTER …` par catégorie, scopée à l'appelant) — pas de N+1. Le scope utilisateur est ici un **contrôle d'isolation**, les catégories système étant partagées.
- `countByCategoryId`, qui garde le 409 de suppression, est laissé **intact** : la divergence entre les deux comptages est volontaire et documentée.
- `productCount` / `archivedProductCount` sont **absents du JSON** sur POST / GET par id / PATCH (un `0` y rouvrirait le bug) ; Zod en `.optional()`.
- Carte : badge coloré pour les actifs (masqué s'il n'y a que des archivés), mention discrète « N archivés » à côté. `linkedProductsCount` reçoit actifs + archivés, donc le select de réassignation s'arme d'emblée — le repli serveur 409 est conservé et reste testé.

## Règles métier impactées

- **BR-PRO-007 amendée** : l'archivage produit n'est plus définitif.
- **BR-PRO-011 créée** : lecture des archivés et restauration, ownership natif et 404 uniforme.
- **BR-CAT-008 créée** : les compteurs de la carte viennent du backend, archivés distingués.
- Packs `br-products.md` et `br-categories.md` mis à jour en conséquence.

## Qualité

- **Designer** consulté avant implémentation : approuvé avec corrections, toutes appliquées (dialog dédié plutôt qu'extension de `DeleteConfirmDialog`, mention archivés hors du badge coloré).
- **Audit sécurité** dédié sur #711 (l'ownership par clause SQL est un motif nouveau au dépôt) : **verdict RAS**.
- **Revue batch** : 0 constat.
- **Tests** : backend 632 verts (627 avant) · Vitest 1824 verts (1818 avant) · `tsc`, `next lint`, `format:check` verts · suite E2E complète jouée en local contre `next build` + `next start` : **410 passés / 2 échoués / 8 sautés**.
- Les 2 échecs sont **hors périmètre** : l'armement de comparaison de captures du S77, qui échoue mécaniquement hors Linux, et le flake de palette du S84 (mesuré ~2/5 sur `dev` comme sur branche, et repassé vert seul ici). Aucun fichier du sprint ne touche ces surfaces.
- Aucune migration Flyway : la colonne `archived` existe depuis V7. **V16 reste libre.**

Détail : `docs/memory/sprints/sprint-93/` (done.md par issue, revue Designer, audit sécurité, revue batch) et `docs/memory/audits/sprint-93-test-coverage.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
