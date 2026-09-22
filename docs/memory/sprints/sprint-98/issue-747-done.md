# #747 — Frises mobiles : ré-ancrage au changement de zoom

## Objectif
Les 2 frises mobiles (portrait + paysage) conservent la date regardée au changement de niveau de zoom (boutons ET pinch). Pendant mobile de #449 (desktop). Commit : `:bug: fix(timeline): ré-ancrage au zoom des frises mobiles (#747)`.

## Fichiers modifiés
- `frontend/src/components/timeline/mobile-zoom-anchor.ts` (nouveau) — fonctions PURES `centerDayFromScroll` / `scrollLeftForCenterDay` (gouttière passée en paramètre, constante en px, jamais mise à l'échelle).
- `frontend/src/components/timeline/mobile-zoom-anchor.test.ts` (nouveau) — 7 tests Vitest.
- `frontend/src/components/timeline/useTimelineMobileState.ts` — `captureZoomAnchor` appelé AVANT chaque dispatch (`zoomIn`, `zoomOut`, `onPinchZoom`) ; `useLayoutEffect([dayWidth])` qui re-projette `scrollLeft`, déclaré AVANT `useTimelineViewport`.
- `frontend/e2e/sprint-98-mobile-zoom-anchor.spec.ts` (nouveau) — portrait + paysage, 5 niveaux.
- `frontend/e2e/sprint-97-lane-stacking.spec.ts`, `frontend/e2e/sprint-91-event-pin.spec.ts` — commentaires de parade seulement.

## Décisions
- Ancre = jour au CENTRE de la zone de PISTE visible `[scrollLeft+120, scrollLeft+clientWidth]` (décision du lead) ; en repère piste : `scrollLeft + (clientWidth − 120)/2`.
- Ancre relevée AVANT le dispatch (DOM et `dayWidth` encore cohérents), pas sur chaque scroll comme le desktop : pas de garde d'échelle à maintenir, et on ne relit jamais la valeur déjà rabattue par le navigateur au zoom arrière. Tous les chemins qui changent `dayWidth` en mobile passent par les 3 handlers. Repli (non atteignable aujourd'hui) : relecture DOM à l'ancienne échelle.
- Layout effect déclaré AVANT `useTimelineViewport` : ses layout effects s'exécutent dans l'ordre de déclaration → la bande de virtualisation est mesurée sur le `scrollLeft` déjà re-projeté (pas de frame de piste vide). Minimap (`useEffect` sur `dayWidth`) passe après et lit la position re-projetée.
- `el.scrollLeft =` plutôt que `scrollTo({behavior:'instant'})` : `.mt-tlm__scroll` n'a pas de `scroll-behavior:smooth` (seul `.mt-tlv__scroll` desktop en a) et jsdom n'implémente pas `Element.scrollTo`.
- Centrage initial (`anchoredRef`) et report à la rotation (`setScrollNode`) non touchés : aucun ne change `dayWidth`.
- Parades TODAY des specs S91/S97 GARDÉES (commentaire mis à jour) : ces specs portent sur pin/empilage, pas sur le défilement ; la parade les découple de l'ancre.

## Tests
- Vitest : `npx vitest run src/components/timeline/` → 21 fichiers, 317/317 (dont 7 nouveaux `mobile-zoom-anchor.test.ts`).
- `npx tsc --noEmit -p .` → OK. `npx next lint --file …` (6 fichiers) → 0 warning. `rtk proxy npx prettier --check` (6 fichiers) → OK.
- E2E nouvelle spec (harnais :3100 → :8087, oracles 401/200 vérifiés) : 1er run 2 rouges `ensureAuthenticated` (dashboard froid sous `next dev`), rejoué à chaud → 7/7 (5 setup + portrait + paysage).
- **Contrôle négatif** (re-projection neutralisée par `return` précoce dans le layout effect) :
  - parcours complet : 2/2 rouges (portrait, paysage) dès `timeline-zoom-in → Semaine`, cible non montée (`Received: null`, sortie de la bande de rendu) ;
  - parcours zoom ARRIÈRE seul (Mois → Trimestre, étapes zoom avant retirées temporairement) : 2/2 rouges à `timeline-zoom-out → Trimestre` (`null`).
  - Rétabli (fichiers restaurés depuis copie, `grep NEGATIVE-CONTROL` = 0) → vert.
