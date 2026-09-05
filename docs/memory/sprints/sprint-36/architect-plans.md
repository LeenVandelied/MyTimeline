# Mini-plans architect — Sprint 36

> Généré par /sprint plan (architect, 2026-07-12). Lu par /sprint start Phase 4.1.
> Thème : Export RGPD hardening — cohésion 0.72 | Migrations : V14 (idx_export_jobs_expires_at) | Dépend de : aucune (mais introduit le scheduling réutilisé en S37 → S36 AVANT S37)

```yaml
issue_0264:
  fichiers_cles: ["backend/.../infrastructure/adapters/LocalStorageAdapter.java", "backend/.../domain/ports/...StoragePort", "backend/.../application/services/ExportServiceImpl.java", "backend/.../AsyncExportRunner", "backend/src/main/resources/application-dev.properties", "application-prod.properties"]
  couches_touchees: ["application","infrastructure"]
  strategie_test: "integration (export écrit dans le nouveau base-path ; fail-fast si export-path absent en prod)"
  risque_regression: "clé app.storage.export-path SANS default prod (convention #34) = fail-fast ; ne pas hériter des hypothèses avatar (taille max, rétention)."
  ordre_ecriture: "clé config → port/qualifier export dédié (ou base-path paramétré) → cibler ExportServiceImpl/AsyncExportRunner → test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "export écrit via app.storage.avatar-path (couplage avatar) confirmé ; pas de clé dédiée."
issue_0265:
  fichiers_cles: ["backend/.../infrastructure/security/RateLimitingFilter.java", "backend/.../infrastructure/security/RateLimitConfig.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (GET /api/export synchrone throttlé ; polling /job + download non pénalisés)"
  risque_regression: "throttle trop agressif casserait le polling /job légitime ou le re-download COMPLETED ; ne cibler que le GET synchrone coûteux."
  ordre_ecriture: "ajouter GET /api/export au PATH_LIMITS (aujourd'hui POST-only) → test ; sinon tracer décision hors-scope + commentaire"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "RateLimitingFilter throttle POST uniquement (l.31-32) ; GET export non couvert."
issue_0267:
  fichiers_cles: ["backend/src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql", "backend/.../infrastructure/config/SchedulingConfig.java (nouveau, @EnableScheduling)", "backend/.../application/services/ExportPurgeScheduler.java", "backend/.../domain/ports/repositories/ExportJobRepository.java", "backend/.../infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java"]
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (Testcontainers : job expiré → StoragePort.delete + ligne purgée ; idempotence fichier absent)"
  risque_regression: "ddl-auto=validate : V14 doit matcher exactement ; scheduler ne doit pas purger un COMPLETED non expiré ; log sans PII."
  ordre_ecriture: "V14 → port findExpired/delete → adapter JPA → SchedulingConfig @EnableScheduling → scheduler @Scheduled (StoragePort.delete puis delete ligne) → test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "V13 a idx_export_jobs_user mais PAS idx_export_jobs_expires_at ; aucun @EnableScheduling → ce sprint bootstrappe le scheduling."
```
