# Issue #804 — Frise : libellé de pin coupé en bout d'étendue après recadrage (touche F)

## Résumé

**Objectif** : la marge de cadrage de `computeFit` reflète l'emprise réelle d'un pin + libellé, au lieu d'une marge unique de 40 px des deux côtés.

**Placement du libellé (lu avant de coder)** : `EventPin.tsx` — libellé À DROITE du pin, hors du pin ; `label-reserve.ts:52` — départ du libellé à `date + 11` (pin à `date − 5`, largeur 10, écart 6) ; `eventTrackExtent` (`zoom.ts`) — emprise d'un pin = `[date − 5, date + widthPx]`, `widthPx` ≥ `PIN_FOOTPRINT_PX` (100 desktop / 90 mobile). Gauche et droite diffèrent donc : 5 px à gauche, 100 px (plancher) à droite.

**Fichiers**
- `frontend/src/components/timeline/zoom.ts` — `FIT_MARGIN_PX` (40, symétrique) remplacé par `FIT_EDGE_AIR_PX = 35`, l'interface `FitMargins { leadPx, trailPx }` et `FIT_MARGINS_PX` dérivé des constantes du pin : desktop `{ leadPx: 5 + 35 = 40, trailPx: 100 + 35 = 135 }`, mobile `{ 40, 90 + 35 = 125 }`. `computeFit(extent, width, margins = FIT_MARGINS_PX.desktop)` : largeur utile = `width − leadPx − trailPx`, avance = `leadPx + reste / 2`. JSDoc à jour. Le bloc est placé APRÈS `PIN_FOOTPRINT_PX` (constante de module : la placer avant lèverait une TDZ au chargement).
- `frontend/src/components/timeline/zoom.test.ts` — 5 tests #597 recalculés ; nouveau bloc `#804` (8 tests).
- `frontend/src/components/timeline/TimelineView.fit-shortcut.test.tsx` — 2 constantes attendues recalculées (`FIT_ALL_PX` 880 → 927,5 ; `FIT_WITHOUT_C_PX` 744 → 791,5) + commentaire de calcul. Ce fichier n'était pas dans la liste du plan mais il code en dur la marge 40 : sans cette mise à jour il passait au rouge.

**Appelants de `computeFit`** (`/usr/bin/grep -rn computeFit frontend/src`) : un seul, `TimelineView.tsx:1358` (desktop, 2 arguments). Il prend le défaut desktop sans modification (fichier interdit, non touché). Les frises mobiles n'appellent pas `computeFit` ; `FIT_MARGINS_PX.mobile` est disponible pour un futur appelant qui passera le 3ᵉ argument.

