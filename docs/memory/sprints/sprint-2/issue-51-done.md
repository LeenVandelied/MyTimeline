# Issue #51 — done

commits: 5896fa77ea2161561a6d708d7cab46c0574babea

## resume
objectif: distinguer 401 (non authentifie) vs 403 (authentifie non autorise), zero 500, zero fuite stack trace.
BR: BR-AUT-005 (echec auth -> 401 sans fuite interne), BR-EVT-001 (ownership -> 403).

fichiers cles:
- SecurityConfig.java: ajout bloc `.exceptionHandling(authenticationEntryPoint -> 401, accessDeniedHandler -> 403)`. Helper `writeJsonError` ecrit JSON direct dans HttpServletResponse (`{"error":"unauthorized"|"forbidden"}`, Content-Type json, UTF-8, pas de stack). Surface minimale (CORS/CSRF/session/authorizeHttpRequests intacts pour #33).
- GlobalExceptionHandler.java: handlers `AccessDeniedException`->403 `{"error":"forbidden"}`, `AuthenticationException`->401 `{"error":"unauthorized"}`. Surcharge `buildBody(status, error, message)` pour champ `error` LITTERAL (avant: reasonPhrase "Forbidden", non conforme critere).
- JwtFilter.java: NON MODIFIE — deja conforme (catch Exception -> log SLF4J + chain.doFilter, jamais l'objet exception serialise, jamais 500). Le 401 vient de l'entryPoint.
- AuthErrorContractIntegrationTest.java (NEW): @SpringBootTest + @AutoConfigureMockMvc (vrai filter chain). 3 cas: no-token /api/events->401 json; @WithMockUser authority ROLE_NONE->403 json (accessDeniedHandler via hasAuthority); Bearer invalide->401 (pas 500).

pitfalls:
- Exceptions DANS le filtre ne traversent PAS le ControllerAdvice (hors DispatcherServlet) -> entryPoint/accessDeniedHandler obligatoires en plus des handlers.
- buildBody existant mettait `error=reasonPhrase` -> critere exige `error` litteral forbidden/unauthorized -> surcharge dediee.
- standaloneSetup (tests existants) ne passe PAS par Spring Security -> 401/403 reels exigent @SpringBootTest full chain.

tests: 23/23 verts (3 nouveaux), BUILD SUCCESS, ~6s. Volume < 500, temps < 3min.

## [MEMORY:*]
[MEMORY:pattern] Probleme: 401 vs 403 propre sous Spring Security. Solution: exceptionHandling(authenticationEntryPoint=401, accessDeniedHandler=403) ecrivant JSON minimal direct dans HttpServletResponse + handlers AccessDeniedException/AuthenticationException dans @RestControllerAdvice (champ error litteral). Anti-pattern: compter sur le ControllerAdvice seul (exceptions du filtre ne le traversent pas) ou serialiser l'objet exception (fuite + 500).
[MEMORY:pitfall] Context: tester contrat 401/403 Spring Security. Solution: @SpringBootTest + @AutoConfigureMockMvc (full chain). Prevention: standaloneSetup bypasse la securite -> faux verts.

## recommandations suite
- RECOMMAND_FOLLOWUP: EventController produit son 403 ownership via `ResponseEntity.status(FORBIDDEN).build()` (body VIDE), ne passe ni par accessDeniedHandler ni par le ControllerAdvice -> le 403 ownership n'a PAS `{"error":"forbidden"}`. Hors scope #51 (fichier appartient a #32). Harmoniser plus tard: lever AccessDeniedException au lieu de build() pour body uniforme.
- PAS de RECOMMAND_TEST_RUNNER (volume/temps sous seuils).
- Note #33: SecurityConfig modifie uniquement bloc exceptionHandling -> conflit merge minimal.

STATUS: COMPLETED
