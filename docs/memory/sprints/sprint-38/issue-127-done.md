# Issue #127 — done

## Commits
- c8fc800

## Résumé
`buildBody(status, message)` remplaçait `error` par `status.getReasonPhrase()` ("Not Found"/"Bad Request"). Créé `ErrorCode.java` (enum public, package `infrastructure/adapters/controllers`, codes `not_found`/`validation_failed`/`unprocessable_entity`). Refactoré `buildBody(HttpStatus, ErrorCode, String)` — les 5 call sites du 2-arg (`handleNotFound`, `handleValidation`, `handleInvalidDurationUnit`, `handleRecurrenceEndDateBeforeStart`, `handleEndDateBeforeStart`) passent désormais un `ErrorCode` explicite au lieu de laisser `status.getReasonPhrase()` fuiter.

Fichiers : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/{GlobalExceptionHandler,ErrorCode}.java`.

Tests : test cassé (`"$.error" == "Bad Request"`) corrigé → `"validation_failed"`. Nouveau test `GlobalExceptionHandlerErrorCodeTest` verrouille `not_found` sur `handleNotFound` (via `EventNotFoundException`, mock standalone). Suite backend complète : **391 tests, 0 échec**.

Pitfall : `buildBody` 2-arg était partagé par 5 handlers, pas seulement NotFound/Validation cités dans l'issue — tous migrés pour cohérence avec l'AC. `frontend/src` grep : aucun parsing dur de "Not Found"/"Bad Request" côté client (pas de casse frontend).

## Signaux mémoire
- [MEMORY:pattern] Problem: `GlobalExceptionHandler.buildBody(status,message)` exposait `status.getReasonPhrase()` comme code d'erreur client, non stable/parsable. Solution: enum public `ErrorCode` (snake_case), `buildBody(HttpStatus, ErrorCode, String)`. Anti-pattern: ne jamais renvoyer `HttpStatus.getReasonPhrase()` dans un contrat JSON consommé par le frontend — ni pour `error` ni pour un futur `code`.

## Recommandations suite
Aucune (issue #125, vague 2, consommera `ErrorCode` — enum déjà public, pas d'action requise ici).

STATUS: COMPLETED
