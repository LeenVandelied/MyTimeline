# Issue #606 — Détail produit : fiche d'inventaire au motif du DS

## Commits
- `4b879807` :lipstick: style(products): la fiche produit reprend le motif d'inventaire du DS (#606)
- E2E dans `9fbca3c4` (commit #698, spec commune `e2e/sprint-106-product-detail.spec.ts`)

## Résumé
- `frontend/src/components/products/ProductDetailView.tsx` : `<dl grid grid-cols-1 sm:grid-cols-2>` (libellé empilé, sans filet, sans mono) remplacé par deux lignes `.mt-drawer__row` / `dt.mt-drawer__k` / `dd.mt-drawer__v`. Testids ajoutés : `product-detail-inventory` (dl), `product-detail-inventory-row` (×2). Pastille catégorie `inline-flex` → `inline-block max-w-full` (retour à la ligne DANS la valeur). Hex couleur reste `font-mono`.
- `frontend/src/styles/ds/components/timeline.css` (après `.mt-drawer__v`) : ajout DS commenté `.mt-drawer__k{flex-shrink:0}` + `.mt-drawer__v{min-width:0; overflow-wrap:anywhere}` — valeur longue insécable → retour à la ligne, pas de troncature. Sans effet sur valeur courte (drawer événement, bottom sheet).
- BR : aucune règle métier touchée (présentation).
- Tests : unit `ProductDetailView.test.tsx` (« #606 — l'en-tête est une fiche d'inventaire… ») ; E2E `sprint-106-product-detail.spec.ts` → clair + sombre (flex, filet 1px solid, libellé mono + uppercase, libellé collé gauche / valeur collée droite, même ligne, hex en mono) + `de` à 390 px avec catégorie insécable de 60+ caractères (0 débordement ligne/dd/pastille, ≥ 2 lignes, 0 scroll horizontal). 4/4 verts.

## Écarts d'énoncé
- Numéros de ligne de l'énoncé (313-341) périmés : bloc réel à :364-392 (confirmé par l'architect).
- Un ajustement DS était indispensable (min-width/overflow-wrap) : ajouté AU DS, commenté, pas en Tailwind local (conforme à l'arbitrage).
- Le dernier `.mt-drawer__row` garde son filet bas (comportement du DS, identique au drawer d'événement) — pas de `last:border-b-0` local pour ne pas créer de règle concurrente.

## [MEMORY:*] signaux
- [MEMORY:pattern] Problem: réutiliser `.mt-drawer__row` hors du drawer avec des valeurs longues (de). Solution: `min-width:0` + `overflow-wrap:anywhere` sur `.mt-drawer__v` (et `flex-shrink:0` sur `.mt-drawer__k`) ; `break-word` ne suffit pas car il n'abaisse pas la largeur min-content qui compte pour le rétrécissement flex. Anti-pattern: `truncate` sur la valeur ou règle Tailwind locale concurrente au DS.

## Recommandations suite
- RECOMMAND_FOLLOWUP: le motif `.mt-drawer__row` sert désormais hors drawer (fiche produit) — envisager un alias neutre (`.mt-kv__row`) dans le DS pour que le nom ne trompe pas [triage | design-system]
- Pas de RECOMMAND_SECURITY car aucune donnée/auth/API touchée (présentation seule).
- Pas de RECOMMAND_DB_EXPERT car aucun schéma touché.

## Non vérifié
- Rendu Firefox/WebKit (chromium seul).
- Armement de l'E2E par mutation (retour à l'ancienne grille) non rejoué ; l'assertion « même ligne » + mono l'aurait fait rougir par construction (l'ancien `dt` était empilé et sans mono).
- Captures visuelles : aucune référence PNG ajoutée.

STATUS: COMPLETED
