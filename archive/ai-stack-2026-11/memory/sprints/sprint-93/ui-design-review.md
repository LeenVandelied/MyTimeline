# Revue Designer pré-implémentation — Sprint 93

> Spawnée par le lead avant la vague 1 (2026-09-15). Arbitrages dev pris comme donnés : onglet « Archivés », confirmation avant désarchivage, libellé actifs + archivés.

**VERDICT : APPROUVÉ AVEC CORRECTIONS**

## #711 — Onglet « Archivés »
- **A.1 Liste** : réutiliser la structure du tableau `ProductsListView.tsx:292-430`, colonnes réduites à **Produit** (pastille + nom + catégorie en mention) et **Actions**. Pas de prochain événement, ni de compte d'événements.
- **Bouton Désarchiver** : `variant="outline"` `size="sm"` + icône `ArchiveRestore`, calque de `ProductDetailView.tsx:480-492`.
- **État vide** : `shared/EmptyState.tsx` sans CTA ni `track` (comme `products-empty-search`), testid `products-archived-empty`.
- **A.2 Dialog** : **ne PAS étendre `DeleteConfirmDialog`** (bouton `destructive`, vocabulaire de suppression). Composant dédié calqué sur `events/ArchiveConfirmDialog.tsx:82-92` : confirmation **sans** `variant="destructive"` (primaire par défaut), annulation `outline`. Toast de succès via `ui/toast.tsx`.
- **A.3 Copie** : `DeleteConfirmDialog.tsx:46-58` (commentaire #605 + textes variante `product`) affirme « aucune restauration exposée » → à réécrire (texte + JSDoc).

## #695 — Carte catégorie
- Badge coloré `categories-count-*` (`CategoriesView.tsx:199-208`) **inchangé** pour les actifs.
- Ajouter un **nœud frère**, hors badge coloré, `text-ink-muted text-2xs`, pour « N archivé(s) ». Motif déjà en usage (`ProductsListView.tsx:349`) ; `--color-ink-muted` sur `--color-surface`, clair et sombre (`colors.css:61-65`, `:140-144`).
- Pas de concaténation dans le badge coloré.
- Logique : badge actifs masqué si actifs = 0 et archivés > 0 ; « aucun produit » seulement si 0 / 0. L'ICU seul ne suffit pas (deux compteurs).

## Non vérifié par le Designer
- Contraste calculé numériquement (déduit de l'usage existant) ; maquettes `design_handoff_mytimeline` introuvables dans le worktree ; nouvelles clés i18n à créer.
