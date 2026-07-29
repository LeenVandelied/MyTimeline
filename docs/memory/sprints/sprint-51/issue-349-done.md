# Issue #349 — Lisser les saccades de défilement + recalculs de zoom incrémentaux

**Sprint :** 51 · **Vague :** 1 (parallèle avec #328) · **Taille :** S (diff réel bien plus large) · **Modèle :** opus/high
**Commit :** `1cb6031` — `:zap: perf(timeline): mémoïse les lanes et rend les recalculs de zoom incrémentaux`
**Pack lu :** OUI — `cp-frontend` §Conventions (Server/Client Components, TS strict, React 18.3.1) + §Tests

## ⚠ La cause réelle n'était pas celle de l'issue

L'issue postulait que le coût venait du **franchissement d'une frontière de bande de
virtualisation** (« réconcilie toutes les lanes visibles »). Mesure de l'agent : le re-rendu complet
se produit **à chaque frame de scroll**, à cause de la synchronisation de la minimap
(`viewportStart`) — pas seulement aux franchissements. Le diagnostic de l'issue était donc
**partiel** ; le correctif porte sur la bonne cause.

## Ce qui a changé

**`TimelineView.tsx`** — règle, overlay week-end, en-têtes de catégorie et lanes passés en
`React.memo`, avec **stabilisation effective des props** (sans quoi `React.memo` est inopérant — le
piège annoncé par l'issue, confirmé) :
- `toggleCategory` / `toggleResource` → `useCallback`
- accesseur de traduction `t` rendu stable via `tRef`
- `metrics` figé **sur la valeur** — sinon `verticalModel` → `focusNav` → `onPillKeyDown` changeaient
  d'identité à chaque bande
- **cache d'identité sur `windowEvents`** : la fonction renvoyait un tableau neuf à chaque appel

**`zoom.ts`** — `positionEvents` scindé en `indexEventsByResource` (parsing des dates, **invariant
au zoom**) + `scaleEventPositions` (passe d'échelle). `positionEvents` est **conservé inchangé**
pour compatibilité. `useZoomCache` mémoïse positions et graduations **par niveau** → aller-retour de
zoom gratuit.

**Nouveau test** `zoom-incremental.test.ts` (4 cas) : équivalence stricte avec l'ancien chemin sur
1 000 événements × 5 niveaux de zoom.

### Fichiers
- `frontend/src/components/timeline/TimelineView.tsx` (626 lignes touchées)
- `frontend/src/components/timeline/zoom.ts` (+90)
- `frontend/src/components/timeline/zoom-incremental.test.ts` — **nouveau**, 98 lignes

## Mesures — banc réellement exécuté

Protocole ADR-007 : Storybook dev + pilote Playwright, Chromium headless 1440×900, 120 px/frame,
90 frames, **médiane de 3 runs**. Baseline **re-mesurée par l'agent avant modification**, cohérente
avec ADR-007 (7–10/89 annoncés).

| Métrique | Avant | Après | Cible issue |
|---|---|---|---|
| Frames > 16,7 ms (sur 89) | **8** | **1** | ≤ 2 ✅ |
| Frame la plus lente | 22,9 ms | **18,9 ms** | ≤ 33,4 ms ✅ |
| Frame moyenne | 8,8 ms | 8,3 ms | — |
| Recalcul au zoom (1 000 év.) | 39,5 ms | **33,7 ms** | mesuré ✅ |
| dont JS pur `positionEvents` → `scaleEventPositions` | 1,55 ms | **0,05 ms** (**−97 %**) | — |

Variante aller-retour continu (pire cas, sans clamp en fin de rail) : **8/89 → 0/89**.

**Non-régression vérifiée au navigateur :** fenêtrage identique à un rendu neuf après long
défilement (**0 événement manqué / 0 doublon**) · dézoom ×25 = 25 atteintes / 0 ratée ·
`aria-setsize` = 10 (index du modèle complet préservé) · DOM inchangé (51 pastilles / 24 lanes /
584 nœuds).

**Tests :** `./scripts/test-quiet.sh frontend` → **814/814 verts** (27 s) · `tsc --noEmit` OK ·
eslint OK · prettier OK sur les 3 fichiers touchés.

**Périmètre #351 respecté :** `role` / `aria-hidden` des cales `timeline-lane-spacer` **non touchés**.

## [MEMORY:pitfall] — `React.memo` seul est inopérant sur les lanes de la frise
Mémoïser ne suffit pas : `windowEvents` renvoie un tableau neuf à chaque appel et
`useTimelineViewport` republie un objet `metrics` neuf à chaque bande. Il faut un **cache
d'identité** + un **figeage sur la valeur**. **Prévention :** avant tout `React.memo`, vérifier
chaque prop dérivée d'un calcul de rendu.

## [MEMORY:pitfall] — banc perf Storybook : deux pièges d'outillage
1. Écrire un fichier sous `frontend/` **pendant** une mesure déclenche un full-reload HMR et tue le
   contexte Playwright (« Execution context was destroyed ») → **placer le driver hors racine Vite**.
2. RTK avale la sortie de `vitest` / `grep` **même redirigée** → `rtk proxy` obligatoire.
   (3ᵉ manifestation de RTK ce sprint, après `git diff` et `wc -c`.)

## [MEMORY:pattern] — recalcul O(n) à chaque zoom
Scinder la passe **invariante** (parsing des dates) de la passe d'**échelle**, puis cacher par
niveau de zoom. **Anti-pattern :** `useMemo` seul — un seul emplacement, donc un aller-retour de
zoom recalcule tout.

## Recommandations suite

- **`RECOMMAND_FOLLOWUP`** : committer le pilote Playwright du banc sous `frontend/scripts/` — le
  protocole ADR-007 est **décrit mais non versionné**, donc non rejouable à l'identique. [XS | frontend]
- **`RECOMMAND_FOLLOWUP`** : `useTimelineViewport.sync()` republie `metrics` (objet neuf) même quand
  les 3 hauteurs sont identiques — **corrigé par contournement côté `TimelineView`**, à corriger à
  la source. [XS | frontend] → **périmètre #351, à injecter dans le briefing de la vague 2**.
- **`RECOMMAND_FOLLOWUP`** : `syncViewportFromScroll` déclenche un `setState` **par frame** de
  scroll ; pousser `viewportStart` en variable CSS supprimerait le re-rendu résiduel. [S | frontend]
- **`RECOMMAND_TEST_RUNNER`** pour les lots suivants : suite frontend = 814 tests, au-delà du seuil de 500.

## non_verifie (déclaré par l'agent, conservé tel quel)

- Mesures en **Storybook dev (React non minifié)**, pas sur un `build-storybook` de production : les
  valeurs absolues sont **pessimistes** ; le delta avant/après reste comparable (même mode, même
  machine, même driver).
- Rien mesuré sur `Stress500` ni sur le **scroll vertical** (l'issue ne portait que sur l'axe
  horizontal à 7 200 px/s).
- `commitMs` (montage initial) non ciblé : 49,8 → 50,7 ms, **dans le bruit** — aucune vérification
  que la mémoïsation ne dégrade pas le premier rendu au-delà de cette marge.
- **Aucun profilage React DevTools** : pas de comptage des lanes réellement sautées, seulement
  l'effet global sur les frames.
- E2E Playwright non lancés (aucun `data-testid` ajouté/supprimé ; DOM vérifié identique au navigateur).
- Pas de test unitaire sur `sameWindowedEvents` / `useZoomCache` (helpers non exportés) — couverts
  indirectement par la vérification navigateur.
- 10 fichiers de `timeline/` sont en **dérive prettier préexistante** (dont ceux de #328) — non touchés.

## Périmètre respecté
`git show --stat 1cb6031` → **3 fichiers**, tous dans la matrice autorisée. Aucune contamination du
périmètre de #328 (`useTimelineMobileState.ts`, `TimelineResponsive.tsx`, variantes mobiles, spec
E2E mobile intacts dans ce commit).

> ⚠ **Réserve du lead pour la review :** 626 lignes touchées dans `TimelineView.tsx` pour une issue
> estimée **S**. L'écart taille estimée / diff réel est important — à examiner en priorité par le
> reviewer batch (Phase 7).

STATUS: COMPLETED
