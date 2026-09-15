# Issue #99 — Externaliser la configuration des cookies JWT (Secure/Domain par profil)

**Commit :** 46b628b
**Modèle :** opus-high | **Vague :** 2 (3/3 chaîne AuthController)

## Résumé
- Objectif : externaliser attrs cookie JWT Secure/Domain par profil Spring. BR : BR-AUT-007 (cookie login), BR-AUT-010 (cohérence pose/suppression), A6+A7 corrigés.
- `AuthController.java` : constantes `COOKIE_SECURE`/`COOKIE_DOMAIN` static final → champs `@Value("${app.cookie.secure}")` boolean + `@Value("${app.cookie.domain}")` String. Helper unique `buildJwtCookie` (login/refresh/logout déjà centralisés → cohérence garantie). Garde `if domain non blank` → évite `setDomain("")` invalide.
- `application.properties` : defaults `app.cookie.secure=${COOKIE_SECURE:false}` / `app.cookie.domain=${COOKIE_DOMAIN:localhost}`. `application-dev.properties` : false/localhost. `application-prod.properties` : secure=true, `domain=${COOKIE_DOMAIN:}` + TODO domaine prod (host-only si vide).
- Test : `jwtCookieAttributes_areCoherent_acrossLoginRefreshLogout` (Secure/Domain/HttpOnly/Path identiques + logout maxAge=0). 8/8 PASS.

## Note (drift briefing vs réalité)
A6 (logout `Secure=true` vs login `false`) ÉTAIT DÉJÀ résolu par un refactor antérieur (helper `buildJwtCookie` commun) ; seule l'externalisation restait. Pas de régression introduite. #104/#105 non touchés.

## [MEMORY] signaux
- [MEMORY:pitfall] Test MockMvc `standaloneSetup` + champs `@Value` : injecter via `ReflectionTestUtils.setField` dans `@BeforeEach` (`@Value` jamais résolu hors contexte Spring complet).
- [MEMORY:decision] `app.cookie.domain` prod inconnu → `${COOKIE_DOMAIN:}` vide + garde `isBlank` → cookie host-only (pas d'attribut Domain) au lieu de `setDomain("")`. Cookie valide sans config, pas de devinette.

## Correctif review batch (commit 2e39e08)
Reviewer + security-expert ont convergé sur un finding CRITIQUE/MAJEUR : le default de base `application.properties` (`Secure=false`/`domain=localhost`) était un footgun en cas de prod sans profil actif ni env var. Corrigé → defaults base fail-safe : `app.cookie.secure=${COOKIE_SECURE:true}`, `app.cookie.domain=${COOKIE_DOMAIN:}` (host-only). Dev override (`false`/`localhost`) intact. AuthControllerSecurityTest 8/8.

## Recommandations suite
- RECOMMAND_FOLLOWUP : fournir le vrai domaine prod via env `COOKIE_DOMAIN` (ou hardcode dans application-prod.properties) avant déploiement ; sinon cookie host-only non partagé entre sous-domaines.
- Pas de RECOMMAND_TEST_RUNNER (8 tests OK). Pas de RECOMMAND_DB_EXPERT.

STATUS: COMPLETED
