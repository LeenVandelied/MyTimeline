# Issue #69 — Virtualisation de la Timeline (>1000 événements)

**Sprint :** 49 · **Vague :** 1 · **Agent :** `fullstack-dev` (opus, effort xhigh) · **Date :** 2026-07-28
**Commit :** `09bfd27` — 12 fichiers, +1684 / −230.
**ADR :** `docs/adr/ADR-007-virtualisation-timeline.md` (273 l., 15 Ko)

## Vérifié par le lead

| Contrainte | État |
|---|---|
| `frontend/package.json` inchangé (zéro dépendance ajoutée) | ✓ |
| `frontend/src/components/calendar/TimelineCalendar.tsx` non touché | ✓ |
| `ADR-007` écrit | ✓ |
| Aucun test existant modifié | ✓ (déclaré, 677/677 verts) |

## Décision technique : virtualisation MAISON, aucune librairie

`@tanstack/react-virtual` **et** `react-window` **rejetés** : leur modèle `index → estimateSize` est
inapplicable à des **intervalles absolus chevauchants** sur l'axe horizontal. Sur l'axe vertical, les
hauteurs sont uniformes — une addition suffit. Justifié dans `ADR-007`.

**Nouveaux modules :** `virtualization.ts` (pur, 11 tests) · `useTimelineViewport.ts` (mesure +
hystérésis + resync) · `stress-fixtures.ts` · `TimelineView.perf.stories.tsx` (banc rejouable).
**Modifiés :** `TimelineView.tsx`, `TimelineMobilePortrait.tsx`, `TimelineMobileLandscape.tsx`,
`useTimelineMobileState.ts`, `zoom.ts`, `index.ts`.

## Mesures (Chromium headless 1440×900, 120 lanes / 12 catégories ; « après » = médiane de 3 runs)

| Métrique | 500 evts | 1000 evts |
|---|---|---|
| Commit | 92,8 → **24,9 ms** | 145,9 → **52,0 ms** |
| Peint | 197,9 → **53,1 ms** | 301,7 → **81,5 ms** |
| Pastilles montées | 500 → **26** | 1000 → **51** (967 → 18 hors écran) |
| Nœuds DOM | 2389 → **509** | 3889 → **584** |
| Scroll H moyen | 20,6 → **10,1 ms** | 33,8 → **9,9 ms** |
| Scroll H p95 | 41,6 → **16,7 ms** | 108,3 → **16,7–18,3 ms** |
| Scroll H max | — | 133,4 → **26,6–33,4 ms** |
| Scroll V moyen | — | 8,3 → **9,2 ms** (léger recul assumé) |

**Hauteur totale de page identique avant/après (5995 px)** → virtualisation géométriquement transparente.
Overscan 1000/500 essayé et **rejeté sur mesure** (p95 V 24,9 ms) ; **600/320 retenu**.

## Critères d'acceptation — 5 OK, 2 partiels

| # | Critère | État |
|---|---|---|
| 1 | Baseline documentée (500 et 1000) | **OK** — ADR-007, méthodologie incluse |
| 2 | Budget tenu à 1000 evts | **OK** — budget redéfini : ≤100 ms commit / ≤150 ms peint. Mesuré **52,0 / 81,5**. |
| 3 | Scroll sans freeze, 60 fps | **PARTIEL** |
| 4 | Événements hors viewport absents du DOM | **OK** au navigateur (51/1000 montées) — **NON en jsdom** |
| 5 | Navigation clavier sans saut | **OK** — 300 `ArrowRight` (300 coordonnées uniques), 300 + 130 `ArrowDown`, `End`/`Home` → 0 cible ratée, 0 perte de focus |
| 6 | Annonces lecteur d'écran non régressées | **OK sur le code, NON vérifié sur lecteur d'écran réel** |
| 7 | Tests existants passent sans modification | **OK unitaires (677/677, zéro assertion modifiée)** — **E2E NON EXÉCUTÉS** |

**Critère 2 — le budget a été redéfini, à noter :** l'issue proposait « < 16 ms par frame ». L'agent
l'écarte comme irréaliste **pour un montage** (16 ms est un budget de frame, pas de montage initial) et
fixe ≤100 ms commit / ≤150 ms peint. Arbitrage défendable et documenté, mais **c'est un changement de la
cible écrite dans l'issue** — à valider au triage.

