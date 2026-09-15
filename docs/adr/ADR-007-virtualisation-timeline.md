# ADR-007 — Virtualisation de la frise : implémentation maison plutôt qu'une librairie de windowing

- Statut : Accepté
- Date : 2026-07-28
- Contexte : Sprint 49, issue #69 (frontend — virtualisation de la Timeline > 1000 événements)

## Contexte

`TimelineView` (frise desktop) montait **tous** les événements et **toutes** les
lanes en une passe. Mesure baseline (protocole en fin de document) :

| À 1000 événements / 120 lanes | Valeur |
|---|---|
| Pastilles dans le DOM | **1000** |
| Pastilles HORS viewport | **967 (96,7 %)** |
| Nœuds DOM sous la frise | 3 889 |
| Rendu initial → commit | 145,9 ms |
| Rendu initial → 2ᵉ frame après commit | 301,7 ms |
| Scroll horizontal : durée moyenne de frame | 33,8 ms |
| Scroll horizontal : p95 / max | 108,3 ms / 133,4 ms |
| Frames > 16,7 ms (sur 89) | 36 |

Deux causes distinctes, souvent confondues :

1. **Le DOM inutile** — 96,7 % des pastilles montées ne sont jamais vues.
2. **Le re-rendu au scroll** — `onScroll` appelait `setViewportStart` /
   `setViewportRatio` (synchronisation de la minimap) à **chaque événement de
   scroll**, donc un re-rendu complet de la frise par événement. C'est ce poste,
   et non le nombre de nœuds, qui explique les frames à 108 ms.

> ⚠ Périmètre : le corps de l'issue #69 désigne `components/calendar/TimelineCalendar.tsx`.
> Ce fichier est **mort depuis le Sprint 42** (aucun import, aucun montage — seules
> subsistent des références en commentaire). Le chemin de rendu réel est
> `TimelineEditHost` → `TimelineResponsive` → `TimelineView` (desktop) /
> `TimelineMobilePortrait` / `TimelineMobileLandscape`. C'est celui-ci qui est traité.

## Décision

**Virtualisation maison** (`src/components/timeline/virtualization.ts` +
`useTimelineViewport.ts`), **sans nouvelle dépendance** (`frontend/package.json`
reste sans librairie de windowing).

Trois raisons, dans l'ordre de poids :

1. **L'axe horizontal n'est pas une liste.** Les pastilles sont des
   **intervalles absolus** `[leftPx, leftPx + widthPx]` posés sur un rail
   (`positionEvents`, `zoom.ts`) : deux événements se chevauchent, un événement
   « long » couvre 300 px pendant que son voisin en couvre 6. Le fenêtrage est
   un test d'**intersection d'intervalles**. Le modèle de `@tanstack/react-virtual`
   et de `react-window` est `index → offset` avec `estimateSize(index)` : il
   suppose des items **consécutifs et non chevauchants**. Le faire cadrer
   supposerait de fabriquer un index synthétique par colonne de temps — soit
   réécrire l'intersection d'intervalles à la main, mais à travers la librairie.
2. **L'axe vertical est trivial.** Les lanes ont une hauteur **uniforme et
   connue** (`--lane-height` du DS, mesurée sur le DOM au premier layout). Aucune
   mesure par ligne, aucun `ResizeObserver`, aucune calibration d'`estimateSize` :
   le modèle tient en une addition (`buildVerticalModel`). Introduire une
   dépendance pour cela serait payer un coût d'intégration sans contrepartie.
3. **La structure DOM et le contrat a11y doivent survivre.** La frise porte un
   pattern clavier livré en #81 (région landmark + roving tabindex resource-keyé
   + annonces `aria-live`), verrouillé par 20 tests. Les librairies de windowing
   imposent leur propre conteneur, leur propre positionnement absolu et leur
   propre ordre de nœuds. Le rendu maison n'a rien déplacé : les lanes restent
   les mêmes nœuds, aux mêmes places, avec les mêmes `data-testid`.

### Ce qui est implémenté

- **Axe horizontal — toujours actif.** Seuls les événements dont l'intervalle
  croise la plage temporelle visible (+ `OVERSCAN_X_PX = 600`) sont montés.
