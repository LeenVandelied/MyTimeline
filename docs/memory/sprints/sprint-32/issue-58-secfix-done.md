# Issue #58 — secfix post-audit (S32)

commits: f663d98

## resume
2 correctifs sécurité export RGPD, périmètre strict.

- [MAJEUR] `infrastructure/security/RateLimitingFilter.java` — ajout entrée
  `"/api/export", 5` dans `PATH_LIMITS` (5/min/IP). Soumission job async (POST)
  désormais throttlée → protège pool async borné + accumulation fichiers disque.
  Match exact URI, POST only. GET (json/markdown/job/download) NON throttlés (attendu).
- [MINEUR] `infrastructure/adapters/export/CsvExportRenderer.java` — nouvelle méthode
  `neutralizeFormula()` appelée en tête de `escape()` : préfixe `'` si champ commence
  par `= + - @ \t \r`, AVANT échappement RFC 4180 (préservé).

Tests ajoutés:
- `RateLimitingAndHeadersIntegrationTest#exportSubmission_sixthWithinWindow_returns429`
  (6e POST /api/export même IP → 429 + `{"error":"too_many_requests"}`).
- `ExportRenderersTest#csv_neutralizesFormulaInjectionOnUserControlledFields`
  (`=`,`@`,`-` préfixés `'` ; formule+virgule → apostrophe interne + guillemets RFC 4180).

Effet de bord réparé (dans périmètre tests):
- `ExportEndpointsIntegrationTest` : 6 POST /api/export partagent l'IP MockMvc défaut
  (127.0.0.1) → dépassaient la nouvelle limite. Ajout `app.rate-limit.enabled=false`
  (test de flow fonctionnel, pas de throttle ; switch = usage CI/e2e documenté).

Total: 353/353 verts (baseline 351 + 2 nouveaux). Build backend OK.

## [MEMORY:*]
- [MEMORY:pitfall] Context: ajouter une entrée PATH_LIMITS casse les tests d'intégration
  existants qui spamment le même endpoint sur l'IP MockMvc par défaut (127.0.0.1 partagé
  entre méthodes, buckets singleton keyed IP|URI). Solution: soit `nextIp()` par requête,
  soit `app.rate-limit.enabled=false` sur le test de flow. Prevention: tout ajout dans
  PATH_LIMITS → auditer les tests POSTant sur ce path.

## recommandations suite
aucun car périmètre strict respecté, suite verte, pas de dette introduite.

STATUS: COMPLETED