**Critère 3 — nuance :** aucun freeze (frame max **33,4 ms** contre 133,4 en baseline ; moyennes 9,9 ms H
/ 9,2 ms V), mais **60 fps pas tenus en continu** sur fling violent (7200 px/s) : 7–10 frames sur 89
dépassent 16,7 ms. Le scroll **vertical régresse légèrement** (8,3 → 9,2 ms) — coût assumé du fenêtrage
vertical.

**Critère 4 — repli jsdom :** en l'absence de mesure possible, le code rend **tout**. Documenté dans
l'ADR. Conséquence directe : **les tests unitaires ne peuvent pas prouver ce critère**.

**Critère 6 — `aria-rowcount` / `aria-rowindex` volontairement écartés** au profit de
`role="list"/"listitem"` + `aria-setsize`/`aria-posinset`. Raison : rowcount/rowindex **exigent** un rôle
`grid`/`table` ; les poser sans ce rôle est inopérant, et convertir la frise en grid remplacerait le
pattern région + roving de #81. L'issue les demandait explicitement — **écart assumé et justifié en ADR**,
à valider au triage.

## Contrôle navigateur

Storybook (:6106) + Chromium Playwright. `Stress500` / `Stress1000` : captures haut de page et mi-scroll
(règle, en-têtes de catégorie avec texte vérifié au DOM, labels produit, pastilles, ligne TODAY, aucune
zone blanche), audit DOM (51 pastilles / 24 lanes / 12 en-têtes / 12 listes / 10 cales), scroll H et V
instrumentés en rAF, 300 + 300 + 130 marches clavier, `End`/`Home`.

`TimelineMobilePortrait--default` : 3 pastilles bien présentes au DOM. Le bloc « Retrait yaourts » est
masqué **visuellement** par le label de lane sticky opaque — **comportement pré-existant, non causé par
#69**.

## Pitfalls rencontrés pendant l'implémentation

1. `.mt-tlv__scroll` est en `overflow-y: hidden` → le scroll vertical est celui de la **page**. La bande
   verticale doit venir de `getBoundingClientRect ∩ window`, **pas** de `scrollTop`.
2. `scroll-behavior: smooth` + recalage immédiat de la bande = **démontage de la pastille focalisée** :
   299 déplacements clavier sur 300 perdaient le focus. Corrigé par un débounce de 400 ms.
3. Un export de **valeur** dans un `*.stories.tsx` devient une **story fantôme** (CSF).
4. `prettier --write` sur le dossier reformate **9 fichiers hors périmètre** → revertés.

## Signaux mémoire

- **[MEMORY:pitfall]** Virtualiser une zone en `scroll-behavior: smooth` : ne **jamais** rétrécir la
  fenêtre de rendu à la frame suivant un `scrollIntoView` — débouncer (400 ms) le recalage. Sans ça, le
  nœud focalisé est démonté en plein défilement animé et le focus retombe sur `<body>` (299/300
  déplacements perdus, **invisible aux tests jsdom**).
