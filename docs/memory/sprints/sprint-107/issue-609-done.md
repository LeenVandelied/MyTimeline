# #609 — done
- commits: [703c8eaf]
- resume: `th` liste produits au motif `.mt-table th` via const `TH` (ProductsListView.tsx) : font-mono, 9px, tracking .1em, uppercase, ink-muted, font-medium, filet `border-b-[1.5px] border-rule-strong`. `.mt-table` NON posé sur la table (td hors périmètre). Écart assumé : padding horizontal = celui des td (px-4 ; px-2 sous sm depuis #608) pour l'aplomb. `ui/table.tsx` = `.mt-table` table entière → pas réutilisable pour les th seuls.
- critère 2 trouvé déjà livré : catégorie mono sous le nom, ProductsListView.tsx l.381 au commit 703c8eaf, l.388 après #608 (`products-row-category-*`, #603). Non retouché.
- critère 3 (tablette) : mesuré E2E après rebuild à 390/640/768/1024/1280 : th computed uppercase / 9px / IBM Plex Mono.
- mesure : border-bottom 1.5px calculé = `1px` à dpr 1 (arrondi Chrome, identique pour `.mt-table th`) → non asserté en E2E.
- tests : vitest ProductsListView 28/28 (+1 test #609) ; E2E couvert par sprint-107-products-list-mobile (voir 608).
- [MEMORY:pattern] Problem : motif DS `.mt-table th` requis sans `.mt-table` (qui change aussi td). Solution : const de classes Tailwind équivalentes + commentaire pointant core.css. Anti-pattern : ajouter une classe DS hors-layer (`.mt-th`) — core.css est hors `@layer`, elle écraserait `text-right`/`px-*` des utilitaires.
- Pas de RECOMMAND_* car périmètre en-têtes clos.
STATUS: COMPLETED