- Surface complète (liste grep du briefing + nouvelle spec) : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test e2e/sprint-98-mobile-zoom-anchor.spec.ts e2e/timeline-mobile.spec.ts e2e/timeline.spec.ts e2e/sprint-85-timeline-group-head.spec.ts e2e/sprint-91-event-pin.spec.ts e2e/sprint-91-recurrence-marks.spec.ts e2e/sprint-91-more-contrast.spec.ts e2e/sprint-94-mobile-lane-gutter.spec.ts e2e/sprint-94-modal-shortcuts.spec.ts e2e/sprint-97-lane-stacking.spec.ts e2e/sprint-63-de-overflow-audit.spec.ts --ignore-snapshots --reporter=line` → **95/95 passed (2,5 min)**, 0 rouge.
- `git status --short | grep darwin` → vide.

## Écarts d'énoncé
- « adapter séparément pour 2 frises » : faux, un seul hook (`useTimelineMobileState`) couvre portrait et paysage (confirmé lead). Taille réelle S.
- « date au centre ou au bord gauche, en alignement avec le desktop » : centre retenu (≠ desktop bord gauche), décision du lead.

## Non vérifié
- Pinch réel (2 pointeurs) en E2E : non joué ; couvert par construction (`onPinchZoom` appelle le même `captureZoomAnchor`), pas par un test.
- Ancre près des bornes (clamp navigateur au début/fin de plage) : comportement = clamp, non testé en E2E (fixture choisie sans clamp).
- Branche « repli » du layout effect (changement de `dayWidth` sans capture) : non atteignable, non testée.
- Rotation PENDANT un zoom : non testée (déjà hors couverture avant, cf. commentaire #328).
- Specs E2E jouées contre `next dev`, pas `next build`+`next start` ; CI Linux non jouée.
- Commentaires S91/S97 modifiés APRÈS le run 95/95 (commentaires seuls, prettier/lint/tsc rejoués).

## Signaux mémoire
- [MEMORY:decision] DEC-S98-00x — Context: #747, frises mobiles 360-850 px, pinch au centre. Decision: ancre de zoom mobile = jour au CENTRE de la zone de piste visible (viewport privé des 120 px sticky), ≠ desktop (bord gauche de piste, #449). Why: l'objet regardé est au centre sur petit écran ; ancrer au bord gauche le ferait sortir au zoom avant.
- [MEMORY:pattern] Problem: re-projeter `scrollLeft` à un changement d'échelle sans relire la valeur déjà clampée. Solution: relever l'ancre (en jours) dans le handler AVANT le dispatch, re-projeter en `useLayoutEffect([dayWidth])` déclaré AVANT le hook qui mesure la bande de virtualisation (ordre des layout effects = ordre de déclaration). Anti-pattern: lire `scrollLeft` dans l'effet post-rendu (valeur rabattue au zoom arrière) ou déclarer l'effet après la mesure de bande (frame vide).

## Recommandations suite
- RECOMMAND_FOLLOWUP: E2E pinch 2 pointeurs sur frise mobile (ré-ancrage via `onPinchZoom`, aujourd'hui couvert par construction seulement) [triage S]
- Pas de RECOMMAND_TEST_RUNNER : suite complète (Vitest 1953, E2E 478) jouée par le lead en Phase 6.
- Pas de RECOMMAND_DB_EXPERT : aucun fichier backend ni migration SQL touché.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-98/briefing-747.md` — PIT-S97-002 (l.179), PIT-S94-004 (l.169), PIT-S61-007, PIT-S72-005, PIT-S94-003.
- `.ai-env/context-packs/pit-frontend.md` — grep `jsdom|scrollLeft` : PIT-S63-014 (l.629 « `scrollLeft` est en pixels »), PIT-S63-015 (l.633) ; lecture partielle.
- `docs/memory/sprints/sprint-97/issue-709-done.md` — grep seulement : l.151 RECOMMAND_FOLLOWUP ré-ancrage mobile ; lecture partielle.
- `frontend/src/components/timeline/TimelineView.tsx` l.1128-1255 (#449, `useLayoutEffect` sur `dayWidth`).
- `frontend/src/components/timeline/useTimelineMobileState.ts` (intégral), `useTimelineViewport.ts` (effets l.220/251 seulement).
- `frontend/e2e/sprint-97-lane-stacking.spec.ts` (intégral), `e2e/support/timeline-lanes.ts` (intégral), `e2e/sprint-91-event-pin.spec.ts` l.48-60, l.360-410.
- `.claude/rules/frontend-stack.md`, `.claude/rules/conventions.md` — NON LU (conventions appliquées depuis le pack cp-frontend inliné).

STATUS: COMPLETED
