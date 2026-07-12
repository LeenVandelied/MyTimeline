# issue #58 — revfix (post-review batch)

commits: 94b117e

## resume
3 correctifs review appliqués + tests.

- MAJEUR — `ExportJob.markCompleted` : signature `(storageRef, completedAt, expiresAt)`.
  Supprimé `expiresAt.minusHours(24)` (magic 24h dupliquant `DOWNLOAD_TTL_HOURS`).
  Domaine n'a plus connaissance du TTL. Appelant `AsyncExportRunner` passe `now`.
- MINEUR — `AsyncConfig.exportExecutor` : `setRejectedExecutionHandler(new CallerRunsPolicy())`.
  Défaut Spring = `AbortPolicy` → rejet + job PENDING orphelin. Commentaire corrigé (devient vrai).
  `passwordResetExecutor` NON touché (hors scope).
- MINEUR — `CsvExportRenderer.neutralizeFormula` : ajout `\n` en tête aux déclencheurs (OWASP CSV).

## fichiers
- domain/models/export/ExportJob.java
- application/services/AsyncExportRunner.java
- infrastructure/config/AsyncConfig.java
- infrastructure/adapters/export/CsvExportRenderer.java
- test infrastructure/adapters/export/ExportRenderersTest.java (+ test `\n`)
- test domain/models/export/ExportJobTest.java (NOUVEAU — verrouille completedAt)

## tests
`./scripts/test-quiet.sh unit` → 355/355 (baseline 353 + 2 nouveaux). BUILD SUCCESS.

## recommandations suite
RECOMMAND_FOLLOWUP: `passwordResetExecutor` (AsyncConfig l.27-42) a le MÊME commentaire
trompeur "CallerRunsPolicy par défaut" alors que le défaut réel = AbortPolicy. Pré-existant,
hors scope #58. Aligner (setRejectedExecutionHandler) OU corriger le commentaire dans une issue dédiée.

## STATUS
COMPLETED
