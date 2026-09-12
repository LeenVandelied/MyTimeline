# #265 fix — bypass rate-limit par chemin encodé (audit sécurité)

- commits: [SHA1 — voir git log]
- resume:
  - Défaut MAJEUR: `RateLimitingFilter` construisait la clé lookup LIMITS + clé bucket sur `request.getRequestURI()` BRUT (non décodé, contrat Servlet). `GET /api/%65xport` → clé `"GET /api/%65xport"` ≠ `"GET /api/export"` → throttle bypassé, alors que Spring décode et route vers `ExportController.exportInline` (recompute DB coûteux).
  - Méthode de normalisation: `org.springframework.web.util.UrlPathHelper` (champ stateless/thread-safe) → `getPathWithinApplication(request)` décode l'URL + retire le context-path. Calcul UNE fois dans `doFilterInternal`, réutilisé pour lookup LIMITS ET clé bucket (`ip | METHOD path_décodé`). Séparation GET/POST préservée (méthode dans la clé).
  - `throttledLimitFor()` supprimé (logique inline). Match reste EXACT: `/api/export/job/{id}` et `/download/{id}` décodés ≠ `/api/export` → toujours hors périmètre. POST auth protégés en bonus (même normalisation), limites inchangées.
  - Test non-régression ajouté: `exportInlineGet_percentEncodedPath_isThrottled_noBypass` — `GET /api/%65xport?format=json` (via `setRequestURI` forçant l'URI brute) répété → 6e = 429 + JSON propre. Sans fix: passerait (bypass), donc échouerait.
  - Périmètre inchangé, aucune migration, `ddl-auto=validate`. Fix confiné à `infrastructure/security/`.
  - Tests: `./scripts/test-quiet.sh backend` → 384 passed / 0 failed. Suite complète verte.
- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Context: matching de sécurité sur chemin HTTP. Solution: `getRequestURI()` n'est PAS décodé (contrat Servlet) → matcher sur `UrlPathHelper.getPathWithinApplication()` (décodé + context-path retiré). Prevention: toute décision (throttle/authz/allowlist) basée sur un path doit utiliser le chemin normalisé, jamais l'URI brute — sinon bypass par ré-encodage (`%65`=e), non bloqué par StrictHttpFirewall pour une lettre ordinaire.
- recommandations suite: aucune
- STATUS: COMPLETED
