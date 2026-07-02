# Issue #168 — Validations Bean conditionnelles events (BR-EVE-006/012/014) — DONE

## Résultat
Commit `0802d71` (:white_check_mark: validations Bean events BR-EVE-012/014 + color au create + tests). 231 tests backend, 0 échec.

## Détail par règle
- **BR-EVE-006** (recurrenceUnit requis si isRecurring) : **DÉJÀ FAIT** (vérifié code réel + `git log` d711ea8/fa55669). Create via `EventCreationRequest.isRecurrenceUnitConsistent()` `@AssertTrue @JsonIgnore` → 400 ; PATCH via garde service → `RecurrenceUnitRequiredException` → 400. Tests présents. NON ré-implémenté.
- **BR-EVE-014** (color au create) : AJOUTÉ. Champ `color` (String nullable, additif non-cassant) sur `EventCreationRequest` + threadé dans `EventServiceImpl.createEvent`.
- **BR-EVE-012** (recurrenceEndDate < startDate) : AJOUTÉ. Garde état-fusionné dans `updateEvent` (le PATCH ne porte pas startDate) → nouvelle `RecurrenceEndDateBeforeStartException` → **HTTP 422**. `isBefore` stricte (end==start toléré). Portée sur update uniquement car `recurrenceEndDate` n'existe pas dans le DTO create (hors scope #168 qui ne demande que `color` au create).

## Écart HTTP (à noter)
Issue #168 dit "400" ; le dépôt mappe les erreurs métier events en **422** (cohérent `InvalidDurationUnitException`/DEC-S12-001). BR-EVE-012 livrée en 422. BR-EVE-006 reste en 400 (Bean Validation / garde existante, non touché). → même question de contrat que #164 (400 vs 422), à trancher au triage.

## Commits
- `0802d71` — EventCreationRequest.java (+color), EventServiceImpl.java, RecurrenceEndDateBeforeStartException.java (new), GlobalExceptionHandler.java, EventCreationRequestContractTest.java (new +2), EventServiceImplTest.java (+5). 230+/1-.

## Signaux
- `[MEMORY:business-rule]` Contrat create events : `color` fournissable à `POST /api/events` (additif optionnel, aligné update, non-cassant).
- `[MEMORY:decision]` BR-EVE-012 validée en 422 (état fusionné service), cohérence DEC-S12-001.

## Recommandations suite
- **RECOMMAND_FOLLOWUP** [triage S | domaine events/frontend] : #150 (S15) — répercuter `color` au create côté Zod/eventService frontend + refine `recurrenceEndDate >= startDate`.
- Pas de RECOMMAND_TEST_RUNNER (suite < 3 min). Pas de migration ici (#128 = filet DB).

STATUS: COMPLETED
