# Issue #592 — Sidebar de la Vue Timeline (filtres, légende, pliage global) — done

Commit : `6f0c3eb` (branche `claude/sprint-85-start-832373`, base `6cfadb2`).

## Résumé

- **Opt-in `layout`** (DEC-S85-005) : `TimelineViewProps.layout?: 'embedded' | 'screen'`,
  défaut `'embedded'` = rendu historique. Seule `app/[locale]/(app)/timeline/page.tsx` passe
  `layout="screen"`. La prop traverse `TimelineEditHost` sans code ; `TimelineResponsive` la
  **retient** et ne la transmet qu'à `TimelineView` (les variantes mobiles ne la reçoivent
  jamais). #602 branchera ses deux boutons sur cette même prop.
- **`hiddenCats`** (masquage) distinct de `collapsed` (repli). `visibleGroups` dérivé UNE fois,
  en amont de `buildVerticalModel`, `navLanes` (#81) et `renderGroups` ; `geometryKey` inclut
  `hiddenCats` ; minimap filtrée (`minimapEvents`), étendue (`computeRange`) inchangée pour ne
  pas déplacer le défilement. Aucun masquage → même identité que `groups` (mémos aval intacts).
  Focus roving : resource-keyé (MAJEUR-2) → une lane masquée retombe sur `firstNav`, exactement
  comme au repli.
- **Tout déplier / Tout plier** : `collapsed[cat] = v` pour TOUTES les catégories, masquées
  comprises ; n'altère pas `hiddenCats`.
- **`TimelineSidebar.tsx`** (nouveau, `React.memo`, props stables) : 4 blocs (accordéons,
  filtres, légende, raccourcis). Hook `useTimelineSidebarPanel` : panneau superposé < 1024 px,
  bouton « Filtres » (`aria-expanded` + `aria-controls`), focus entrant à l'ouverture, Échap
  (priorité dans le gestionnaire clavier global de `TimelineView`) et clic extérieur ferment,
  focus rendu au bouton ; franchir 1024 px referme.
- **Couleur de catégorie** (DEC-S85-006) : `Resource.categoryColor?: string | null`, mappée dans
  `useDashboardData` et `ProductDetailView` ; helper unique `categoryColorsOf(resources)`
  (`lib.ts`) — table `categoryColors` déjà calculée dans `TimelineView`, prête pour la pastille
  d'en-tête de #601. `countEventsByCategory` (compteur de la sidebar) aussi dans `lib.ts`.
- **Raccourcis** : source unique `buildTimelineShortcuts` pour la bulle `?` (dashboard, fiche
  produit) et le pied de sidebar (/timeline, où la bulle est retirée). « Plein écran » gardé
  pour `F` (#597). La touche « Échap » était codée en dur en français dans les 4 locales →
  clé `timeline.help.escapeKey` (fr « Échap », en/es/de « Esc »).
- **Disposition** : en `screen`, `.mt-tlv` devient une GRILLE (`.mt-tlv--screen`) :
  ≥ 1024 px `[side | toolbar / side | scroll]` ; < 1024 px la même `<aside>` passe en
  `position:absolute` sur la zone `scroll` (sous la barre d'outils, bouton dégagé),
  `display:none` quand fermée. Le plein écran (`rootRef` = la section) inclut la sidebar.

## Fichiers modifiés

- `frontend/src/components/timeline/TimelineSidebar.tsx` (nouveau)
- `frontend/src/components/timeline/TimelineSidebar.test.tsx` (nouveau)
- `frontend/e2e/sprint-85-timeline-sidebar.spec.ts` (nouveau)
- `frontend/src/components/timeline/TimelineView.tsx`
- `frontend/src/components/timeline/TimelineView.test.tsx`
- `frontend/src/components/timeline/TimelineResponsive.tsx`
- `frontend/src/components/timeline/lib.ts`
- `frontend/src/components/timeline/index.ts`
- `frontend/src/hooks/useDashboardData.ts`
- `frontend/src/components/products/ProductDetailView.tsx`
- `frontend/app/[locale]/(app)/timeline/page.tsx`
- `frontend/src/styles/ds/components/timeline.css`
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` (`timeline.sidebar.*`, `timeline.help.escapeKey`)
- `frontend/e2e/timeline.spec.ts` — le test « aide : le survol ouvre le panneau de raccourcis »
  visait `/timeline` où la bulle n'existe plus : déplacé sur le **dashboard** (layout `embedded`,
  même `TimelineView`), avec garde `data-layout="embedded"`.

## Écarts à la maquette et mesures

Mesures E2E (`readAtRest`, thème clair, annotations `contrast` du rapport JSON) + calcul sRGB
linéarisé sur les tokens pour le sombre (script scratchpad) :

| Élément | Maquette | Ratio maquette (clair / sombre) | Retenu | Ratio retenu (clair mesuré / sombre calculé) |
|---|---|---|---|---|
| Libellé d'une catégorie MASQUÉE | ligne `opacity:.4`, encre `ink` | **2,52:1 / 3,43:1** | pas d'opacité ; `ink-muted` + **barré** ; pastille en contour (maquette) | **6,11:1** / 5,85:1 |
| Compteur (ligne masquée) | `ink-faint` × `.4` | 1,44:1 / 1,46:1 | `ink-muted` | 6,11:1 / 5,85:1 |
| Titres de bloc (mono 10 px) | `ink-faint` | 2,82:1 / 2,99:1 | `ink-muted` | 6,11:1 / 5,85:1 |
| Pied raccourcis (texte / touches) | `ink-faint` / `ink-muted` | 2,82 / 2,99 | `ink-muted` / `ink` | 6,11:1 / 5,85:1 |

- **Barré** plutôt que la seule couleur : une catégorie SANS couleur a une pastille en contour
  neutre dans les DEUX états (DEC-S85-006) → sans le barré, l'état ne tiendrait qu'à l'écart
  `ink`/`ink-muted` (2,91:1, < 3:1). Convention de légende filtrable (séries masquées barrées).
- **Cadre du segmenté** : `rule-emphasis` (fonctionnel, ≥ 3:1) au lieu du `rule-strong` de la
  maquette (1,5:1) — ses boutons ont le fond de la sidebar, le cadre est leur seule limite
  (critère des tiers de bordure #352, même arbitrage que `.mt-zoom`). Pas de clip (#417).
- **Légende** (DEC-S85-002) : une seule entrée « Événement » (22×12, `accent`, `shadow-sm`).
  Ni « Occurrence à venir » ni « Récurrence ↻ » (#595). La correspondance couleur ↔ catégorie
  est portée par les pastilles des filtres.
- **Raccourcis** : 5 lignes (T, [ ], + −, F, Échap) avec les libellés `help.*` existants, pas
  le texte condensé de la maquette (« T aujourd'hui · [ ] naviguer »), ni « F recadrer » (#597).
- Pastille sans couleur en sombre : `rule-strong` #2E323A sur #131519 = 1,42:1, contour à peine
  visible — c'est la prescription de DEC-S85-006 (marque statique, tier décoratif) ; le nom de
  la catégorie porte l'information. À regarder en revue ui-design.
- Hauteur : quand la sidebar est plus haute que la frise (peu de lanes, ou catégories
  masquées), la ligne de grille s'allonge et la zone de frise montre un fond vide sous les
  lanes (capture 1280 sombre). Pas de hauteur imposée par la maquette hors écran autonome.

## Tests

- **Vitest** `rtk proxy npm test` : **125 fichiers, 1479/1479** verts.
  - `TimelineView.test.tsx` : 45 tests (13 nouveaux dans `#592 sidebar (layout screen)`) :
    défaut sans sidebar + bulle `?` ; `screen` sans bulle ; compteur = événements ; pastille
    `null` → aucun style inline ; masquer retire en-tête + lanes + barres de minimap ; masquer ≠
    replier (réaffichée repliée) ; tout plier/déplier ; tout plier vaut pour une masquée ;
    **navigation clavier après masquage d'une catégorie AU-DESSUS** (roving + ↑/Home/End) ;
    panneau : ouverture/focus/Échap/clic extérieur ; Échap ferme toujours le drawer.
  - `TimelineSidebar.test.tsx` : 11 tests avec les **vrais messages** des 4 locales + `onError`
    (PIT-S63-006) : « Véhicules, 3 événements », « Santé, 1 Ereignis », « Esc », parité des clés
    `timeline.sidebar` ; helpers `categoryColorsOf` / `countEventsByCategory`.
- `rtk proxy npm run typecheck` : exit 0 · `rtk proxy npm run lint` : 0 erreur/avertissement ·
  `rtk proxy npm run format:check` : conforme (4 fichiers reformatés par prettier avant commit).
- **E2E** (harnais :3100, `rtk proxy npx playwright test … --reporter=json`, comptes lus dans le JSON) :
  - `e2e/sprint-85-timeline-sidebar.spec.ts` : **7/7** + 5 setup (listing produits STUBBÉ :
    3 catégories dont une sans couleur, 4 événements — déterministe, aucune écriture sur PROD).
  - `e2e/sprint-85-timeline-sidebar.spec.ts` + `e2e/timeline.spec.ts` ensemble : **43 expected,
    0 unexpected, 0 flaky** (5 setup + 7 + 31).
  - `e2e/sprint-63-de-overflow-audit.spec.ts -g "frise chronologique"` : **4/4** (fr/en/es/de ×
    12 largeurs, aucun débordement de page avec la sidebar).
  - **Contrôles négatifs** (puis annulés, non committés) : (1) `visibleGroups = groups` →
    2 tests E2E rouges (masquage, clavier) ; (2) `navLanes` itérant `groups` au lieu de
    `visibleGroups` → E2E clavier rouge (`tabindex` de la 1re lane visible = -1) ET test vitest
    rouge. Les deux gardes mordent sur le risque n°1 du plan.
- Non exécuté (consigne) : `npm run build`, `test-quiet.sh frontend`, suite E2E complète.

## Signaux mémoire

- [MEMORY:pitfall] Context: `.mt-tlv__group-head` est `position:sticky; left:0` MAIS reçoit en ligne `width: railWidth` — une boîte sticky aussi large que son bloc conteneur n'a aucune marge pour glisser : le libellé de catégorie défile avec la piste et sort de l'écran dès que `scrollLeft > 0`. Latent sur le dashboard (rail souvent plus étroit que la frise → pas de scroll), **visible par défaut sur /timeline ≥ 1024 px** où la sidebar rétrécit la colonne de 248 px et le centrage sur aujourd'hui fait défiler. Solution: une CELLULE sticky interne de largeur fixe (maquette §B : gouttière `LH = 176px`, `position:sticky; left:0`), pas le bouton entier. Prevention: tout sticky horizontal doit être plus ÉTROIT que son conteneur ; vérifier en navigateur avec `scrollLeft > 0`, jsdom ne le voit pas.
- [MEMORY:pattern] Problem: un même panneau doit être colonne permanente ≥ 1024 px et superposition < 1024 px, rester dans l'élément plein écran, sans couvrir la barre d'outils. Solution: grille nommée sur la section (`"side toolbar" "side scroll"` / `"toolbar" "scroll"`) ; sous le palier, l'`<aside>` passe en `position:absolute` + `grid-area:scroll` — un enfant absolu d'une grille positionnée prend sa ZONE comme bloc conteneur. Les enfants sr-only (absolus) et le drawer (fixe) ne prennent pas de cellule. Anti-pattern: deux rendus (colonne + portail) ou un wrapper qui sort la sidebar de `rootRef`.
- [MEMORY:pattern] Problem: filtre de liste qui doit rester lisible et signaler l'état « masqué » sans opacité (maquette `opacity:.4` = 2,52:1). Solution: encre `ink-muted` (6,11:1) + libellé barré + pastille en contour ; `aria-pressed` (pressé = affiché) et nom accessible « catégorie, N événements ». Anti-pattern: opacité sur du texte, ou état porté par la seule couleur (une catégorie sans couleur a le même contour dans les deux états).
- [MEMORY:decision] Context: la maquette pose `ink-faint` sur les titres de bloc, compteurs et pied de sidebar (2,82:1 / 2,99:1). Decision: `ink-muted` partout où `ink-faint` porte du TEXTE dans la sidebar #592. Why: seuil 4,5:1 ; constat `ink-faint` déjà consigné non conforme (`bugs-resolved.md`) — à trancher au niveau charte (le token a d'autres consommateurs, dont l'eyebrow de `timeline/page.tsx`).

## Recommandations suite

- RECOMMAND_FOLLOWUP: pour #601 (même sprint) — le libellé d'en-tête de catégorie n'est PAS sticky horizontalement (`width: railWidth` en ligne sur un sticky, cf. pitfall ci-dessus) ; une pastille/compteur ajoutés au bouton actuel sortiraient de l'écran avec lui dès `scrollLeft > 0`. Implémenter la cellule sticky de largeur `LH` de la maquette §B. Consommer `categoryColors` (déjà calculé dans `TimelineView`, helper `categoryColorsOf`). [triage S | frontend/events]
- RECOMMAND_FOLLOWUP: token `--color-ink-faint` utilisé pour du texte (eyebrow de `timeline/page.tsx`, placeholders DS) à 2,82:1 / 2,99:1 — décision de charte à prendre (relever le token ou le réserver au non-textuel). [triage S | design-system]
- RECOMMAND_UI_DESIGN: revue des écarts assumés (barré de la ligne masquée, `ink-muted` au lieu de `ink-faint`, cadre `rule-emphasis` du segmenté, contour neutre quasi invisible en sombre pour une catégorie sans couleur, légende à une seule entrée) — prévue par le lead en fin de sprint.
- Pas de RECOMMAND_DB_EXPERT car aucun changement backend ni schéma (100 % frontend, DTO `category.color` déjà exposé).
- Pas de RECOMMAND_SECURITY car aucune surface d'authentification, de donnée personnelle ou d'API externe touchée.
- Pas de RECOMMAND_TEST_RUNNER car les suites jouées restent sous le seuil (E2E ciblées ≈ 1 min, vitest 30 s) ; la suite E2E complète reste au lead.

STATUS: COMPLETED
