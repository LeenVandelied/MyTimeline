# Issue #285 — Capper spring.datasource.hikari.maximum-pool-size (profil test)

commits: [b3d5555]

resume:
- Objectif: éviter "FATAL: too many clients already" (Testcontainers Postgres) quand la
  suite multiplie les contextes Spring cachés (@SpringBootTest(properties={...}) uniques).
- Fichier: backend/src/test/resources/application-test.properties (ajout 1 propriété).
- Changement: spring.datasource.hikari.maximum-pool-size=2 (défaut Hikari = 10 → ÷5 par contexte).
- BR touchées: aucune (fiabilisation infra test).
- Réalisé inline par le lead (XS config, aucun mini-plan architect).

tests:
- Validation = run suite backend complète en Phase 6 (test-runner). AC = plus de "too many
  clients". Non ré-exécutable en isolation (le bug est un effet cumulatif multi-contextes).
- Garde-fou: si pool=2 provoque un deadlock de connexion sur un test intégration (attente
  d'une 2e connexion dans une même tx), remonter à 3.

recommandations suite:
- Pas de RECOMMAND_* : changement de config isolé. Vérification déléguée au full run Phase 6.

STATUS: COMPLETED
