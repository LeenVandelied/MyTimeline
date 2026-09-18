# Mini-plans architect — Sprint 4

> Généré par /sprint plan 4 (architect, 2026-06-25). Lu par /sprint start 4 Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> Thème : Auth & CSP — follow-ups reviews S1-S3. Cohésion 0.71.

```yaml
issue_104:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (MockMvc AuthController) — assert body login != JWT, assert cookie 'jwt' present"
  risque_regression: "frontend lit response.data du login ; verifie useAuth.ts:42 ignore le retour (OK constate) -> safe"
  ordre_ecriture: "remplacer `ResponseEntity.ok().body(jwtToken)` (ligne ~88) par `ResponseEntity.ok(Map.of(\"message\",\"Authentification reussie\"))` ; cookie inchange"
  zod_dto_sync: "NON (login schema cote front ne parse pas le body retour)"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — AuthController.login ligne ~88 fait `return ResponseEntity.ok().body(jwtToken)`. Faux positif Phase 0.5."

issue_105:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java", "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit — 3 cas refresh : valide=200, expire=401, signature invalide=401"
  risque_regression: "refresh genere actuellement un token SANS valider expiration ; ajouter validation peut casser flux nominal si validateToken signature differe — verifier JwtService.validateToken(token, userDetails) leve bien ExpiredJwtException (catch deja present ligne ~205)"
  ordre_ecriture: "dans refreshToken, AVANT generateToken : appeler jwtService.validateToken(token, userDetails) ; si false/exception -> 401 {\"error\":\"token expire ou invalide\"} ; a determiner par fullstack-dev si validateToken retourne false vs leve exception"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — refreshToken genere `newToken` sans appel validateToken prealable (ligne ~190). Faux positif Phase 0.5."

issue_99:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java", "backend/src/main/resources/application-dev.properties", "backend/src/main/resources/application-prod.properties"]
  couches_touchees: ["infrastructure", "config"]
  strategie_test: "unit — cookie attrs identiques pose/suppression ; integration profil dev (Secure=false) inchange"
  risque_regression: "oubli app.cookie.domain en prod invalide tous les cookies (domain mismatch) ; logout doit garder attrs IDENTIQUES a login (BR-AUT-010) sinon cookie non efface"
  ordre_ecriture: "remplacer constantes COOKIE_SECURE/COOKIE_DOMAIN par @Value(\"${app.cookie.secure}\")/${app.cookie.domain} ; ajouter defaults dans application-dev.properties (false/localhost) ET application-prod.properties (true/<domaine>). NB issue dit application.yml mais le repo utilise .properties -> utiliser .properties"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — `COOKIE_SECURE=false` et `COOKIE_DOMAIN=\"localhost\"` en dur (constantes static final lignes ~52-55). Faux positif Phase 0.5."

issue_100:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit — GET /api/events/{id} token autre user -> 403 body {\"error\":\"forbidden\"}"
  risque_regression: "AccessDeniedException doit etre interceptee par GlobalExceptionHandler (DEJA present, handler @ExceptionHandler(AccessDeniedException) lignes ~46-52) et non absorbee par JwtFilter en amont — verifier"
  ordre_ecriture: "remplacer les 2 `ResponseEntity.status(HttpStatus.FORBIDDEN).build()` (lignes 62, 119) par throw new AccessDeniedException(\"forbidden\") ; adapter le helper checkOwnership qui retourne ResponseEntity (ligne ~86 reconstruit status)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — EventController lignes 62 & 119 `ResponseEntity.status(FORBIDDEN).build()` (body vide). Handler centralise existe deja mais contourne. Faux positif Phase 0.5."

issue_101:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java", "backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java"]
  couches_touchees: ["infrastructure", "config"]
  strategie_test: "integration — RateLimitingAndHeadersIntegrationTest assert headers CSP stricts presents sur endpoints publics"
  risque_regression: "CSS-in-JS Next.js (Tailwind/styled) injecte du CSS inline -> violations style-src ; valider en dev (Chrome console) AVANT durcissement. Front doit etre stabilise (issues #80-#87)"
  ordre_ecriture: "SecurityConfig ligne 85 : remplacer policyDirectives(\"default-src 'self'\") par directives explicites (script-src 'self', style-src 'self', connect-src 'self' <api>, img-src 'self' data:, font-src 'self', frame-ancestors 'none') ; <domaine API> a determiner par fullstack-dev ; MAJ test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME — SecurityConfig.java:85 `.policyDirectives(\"default-src 'self'\")` (CSP permissive). Faux positif Phase 0.5."
```
