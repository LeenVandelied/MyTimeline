# Audit tests — Sprint 16

> Généré en fin de Phase 6. Sprint « Fondations design + extraction Timeline » : architecture (ArchUnit), design system (Storybook), refactor présentationnel (Timeline). Aucune nouvelle BR métier ni nouveau flux cross-system introduit.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-001 | Events affichés appartiennent au user connecté | NON (touché indirectement) | ✅ (existant) | ✅ (existant) | ✅ | ⚠ infra | ⚠ N/A |

BR-EVE-001 n'est PAS modifiée par ce sprint : l'extraction #47 est purement présentationnelle (mêmes props, mêmes data-testid, logique de calcul extraite bit-à-bit). Aucun changement de flux de données ni de filtrage par user → pas de nouvelle exigence E2E métier. Les autres issues (#166 ArchUnit, #46 Storybook DS) ne touchent aucune BR fonctionnelle.

## Tests créés / modifiés
- `backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` (#166) — 4 règles hexagonales + FreezingArchRule baseline (corrigé Règle 1, d38aef0).
- `backend/src/test/resources/archunit_store/` — baseline gelée versionnée.
- `frontend/src/components/ui/*.stories.tsx` (#46) — 17 stories DS.
- `frontend/src/components/timeline/*.stories.tsx` (#47) — 5 stories sous-composants Timeline.
- (pas de nouveau test unitaire de comportement : extraction préserve le contrat, couvert par vitest existant + build-storybook.)

## Résultats runs (test-runner Phase 6, + fix Règle 1)
- **Backend** : 242 tests, 242 passed, 0 failed (inclut ArchitectureTest 4/4 en mode gelé `allowStoreCreation=false`).
- **Frontend (vitest)** : 85 tests, 85 passed, 0 failed.
- **Storybook build** : OK (22 stories : 17 DS + 5 Timeline).
- **E2E (golden-path.spec.ts)** : ⚠ **NON CONCLUANT — échec infrastructure** (processus backend Java mort en cours de run, endpoints /api/auth injoignables). **PAS une régression de code** : les data-testid Timeline (`timeline-calendar`, `timeline-resource-title`, `timeline-event`) sont pré-existants (présents sur `dev`), préservés par l'extraction (vérifié statiquement + reviewer [OK] + vitest vert). Aucun testid NOUVEAU non couvert.

## Coverage E2E (Phase 8)
- Testids du diff (`timeline-event`, `timeline-resource-row`, `timeline-resource-title`) = **déplacés, pas nouveaux** (existaient sur `dev`). Couverts par `frontend/e2e/golden-path.spec.ts` (event, resource-title, calendar). Pas de plan `/create-e2e` requis (aucun testid neuf).

## Conclusion
Prêt pour PR. Backend + Frontend + Storybook verts. CRITIQUE review (Règle 1 ArchUnit) résolu et re-vérifié.

⚠ **Réserve E2E** : golden-path n'a pas pu tourner end-to-end (backend down dans le harness de test, cause infra). À re-vérifier post-merge une fois la stack levée (backend + frontend up), OU via CI E2E si configurée. Non bloquant pour le merge (extraction behavior-preserving prouvée par unit + review statique).
