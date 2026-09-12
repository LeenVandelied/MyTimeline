# Audit tests — Sprint 36 (Export RGPD hardening)

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.
> Sprint 100% backend (aucun changement frontend/.tsx) → pas de nouveau data-testid, pas d'E2E requis.

## Couverture par issue / BR

| Issue | Objet | Cross-system flow | Unit/Slice backend | Integration (Testcontainers) | E2E |
|-------|-------|:---:|:---:|:---:|:---:|
| #264 | Chemin stockage dédié export (app.storage.export-path, beans qualifiés) | NON | ✅ | ✅ StorageConfigTest (découplage répertoires + fail-fast prod) ; ExportEndpointsIntegrationTest (flux async via exportStorage) | N/A (backend) |
| #265 | Rate-limit GET /api/export synchrone (+ fix bypass encodage URL) | NON | ✅ | ✅ RateLimitingAndHeadersIntegrationTest (429 après limite, buckets GET/POST séparés, /job + /download exemptés, bypass %65xport throttlé) | N/A (backend) |
| #267 | Scheduler purge exports expirés (V14 + @EnableScheduling) | NON | ✅ | ✅ ExportPurgeSchedulerIntegrationTest (expiré→purgé fichier+ligne ; non-expiré→intact ; idempotence fichier absent) | N/A (backend) |

Cross-system flow = NON pour les 3 (backend interne / self-service owner-scoped, pas de flux multi-systèmes/rôles) → E2E métier non requis.

## Tests créés / étendus
- `backend/.../infrastructure/config/StorageConfigTest.java` (#264, nouveau)
- `backend/.../infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` (#265, +6 tests dont non-régression bypass encodé)
- `backend/.../application/services/ExportPurgeSchedulerIntegrationTest.java` (#267, nouveau, 3 tests Testcontainers)

## Résultats runs
- **Backend : 384 tests, 384 passed, 0 failed, 0 errors — BUILD SUCCESS** (test-runner isolé, ~101s, Testcontainers Postgres 16).
- Frontend : aucun changement (N/A).
- E2E : aucun testid nouveau (N/A).

## Audits spécialistes
- security-expert (#265) : MAJEUR bypass rate-limit par encodage URL → **CORRIGÉ** (commit 4ad929e, UrlPathHelper.getPathWithinApplication + test régression). MINEUR /download non borné → accepté MVP, tracé ADR-003 §6.
- db-expert (V14) : **APPROUVE**. MINEUR index partiel `WHERE expires_at IS NOT NULL` → follow-up optionnel.
- reviewer batch : **APPROUVE**. MINEUR dead-letter/compteur d'échecs répétés purge → follow-up optionnel.

## Conclusion
Prêt pour PR. Aucun blocage. Suite verte, 3 audits résolus/approuvés.
