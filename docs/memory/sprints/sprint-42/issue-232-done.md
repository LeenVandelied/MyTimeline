# issue #232 — done

commits: [fcbf64e]

## resume
- Spec créée: `frontend/e2e/sprint-42-events.spec.ts` (3 tests, mirror `products.spec.ts`, storageState PROD).
- Testids câblés (alignés `ConflictDialog.tsx`/`EventEditForm.tsx` @0bc144f): `event-form-conflict`, `conflict-dialog-diff`, `conflict-dialog-diff-row[data-field]`, `conflict-dialog-diff-local/-server`, `conflict-dialog-keep-mine`, `conflict-dialog-take-server`, `event-form-archived-toggle`, `event-form-title-input`, `event-form-submit`, `timeline-event`, `product-detail-*`.
- Approche 409: DEUX CONTEXTES (seule voie vers un vrai 409 backend), anti-flaky `page.waitForResponse(PATCH /events/)` + assert status 409 AVANT modale. Pas de `waitForTimeout`. (db-bump écarté: inefficace, cf. gap 2.)
- BR couvertes (encodées): BR-EVE-015 (409 comparatif: diff + keep-mine sans boucle + take-server refresh), BR-EVE-013 (archived toggle persisté + pré-rempli).
- Résultat run: NON exécuté (stack non montée localement) ET flux non atteignable (2 gaps applicatifs). Specs marquées `test.fixme` -> SKIPPÉES, CI reste verte. Compilent OK (`playwright --list` = 3 tests), `eslint` exit 0.

## BLOQUE_SUR — 2 manques applicatifs réels (pas infra)
1. **Surface édition non montée**: `EventContent`/`EventEditForm`/`ConflictDialog` seulement via `TimelineCalendar`->`Lane`->`EventBar`, or `TimelineCalendar` importé par 0 route. Timelines routées (dashboard, détail produit) = `TimelineResponsive`->`TimelineView` (`EventPill`->`EventDrawer` LECTURE SEULE) desktop / `TimelineMobile*` (callbacks `onEditEvent` non câblés) mobile. Cliquer `timeline-event` n'ouvre jamais `event-form`. Régression probable réécriture timeline S17. Bouton bascule éditer d'`EventContent` n'a en plus aucun `data-testid`.
2. **409 non déclenchable UI**: `eventService.updateEvent` -> `PATCH /events/{id}` SANS `version`. Backend recharge version courante -> pas de conflit séquentiel; un bump `version` en base ne suffit pas. Modale comparative #231 (corps enrichi `serverVersion`+`serverEvent`) inatteignable tant que le client ne thread pas la `version` du form.

## recommandations suite
- RECOMMAND_TEST_RUNNER: run `./scripts/test-quiet.sh e2e` une fois gaps levés (retirer `test.fixme`) — specs prêtes telles quelles.
- RECOMMAND_FOLLOWUP (bloquant #232, prio haute): (a) recâbler surface édition event dans une timeline routée (monter `EventEditForm`/`ConflictDialog` via `onEditEvent` OU réintroduire `EventContent`) + ajouter `data-testid` au bouton bascule éditer; (b) thread `version` dans `updateEvent`/`EventUpdateRequest` pour rendre le 409 optimistic déclenchable et alimenter le diff #231. Sans (a)+(b), #231 (livré) est du code mort côté UI.

## [MEMORY:pitfall]
Context: E2E #232 flux édition event. Solution: vérifier qu'un composant est RÉELLEMENT monté dans une route (grep consommateurs) avant d'écrire un E2E dessus — `EventContent`/`EventEditForm`/`ConflictDialog` orphelins (seul mount = `TimelineCalendar` non routé). Prevention: brique + testids livrés (#231/S25) ≠ atteignable UI; toujours tracer route->composant.

STATUS: PARTIAL
