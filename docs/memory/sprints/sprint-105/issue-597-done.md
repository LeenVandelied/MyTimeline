# Issue #597 — Frise : la touche F recadre la vue sur les événements (au lieu du plein écran)

## Objectif

La touche `F` de la frise desktop doit RECADRER la vue sur les événements réellement affichés (handoff), au lieu d'ouvrir le plein écran. Le plein écran n'a plus que son bouton (`timeline-fullscreen`), et `Échap` le quitte toujours (arbitrage du dev). L'aide (`?`) et le pied de la sidebar annoncent le recadrage.

## Fichiers modifiés

- `frontend/src/components/timeline/zoom.ts` — action `FIT` (`{ level, offsetDays }`, renvoie toujours un objet neuf) ; `displayedEventDayExtent(indexed, displayedResourceIds)` (étendue en jours, lue sur les données) ; `FIT_MARGIN_PX = 40` ; `computeFit(extent, viewportTrackWidthPx)`.
- `frontend/src/components/timeline/TimelineView.tsx` — `fitToEvents` (choix des ressources affichées, puis `computeFit` sur `clientWidth − LANE_TRACK_OFFSET_PX`) ; `useLayoutEffect` armé par `pendingFitRef` qui applique le défilement ; `case 'f'/'F'` → `fitToEvents()` ; commentaire #395 corrigé (F n'est plus un chemin du plein écran). `toggleFullscreen` et le bouton ne changent pas.
- `frontend/src/components/timeline/TimelineSidebar.tsx` — `buildTimelineShortcuts` : `['F', t('help.fit')]` (sert aussi à la bulle `?`).
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` — `timeline.help.fit` : « Recadrer sur les événements » / « Fit to events » / « Encuadrar los eventos » / « Auf Ereignisse einpassen ». `help.fullscreen` est conservé (c'est l'`aria-label` du bouton).
- Tests unitaires : `zoom.test.ts` (+9), nouveau `TimelineView.fit-shortcut.test.tsx` (7), `TimelineView.test.tsx` (test Cmd/Ctrl+F réécrit, raccourcis de la sidebar), `TimelineView.modal-shortcuts.test.tsx` (F neutralisé sous le panneau : on vérifie maintenant zoom + défilement ; la contrepartie « F agit » vient après T), `TimelineSidebar.test.tsx` (libellé fr + 3 locales).
- E2E : nouvelle `frontend/e2e/sprint-105-fit-shortcut.spec.ts` (2 tests) ; `sprint-94-modal-shortcuts.spec.ts` (contrepartie : F doit DÉPLACER la vue, et on entre en plein écran par le bouton pour garder la sortie par Échap sous test) ; `sprint-85-timeline-sidebar.spec.ts:160` et `timeline.spec.ts:728` (libellé attendu « Recadrer sur les événements », plus « Plein écran »).

## Décisions et écarts

- **Ce qui compte comme « affiché »** — c'est la règle du rendu (`renderGroups`) : une catégorie MASQUÉE est exclue ; une catégorie REPLIÉE compte (son résumé peint tous ses événements, #601, y compris ceux d'un produit replié à l'intérieur) ; un PRODUIT replié dans une catégorie dépliée est exclu (sa lane ne peint rien, #195). Les événements sans `resourceId` sont déjà écartés par `indexEventsByResource`.
- **Étendue** — calculée en jours depuis `indexedEvents` (données, invariant au zoom), jamais depuis le DOM virtualisé (PIT-S91-005). Une durée court jusqu'à `dayOffset + spanDays` ; un ponctuel s'arrête à sa date (le pin est centré dessus).
- **Écart de signature** — le briefing proposait `computeFit(visibleEventExtent, viewportTrackWidthPx, rangeStart)`. `rangeStart` est inutile : l'étendue est déjà en jours depuis `rangeStart`, et c'est le repère de `offsetDays`.
- **Algorithme** — largeur utile = `clientWidth − 176 − 2 × 40`. On calcule d'abord le px/jour idéal (`largeur utile / jours`, infini pour un seul jour), puis le premier niveau de `ZOOM_LEVELS` (du plus fin au plus large) dont `DAY_WIDTH_PX` ne le dépasse pas ; à défaut, `year`. Commentaire #593 : un zoom continu garderait le px/jour idéal tel quel. `offsetDays` centre l'étendue ; si elle déborde même en `year`, elle est alignée à gauche avec la marge de 40 px. Le décalage est borné à 0 ; à droite, c'est le navigateur qui le rabat.
- **Marge de 40 px** — elle couvre la demi-largeur du pin (5 px) avec de l'air. Limite connue : le LIBELLÉ d'un pin placé en bout d'étendue (emprise 100 px) peut être coupé par le bord droit. Remonté en follow-up.
- **Centrage borné par le rail** — `computeRange` ne laisse que 30 jours de marge autour des événements. Quand le recadrage porte sur tous les événements, l'avance de centrage dépasse souvent ces 30 jours, et le cadrage bute sur le bord gauche du rail : tout est visible mais pas centré. Constaté par E2E (1re spec). Le centrage exact n'est mesuré que quand des catégories masquées élargissent le rail (2e spec).
- **Ordre zoom/défilement (le risque signalé par le lead)** — le défilement est appliqué par un `useLayoutEffect` placé APRÈS la re-projection d'ancre #449 (qui s'exécute donc avant lui dans le même commit), avec `behavior:'instant'`. Il est armé par `pendingFitRef`, pas par la valeur d'`offsetDays`. `FIT` rend toujours un nouvel objet, donc un 2e `F` après un défilement manuel (même niveau, même offset) re-rend et ré-applique le cadrage. `lastOffsetRef` est aligné pour que l'effet #392 ne rejoue pas le même défilement.
- **Constat en contrôle négatif** — sans cet effet (seul l'effet #392 sur `offsetDays`, qui écrit `el.scrollLeft =`), le rendu réel est FAUX lors d'un changement de niveau : centrage à 332 px contre 216. Il ne s'agit donc pas seulement du cas « même offset ». La cause n'est pas vérifiée. Hypothèse : `scroll-behavior:smooth` du conteneur anime l'écriture `scrollLeft =`, et la course avec l'ancre #449 fausse la position finale.
- **Mobile** (`useTimelineMobileState.ts`) : hors périmètre. Il partage le reducer mais ne déclenche jamais `FIT`.
- **Aucun événement affiché** (tout masqué, ou viewport sans largeur) : `computeFit` rend `null`, donc `F` ne fait rien.

## Tests

- `cd frontend && rtk proxy npx vitest run src/components/timeline` → 23 fichiers, **363 passed**.
- `rtk proxy npx vitest run` (suite complète) → 158 fichiers, **2029 passed**.
- `rtk proxy npx tsc --noEmit` → exit 0. `rtk proxy npx next lint --file …` (10 fichiers TS/TSX touchés) → 0 avertissement. `rtk proxy npx prettier --check` (fichiers touchés + 4 JSON de locales) → OK.
- E2E (stack du lead, `:3100`/`:8086`) : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test <les 16 specs du briefing> --reporter=line` :
  - 1er run → 106 passed / 2 failed : `sprint-85-timeline-sidebar:121` et `timeline.spec:695`. Les deux attendaient le libellé « Plein écran » dans les raccourcis : régression attendue de cette issue, pas un défaut préexistant. Libellés corrigés, puis 2/2 verts en rejeu ciblé.
  - Run complet final → **108 passed / 0 failed** (dont 5 setup). Aucun PNG `-darwin` ni `test-results` suivi.
