# Issue #351 — Deux défauts d'implémentation relevés en review du S49

**Sprint :** 51 · **Vague :** 2 (parallèle avec #350) · **Taille :** XS annoncée · **Modèle :** opus/high
**Commit :** `c75efd7` — `:wheelchair: fix(timeline): role=presentation sur les cales et écouteur de défilement ciblé (#351)`
**Pack lu :** OUI — `cp-frontend` §Accessibilité + §Tests (Vitest + RTL) — pièges

## ⚠ Le correctif prescrit par l'issue était FAUX — démontré, pas supposé

L'issue prescrivait : « Filtrer sur l'élément défilant réel (`scrollEl`) **ou sur `document`**
plutôt que capturer sur `window`. » L'agent a implémenté ce ciblage naïf et **l'a mesuré : deux
tests rouges**. Cibler `scrollEl` seul **perd la page ET tout ancêtre défilant** — or la position
visible d'un élément dépend des trois.

**Correctif réellement livré :** l'écouteur **reste en capture sur `window`** (seul moyen d'observer
un scroller quelconque), et le tri est déplacé **dans le handler** : ne planifier une `rAF` que si
`target.contains(scrollEl)`. Le gain visé par l'issue (ne plus travailler quand l'utilisateur fait
défiler autre chose) est atteint **sans** perdre les sources légitimes.

C'est un écart assumé à la lettre de l'issue, adossé à une preuve. Le risque nommé par l'issue
(« peut faire perdre des événements si la frise est imbriquée dans un conteneur défilant ») s'est
donc **matérialisé** sur la solution qu'elle proposait elle-même.

## Ce qui a changé

- **Défaut 1** — `role="presentation"` posé sur les **2 cales** de `TimelineView.tsx`, localisées
  **par grep** (les numéros de ligne de l'issue, 754/847, étaient périmés : #349 a fait passer le
  fichier de 879 à 1113 lignes). Chemin fantôme de l'issue évité, aucun fichier créé.
- **Défaut 2** — tri par `target.contains(scrollEl)` dans `onScroll` (cf. ci-dessus).
- **Bonus, constat de #349 traité à la source** — `sync()` ne republie plus un objet `metrics` neuf
  quand les 3 hauteurs sont égales. Le contournement posé par #349 dans `TimelineView.tsx` est
  **conservé** (ceinture), n'ayant pas été prouvé inutile.
  *Gain collatéral relevé :* `useTimelineMobileState.ts` consomme `viewport.metrics` en dépendance de
  `useMemo` **sans ceinture** → il en bénéficie directement.

### Fichiers
- `frontend/src/components/timeline/TimelineView.tsx` (+2)
- `frontend/src/components/timeline/useTimelineViewport.ts` (+48/-7)
- `frontend/src/components/timeline/useTimelineViewport.scroll.test.tsx` — **nouveau**, 120 lignes

**Tests :** **819 verts** (814 baseline + 5 nouveaux) · `tsc --noEmit` OK · 0 stderr.

## Vérification comportementale

| Critère | Résultat |
|---|---|
| Scroll de la frise lui-même | OK — test « scroller frise → 1 rAF » vert ; bandes / minimap / resync intacts |
| Scroll d'un tiroir/dialogue, frise montée | **Ne déclenche plus.** Preuve **par discrimination** : test rendu ROUGE en réintroduisant l'ancien comportement (3 scrolls → 3 rAF), VERT après correctif (0 rAF) |
| Frise imbriquée dans un conteneur défilant | **jsdom seulement** — c'est ce qui a invalidé le ciblage naïf. Tiroir et plein écran **réels non ouverts au navigateur** |
| `metrics` republié par `sync()` | Corrigé à la source ; contournement #349 conservé |

## [MEMORY:pitfall] — filtrer un écouteur de scroll global
Filtrer par **`target.contains(scrollEl)`**, jamais par `target === scrollEl`. La position visible
d'un élément dépend de son scroller **propre**, de la **page**, ET de **tout ancêtre défilant** —
cibler le scroller seul perd 2 sources sur 3. Mesuré : 2 tests rouges sur la variante naïve, celle
que l'issue prescrivait.

## Recommandations suite

- **`RECOMMAND_FOLLOWUP`** : **le défaut 1 existe à l'identique sur 4 cales mobiles non corrigées** —
  `TimelineMobilePortrait.tsx` (~203, ~281) et `TimelineMobileLandscape.tsx` (~216, ~294), toutes
  sous un `role="list"`. Ces fichiers étaient **interdits** à cet agent (périmètre #328). [XS | frontend]
  → La correction livrée est donc **partielle à l'échelle de l'application** : desktop couvert, mobile non.

## non_verifie (déclaré par l'agent, conservé tel quel)

- **Critère d'acceptation n°2 de l'issue NON TENU** : « un audit d'accessibilité automatisé ne
  signale plus `aria-required-children` ». **Aucun outil a11y n'existe dans `frontend/package.json`**
  (ni axe, ni pa11y, ni lighthouse). Le changement statique est vérifié par lecture seule.
- `role="presentation"` **non couvert par un test** : en jsdom `clientWidth = 0` → bande UNBOUNDED →
  cales à 0 px → jamais rendues (`topSpacerPx > 0` faux).
- **Aucune vérification navigateur réelle** (tiroir, plein écran, smooth-scroll, minimap à l'œil).
- E2E Playwright non lancés.
- Gain `React.memo` du correctif `metrics` **non mesuré** (pas de profilage) — raisonné, pas chiffré.

## Périmètre respecté
`git show --stat c75efd7` → 3 fichiers, tous dans la matrice autorisée. Aucune contamination du
périmètre de #350 ni des livraisons #328/#349.

STATUS: COMPLETED
