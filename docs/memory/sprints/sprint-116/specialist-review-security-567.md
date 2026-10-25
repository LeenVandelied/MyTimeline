# Audit sécurité #567 (commit 7dc4242b) — security-expert, lecture seule, 2026-10-25

**Verdict : APPROUVÉ** — aucun correctif bloquant.

- [OK] `SecurityConfig.java:224` — `Retry-After` en `exposedHeaders` ne vaut que pour les origines déjà autorisées ; `allowedOrigins` explicite par profil, `allowCredentials=true` interdit le wildcard ; CorsFilter avant le limiteur.
- [OK] `RateLimitingFilter.java:~501-509` — seau par jeton : pas d'oracle (seau créé pour toute valeur ≤ 128 car., sans accès base) ; critère anti-énumération #141 tenu.
- [OK] `UserRateLimitingFilter.java:148-153` — clé = id issu du JWT ; chacun ne voit que son seau.
- [OK/MINEUR] `RateLimitingFilter.java:227` — `Retry-After` laisse inférer la fenêtre (60 s), pas la capacité ; décision « pas de X-RateLimit-* » respectée.
- [MINEUR] `RateLimitingFilter.java:227-230` — borne haute 60 par construction seulement ; durcissement proposé : `Math.min(WINDOW.toSeconds(), Math.max(1L, seconds))`.
- [OK] Ordre des filtres, corps du 429 et logs inchangés.
- [MINEUR] Rapport surefire `CorsAllowedOriginsConfigIntegrationTest` « Tests run: 0 » à vérifier (preuve CORS du commit portée par `crossOrigin429_exposesRetryAfter`, verte).
- [MINEUR] Le frontend ne lit pas `Retry-After` (follow-up).

Signaux :
- [MEMORY:pitfall] Un 429 par seau à clé contrôlée par l'attaquant (jeton reset) ne devient un oracle que si la création du seau dépend d'un accès base / de l'existence de la ressource ; ne jamais introduire de lookup avant `tryConsumeToken`.
- [MEMORY:decision] `Retry-After` seul acceptable : fenêtre déjà observable, capacité non ; ne pas ajouter `X-RateLimit-*`.

**Vérification du lead (rapport surefire CORS)** : faux positif. Le `.txt` de surefire ne compte que la classe externe (« Tests run: 0 ») ; le XML porte 7 `<testcase>` des classes `@Nested`, 0 échec/erreur. Les 7 tests s'exécutent.