- **Axe vertical — au-delà de `LANE_VIRTUALIZATION_MIN_ROWS = 60` lanes.** Seules
  les lanes de la fenêtre (+ `OVERSCAN_Y_PX = 320`) sont montées, encadrées de
  deux **cales** qui préservent la hauteur totale : la barre de défilement, la
  ligne TODAY et les overlays week-end (positionnés en absolu sur toute la
  hauteur) ne bougent pas. Contrôle : `document.scrollHeight` **identique** avant
  et après (5 995 px dans les deux cas).
- **Coalescence du scroll.** La synchronisation de la minimap et la remesure de
  la fenêtre passent par un `requestAnimationFrame` : au plus **une** mesure et
  un re-rendu par frame, au lieu d'un par événement de scroll.
- **Hystérésis.** La bande *rendue* = bande visible + overscan. Tant que la vue
  reste dans la bande rendue, **aucun `setState`** : le scroll intra-bande est
  gratuit.

### Pourquoi un seuil sur l'axe vertical et pas sur l'axe horizontal

En dessous de 60 lanes, la frise pèse ~2 800 px de lignes : les monter toutes
coûte moins cher que les fenêtrer (cales + recalcul au scroll de page), et le
DOM complet garde les parcours E2E et les frises modestes strictement inchangés.
L'axe horizontal, lui, est rentable dès la première frise réelle : c'est celui
qui porte 96,7 % du gâchis mesuré.

### Repli « mesure impossible » (et conséquence sur les tests)

Si le conteneur a une largeur nulle — jsdom, `display:none`, composant pas
encore mis en page — le fenêtrage produirait une fenêtre vide et **la frise
disparaîtrait**. Dans ce cas, `useTimelineViewport` publie des bandes non bornées
(`UNBOUNDED_BAND`) : **tout est rendu**, comportement identique à l'avant-#69.

C'est ce qui permet aux **677 tests unitaires de passer sans qu'une seule
assertion soit modifiée** (jsdom ne fait aucune mise en page → `clientWidth === 0`
→ repli). Corollaire honnête : **les tests jsdom n'exercent pas le fenêtrage**.
C'est pourquoi le cœur pur est testé séparément (`virtualization.test.ts`, 11 cas)
et pourquoi la validation du comportement réel est faite **au navigateur** (§
Méthodologie).

### `aria-setsize`/`aria-posinset` plutôt que `aria-rowcount`/`aria-rowindex`

