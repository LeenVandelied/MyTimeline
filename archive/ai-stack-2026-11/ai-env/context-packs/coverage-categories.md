# Coverage — categories (màj post-S10)

> Énumération réelle des tests. Remplace la version 2026-06-25 (« zéro test backend categories » — faux positif).

## Tests backend présents
- `CategoryServiceImplTest` (15 tests, unit Mockito) — CRUD service, règles métier (unicité, rejet suppression si utilisée).
- `CategoryControllerTest` (22 tests, slice Mockito + standaloneSetup) — endpoints CRUD, codes d'erreur, ownership.
- `CategoryDeleteReassignIntegrationTest` (5 tests, intégration @SpringBootTest + Testcontainers Postgres) — suppression avec réassignation des événements liés.
- `GlobalExceptionHandlerValidationTest` (1 test, slice Mockito + standaloneSetup) — mapping validation → réponse HTTP (transverse, partiellement pertinent categories).

## Tests frontend / E2E
- Aucun test frontend dédié categories.
- E2E : aucun (`frontend/e2e/` = `.gitkeep` seul).

## Gaps restants (non couverts)
- Aucun E2E « créer une catégorie → l'assigner à un événement ».
- Aucun test frontend (formulaire/liste catégories).

## Total : 42 tests backend
> `GlobalExceptionHandlerValidationTest` (1) est transverse ; les 42 incluent les 3 classes categories (15+22+5) + ce test transverse.
