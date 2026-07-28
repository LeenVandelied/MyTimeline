# Issue #328 — Scroll horizontal perdu à la rotation portrait ↔ paysage

**Sprint :** 51 · **Vague :** 1 (parallèle avec #349) · **Taille :** M · **Modèle :** opus/high
**Commit :** `5210ed5` — `:bug: fix(timeline): restaure le scroll horizontal à la rotation portrait ↔ paysage`
**Pack lu :** OUI — `cp-frontend.md` §Tests (Vitest + RTL) — pièges (jsdom ne fait pas de layout : `clientWidth=0`)

## Ce qui a changé

`scrollLeft` était le seul morceau d'état resté **DOM**, porté par la variante démontée à la
rotation, alors que `zoom` et `viewportStart` étaient déjà hissés en state React.

`useTimelineMobileState` expose désormais **`setScrollNode`**, une **ref callback stable** (deps `[]`) :
- au **détachement** de la variante (ref → `null`) : snapshot de `scrollLeft` ;
- à l'**attachement** de la variante suivante : restauration (en px, ou en fraction si `railWidth` a
  changé), puis rejeu de `rawOnScroll` pour resynchroniser la minimap — nécessaire car `clientWidth`
  change avec l'orientation.

Le déclencheur est le **changement de variante**, pas le montage → `scrollToToday` ne rejoue pas, ce
qui évite l'inversion du bug signalée comme risque n°1 par l'architecte (écraser la position
utilisateur au lieu de la restaurer).

**Découverte non anticipée par le plan :** l'effet de centrage initial `useEffect(..., [])` était
**déjà inopérant**. Avec `useMediaQuery` SSR-safe (rend `false` au 1er rendu), le premier commit
rend la variante **desktop** → `scrollRef` est `null` → l'effet était un no-op silencieux. Le
centrage a été déplacé au premier attachement de la ref.

### Fichiers
- `frontend/src/components/timeline/useTimelineMobileState.ts` (+75)
- `frontend/src/components/timeline/TimelineResponsive.tsx` (+3)
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx` / `TimelineMobileLandscape.tsx` (câblage `ref={state.setScrollNode}`)
- `frontend/src/components/timeline/TimelineResponsive.rotation.test.tsx` — **nouveau**, 229 lignes
- `frontend/e2e/timeline-mobile.spec.ts` (+47)

## Mesures

| | Avant | Après |
|---|---|---|
| `scrollLeft` portrait 400 → rotation paysage | **0** | **400** |
| Retour paysage 250 → portrait | — | **250** |
| Nœud DOM après rotation | différent (assert `not.toBe`) | idem — la restauration traverse bien un remontage |

Minimap : `aria-valuenow` = `round(400 / railWidth * 100)` après rotation. Centrage initial =
`todayLeftPx`, non rejoué après scroll utilisateur (`todayLeftPx + 180` conservé).

**Tests :** vitest **810/810** (89 fichiers, 19,8 s), dont 4 nouveaux · `tsc --noEmit` 0 erreur
(e2e inclus) · eslint 6 fichiers 0 issue.

## [MEMORY:pattern] — état DOM partagé entre deux variantes alternantes
**Problème :** un état DOM (`scrollLeft`) est perdu quand deux variantes montées alternativement
partagent un state hissé. **Solution :** ref **callback** stable (deps `[]`) dans le hook d'état —
`null` au détachement = snapshot, attachement = restore + resync. **Anti-pattern :** rejouer un
effet de montage type `scrollToToday` sur changement de variante — cela écrase la position
utilisateur (inversion du bug, pas correction).

## [MEMORY:pitfall] — `useEffect(..., [])` inopérant sous `useMediaQuery` SSR-safe
Avec un `useMediaQuery` SSR-safe (`false` au 1er rendu), **tout effet de montage qui touche une ref
d'une variante mobile s'exécute sur le DOM desktop** → no-op silencieux, indétectable.
**Prévention :** ancrer sur l'**attachement de la ref**, pas sur le montage du composant.

## Recommandations suite

- **`RECOMMAND_TEST_RUNNER`** — la spec E2E de rotation est écrite mais **jamais exécutée**.
  Raison donnée : aucune stack debout (rien sur `:3000` ni `:8080`) ; images docker `mytimeline-*`
  datées du 2026-07-11, **antérieures à l'auth RS256 de #323** → image backend inutilisable en
  l'état ; et démarrer `mvnw` + `next dev` dans un working tree **partagé** avec l'agent #349
  aurait risqué un faux négatif. Spec prête, à lancer avec `--workers=1` sur le port 3000.

## non_verifie (déclaré par l'agent, conservé tel quel)

- **E2E de rotation jamais exécuté** → le **critère d'acceptation n°4 de l'issue reste non validé**.
- Comportement navigateur réel de l'affectation `scrollLeft` pendant la phase commit (attachement de
  ref) : non observé, raisonné par analogie avec `useLayoutEffect`.
- Clamp navigateur `scrollWidth - clientWidth` (390 → 844 px en paysage) : géré dans l'assertion
  E2E, jamais mesuré. Si l'utilisateur était en fin de frise en portrait, la position restaurée sera
  légitimement clampée en paysage.
- iOS Safari / `orientationchange` : un reset de scroll par l'OS **après** notre restauration n'est
  pas exclu (non testable ici).
- Pas de test sous StrictMode double-mount (raisonné sûr : même nœud DOM, snapshot puis restore de
  la même valeur), non mesuré.
- Impact virtualisation (`useTimelineViewport`) à la rotation non re-testé — hors périmètre (#351).

## Périmètre respecté
`git show --stat 5210ed5` → **6 fichiers, tous dans la matrice autorisée**. Aucune contamination du
périmètre de #349 (`TimelineView.tsx`, `lib.ts`, `zoom.ts` intacts dans ce commit).

STATUS: COMPLETED
