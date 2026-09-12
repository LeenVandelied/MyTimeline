# Issue #58 — Export RGPD backend — DONE

## resume
- Objectif: endpoint export RGPD (Art. 20) données du user authentifié.
- Entités exportées: profil (SANS password/avatar bytes) + catégories POSSÉDÉES + produits actifs + événements imbriqués. Exclus (tracé ADR): password hash, sessions, password-reset tokens, catégories système, archivés.
- Formats: JSON+Markdown SYNC inline (GET); ZIP+CSV ASYNC job (POST) → polling → URL signée 24h.
- Fichiers clés:
  - domain: `models/export/{ExportFormat,ExportJob,ExportJobStatus,UserDataExport,RenderedExport}`, `ports/services/{ExportService,ExportRenderer}`, `ports/repositories/ExportJobRepository`, `exceptions/ExportFormatNotSupportedException`.
  - application: `services/{ExportServiceImpl,AsyncExportRunner,UserDataExportAssembler,ExportRendererRegistry}`, `dtos/ExportJobResponse` (CONTRAT FIGÉ #59).
  - infra: `adapters/export/{Json,Markdown,Csv,Zip}ExportRenderer + ExportFilenames`, `security/ExportTokenService` (jjwt HS256, Clock injecté), `adapters/controllers/ExportController`, `entities/ExportJobEntity`, `adapters/repositories/jpa/{ExportJobRepositoryJpaImpl,ExportJobMapper}`.
  - db: `V13__export_jobs.sql` (FK user_id ON DELETE CASCADE, CHECK format/status, index user).
  - wiring: SecurityConfig (`/api/export/**` ROLE_USER), AsyncConfig (`exportExecutor`), GlobalExceptionHandler (400).
- ADR produit: `docs/adr/ADR-003-export-rgpd-async-job.md`.
- Pitfalls résolus:
  - `findById(UUID)` du port collisionne avec SimpleJpaRepository → renommé `findDomainById`.
  - Mapper entity↔domain placé en INFRA (pas application/mappers) → évite NOUVELLE violation frozen ArchUnit (règle 2).
  - Race inter-thread PENDING: `submitAsync` NON transactionnel + repo `save` @Transactional → PENDING committé avant déclenchement worker.
  - StoragePort LOCAL = pas de presignedUrl → endpoint interne + token HMAC 24h.
- Sécurité: ownership 3-way download (caller==token.uid==job.owner), 404 anti-énumération, logs userId masqué, password JAMAIS exporté (test structurel + JSON).
- Tests: 27/27 PASS (5 snapshot + 6 renderers + 5 token expiry + 11 intégration endpoint/async/ownership/validation). ~43s, Testcontainers V1..V13.

## [MEMORY:*] signaux
- [MEMORY:decision] ADR-003: async = table export_jobs + @Async (pas MQ/scheduler); URL signée = endpoint interne + token jjwt HS256 24h (Clock injecté) car StoragePort LOCAL sans presignedUrl; rétention 24h; purge fichiers disque = dette (pas de scheduler cleanup).
- [MEMORY:pattern] Mapper entity↔domain d'une NOUVELLE feature → placer en infrastructure (pas application/mappers) pour rester conforme ArchUnit règle 2 (les mappers app historiques sont des violations gelées, en ajouter casse le freeze).
- [MEMORY:pitfall] Port repository custom: éviter le nom `findById` (collision signature covariante SimpleJpaRepository) → `findDomainById`.
- [MEMORY:pattern] Déclenchement @Async après commit: méthode submit NON @Transactional + repo.save @Transactional(REQUIRED) → la ligne est durable avant l'appel async (pas de race findById côté worker).

## recommandations suite
- RECOMMAND_SECURITY: auth/PII/ownership + URL signée (revue token 24h, périmètre RGPD, anti-énumération).
- RECOMMAND_DB_EXPERT: migration V13 (FK cascade, CHECK, index).
- RECOMMAND_FOLLOWUP: scheduler de purge des fichiers/jobs export expirés (dette ADR-003); bucket de stockage dédié export (aujourd'hui partagé avec avatars via app.storage.avatar-path).
- Pas de RECOMMAND_TEST_RUNNER: 27 tests, ~43s < seuils (500 / 3min).

## contrat DTO export figé (source de vérité #59)
- POST `/api/export?format=zip|csv` → 202 `ExportJobResponse` `{jobId:UUID, status, format, downloadUrl:null, expiresAt:null}`.
- GET `/api/export/job/{jobId}` → 200 `ExportJobResponse`; si status=COMPLETED: `downloadUrl="/api/export/download/{jobId}?token=<jwt>"`, `expiresAt=ISO-8601` (≈ +24h); sinon null. Job inconnu/autrui → 404.
- GET `/api/export?format=json|markdown` → 200 fichier inline (Content-Disposition attachment). Format async en GET → 400.
- POST format sync / format inconnu → 400 `{"error":"unsupported export format"}`.
- GET `/api/export/download/{jobId}?token=` → 200 octets (json/md/zip/csv) ou 404.
- status ∈ {PENDING,RUNNING,COMPLETED,FAILED}; format ∈ {JSON,MARKDOWN,ZIP,CSV} (async: ZIP,CSV).

STATUS: COMPLETED
