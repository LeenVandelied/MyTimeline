# Issue #439 — DONE

commits: [ba8f585]

## resume
Objectif: câbler le port `RecurrenceExpansionService` (0 appelant en `src/main`) sur un endpoint HTTP pour exposer `capped` au front (#67). Option 2 retenue (endpoint dédié, `EventResponse` NON touché).
BR: BR-EVE-012 (recurrenceEndDate < startDate -> 422, sémantique réutilisée), BR-EVE-006/#452 (capping horizon 5 ans / MAX_OCCURRENCES=4000 — logique service inchangée, jamais recalculée).

Fichiers:
- NEW `application/dtos/RecurrencePreviewRequest.java` — `@NotNull LocalDate startDate`, `@NotNull RecurrenceUnit recurrenceUnit` (bind enum direct WEEK/MONTH/YEAR), `LocalDate recurrenceEndDate?`.
- NEW `application/dtos/RecurrencePreviewResponse.java` — `int count`, `boolean capped`, `fromExpansion()` (`capped=expansion.capped()`, jamais recalculé — garde #54).
- NEW `infrastructure/adapters/controllers/RecurrencePreviewController.java` — `@PostMapping("/api/events/recurrence-preview")`, injecte SEUL le port `RecurrenceExpansionService`. Controller dédié (pas EventController) -> n'impacte ni son constructeur ni ses tests existants.
- MOD `domain/exceptions/RecurrenceEndDateBeforeStartException.java` — ajout constructeur additif `(LocalDate end, LocalDate start)` sans id event (contexte preview pur).
- (non modifié, confirmé) `EventResponse.java`, SecurityConfig (`/api/events/**` couvre déjà la route en ROLE_USER).

Contrat erreur: `@Valid` -> 400 champ requis manquant. `expand()` lève `IllegalArgumentException` si end<start ; le controller la traduit en `RecurrenceEndDateBeforeStartException` -> 422 (`error=unprocessable_entity`), même mapping que le CRUD via GlobalExceptionHandler.

Tests (5, slice standaloneSetup + GlobalExceptionHandler, port mocké):
- `previewRecurrence_boundedSeriesUnderLimit_returns200_countAndCappedFalse`
- `previewRecurrence_unboundedSeriesTruncated_returns200_cappedTrue`
- `previewRecurrence_recurrenceEndDateBeforeStart_returns422`
- `previewRecurrence_missingStartDate_returns400_andServiceNotCalled`
- `previewRecurrence_missingRecurrenceUnit_returns400_andServiceNotCalled`
`RecurrenceExpansionServiceImplTest` non touché.

test-quiet: `./scripts/test-quiet.sh backend` -> Tests run: 475, Failures: 0, Errors: 0. BUILD SUCCESS.

## contrat_pour_67
- Route: `POST /api/events/recurrence-preview` (authentifié cookie/Bearer ROLE_USER, PAS d'ownership).
- Requête JSON: `{ "startDate": "YYYY-MM-DD" (requis), "recurrenceUnit": "WEEK"|"MONTH"|"YEAR" (requis, casse exacte), "recurrenceEndDate": "YYYY-MM-DD"|null (optionnel) }`.
- Réponse 200: `{ "count": <int>, "capped": <boolean> }`.
- Erreurs: 400 `{error:"validation_failed"}` si startDate/recurrenceUnit manquant ; 422 `{error:"unprocessable_entity"}` si recurrenceEndDate < startDate ; 401 si non authentifié (SecurityConfig).
- Hint live #67: afficher quand `capped=true` ; une série sans `recurrenceEndDate` renvoie toujours `capped=true` (bornée horizon 5 ans).

## [MEMORY]
[MEMORY:decision] Context: #439 exposer flag capped récurrence. Decision: endpoint dédié POST /api/events/recurrence-preview (Option 2), controller séparé injectant le seul port RecurrenceExpansionService. Why: EventResponse partagé non élargi, EventController + ses tests non impactés (pas de param constructeur ajouté), hint live #67 impossible via flag post-soumission.
[MEMORY:pattern] Problem: réutiliser une sémantique d'erreur 422 domaine sur un endpoint pur sans entité. Solution: constructeur additif sans id sur RecurrenceEndDateBeforeStartException + catch IllegalArgumentException(expand) -> rethrow domaine, mappé par GlobalExceptionHandler existant. Anti-pattern: introduire une 2e exception/2e code d'erreur pour la même règle BR-EVE-012.

## recommandations suite
- RECOMMAND_FOLLOWUP #67: typer le contrat côté frontend (Zod/service) — champs `count`/`capped`, route ci-dessus. Aucune sync DTO backend requise (EventResponse intact).
- Pitfall subtil: `recurrenceUnit` est bindé à l'enum EXACT (WEEK/MONTH/YEAR), PAS via `RecurrenceUnit.fromString` (qui tolère weeks/months/years). Le front #67 doit envoyer les valeurs majuscules exactes ; un `"weeks"` legacy -> 400 (Jackson enum). Choix assumé: contrat stable aligné sur la sérialisation `EventResponse.recurrenceUnit`.
- Pas de RECOMMAND_SECURITY: `/api/events/**` déjà ROLE_USER (SecurityConfig:154) + `anyRequest().authenticated()`. Pas de RECOMMAND_TEST_RUNNER (475 < 500, suite < 3 min).

STATUS: COMPLETED
