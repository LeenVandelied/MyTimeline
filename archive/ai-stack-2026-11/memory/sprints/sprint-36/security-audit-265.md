# Audit sécurité #265 (security-expert) — Sprint 36

Verdict : **CORRECTIONS_REQUISES**

## [MAJEUR] Bypass rate-limit par encodage URL — RateLimitingFilter.throttledLimitFor()
`throttledLimitFor()` compare `request.getMethod()+" "+request.getRequestURI()` littéralement.
`getRequestURI()` n'est PAS décodé (contrat Servlet). `GET /api/%65xport?format=json` → URI brute
`"GET /api/%65xport"` ne matche pas `"GET /api/export"` dans LIMITS → **throttle bypass total**, alors
que Spring décode et route vers `ExportController.exportInline` (recalcul DB). StrictHttpFirewall par
défaut ne bloque pas l'encodage d'une lettre ordinaire. Même faiblesse préexistante sur POST auth,
mais ce commit l'étend à l'endpoint coûteux visé par #265.
→ FIX : matcher sur chemin décodé/normalisé (UrlPathHelper.getPathWithinApplication ou décoder avant
  lookup), PAS getRequestURI() brut. + test de non-régression path encodé.
→ STATUT : à corriger (fullstack-dev dispatché après #267).

## [MINEUR] /download non borné (ADR-003 §6) — accepté MVP
Re-download en boucle d'un ZIP volumineux par le propriétaire : résidu IO/bande passante. Acceptable
(dette tracée, extension 1-ligne). À monitorer en prod.

## [OK] vérifiés
- trailing slash / casse → 404 (non exploitable)
- query string exclue de getRequestURI, bucket json/markdown partagé (testé)
- clé bucket = ip|method path, XFF ignoré (trust-forwarded-header=false confirmé) → non spoofable
- buckets GET/POST séparés (testé), POST forgot/reset inchangés
- corps 429 générique, aucun log PII