**Mesures AVANT / APRÈS (géométrie, piste utile 824 px = viewport 1000 − gouttière 176)**
- Jeu 1 (2 pins à 21 j d'écart) : AVANT `week`, fin d'emprise du dernier pin à 869 px > 824, libellé coupé de 45 px ; APRÈS `month`, fin ≤ 789 px (35 px d'air).
- Jeu 2 (pin seul) : AVANT, date centrée : 312 px d'air à droite, 407 px à gauche ; APRÈS, l'emprise est centrée, même air des deux côtés.
- Jeu 3 (barre 200→230 + pin 261) : AVANT `month`, fin à 878 px > 824 ; APRÈS `quarter`, fin ≤ 789.
- Mobile (piste 700, pins à 18 j) : AVANT fin > 700 ; APRÈS fin ≤ 665.

**Limite connue (non traitée, hors plan)** : le plancher de 100 px couvre un libellé d'environ 19 caractères desktop ((135 − 11) / 6,3 px/car.). Au-delà (#746 : réserve jusqu'à 251 px), le libellé du dernier pin peut encore être coupé. Le test « libellé plus long que le plancher » le prouve (fin > piste avec le défaut) et montre le correctif côté appelant : `trailPx = max(135, réserve + 35)`. Cela exige que `TimelineView` passe la réserve réelle du pin de queue → RECOMMAND_FOLLOWUP ci-dessous. Autre limite : en niveau `year`, les 30 jours de marge du rail (PIT-S105-003) ne valent que 66 px. Si le défilement est rabattu au bout du rail, ces 66 px sont inférieurs aux 135 px de marge droite (follow-up déjà émis au S105).

**Tests (résultats exacts)**
- `npx vitest run src/components/timeline/zoom.test.ts` → 42 passed (42).
- `npx vitest run src/components/timeline/` → 24 fichiers, 376 passed (376).
- Contrôle négatif (mutation : défaut `computeFit` remis à `{ leadPx: 40, trailPx: 40 }`) → 8 failed | 34 passed. Les 4 tests #597 recalculés et les jeux 1 à 4 du bloc #804 passent au rouge ; restauration vérifiée (0 occurrence de la mutation). Chaque jeu #804 porte aussi son propre contrôle négatif : le cadrage avec 40/40, qui coupe le libellé.
- `npx tsc --noEmit` → exit 0 ; `npx next lint --file` (3 fichiers) → « No ESLint warnings or errors » ; `rtk proxy npx prettier --check` (3 fichiers) → « All matched files use Prettier code style! ».
- Pas de Playwright, pas de `next build`, pas de `test-quiet.sh` (consigne de vague).

**Pour l'agent V2 (#805) — E2E « F, libellé entier » dans `frontend/e2e/sprint-105-fit-shortcut.spec.ts`**
1. La spec existante VA ROUGIR, et c'est attendu :
   - `:46` `FIT_MARGIN_PX = 40` et `:170` `usablePx − 2 × FIT_MARGIN_PX` → `usablePx − 40 − 135` (prémisse [704, 1560[ toujours tenable à 1920 px : environ 1023 px).
   - `:250` `|g.left − g.right| ≤ 1,5` (centres des pins) : avec des marges asymétriques, `g.right − g.left` vaut `135 − 40 = 95` (± 1,5) quand le rail ne rabat pas.
2. Nouvelle mesure : après `F`, pour le pin de queue, `[data-testid="timeline-event"][data-event-title="<T>"] .mt-evt-pin__label` → `getBoundingClientRect().right ≤ trackRight` (`trackRight = x0 + el.clientWidth` de `timeline-scroll`, déjà calculé par `readFrame`). Marge attendue `trackRight − label.right ≥ 35 + (100 − 11 − largeur du texte) ≥ 35` px, à 1 px près. Pour le pin de tête : `.mt-evt-pin` `left − trackLeft ≥ 35`. Le libellé ne doit pas être tronqué par l'ellipse : `scrollWidth ≤ clientWidth`.
3. Jeux : au moins 3 jeux, titres ≤ 19 caractères (le plancher ; au-delà, voir le follow-up), étendues qui NE tombent PAS en `year` (le rail de 66 px rabattrait le défilement). Par exemple 2 pins à ~21 j, barre + pin à ~61 j, pin seul.

## Commits

- Un seul commit `:bug: fix(timeline): …#804` contenant code, tests et ce fichier. Son SHA ne peut pas figurer dans le commit lui-même : il est reporté dans le retour au lead. Vérification : `/usr/bin/git -C <worktree> log --oneline --grep '#804'`, puis `branch --contains <sha>` → `sprint/117`.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-117/briefing-804.md` — lu intégralement (périmètre, fichiers interdits, format du livrable).
- `.ai-env/context-packs/pit-frontend.md` — par pointeur : PIT-S105-003 (l.1772, ~878 px de piste utile et 30 j de marge de rail → limite `year` ci-dessus), PIT-S105-002 (l.1768, titre seul) ; PIT-S91-003 (l.1444) et PIT-S112-* (l.1852-1884) : titres parcourus, sans objet pour un calcul pur. `computeFit` et `PIN_FOOTPRINT` : 0 occurrence dans le pack.
- `.ai-env/context-packs/br-events.md` — `/usr/bin/grep` « frise » : l.154 DEC-S86-001 (agrégation par catégorie produit), aucune règle sur le cadrage ; sans impact.
- `docs/memory/sprints/sprint-105/issue-597-done.md` — l.21 (algorithme `clientWidth − 176 − 2 × 40`), l.23 (centrage borné par le rail), l.57 (RECOMMAND_FOLLOWUP d'origine de #804).
- `docs/memory/sprints/sprint-112/issue-767-830-done.md`, `issue-768-done.md` — NON LU : origine de #837 (autre agent), sans lien avec `computeFit`.
- Code : `zoom.ts` (l.100-420), `label-reserve.ts` (en entier), `EventPin.tsx`, `TimelineView.tsx:1335-1385` (lecture seule), `TimelineView.fit-shortcut.test.tsx`, `e2e/sprint-105-fit-shortcut.spec.ts:30-60, 115-250` (lecture seule).

## Signaux mémoire

- [MEMORY:pitfall] Contexte : constante exportée de `zoom.ts` dérivée d'autres constantes de module (`FIT_MARGINS_PX` ← `PIN_FOOTPRINT_PX`). Solution : la déclarer APRÈS ses sources. Prévention : une constante de module évaluée avant une autre `const` lève une ReferenceError (TDZ) au chargement, pas au typage, donc `tsc` ne la voit pas.
- [MEMORY:pattern] Problème : un test de cadrage qui passe toujours ses marges en argument ne couvre pas le défaut utilisé par l'appelant réel. Solution : le helper de test appelle `computeFit(extent, width)` sans 3ᵉ argument quand il simule `TimelineView`. Ce choix a été prouvé par mutation : 4 → 8 rouges. Anti-pattern : paramètre par défaut du helper = la constante, qui rend la mutation du défaut invisible.
- [MEMORY:decision] Contexte : #804. Décision : marges de cadrage asymétriques dérivées de l'emprise du pin (`5 + 35` / `100 + 35`), défaut desktop. La réserve dynamique d'un long libellé passe par le 3ᵉ argument de l'appelant. Pourquoi : `zoom.ts` ne peut pas importer l'estimateur de `label-reserve.ts` (qui importe `zoom.ts` et évalue `PIN_HALF_WIDTH_PX` au chargement : cycle avec TDZ), et `TimelineView.tsx` était hors périmètre de la vague.

## Recommandations suite

- RECOMMAND_FOLLOWUP: frise — `TimelineView.fitToEvents` doit passer à `computeFit` `trailPx = max(FIT_MARGINS_PX.desktop.trailPx, réserve réelle du pin de queue + FIT_EDGE_AIR_PX)` (réserve `pinFootprintPx` de `label-reserve.ts`, ou `labelTrailPx` d'une barre à libellé extérieur) pour couvrir les titres > 19 caractères [triage XS | domaine events/frontend]
- RECOMMAND_FOLLOWUP: E2E V2 (#805) — mettre à jour `sprint-105-fit-shortcut.spec.ts:46/:170/:250` (marges 40/135, écart de centrage attendu 95 px) et ajouter la mesure du libellé décrite au Résumé [triage XS | domaine frontend/e2e]
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché, correctif purement frontend.
- Pas de RECOMMAND_SECURITY : calcul géométrique pur, aucune donnée ni entrée utilisateur.
- Pas de RECOMMAND_UI_DESIGN : position de cadrage seulement, aucun token, style ou composant modifié ; l'air de 35 px est hérité de #597.
- Pas de RECOMMAND_TEST_RUNNER : suites ciblées jouées (376/376 timeline) ; l'E2E relève de la V2 et du lead.

STATUS: COMPLETED