L'issue suggère `aria-rowcount`/`aria-rowindex` pour annoncer le nombre réel de
lignes malgré le démontage. Ces deux attributs **exigent un rôle `grid`, `table`
ou `treegrid`** sur l'ancêtre et `role="row"` sur les lignes ; posés sans ce
rôle, ils sont ignorés. Or la frise n'est pas une grille ARIA : c'est une
**région** avec un roving tabindex (#81), et la convertir en `grid` remplacerait
le modèle d'interaction clavier documenté dans `ux-patterns.md` §9 — un
changement de plus grande ampleur que la virtualisation elle-même, et un risque
de régression a11y net.

Retenu à la place : la liste de lanes de chaque catégorie porte `role="list"`,
chaque lane `role="listitem"` + `aria-posinset` / `aria-setsize`. Le lecteur
d'écran annonce « lane 37 sur 120 » même quand 24 lanes seulement sont montées —
**la même information**, avec un rôle valide et sans toucher au pattern clavier.

### Navigation clavier : aucune cible « sautée »

`focusNav` ne peut plus supposer que la pastille visée est dans le DOM. Séquence :
(1) élargir la bande rendue à la cible (`ensureVisible`) ; (2) mémoriser la
coordonnée (`pendingFocusRef`) ; (3) focaliser dès que le nœud apparaît, via un
effet rejoué après chaque rendu. Les index de navigation restent ceux du modèle
**complet** (`windowEvents` conserve l'index d'origine de chaque événement) :
le fenêtrage ne renumérote rien.

## Alternatives rejetées

- **`@tanstack/react-virtual`** — la meilleure candidate sur le papier (windowing
  2D, sans opinion de layout, ~4 ko). Rejetée sur l'axe horizontal : son modèle
  `index → estimateSize` ne représente pas des intervalles chevauchants ; on
  aurait dû lui fournir un index synthétique calculé par… une intersection
  d'intervalles maison. Sur le seul axe vertical elle aurait fonctionné, mais
  pour remplacer une addition de hauteurs uniformes par une dépendance.
- **`react-window`** — 1D, hauteurs uniformes : il couvre l'axe vertical et
  **rien** de l'axe horizontal, qui est là où se trouve le gain. Il impose en
  outre son conteneur et le positionnement absolu des lignes, ce qui déplace les
  lanes et les labels sticky.
- **Pagination / plafonnement du nombre d'événements affichés** — change le
  produit (l'utilisateur ne voit plus sa frise entière) pour un problème de
  rendu. Hors sujet.
- **Ne traiter que le re-rendu au scroll (coalescence rAF seule)** — corrige les
  frames à 108 ms mais laisse 1000 nœuds inutiles au montage : le rendu initial
  serait resté à ~145 ms. Retenu **en plus**, pas à la place.

## Mesures

### Méthodologie (reproductible)

- **Banc** : `frontend/src/components/timeline/TimelineView.perf.stories.tsx`
  (stories `Stress500` / `Stress1000`) + générateur déterministe
  `stress-fixtures.ts` (PRNG `mulberry32`, graine fixe) : 500 ou 1000 événements
  sur **120 produits / 12 catégories**, étalés sur ±200 jours autour d'un
  « aujourd'hui » figé. Zoom initial `month` (12 px/jour).
- **Pilotage** : script Playwright (Chromium headless, viewport 1440×900) chargeant
  `iframe.html?id=…` et lisant `window.__mtTimelinePerf`. Scroll simulé à
  120 px/frame (horizontal) et 90 px/frame (vertical) sur 90 frames, durées de
  frame relevées en `requestAnimationFrame`.
- **Ce qui est chronométré** : `commitMs` = début du 1ᵉʳ rendu React →
  `useLayoutEffect` (commit DOM) ; `paintedMs` = jusqu'à la 2ᵉ frame après commit.
  La génération du jeu de données est mesurée **à part** (`datasetMs` : 0,9 ms à
  500, 2,2 ms à 1000) et exclue.
- **Échantillonnage** : « après » = **médiane de 3 exécutions** ; « baseline » =
  **1 exécution** (le code d'origine n'existe plus dans l'arbre ; on ne rejoue pas
  une baseline reconstituée qui n'aurait plus la même signification). Réserve
  assumée sur la variance des chiffres baseline ; les **comptages de nœuds**, eux,
  sont déterministes.
- ⚠ La baseline a été relevée avant l'isolement de `datasetMs` : ses `commitMs`
  incluent donc la génération (0,9 / 2,2 ms). Correction négligeable, non appliquée.

### 500 événements / 120 lanes

| Métrique | Baseline | Après | Δ |
|---|---|---|---|
| Rendu initial (commit) | 92,8 ms | **24,9 ms** | −73 % |
| Rendu initial (peint) | 197,9 ms | **53,1 ms** | −73 % |
| Pastilles dans le DOM | 500 | **26** | −95 % |
| Lanes dans le DOM | 120 | **24** | −80 % |
| Nœuds DOM sous la frise | 2 389 | **509** | −79 % |
| Pastilles hors viewport | 482 | **8** | — |
| Scroll H : frame moyenne | 20,6 ms | **10,1 ms** | −51 % |
| Scroll H : p95 / max | 41,6 / 158,3 ms | **16,7 / 67–99 ms** | — |
| Scroll H : frames > 16,7 ms (/89) | 35 | **3–4** | — |
| Scroll V : frame moyenne | 8,3 ms | 8,9 ms | +7 % |

### 1000 événements / 120 lanes

| Métrique | Baseline | Après | Δ |
|---|---|---|---|
| Rendu initial (commit) | 145,9 ms | **52,0 ms** | −64 % |
| Rendu initial (peint) | 301,7 ms | **81,5 ms** | −73 % |
| Pastilles dans le DOM | 1000 | **51** | −95 % |
| Lanes dans le DOM | 120 | **24** | −80 % |
| Nœuds DOM sous la frise | 3 889 | **584** | −85 % |
| Pastilles hors viewport | 967 | **18** | — |
| Scroll H : frame moyenne | 33,8 ms | **9,9 ms** | −71 % |
| Scroll H : p95 / max | 108,3 / 133,4 ms | **16,7–18,3 / 26,6–33,4 ms** | — |
| Scroll H : frames > 16,7 ms (/89) | 36 | **7–10** | — |
| Scroll H : frames > 33 ms (/89) | 36 | **0–1** | — |
| Scroll V : frame moyenne / p95 | 8,3 / 9,0 ms | 9,2 / 16,7 ms | + |
| ↓ ×25 au clavier | 25 atteintes, 0 ratée | 25 atteintes, 0 ratée | = |

### Budget de rendu retenu

L'issue proposait « < 16 ms par frame pour 1000 événements **ou seuil convenu** ».
**16 ms pour un MONTAGE initial n'est pas atteignable** et ne mesure pas la bonne
chose : monter une vue applicative complète coûte structurellement plus qu'une
frame, y compris à 0 événement. Budget retenu, en deux volets :

| Volet | Seuil | Mesuré à 1000 events | Verdict |
|---|---|---|---|
| Montage initial — commit | ≤ 100 ms | 52,0 ms | ✅ |
| Montage initial — peint | ≤ 150 ms | 81,5 ms | ✅ |
| Interaction — frame médiane | ≤ 16,7 ms | 9,9 ms (H) / 9,2 ms (V) | ✅ |
| Interaction — aucune frame > 50 ms (« pas de freeze ») | 0 | max 33,4 ms | ✅ |
| Interaction — 60 fps tenus en continu | 0 frame > 16,7 ms | 7–10 frames /89 | ❌ |

**Le dernier volet n'est pas tenu et n'est pas masqué** : sur un défilement
continu et volontairement violent (120 px/frame ≈ 7 200 px/s), 8 à 11 % des
frames dépassent 16,7 ms — ce sont les franchissements de bande, qui déclenchent
un re-rendu de la frise. Aucune ne dépasse 33,4 ms (baseline : 133,4 ms, 40 % des
frames au-delà de 16,7 ms). Piste connue pour la suite : mémoïser les lanes
(`React.memo`) afin qu'un franchissement de bande ne réconcilie que les lanes
entrantes/sortantes.

### Coût assumé : le scroll vertical

La baseline ne re-rendait rien au scroll vertical (pur défilement de page,
composité par le navigateur) : 8,3 ms de frame moyenne. Le fenêtrage vertical
introduit un re-rendu par franchissement de bande → 9,2 ms de moyenne, p95
16,7 ms, max 17,5 ms. **C'est une régression assumée** : elle achète −85 % de
nœuds DOM et −64 % sur le montage, et reste sous le seuil de perception.

### Réglage de l'overscan

`OVERSCAN_X_PX = 1000` / `OVERSCAN_Y_PX = 500` ont été essayés : moins de
franchissements, mais des re-rendus plus gros — p95 horizontal 17,1 ms (vs 16,7)
et vertical 24,9 ms (vs 16,7). **600 / 320 est retenu** sur mesure, pas sur
intuition.

## Conséquences

- Nouveaux modules : `virtualization.ts` (pur, testé — 11 cas),
  `useTimelineViewport.ts` (mesure + hystérésis), `stress-fixtures.ts` (générateur
  déterministe), `TimelineView.perf.stories.tsx` (banc de mesure conservé au dépôt :
  la mesure doit rester rejouable, sinon la prochaine régression passera inaperçue).
- `TimelineView`, `TimelineMobilePortrait`, `TimelineMobileLandscape` et
  `useTimelineMobileState` consomment les mêmes primitives — pas de seconde
  implémentation pour le mobile.
- **Aucun `data-testid` supprimé ni renommé.** Ajouts : `timeline-lane-list`,
  `timeline-lane-spacer`.
- **Aucun test existant modifié** (677 unitaires verts).
- Absorption hors périmètre strict : les formateurs `Intl.DateTimeFormat` de
  `buildRulerTicks` sont mutualisés par locale (leur **construction** coûtait
  ~20 ms à froid, mesuré — de loin le premier poste du calcul de la règle, devant
  le parcours des 1000 événements à ~5 ms). Gain sur les recalculs (zoom,
  changement d'étendue) ; **aucun gain sur le tout premier rendu**, où la
  construction a lieu de toute façon.

### Limites connues

- Le fenêtrage suppose des lanes de hauteur **uniforme**. Une lane à hauteur
  variable (multi-pistes, chevauchements empilés) invaliderait `buildVerticalModel`
  et demanderait une mesure par ligne.
- Les en-têtes de catégorie sont **toujours** montés (12 nœuds ici). Une frise à
  plusieurs centaines de catégories demanderait de les fenêtrer aussi.
- `computeRange`, `positionEvents` et `buildMinimapBuckets` restent **O(n) sur
  tous les événements** à chaque changement de zoom ou d'étendue (~5 ms pour 1000
  événements, mesuré). Non traité ici : ce n'est pas du rendu, et ce n'est pas le
  poste dominant.
