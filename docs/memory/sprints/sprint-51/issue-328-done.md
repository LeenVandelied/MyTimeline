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

## ✅ RÉSOLUTION E2E — le critère n°4 est validé (mise à jour du lead, 2026-07-29)

> Cette section **corrige** les réserves écrites plus bas, conservées telles quelles pour la trace.

L'E2E a finalement été exécuté par le lead via le runbook du S47 (`mvnw` + `next dev`, **sans
docker** — c'était la mauvaise piste). Déroulé :

1. **Premier run : ROUGE.** `scrollLeft = 0` après rotation, attendu > 0. Conclusion apparente :
   #328 ne fonctionne pas en navigateur réel.
2. **Investigation mesurée (agent dédié) : le TEST était faux, pas le code.** Le test exigeait
   **simultanément** `scrollLeft > 0` (ligne 281) et `scrollLeft ≈ min(392, maxScroll paysage)`
   (lignes 282-285). Or au zoom par défaut le rail fait 61 j × 12 px = **732 px**, alors que le
   `clientWidth` en paysage 844×390 vaut **794** : le rail **entre en entier**, donc
   `scrollWidth === clientWidth` et **`maxScroll = 0`**. Les deux assertions se contredisaient —
   le test échouait **quel que soit le code**.
3. **Contre-preuve décisive** : sur un rail élargi (2 crans de zoom → vue Jour, rail 5 856 px,
   `maxScroll` paysage 5 062), le code livré en `5210ed5` conserve la position **sans aucune
   modification**. Le correctif de #328 était **correct depuis le début**.
4. **Correctif appliqué au test** (`49fc3e2`) : élargir le rail avant de mesurer, + un garde-fou qui
   constate `maxScroll > 0` au lieu d'échouer 20 lignes plus bas.

**Résultat : `timeline-mobile.spec.ts` 15/15, suite E2E complète 97 passed / 0 failed / 8 skipped.**
Le **critère d'acceptation n°4 de #328 est validé**.

> **Deux hypothèses du lead démenties par la mesure, consignées :**
> (a) j'avais écrit que la base locale en V6 bloquait l'E2E — **faux**, l'E2E utilise la base dédiée
> `eventmanager_e2e`, déjà en V15 ; aucune migration n'a été appliquée.
> (b) l'agent correcteur a écarté ma propre piste (« le layout n'est pas prêt à l'attachement de la
> ref, il faut un `rAF` ») : instrumentation en Chromium réel → `scrollWidth` 732 / `clientWidth` 340
> à l'attachement, écriture 190 relue 190. **Le layout était disponible.** `rAF`/`useLayoutEffect`
> n'auraient rien changé.

> **Correction d'un commentaire du code :** le commentaire « on sauve l'état DOM AVANT sa perte »
> était **faux**. La trace au détachement montre `{scrollLeft: 0, scrollWidth: 794, clientWidth: 794}`
> — la valeur est déjà clampée par le relayout de rotation **avant** le démontage React (392 → 0).
> Le report fonctionne par **idempotence du clamp**, pas par mise à l'abri. Corrigé en `122e245`.

### Réserves E2E qui subsistent
- **Rotation SANS changement de variante** (ex. 844×520 → 844×390, même composant) : aucun
  détachement de ref ne se produit, donc **aucune restauration ne tourne**. Non couvert par la spec,
  non testé. **Trou probable** → follow-up.
- **Redimensionnement en largeur dans la même variante** (390 → 640 portrait) : position clampée
  puis définitivement perdue — ni l'ancien ni le nouveau code n'y répond.
- **Sémantique produit non tranchée :** après un aller-retour où le paysage force 0, faut-il
  **rendre** la position d'origine (intention « collante ») ou garder 0 (clamp chaîné) ? La spec
  encode le clamp chaîné. Une intention collante serait meilleure UX. **À arbitrer par le dev.**
- Autres viewports paysage (`LANDSCAPE_TALL` 844×520, tablettes) non instrumentés.

---

## Recommandations suite (état initial de l'agent — dépassé par la section ci-dessus)

- ~~**`RECOMMAND_TEST_RUNNER`** — la spec E2E de rotation est écrite mais **jamais exécutée**.~~
  **RÉSOLU** : exécutée, rouge, diagnostiquée (test faux), corrigée, verte. Voir ci-dessus.
  *La raison invoquée par l'agent — images docker antérieures à RS256 — était réelle mais menait à
  une fausse impasse : le runbook du S47 ne passe pas par docker.*

## non_verifie (déclaré par l'agent, conservé tel quel)

- ~~**E2E de rotation jamais exécuté** → le critère d'acceptation n°4 reste non validé.~~
  **DÉPASSÉ** — exécuté et vert, cf. section de résolution.
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
