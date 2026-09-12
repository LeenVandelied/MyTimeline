# Issue #120 — Externaliser/durcir CORS + cookie par profil — DONE

**Commit :** ac8363f
**Fichiers :** SecurityConfig.java (CORS) + application-dev.properties + application-prod.properties + docs/runbook/cors-cookie-samesite.md
**Résumé :**
- allowedOrigins externalisées : @Value("${app.cors.allowed-origins:http://localhost:3000}") List<String> (liste virgules, default fail-safe localhost, jamais wildcard). dev=http://localhost:3000 ; prod=${CORS_ALLOWED_ORIGINS} (env obligatoire, fail-fast, aucun default deviné).
- Authorization retiré de exposedHeaders (inutile depuis cookie-only #104) ; reste Set-Cookie.
- SameSite MAINTENU Lax (pas Strict) : front origine séparée → cross-site + navigations entrantes (lien/email) cassées par Strict ; CSRF couvert par API JSON + cookie HttpOnly + CORS. Documenté (commentaire + runbook). NB COOKIE_SAME_SITE vit dans AuthController (hors périmètre) → non touché.
- Périmètre : accessDeniedHandler (#119), AuthController (#111/#116), application.properties (#111) NON touchés. Commit par chemins explicites.
**Tests :** test-quiet.sh unit → 56/56, RateLimitingAndHeadersIntegrationTest OK (default @Value couvre profil test).

**[MEMORY:decision]** SameSite cookie jwt maintenu Lax car front origine séparée ; reconsidérer si front+API même eTLD+1 en prod.
**[MEMORY:pattern]** Externalisation CORS : origines via @Value List<String> au constructeur ; default fail-safe localhost (jamais `*`, incompatible allowCredentials=true) ; prod sans default → ${CORS_ALLOWED_ORIGINS} fail-fast. Même esprit que #99.

## Recommandations suite
- RECOMMAND_SECURITY : revue CORS/CSRF/SameSite (décision SameSite + allowCredentials).
- RECOMMAND_FOLLOWUP : doc CI/déploiement prod doit lister CORS_ALLOWED_ORIGINS comme env OBLIGATOIRE (sinon boot prod fail-fast). À grouper avec COOKIE_DOMAIN (#118) + ENVIRONMENT (#111) dans le runbook prod.

STATUS: COMPLETED
