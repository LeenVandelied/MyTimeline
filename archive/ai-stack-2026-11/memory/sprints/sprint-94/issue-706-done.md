# Issue #706 — Frise mobile : les événements passent sous la colonne sticky des lanes

**Vague :** 1 | **Taille :** S annoncée, M réelle | **Agent :** fullstack-dev (opus/xhigh)
**Commit :** `0ec6114d` — `:bug: fix(timeline-mobile): gouttière de piste, plus d'événement sous la colonne sticky (#706)`

## Fichiers (+558/-45)

- `frontend/src/styles/ds/tokens/spacing.css` (+9)
- `frontend/src/styles/ds/components/timeline.css` (+63/-…)
- `frontend/src/components/timeline/useTimelineMobileState.ts` (+126/-…)
- `frontend/src/components/timeline/TimelineMobilePortrait.test.tsx` (+53)
- `frontend/src/components/timeline/TimelineResponsive.rotation.test.tsx` (+26/-…)
- `frontend/e2e/sprint-94-mobile-lane-gutter.spec.ts` (+277, nouveau)
- `frontend/e2e/support/seed-cleanup.ts` (+49/-…)

`TimelineView.tsx` **non touché** (contrainte de vague respectée).

## Résumé

Défaut **structurel** confirmé — ce n'est pas `ensureVisible`, c'est le miroir mobile de #392.

- Token `--lane-header-w-m: 120px` — **promotion du `max-width` déjà déclaré par le DS**, pas un seuil
  inventé à partir du « ~120 px » de l'énoncé.
- `.mt-tlm__lane-label` passe en largeur **fixe**.
- `margin-left` de gouttière appliqué aux 4 familles d'éléments positionnés du rail, + masque sticky du
  coin de règle.
- `MOBILE_LANE_TRACK_OFFSET_PX` côté état : `railWidth`, minimap, `scrollToToday`, restauration de
  position (#328), bande horizontale.

## Preuve

- **Liste A complète (20 specs)** : `playwright test <liste A> --reporter=json` → **130 expected /
  0 unexpected / 0 flaky**, exit 0. **Aucune spec de la liste A non rejouée.**
- **Suite complète** : 404 expected / 9 skipped / **10 unexpected** — les 10 sont
  `sprint-77-theme-visual` avec « A snapshot doesn't exist … `-chromium-darwin.png` » : faux rouges macOS
  documentés (`doesn't exist` ≠ `did not match`). Les 10 PNG non suivis ont été supprimés et **non
  committés** — la CI Linux tranche.
- `vitest run src/components/timeline` → 265/265, exit 0. `tsc --noEmit` exit 0. `next lint` 0.
  `prettier --check .` exit 0.
- **Géométrie mesurée après correctif** : portrait `trackLeft=61 labelWidth=120 labelRight=145
  eventLeft=206` ; paysage `labelRight=209 eventLeft=270`.
- **Contrôle négatif** (sonde jetable, gouttière neutralisée par `addStyleTag`, supprimée depuis) :
  `eventLeft=86` vs `labelRight=145`, et `150` vs `209` → **le test rougit bien sans le correctif**.

## Pitfalls rencontrés

- `PIT-S91-006` — `elementFromPoint` est **vacuous ici** : `.mt-tlm__lane-label` est en
  `pointer-events: none`, donc la sonde demandée par l'énoncé ne peut jamais rendre la colonne sticky.
  L'oracle a été reconstruit sur des `getBoundingClientRect`.
- Faux rouges visuels macOS (famille `PIT-S82` / `PIT-S77-019`).
- `PIT-S89-001` — 2 assertions de `TimelineResponsive.rotation.test.tsx` **gravaient l'ancien repère RAIL** ;
  mises à jour après lecture de ce qu'elles attendaient.
- Race `zz-purge` du `seed-cleanup` (2 rouges sur 3 runs) → création rendue idempotente.

## Signaux mémoire

- `[MEMORY:pitfall]` Frise mobile : `.mt-tlm__lane-label` est `pointer-events:none`, donc `elementFromPoint` ne peut JAMAIS rendre la colonne sticky — le symptôme est visuel, l'oracle doit comparer des `getBoundingClientRect`.
- `[MEMORY:pitfall]` `e2e/support/seed-cleanup.ts` : la contrainte `uq_categories_owner_name` rend un 500 au perdant de la course de création de `zz-purge` ; l'échec de purge étant FATAL, il tue un test vert — le commentaire qui affirmait « sans conséquence » était faux ; création rendue idempotente.
- `[MEMORY:pattern]` Non-vacuité d'un oracle de géométrie : asserter la PRÉCONDITION du défaut sur une grandeur du MODÈLE (`left` en ligne) et l'oracle sur le LAYOUT (rects) — deux sources indépendantes — puis contrôle négatif par `addStyleTag` qui neutralise le correctif, sans rebuild ni modification du working tree partagé.
- `[MEMORY:decision]` Gouttière mobile = 120 px et pas 168 (desktop) : reprise du `max-width` déjà déclaré par le DS ; `background-position-x` VOLONTAIREMENT non transposé (les lanes mobiles n'ont aucun `background-size`, le décaler peindrait un filet doublé au lieu d'aligner une trame).

## Recommandations suite

Pas de RECOMMAND_TEST_RUNNER ni RECOMMAND_DB_EXPERT ni RECOMMAND_SECURITY ni RECOMMAND_UI_DESIGN car aucun changement d'auth, de schéma, ni de charte visuelle.
RECOMMAND_FOLLOWUP: `scrollToToday` est exposé par `useTimelineMobileState` mais câblé NULLE PART en mobile (aucun bouton « Aujourd'hui ») [triage S | domaine events].
RECOMMAND_FOLLOWUP: les lanes mobiles n'ont pas de trame de jours faute de `background-size`, contrairement au desktop [triage S | domaine events].

STATUS: COMPLETED