- **Contrôles négatifs unitaires** (vitest, 3 fichiers TimelineView, 74 tests ; source restaurée à chaque fois) :
  - effet de cadrage neutralisé → 1 rouge (« F deux fois, et F après un défilement manuel »).
  - `case 'f'` → `toggleFullscreen` → 7 rouges.
  - `groups` au lieu de `visibleGroups` (masquées incluses) → 2 rouges.
  - catégorie repliée exclue → 1 rouge.
  - produit replié inclus → 1 rouge.
- **Contrôles négatifs E2E** (`sprint-105-fit-shortcut`, source restaurée) :
  - `case 'f'` → `toggleFullscreen` → 2/2 rouges.
  - effet de cadrage neutralisé → 1 rouge (« centrage 332 vs 216 », voir Décisions).
  - masquées incluses → 1 rouge (le niveau ne s'affine pas).
- Prémisses assertées dans la spec : piste utile hors marges dans [704, 1560[. Elle vaut 798 px pour un viewport de 1600 (shell + sidebar), d'où le viewport de 1920. Au chargement, les pins extrêmes ne sont pas tous montés. Enfin, `0 < scrollLeft < max` avant de mesurer le centrage.

## Signaux mémoire

- [MEMORY:pitfall] Contexte : #597, pour poser niveau ET décalage de la frise d'un coup. L'effet #392 (`el.scrollLeft = offsetDays × dayWidth`, gardé sur la valeur d'`offsetDays`) donne une position finale fausse en navigateur réel dès que le niveau change dans la même action (E2E : 332 px contre 216 attendus). Il ne rejoue rien non plus quand l'offset est identique (F après un défilement manuel). Solution : `useLayoutEffect` placé après la re-projection #449, armé par un ref, avec `scrollTo({behavior:'instant'})`. Prévention : toute action qui change l'échelle ET la position doit appliquer le défilement dans un effet de mise en page ordonné après #449, et le prouver par une mesure de `getBoundingClientRect` en E2E (jsdom ne clampe rien).
- [MEMORY:pitfall] Contexte : E2E de cadrage sur l'écran `/timeline`. À 1600 px de viewport, la piste utile de la frise (hors shell, sidebar et gouttière de 176 px) ne fait que ~878 px, et le rail n'a que 30 jours de marge (`computeRange`). Un cadrage « centré » sur tous les événements bute donc sur le bord du rail. Prévention : asserter la largeur utile en prémisse, et mesurer le centrage seulement quand le rail a de la place des deux côtés (catégories masquées qui l'élargissent).
- [MEMORY:decision] Contexte : #597. Décision : `F` = recadrage, plein écran = bouton seul (arbitrage du dev) ; `help.fullscreen` est gardé comme `aria-label`. « Affiché » = règle du rendu : masquée exclue, catégorie repliée incluse (résumé #601), produit replié exclu. Pourquoi : le cadrage doit correspondre à ce que l'œil voit.

## Recommandations suite

- RECOMMAND_FOLLOWUP: frise — le libellé d'un pin en bout d'étendue peut être coupé après `F` (marge de 40 px < emprise de 100 px du pin) ; évaluer une marge droite qui dépend de `PIN_FOOTPRINT_PX` ou de `labelTrailPx` [triage XS | frontend]
- RECOMMAND_FOLLOWUP: frise — `[`/`]`/`T` passent par `el.scrollLeft =` sous `scroll-behavior:smooth` ; le contrôle négatif de #597 a mesuré une position finale fausse sur ce chemin quand le niveau change aussi. Vérifier si `[`/`]` enchaînés à `+`/`-` dérivent (mesure navigateur) [triage S | frontend]
- RECOMMAND_FOLLOWUP: frise — le rail n'a que 30 jours de marge (`computeRange`) : un recadrage sur tous les événements ne peut pas être centré ; décider s'il faut élargir la marge au besoin du cadrage [triage XS | frontend]
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : changement de comportement clavier et de défilement purement client, aucune donnée ni appel réseau nouveau.
- Pas de RECOMMAND_TEST_RUNNER : les 16 specs de la surface (108 tests) et la suite Vitest complète (2029) ont déjà été jouées.
- Pas de RECOMMAND_UI_DESIGN : comportement dicté par le handoff (touche `F` = recadrer), aucun token ni composant visuel nouveau ; la marge de 40 px est consignée ci-dessus.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-105/briefing-597.md` — en entier.
- `.ai-env/context-packs/cp-frontend.md` — en entier (sections « Stack réelle » à « Références »).
- `.ai-env/context-packs/pit-frontend.md` — par grep : PIT-S86-001 (l.1264), PIT-S94-001 à 007 (l.1528-1553) ; extrait inline du briefing : PIT-S27-003, PIT-S64-009, PIT-S85-003, PIT-S91-005.
- `docs/memory/sprints/sprint-104/issue-616-done.md` — gabarit (titres de sections, forme des recommandations).
- `frontend/src/components/timeline/TimelineView.tsx` — l.600-790 (état, `visibleGroups`, `collapsedCategoryEvents`), l.865-890 (`navLines`), l.1125-1500 (ancre #449, effet #392, plein écran, clavier), l.1550-1700 (`renderGroups`).
- `frontend/src/components/timeline/zoom.ts` — en entier jusqu'à `scaleEventPositions`.
- `frontend/e2e/sprint-105-lane-zebra.spec.ts` (motif de stub du listing produits), `frontend/e2e/sprint-94-modal-shortcuts.spec.ts` (en entier), `frontend/e2e/support/products.ts` l.20-101.
- `gh issue view 597` — corps de l'issue.

STATUS: COMPLETED
