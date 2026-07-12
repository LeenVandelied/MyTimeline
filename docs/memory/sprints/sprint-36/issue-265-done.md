# issue-265-done

[OPTION] 1 (+ 2 en complément) — throttle GET /api/export synchrone + trace décision hors-scope

[CHANGE] RateLimitingFilter.java - PATH_LIMITS (path->limit, POST-only) => LIMITS (clé "METHOD path")
[CHANGE] RateLimitingFilter.java - ajout "GET /api/export"=5/min/IP ; bucket key inclut méthode (GET/POST buckets séparés)
[CHANGE] RateLimitingFilter.java - throttledLimitFor sans check POST ; match exact URI => /job + /download jamais matchés
[CHANGE] RateLimitingFilter.java - import HttpMethod retiré (inutilisé) ; javadoc classe MAJ (scope export, exclusions tracées)
[CHANGE] ADR-003 - §6 Rate-limiting : GET+POST /api/export throttlés ; /job + /download hors-scope + justif self-service borné
[CHANGE] RateLimitingAndHeadersIntegrationTest - +4 tests, comment POST test MAJ

[DECISION] GET /api/export = 5/min/IP (aligné POST/forgot/reset, opération lourde). Bucket séparé du POST via méthode dans la clé.
[DECISION] /job (polling léger) + /download (re-download COMPLETED, aucun recalcul) volontairement NON throttlés — self-service owner-scoped (autrui->404), résidu accepté, extension = 1 ligne si abus réel.

[TEST] exportInlineGet_sixthWithinWindow_returns429 - GET 6e => 429 JSON
[TEST] exportGetAndPost_haveIndependentBuckets - GET épuisé n'entame pas quota POST
[TEST] exportJobPolling_isNotRateLimited - GET /job x30, jamais 429
[TEST] exportDownload_isNotRateLimited - GET /download x30, jamais 429
[TEST] suite backend complète : 380 run, 0 fail, ~29s (classe ciblée : 12 run, 0 fail)

[REGRESSION] risque throttle polling/download écarté : match EXACT URI, /job + /download hors LIMITS. Test existant POST inchangé (comment MAJ).
[PII] aucun log ajouté ; corps 429 générique {"error":"too_many_requests"} (pas de path/IP/jobId).

STATUS: COMPLETED
