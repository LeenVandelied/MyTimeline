# Issue #816 — Liste produits : plus de débordement ≥ sm ni de défilement de page par le sr-only
## Résumé
- Cause 1 : boîte `overflow-x-auto` (ProductsListView.tsx ~:338) non positionnée → `sr-only` absolus (« Aucune échéance à venir », compteur d'événements) ont la page pour bloc conteneur, échappent au clip, élargissent le document (PIT-S107-002).
- Cause 2 : cellule Produit plafonnée seulement `max-sm:` → ≥ sm, min-content = nom complet (633 px mesurés S107).
- Cause 3 (trouvée en mesurant, non citée par l'issue) : dès `md` la frise fait 220 px ; titre du prochain événement plafonné à 256 px (`sm:max-w-64`) → colonnes fixes 288+252+95+116 = 751 px pour une boîte de 710 à 1024 : la table débordait à 1024 MÊME avec une colonne Produit à 0.
- Correctif : `relative` sur la boîte ; td Produit `w-full max-w-0` à TOUTES les largeurs (comportement < sm identique, mêmes classes effectives) ; titre prochain événement `max-w-20 xl:max-w-64` (au lieu de `sm:max-w-64`). Commentaires mis à jour ; commentaires périmés de `sprint-107-products-list-mobile.spec.ts` corrigés (« préexistant, hors #608 »).
- Mesure préalable (sonde statique : CSS Tailwind réel compilé via `@tailwindcss/postcss` + balisage copié, Chromium du volet, polices Archivo/Plex ; PAS l'app) — largeur boîte simulée 590/654/710/966 :
  - avant, 1280 : table 1564/964, doc 1432 (sr-only) ; avec `relative` seul : doc 1280, table toujours 1564.
  - après : 640 → table 588/588, nom visible 115 px ; 1024 → 708/708, nom 83 px ; 1280 → 964/964, nom 163 px (titre long) / 340 px (court) ; 390 → strictement identique à avant (cols 88/96/66/0/104, nom 54).
  - 768 (md, hors critères) : table tient (652/652) mais nom visible ~27 px → corrigé en be209310 (frise compacte sous xl).
- Tests Vitest : `ProductsListView.test.tsx` 30/30 (1 nouveau : boîte = `overflow-x-auto relative`, garde de structure, jsdom sans layout) ; dossier `src/components/products` 11 fichiers / 155 tests verts. `tsc --noEmit` exit 0 ; `next lint` 4 fichiers : 0 erreur ; `prettier --check` (sous `rtk proxy`) OK.
- Test rouge avant correctif : oui (Vitest #816 rouge : « Received: border-rule overflow-x-auto rounded-lg border ») ; E2E non exécuté (interdit), auto-contrôle in-spec prévu.
## Commits
- 77126b1a :bug: fix(products): la liste ne déborde plus au-delà de sm et le sr-only ne fait plus défiler la page (#816)
## Spec E2E à exécuter par le lead
- `frontend/e2e/sprint-114-products-list-overflow.spec.ts` — 2 produits au nom long (dont 1 avec prochain événement au titre long, 1 sans échéance), `fr`, clair : à 640/1024/1280 table ≤ boîte, boîte sans défilement, `documentElement.scrollWidth <= innerWidth` (`<=` et non `===` : une barre verticale non-overlay rendrait `===` faux à tort), nom effectivement tronqué (anti-vacuité), `offsetParent` des 2 sr-only = boîte de défilement + texte exposé ; 375 px non-régression #608 ; auto-contrôle 1280 (ancien comportement réinjecté → sondes table ET page DOIVENT rougir). `--list` : 5 tests listés (+3 de `sprint-107-products-list-mobile.spec.ts`, à rejouer aussi — commentaires modifiés).
- Autres specs citant `products-table`/`products-row-` (à inclure au rejeu) : categories, products, sprint-106-product-detail, sprint-112-focus-return, sprint-89-local-date-west, sprint-90-first-contact, sprint-92-product-detail-actions, sprint-92-products-next-event, sprint-93-restore-product. Assertions texte en `toContainText` (textContent) : la troncature à 80 px du titre (sm..xl) ne devrait pas les toucher — non vérifié en exécution.
## Fichiers de contexte lus
- docs/memory/sprints/sprint-114/briefing-816.md — lu intégralement
- .ai-env/context-packs/pit-frontend.md — grep ciblé : PIT-S107-002 (l.1796), PIT-S77-002 (l.917, sonde `scrollWidth - clientWidth`), l.1433 (`storageState` par fichier)
- .ai-env/context-packs/br-products.md — BR-PRO-001 (l.42 : nom 1..100 → LONG_NAME 74 car. + suffixe unique), §1 Lifecycles (archivage soft delete, l.10)
- docs/memory/sprints/sprint-107/issue-608-done.md — l.4 (mesures 390 : nom 58 px, colonnes 92/96/64/104), l.7 (MEMORY:pitfall sr-only), l.9 (followup = cette issue)
- docs/memory/sprints/sprint-107/issue-524-done.md — grep seulement (tablist, hors sujet ici)
- frontend/e2e/support/products.ts — lu (seedProduct/seedCategory + trackSeed, purge auto)
- frontend/playwright.config.ts — NON LU (motif de session repris de sprint-107 : `test.use({ storageState: PROD.storageState })`)
- frontend/src/components/layout/AppShell.tsx + ds/tokens/spacing.css — largeurs sidebar 64/248 pour calculer les boîtes
## Signaux mémoire
- [MEMORY:pitfall] Context : #816 « plafonner la colonne Produit » — mais à 1024 la table débordait même colonne Produit à 0 (frise 220 + titre 256 + compteur + actions = 751 > 710). Solution : sommer les min-content des AUTRES colonnes par palier avant de choisir un plafond. Prevention : mesurer chaque palier (sm/md/lg/xl) avec contenu long dans TOUTES les colonnes, pas seulement celle de l'énoncé.
- [MEMORY:pattern] Problem : mesurer un layout Tailwind sans `next dev`/`next build` (interdits en vague parallèle). Solution : compiler `globals.css` via `postcss` + `@tailwindcss/postcss` (createRequire depuis `frontend/package.json`, `@source` vers la sonde), balisage copié dans un HTML statique servi en local, viewport émulé + boîte à la largeur réelle calculée. Anti-pattern : déduire à vue la largeur des colonnes d'une table auto.
## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : CSS frontend seul, aucun schéma.
- Pas de RECOMMAND_SECURITY : aucune donnée, auth ou API touchée.
- RECOMMAND_UI_DESIGN traité : agent ui-design consulté par le lead → APPROUVE (frise compacte sous xl, titre max-w-20 sous xl), sous condition d'amender docs/design/graphite-handoff.md §5 — fait par le lead dans la même PR.
- Pas de RECOMMAND_TEST_RUNNER : le lead joue la pile E2E unique ; Vitest ciblé déjà vert.
- Follow-up densité md..lg absorbé (be209310), voir « Corrections de review ».
## Corrections de review
- Commit be209310 :bug: fix(products): nom lisible de 768 à 1279 px dans la liste produits (#816)
- [MAJEUR] frise pleine 220 px repoussée de `md` à `xl` (`block xl:hidden` / `hidden xl:block`). Option la plus locale qui tienne aussi 1024 : « compacte jusqu'à `lg` » NE suffit PAS, `lg` = 1024 inclus (sonde : nom 83 px à 1024 avec la bascule `lg`). Sonde postcss, nom visible avec titre long : 640 → 115 px, 768 → 183 (était 27), 1024 → 239 (était 83), 1279 → 494, 1280 → 163 ; la table tient partout (588/588, 652/652, 708/708, 963/963, 964/964).
- [MINEUR] `title` ajouté sur le titre du prochain événement ET sur le nom. Prémisse de la review fausse : le nom l.405 n'avait PAS de `title`.
- [MINEUR] `console.log` ×3 → `test.info().attach` (JSON).
- [MINEUR] armement 1280 : remet aussi `max-width:16rem` sur le div du titre, mais c'est inerte à 1280 (= `xl:max-w-64`). La régression `xl:` → `sm:` est donc armée à 1024 (nouveau test) : titre à 16rem → nom ~65 px < 120 ; frise pleine forcée → ~83 px < 120. Les deux doivent rougir.
- [MINEUR] `scroller!` → `expect(scroller).not.toBeNull()` + `if (!scroller) return`.
- Spec : largeurs 640/768/1024/1280 + seuil de largeur visible du nom (`MIN_NAME` : 120 px de 768 à 1280, 96 px à 640, où la sonde donne 115). `--list` : 7 tests (+3 sprint-107, renommé « dès xl »).
- Vitest : dossier products 11 fichiers / 156 tests verts (1 nouveau test `title` ; test #608 bascule `md` → `xl`). tsc exit 0, next lint 0, prettier OK.
- Effet design : entre 768 et 1279 px la frise est compacte (64×24) au lieu de 220×40 — approuvé par ui-design, handoff §5 amendé (32aaff7c). Le follow-up « densité md..lg » est absorbé.
STATUS: COMPLETED
