# Audit tests — Sprint 32

> Généré en fin de Phase 6. Un marqueur de couverture manquante en cellule bloque la Phase 9 PR.
> Thème : Portabilité RGPD backend (issue #58). Aucune BR métier formelle (BR impactées = aucune
> selon l'issue) — l'export est une exigence légale RGPD Art.20, non une règle de calcul métier.
> Couverture exprimée par exigence fonctionnelle (EF) plutôt que par BR-XX.

## Couverture par exigence

| EF | Description | Cross-system flow | Unit backend | Intégration | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| EF-1 | Snapshot RGPD exhaustif (profil+produits+événements+catégories), leak-proof (pas de password/avatar bytes) | NON | ✅ `UserDataExportTest` (5) | ⚠ N/A | ⚠ backend-only | ⚠ backend-only |
| EF-2 | Rendu multi-format (JSON/Markdown/CSV/ZIP) | NON | ✅ `ExportRenderersTest` (6+1) | ⚠ N/A | ⚠ backend-only | ⚠ backend-only |
| EF-3 | Export SYNC inline (GET json/markdown → 200) | NON | ⚠ N/A | ✅ `ExportEndpointsIntegrationTest` | ⚠ backend-only | ⚠ backend-only |
| EF-4 | Export ASYNC (POST zip/csv → job → polling → COMPLETED) | NON | ⚠ N/A | ✅ `ExportEndpointsIntegrationTest` | ⚠ backend-only | ⚠ backend-only |
| EF-5 | Ownership : job/fichier d'autrui → 404 (anti-énumération) | NON | ⚠ N/A | ✅ `ExportEndpointsIntegrationTest` | ⚠ backend-only | ⚠ backend-only |
| EF-6 | URL signée valide 24h puis expirée (token HS256, Clock) | NON | ✅ `ExportTokenServiceTest` (5) | ✅ endpoint download | ⚠ backend-only | ⚠ backend-only |
| EF-7 | Rate-limit `POST /api/export` → 429 au-delà de 5/min/IP | NON | ⚠ N/A | ✅ `RateLimitingAndHeadersIntegrationTest` | ⚠ backend-only | ⚠ backend-only |
| EF-8 | CSV injection neutralisée (préfixe formule `=+-@`) | NON | ✅ `ExportRenderersTest#csv_neutralizes...` | ⚠ N/A | ⚠ backend-only | ⚠ backend-only |

Cross-system flow = NON : #58 est backend pur, aucun flux multi-systèmes/rôles frontend↔backend
dans ce sprint. Le parcours utilisateur (Réglages → export) est livré en **S33 (#59)** — l'E2E
métier du flux RGPD complet appartient à ce sprint, pas au 32. Aucune couverture manquante bloquante ici :
le contrat DTO est figé et documenté pour l'alignement S33.

## Tests créés
- `backend/.../domain/models/export/UserDataExportTest.java` (snapshot exhaustif, no-leak)
- `backend/.../infrastructure/adapters/export/ExportRenderersTest.java` (renderers + CSV injection)
- `backend/.../infrastructure/security/ExportTokenServiceTest.java` (token 24h, expiration)
- `backend/.../infrastructure/adapters/controllers/ExportEndpointsIntegrationTest.java` (sync/async/ownership/validation)
- `backend/.../infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` (+ test 429 export)

## Résultats runs
- Backend : **355 tests, 355 passed, 0 failed** (baseline pré-sprint 351 + 4 tests ajoutés :
  2 secfix + 2 revfix). Runs successifs : fullstack inline 27/27 (nouveaux) ; test-runner suite
  complète 351/351 (post-feature) ; secfix 353/353 ; revfix 355/355 (final). Testcontainers
  Postgres 16, Flyway V1..V13. BUILD SUCCESS.
- Frontend : hors périmètre (aucun fichier frontend touché).
- E2E : hors périmètre (backend pur ; parcours utilisateur = S33 #59).

## Audits spécialistes
- **security-expert** : 0 CRITIQUE. 1 MAJEUR (rate-limit export) + 1 MINEUR (CSV injection) → CORRIGÉS (f663d98).
- **db-expert** : migration V13 saine (FK cascade RGPD, CHECK format/status alignés enums, index user,
  entité↔schéma OK, boot `validate` OK). 4 MINEUR non bloquants (timestamp sans tz, index expires_at
  absent, UUID v4≠v7) → follow-ups.
- **reviewer batch** : 0 CRITIQUE. 1 MAJEUR (`markCompleted` completedAt dérivé par magic 24h) +
  2 MINEUR (`exportExecutor` AbortPolicy vs commentaire → 500+job orphelin ; CSV `\n` non neutralisé)
  → tous CORRIGÉS (9b9bf5c). 1 RECOMMAND_FOLLOWUP : commentaire trompeur `passwordResetExecutor` (hors scope).

## Conclusion
**Prêt pour PR.** Suite complète verte (353/353), findings sécurité MAJEUR/MINEUR résolus,
migration validée, snapshot leak-proof. Aucune couverture manquante bloquante. L'E2E métier du parcours
RGPD utilisateur relève de S33 (#59), qui consomme le contrat DTO figé ici.