- **[MEMORY:pitfall]** Tout export de **valeur** dans un fichier CSF (`*.stories.tsx`) devient une story
  (`--build-stress-dataset` est apparu dans l'index Storybook). Mettre générateurs et fixtures dans un
  module séparé.
- **[MEMORY:pattern]** Virtualiser sans casser un pattern clavier/a11y : fenêtrer le **montage
  seulement**. `windowEvents` conserve l'index d'origine, les modèles de navigation restent construits
  sur la **liste complète**, `ensureVisible` + focus différé relaient la cible jusqu'à son montage.
  **Anti-pattern** : renuméroter les index sur la fenêtre — la navigation sauterait des éléments.
- **[MEMORY:decision]** `aria-rowcount`/`aria-rowindex` (demandés par #69) remplacés par
  `role="list"/"listitem"` + `aria-setsize`/`aria-posinset`, car les premiers exigent un rôle grid/table
  incompatible avec le pattern région + roving de #81.
- **[MEMORY:bug]** `onScroll` synchronisait la minimap par `setState` **à chaque** événement de scroll →
  rendu complet de la frise par événement. Corrigé par coalescence `requestAnimationFrame`. **Mesuré
  comme le premier poste de coût du scroll (p95 108 ms), devant le nombre de nœuds.**

## ⚠ Risque E2E identifié et NON TESTÉ — à traiter en Phase 6

`frontend/e2e/timeline.spec.ts` (#304) cible `timeline-resource-row` **par nom de produit**. Si le compte
de test dépasse **60 produits**, la virtualisation verticale s'active et la lane visée peut **ne pas être
montée** → `toHaveCount(1)` rougirait.

Seuil : `LANE_VIRTUALIZATION_MIN_ROWS = 60` dans `virtualization.ts`. Remèdes : relever le seuil, ou faire
défiler jusqu'à la lane dans la spec.

**« CI verte » ne dira rien de ce fenêtrage** : jsdom bascule sur le repli non borné.

## Recommandations suite

**`RECOMMAND_TEST_RUNNER`** — `./scripts/test-quiet.sh e2e` sur une machine où Docker Hub répond.
Le filet E2E du Sprint 47, qui était **la raison même de séquencer #69 après S47**, n'a pas pu être
exercé.

**`RECOMMAND_FOLLOWUP`**
1. **[S]** Mémoïser les lanes (`React.memo`) pour qu'un franchissement de bande ne réconcilie que les
   lanes entrantes/sortantes → viserait les 7–10 frames > 16,7 ms restantes du critère 3.
2. **[XS]** Supprimer `frontend/src/components/calendar/TimelineCalendar.tsx` (mort depuis S42) + ses
   4 références en commentaire — issue dédiée, **non absorbée comme demandé**.
3. **[S]** `computeRange` / `positionEvents` / `buildMinimapBuckets` restent **O(n) sur TOUS les events à
   chaque zoom** (~5 ms/1000, mesuré) : mémoïsation incrémentale possible.
4. **[XS]** Le dépôt **n'est pas prettier-propre** : `prettier --write src/components/timeline/`
   reformate 9 fichiers non touchés (EventPill, Minimap, TimelineEditHost, 4 tests…). Un `format:check`
   en CI divergerait du dépôt.

## ABSORBED

Formateurs `Intl.DateTimeFormat` de `buildRulerTicks` mutualisés par locale (`zoom.ts`) — leur
**construction** coûte ~20 ms à froid (mesuré), premier poste du calcul de la règle devant le parcours
des 1000 events (~5 ms). Gain sur les recalculs (zoom, étendue) ; **aucun gain sur le tout premier
rendu**, dit tel quel dans l'ADR.

## Note de nomenclature

L'agent référence **BR-EVE-001** ; l'issue et le pack disent **BR-EVT-001**. À harmoniser au triage
(sans conséquence technique).

STATUS: PARTIAL
BLOQUE_SUR: E2E Playwright non exécutés (build de l'image backend bloqué >20 min sur « load metadata »
Docker Hub, aucun conteneur créé) + critère 3 tenu sur « aucun freeze » mais PAS sur « 60 fps en
continu » (7–10 frames/89 > 16,7 ms sur fling à 7200 px/s).

---

## ⚠ MISE À JOUR — 2026-07-28, en fin de sprint

**La moitié du `BLOQUE_SUR` ci-dessus est périmée.**

**E2E : le blocage n'existait pas.** Le lead a vérifié que Docker répondait (29.2.1) et que les images
`mytimeline-backend`, `mytimeline-frontend` et `postgres:16` étaient **déjà en cache** — le blocage venait
d'un *build* qui repartait chercher des métadonnées sur Docker Hub, pas d'une stack absente. L'agent #337
a monté la stack via le runbook S47 **sans difficulté** : baseline **68 passed / 0 failed en 113 s**.

⇒ **`timeline.spec.ts` est VERTE.** Le risque signalé ici (virtualisation verticale masquant une lane
au-delà de 60 produits, `LANE_VIRTUALIZATION_MIN_ROWS = 60`) **ne se déclenche pas** sur le jeu de test
actuel. Suite finale du sprint : **92 passed / 0 failed**.
⇒ **`RECOMMAND_TEST_RUNNER` de cette issue est SATISFAIT.**

**Ce qui reste vrai :** le critère 3 n'est tenu que sur « aucun freeze » (frame max 33,4 ms contre
133,4 en baseline), pas sur « 60 fps en continu » — 7 à 10 frames sur 89 dépassent 16,7 ms sur fling à
7200 px/s. Remède identifié (mémoïsation des lanes, `React.memo`) → follow-up.

**Confirmations apportées par la review batch** (`review-batch.md`) sur des points que cet artefact ne
pouvait pas garantir : fenêtrage correct **sans trou de frontière** (aucun événement manqué en bord de
bande), **aucune fuite** de rAF/listeners/timer, et le débounce de 400 ms laisse la bande **trop large**,
jamais trop étroite — donc surcoût de rendu, pas de perte de focus.

STATUS: PARTIAL
