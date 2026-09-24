# Corrections de revue — Sprint 112

## Commits
- `fb4654b1` :white_check_mark: test(security): variantes de chemin comptées ou rejetées, principal sans id de compte refusé par le limiteur utilisateur (#831) — `git show --stat` = 4 fichiers, tous du périmètre (SecurityConfig, UserRateLimitingFilter, 2 tests). Voisin : `b5e717c1` (#700). Non poussé.

## Résumé
- Tâche 1 — contournement de chemin (security-expert MINEUR 1). Test `PreferencesUserRateLimitPathVariantsIntegrationTest` sur VRAI serveur (`RANDOM_PORT`, `java.net.http.HttpClient`, chemins bruts via `URI.create`), pas MockMvc : MockMvc court-circuite la normalisation Tomcat, qui est justement le sujet. Requêtes authentifiées (PIT-S83-012). Compte neuf par variante. Statuts MESURÉS (seau plein / jetons canoniques restants / seau vide) :
  - `/api/me/%70references` : 200 / 29 / 429 → routé ET compté dans le même seau (issue b).
  - `/api/me//preferences` : 400 / 30 / 400 → non routé (issue a).
  - `/api/me/preferences/` : 404 / 30 / 404 → non routé (Spring 6 : pas de correspondance du slash final).
  - `/api/me/preferences;jsessionid=x` : 400 / 30 / 400 → non routé.
  - `/api/me/Preferences` : 404 / 30 / 404 → non routé (routage sensible à la casse).
  - Aucun défaut trouvé → aucun correctif du filtre sur ce point. Origine des deux 400 NON isolée (pare-feu `StrictHttpFirewall` probable, rien dans les logs ; Tomcat non exclu) — le test n'assert que la classe 400/404/405, pas le code exact.
  - Armement : mutation `pathHelper.getPathWithinApplication` → `request.getRequestURI()` (clé non décodée) ⇒ variante `%70references` ROUGE (`expected 29 but was 30` : écriture non comptée). Filtre restauré.
- Tâche 2 — repli `name:` (reviewer backend MINEUR 1). Tranché : INATTEIGNABLE. Seule source d'authentification de la chaîne = `JwtFilter` → `UsernamePasswordAuthenticationToken(CustomUserDetails chargé en base, id non nul)` ; `SecurityConfig` n'active ni httpBasic, ni formLogin, ni remember-me, ni OAuth2 ; session `STATELESS` (le contexte posé par `AuthController.login` meurt avec sa requête, sur une autre route). Branche supprimée, remplacée par un FAIL-CLOSED : principal authentifié non `CustomUserDetails` ou sans id → `401 {"error":"unauthorized"}`, identique à l'entry point (`SecurityConfig.writeJsonError` passé `private` → package-private), jamais atteinte du contrôleur.
  - Pourquoi pas « laisser passer » : `UserController` résout l'appelant par nom (`CallerResolver`), donc un futur mécanisme d'auth serait servi HORS plafond sans que rien ne le signale. Pourquoi pas garder `name:` : second espace de clés jamais testé. 401 cohérent avec `CallerResolver` (compte non résolu → 401, BR-AUT-005). Anonyme inchangé (passe, 401 par l'autorisation en aval). Refus limité à la route plafonnée et à l'interrupteur `app.rate-limit.enabled=true`.
  - Justification écrite dans la JavaDoc de classe de `UserRateLimitingFilter`.
  - Armement : mutation « refus → `chain.doFilter` » ⇒ 2 tests unitaires ROUGES (`expected 401 but was 200`). Restauré.
- fichiers de contexte lus: docs/memory/sprints/sprint-112/issue-831-done.md, docs/memory/sprints/sprint-112/specialist-reviews.md, backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java, SecurityConfig.java (l.40-60, 150-262), JwtFilter.java (l.55-100), CallerResolver.java (l.40-90), CustomUserDetails.java, CustomUserDetailsService.java (grep), RateLimitingFilter.java (l.275-290, 415-430, 560-612), AuthController.java (l.300-330), UserController.java (grep mappings), backend/src/test/.../PreferencesUserRateLimitIntegrationTest.java, UserControllerTest.java (l.1-80, grep), ThemePreferenceIntegrationTest.java (grep), SecurityConfigWriteJsonErrorTest.java (grep), support/AbstractPostgresIntegrationTest.java

## Tests
- `./mvnw -q test -Dtest='UserRateLimitingFilterTest,PreferencesUserRateLimitIntegrationTest,SecurityConfigWriteJsonErrorTest,PreferencesUserRateLimitPathVariantsIntegrationTest,CorsAllowedOriginsConfigIntegrationTest'` → 7 + 3 + 2 + 5 + 7 = 24/24.
- Mutations d'armement (cf. Résumé) : PathVariants 1/5 rouge, UserRateLimitingFilterTest 2/7 rouges ; source restaurée puis suite complète verte.
- Suite backend complète `./mvnw -q test` → exit 0 ; 85 rapports `TEST-*.xml` produits par ce run (filtrés `-newer` marqueur) : 682 tests, 0 failure, 0 error, 0 skipped (670 avant + 5 + 7).
- Vitest `e2e-rate-limit-budget` NON relancé : `RateLimitingFilter.java` non touché.
- NON vérifié : E2E Playwright (interdit) ; origine exacte des 400 ; comportement derrière le proxy Next (autre normalisation possible en amont — ne peut qu'ajouter un rejet, le backend reste la dernière barrière testée) ; nouveau contexte Spring `RANDOM_PORT` = +1 démarrage de contexte dans la suite (coût non mesuré isolément).

## Signaux mémoire
- [MEMORY:pattern] Problem: prouver qu'une variante de chemin ne contourne pas un limiteur/filtre. Solution: `@SpringBootTest(RANDOM_PORT)` + `HttpClient` + `URI.create` (chemin brut), oracle « jetons canoniques restants » (plafond-1 si la variante est routée et comptée) + statut seau vide ; armer par mutation `getRequestURI()`. Anti-pattern: MockMvc (saute Tomcat) ou `put(String)` de MockMvc (ré-encode `%70` en `%2570`).
- [MEMORY:decision] Context: limiteur par utilisateur, principal authentifié non rattachable à un id. Decision: fail-closed 401 identique à l'entry point, repli `name:` supprimé. Why: fail-open annulerait silencieusement le plafond pour tout futur mécanisme d'auth ; cohérent avec `CallerResolver` (BR-AUT-005).
- [MEMORY:pitfall] Context: sous le hook RTK, `find … -newer` et `cat` sont réécrits (`rtk find` refuse les prédicats composés, `rtk read`) → comptage surefire vide/faux. Solution: `/usr/bin/find`, `/bin/cat`. Prevention: binaires absolus pour toute mesure (étend la note S93 sur `grep`).

## Recommandations suite
- Pas de RECOMMAND_SECURITY : les deux constats MINEURS sont traités et armés ; aucun défaut trouvé sur les 5 variantes.
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête modifiés.
- Pas de RECOMMAND_UI_DESIGN : aucun changement front.
- Pas de RECOMMAND_TEST_RUNNER : suite backend complète déjà jouée (682/682) ; l'E2E reste celui déjà demandé pour #831, ce cycle ne touche aucun comportement nominal (JwtFilter pose toujours un `CustomUserDetails` avec id).

STATUS: COMPLETED
