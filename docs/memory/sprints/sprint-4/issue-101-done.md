# Issue #101 — Durcir la Content-Security-Policy (permissive → stricte)

**Commit :** 6a58832e223aa6f1be30182a673e5a3aa3f088a4
**Modèle :** opus-high | **Vague :** 1

## Résumé
- Objectif : durcir CSP permissive → stricte. BR : BR-SEC-003 (défense XSS).
- Fichiers : `SecurityConfig.java:84` (CSP par directives explicites) + `RateLimitingAndHeadersIntegrationTest.java` (assertion stricte + nouveau test endpoint public) + `docs/memory/sprints/sprint-2/issue-33-done.md` (MAJ #101).
- CSP appliquée : `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'`.
- Pitfall style-src ÉCARTÉ : le header CSP est émis par le backend (API JSON), le front Next.js tourne sur son propre origine sous sa propre CSP → aucun CSS inline Tailwind régi par ce header → `style-src 'self'` strict sans `'unsafe-inline'`.
- Tests : `RateLimitingAndHeadersIntegrationTest` 7/7, BUILD SUCCESS.

## [MEMORY] signaux
- [MEMORY:pitfall] Durcir CSP avec front Next.js/Tailwind : le header CSP backend ne régit QUE les réponses de l'origine backend (API JSON) ; le front a son propre origine + sa propre CSP, le CSS inline Tailwind n'est jamais concerné → `style-src 'self'` strict possible. Prévention : identifier QUI émet le header avant de relâcher `'unsafe-inline'`.
- [MEMORY:decision] connect-src CSP backend = `'self'` : CORS n'autorise que localhost:3000, aucune origine API cross-origin. Externaliser par profil si SSR cross-origin un jour.

## Recommandations suite
- RECOMMAND_FOLLOWUP : `./scripts/test-quiet.sh` ABSENT + maven-wrapper cassé (`.mvn/wrapper/maven-wrapper.properties` manquant). Utilise `mvn` système depuis `backend/`. À corriger (régénérer wrapper ou créer le script test-quiet).
- RECOMMAND_FOLLOWUP : si une page HTML servie par le backend appelle une API cross-origin en prod, externaliser l'origine API par profil (dev/prod).
- Pas de RECOMMAND_TEST_RUNNER (7 tests, ~8s). Hors-scope respecté (EventController/AuthController non touchés).

STATUS: COMPLETED
