# Patterns — MyTimeline

> Patterns réutilisables consolidés en fin de sprint.

## PAT-S1-001 — Ownership IDOR via helper d'identité
Contrôle d'accès sur les endpoints de mutation : helper privé (`resolveCaller(token)` → User|null ; `checkEventOwnership` → ResponseEntity d'erreur non-null ou null si OK) factorisant 401/404/403. L'identité est dérivée du JWT authentifié, JAMAIS d'un path param contrôlable par le client. Pour un event : `event → productId → product.getUser().getId() == caller.getId()`. (Sprint 1 #30/#91)

## PAT-S1-002 — resolveCaller centralise l'extraction JWT + le mapping d'erreur
`resolveCaller(token)` enveloppe `jwtService.extractUsername` dans `try/catch (JwtException) → null`, réutilisé par tous les checks d'ownership (createEvent, PATCH, DELETE). Évite la duplication d'`extractUsername` nu et le risque 500. (Sprint 1 #91)

## PAT-S2-001 — Helper unique de construction de cookie (source de vérité des attributs)
Poser et supprimer un cookie avec des attributs divergents (`Secure`/`Domain`/`SameSite`/`Path`) → le navigateur ne matche pas, cookie résiduel après logout. Factoriser un helper privé `buildJwtCookie(value, maxAge)` partagé login/refresh/logout ; `maxAge=0` pour supprimer. Anti-pattern : dupliquer `setSecure/setDomain/setSameSite` par endpoint. (Sprint 2 #32)

## PAT-S2-002 — 401 vs 403 propre sous Spring Security
Deux étages complémentaires : (1) `http.exceptionHandling(authenticationEntryPoint → 401, accessDeniedHandler → 403)` écrivant un JSON minimal directement dans `HttpServletResponse` (couvre les exceptions du filtre, hors DispatcherServlet) ; (2) handlers `AccessDeniedException`→403 / `AuthenticationException`→401 dans le `@RestControllerAdvice` (couvrent le chemin method-security `@PreAuthorize`). Champ `error` littéral (`unauthorized`/`forbidden`). Anti-pattern : compter sur le ControllerAdvice seul, ou sérialiser l'objet exception (fuite + 500). (Sprint 2 #51)

## PAT-S2-003 — Tester un rate-limit à fenêtre temporelle sans `Thread.sleep`
Bucket4j `.withCustomTimePrecision(TimeMeter)` + bean `TimeMeter` overridable en test (`@TestConfiguration` + `advance(Duration)`) → avancer le temps de façon déterministe. Anti-pattern : `Thread.sleep(60s)` pour attendre le reset de fenêtre. (Sprint 2 #33)
