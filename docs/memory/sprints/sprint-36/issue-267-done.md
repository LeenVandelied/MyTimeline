# issue-267-done — scheduler purge exports RGPD expirés

commits: [00dc7ca5480987e27e8cab6b045dd5b4bb66004f]

resume:
- OBJECTIF: purge TTL 24h des exports RGPD (fichier disque + ligne export_jobs) ; lève dette ADR-003 §3.
- V14: `V14__idx_export_jobs_expires_at.sql` = index seul `idx_export_jobs_expires_at (expires_at)` + rollback commenté. ddl-auto=validate reste vert (index != colonne, pas de modif entité). Flyway a appliqué V14 (log "now at version v14").
- FICHIERS CLES:
  - port `ExportJobRepository`: + `findExpired(LocalDateTime now)` + `deleteById(UUID)`.
  - impl `ExportJobRepositoryJpaImpl`: `findExpired` JPQL bindé (`expires_at IS NOT NULL AND < :now`, @Transactional(readOnly)); `deleteById` hérité de SimpleJpaRepository (idempotent, findById().ifPresent(delete)).
  - `infrastructure/config/SchedulingConfig` @Configuration @EnableScheduling (1er usage projet).
  - `application/services/ExportPurgeScheduler` @Component @Scheduled(fixedDelayString interval-ms:1h, initialDelayString:5min) @Transactional; inject `@Qualifier("exportStorage") StoragePort` + `Clock` + port repo; ordre fichier PUIS ligne; try/catch par job; log compte only (sans PII).
  - `application.properties` + `application-dev.properties`: props `app.export.purge.interval-ms` / `initial-delay-ms` (dev: 5min/10s).
- PITFALLS:
  - initialDelay 5min (default) empêche l'auto-tick @Scheduled d'interférer avec les 383 tests (finissent < 5min); test dédié force initial-delay=1h.
  - StoragePort.delete idempotent (contrat #264) -> pas de test d'existence avant delete.
  - deleteById hérité satisfait le port sans override (erasure UUID identique).
  - @Qualifier("exportStorage") obligatoire (2 beans StoragePort depuis #264, sinon ambiguïté au boot).
- TESTS: `ExportPurgeSchedulerIntegrationTest` (Testcontainers, V1..V14) — 3 tests PASSED:
  expiré COMPLETED -> fichier supprimé via exportStorage + ligne purgée ;
  non expiré -> intact ; idempotence fichier absent -> no-op sans exception, ligne purgée.
  Suite backend complète: Tests run 383, Failures 0, Errors 0 — BUILD SUCCESS.

[MEMORY:*] signaux:
- [MEMORY:pattern] Problem: 1er scheduler du projet. Solution: @EnableScheduling en infrastructure/config (SchedulingConfig, à côté d'AsyncConfig), tâches @Scheduled en application/services dépendant des ports; initialDelay long par défaut pour ne pas faire feu pendant la suite de tests. Anti-pattern: @EnableScheduling dans application/ ou tâche touchant l'impl JPA.
- [MEMORY:decision] Context: purge TTL exports. Decision: ordre delete fichier PUIS ligne (crash entre les 2 = fichier orphelin traçable via ligne restante, retenté au tick suivant), try/catch par job pour isolation. Why: éviter orphelins silencieux + un job KO ne bloque pas le batch.

recommandations suite: aucune (review db-expert attendue sur V14/index/balayage — déjà soignés: index dédié, rollback commenté, JPQL bindé, volume purge horaire faible).

STATUS: COMPLETED
