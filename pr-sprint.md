# Sprint 85 — Frise : sidebar de catégories et barre d'outils

Écart maquette ↔ produit sur l'écran cœur. Les trois issues écrivent dans le même
`TimelineView.tsx` : sprint **sérialisé**, un agent par vague.

## Issues traitées

| # | Titre | Commit |
|---|---|---|
| #592 | Frise : sidebar absente — filtres par catégorie, légende et pliage global | `6f0c3eb` |
| #601 | Frise : en-têtes de catégorie sans pastille ni compteur, et repli qui n'affiche rien | `a604e99` |
| #602 | Frise : ni bouton Aujourd'hui ni bouton Nouvel événement dans la barre d'outils | `a2a3fce` |
| — | Correctif de revue : hiérarchie en-tête de catégorie / lane | `1fb477a` |

## Changements clés

- **Sidebar de la Vue Timeline** (`TimelineSidebar.tsx`, nouveau) : accordéons « Tout déplier /
  Tout plier », filtres par catégorie (état `hiddenCats`, **distinct** du repli `collapsed`),
  légende, raccourcis clavier. Permanente ≥ 1024 px, repliée derrière un bouton « Filtres »
  en dessous (panneau superposé, Échap et clic extérieur, focus rendu).
- **Filtrage en amont de la géométrie** : `visibleGroups` alimente `buildVerticalModel`,
  `navLanes` (coordonnées clavier #81), le rendu et la minimap ; `hiddenCats` entre dans
  `geometryKey`. C'était le risque principal identifié au plan.
- **En-tête de catégorie** : pastille de couleur, compteur de produits, résumé compact quand la
  catégorie est repliée (barrettes fenêtrées, mêmes coordonnées que les pastilles). Hauteur
  fixée à 40 px, identique pliée et dépliée (la virtualisation mesure cette hauteur).
- **Barre d'outils** : boutons « Aujourd'hui » et « Nouvel événement ». Ce dernier ouvre le
  drawer **du shell** via un contexte (`CreateEventContext`) : un seul état, un seul drawer.
- **Opt-in `/timeline`** : `TimelineView` est monté par trois écrans (frise, dashboard, fiche
  produit) ; la sidebar et les deux boutons ne s'affichent que sur l'écran frise
  (prop `layout="screen"`). L'en-tête de catégorie, partagé, change sur les trois.

## Défauts trouvés en chemin, corrigés

- **Libellé de catégorie qui sortait de l'écran** au défilement horizontal (`position:sticky` sur
  une boîte aussi large que son conteneur) — antérieur au sprint, révélé par la pastille.
- **Minimap écrasée à 9 px** par les nouveaux boutons à 1024 px, sans débordement visible pour
  le signaler (`flex:1; min-width:0` absorbe tout le manque de place).
- **Hiérarchie perdue** entre en-tête de catégorie et en-tête de lane (même fond, même graisse)
  après #601 : la maquette les distingue par le fond, la graisse et un retrait.

## Décisions (DEC-S85-001 → 006)

Arbitrées au démarrage, détail dans `docs/memory/sprints/sprint-85/decisions-demarrage.md` :
compteur d'en-tête = nombre de **produits** (maquette) ; légende limitée aux marques réellement
rendues (les occurrences fantômes et le glyphe ↻ viennent avec #595) ; bouton de création masqué
sous 768 px là où le shell a son bouton flottant ; sidebar repliée sous 1024 px ; opt-in
`/timeline` ; couleur de catégorie issue de `product.category.color`, contour neutre si absente.

**Écarts à la maquette assumés** (revue de charte : 8 conformes, 1 écart, tous tracés dans les
`issue-*-done.md`) : l'état « catégorie masquée » est barré en encre lisible au lieu d'une
opacité de 40 % (2,52:1 → 6,11:1) ; le texte de sidebar utilise `ink-muted` et non `ink-faint`
(2,82:1). L'écart restant — gouttière à 168 px au lieu de 176 — touche une constante partagée
hors périmètre : suite dédiée.

## Tests

- **Frontend** : `next build` 52/52 pages · **1511 tests unitaires** (127 fichiers) · typecheck ·
  lint · `format:check` — tous verts, mesurés par le lead.
- **E2E**, base e2e recréée à vide : **370 passés / 8 sautés / 1 échec en 6,9 min**. L'échec est
  le contrôle d'armement de `sprint-77-theme-visual`, qui échoue mécaniquement sur macOS
  (références suffixées `-chromium-linux`) : c'est la CI Linux qui juge le visuel.
- **Backend** : aucune ligne modifiée.
- Audit complet : `docs/memory/audits/sprint-85-test-coverage.md`.

## Revues

- **Code** (batch, diff complet) : 0 CRITIQUE / 0 MAJEUR / 3 MINEUR — aucun ne justifie une
  correction de code ; le plus utile (une garde E2E qui ne protège pas l'invariant qu'elle croit
  tester) part en suite.
- **Charte** : 8 CONFORME / 1 ÉCART / 1 INDÉTERMINÉ ; l'indéterminé a été tranché par le lead sur
  la maquette et corrigé (`1fb477a`).
- **Vérification navigateur du lead** : `/timeline` en clair et en sombre, filtre, repli et
  résumé, panneau « Filtres » à 900 px, dashboard sans sidebar ni boutons, anneau de focus
  obtenu par une vraie tabulation (2 px, `:focus-visible`).

Closes #592, #601, #602 (`dev` n'est pas la branche par défaut : les issues seront fermées à la main après le merge).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
