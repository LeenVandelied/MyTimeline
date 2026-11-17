# Coverage — events (màj post-S10)

> Énumération réelle des tests. Remplace la version 2026-06-25 (« zéro test backend events » — faux positif).

## Tests backend présents
- `EventServiceImplTest` (5 tests, unit Mockito) — CRUD service, règles métier événement.
- `EventControllerOwnershipTest` (3 tests, intégration @SpringBootTest + Testcontainers Postgres + standaloneSetup) — contrôle d'ownership sur GET/PUT/DELETE, 403 cross-user.
- `EventControllerValidationTest` (1 test, slice Mockito + standaloneSetup) — validation Bean sur payload événement.

## Tests frontend / E2E
- `src/hooks/useProductsWithEvents.test.tsx` (2) — hook front produits+événements (transverse products/events).
- Aucun autre test frontend dédié events (intégration FullCalendar non testée).
- E2E : aucun (`frontend/e2e/` = `.gitkeep` seul).

## Gaps restants (non couverts)
- Aucun E2E « créer un événement → voir sur calendrier » ni édition depuis calendrier.
- Intégration FullCalendar (rendu, drag) non couverte.
- Couverture controller events plus légère que categories/products (1 seul test validation, ownership à 3 cas).

## Total : 9 tests backend
