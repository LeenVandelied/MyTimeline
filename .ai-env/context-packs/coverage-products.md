# Coverage — products (màj post-S10)

> Énumération réelle des tests. Remplace la version 2026-06-25 (« zéro test backend products » — faux positif).

## Tests backend présents
- `ProductServiceImplTest` (6 tests, unit Mockito) — création/lecture/modification/archivage, règles métier service.
- `ProductControllerOwnershipTest` (13 tests, slice Mockito + standaloneSetup) — contrôle d'ownership sur GET/PUT/DELETE sécurisés, 403 cross-user.
- `ProductArchivedFilterIntegrationTest` (6 tests, intégration @SpringBootTest + Testcontainers Postgres) — filtre soft-delete/archivé au niveau repository.

## Tests frontend / E2E
- `src/hooks/useProductsWithEvents.test.tsx` (2) — hook front produits+événements (transverse products/events).
- Aucun autre test frontend dédié products.
- E2E : aucun (`frontend/e2e/` = `.gitkeep` seul).

## Gaps restants (non couverts)
- Aucun E2E « créer un produit → voir dans la liste ».
- Validation Bean des payloads produit non couverte par un test controller dédié (pas de `ProductControllerValidationTest`).
- Composants UI produits (formulaires) sans test RTL.

## Total : 25 tests backend
