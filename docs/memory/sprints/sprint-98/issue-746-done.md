# Issue #746 — done (Sprint 98, vague 2)

## Objectif
Aucun libellé de la frise ne chevauche l'occurrence suivante de sa rangée : (1) libellé de pin plus long que l'emprise constante 100/90 px ; (2) libellé EXTÉRIEUR de secours d'une barre à faible contraste (réservé 0 px). Charte retenue par le dev : réserve ESTIMÉE sans DOM (pas la troncature 84/74 px).

## Fichiers modifiés
Commits : `9e12ef35` `:bug: fix(timeline): réserve des libellés longs et extérieurs dans l'empilage (#746)` ; `47484557` `:white_check_mark: test(e2e): hit-test de collision des libellés sur les trois frises (#746)`.
- `frontend/src/components/timeline/label-reserve.ts` (NOUVEAU, pur) — estimation, emprises, `applyLabelReserves` ; décision documentée en tête (FR).
- `frontend/src/components/timeline/label-reserve.test.ts` (NOUVEAU, 20 tests).
- `frontend/src/components/timeline/zoom.ts` — champ `labelTrailPx?` sur `PositionedEvent` ; doc `widthPx` / `PIN_FOOTPRINT_PX` (devenu plancher). `scaleEventPositions` INCHANGÉ.
- `frontend/src/components/timeline/lane-layout.ts` — `end = leftPx + widthPx + (labelTrailPx ?? 0) + trailingPx` ; commentaire de tête corrigé (« EXACTEMENT son widthPx » supprimé).
- `frontend/src/components/timeline/lane-layout.test.ts` — +2 tests `labelTrailPx`.
- `frontend/src/components/timeline/TimelineView.tsx` — `applyLabelReserves(scaleEventPositions(...), 'desktop')` dans le `useZoomCache` (l'appel `layoutLanes` n'a pas changé).
- `frontend/src/components/timeline/useTimelineMobileState.ts` — `applyLabelReserves(positionEvents(...), 'mobile')` ; ajouts #747 (ancre de zoom) intacts.
- `frontend/src/components/timeline/EventPin.tsx` — prop `labelMaxPx` → `--mt-label-max` inline + `title={titre}` sur `.mt-evt-pin__label`.
- `frontend/src/components/timeline/EventPill.tsx` — pin : `labelMaxPx={pinLabelMaxPx(widthPx)}` ; libellé extérieur : `title`, `--mt-label-max` depuis `labelTrailPx`, écart via `OUTSIDE_LABEL_GAP_PX`.
- `frontend/src/components/timeline/EventPill.test.tsx` — +3 tests (variable + title, pin et extérieur, repli sans réserve).
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx`, `TimelineMobileLandscape.tsx` — `labelMaxPx` passé au pin.
- `frontend/src/styles/ds/components/timeline.css` — `.mt-evt-pin__label{max-width:var(--mt-label-max, 240px)}` ; `.mt-tlv__evt-outside` : `display:block; line-height:26px; box-sizing:border-box; max-width:var(--mt-label-max,240px); overflow:hidden; text-overflow:ellipsis` (flex → bloc : `text-overflow` ne s'applique pas au texte d'un conteneur flex).
- `frontend/e2e/sprint-98-label-collision.spec.ts` (NOUVEAU).

## Décisions
- Formule (pure, `label-reserve.ts`) :
  - `largeur texte = ceil((nb points de code + (récurrent ? 3 : 0)) × chasse)` ; chasse `6.3 px` desktop (12 px), `6.6 px` mobile (12,5 px, portrait ET paysage — `.mt-tlm__evt--pin .mt-evt-pin__label` prime sur le 10,5 px paysage du bouton).
  - Chasse CALIBRÉE en navigateur (spec jetable, supprimée) sur 12 titres fr/de/en/es en Archivo semibold : 5,70–6,68 px/car. à 12 px, 5,94–6,96 à 12,5 px (extrêmes `iiii` 3,0 / `Mmmm` 10,3 exclus). Retenu ≈ 0,525 em.
  - Pin : `emprise = clamp(11 + texte, plancher PIN_FOOTPRINT_PX[vue] = 100|90, plafond 11 + 240 = 251)` ; posée dans `widthPx` du pin (déjà une emprise, jamais peinte ; virtualisation/`eventTrackExtent` en profitent). `--mt-label-max = emprise − 11`.
  - Libellé extérieur (desktop uniquement — les frises mobiles n'en rendent pas) : `labelTrailPx = 6 + min(8 + texte, 240)` ; `--mt-label-max = labelTrailPx − 6` (boîte border-box, padding compris). `widthPx` de la barre NON touché.
  - `applyLabelReserves` s'applique APRÈS la mise à l'échelle et AVANT `layoutLanes` ; `layoutLane` reste pur/déterministe (DEC-S97-002). Objets inchangés gardent leur identité.
- « Plafond 240 px » interprété comme largeur de LIBELLÉ (= ancien `max-width`), soit emprise max 251 px.
- Module séparé plutôt que dans `scaleEventPositions` : `recurrence-marks.ts` importe `zoom.ts` → importer `isRecurringSeries` dans `zoom.ts` créerait un cycle.

## Tests
- `npx vitest run src/components/timeline/` → 22 fichiers, **342/342** verts (dont `label-reserve.test.ts` 20, `lane-layout.test.ts` 22 dont le `describe('cas limites (#748)')` intact, `EventPill.test.tsx` +3, `zoom.test.ts` inchangé et vert).
- `npx tsc --noEmit -p .` → 0 erreur.
- `rtk proxy npx next lint --file <f>` × 13 fichiers → 0 warning/erreur ; `rtk proxy npx prettier --check` (13 fichiers + `timeline.css`) → OK.
- E2E (harnais :3100 → :8087, oracles 401/200 vérifiés) :
  - `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test e2e/sprint-98-label-collision.spec.ts --ignore-snapshots --reporter=line` → 3/3 verts (desktop, portrait, paysage ; + 5 setup).
  - Surface complète (grep `timeline-zoom|mt-tlm|timeline-mobile|outside-label|evt-pin|event-pin`, 12 specs : `sprint-98-label-collision timeline timeline-mobile sprint-91-event-pin sprint-91-more-contrast sprint-91-recurrence-marks sprint-97-lane-stacking sprint-98-mobile-zoom-anchor sprint-85-timeline-group-head sprint-94-mobile-lane-gutter sprint-94-modal-shortcuts sprint-63-de-overflow-audit`) → **98 passed (2,1 min)**, 0 rouge, 0 flaky.
- Contrôles négatifs JOUÉS (édition temporaire de `label-reserve.ts`, restaurée par copie + `cmp` = identique) :
  1. Comportement d'avant (réserve constante + libellé 240 px) → **3/3 rouges** : desktop pin (libellé {x772,w240} ∩ suivante {x917}), portrait ({x83,w240} ∩ {x228}), paysage ({x342,w240} ∩ {x487}).
  2. Libellé extérieur seul neutralisé (pins corrigés) → desktop **rouge** (libellé {x912,w216} ∩ suivante {x942}).
  3. Option écartée « troncature à l'emprise » (réserve neutralisée, libellé coupé à 89/79 px) → **3/3 rouges** sur l'assertion de largeur lisible (reçu 89 desktop, 79 portrait/paysage).
  Rétabli → 3/3 verts (inclus dans le run de 98).
- `git status --short | grep darwin` → vide.

## Écarts d'énoncé
- `TimelineView.tsx` : la modification porte sur la ligne de mise à l'échelle (`useZoomCache` ~l.700), pas sur l'appel `layoutLanes` (l.718) qui est inchangé.
- `zoom.test.ts` l.201/213 non modifiés : `scaleEventPositions` garde l'emprise constante (plancher) ; l'élargissement vit dans `applyLabelReserves`.
- Mobile : pas de libellé extérieur (titre toujours dans la barre) → seul le cas pin concerne les frises mobiles ; la spec l'asserte (`outside-label` count 0).
- Brief « chasse mobile à lire ~l.823 » : confirmé 12,5 px, partagé portrait/paysage.
- `EventPill.test.tsx` enrichi (+3) ; `TimelineStacking.test.tsx` non modifié (vert).

## Non vérifié
- Rendu visuel en thème sombre et dans les 4 locales réelles (seul le jeu stubé fr/de a été mesuré).
- Largeur réelle du glyphe `↻` (compté 3 caractères, non mesuré) ; titres en MAJUSCULES / CJK (estimation optimiste → ellipse, pas de collision, mais coupure plus tôt que nécessaire non chiffrée).
- E2E joué au seul zoom Mois (pas Semaine/Trimestre/Année) ; lanes à >2 rangées non testées en E2E.
- `next build` non joué (vitest + tsc + `next dev` seulement).
- Virtualisation : `labelTrailPx` n'entre pas dans `eventTrackExtent` (libellé extérieur ≤ 246 px après la barre, sous `OVERSCAN_X_PX` 600) — raisonné, non mesuré.
- Stories Storybook non rejouées.

## Signaux mémoire
- [MEMORY:decision] DEC-S98-001 Context: #746, libellés de pin longs et libellé extérieur de secours hors emprise de l'empilage #709. Decision: réserve ESTIMÉE sans DOM (car. × chasse 0,525 em : 6,3 px desktop / 6,6 px mobile ; ↻ = 3 car. ; pin clamp(11+texte, 100|90, 251) ; extérieur 6 + min(8+texte, 240)) calculée par `applyLabelReserves` avant `layoutLane`, et libellé borné à sa réserve en CSS (`--mt-label-max`, ellipse, `title`). Why: la troncature à 84/74 px (ui-design) ne laisse que ~12 caractères et le doigt n'a pas de survol ; la mesure (canvas/DOM) casserait la pureté/déterminisme de `layoutLane` (DEC-S97-002). Conséquence : plus de rangées quand les titres sont longs.
- [MEMORY:pitfall] Context: `.mt-tlv__evt-outside` était `display:inline-flex` ; ajouter `overflow:hidden; text-overflow:ellipsis` n'aurait rien coupé proprement (le texte d'un conteneur flex est un item anonyme, `text-overflow` ne s'y applique pas). Solution: `display:block` + `line-height` = hauteur. Prevention: toute ellipse sur un conteneur flex exige un span enfant ou un passage en bloc.
- [MEMORY:pattern] Problem: un correctif « réserve » peut être vert pour une mauvaise raison (troncature seule suffit à supprimer la collision). Solution: assertion de largeur lisible (> ancienne réserve) EN PLUS du hit-test, et deux contrôles négatifs distincts (ancien comportement, option écartée). Anti-pattern: un seul contrôle négatif qui ne discrimine pas entre les options de charte.

## Recommandations suite
- RECOMMAND_FOLLOWUP: E2E de collision aux zooms Semaine/Trimestre et sur une lane à 3+ rangées (pins longs successifs) [triage XS]
- RECOMMAND_FOLLOWUP: mesurer la largeur réelle de `↻ ` et de titres en majuscules pour affiner la chasse (actuellement 0,525 em, 3 car. pour le glyphe) [triage XS]
- RECOMMAND_TEST_RUNNER: non
- RECOMMAND_DB_EXPERT: non
- RECOMMAND_SECURITY: non

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-98/ui-design-746.md` — LU (options A/B/C, valeurs x+11, « Décision du dev » : réserve estimée, plancher 100/90, plafond 240).
- `frontend/src/components/timeline/lane-layout.ts` — LU (commentaire l.15-16, `layoutLane`, `MOBILE_MORE_BUTTON_PX` 44, `LANE_GAP_PX` 8/10).
- `frontend/src/components/timeline/zoom.ts` l.150-320 — LU (`PositionedEvent`, `PIN_FOOTPRINT_PX`, `eventTrackExtent`, `scaleEventPositions`).
- `frontend/src/components/timeline/EventPin.tsx`, `EventPill.tsx` — LUS en entier.
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx` l.300-420, `useTimelineMobileState.ts` l.275-345, `TimelineView.tsx` l.680-725, `lib.ts` l.60-90 — LUS.
- `frontend/src/styles/ds/components/timeline.css` l.296-440 + grep font-size (l.823, l.912-919) — LUS.
- `frontend/e2e/sprint-97-lane-stacking.spec.ts`, `e2e/support/timeline-lanes.ts` — LUS en entier ; `e2e/timeline.spec.ts` l.1067-1135 (déclencheur `#787878`) — LU.
- `docs/memory/sprints/sprint-97/issue-709-done.md` — NON LU (DEC-S97-002..004 connus via les commentaires du code).
- `docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md` — NON LU (point « ne tronque pas » repris de ui-design-746.md).
- `.ai-env/context-packs/pit-frontend.md` et section pack de `briefing-747.md` — NON LUS (PIT-S94-004 appliqué d'après le brief : centrage `inline:center` avant `elementFromPoint`).
- `.ai-env/context-packs/cp-frontend.md` — NON LU (extrait inliné du brief utilisé).

STATUS: COMPLETED
